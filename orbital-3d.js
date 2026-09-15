/* One scene, two scales. Stars orbit a galaxy, planets inherit their star's
   translation, satellites inherit their planet's translation. Surface rotation
   is independent. Constellations are screen projections, not physical links. */
(function () {
  'use strict';
  let active;
  const TAU=Math.PI*2;
  const chapters=[['lanzamiento','Lanzamiento'],['estrellas','Clientes'],['planetas','Empleados'],['coordenadas','Constelaciones'],['satelites','Satélites'],['observatorio','Observatorio'],['mision','Mi misión']];
  const noiseGLSL=`
    float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.51));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float f=0.;float a=.5;for(int i=0;i<4;i++){f+=a*noise3(p);p=p*2.03+vec3(13.1,7.4,9.2);a*=.5;}return f;}`;
  const surfaceVertex=`varying vec3 vLocal,vWorld,vNormal;
    void main(){vLocal=position;vWorld=(modelMatrix*vec4(position,1.)).xyz;
      vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
  function glowTexture(T){
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.13,'rgba(255,255,255,.7)');g.addColorStop(.4,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c);
  }
  function seededRandom(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  function build(realm,progress){
    const T=window.THREE,renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    // A rollback exists even if initialization stops before the full lifecycle.
    active=()=>{realm.__planetMaterialSession?.dispose();delete realm.__planetMaterialSession;renderer.dispose();renderer.forceContextLoss();realm.querySelectorAll('.cosmos-tabs,.cosmos-stage,.cosmos-inspector,.cosmos-route').forEach(e=>e.remove());};
    renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
    const fallback=realm.querySelector('.cosmos-fallback');
    const tabs=document.createElement('div');tabs.className='cosmos-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Escala del universo');
    tabs.innerHTML='<button role="tab" data-view="system" aria-selected="true">Sistema del cliente</button><button role="tab" data-view="galaxy" aria-selected="false">Galaxia y guía</button>';
    const stage=document.createElement('div');stage.className='cosmos-stage';
    stage.innerHTML=`<div class="cosmos-heading galaxy"><small>Escala galáctica</small><h2>Galaxia · Empresa</h2><p>Sus estrellas son nuestros clientes.</p></div>
      <div class="cosmos-heading system"><small>Acercamiento a la estrella seleccionada</small><h2>Sistema del cliente</h2></div>
      <div class="cosmos-heading constellations"><small>Una guía en el cielo</small><h2>Constelaciones</h2><p>Modelo de experiencia + arquitectura empresarial</p></div>
      <button class="cosmos-overview-link">Seguir a la estrella seleccionada ↗</button>
      <div class="cosmos-tools"><button class="cosmos-reset" hidden>Ver sistema ↗</button><button class="cosmos-pause" aria-pressed="false">Ⅱ Pausar</button></div>
      <div class="cosmos-actors" role="group" aria-label="Seleccionar un actor del ecosistema" hidden><button data-actor="0">Proveedores y contratistas</button><button data-actor="1">Dueño</button><button data-actor="2">Comunidad</button></div>
      <a class="cosmos-credit" href="texture-credits.html" target="_blank" rel="noopener">Créditos de las superficies</a>
      <svg class="cosmos-constellation-lines" aria-hidden="true"><defs><clipPath id="constellation-viewport"><rect/></clipPath></defs><path clip-path="url(#constellation-viewport)" fill="none" stroke="#a1a7ff" stroke-width="1" stroke-opacity=".65"/></svg><div class="cosmos-labels"></div>`;
    stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Universo tridimensional. También puedes seleccionar los elementos con los botones del recorrido.');
    const inspector=document.createElement('section');inspector.className='cosmos-inspector';inspector.setAttribute('aria-label','Elemento seleccionado');
    inspector.innerHTML='<div><small></small><h2></h2></div><p></p><button class="cosmos-action"></button>';
    const route=document.createElement('div');route.className='cosmos-route';route.setAttribute('role','group');route.setAttribute('aria-label','Explorar el recorrido');
    route.innerHTML=chapters.map(([id,name],i)=>`<button data-step="${id}" aria-pressed="false"><span>0${i+1}</span>${name}</button>`).join('');
    realm.append(tabs,stage,inspector,route);if(fallback)fallback.hidden=true;
    const scene=new T.Scene(),clock=new T.Clock(),glow=glowTexture(T),rng=seededRandom(8249);
    const materials=[],records=[],moving=[],spinning=[],labels=[],stars=[];
    const lightPosition=new T.Vector3(),mainWorld=new T.Vector3(),temp=new T.Vector3();
    let animation,elapsed=0,disposed=false,width=1,height=1,compact=false,mobileView='system',selected,focusPlanet=null;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;
    const views={},shaderErrors=[];
    renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{shaderErrors.push([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].join('\n'));};
    const cameras={galaxy:new T.OrthographicCamera(),system:new T.OrthographicCamera(),constellation:new T.OrthographicCamera()};
    cameras.galaxy.layers.set(0);cameras.galaxy.layers.enable(1);cameras.system.layers.set(2);cameras.constellation.layers.set(3);
    Object.values(cameras).forEach(c=>{c.near=.1;c.far=1200;});
    const hemi=new T.HemisphereLight(0xa9dfff,0x302352,2.6);hemi.layers.enableAll();scene.add(hemi);
    const sunlight=new T.PointLight(0xa1d9ff,55,80,1);sunlight.layers.enableAll();scene.add(sunlight);
    const rim=new T.DirectionalLight(0xc28cff,2.2);rim.position.set(-10,15,8);rim.layers.enableAll();scene.add(rim);
    function layer(object,value){object.traverse(o=>o.layers.set(value));return object;}
    function standard(color,metalness=.25){const m=new T.MeshStandardMaterial({color,metalness,roughness:.42});materials.push(m);return m;}
    function mesh(geometry,material,parent){const m=new T.Mesh(geometry,material);m.layers.set(2);if(parent)parent.add(m);return m;}
    function halo(parent,color,size,opacity=.45){const m=new T.SpriteMaterial({map:glow,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false});materials.push(m);const s=new T.Sprite(m);s.scale.set(size,size,1);parent.add(s);return s;}
    function star(radius,color){
      const g=new T.Group(),m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new T.Color(color)}},vertexShader:surfaceVertex,fragmentShader:`
        uniform float uTime;uniform vec3 uColor;varying vec3 vLocal,vWorld,vNormal;${noiseGLSL}
        void main(){vec3 p=normalize(vLocal);float turbulence=fbm(p*3.8+vec3(0.,uTime*.012,0.));
          float filaments=pow(1.-abs(noise3(p*12.+turbulence*3.)*2.-1.),3.);
          float face=max(dot(normalize(cameraPosition-vWorld),normalize(vNormal)),0.);
          vec3 c=mix(uColor*.36,uColor*1.5,turbulence)+vec3(.35,.66,1.)*filaments*.32;
          c=mix(c,vec3(.55,.83,1.),pow(1.-face,3.)*.7);gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`});
      materials.push(m);const surface=mesh(new T.SphereGeometry(radius,48,32),m,g);spinning.push({object:surface,speed:.018});halo(g,color,radius*5.5,.57);return g;
    }
    function planet(radius,primary,secondary,mode,seed){
      const session=realm.__planetMaterialSession||(realm.__planetMaterialSession=window.UniversePlanetMaterials.createSession(T,{lightPosition,materials,spinning}));
      const kind=Math.abs(seed-12.7)<.01?'earth':['neptune','uranus','saturn','mars','jupiter'][Math.round(seed/7.1)];
      return session.create({radius,kind});
    }
    // The visible path and the animated position share the same ellipse.
    function orbit(parent,radius,period,phase,tilt=0,color=0x678cb2,eccentricity=0,showGuide=true){
      const plane=new T.Group();plane.rotation.z=tilt;parent.add(plane);const anchor=new T.Group();plane.add(anchor);
      let line=null;
      if(showGuide){
        // A screen-width feathered ribbon, not a hard WebGL line. Opacity fades
        // continuously across both edges; no central stroke is drawn.
        const positions=[],tangents=[],sides=[],indices=[],segments=192,b=radius*Math.sqrt(1-eccentricity*eccentricity);
        for(let i=0;i<=segments;i++){
          const t=i/segments*TAU,dx=-radius*Math.sin(t),dz=b*Math.cos(t),length=Math.hypot(dx,dz);
          [-1,1].forEach(side=>{positions.push(radius*(Math.cos(t)-eccentricity),0,b*Math.sin(t));tangents.push(dx/length,0,dz/length);sides.push(side);});
          if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
        }
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('orbitTangent',new T.Float32BufferAttribute(tangents,3));geometry.setAttribute('edgeSide',new T.Float32BufferAttribute(sides,1));geometry.setIndex(indices);
        const material=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(color)},uViewport:{value:new T.Vector2(1,1)},uFeather:{value:3.6},uAlpha:{value:.075}},
          vertexShader:`attribute vec3 orbitTangent;attribute float edgeSide;uniform vec2 uViewport;uniform float uFeather;varying float vEdge;
            void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vec4 q=projectionMatrix*modelViewMatrix*vec4(position+orbitTangent,1.);
              vec2 d=(q.xy/q.w-p.xy/p.w)*uViewport;vec2 n=normalize(vec2(-d.y,d.x));p.xy+=n*edgeSide*uFeather*2./uViewport*p.w;vEdge=edgeSide;gl_Position=p;}`,
          fragmentShader:`uniform vec3 uColor;uniform float uAlpha;varying float vEdge;
            void main(){float d=abs(vEdge);float feather=exp(-d*d*5.)*(1.-smoothstep(.55,1.,d));gl_FragColor=vec4(uColor,uAlpha*feather);
              #include <colorspace_fragment>
            }`,transparent:true,depthWrite:false,side:T.DoubleSide});
        materials.push(material);line=new T.Mesh(geometry,material);line.layers.set(2);line.frustumCulled=false;plane.add(line);
      }
      const entry={anchor,parent,radius,period,phase,eccentricity,line,body:null};moving.push(entry);return entry;
    }
    function satellite(){
      const g=new T.Group(),metal=standard(0xf4dfb4,.8),blue=standard(0x204eab,.6),edge=standard(0x97c8e5,.8);
      mesh(new T.BoxGeometry(.27,.27,.38),metal,g);
      [-1,1].forEach(side=>{const panel=mesh(new T.BoxGeometry(.6,.04,.42),blue,g);panel.position.x=side*.49;
        for(let i=0;i<4;i++){const wire=mesh(new T.BoxGeometry(.014,.05,.43),edge,g);wire.position.x=side*(.24+i*.14);}});
      const dish=mesh(new T.SphereGeometry(.22,16,12,0,TAU,0,Math.PI*.4),metal,g);dish.rotation.x=Math.PI;dish.position.y=.15;return g;
    }
    function rocket(){
      const g=new T.Group(),white=standard(0xe1eff5,.6),purple=standard(0xa767ed,.6);mesh(new T.CylinderGeometry(.19,.22,1.05,20),white,g);
      const nose=mesh(new T.ConeGeometry(.2,.5,20),white,g);nose.position.y=.75;
      for(let i=0;i<3;i++){const fin=mesh(new T.BoxGeometry(.07,.42,.5),purple,g);fin.rotation.y=i*TAU/3;fin.position.set(Math.sin(i*TAU/3)*.18,-.44,Math.cos(i*TAU/3)*.18);}
      const engine=mesh(new T.ConeGeometry(.13,.4,16),new T.MeshBasicMaterial({color:0x91e7ff}),g);engine.rotation.z=Math.PI;engine.position.y=-.76;g.rotation.z=-.52;return g;
    }
    function telescope(){const g=satellite(),gold=standard(0xeec991,.8),dark=standard(0x223b64,.6);
      const tube=mesh(new T.CylinderGeometry(.3,.31,.85,24),gold,g);tube.rotation.x=Math.PI/2;
      const lens=mesh(new T.CircleGeometry(.26,24),dark,g);lens.position.z=.435;g.rotation.set(.3,-.6,.3);g.scale.setScalar(1.25);return g;}
    const galaxyRoot=new T.Group();scene.add(galaxyRoot);
    // Seeded dust volumes: stable, irregular, never a grid of refreshed dots.
    const positions=[],colors=[];for(let i=0;i<7000;i++){
      const r=4+Math.pow(rng(),.65)*91,arm=i%3,a=arm*TAU/3+r*.047+(rng()-.5)*.95;
      const spread=(rng()-.5)*(4+r*.12);positions.push(Math.cos(a)*r+spread,(rng()-.5)*(3+10*Math.exp(-r/20)),Math.sin(a)*r+spread);
      const c=new T.Color().setHSL(.57+rng()*.22,.65,.34+rng()*.32);if(r<22)c.lerp(new T.Color(0xffc2a9),.65);colors.push(c.r,c.g,c.b);
    }
    const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));dustGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const dustMaterial=new T.PointsMaterial({map:glow,size:17,vertexColors:true,transparent:true,opacity:.12,blending:T.AdditiveBlending,depthWrite:false});materials.push(dustMaterial);
    const dust=new T.Points(dustGeometry,dustMaterial);dust.layers.set(1);galaxyRoot.add(dust);
    const nucleus=new T.Group();halo(nucleus,0xc79eff,35,.75);halo(nucleus,0xffded0,13,.75);layer(nucleus,1);galaxyRoot.add(nucleus);
    const primaryOrbit=orbit(galaxyRoot,57,1500,.18,0,0x95ccff,.08);primaryOrbit.line.layers.set(1);
    const primary=star(1.23,0x4ca9ff);layer(primary,0);primary.traverse(o=>o.layers.enable(2));primaryOrbit.anchor.add(primary);
    primaryOrbit.body=primary;
    const beacon=halo(primaryOrbit.anchor,0xaeeaff,11,.9);beacon.layers.set(0);
    const clientRecord={id:'client',step:'estrellas',title:'Estrellas · Clientes',eyebrow:'El sentido de nuestro sistema',description:'Cada estrella es un cliente. Orbita el centro de su galaxia, la empresa. Este acercamiento sigue a la estrella seleccionada: sus empleados orbitan a su alrededor.',object:primaryOrbit.anchor,visual:primary,kind:'client'};records.push(clientRecord);
    for(let i=0;i<10;i++){
      const o=orbit(galaxyRoot,28+i*5.8,1200+i*93,.9+i*2.37,.02*(i%3),0x738caf,.05,false);
      const s=star(1.2+(i%4)*.7,[0x77baff,0xffcd8d,0xb28aff,0xe9f5ff][i%4]);layer(s,0);if(i<7)s.traverse(n=>n.layers.enable(3));o.anchor.add(s);o.body=s;stars.push({object:s,anchor:o.anchor});
    }
    const talent=[
      ['empaticos','Empáticos','Escucha y comprensión',0x1ba7d5,0x57ce85,1,4.8,.48,.6,210],
      ['conectores','Conectores','Colaboración y conexiones',0x155abe,0x6dc8ff,0,7.1,.65,2.5,300],
      ['impulsores','Impulsores','Orientación a resultados',0xb35424,0xffcc78,0,9.6,.75,4.5,400],
      ['exploradores','Exploradores','Innovación y adaptación',0x7535a6,0xd9a6ff,0,12.3,.62,5.6,520],
      ['forjadores','Forjadores','Aprendizaje y crecimiento',0x1b807b,0xa8dd49,1,15,.68,2.5,650]
    ];
    const talentRecords=[];
    talent.forEach(([id,name,competency,c1,c2,mode,radius,size,phase,period],i)=>{
      const o=orbit(primaryOrbit.anchor,radius,period,phase,(i-2)*.024,[0x4bb5c7,0x789fff,0xd6a776,0xb694e8,0x92cba2][i],.035);
      const p=planet(size,c1,c2,mode,i*7.1);o.anchor.add(p);o.body=p;
      if(id==='impulsores'){
        const ringMaterial=new T.MeshStandardMaterial({color:0xdbc1ad,side:T.DoubleSide,roughness:.85,transparent:true,opacity:.66});materials.push(ringMaterial);
        const ring=mesh(new T.RingGeometry(size*1.35,size*1.95,80),ringMaterial,p);ring.rotation.x=Math.PI/2-.24;
        const gap=mesh(new T.RingGeometry(size*1.56,size*1.63,80),standard(0x473045),p);gap.rotation.copy(ring.rotation);
      }
      const record={id,step:'planetas',title:`Planeta de los ${name}`,eyebrow:'Empleados · Roles y competencias',description:`Competencia: ${competency}. Los empleados orbitan al cliente y aportan desde su rol: Generador, Diseñador o Habilitador. Descubre tu planeta y tu rol en la actividad.`,object:o.anchor,visual:p,kind:'planet',radius:size,name};records.push(record);talentRecords.push(record);
    });
    const parentPlanet=talentRecords[4];
    ['Proveedores y contratistas','Dueño','Comunidad'].forEach((name,i)=>{
      const o=orbit(parentPlanet.object,1.35+i*.62,48+i*23,.8+i*2.1,.22+i*.18,0xbeadf4,.03);
      const s=satellite();s.scale.setScalar(.62);o.anchor.add(s);o.body=s;spinning.push({object:s,speed:.025});
      records.push({id:`satellite-${i}`,step:'satelites',title:name,eyebrow:'Satélite · Actor del ecosistema',description:'Orbita alrededor de un planeta empleado, no de la estrella. Proveedores y contratistas, Dueño y Comunidad acompañan y hacen posible la experiencia.',object:o.anchor,visual:s,kind:'satellite'});
    });
    // Instruments and the mission are activity waypoints, not employee planets.
    const waypoints=[['launch','lanzamiento','Centro de lanzamiento',rocket(),[-13,0,15]],['observatory','observatorio','Observatorio de señales',telescope(),[12,0,14]],['earth','mision','Misión en la Tierra',planet(.62,0x126fa9,0x499555,1,12.7),[16,0,-7]]];
    waypoints.forEach(([id,step,title,visual,pos])=>{const anchor=new T.Group();anchor.position.set(...pos);primaryOrbit.anchor.add(anchor);anchor.add(visual);records.push({id,step,title,eyebrow:'Bitácora de la experiencia',description:step==='observatorio'?'Observa las señales de la experiencia y descubre qué medir para aprender y decidir.':step==='mision'?'Lleva tu aprendizaje a la Tierra: define una acción, con quién aprender y qué capacidad desarrollar.':'Entra al Universo de la Experiencia y conoce cómo se conectan empresas, clientes, empleados y otros actores.',object:anchor,visual,kind:'waypoint'});});
    const constellation={id:'guide',step:'coordenadas',title:'Constelaciones · Nuestra guía',eyebrow:'Agrupación aparente, no estructura física',description:'Los trazos unen estrellas vistas desde aquí, aunque se encuentran a distintas distancias. Representan el modelo de experiencia y la arquitectura empresarial: nos orientan, no son órbitas.',kind:'guide'};records.push(constellation);
    const galaxyRecord={id:'galaxy',step:'lanzamiento',title:'Galaxias · Empresas',eyebrow:'Una red de sistemas de experiencia',description:'La galaxia reúne sus estrellas cliente. Cada estrella tiene planetas empleados y cada planeta puede contar con satélites de otros actores. La vista ampliada sigue el mismo cliente que ves señalado aquí.',kind:'galaxy'};records.push(galaxyRecord);
    const recordForStep=id=>records.find(r=>r.step===id&&r.kind!=='satellite')||records.find(r=>r.step===id);
    const motionByAnchor=new Map(moving.map(o=>[o.anchor,o]));
    const cameraOffset=new T.Vector3(0,23,37),screenRight=new T.Vector3(1,0,0),screenUp=new T.Vector3(0,37,-23).normalize(),framingCache=new Map();
    const systemRecords=()=>records.filter(r=>r.visual&&(!focusPlanet||r===focusPlanet||(r.kind==='satellite'&&focusPlanet===parentPlanet)));
    function select(record,zoom=false){
      selected=record;if(zoom&&record.kind==='satellite')focusPlanet=parentPlanet;
      else if(compact&&record.kind==='planet')focusPlanet=record;
      else if(record.kind!=='satellite')focusPlanet=null;
      if(compact){mobileView=['guide','galaxy'].includes(record.kind)?'galaxy':'system';resize();}
      const index=chapters.findIndex(c=>c[0]===record.step),allowed=index<=progress;
      inspector.querySelector('small').textContent=record.eyebrow;inspector.querySelector('h2').textContent=record.title;inspector.querySelector('p').textContent=record.description;
      const action=inspector.querySelector('button');action.disabled=!allowed;action.textContent=allowed?'Abrir actividad →':`Disponible en el momento ${index+1}`;
      action.onclick=()=>{if(allowed&&typeof window.goStep==='function')window.goStep(record.step);};
      route.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.step===record.step)));labels.forEach(l=>l.button.setAttribute('aria-pressed',String(l.record===record)));
      stage.querySelector('.cosmos-reset').hidden=!focusPlanet;stage.querySelector('.cosmos-heading.system h2').textContent=focusPlanet===parentPlanet?'Satélites del planeta empleado':focusPlanet?'Planeta empleado':'Sistema del cliente';
      stage.querySelector('.cosmos-actors').hidden=focusPlanet!==parentPlanet;
      stage.querySelectorAll('[data-actor]').forEach(b=>b.setAttribute('aria-pressed',String(record.id===`satellite-${b.dataset.actor}`)));
      // The explicit close-up contains only this planet and its own satellites.
      // Other orbits cannot cross it while their owners are off-screen.
      records.filter(r=>r.visual).forEach(r=>r.visual.traverse(o=>o.layers.disable(4)));
      if(focusPlanet)systemRecords().forEach(r=>r.visual.traverse(o=>o.layers.enable(4)));
      cameras.system.layers.set(focusPlanet?4:2);
      moving.forEach(o=>{if(o.line){o.line.layers.disable(4);o.line.visible=!!o.body&&(!focusPlanet||o.parent===galaxyRoot||o.parent===focusPlanet.object);if(focusPlanet&&o.parent===focusPlanet.object)o.line.layers.enable(4);}});
    }
    function addLabel(record,text,view='system',offset=22){
      const button=document.createElement('button');button.className=`cosmos-object-label ${record.kind}`;button.innerHTML=text;button.setAttribute('aria-pressed','false');button.onclick=()=>select(record,record.kind==='satellite');
      stage.querySelector('.cosmos-labels').append(button);labels.push({record,button,view,offset});
    }
    addLabel(clientRecord,'<small>Estrella</small><b>Cliente</b>','system',38);
    talentRecords.forEach(r=>addLabel(r,`<b>${r.name}</b>`,'system',23));
    records.filter(r=>r.kind==='waypoint').forEach(r=>addLabel(r,`<b>${r.title}</b>`,'system',25));
    addLabel(records.find(r=>r.id==='satellite-0'),'<small>Otros actores</small><b>Satélites ↗</b>','system',48);
    [1,2].forEach(i=>{const r=records.find(r=>r.id===`satellite-${i}`);addLabel(r,`<b>${r.title}</b>`,'system',25);labels[labels.length-1].focusOnly=true;});
    addLabel(clientRecord,'<b>Cliente seleccionado ↗</b>','galaxy',17);
    const guideButton=document.createElement('button');guideButton.className='cosmos-object-label';guideButton.innerHTML='<b>Explorar nuestra guía ↗</b>';guideButton.onclick=()=>select(constellation);stage.querySelector('.cosmos-labels').append(guideButton);
    route.querySelectorAll('button').forEach(b=>b.onclick=()=>select(recordForStep(b.dataset.step),b.dataset.step==='satelites'));
    tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{mobileView=b.dataset.view;resize();});
    stage.querySelectorAll('[data-actor]').forEach(b=>b.onclick=()=>select(records.find(r=>r.id===`satellite-${b.dataset.actor}`),true));
    stage.querySelector('.cosmos-overview-link').onclick=()=>{mobileView='system';select(clientRecord);resize();};stage.querySelector('.cosmos-reset').onclick=()=>select(clientRecord);
    function updatePause(){const b=stage.querySelector('.cosmos-pause');b.textContent=paused?'▷ Reanudar':'Ⅱ Pausar';b.setAttribute('aria-pressed',String(paused));}
    stage.querySelector('.cosmos-pause').onclick=()=>{paused=!paused;updatePause();};updatePause();
    const motionChange=e=>{paused=e.matches;updatePause();};reduced.addEventListener('change',motionChange);
    function fit(camera,rect,span,target,offset){
      const aspect=rect.w/Math.max(rect.h,1),horizontal=Math.max(span,span*.61*aspect);
      camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/aspect/2;camera.bottom=-camera.top;
      camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    }
    function bodyExtent(record){
      if(record.extent!==undefined)return record.extent;
      const origin=record.object.getWorldPosition(new T.Vector3());let radius=0;
      record.visual.traverse(o=>{if(!o.isMesh||!o.geometry)return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const b=o.geometry.boundingSphere;
        const scale=o.getWorldScale(new T.Vector3()),center=b.center.clone().applyMatrix4(o.matrixWorld);
        radius=Math.max(radius,center.distanceTo(origin)+b.radius*Math.max(scale.x,scale.y,scale.z));});
      record.extent=Math.max(.2,radius);return record.extent;
    }
    function orbitalEnvelope(){
      const center=focusPlanet?.object||primaryOrbit.anchor;if(framingCache.has(center))return framingCache.get(center);
      const envelope={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
      systemRecords().forEach(record=>{
        let node=record.object,h=0,v=0,rangeH=0,rangeV=0;
        while(node&&node!==center){
          const parent=node.parent;if(!parent)break;const motion=motionByAnchor.get(node);
          const xAxis=new T.Vector3(1,0,0).transformDirection(parent.matrixWorld),zAxis=new T.Vector3(0,0,1).transformDirection(parent.matrixWorld);
          if(motion){const a=motion.radius,b=a*Math.sqrt(1-motion.eccentricity*motion.eccentricity);
            h-=a*motion.eccentricity*screenRight.dot(xAxis);v-=a*motion.eccentricity*screenUp.dot(xAxis);
            rangeH+=Math.hypot(a*screenRight.dot(xAxis),b*screenRight.dot(zAxis));rangeV+=Math.hypot(a*screenUp.dot(xAxis),b*screenUp.dot(zAxis));
          }else{const offset=node.position.clone().applyMatrix3(new T.Matrix3().setFromMatrix4(parent.matrixWorld));h+=screenRight.dot(offset);v+=screenUp.dot(offset);}
          node=parent;
        }
        const extent=bodyExtent(record);envelope.left=Math.min(envelope.left,h-rangeH-extent);envelope.right=Math.max(envelope.right,h+rangeH+extent);envelope.bottom=Math.min(envelope.bottom,v-rangeV-extent);envelope.top=Math.max(envelope.top,v+rangeV+extent);
      });
      const minimum=focusPlanet?7.1:37;envelope.left=Math.min(envelope.left,-minimum/2);envelope.right=Math.max(envelope.right,minimum/2);
      framingCache.set(center,envelope);return envelope;
    }
    function fitSystem(){
      const camera=cameras.system,r=views.system,e=orbitalEnvelope(),sidePad=Math.min(24,r.w*.06),topPad=Math.min(18,r.h*.1),bottomPad=Math.min(focusPlanet?48:68,r.h*.24);
      const usableW=Math.max(1,r.w-sidePad*2),usableH=Math.max(1,r.h-topPad-bottomPad);
      const units=Math.max((e.right-e.left)/usableW,(e.top-e.bottom)/usableH);
      const center=(focusPlanet?.object||primaryOrbit.anchor).getWorldPosition(new T.Vector3());
      const target=center.addScaledVector(screenRight,(e.left+e.right)/2).addScaledVector(screenUp,(e.top+e.bottom)/2+(topPad-bottomPad)*units/2);
      camera.left=-r.w*units/2;camera.right=r.w*units/2;camera.top=r.h*units/2;camera.bottom=-r.h*units/2;camera.position.copy(target).add(cameraOffset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      r.safeRect={left:r.x+sidePad,right:r.x+r.w-sidePad,top:r.y+topPad,bottom:r.y+r.h-bottomPad};
    }
    function resize(){
      const box=stage.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);compact=window.matchMedia('(max-width: 800px)').matches;renderer.setSize(width,height,false);
      views.galaxy=compact?{x:0,y:35,w:width,h:height*.43-35}:{x:0,y:38,w:width*.3,h:height*.5-30};
      views.constellation=compact?{x:0,y:height*.65,w:width,h:height*.32}:{x:0,y:height*.75,w:width*.3,h:height*.24};
      views.system=compact?{x:0,y:78,w:width,h:height-78}:{x:width*.31,y:40,w:width*.69,h:height-40};
      views.galaxy.visible=views.constellation.visible=!compact||mobileView==='galaxy';views.system.visible=!compact||mobileView==='system';
      stage.querySelector('.cosmos-heading.galaxy').hidden=!views.galaxy.visible;stage.querySelector('.cosmos-heading.constellations').hidden=!views.constellation.visible;stage.querySelector('.cosmos-heading.system').hidden=!views.system.visible;stage.querySelector('.cosmos-overview-link').hidden=!views.galaxy.visible;
      stage.querySelector('.cosmos-actors').hidden=focusPlanet!==parentPlanet||!views.system.visible;
      tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===mobileView)));stage.querySelector('svg').setAttribute('viewBox',`0 0 ${width} ${height}`);
      const clip=stage.querySelector('clipPath rect'),cv=views.constellation;['x','y'].forEach(k=>clip.setAttribute(k,cv[k]));clip.setAttribute('width',cv.w);clip.setAttribute('height',cv.h);
    }
    const observer=new ResizeObserver(resize);observer.observe(stage);
    function project(object,view){const v=views[view];object.getWorldPosition(temp);temp.project(cameras[view]);return{x:v.x+(temp.x+1)*v.w/2,y:v.y+(1-temp.y)*v.h/2,z:temp.z};}
    function updatePositions(){
      moving.forEach(o=>{const mean=o.phase+elapsed*TAU/o.period;let a=mean;for(let j=0;j<3;j++)a=mean+o.eccentricity*Math.sin(a);o.anchor.position.set(o.radius*(Math.cos(a)-o.eccentricity),0,o.radius*Math.sqrt(1-o.eccentricity*o.eccentricity)*Math.sin(a));});
      spinning.forEach(s=>{s.object.rotation.y=(s.phase||0)+elapsed*s.speed;});materials.forEach(m=>{if(m.uniforms?.uTime)m.uniforms.uTime.value=elapsed;});
      scene.updateMatrixWorld(true);primaryOrbit.anchor.getWorldPosition(mainWorld);lightPosition.copy(mainWorld);sunlight.position.copy(mainWorld);
      fit(cameras.galaxy,views.galaxy,224,new T.Vector3(),new T.Vector3(0,100,170));fit(cameras.constellation,views.constellation,145,new T.Vector3(),new T.Vector3(0,95,180));
      fitSystem();
    }
    function draw(){
      updatePositions();renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
      Object.keys(views).forEach(name=>{const r=views[name];if(!r.visible||r.h<=0)return;moving.forEach(o=>{if(o.line)o.line.material.uniforms.uViewport.value.set(r.w,r.h);});renderer.setViewport(r.x,height-r.y-r.h,r.w,r.h);renderer.setScissor(r.x,height-r.y-r.h,r.w,r.h);renderer.clearDepth();renderer.render(scene,cameras[name]);});renderer.setScissorTest(false);
      const placed=[];const priority=l=>l.record===selected?0:l.record.kind==='client'?1:l.record.kind==='planet'?2:3;
      [...labels].sort((a,b)=>priority(a)-priority(b)).forEach(l=>{
        const v=views[l.view],p=project(l.record.object,l.view),inFocus=!focusPlanet||l.view!=='system'||l.record===focusPlanet||(focusPlanet===parentPlanet&&l.record.kind==='satellite');
        const show=v.visible&&inFocus&&!(compact&&focusPlanet&&l.view==='system')&&(!l.focusOnly||focusPlanet===parentPlanet)&&p.z>=-1&&p.z<=1;
        l.button.hidden=!show;if(show){
          if(l.record.id==='satellite-0')l.button.querySelector('b').textContent=focusPlanet===parentPlanet?'Proveedores y contratistas':'Satélites ↗';
          const half=l.button.offsetWidth/2+4,halfHeight=l.button.offsetHeight/2+5;l.button.style.left=`${Math.max(v.x+half,Math.min(v.x+v.w-half,p.x))}px`;l.button.style.top=`${Math.max(v.y+halfHeight,Math.min(v.y+v.h-halfHeight,p.y+l.offset))}px`;
          const rect=l.button.getBoundingClientRect(),collision=placed.some(r=>rect.left<r.right+3&&rect.right>r.left-3&&rect.top<r.bottom+3&&rect.bottom>r.top-3);
          l.button.style.visibility=collision?'hidden':'';l.button.setAttribute('aria-hidden',String(collision));if(!collision)placed.push(rect);
        }
      });
      const cv=views.constellation;guideButton.hidden=!cv.visible;guideButton.style.left=`${cv.x+cv.w/2}px`;guideButton.style.top=`${cv.y+cv.h-12}px`;
      const path=stage.querySelector('svg path');path.parentNode.style.display=cv.visible?'':'none';const pts=stars.slice(0,7).map(s=>project(s.object,'constellation'));
      path.setAttribute('d',cv.visible?[0,2,4,1,5,3,6].map((n,i)=>`${i?'L':'M'}${pts[n].x.toFixed(2)},${pts[n].y.toFixed(2)}`).join(' '):'');
    }
    const raycaster=new T.Raycaster(),pointer=new T.Vector2();
    function pick(event){
      const box=stage.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;
      const view=Object.keys(views).find(k=>{const r=views[k];return r.visible&&x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;});if(!view)return;
      if(view==='constellation'){select(constellation);return;}if(view==='galaxy'){select(galaxyRecord);return;}
      const v=views[view];pointer.set((x-v.x)/v.w*2-1,-(y-v.y)/v.h*2+1);raycaster.layers.set(focusPlanet?4:2);raycaster.setFromCamera(pointer,cameras[view]);
      const hits=raycaster.intersectObjects(systemRecords().map(r=>r.visual),true);const hit=hits.find(h=>!h.object.isSprite&&h.object.isMesh&&!h.object.material.transparent);
      if(!hit){const nearest=systemRecords().map(r=>({record:r,p:project(r.object,'system')})).map(r=>({...r,distance:Math.hypot(r.p.x-x,r.p.y-y)})).sort((a,b)=>a.distance-b.distance)[0];if(nearest&&nearest.distance<=Math.max(18,bodyExtent(nearest.record)*v.w/(cameras.system.right-cameras.system.left)))select(nearest.record,nearest.record.kind==='satellite');return;}
      let object=hit.object,record;while(object&&!record){record=records.find(r=>r.visual===object);object=object.parent;}if(record)select(record,record.kind==='satellite');
    }
    renderer.domElement.addEventListener('click',pick);
    const contextLost=event=>{if(disposed)return;event.preventDefault();window.destroyClientOrbitalScene();if(fallback){fallback.hidden=false;fallback.querySelector('p').textContent='La vista 3D se interrumpió. Puedes continuar con las actividades aquí.';}};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    // Orbital speed is time-based, not frame-rate based. Reset the clock when
    // returning from a hidden tab instead of fast-forwarding the universe.
    const visibilityChange=()=>{clock.getDelta();};document.addEventListener('visibilitychange',visibilityChange);
    function frame(){if(disposed)return;const dt=clock.getDelta();if(!paused&&!document.hidden)elapsed+=dt;draw();animation=requestAnimationFrame(frame);}
    function auditVisibility(){
      const view=views.system,safe=view.safeRect,pixelsPerUnit=view.w/(cameras.system.right-cameras.system.left);
      return {view:focusPlanet?'detail':'system',safeRect:{...safe},objects:systemRecords().map(r=>{
        const p=project(r.object,'system'),radius=bodyExtent(r)*pixelsPerUnit,bounds={left:p.x-radius,right:p.x+radius,top:p.y-radius,bottom:p.y+radius};
        const inside=bounds.left>=safe.left-.01&&bounds.right<=safe.right+.01&&bounds.top>=safe.top-.01&&bounds.bottom<=safe.bottom+.01;
        let rendered=false;r.visual.traverse(o=>{if(o.isMesh&&!o.material.transparent&&o.layers.test(cameras.system.layers))rendered=true;});
        return{id:r.id,kind:r.kind,bounds,inside,selectable:inside&&rendered&&p.z>=-1&&p.z<=1};
      }),orbitGuides:moving.filter(o=>o.line).map(o=>({ownerId:records.find(r=>r.visual===o.body)?.id||'galaxy-star',visible:o.line.visible,occupied:!!o.body&&o.anchor.children.includes(o.body),soft:!!o.line.material.uniforms?.uFeather,opacity:o.line.material.uniforms?.uAlpha.value}))};
    }
    const debug={snapshot:()=>({elapsed,paused,selected:selected.id,focus:focusPlanet?.id||null,assetsReady:realm.__planetMaterialSession?.getState().ready??true,assetErrors:realm.__planetMaterialSession?.getState().errors||[],shaderErrors:[...shaderErrors],views:JSON.parse(JSON.stringify(views)),triangles:renderer.info.render.triangles,
      objects:records.filter(r=>r.object).map(r=>{let node=r.object.parent,parent;while(node&&!parent){parent=records.find(p=>p.object===node);node=node.parent;}return{id:r.id,kind:r.kind,position:r.object.getWorldPosition(new T.Vector3()).toArray(),local:r.object.position.toArray(),parent:parent?.id||'galaxy',rotation:r.visual?.children[0]?.rotation.toArray().slice(0,3),sphere:r.visual?.children.some(n=>n.geometry?.type==='SphereGeometry')||false};}),orbitPeriods:moving.map(o=>o.period),bodyCount:records.filter(r=>r.visual).length}),
      advance:seconds=>{elapsed+=seconds;draw();return debug.snapshot();},setTime:(seconds,render=true)=>{elapsed=Math.max(0,Number(seconds)||0);if(render)draw();else updatePositions();},auditVisibility,
      select:id=>{const r=records.find(r=>r.id===id);if(r){select(r,r.kind==='satellite');draw();}},project:id=>{const r=records.find(r=>r.id===id);return r?.object?project(r.object,'system'):null;}};
    const cleanup=()=>{disposed=true;cancelAnimationFrame(animation);observer.disconnect();reduced.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibilityChange);renderer.domElement.removeEventListener('click',pick);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set(),allMaterials=new Set(materials);scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)allMaterials.add(o.material);});geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());realm.__planetMaterialSession?.dispose();delete realm.__planetMaterialSession;glow.dispose();renderer.dispose();renderer.forceContextLoss();tabs.remove();stage.remove();inspector.remove();route.remove();if(window.__universeDebug===debug)delete window.__universeDebug;};
    active=cleanup;resize();select(clientRecord);frame();
    if(shaderErrors.length)throw new Error('No fue posible compilar el material 3D.');
    window.__universeDebug=debug;return cleanup;
  }
  window.destroyClientOrbitalScene=function(){if(active){active();active=null;}};
  window.initClientOrbitalScene=function(progress=0){window.destroyClientOrbitalScene();const realm=document.querySelector('.orbital-realm');if(!realm)return;
    try{if(!window.THREE)throw new Error('El motor 3D no está disponible.');active=build(realm,Math.max(0,progress));}
    catch(error){if(active){active();active=null;}console.error('No se pudo iniciar la escena 3D:',error);const fallback=realm.querySelector('.cosmos-fallback');if(fallback){fallback.hidden=false;fallback.querySelector('p').textContent='No se pudo cargar la vista 3D. Puedes continuar con las actividades aquí.';}}
  };
})();

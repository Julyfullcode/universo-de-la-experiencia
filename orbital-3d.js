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
    active=()=>{realm.__planetMaterialSession?.dispose();delete realm.__planetMaterialSession;renderer.dispose();renderer.forceContextLoss();realm.querySelectorAll('.cosmos-tabs,.cosmos-stage,.cosmos-navigation,.cosmos-inspector,.cosmos-route').forEach(e=>e.remove());};
    renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
    const fallback=realm.querySelector('.cosmos-fallback');
    const tabs=document.createElement('div');tabs.className='cosmos-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Escala del universo');
    tabs.innerHTML='<button role="tab" data-view="system" aria-selected="true">Sistema estelar</button><button role="tab" data-view="galaxy" aria-selected="false">Galaxia y guía</button>';
    const stage=document.createElement('div');stage.className='cosmos-stage';
    stage.innerHTML=`<div class="cosmos-galaxy-caption" aria-hidden="true">Galaxia empresa</div>
      <div class="cosmos-heading constellations"><small>Una guía en el cielo</small><h2>Constelaciones</h2></div>
      <div class="cosmos-tools"><button class="cosmos-reset" hidden>Ver sistema ↗</button></div>
      <div class="cosmos-actors" role="group" aria-label="Seleccionar un actor del ecosistema" hidden><button data-actor="0">Proveedores y contratistas</button><button data-actor="1">Dueño</button><button data-actor="2">Comunidad</button></div>
      <svg class="cosmos-constellation-lines" aria-hidden="true"><defs><clipPath id="constellation-viewport"><rect/></clipPath><linearGradient id="constellation-light"><stop stop-color="#91def4" stop-opacity=".15"/><stop offset=".5" stop-color="#c5b7ff" stop-opacity=".6"/><stop offset="1" stop-color="#dfc5ed" stop-opacity=".2"/></linearGradient></defs><path clip-path="url(#constellation-viewport)" fill="none" stroke="url(#constellation-light)" stroke-width="1"/></svg><div class="cosmos-labels"></div>`;
    stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Universo tridimensional. También puedes seleccionar los elementos con los botones del recorrido.');
    const inspector=document.createElement('section');inspector.className='cosmos-inspector cosmos-availability';inspector.setAttribute('aria-label','Disponibilidad de la actividad seleccionada');
    inspector.innerHTML='<button class="cosmos-action"></button>';
    const route=document.createElement('div');route.className='cosmos-route';route.setAttribute('role','group');route.setAttribute('aria-label','Explorar el recorrido');
    route.innerHTML=chapters.map(([id,name],i)=>`<button data-step="${id}" aria-pressed="false"><span>0${i+1}</span>${name}</button>`).join('');
    const navigation=document.createElement('div');navigation.className='cosmos-navigation';navigation.setAttribute('aria-label','Navegación por los siete momentos');navigation.append(route,inspector);
    realm.append(tabs,stage,navigation);if(fallback)fallback.hidden=true;
    const scene=new T.Scene(),clock=new T.Clock(),glow=glowTexture(T),rng=seededRandom(8249);
    const materials=[],records=[],moving=[],spinning=[],labels=[],stars=[],solarFlares=[];
    const lightPosition=new T.Vector3(),mainWorld=new T.Vector3(),temp=new T.Vector3();
    let animation,elapsed=0,disposed=false,width=1,height=1,displayScale=1,compact=false,mobileView='system',selected,focusPlanet=null,hovered=null,mousePoint=null;
    const MAX_HOVER_SCALE=1.14;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;
    const views={},shaderErrors=[];
    renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{shaderErrors.push([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].join('\n'));};
    const cameras={galaxy:new T.OrthographicCamera(),system:new T.OrthographicCamera(),constellation:new T.OrthographicCamera(),launch:new T.OrthographicCamera()};
    cameras.galaxy.layers.set(0);cameras.galaxy.layers.enable(1);cameras.system.layers.set(2);cameras.constellation.layers.set(3);cameras.launch.layers.set(5);
    Object.values(cameras).forEach(c=>{c.near=.1;c.far=1200;});
    const hemi=new T.HemisphereLight(0xa9dfff,0x302352,2.6);hemi.layers.enableAll();scene.add(hemi);
    const sunlight=new T.PointLight(0xa1d9ff,55,80,1);sunlight.layers.enableAll();scene.add(sunlight);
    const rim=new T.DirectionalLight(0xc28cff,2.2);rim.position.set(-10,15,8);rim.layers.enableAll();scene.add(rim);
    function layer(object,value){object.traverse(o=>o.layers.set(value));return object;}
    function standard(color,metalness=.25){const m=new T.MeshStandardMaterial({color,metalness,roughness:.42});materials.push(m);return m;}
    function mesh(geometry,material,parent){const m=new T.Mesh(geometry,material);m.layers.set(2);if(parent)parent.add(m);return m;}
    function halo(parent,color,size,opacity=.45){const m=new T.SpriteMaterial({map:glow,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false});materials.push(m);const s=new T.Sprite(m);s.scale.set(size,size,1);parent.add(s);return s;}
    function star(radius,color,hero=false){
      const g=new T.Group(),m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new T.Color(color)},uHero:{value:hero?1:0}},vertexShader:surfaceVertex,fragmentShader:`
        uniform float uTime,uHero;uniform vec3 uColor;varying vec3 vLocal,vWorld,vNormal;${noiseGLSL}
        void main(){
          vec3 p=normalize(vLocal);
          float plasmaSpeed=.008+uHero*.023;
          vec3 drift=vec3(uTime*plasmaSpeed,-uTime*plasmaSpeed*.64,uTime*plasmaSpeed*.78);
          float broad=fbm(p*3.15+drift*.55);
          vec3 flow=p*(8.4+uHero*1.6)+vec3(broad*3.7,-broad*2.5,broad*3.1)+drift;
          float convection=fbm(flow);
          float granules=noise3(flow*2.85+vec3(convection*2.7));
          float veins=pow(1.-abs(noise3(flow*1.28+convection*4.2)*2.-1.),4.5);
          float stormField=fbm(p*2.45+vec3(-uTime*(.003+uHero*.010),uTime*(.002+uHero*.007),broad*.38));
          float sunspot=smoothstep(.56,.73,stormField)*smoothstep(.22,.68,convection);
          float stormRim=(smoothstep(.48,.61,stormField)-smoothstep(.72,.86,stormField))*(.40+.74*veins);
          float heat=clamp(.10+convection*.50+granules*.18+veins*.22,0.,1.);
          vec3 ember=mix(uColor*.30,vec3(.30,.018,.002),uHero*.92);
          vec3 orange=mix(uColor,vec3(1.,.20,.008),uHero*.90);
          vec3 yellow=mix(mix(uColor,vec3(1.),.52),vec3(1.,.68,.10),uHero*.92);
          vec3 c=mix(ember,orange,smoothstep(.08,.64,heat));
          c=mix(c,yellow,smoothstep(.43,.88,heat)*(.48+.42*granules));
          c=mix(c,vec3(.055,.002,.001),sunspot*(.64+.32*uHero));
          c+=vec3(.26,.055,.004)*stormRim*(.22+.75*uHero);
          float face=max(dot(normalize(cameraPosition-vWorld),normalize(vNormal)),0.);
          c*=.60+.40*pow(face,.36);
          c+=mix(uColor,vec3(1.,.25,.018),.84)*pow(1.-face,4.1)*(.18+.22*uHero);
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`});
      materials.push(m);const surface=mesh(new T.SphereGeometry(radius,64,48),m,g);spinning.push({object:surface,speed:.014});
      // A real spherical atmosphere preserves the silhouette at every angle.
      // Only light is translucent; the photosphere above remains fully opaque.
      const corona=new T.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new T.Color(color)},uHero:{value:hero?1:0}},vertexShader:surfaceVertex,
        fragmentShader:`uniform float uTime,uHero;uniform vec3 uColor;varying vec3 vLocal,vWorld,vNormal;${noiseGLSL}
          void main(){vec3 p=normalize(vLocal);float facing=abs(dot(normalize(cameraPosition-vWorld),normalize(vNormal)));
            float rim=pow(1.-facing,3.15);float plasma=fbm(p*9.+vec3(0.,uTime*.007,0.));
            float streamers=pow(1.-abs(noise3(p*23.+plasma*3.)*2.-1.),3.);
            float alpha=rim*(.065+plasma*(.20+.08*uHero)+streamers*(.10+.08*uHero));
            gl_FragColor=vec4(mix(uColor,vec3(1.,.66,.18),.22+.52*uHero),alpha);
            #include <colorspace_fragment>
          }`,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
      materials.push(corona);mesh(new T.SphereGeometry(radius*(hero?1.21:1.16),48,32),corona,g);
      const arcMaterial=new T.MeshBasicMaterial({color:new T.Color(color).lerp(new T.Color(hero?0xff7b24:0xd8f5ff),hero?.58:.68),transparent:true,opacity:hero?.58:.48,blending:T.AdditiveBlending,depthWrite:false});materials.push(arcMaterial);
      const arcs=new T.Group();g.add(arcs);
      for(let i=0;i<(hero?6:4);i++){
        const longitude=i*2.399+.45,latitude=.18+Math.sin(i*1.73)*.67;
        const radial=new T.Vector3(Math.cos(longitude)*Math.cos(latitude),Math.sin(latitude),Math.sin(longitude)*Math.cos(latitude));
        const tangent=new T.Vector3(-Math.sin(longitude),0,Math.cos(longitude));
        const point=(height,side)=>radial.clone().multiplyScalar(radius*height).addScaledVector(tangent,radius*side);
        const crest=hero?1.34+(i%3)*.15:1.24+(i%2)*.08,flare=new T.Group();arcs.add(flare);
        const curve=new T.CubicBezierCurve3(point(.99,-.17),point(crest,-.34),point(crest,.31),point(.99,.17));
        mesh(new T.TubeGeometry(curve,32,radius*(hero?.010:.006),7,false),arcMaterial,flare);
        if(hero){const wisp=new T.CubicBezierCurve3(point(1.005,-.14),point(crest*1.035,-.25),point(crest*1.035,.29),point(1.005,.14));mesh(new T.TubeGeometry(wisp,28,radius*.0045,6,false),arcMaterial,flare);}
        solarFlares.push({object:flare,phase:i*1.71});
      }
      spinning.push({object:arcs,speed:hero?.0042:.008});halo(g,hero?0xff6814:color,radius*(hero?6.9:5.6),hero?.74:.64);halo(g,hero?0xffe0a0:0xd9f4ff,radius*(hero?3.18:2.6),hero?.37:.23);return g;
    }
    function planet(radius,primary,secondary,mode,seed){
      const session=realm.__planetMaterialSession||(realm.__planetMaterialSession=window.UniversePlanetMaterials.createSession(T,{lightPosition,materials,spinning}));
      const kind=Math.abs(seed-12.7)<.01?'earth':['neptune','uranus','saturn','mars','jupiter'][Math.round(seed/7.1)];
      return session.create({radius,kind});
    }
    // The visible path and the animated position share the same ellipse.
    function orbit(parent,radius,period,phase,tilt=0,color=0x678cb2,eccentricity=0,showGuide=true,orientation={}){
      // The parent is at a focus, not the geometric centre. Each orbital plane
      // has its own inclination and direction of periapsis; surface spin never
      // rotates this frame or the satellites attached to its moving anchor.
      const plane=new T.Group();plane.rotation.set(orientation.pitch||0,orientation.yaw||0,tilt,'YXZ');parent.add(plane);const anchor=new T.Group();plane.add(anchor);
      let line=null;
      if(showGuide){
        // A broad, translucent dust wake with a stable, seamless noise field.
        // Its colour and density change along the ellipse, but no animated
        // texture or refreshed particle grid is used. The centre has no stroke.
        const positions=[],tangents=[],sides=[],angles=[],indices=[],segments=256,b=radius*Math.sqrt(1-eccentricity*eccentricity);
        for(let i=0;i<=segments;i++){
          const t=i/segments*TAU,dx=-radius*Math.sin(t),dz=b*Math.cos(t),length=Math.hypot(dx,dz);
          [-1,1].forEach(side=>{positions.push(radius*(Math.cos(t)-eccentricity),0,b*Math.sin(t));tangents.push(dx/length,0,dz/length);sides.push(side);angles.push(t);});
          if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
        }
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('orbitTangent',new T.Float32BufferAttribute(tangents,3));geometry.setAttribute('edgeSide',new T.Float32BufferAttribute(sides,1));geometry.setAttribute('orbitAngle',new T.Float32BufferAttribute(angles,1));geometry.setIndex(indices);
        const material=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(color)},uViewport:{value:new T.Vector2(1,1)},uFeather:{value:8.4},uAlpha:{value:.15}},
          vertexShader:`attribute vec3 orbitTangent;attribute float edgeSide,orbitAngle;uniform vec2 uViewport;uniform float uFeather;varying float vEdge,vAngle;
            void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vec4 q=projectionMatrix*modelViewMatrix*vec4(position+orbitTangent,1.);
              vec2 d=(q.xy/q.w-p.xy/p.w)*uViewport;vec2 n=vec2(-d.y,d.x)/max(length(d),.0001);
              float swell=.88+.17*sin(orbitAngle*3.+.7)+.12*sin(orbitAngle*7.-1.3);
              float displayScale=clamp(min(uViewport.x,uViewport.y)/430.,.72,1.8);
              p.xy+=n*edgeSide*uFeather*swell*displayScale*2./uViewport*p.w;vEdge=edgeSide;vAngle=orbitAngle;gl_Position=p;}`,
          fragmentShader:`uniform vec3 uColor;uniform float uAlpha;varying float vEdge,vAngle;${noiseGLSL}
            void main(){vec2 arc=vec2(cos(vAngle),sin(vAngle));
              float cloud=fbm(vec3(arc*4.3,vEdge*2.1));
              float drift=.19*sin(vAngle*3.+cloud*2.)+.11*sin(vAngle*7.-.8);
              float d=abs(vEdge-drift),edge=1.-smoothstep(.58,1.,abs(vEdge));
              float mist=exp(-d*d*4.6)*edge;
              float pockets=smoothstep(.22,.66,cloud);
              float grains=pow(noise3(vec3(arc*67.,vEdge*15.)),5.);
              float density=(.18+pockets*.82)*(.72+grains*.6);
              vec3 cyan=vec3(.23,.72,.91),violet=vec3(.57,.28,.91),rose=vec3(.78,.37,.77);
              vec3 dust=mix(cyan,violet,.5+.5*sin(vAngle*2.+cloud*2.));
              dust=mix(dust,rose,smoothstep(.55,1.,sin(vAngle*3.-1.))*.4);
              dust=mix(dust,uColor,.18);
              gl_FragColor=vec4(dust,uAlpha*mist*density);
              #include <colorspace_fragment>
            }`,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
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
      const g=new T.Group(),white=standard(0xe6f2ff,.46),purple=standard(0x8752db,.48),metal=standard(0x8aacc6,.78),dark=standard(0x112841,.55);
      mesh(new T.CylinderGeometry(.18,.21,1.02,32),white,g);
      const nose=mesh(new T.ConeGeometry(.185,.45,32),white,g);nose.position.y=.73;
      [-.43,.37].forEach(y=>{const band=mesh(new T.CylinderGeometry(.213,.213,.055,32),purple,g);band.position.y=y;});
      const collar=mesh(new T.CylinderGeometry(.215,.18,.16,32),metal,g);collar.position.y=-.55;
      const port=mesh(new T.TorusGeometry(.078,.018,8,28),metal,g);port.position.set(0,.15,.185);
      const windowMaterial=new T.MeshStandardMaterial({color:0x0a527c,metalness:.6,roughness:.13,emissive:0x157aa6,emissiveIntensity:.3});materials.push(windowMaterial);
      const portGlass=mesh(new T.SphereGeometry(.071,20,14),windowMaterial,g);portGlass.scale.z=.22;portGlass.position.set(0,.15,.198);
      const finShape=new T.Shape();finShape.moveTo(0,.16);finShape.lineTo(.27,-.21);finShape.lineTo(.27,-.35);finShape.lineTo(0,-.29);finShape.closePath();
      const finGeometry=new T.ExtrudeGeometry(finShape,{depth:.035,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:1,steps:1});
      for(let i=0;i<4;i++){const fin=mesh(finGeometry,purple,g);fin.rotation.y=i*TAU/4;fin.position.set(Math.cos(i*TAU/4)*.17,-.23,-Math.sin(i*TAU/4)*.17);}
      const nozzle=mesh(new T.CylinderGeometry(.115,.165,.20,24,1,true),dark,g);nozzle.position.y=-.69;
      const rim=mesh(new T.TorusGeometry(.16,.022,8,24),metal,g);rim.rotation.x=Math.PI/2;rim.position.y=-.79;
      const flameMaterial=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float uTime;varying vec2 vUv;void main(){float pulse=.9+.1*sin(uTime*3.2);
          vec3 c=mix(vec3(.18,.48,1.),vec3(.88,.97,1.),smoothstep(.1,.83,vUv.y));
          gl_FragColor=vec4(c,(.3+.55*(1.-vUv.y))*pulse);
          #include <colorspace_fragment>
        }`,transparent:true,blending:T.AdditiveBlending,depthWrite:false});materials.push(flameMaterial);
      const engine=mesh(new T.ConeGeometry(.14,.44,24),flameMaterial,g);engine.rotation.z=Math.PI;engine.position.y=-1.;
      const coreMaterial=new T.MeshBasicMaterial({color:0xe1faff});materials.push(coreMaterial);
      const core=mesh(new T.ConeGeometry(.064,.28,20),coreMaterial,g);core.rotation.z=Math.PI;core.position.y=-.91;
      const engineGlow=new T.Group();engineGlow.position.y=-.84;g.add(engineGlow);halo(engineGlow,0x43bfff,.7,.4);
      g.rotation.z=-.72;g.rotation.x=.08;return g;
    }
    function telescope(){
      const g=new T.Group(),silver=standard(0xd8e3eb,.72),gold=standard(0xf0ba62,.67),dark=standard(0x101c30,.55),frame=standard(0x90aac6,.7);
      const panelMaterial=new T.MeshStandardMaterial({color:0x12479b,metalness:.4,roughness:.32,emissive:0x092147,emissiveIntensity:.25});materials.push(panelMaterial);
      const rear=mesh(new T.CylinderGeometry(.285,.32,.53,20),gold,g);rear.rotation.x=Math.PI/2;rear.position.z=-.27;
      const tube=mesh(new T.CylinderGeometry(.3,.3,.7,40,1,true),silver,g);tube.rotation.x=Math.PI/2;tube.position.z=.32;
      // The recessed mirror and open baffle give the aperture actual depth.
      const baffle=mesh(new T.CylinderGeometry(.281,.264,.59,36,1,true),dark,g);baffle.rotation.x=Math.PI/2;baffle.position.z=.37;baffle.material.side=T.DoubleSide;
      const mirrorMaterial=new T.MeshStandardMaterial({color:0x153964,metalness:.84,roughness:.12,emissive:0x071c38,emissiveIntensity:.25,side:T.DoubleSide});materials.push(mirrorMaterial);
      const mirror=mesh(new T.CircleGeometry(.264,36),mirrorMaterial,g);mirror.position.z=.09;
      [-.49,-.04,.67].forEach(z=>{const ring=mesh(new T.TorusGeometry(.302,.024,8,36),frame,g);ring.position.z=z;});
      const secondary=mesh(new T.CylinderGeometry(.05,.065,.08,16),silver,g);secondary.rotation.x=Math.PI/2;secondary.position.z=.59;
      for(let i=0;i<3;i++){const support=mesh(new T.BoxGeometry(.26,.012,.018),frame,g);const angle=i*TAU/3;support.rotation.z=angle;support.position.set(Math.cos(angle)*.14,Math.sin(angle)*.14,.6);}
      const boom=mesh(new T.BoxGeometry(1.04,.045,.07),frame,g);boom.position.z=-.22;
      [-1,1].forEach(side=>{
        const panel=mesh(new T.BoxGeometry(.69,.028,.57),panelMaterial,g);panel.position.set(side*.795,0,-.22);
        for(let i=0;i<6;i++){const wire=mesh(new T.BoxGeometry(.009,.035,.58),gold,g);wire.position.set(side*(.455+i*.137),0,-.22);}
        for(let j=0;j<4;j++){const wire=mesh(new T.BoxGeometry(.70,.035,.009),frame,g);wire.position.set(side*.795,0,-.505+j*.19);}
      });
      const electronics=mesh(new T.BoxGeometry(.25,.16,.26),gold,g);electronics.position.set(0,-.28,-.23);
      const mast=mesh(new T.CylinderGeometry(.022,.028,.46,12),frame,g);mast.position.set(0,.42,-.35);
      const dish=mesh(new T.SphereGeometry(.22,28,18,0,TAU,0,Math.PI*.42),silver,g);dish.rotation.x=.56;dish.position.set(0,.67,-.35);
      const receiver=mesh(new T.CylinderGeometry(.028,.038,.28,12),gold,g);receiver.rotation.x=Math.PI/2-.56;receiver.position.set(0,.76,-.22);
      const lensMaterial=new T.MeshBasicMaterial({color:0x75eaff,transparent:true,opacity:.96,blending:T.AdditiveBlending,depthWrite:false});materials.push(lensMaterial);
      const lens=mesh(new T.CircleGeometry(.172,32),lensMaterial,g);lens.position.z=.692;
      const lensGlow=new T.Group();lensGlow.position.z=.72;g.add(lensGlow);halo(lensGlow,0x55dfff,.72,.52);
      [-1,1].forEach(side=>{
        const sensor=mesh(new T.CylinderGeometry(.075,.09,.36,18),dark,g);sensor.rotation.z=Math.PI/2;sensor.position.set(side*.42,-.24,-.1);
        const cap=mesh(new T.SphereGeometry(.078,16,12),gold,g);cap.position.set(side*.61,-.24,-.1);
      });
      g.rotation.set(-.14,-.42,.18);return g;
    }
    const galaxyRoot=new T.Group();scene.add(galaxyRoot);
    // Several stable, seeded particle volumes create a deep spiral nebula.
    // Fine stars, luminous dust and broad gas never share a grid or a flat image.
    function galaxyCloud(count,size,opacity,spreadScale,lightness){
      const cloudPositions=[],cloudColors=[];
      for(let i=0;i<count;i++){
        // Three broad, imperfect logarithmic arms with a soft inter-arm
        // population read as stellar dust rather than a diagrammatic pinwheel.
        const core=rng()<.22,r=core?Math.pow(rng(),1.92)*29:6+Math.pow(rng(),.69)*92;
        const arm=i%3,wobble=Math.sin(r*.091+arm*1.73)*.13+Math.sin(r*.027-arm*.8)*.075;
        const base=arm*TAU/3+r*.051+wobble,interarm=!core&&rng()<.14;
        const angular=(rng()+rng()+rng()-1.5)*(.105+r*.0052)*spreadScale+(interarm?(rng()-.5)*.9:0);
        const radial=(rng()+rng()+rng()-1.5)*(1.45+r*.061)*spreadScale;
        const rr=Math.max(.2,r+radial),a=base+angular;
        const thickness=(.55+7.8*Math.exp(-rr/21)+rr*.011)*spreadScale;
        const asymmetry=1+.045*Math.sin(a*2.3+rr*.036);
        cloudPositions.push(Math.cos(a)*rr*asymmetry,(rng()+rng()+rng()-1.5)*thickness,Math.sin(a)*rr*(2-asymmetry));
        const coreMix=Math.max(0,1-rr/31),armPulse=.5+.5*Math.sin(a*2.15+rr*.071);
        const c=new T.Color().setHSL(.56+rng()*.18,.42+rng()*.33,lightness+rng()*.19);
        c.lerp(new T.Color(0xdabaff),.09+.18*armPulse);if(coreMix)c.lerp(new T.Color(0xffe3bd),coreMix*.82);
        cloudColors.push(c.r,c.g,c.b);
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(cloudPositions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(cloudColors,3));
      const material=new T.PointsMaterial({map:glow,size,vertexColors:true,transparent:true,opacity,alphaTest:.003,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true});materials.push(material);
      const cloud=new T.Points(geometry,material);cloud.layers.set(1);galaxyRoot.add(cloud);return cloud;
    }
    const dust=galaxyCloud(9800,9.5,.15,1,.27);
    const fineDust=galaxyCloud(6800,2.8,.50,.72,.47);
    const nebulaDust=galaxyCloud(3900,22,.058,1.34,.24);
    const stellarKnots=galaxyCloud(1150,6.8,.39,.42,.57);
    const nebulae=new T.Group();
    [[-46,1,-11,0x6445b7,31,1.55,.46,.3],[-27,-2,27,0x2d8fc5,27,1.8,.42,-.45],[-4,1,-34,0x8a5cba,25,1.5,.5,.7],[25,1,21,0xa44cab,34,1.72,.43,.2],[47,-1,-13,0x347bc1,28,1.62,.44,-.55],[-58,0,19,0xa6559f,24,1.45,.48,.4],[62,1,13,0x545bc8,21,1.65,.4,-.2]].forEach(([x,y,z,color,size,sx,sy,rotation])=>{
      const pocket=new T.Group();pocket.position.set(x,y,z);const haze=halo(pocket,color,size,.052);haze.scale.set(size*sx,size*sy,1);haze.material.rotation=rotation;nebulae.add(pocket);
    });
    layer(nebulae,1);galaxyRoot.add(nebulae);
    const nucleus=new T.Group();
    const coreMist=halo(nucleus,0xb8b8ff,39,.14);coreMist.scale.set(47,18,1);coreMist.material.rotation=.22;
    const warmCore=halo(nucleus,0xffb578,21,.30);warmCore.scale.set(25,11,1);warmCore.material.rotation=.22;
    halo(nucleus,0xffe6bd,7.5,.68);layer(nucleus,1);galaxyRoot.add(nucleus);
    const galaxyClouds=[dust,fineDust,nebulaDust,stellarKnots,nebulae,nucleus];
    spinning.push({object:dust,speed:.00105},{object:fineDust,speed:.00083},{object:nebulaDust,speed:.00061},{object:stellarKnots,speed:.00092},{object:nebulae,speed:.00072});
    const primaryOrbit=orbit(galaxyRoot,57,1500,.18,.025,0x95ccff,.18,true,{pitch:.035,yaw:.28});primaryOrbit.line.layers.set(1);
    const primary=star(3.45,0xff4f0a,true);layer(primary,0);primary.traverse(o=>o.layers.enable(2));primaryOrbit.anchor.add(primary);
    primaryOrbit.body=primary;
    const beacon=halo(primaryOrbit.anchor,0xffb24b,15,.92);beacon.layers.set(0);
    // A sparse shader-driven sky: every point has its own phase and speed, so
    // the field twinkles asynchronously without rebuilding or refreshing it.
    const ambientCount=190,ambientPositions=[],ambientColors=[],ambientPhases=[],ambientSpeeds=[],ambientSizes=[],ambientStrengths=[];
    for(let i=0;i<ambientCount;i++){
      ambientPositions.push((rng()-.5)*67,(rng()-.5)*18,(rng()-.5)*39);
      const c=new T.Color([0x9bd9ff,0xffe1b3,0xc2b2ff,0xecf8ff][i%4]).multiplyScalar(.48+rng()*.42);ambientColors.push(c.r,c.g,c.b);
      ambientPhases.push(rng()*TAU);ambientSpeeds.push(.24+rng()*.54);ambientSizes.push(.45+rng()*1.15);ambientStrengths.push(.28+rng()*.72);
    }
    const ambientGeometry=new T.BufferGeometry();ambientGeometry.setAttribute('position',new T.Float32BufferAttribute(ambientPositions,3));ambientGeometry.setAttribute('aColor',new T.Float32BufferAttribute(ambientColors,3));
    ambientGeometry.setAttribute('aPhase',new T.Float32BufferAttribute(ambientPhases,1));ambientGeometry.setAttribute('aSpeed',new T.Float32BufferAttribute(ambientSpeeds,1));ambientGeometry.setAttribute('aSize',new T.Float32BufferAttribute(ambientSizes,1));ambientGeometry.setAttribute('aStrength',new T.Float32BufferAttribute(ambientStrengths,1));
    const ambientMaterial=new T.ShaderMaterial({uniforms:{uTime:{value:0},uPixelRatio:{value:renderer.getPixelRatio()}},
      vertexShader:`attribute vec3 aColor;attribute float aPhase,aSpeed,aSize,aStrength;uniform float uTime,uPixelRatio;varying vec3 vColor;varying float vAlpha;
        void main(){float wave=.5+.5*sin(uTime*aSpeed+aPhase);float spark=pow(wave,14.);vColor=aColor*(.75+spark*.72);vAlpha=.10+aStrength*(.13+spark*.66);gl_PointSize=(.62+aSize*(.54+spark*1.18))*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float core=1.-smoothstep(.05,.48,d);float ray=max(0.,1.-abs(q.x)*18.)+max(0.,1.-abs(q.y)*18.);float alpha=(core+ray*.10)*(1.-smoothstep(.36,.5,d))*vAlpha;if(alpha<.015)discard;gl_FragColor=vec4(vColor,alpha);
        #include <colorspace_fragment>
      }`,
      transparent:true,blending:T.AdditiveBlending,depthWrite:false});materials.push(ambientMaterial);
    const ambientField=new T.Points(ambientGeometry,ambientMaterial);ambientField.layers.set(2);primaryOrbit.anchor.add(ambientField);

    // A small 3D asteroid and particulate tail cross the system early, then
    // recur once per minute. They are scenery only and never enter hit testing.
    const COMET_FIRST=2.4,COMET_PERIOD=60,COMET_DURATION=8.5;
    const comet=new T.Group(),asteroidGeometry=new T.IcosahedronGeometry(.38,2),asteroidPosition=asteroidGeometry.getAttribute('position'),asteroidVertex=new T.Vector3();
    for(let i=0;i<asteroidPosition.count;i++){
      asteroidVertex.fromBufferAttribute(asteroidPosition,i);const deformation=.88+.09*Math.sin(asteroidVertex.x*19+asteroidVertex.y*13+asteroidVertex.z*17)+.05*Math.sin(asteroidVertex.x*31-asteroidVertex.z*23);
      asteroidVertex.multiplyScalar(deformation);asteroidPosition.setXYZ(i,asteroidVertex.x,asteroidVertex.y,asteroidVertex.z);
    }
    asteroidGeometry.computeVertexNormals();const asteroid=mesh(asteroidGeometry,standard(0x9b826e,.18),comet);spinning.push({object:asteroid,speed:.22});
    const coma=new T.Group();comet.add(coma);halo(coma,0xffd29a,1.9,.74);halo(coma,0x8bdcff,3.7,.24);
    const tailPositions=[],tailColors=[];
    for(let i=0;i<150;i++){
      const distance=.35+Math.pow(rng(),.72)*7.2,spread=.035+distance*.085,angle=rng()*TAU,radius=Math.sqrt(rng())*spread;
      tailPositions.push(-distance,Math.cos(angle)*radius,Math.sin(angle)*radius);
      const fade=Math.max(.05,1-distance/7.7),c=new T.Color(i%4===0?0xffd5a1:0x8edcff).multiplyScalar(.22+fade*.84);tailColors.push(c.r,c.g,c.b);
    }
    const tailGeometry=new T.BufferGeometry();tailGeometry.setAttribute('position',new T.Float32BufferAttribute(tailPositions,3));tailGeometry.setAttribute('color',new T.Float32BufferAttribute(tailColors,3));
    const tailMaterial=new T.PointsMaterial({map:glow,size:.42,vertexColors:true,transparent:true,opacity:.76,alphaTest:.008,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true});materials.push(tailMaterial);
    const cometTail=new T.Points(tailGeometry,tailMaterial);comet.add(cometTail);layer(comet,2);comet.visible=false;primaryOrbit.anchor.add(comet);
    const cometState={visible:false,phase:-1,progress:0};
    const clientRecord={id:'client',step:'estrellas',title:'Estrellas · Clientes',eyebrow:'El sentido de nuestro sistema',description:'Cada estrella es un cliente. Orbita el centro de su galaxia, la empresa. Este acercamiento sigue a la estrella seleccionada: sus empleados orbitan a su alrededor.',object:primaryOrbit.anchor,visual:primary,kind:'client'};records.push(clientRecord);
    for(let i=0;i<10;i++){
      const o=orbit(galaxyRoot,28+i*5.8,1200+i*93,.9+i*2.37,.025*((i%3)-1),0x738caf,.1+(i%3)*.025,false,{pitch:.016*((i%4)-1.5),yaw:i*.41});
      const s=star(1.2+(i%4)*.7,[0x77baff,0xffcd8d,0xb28aff,0xe9f5ff][i%4]);layer(s,0);o.anchor.add(s);o.body=s;stars.push({object:s,anchor:o.anchor});
    }
    // An observer's sky, separate from the orbital model. These stars lie at
    // different depths; only their apparent positions are joined by the guide.
    const guideCoordinates=[
      [-7.1,-.5],[-5.9,.55],[-4.65,-.35],[-3.5,.82],[-2.25,.06],[-1.18,1.34],[.12,.48],[1.38,1.52],[2.72,.76],[4.02,.04],[5.28,.93],[6.58,-.18],[4.88,-1.24],[3.42,-.69],[2.02,-1.88],[.48,-1.02],[-.94,-2.08],[-2.62,-1.08],[-4.06,-2.02],[-5.42,-1.12],
      [-8.55,2.34],[-7.26,3.52],[-5.91,2.71],[-4.72,4.08],[-3.39,3.18],[-2.06,4.46],[-.72,3.28],[.58,4.37],[1.84,3.02],[3.16,4.18],[4.48,3.13],[5.81,4.51],[7.08,3.38],[8.43,4.13],[7.58,2.18],
      [-8.04,-3.18],[-6.72,-4.22],[-5.31,-3.28],[-3.86,-4.39],[-2.37,-3.26],[-.91,-4.18],[.64,-3.02],[2.16,-4.32],[3.68,-3.08],[5.18,-4.13],[6.72,-2.97],[8.12,-3.79],
      [-9.62,.72],[-8.52,-.42],[8.36,1.46],[9.53,.24],[-9.18,-1.72],[9.12,-1.58],[.03,2.18],[-6.78,1.61],[6.56,1.82]
    ];
    const guideStars=guideCoordinates.map(([x,y],i)=>{
      const position=[x,y,((i*7)%17)-8],g=new T.Group();g.position.set(...position);const secondary=i>=20;
      const palette=i>=35?[0xc5edff,0xcac1ff,0xeef8ff]:i>=20?[0xffdfb5,0xe5d1ff,0xd5ecff]:[0xdbf3ff,0xffe6ca,0xced1ff];
      const color=palette[i%3],brightness=[.58,.84,.7,1,.66][i%5];
      const radius=secondary ? .035+(i%3)*.014 : .058+(i%3)*.028;
      const material=new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(.72+brightness*.35)});
      mesh(new T.SphereGeometry(radius,16,12),material,g);
      halo(g,color,secondary ? .48+brightness*.36 : .92+brightness*.52,secondary ? .5+brightness*.23 : .66+brightness*.2);
      layer(g,3);scene.add(g);return g;
    });
    const skyPositions=[],skyColors=[];
    for(let i=0;i<260;i++){
      const x=(rng()-.5)*21.5,y=(rng()-.5)*10.3,z=(rng()-.5)*18;
      skyPositions.push(x,y,z);const c=new T.Color([0xaedcff,0xffddba,0xd1c4ff,0xf4f7ff][i%4]).multiplyScalar(.34+rng()*.54);skyColors.push(c.r,c.g,c.b);
    }
    const skyGeometry=new T.BufferGeometry();skyGeometry.setAttribute('position',new T.Float32BufferAttribute(skyPositions,3));skyGeometry.setAttribute('color',new T.Float32BufferAttribute(skyColors,3));
    const skyMaterial=new T.PointsMaterial({map:glow,size:2.1,vertexColors:true,transparent:true,opacity:.48,alphaTest:.015,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:false});materials.push(skyMaterial);
    const guideField=new T.Points(skyGeometry,skyMaterial);guideField.layers.set(3);scene.add(guideField);
    const guideEdges=[
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],
      [2,17],[17,18],[18,19],[4,17],[6,15],[15,16],[16,17],[8,13],[13,12],[12,11],[13,14],[14,15],
      [20,21],[21,22],[22,23],[23,24],[24,25],[22,24],[21,54],[54,3],
      [25,26],[26,27],[27,28],[28,29],[26,53],[53,5],[28,7],
      [29,30],[30,31],[31,32],[32,33],[33,34],[30,55],[55,10],[32,34],
      [35,36],[36,37],[37,38],[38,39],[37,39],[35,51],[51,19],
      [39,40],[40,41],[41,42],[42,43],[40,42],[41,15],
      [43,44],[44,45],[45,46],[43,45],[46,52],[52,11],
      [47,48],[48,0],[47,20],[49,50],[50,11],[49,34]
    ];
    const talent=[
      ['empaticos','Empáticos','Escucha y comprensión',0x1ba7d5,0x57ce85,1,5.6,.52,.6,210],
      ['conectores','Conectores','Colaboración y conexiones',0x155abe,0x6dc8ff,0,8.5,.72,2.5,300],
      ['impulsores','Impulsores','Orientación a resultados',0xb35424,0xffcc78,0,11.6,.82,4.5,400],
      ['exploradores','Exploradores','Innovación y adaptación',0x7535a6,0xd9a6ff,0,15,.70,5.6,520],
      ['forjadores','Forjadores','Aprendizaje y crecimiento',0x1b807b,0xa8dd49,1,18.2,1.88,2.5,650]
    ];
    const talentRecords=[];
    talent.forEach(([id,name,competency,c1,c2,mode,radius,size,phase,period],i)=>{
      const o=orbit(primaryOrbit.anchor,radius,period,phase,[-.095,.06,-.045,.08,-.035][i],[0x4bb5c7,0x789fff,0xd6a776,0xb694e8,0x92cba2][i],[.27,.23,.2,.17,.15][i],true,{pitch:[.11,-.075,.06,-.095,.035][i],yaw:[.32,.91,1.48,2.15,2.75][i]});
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
      const o=orbit(parentPlanet.object,3.65+i*.88,48+i*23,.8+i*2.1,[-.18,.16,.27][i],0xbeadf4,[.13,.17,.12][i],true,{pitch:[.16,-.12,.09][i],yaw:[.4,1.45,2.3][i]});
      const s=satellite();s.scale.setScalar(1.30);o.anchor.add(s);o.body=s;spinning.push({object:s,speed:.025});
      records.push({id:`satellite-${i}`,step:'satelites',title:name,eyebrow:'Satélite · Actor del ecosistema',description:'Orbita alrededor de un planeta empleado, no de la estrella. Proveedores y contratistas, Dueño y Comunidad acompañan y hacen posible la experiencia.',object:o.anchor,visual:s,kind:'satellite'});
    });
    // Instruments and the mission are activity waypoints, not employee planets.
    const observatory=telescope();observatory.scale.setScalar(4.15);
    const launchCraft=rocket();launchCraft.scale.setScalar(1.18);
    const waypoints=[['launch','lanzamiento','Centro de lanzamiento',launchCraft,[0,0,0]],['observatory','observatorio','Observatorio de señales',observatory,[24.2,0,20.9]],['earth','mision','Misión en la Tierra',planet(1.42,0x126fa9,0x499555,1,12.7),[28.5,0,1]]];
    waypoints.forEach(([id,step,title,visual,pos])=>{const anchor=new T.Group();anchor.position.set(...pos);(id==='launch'?scene:primaryOrbit.anchor).add(anchor);anchor.add(visual);if(id==='launch')layer(visual,5);records.push({id,step,title,eyebrow:id==='launch'?'01 · Aquí comienza tu viaje':'Bitácora de la experiencia',description:step==='observatorio'?'Observa las señales de la experiencia y descubre qué medir para aprender y decidir.':step==='mision'?'Lleva tu aprendizaje a la Tierra: define una acción, con quién aprender y qué capacidad desarrollar.':'Entra al Universo de la Experiencia y conoce cómo se conectan empresas, clientes, empleados y otros actores.',object:anchor,visual,kind:'waypoint',view:id==='launch'?'launch':'system'});});
    const launchRecord=records.find(r=>r.id==='launch');
    const constellation={id:'guide',step:'coordenadas',title:'Constelaciones · Nuestra guía',eyebrow:'Agrupación aparente, no estructura física',description:'Los trazos unen estrellas vistas desde aquí, aunque se encuentran a distintas distancias. Representan el modelo de experiencia y la arquitectura empresarial: nos orientan, no son órbitas.',kind:'guide'};records.push(constellation);
    const galaxyRecord={id:'galaxy',step:'lanzamiento',title:'Galaxias · Empresas',eyebrow:'Una red de sistemas de experiencia',description:'La galaxia reúne sus estrellas cliente. Cada estrella tiene planetas empleados y cada planeta puede contar con satélites de otros actores. La vista ampliada sigue el mismo cliente que ves señalado aquí.',kind:'galaxy'};records.push(galaxyRecord);
    // Enlarge only the artwork, never the translation anchors: hovering a
    // planet must not drag its satellites out of their orbits or move the camera.
    records.forEach(record=>{
      const targets=record.visual?[record.visual]:record===galaxyRecord?galaxyClouds:record===constellation?guideStars:[];
      record.hoverAmount=0;record.hoverTargets=targets.map(object=>({object,scale:object.scale.clone()}));
      const unique=new Set();record.hoverMaterials=[];
      targets.forEach(target=>target.traverse(object=>{
        const list=Array.isArray(object.material)?object.material:[object.material];
        list.filter(Boolean).forEach(material=>{
          if(unique.has(material))return;unique.add(material);
          const entry={material,color:material.color?.clone(),emissive:material.emissive?.clone(),opacity:material.opacity,size:material.size};
          if(material.isShaderMaterial){
            material.uniforms.uHover={value:0};
            material.fragmentShader='uniform float uHover;\n'+material.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb *= 1.0 + uHover * .38;\n#include <colorspace_fragment>');
            material.needsUpdate=true;
          }
          record.hoverMaterials.push(entry);
        });
      }));
    });
    function setHover(record){
      if(hovered===record)return;hovered=record;
      stage.style.cursor=record?'pointer':'';
      labels.forEach(label=>label.button.classList.toggle('is-hovered',label.record===record));
    }
    function updateHover(dt){
      const blend=reduced.matches?1:1-Math.exp(-18*Math.max(0,dt));
      records.forEach(record=>{
        record.hoverAmount+=((hovered===record?1:0)-record.hoverAmount)*blend;
        if(record.hoverAmount<.0001)record.hoverAmount=0;
        const amount=record.hoverAmount,scale=1+(MAX_HOVER_SCALE-1)*amount;
        record.hoverTargets.forEach(target=>target.object.scale.copy(target.scale).multiplyScalar(scale));
        record.hoverMaterials.forEach(({material,color,emissive,opacity,size})=>{
          if(material.uniforms?.uHover)material.uniforms.uHover.value=amount;
          if(color)material.color.copy(color).multiplyScalar(1+amount*.30);
          if(emissive)material.emissive.copy(emissive).lerp(color||emissive,amount*.16);
          if(material.isSpriteMaterial)material.opacity=Math.min(1,opacity*(1+amount*.30));
          if(material.isPointsMaterial)material.size=size*(1+amount*.06);
        });
      });
    }
    const recordForStep=id=>records.find(r=>r.step===id&&r.kind!=='satellite')||records.find(r=>r.step===id);
    const motionByAnchor=new Map(moving.map(o=>[o.anchor,o]));
    const cameraOffset=new T.Vector3(0,23,37),screenRight=new T.Vector3(1,0,0),screenUp=new T.Vector3(0,37,-23).normalize(),framingCache=new Map();
    const systemRecords=()=>records.filter(r=>r.visual&&r!==launchRecord&&(!focusPlanet||r===focusPlanet||(r.kind==='satellite'&&focusPlanet===parentPlanet)));
    function select(record,zoom=false){
      setHover(null);mousePoint=null;
      labels.forEach(label=>label.placement=null);
      selected=record;if(zoom&&record.kind==='satellite')focusPlanet=parentPlanet;
      else if(compact&&record.kind==='planet')focusPlanet=record;
      else if(record.kind!=='satellite')focusPlanet=null;
      if(compact)mobileView=['guide','galaxy'].includes(record.kind)?'galaxy':'system';resize();
      const index=chapters.findIndex(c=>c[0]===record.step),allowed=index<=progress;
      const action=inspector.querySelector('button');action.disabled=!allowed;action.textContent=allowed?'Abrir actividad →':`Disponible en el momento ${index+1}`;
      action.setAttribute('aria-label',allowed?`Abrir ${record.title}`:`${record.title}. Disponible en el momento ${index+1}`);
      action.onclick=()=>{if(allowed&&typeof window.goStep==='function')window.goStep(record.step);};
      route.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.step===record.step)));labels.forEach(l=>l.button.setAttribute('aria-pressed',String(l.record===record)));
      stage.querySelector('.cosmos-reset').hidden=!focusPlanet;
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
      const button=document.createElement('button');button.className=`cosmos-object-label ${record.kind}`;button.innerHTML=text;button.setAttribute('aria-pressed','false');button.onclick=event=>{
        const box=stage.getBoundingClientRect(),target=event.detail?hitTest(event.clientX-box.left,event.clientY-box.top,true)||record:record;select(target,target.kind==='satellite');
      };
      button.dataset.cosmosId=record.id;button.onfocus=()=>setHover(record);button.onblur=()=>setHover(null);
      stage.querySelector('.cosmos-labels').append(button);labels.push({record,button,view,offset});
    }
    addLabel(clientRecord,'<small>Estrella</small><b>Cliente</b>','system',38);
    talentRecords.forEach(r=>addLabel(r,`<b>${r.name}</b>`,'system',23));
    records.filter(r=>r.kind==='waypoint').forEach(r=>addLabel(r,`${r===launchRecord?'<small>01 · Empieza aquí</small>':''}<b>${r.title}</b>`,r.view,r===launchRecord?70:25));
    labels.find(l=>l.record===launchRecord).button.classList.add('launch');
    addLabel(records.find(r=>r.id==='satellite-0'),'<b>Satélites ↗</b>','system',48);
    [1,2].forEach(i=>{const r=records.find(r=>r.id===`satellite-${i}`);addLabel(r,`<b>${r.title}</b>`,'system',25);labels[labels.length-1].focusOnly=true;});
    const guideButton=document.createElement('button');guideButton.className='cosmos-object-label';guideButton.innerHTML='<b>Explorar nuestra guía ↗</b>';guideButton.dataset.cosmosId='guide';guideButton.onclick=()=>select(constellation);guideButton.onfocus=()=>setHover(constellation);guideButton.onblur=()=>setHover(null);stage.querySelector('.cosmos-labels').append(guideButton);
    route.querySelectorAll('button').forEach(b=>{const record=recordForStep(b.dataset.step);b.onclick=()=>select(record,b.dataset.step==='satelites');b.onpointerenter=b.onfocus=()=>setHover(record);b.onpointerleave=b.onblur=()=>setHover(null);});
    tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{mobileView=b.dataset.view;resize();});
    stage.querySelectorAll('[data-actor]').forEach(b=>b.onclick=()=>select(records.find(r=>r.id===`satellite-${b.dataset.actor}`),true));
    stage.querySelector('.cosmos-reset').onclick=()=>select(clientRecord);
    const motionChange=e=>{paused=e.matches;};reduced.addEventListener('change',motionChange);
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
    function visualBounds(record,viewName=record.view||'system'){
      const view=views[viewName],camera=cameras[viewName],bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
      const point=new T.Vector3();
      record.visual.traverse(object=>{
        if(!object.isMesh||!object.geometry)return;
        if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
        const box=object.geometry.boundingBox;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          point.set(x,y,z).applyMatrix4(object.matrixWorld).project(camera);
          const px=view.x+(point.x+1)*view.w/2,py=view.y+(1-point.y)*view.h/2;
          bounds.left=Math.min(bounds.left,px);bounds.right=Math.max(bounds.right,px);bounds.top=Math.min(bounds.top,py);bounds.bottom=Math.max(bounds.bottom,py);
        }
      });return bounds;
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
        const extent=bodyExtent(record)*MAX_HOVER_SCALE;envelope.left=Math.min(envelope.left,h-rangeH-extent);envelope.right=Math.max(envelope.right,h+rangeH+extent);envelope.bottom=Math.min(envelope.bottom,v-rangeV-extent);envelope.top=Math.max(envelope.top,v+rangeV+extent);
      });
      const minimum=focusPlanet?7.1:37;envelope.left=Math.min(envelope.left,-minimum/2);envelope.right=Math.max(envelope.right,minimum/2);
      framingCache.set(center,envelope);return envelope;
    }
    function fitSystem(){
      const camera=cameras.system,r=views.system,e=orbitalEnvelope(),sidePad=Math.min(24*displayScale,r.w*.06);
      // The guide now occupies its own upper-right celestial window; reserving
      // its full height here pushed the whole solar system needlessly downward.
      const topPad=compact?Math.min(18,r.h*.1):Math.min(22*displayScale,r.h*.075);
      const bottomPad=Math.min((focusPlanet?48:54)*displayScale,r.h*.24);
      const usableW=Math.max(1,r.w-sidePad*2),usableH=Math.max(1,r.h-topPad-bottomPad);
      const units=Math.max((e.right-e.left)/usableW,(e.top-e.bottom)/usableH);
      const center=(focusPlanet?.object||primaryOrbit.anchor).getWorldPosition(new T.Vector3());
      const target=center.addScaledVector(screenRight,(e.left+e.right)/2).addScaledVector(screenUp,(e.top+e.bottom)/2+(topPad-bottomPad)*units/2);
      camera.left=-r.w*units/2;camera.right=r.w*units/2;camera.top=r.h*units/2;camera.bottom=-r.h*units/2;camera.position.copy(target).add(cameraOffset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      r.safeRect={left:r.x+sidePad,right:r.x+r.w-sidePad,top:r.y+topPad,bottom:r.y+r.h-bottomPad};
    }
    function fitLaunch(){
      const r=views.launch,camera=cameras.launch,pad=6*displayScale,labelSpace=(compact?40:62)*displayScale;
      // A dedicated, left-hand launch station stays readable without forcing
      // the solar-system camera to zoom out or pretending the rocket is a planet.
      const usableW=Math.max(1,r.w-2*pad),usableH=Math.max(1,r.h-pad-labelSpace),extent=bodyExtent(launchRecord)*MAX_HOVER_SCALE;
      const units=Math.max(extent*2/usableW,extent*2/usableH);
      camera.left=-r.w*units/2;camera.right=r.w*units/2;camera.top=r.h*units/2;camera.bottom=-r.h*units/2;
      const target=launchRecord.object.getWorldPosition(new T.Vector3());target.y+=(pad-labelSpace)*units/2;
      camera.position.copy(target).add(new T.Vector3(0,0,12));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      r.safeRect={left:r.x+pad,right:r.x+r.w-pad,top:r.y+pad,bottom:r.y+r.h-labelSpace};
      r.labelTop=r.y+r.h-labelSpace+(compact?9:10)*displayScale;
    }
    function resize(){
      const box=stage.getBoundingClientRect();if(width!==box.width||height!==box.height)labels.forEach(label=>label.placement=null);
      width=Math.max(1,box.width);height=Math.max(1,box.height);compact=window.matchMedia('(max-width: 800px)').matches;renderer.setSize(width,height,false);
      displayScale=compact?1:Math.max(.8,Math.min(3,window.innerWidth/1440,window.innerHeight/900));
      views.galaxy=compact?{x:0,y:35,w:width,h:height*.46-35}:{x:0,y:42*displayScale,w:width*.23,h:height*.39};
      views.constellation=compact?{x:0,y:height*.65,w:width,h:height*.3}:{x:width*.695,y:3*displayScale,w:width*.295,h:height*.275};
      views.system=compact?{x:0,y:focusPlanet?78:184,w:width,h:height-(focusPlanet?78:184)}:{x:width*.19,y:2*displayScale,w:width*.81,h:height-2*displayScale};
      views.launch=compact?{x:0,y:42,w:width*.46,h:148}:{x:0,y:height*.40,w:width*.23,h:height*.59};
      if(compact&&height<340&&!focusPlanet){views.launch={x:0,y:45,w:width*.29,h:height-55};views.system={x:width*.30,y:70,w:width*.70,h:height-70};}
      views.galaxy.visible=views.constellation.visible=!compact||mobileView==='galaxy';views.system.visible=!compact||mobileView==='system';
      views.launch.visible=views.system.visible&&!focusPlanet;
      stage.querySelector('.cosmos-galaxy-caption').hidden=!views.galaxy.visible;stage.querySelector('.cosmos-heading.constellations').hidden=!views.constellation.visible;
      stage.querySelector('.cosmos-actors').hidden=focusPlanet!==parentPlanet||!views.system.visible;
      tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===mobileView)));stage.querySelector('svg').setAttribute('viewBox',`0 0 ${width} ${height}`);
      const clip=stage.querySelector('clipPath rect'),cv=views.constellation;['x','y'].forEach(k=>clip.setAttribute(k,cv[k]));clip.setAttribute('width',cv.w);clip.setAttribute('height',cv.h);
    }
    const observer=new ResizeObserver(resize);observer.observe(stage);
    function project(object,view){const v=views[view];object.getWorldPosition(temp);temp.project(cameras[view]);return{x:v.x+(temp.x+1)*v.w/2,y:v.y+(1-temp.y)*v.h/2,z:temp.z};}
    function updateComet(){
      const since=elapsed-COMET_FIRST,phase=since>=0?since-Math.floor(since/COMET_PERIOD)*COMET_PERIOD:-1;
      const visible=phase>=0&&phase<=COMET_DURATION&&!focusPlanet;comet.visible=visible;cometState.visible=visible;cometState.phase=phase;
      if(!visible){cometState.progress=0;return;}
      const u=phase/COMET_DURATION,arc=Math.sin(Math.PI*u),x=-32+65*u,y=4.2+arc*4.1,z=-14.5+28.5*u+Math.sin(u*TAU)*1.1;
      comet.position.set(x,y,z);const tangent=new T.Vector3(65,Math.PI*4.1*Math.cos(Math.PI*u),28.5+TAU*1.1*Math.cos(u*TAU)).normalize();
      comet.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),tangent);const pulse=.96+.06*Math.sin(elapsed*3.1);coma.scale.setScalar(pulse);cometState.progress=u;
    }
    function updatePositions(){
      moving.forEach(o=>{const mean=(o.phase+elapsed*TAU/o.period)%TAU;let a=mean;
        // Kepler's equation: equal areas in equal times, with the parent at a
        // focus. Newton iteration keeps eccentric trajectories on their guides.
        for(let j=0;j<5;j++)a-=(a-o.eccentricity*Math.sin(a)-mean)/(1-o.eccentricity*Math.cos(a));
        o.anchor.position.set(o.radius*(Math.cos(a)-o.eccentricity),0,o.radius*Math.sqrt(1-o.eccentricity*o.eccentricity)*Math.sin(a));});
      spinning.forEach(s=>{s.object.rotation.y=(s.phase||0)+elapsed*s.speed;});solarFlares.forEach((flare,i)=>{const wave=Math.sin(elapsed*.34+flare.phase);flare.object.scale.setScalar(1+wave*.025);flare.object.rotation.z=wave*.012;});materials.forEach(m=>{if(m.uniforms?.uTime)m.uniforms.uTime.value=elapsed;});updateComet();
      scene.updateMatrixWorld(true);primaryOrbit.anchor.getWorldPosition(mainWorld);lightPosition.copy(mainWorld);sunlight.position.copy(mainWorld);
      fit(cameras.galaxy,views.galaxy,214,new T.Vector3(),new T.Vector3(0,100,170));
      const cv=views.constellation,cc=cameras.constellation,skyAspect=cv.w/Math.max(1,cv.h),skyWidth=Math.max(24,4.4*skyAspect);
      cc.left=-skyWidth/2;cc.right=skyWidth/2;cc.top=skyWidth/Math.max(.1,skyAspect)/2;cc.bottom=-cc.top;cc.position.set(0,.05,50);cc.lookAt(0,.05,0);cc.updateProjectionMatrix();cc.updateMatrixWorld();
      fitSystem();fitLaunch();
    }
    function draw(dt=0){
      updateHover(dt);updatePositions();
      if(mousePoint)setHover(hitTest(mousePoint.x,mousePoint.y));
      cameras.constellation.zoom=1+constellation.hoverAmount*.045;cameras.constellation.updateProjectionMatrix();
      renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
      ['galaxy','system','launch','constellation'].forEach(name=>{const r=views[name];if(!r.visible||r.h<=0)return;moving.forEach(o=>{if(o.line)o.line.material.uniforms.uViewport.value.set(r.w,r.h);});renderer.setViewport(r.x,height-r.y-r.h,r.w,r.h);renderer.setScissor(r.x,height-r.y-r.h,r.w,r.h);renderer.clearDepth();renderer.render(scene,cameras[name]);});renderer.setScissorTest(false);
      const bodyDisks=[...systemRecords(),...(!focusPlanet?[launchRecord]:[])].map(record=>{
        const view=record.view||'system',p=project(record.object,view),camera=cameras[view];
        return{record,view,x:p.x,y:p.y,radius:bodyExtent(record)*MAX_HOVER_SCALE*views[view].w/(camera.right-camera.left)};
      });
      const placed=[];const priority=l=>l.record===hovered?-1:l.record===selected?0:l.record.kind==='client'?1:l.record.kind==='planet'?2:3;
      [...labels].sort((a,b)=>priority(a)-priority(b)).forEach(l=>{
        const satelliteGroup=l.record.id==='satellite-0'&&!focusPlanet;
        const v=views[l.view],p=project(satelliteGroup?parentPlanet.object:l.record.object,l.view),inFocus=!focusPlanet||l.view!=='system'||l.record===focusPlanet||(focusPlanet===parentPlanet&&l.record.kind==='satellite');
        const show=v.visible&&inFocus&&!(compact&&focusPlanet&&l.view==='system')&&(!l.focusOnly||focusPlanet===parentPlanet)&&p.z>=-1&&p.z<=1;
        l.button.hidden=!show;if(show){
          if(l.record.id==='satellite-0')l.button.querySelector('b').textContent=focusPlanet===parentPlanet?'Proveedores y contratistas':'Satélites ↗';
          const half=l.button.offsetWidth/2+4,halfHeight=l.button.offsetHeight/2+5;
          const anchor=satelliteGroup?parentPlanet:l.record,pixelsPerUnit=v.w/(cameras[l.view].right-cameras[l.view].left);
          // Label positions reserve the largest hover size, so they do not
          // jump when artwork grows. The launch has its own caption strip.
          const offset=Math.max((satelliteGroup?77:l.offset)*displayScale,bodyExtent(anchor)*MAX_HOVER_SCALE*pixelsPerUnit+halfHeight+7*displayScale);
          const radius=bodyExtent(anchor)*MAX_HOVER_SCALE*pixelsPerUnit;
          const positions={below:{x:p.x,y:p.y+offset},above:{x:p.x,y:p.y-offset},right:{x:p.x+radius+half+9*displayScale,y:p.y},left:{x:p.x-radius-half-9*displayScale,y:p.y}};
          const preferred=['client','earth'].includes(l.record.id)?['above','below','right','left']:['below','above','right','left'];
          const options=l.view==='launch'?['launch']:l.placement?[l.placement]:preferred;
          let chosen=null,rect;
          for(const side of options){
            const point=side==='launch'?{x:p.x,y:v.labelTop+l.button.offsetHeight/2}:positions[side];
            const x=Math.max(v.x+half,Math.min(v.x+v.w-half,point.x)),y=Math.max(v.y+halfHeight,Math.min(v.y+v.h-halfHeight,point.y));
            rect={left:x-half,right:x+half,top:y-halfHeight,bottom:y+halfHeight};
            const overlapsBody=bodyDisks.some(body=>body.view===l.view&&Math.hypot(body.x-Math.max(rect.left,Math.min(rect.right,body.x)),body.y-Math.max(rect.top,Math.min(rect.bottom,body.y)))<body.radius+2*displayScale);
            const overlapsLabel=placed.some(r=>rect.left<r.right+3&&rect.right>r.left-3&&rect.top<r.bottom+3&&rect.bottom>r.top-3);
            if(!overlapsBody&&!overlapsLabel){chosen={side,x,y};break;}
          }
          // Keep each caption on its chosen side during an orbit. A caption
          // briefly yields to a passing body instead of jumping across the sky.
          const collision=!chosen;l.button.style.visibility=collision?'hidden':'';l.button.setAttribute('aria-hidden',String(collision));
          if(chosen){l.placement=chosen.side;l.button.style.left=`${chosen.x}px`;l.button.style.top=`${chosen.y}px`;placed.push(rect);}
        }
      });
      const cv=views.constellation;guideButton.hidden=true;
      const galaxyCaption=stage.querySelector('.cosmos-galaxy-caption'),gv=views.galaxy;
      if(gv.visible){galaxyCaption.style.left=`${gv.x+gv.w/2}px`;galaxyCaption.style.top=`${gv.y+gv.h-9*displayScale}px`;}
      const path=stage.querySelector('svg path');path.parentNode.style.display=cv.visible?'':'none';const pts=guideStars.map(s=>project(s,'constellation'));
      path.setAttribute('stroke-width',String((.8+constellation.hoverAmount*.45)*displayScale));path.style.filter=constellation.hoverAmount>.01?`drop-shadow(0 0 ${3*constellation.hoverAmount}px #bcc5ff)`:'';
      path.setAttribute('d',cv.visible?guideEdges.map(([a,b])=>`M${pts[a].x.toFixed(2)},${pts[a].y.toFixed(2)} L${pts[b].x.toFixed(2)},${pts[b].y.toFixed(2)}`).join(' '):'');
    }
    const raycaster=new T.Raycaster(),pointer=new T.Vector2();
    function hitTest(x,y,exact=false){
      let view=['launch','constellation','galaxy','system'].find(k=>{const r=views[k];return r.visible&&x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;});if(!view)return null;
      let v=views[view];
      if(view==='constellation'){
        const points=guideStars.map(star=>project(star,'constellation'));
        if(points.some(p=>Math.hypot(p.x-x,p.y-y)<16*displayScale))return constellation;
        for(const [a,b] of guideEdges){const p=points[a],q=points[b],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/Math.max(1,dx*dx+dy*dy)));
          if(Math.hypot(x-p.x-t*dx,y-p.y-t*dy)<8*displayScale)return constellation;}
        // The constellation is an overlay on desktop, not an opaque panel.
        // Blank space must keep the system bodies underneath interactive.
        const system=views.system;
        if(!system.visible||x<system.x||x>system.x+system.w||y<system.y||y>system.y+system.h)return null;
        view='system';v=system;
      }
      if(view==='galaxy'){
        const client=project(clientRecord.object,'galaxy');if(Math.hypot(x-client.x,y-client.y)<14*displayScale)return clientRecord;
        const p=project(galaxyRoot,'galaxy');return Math.hypot((x-p.x)/(v.w*.47),(y-p.y)/(v.h*.35))<=1?galaxyRecord:null;
      }
      const candidates=view==='launch'?[launchRecord]:systemRecords(),camera=cameras[view];
      pointer.set((x-v.x)/v.w*2-1,-(y-v.y)/v.h*2+1);raycaster.layers.set(view==='launch'?5:focusPlanet?4:2);raycaster.setFromCamera(pointer,camera);
      const hits=raycaster.intersectObjects(candidates.map(r=>r.visual),true),hit=hits.find(h=>h.object.isMesh&&!h.object.material.transparent);
      if(hit){let object=hit.object,record;while(object&&!record){record=candidates.find(r=>r.visual===object);object=object.parent;}if(record)return record;}
      if(exact)return null;
      const nearest=candidates.map(record=>{const p=project(record.object,view);return{record,distance:Math.hypot(p.x-x,p.y-y)};}).sort((a,b)=>a.distance-b.distance)[0];
      return nearest&&nearest.distance<=Math.max(14*displayScale,bodyExtent(nearest.record)*v.w/(camera.right-camera.left))?nearest.record:null;
    }
    function pick(event){
      const box=stage.getBoundingClientRect(),record=hitTest(event.clientX-box.left,event.clientY-box.top);
      if(record)select(record,record.kind==='satellite');
    }
    function pointerMove(event){
      if(event.pointerType==='touch')return;
      const label=event.target.closest?.('[data-cosmos-id]');
      if(label){const box=stage.getBoundingClientRect();mousePoint=null;setHover(hitTest(event.clientX-box.left,event.clientY-box.top,true)||records.find(r=>r.id===label.dataset.cosmosId)||null);return;}
      if(event.target!==renderer.domElement){mousePoint=null;setHover(null);return;}
      const box=stage.getBoundingClientRect();mousePoint={x:event.clientX-box.left,y:event.clientY-box.top};setHover(hitTest(mousePoint.x,mousePoint.y));
    }
    const pointerLeave=()=>{mousePoint=null;setHover(null);};
    stage.addEventListener('pointermove',pointerMove);stage.addEventListener('pointerleave',pointerLeave);
    renderer.domElement.addEventListener('click',pick);
    const contextLost=event=>{if(disposed)return;event.preventDefault();window.destroyClientOrbitalScene();if(fallback){fallback.hidden=false;fallback.querySelector('p').textContent='La vista 3D se interrumpió. Puedes continuar con las actividades aquí.';}};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    // Orbital speed is time-based, not frame-rate based. Reset the clock when
    // returning from a hidden tab instead of fast-forwarding the universe.
    const visibilityChange=()=>{clock.getDelta();};document.addEventListener('visibilitychange',visibilityChange);
    function frame(){if(disposed)return;const dt=clock.getDelta();if(!paused&&!document.hidden)elapsed+=dt;draw(dt);animation=requestAnimationFrame(frame);}
    function auditVisibility(){
      const visibleRecords=[...systemRecords(),...(!focusPlanet?[launchRecord]:[])];
      return {view:focusPlanet?'detail':'system',safeRect:{...views.system.safeRect},objects:visibleRecords.map(r=>{
        const name=r.view||'system',view=views[name],camera=cameras[name],safe=view.safeRect,pixelsPerUnit=view.w/(camera.right-camera.left);
        const p=project(r.object,name),radius=bodyExtent(r)*(1+(MAX_HOVER_SCALE-1)*r.hoverAmount)*pixelsPerUnit,bounds={left:p.x-radius,right:p.x+radius,top:p.y-radius,bottom:p.y+radius};
        const inside=bounds.left>=safe.left-.01&&bounds.right<=safe.right+.01&&bounds.top>=safe.top-.01&&bounds.bottom<=safe.bottom+.01;
        let rendered=false;r.visual.traverse(o=>{if(o.isMesh&&!o.material.transparent&&o.layers.test(camera.layers))rendered=true;});
        return{id:r.id,kind:r.kind,view:name,visible:view.visible,safeRect:{...safe},pixelRadius:radius,maxHoverRadius:bodyExtent(r)*MAX_HOVER_SCALE*pixelsPerUnit,bounds,visualBounds:visualBounds(r,name),inside,selectable:view.visible&&inside&&rendered&&p.z>=-1&&p.z<=1};
      }),orbitGuides:moving.filter(o=>o.line).map(o=>({ownerId:records.find(r=>r.visual===o.body)?.id||'galaxy-star',visible:o.line.visible,occupied:!!o.body&&o.anchor.children.includes(o.body),soft:!!o.line.material.uniforms?.uFeather,opacity:o.line.material.uniforms?.uAlpha.value}))};
    }
    const debug={snapshot:()=>({elapsed,paused,selected:selected.id,hovered:hovered?.id||null,focus:focusPlanet?.id||null,assetsReady:realm.__planetMaterialSession?.getState().ready??true,assetErrors:realm.__planetMaterialSession?.getState().errors||[],shaderErrors:[...shaderErrors],views:JSON.parse(JSON.stringify(views)),triangles:renderer.info.render.triangles,
      comet:{visible:cometState.visible,phase:cometState.phase,progress:cometState.progress,period:COMET_PERIOD,duration:COMET_DURATION,position:comet.position.toArray()},twinkle:{count:ambientCount,pulse:.5+.5*Math.sin(elapsed*ambientSpeeds[0]+ambientPhases[0])},
      objects:records.filter(r=>r.object).map(r=>{let node=r.object.parent,parent;while(node&&!parent){parent=records.find(p=>p.object===node);node=node.parent;}return{id:r.id,kind:r.kind,position:r.object.getWorldPosition(new T.Vector3()).toArray(),local:r.object.position.toArray(),parent:parent?.id||'galaxy',visualScale:r.visual.scale.toArray(),hoverAmount:r.hoverAmount,brightness:1+.38*r.hoverAmount,rotation:r.visual?.children[0]?.rotation.toArray().slice(0,3),sphere:r.visual?.children.some(n=>n.geometry?.type==='SphereGeometry')||false};}),orbitPeriods:moving.map(o=>o.period),bodyCount:records.filter(r=>r.visual).length}),
      advance:seconds=>{elapsed+=seconds;draw();return debug.snapshot();},setTime:(seconds,render=true)=>{elapsed=Math.max(0,Number(seconds)||0);if(render)draw();else updatePositions();},auditVisibility,
      setPaused:value=>{paused=!!value;return debug.snapshot();},
      select:id=>{const r=records.find(r=>r.id===id);if(r){select(r,r.kind==='satellite');draw();}},project:id=>{const r=records.find(r=>r.id===id);return r?.object?project(r.object,r.view||'system'):r===constellation?project(guideStars[5],'constellation'):r===galaxyRecord?project(galaxyRoot,'galaxy'):null;}};
    const cleanup=()=>{disposed=true;cancelAnimationFrame(animation);observer.disconnect();reduced.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibilityChange);renderer.domElement.removeEventListener('click',pick);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      stage.removeEventListener('pointermove',pointerMove);stage.removeEventListener('pointerleave',pointerLeave);
      const geometries=new Set(),allMaterials=new Set(materials);scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)allMaterials.add(o.material);});geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());realm.__planetMaterialSession?.dispose();delete realm.__planetMaterialSession;glow.dispose();renderer.dispose();renderer.forceContextLoss();tabs.remove();stage.remove();navigation.remove();if(window.__universeDebug===debug)delete window.__universeDebug;};
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

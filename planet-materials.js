/* Real equirectangular planetary maps, rendered on opaque 3D spheres.
   Maps: Solar System Scope / INOVE, CC BY 4.0. See texture-credits.html. */
(function () {
  'use strict';
  const vertex = `varying vec2 vUv;varying vec3 vWorld,vNormal;
    void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;
      vNormal=normalize(mat3(modelMatrix)*normal);
      gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
  const fragment = `uniform sampler2D uMap;uniform float uReady,uEarth;
    uniform vec3 uLight,uFallback;varying vec2 vUv;varying vec3 vWorld,vNormal;
    void main(){
      vec3 base=mix(uFallback,texture2D(uMap,vUv).rgb,uReady);
      vec3 n=normalize(vNormal),light=normalize(uLight-vWorld),view=normalize(cameraPosition-vWorld);
      float day=max(dot(n,light),0.);
      // Restrained camera fill retains the dark limb without making a glass globe.
      float fill=.17+.13*max(dot(n,view),0.);
      vec3 color=base*(fill+.90*day);
      float ocean=smoothstep(.01,.16,base.b-max(base.r,base.g));
      float glint=pow(max(dot(reflect(-light,n),view),0.),48.)*day;
      color+=vec3(.48,.68,.81)*glint*ocean*.28*uEarth;
      gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
    }`;
  function createSession(T,options){
    const textures=new Set(),cache=new Map(),errors=[];
    let pending=0,loaded=0,disposed=false;
    const loader=new T.TextureLoader();
    function material(value){options.materials.push(value);return value;}
    function load(name,color,ready){
      const key=name+':'+color;
      if(cache.has(key)){
        const cached=cache.get(key);cached.callbacks.push(ready);
        if(cached.ready)ready();return cached.texture;
      }
      pending++;
      const entry={callbacks:[ready],ready:false,texture:null};cache.set(key,entry);
      const texture=loader.load('assets/textures/'+name+'.jpg',value=>{
        pending--;loaded++;entry.ready=true;
        if(disposed){value.dispose();return;}
        entry.callbacks.forEach(callback=>callback());
      },undefined,()=>{pending--;if(!disposed)errors.push(name);});
      texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
      texture.wrapS=T.RepeatWrapping;texture.anisotropy=4;
      entry.texture=texture;textures.add(texture);return texture;
    }
    function addMesh(geometry,value,parent){
      const body=new T.Mesh(geometry,value);body.layers.set(2);parent.add(body);return body;
    }
    function create({radius,kind}){
      const earth=kind==='earth',group=new T.Group();group.userData.surfaceKind=kind;
      const fallback=new T.Color(({earth:0x1b4976,neptune:0x4266aa,jupiter:0xb29c88,saturn:0xd1b990,mars:0x9e5a3f,uranus:0x7ab8be})[kind]||0x818b9c);
      const uniforms={uMap:{value:null},uReady:{value:0},uEarth:{value:earth?1:0},uLight:{value:options.lightPosition},uFallback:{value:fallback}};
      const surfaceMaterial=material(new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:false,depthWrite:true}));
      uniforms.uMap.value=load(earth?'earth-day':kind,true,()=>{uniforms.uReady.value=1;});
      const surface=addMesh(new T.SphereGeometry(radius,80,56),surfaceMaterial,group);
      // Axial tilt belongs to the sphere, not the translation anchor.
      surface.rotation.order='ZYX';
      surface.rotation.set(0,earth?2.8:.7,earth?.409:.22);
      surface.name=earth?'Tierra — continentes reales':'Superficie planetaria — '+kind;
      options.spinning.push({object:surface,speed:earth?.030:.038,phase:surface.rotation.y});
      if(earth){
        const cloudUniforms={uMap:{value:null},uReady:{value:0},uLight:{value:options.lightPosition}};
        const cloudMaterial=material(new T.ShaderMaterial({uniforms:cloudUniforms,vertexShader:vertex,fragmentShader:`
          uniform sampler2D uMap;uniform float uReady;uniform vec3 uLight;varying vec2 vUv;varying vec3 vWorld,vNormal;
          void main(){float cloud=smoothstep(.20,.86,texture2D(uMap,vUv).r)*uReady;
            float day=max(dot(normalize(vNormal),normalize(uLight-vWorld)),0.);
            gl_FragColor=vec4(vec3(.85,.91,.97)*(.30+.72*day),cloud*.83);
            #include <colorspace_fragment>
          }`,transparent:true,depthWrite:false}));
        cloudUniforms.uMap.value=load('earth-clouds',false,()=>{cloudUniforms.uReady.value=1;});
        const clouds=addMesh(new T.SphereGeometry(radius*1.009,64,48),cloudMaterial,group);clouds.rotation.copy(surface.rotation);
        clouds.name='Nubes terrestres';options.spinning.push({object:clouds,speed:.033,phase:clouds.rotation.y});
      }
      // Only this very thin atmospheric limb is transparent. The body is opaque.
      const atmosphere=material(new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(earth?0x66a8ec:kind==='mars'?0xd4a187:kind==='saturn'?0xdcd3b8:0x83b3cb)},uLight:{value:options.lightPosition}},vertexShader:vertex,fragmentShader:`
        uniform vec3 uColor,uLight;varying vec2 vUv;varying vec3 vWorld,vNormal;
        void main(){vec3 n=normalize(vNormal);float rim=pow(1.-abs(dot(n,normalize(cameraPosition-vWorld))),4.);
          float day=max(dot(n,normalize(uLight-vWorld)),0.);
          gl_FragColor=vec4(uColor,rim*(.07+day*.16));
          #include <colorspace_fragment>
        }`,side:T.BackSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
      addMesh(new T.SphereGeometry(radius*1.025,48,32),atmosphere,group);
      return group;
    }
    return {create,getState:()=>({pending,loaded,ready:pending===0&&errors.length===0,errors:[...errors]}),dispose(){disposed=true;textures.forEach(texture=>texture.dispose());textures.clear();cache.clear();}};
  }
  window.UniversePlanetMaterials={createSession};
})();

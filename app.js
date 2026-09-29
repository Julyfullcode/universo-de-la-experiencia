const ID_KEY = "universo-experiencia.identidad.v2";
const SESSION_KEY = "universo-experiencia.sesion.v3";
const PENDING_KEY = "universo-experiencia.pendiente.v1";
const steps = [["lanzamiento", "Centro de lanzamiento", "Puerta de entrada al cúmulo Grupo EPM"], ["estrellas", "Estrellas cliente", "Clientes y usuarios orbitan el centro de su galaxia"], ["planetas", "Planetas de talento", "Empleados, roles y competencias alrededor del cliente"], ["coordenadas", "Constelación guía", "Modelo de experiencia y arquitectura empresarial"], ["satelites", "Satélites del ecosistema", "Proveedores y contratistas, Dueño y Comunidad"], ["observatorio", "Observatorio de señales", "Medir para aprender y actuar"], ["mision", "Misión en la Tierra", "Convertir aprendizaje en acción"]];
const planets = { empaticos:{name:"Planeta de los Empáticos",color:"#3fd6a8"}, conectores:{name:"Planeta de los Conectores",color:"#6fb6ff"}, impulsores:{name:"Planeta de los Impulsores",color:"#ffc15e"}, exploradores:{name:"Planeta de los Exploradores",color:"#c77bff"}, forjadores:{name:"Planeta de los Forjadores",color:"#b7e05a"} };
const competencyProfiles = {
  no_directivo:{
    label:"Ruta no directiva",
    profiles:{
      forjadores:{name:"Liderazgo Personal Consciente",power:"Asumes de manera consciente la responsabilidad sobre tu desarrollo y actuación.",behaviors:["Reflexionas sobre tus fortalezas y oportunidades","Aplicas y compartes nuevos aprendizajes"],missions:["Aplicaré un aprendizaje nuevo y compartiré lo que funcione con mi equipo.","Pediré retroalimentación sobre el impacto de mi actuación y definiré un ajuste concreto.","Convertiré una oportunidad de desarrollo en una práctica semanal observable."]},
      empaticos:{name:"Empático y Servicial",power:"Comprendes necesidades y perspectivas para aportar soluciones y experiencias positivas.",behaviors:["Escuchas con atención y te comunicas con calidez","Orientas y facilitas soluciones simples y oportunas"],missions:["Escucharé una necesidad completa antes de proponer la solución.","Explicaré un proceso sin tecnicismos y confirmaré que la persona comprendió.","Acompañaré un caso hasta verificar que la necesidad quedó resuelta."]},
      impulsores:{name:"Orientación al Logro",power:"Direccionas tus acciones hacia resultados sostenibles, con responsabilidad y calidad.",behaviors:["Priorizas y ejecutas oportunamente","Evalúas resultados y realizas ajustes"],missions:["Haré seguimiento a un caso hasta su resolución y verificaré el resultado.","Priorizaré una actividad que reduzca una fricción para clientes o usuarios.","Revisaré un resultado y aplicaré un ajuste de mejora concreto."]},
      exploradores:{name:"Adaptación al Cambio",power:"Te ajustas con apertura y agilidad, promoviendo mejoras en tu trabajo.",behaviors:["Anticipas situaciones que pueden impactar tu labor","Propones alternativas e incorporas cambios con disposición"],missions:["Probaré una forma más simple de realizar una actividad y mediré el resultado.","Exploraré una herramienta que reduzca trabajo manual cuando agregue valor.","Acompañaré a otra persona en la adopción de una nueva práctica."]},
      conectores:{name:"Trabajo en Equipo",power:"Colaboras y articulas acciones para alcanzar objetivos comunes.",behaviors:["Compartes información para coordinar el trabajo","Integras perspectivas y aportes diferentes"],missions:["Conectaré a las áreas necesarias para resolver una fricción del recorrido.","Compartiré información clave de forma oportuna para facilitar un objetivo común.","Construiré una solución integrando perspectivas de otras personas."]}
    }
  },
  directivo:{
    label:"Ruta directiva",
    profiles:{
      forjadores:{name:"Liderazgo Personal Consciente",power:"Fortaleces tu desarrollo y generas oportunidades de aprendizaje para tu equipo.",behaviors:["Reconoces el impacto de tu actuación","Acompañas el aprendizaje y desarrollo de otras personas"],missions:["Definiré con una persona de mi equipo un reto de desarrollo y su acompañamiento.","Abriré un espacio de retroalimentación para reconocer avances y ajustar la ruta.","Compartiré un aprendizaje y crearé una oportunidad para aplicarlo en el equipo."]},
      empaticos:{name:"Empático y Servicial",power:"Pones a las personas en el centro y promueves relaciones cercanas, respetuosas y efectivas.",behaviors:["Escuchas y consideras el contexto al decidir","Promueves interacciones positivas en el equipo y con otros actores"],missions:["Incorporaré la perspectiva de las personas antes de tomar una decisión.","Acompañaré un caso de servicio y retroalimentaré al equipo con calidez.","Promoveré una conversación para simplificar una interacción compleja."]},
      exploradores:{name:"Visionario",power:"Anticipas escenarios y orientas acciones sostenibles hacia el futuro.",behaviors:["Analizas tendencias, oportunidades, riesgos y actores","Impulsas innovación y transformación"],missions:["Analizaré una tendencia que pueda cambiar las expectativas de clientes y usuarios.","Orientaré recursos hacia una mejora sostenible de la experiencia.","Impulsaré una prueba que prepare al equipo para un desafío futuro."]},
      impulsores:{name:"Valiente",power:"Asumes decisiones y situaciones complejas con responsabilidad, transparencia y criterio.",behaviors:["Gestionas riesgos y decides oportunamente","Comunicas con claridad las decisiones y sus impactos"],missions:["Tomaré una decisión pendiente, explicando sus riesgos e impactos con transparencia.","Comunicaré de forma clara un cambio y acompañaré al equipo durante su ejecución.","Abordaré una situación compleja priorizando a las personas y la continuidad del servicio."]}
    }
  }
};
const competencyDuels = {
  no_directivo:[
    ["Cambian una forma de trabajo justo cuando ya tenías todo organizado.",["exploradores","Incorporo el cambio con disposición y pruebo cómo mejorar la ruta."],["impulsores","Aclaro el resultado que debemos lograr y reorganizo las prioridades."]],
    ["Una persona llega con una solicitud confusa y necesita orientación.",["empaticos","Escucho con atención, comprendo su contexto y explico con claridad."],["conectores","Integro a quienes pueden aportar y coordino una respuesta conjunta."]],
    ["Terminas una actividad importante.",["forjadores","Reflexiono sobre lo aprendido y defino qué fortaleceré."],["impulsores","Evalúo el resultado y realizo los ajustes necesarios para mejorar."]],
    ["Detectas una fricción repetida en el recorrido de un cliente.",["exploradores","Propongo una alternativa y pruebo una forma más simple de resolverla."],["empaticos","Comprendo cómo vive la persona esa fricción antes de intervenirla."]],
    ["Dos áreas tienen perspectivas diferentes sobre una solución.",["conectores","Integro los aportes y facilito la coordinación hacia un objetivo común."],["forjadores","Reviso el impacto de mi actuación y comparto lo que he aprendido."]],
    ["Una promesa hecha a un cliente está en riesgo.",["impulsores","Priorizo las acciones necesarias y hago seguimiento hasta el resultado."],["empaticos","Me comunico con claridad y calidez mientras facilito una solución oportuna."]],
    ["Aparece una herramienta que podría reducir actividades manuales.",["exploradores","Exploro sus posibilidades y propongo una mejora cuando agregue valor."],["conectores","Comparto la información y acompaño al equipo para adoptarla juntos."]],
    ["Recibes una retroalimentación inesperada.",["forjadores","La uso para reconocer una oportunidad de desarrollo y aplicar un aprendizaje."],["exploradores","La convierto en una alternativa nueva que pueda poner a prueba."]],
    ["Varias personas deben coordinarse para cumplir un resultado.",["conectores","Comparto la información necesaria e integro diferentes aportes."],["impulsores","Organizo prioridades y ejecuto oportunamente lo que me corresponde."]],
    ["Algo no salió como esperabas.",["forjadores","Reflexiono sobre mi contribución y lo que haré diferente."],["empaticos","Comprendo primero el impacto que tuvo en las personas involucradas."]]
  ],
  directivo:[
    ["Una persona de tu equipo necesita fortalecer una competencia.",["forjadores","Defino con ella un reto, la acompaño y reconozco sus avances."],["empaticos","Escucho su contexto y genero una conversación cercana y respetuosa."]],
    ["Surge un desafío que puede transformar el futuro de la organización.",["forjadores","Identifico qué debe aprender el equipo para responder mejor."],["exploradores","Analizo tendencias, riesgos y oportunidades para orientar una ruta sostenible."]],
    ["Debes actuar ante una situación compleja con información limitada.",["forjadores","Reconozco el impacto de mi actuación y busco el aprendizaje necesario."],["impulsores","Gestiono los riesgos, tomo una decisión oportuna y la comunico con claridad."]],
    ["Las expectativas de clientes y usuarios están cambiando.",["empaticos","Escucho sus necesidades y considero su contexto en las decisiones."],["exploradores","Anticipo escenarios y oriento capacidades hacia una respuesta futura."]],
    ["Una contingencia afecta a muchas personas.",["empaticos","Cuido la comunicación, escucho y acompaño las necesidades que aparecen."],["impulsores","Evalúo impactos, decido con criterio y comunico las acciones con transparencia."]],
    ["Un riesgo recurrente exige una respuesta de largo plazo.",["exploradores","Impulso una transformación que prepare al equipo y a la organización."],["impulsores","Asumo la decisión necesaria y gestiono responsablemente su ejecución."]]
  ]
};
let clientId = localStorage.getItem(ID_KEY); if (!clientId) { clientId = crypto.randomUUID(); localStorage.setItem(ID_KEY, clientId); }
let sessionToken = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "";
if(sessionToken)sessionStorage.setItem(SESSION_KEY,sessionToken);
localStorage.removeItem(SESSION_KEY);
localStorage.removeItem(PENDING_KEY);
let feedback = {rating:0,recommendation:""};
let accessMode = "register";
let recoveryNeedsName = false, recoveryKeyDraft = "";
let heartbeatTimer, pendingSyncTimer, syncPromise=null, sessionEpoch=0, lastSyncError=null;
let trip = {name:"",step:"lanzamiento",duels:{},satellites:[],mission:{}}; let view = "start"; let duelIndex = 0; let localAnswer = ""; let pendingSatellites = []; let competencyRoute = "";
const app = document.querySelector("#app");
const safe = (v) => String(v || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function inferCompetencyRoute(duels=trip.duels){const first=duels?.[0]??duels?.["0"];if(["forjadores","empaticos"].includes(first))return "directivo";if(["exploradores","impulsores"].includes(first))return "no_directivo";return "";}
function activeCompetencyRoute(){return competencyRoute||inferCompetencyRoute();}
function activeCompetencyProfiles(){return competencyProfiles[activeCompetencyRoute()]?.profiles||competencyProfiles.no_directivo.profiles;}
function competencyProfile(id){const profiles=activeCompetencyProfiles();return profiles[id]||competencyProfiles.no_directivo.profiles[id]||{name:planets[id]?.name||"Planeta de talento",power:"Tu comportamiento aporta a la experiencia.",behaviors:[],missions:[]};}
function feedbackDialog() { return `<dialog class="feedback-dialog" id="feedback-dialog" aria-labelledby="feedback-title"><form method="dialog" class="feedback-card" data-form="feedback"><button class="dialog-close" type="button" data-action="close-feedback" aria-label="Cerrar">×</button><p class="tag">Tu voz orienta el viaje</p><h2 id="feedback-title">Evalúa la experiencia</h2><p>Cuéntanos cómo viviste este universo y qué podríamos mejorar.</p><fieldset><legend>¿Cómo calificas la experiencia?</legend><div class="rating-stars">${[1,2,3,4,5].map((n)=>`<label><input type="radio" name="rating" value="${n}" ${feedback.rating===n?"checked":""} required><span aria-hidden="true">★</span><small>${n}</small></label>`).join("")}</div></fieldset><label class="feedback-copy">Recomendaciones<textarea id="feedback-recommendation" maxlength="2000" placeholder="Déjanos una recomendación concreta…">${safe(feedback.recommendation)}</textarea></label><p class="feedback-status" id="feedback-status" role="status"></p><div class="dialog-actions"><button class="secondary" type="button" data-action="close-feedback">Cancelar</button><button class="primary" type="submit">Enviar evaluación</button></div></form></dialog>`; }
function nav() { const signed=Boolean(sessionToken); return `<nav class="site-nav"><button class="nav-epm" data-action="home" aria-label="${signed?'Ir al universo':'Grupo EPM'}"><img class="epm-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"></button><button class="nav-button nav-product" data-action="home"><span>Universo de la Experiencia</span><i aria-hidden="true">—</i><strong>Guía de la Experiencia</strong></button><div class="nav-actions">${signed?`<button class="nav-button nav-passport" ${trip.mainPlanet?"":"disabled"} data-action="show-passport"><span>Mi pasaporte</span><b aria-hidden="true">▣</b></button><button class="nav-button nav-feedback" data-action="open-feedback"><span>Evaluar experiencia</span><b aria-hidden="true">★</b></button><button class="nav-button nav-logout" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">↗</button>`:""}</div></nav>${signed?feedbackDialog():""}`; }
function error(message) { return message ? `<p class="error">${safe(message)}</p>` : ""; }
function rpcPayload(data) { return Array.isArray(data) ? data[0] : data; }
function normalizeSatelliteId(value) {
  const id=String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
  if(["proveedores","proveedor","contratistas","proveedores y contratistas"].includes(id))return "proveedores";
  if(["dueno","dueno de experiencia"].includes(id))return "dueno";
  if(id==="comunidad")return "comunidad";
  return "";
}
function normalizeSatellites(value) {
  let source=value;
  if(typeof source==="string"){
    try{const parsed=JSON.parse(source);source=Array.isArray(parsed)?parsed:[source];}catch{source=[source];}
  }
  if(!Array.isArray(source))return [];
  return [...new Set(source.map(normalizeSatelliteId).filter(Boolean))].slice(0,3);
}
function errorDetails(err) { return [err?.name,err?.message,err?.details,err?.hint,err?.code,err?.cause?.message,String(err||"")].filter(Boolean).join(" "); }
function isNetworkError(err) { return navigator.onLine===false||/failed to fetch|network\s*(?:error|request)|load failed|fetch failed|err_network|aborterror|timed?\s*out|conexi[oó]n|conectar|canal seguro|tard[oó] demasiado|respuesta incompleta|temporar(?:io|ily)|gateway|upstream|\b50[234]\b/i.test(errorDetails(err)); }
const retryDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function proxyRpc(name,args) {
  const response=await fetch("/api/rpc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,args})});
  if(response.headers.get("x-universe-rpc-proxy")!=="1")throw new TypeError("El canal seguro de Supabase no está disponible.");
  const text=await response.text();let payload=null;
  try{payload=text?JSON.parse(text):null;}catch{throw new TypeError("El canal seguro de Supabase devolvió una respuesta incompleta.");}
  if(!response.ok)return {data:null,error:payload&&typeof payload==="object"?payload:{message:text||`Error ${response.status}`}};
  return {data:payload,error:null};
}
async function requestRpc(name,args) {
  return proxyRpc(name,args);
}
async function rpcWithRetry(name,args,retries=2) {
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      const result=await requestRpc(name,args);
      if(result?.error&&isNetworkError(result.error))throw result.error;
      return result;
    }catch(err){
      lastError=err;
      if(!isNetworkError(err)||attempt===retries)throw err;
      await retryDelay(attempt?900:350);
    }
  }
  throw lastError;
}
function queuedEntry() {
  try{
    const queued=JSON.parse(sessionStorage.getItem(PENDING_KEY)||"null");
    if(queued?.token!==sessionToken||!queued.changes||typeof queued.changes!=="object")return null;
    const changes={...queued.changes};
    if(Object.prototype.hasOwnProperty.call(changes,"satellites"))changes.satellites=normalizeSatellites(changes.satellites);
    return {token:queued.token,version:Number(queued.version)||0,changes};
  }catch{return null;}
}
function queuedChanges() { return queuedEntry()?.changes||{}; }
function queueChanges(changes) {
  const current=queuedEntry(),merged={...(current?.changes||{}),...changes};
  if(Object.prototype.hasOwnProperty.call(merged,"satellites"))merged.satellites=normalizeSatellites(merged.satellites);
  const version=(current?.version||0)+1;
  sessionStorage.setItem(PENDING_KEY,JSON.stringify({token:sessionToken,version,changes:merged}));
  schedulePendingSync();
  return version;
}
async function flushPending() {
  if(syncPromise)return syncPromise;
  const tokenAtStart=sessionToken,epochAtStart=sessionEpoch;
  if(!tokenAtStart||!queuedEntry())return true;
  syncPromise=(async()=>{
    lastSyncError=null;
    while(tokenAtStart===sessionToken&&epochAtStart===sessionEpoch){
      const entry=queuedEntry();if(!entry)return true;
      try{
        const {data,error:err}=await rpcWithRetry("universo_guardar_viaje",{p_token:tokenAtStart,p_viaje:tripPayload(entry.changes)},2);
        if(err)throw err;
        if(tokenAtStart!==sessionToken||epochAtStart!==sessionEpoch)return false;
        const latest=queuedEntry();
        if(latest?.version!==entry.version)continue;
        sessionStorage.removeItem(PENDING_KEY);
        if(data)hydrate(data);
        return true;
      }catch(err){
        lastSyncError=err;
        if(sessionError(err)&&tokenAtStart===sessionToken){sessionEpoch++;clearInterval(heartbeatTimer);sessionStorage.removeItem(PENDING_KEY);sessionStorage.removeItem(SESSION_KEY);sessionToken="";view="start";render("Tu sesión terminó. Recupérala con tu palabra clave.");}
        return false;
      }
    }
    return false;
  })().finally(()=>{syncPromise=null;});
  return syncPromise;
}
function schedulePendingSync(delay=5000) {
  clearTimeout(pendingSyncTimer);
  pendingSyncTimer=setTimeout(async()=>{if(!await flushPending())schedulePendingSync(12000);},delay);
}
window.addEventListener("online",()=>{if(sessionToken)schedulePendingSync(0);});
function hydrate(payload) {
  const result=rpcPayload(payload)||{},row=result.viaje||result;
  trip={name:row.nombre||trip.name||"",step:row.paso||"lanzamiento",duels:row.duelos||{},mainPlanet:row.planeta_principal||undefined,explorePlanet:row.planeta_explorar||undefined,role:row.rol||undefined,satellites:normalizeSatellites(row.satelites),observatory:row.observatorio||undefined,mission:row.mision||{}};
  competencyRoute=inferCompetencyRoute(trip.duels);const routeDuels=competencyDuels[competencyRoute]||[];const next=routeDuels.findIndex((_,i)=>!Object.prototype.hasOwnProperty.call(trip.duels,i));duelIndex=next<0?routeDuels.length:next;
  const saved=result.feedback||null;feedback=saved?{rating:Number(saved.calificacion)||0,recommendation:saved.recomendacion||""}:{rating:0,recommendation:""};
  pendingSatellites=[...trip.satellites];
}
function tripPayload(changes) {
  const payload={},has=(key)=>Object.prototype.hasOwnProperty.call(changes,key);
  if(has("name"))payload.nombre=String(changes.name||"").trim();
  if(has("step"))payload.paso=changes.step;
  if(has("duels"))payload.duelos=changes.duels||{};
  if(has("mainPlanet"))payload.planeta_principal=changes.mainPlanet||null;
  if(has("explorePlanet"))payload.planeta_explorar=changes.explorePlanet||null;
  if(has("role"))payload.rol=changes.role||null;
  if(has("satellites"))payload.satelites=normalizeSatellites(changes.satellites);
  if(has("observatory"))payload.observatorio=changes.observatory||null;
  if(has("mission"))payload.mision=changes.mission||{};
  return payload;
}
function startHeartbeat() { clearInterval(heartbeatTimer); if(!sessionToken)return; heartbeatTimer=setInterval(async()=>{try{await flushPending();await rpcWithRetry("universo_heartbeat",{p_token:sessionToken},0);}catch{}},45000); }
function sessionError(err) { return /token|sesión|sesion|expir/i.test(err?.message||""); }
async function load() {
  if(!sessionToken)return render();
  const tokenAtStart=sessionToken,epochAtStart=sessionEpoch;
  try{
    const {data,error:err}=await rpcWithRetry("universo_mi_viaje",{p_token:sessionToken},1);
    if(tokenAtStart!==sessionToken||epochAtStart!==sessionEpoch)return;
    if(err)throw err;hydrate(data);const pending=queuedChanges();if(Object.keys(pending).length){trip={...trip,...pending,satellites:normalizeSatellites(pending.satellites??trip.satellites)};pendingSatellites=[...trip.satellites];schedulePendingSync(0);}view="map";startHeartbeat();render();
  }catch(err){
    if(tokenAtStart!==sessionToken||epochAtStart!==sessionEpoch)return;
    if(sessionError(err)){sessionEpoch++;sessionStorage.removeItem(PENDING_KEY);sessionStorage.removeItem(SESSION_KEY);sessionToken="";view="start";render("Tu sesión terminó. Recupérala con tu palabra clave.");return;}
    view="start";render(`No pudimos recuperar tu viaje todavía: ${err.message||"revisa la conexión."} Reintentaremos automáticamente.`);
    setTimeout(()=>{if(tokenAtStart===sessionToken&&epochAtStart===sessionEpoch)load();},5000);
  }
}
async function persist(changes, nextView) {
  const next={...trip,...changes};
  if(!sessionToken){view="start";render("Crea un acceso o recupera tu sesión para guardar el viaje.");return false;}
  if(!next.name||next.name.trim().length<2){render("Escribe tu nombre completo para continuar.");return false;}
  const tokenAtStart=sessionToken,epochAtStart=sessionEpoch,version=queueChanges(changes);
  trip=next;if(nextView)view=nextView;render();
  const saved=await flushPending();
  if(tokenAtStart!==sessionToken||epochAtStart!==sessionEpoch){if(!sessionToken&&view!=="start"){view="start";render("Tu sesión terminó. Recupérala con tu palabra clave.");}return false;}
  if(saved){startHeartbeat();return true;}
  if(!sessionToken){view="start";render("Tu sesión terminó. Recupérala con tu palabra clave.");return false;}
  if(lastSyncError&&!isNetworkError(lastSyncError)){
    if(queuedEntry()?.version===version)sessionStorage.removeItem(PENDING_KEY);
    render(`No pudimos guardar tu avance: ${lastSyncError.message||"intenta de nuevo."}`);return false;
  }
  startHeartbeat();schedulePendingSync(12000);return true;
}
function render(message="") { window.destroyClientOrbitalScene?.(); if(view==="start") return renderStart(message); if(view==="map"){renderClientCenteredRealm(message); window.requestAnimationFrame(()=>window.initClientOrbitalScene?.(steps.findIndex((s)=>s[0]===trip.step))); return;} if(view==="passport") return renderPassport(); renderJourney(message); }
function renderClientCenteredRealm(message="") {
  const index=steps.findIndex((s)=>s[0]===trip.step);
  app.innerHTML=`<main class="universo orbital-realm-view">${nav()}<section class="orbital-realm" aria-label="Galaxia, estrellas cliente y sistemas de empleados"><div class="cosmos-fallback"><p>Preparando tu universo en 3D…</p><div>${steps.map((s,i)=>`<button ${i>index?'disabled':''} data-action="go-step" data-step="${s[0]}">${s[1]}</button>`).join('')}</div></div></section>${error(message)}</main>`;
}

function renderStart(message) { const recovering=accessMode==="recover",showName=!recovering||recoveryNeedsName; app.innerHTML=`<main class="universo start-view">${nav()}<section class="hero access-hero"><p class="tag">Bienvenido/a a la Guía de la Experiencia</p><h1>Tu viaje empieza<br><em>en este universo.</em></h1><p class="intro">${recovering?(recoveryNeedsName?"Hay varios recorridos antiguos con esa palabra clave. Escribe también el nombre con el que creaste tu viaje.":"Recupera tu recorrido ingresando únicamente tu palabra clave."):"Crea un acceso con tu nombre y una palabra clave."}</p><form class="access-form" data-form="access"><fieldset class="access-mode"><legend>Selecciona una opción</legend><label><input type="radio" name="access-mode" value="register" ${recovering?"":"checked"}> Crear un viaje</label><label><input type="radio" name="access-mode" value="recover" ${recovering?"checked":""}> Recuperar mi sesión</label></fieldset>${showName?`<label class="field">Nombre completo<input id="name" value="${safe(trip.name)}" placeholder="Tu nombre y apellidos" autocomplete="name" minlength="2" maxlength="80" required></label>`:""}<label class="field">Palabra clave<input id="access-key" type="password" value="${safe(recoveryKeyDraft)}" placeholder="Mínimo 10 caracteres" autocomplete="${recovering?"current-password":"new-password"}" minlength="10" maxlength="64" aria-describedby="access-key-notice" required></label><button class="primary" id="access-submit" type="submit">${recovering?"Recuperar mi viaje":"Crear mi viaje"} →</button><p class="access-key-notice" id="access-key-notice" role="note">${recovering?(recoveryNeedsName?"El nombre solo se solicita para distinguir entre esos recorridos; tu palabra clave sigue siendo obligatoria.":"Ingresa la palabra clave que guardaste al crear tu viaje."):"<strong>Guarda tu palabra clave en un lugar seguro.</strong> La necesitarás para recuperar la sesión. No podremos mostrártela ni enviártela después."}</p></form>${error(message)}<small>Usa una frase difícil de adivinar, de al menos 10 caracteres, y no reutilices una contraseña personal o corporativa.</small><a class="admin-entry" href="admin.html">Acceso administrador</a></section></main>`; }
function updateAccessMode(){const recover=document.querySelector('input[name="access-mode"]:checked')?.value==="recover",name=document.querySelector("#name")?.value.trim();if(name)trip.name=name;accessMode=recover?"recover":"register";recoveryNeedsName=false;recoveryKeyDraft="";render();}
function renderJourney(message) { const index=steps.findIndex((s)=>s[0]===trip.step); let content=""; if(trip.step==="lanzamiento") content=launch(); if(trip.step==="estrellas") content=stars(); if(trip.step==="planetas") content=planetsLesson(); if(trip.step==="coordenadas") content=coordinates(); if(trip.step==="satelites") content=satellites(); if(trip.step==="observatorio") content=observatory(); if(trip.step==="mision") content=mission(); app.innerHTML=`<main class="universo journey-view">${nav()}<div class="progress"><i style="width:${(index+1)/steps.length*100}%"></i></div>${content}${error(message)}</main>`; }
function launch(){return `<article class="lesson"><p class="tag">01 · Centro de lanzamiento</p><h1>Antes de despegar, hablemos el mismo idioma.</h1><p class="intro">La Guía es un recorrido para comprender la experiencia de clientes y usuarios, articular a los actores del ecosistema y contribuir, desde cada rol, a interacciones positivas y consistentes.</p><p class="scenario">¿Cuál de estas señales define la experiencia del cliente y usuario?</p><div class="choices">${[["experience","Experiencia","El resultado emocional del cliente y usuario luego de relacionarse con nuestras empresas."],["management","Modelo de gestión","El sistema estructurado para diseñar, ejecutar, evaluar y mejorar las vivencias."],["centricity","Clientecentrismo","Decisiones y actuaciones pensando en el valor que generamos a clientes y usuarios."]].map(x=>`<button class="choice ${localAnswer===x[0]?"selected":""}" data-action="answer" data-value="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></button>`).join("")}</div>${localAnswer?`<p class="message ${localAnswer==="experience"?"good":""}">${localAnswer==="experience"?"Coordenadas correctas. La experiencia es el resultado emocional; el modelo de gestión y el clientecentrismo ayudan a construirla.":"Esa definición pertenece a otro concepto de la Guía. Busca la que describe el resultado emocional de la relación."}</p>`:""}<button class="primary" ${localAnswer!=="experience"?"disabled":""} data-action="go-step" data-step="estrellas">Ir a la estrella principal →</button></article>`;}
function stars(){return `<article class="lesson"><p class="tag">02 · Estrella principal</p><h1>Clientes y usuarios orientan el universo.</h1><p class="intro">En cada galaxia, la estrella representa a clientes y usuarios: la razón que orienta nuestras decisiones. Esperan soluciones ágiles, procesos simples, comunicación clara y honesta, personalización, autogestión, calidad, anticipación y empatía.</p><section class="story"><small>SEÑAL RECIBIDA DESDE LA ESTRELLA</small><h2>“No comprendo mi factura y ya tuve que preguntar varias veces.”</h2><p>¿Qué respuesta hace visible la promesa de hacer todo más simple, con responsabilidad, transparencia y calidez?</p>${[["simplify","Explico sin tecnicismos, verifico la comprensión y acompaño la solución."],["redirect","Indico que consulte nuevamente los canales disponibles."],["technical","Repito la explicación técnica, aunque siga siendo difícil de comprender."]].map(x=>`<button class="${localAnswer===x[0]?"selected":""}" data-action="answer" data-value="${x[0]}">${x[1]}</button>`).join("")}</section>${localAnswer?`<p class="message ${localAnswer==="simplify"?"good":""}">${localAnswer==="simplify"?"La estrella confirma la ruta: simplicidad, claridad, empatía y solución fortalecen confianza, lealtad y reputación.":"La señal pide reducir la fricción y generar valor, no trasladar la dificultad a la persona."}</p>`:""}<button class="primary" ${localAnswer!=="simplify"?"disabled":""} data-action="go-step" data-step="planetas">Descubrir mi planeta →</button></article>`;}
function planetsLesson(){const route=activeCompetencyRoute();if(!route)return `<article class="lesson"><p class="tag">03 · Planetas de talento</p><h1>Elige la órbita que corresponde a tu cargo.</h1><p class="intro">Los planetas representan a los empleados. Cada ruta compara formas positivas de actuar; no hay respuestas correctas. El resultado mostrará tu competencia principal y otra que puedes explorar.</p><div class="choices"><button class="choice" data-action="select-competency-route" data-value="no_directivo"><b>Ruta no directiva</b><small>Liderazgo Personal Consciente, Empático y Servicial, Orientación al Logro, Adaptación al Cambio y Trabajo en Equipo.</small></button><button class="choice" data-action="select-competency-route" data-value="directivo"><b>Ruta directiva</b><small>Liderazgo Personal Consciente, Empático y Servicial, Visionario y Valiente.</small></button></div></article>`;const routeDuels=competencyDuels[route],next=routeDuels.findIndex((_,i)=>!Object.prototype.hasOwnProperty.call(trip.duels,i));duelIndex=next<0?routeDuels.length:next;if(duelIndex>=routeDuels.length)return `<article class="lesson"><p class="tag">03 · Planetas de talento</p><h1>Tu exploración orbital ya está completa.</h1><p class="intro">Tus respuestas ya trazaron un planeta principal y uno para seguir explorando.</p><button class="secondary" data-action="reset-competencies">Recorrer nuevamente esta órbita</button></article>`;const d=routeDuels[duelIndex];return `<article class="lesson"><p class="tag">03 · Planetas de talento · duelo orbital ${duelIndex+1}/${routeDuels.length}</p><h1>Las competencias se viven en tus decisiones.</h1><p class="intro">${competencyProfiles[route].label}. Elige la reacción que más se parece a ti; ambas representan comportamientos deseables de la Guía.</p><p class="scenario">${d[0]}</p><div class="duel-cards">${orbital(d[1])}<span>o</span>${orbital(d[2])}</div></article>`;}
function orbital(item){const profile=competencyProfile(item[0]);return `<button class="orbital" style="--color:${planets[item[0]].color}" data-action="pick-duel" data-value="${item[0]}"><small>${planets[item[0]].name} · ${profile.name}</small><strong>${item[1]}</strong></button>`;}
function coordinates(){const p=competencyProfile(trip.mainPlanet),e=competencyProfile(trip.explorePlanet),visual=planets[trip.mainPlanet]||planets.empaticos;return `<article class="lesson"><p class="tag">04 · Coordenadas</p><h1>Ubica cómo aportas a la experiencia.</h1><section class="result-card" style="--color:${visual.color}"><small>TU PLANETA PRINCIPAL</small><h2>${p.name}</h2><p>${p.power}</p><div><b>Así se ve:</b> ${p.behaviors.join(" · ")}</div><div>También puedes explorar: <b>${e.name}</b></div></section><p class="intro">Las coordenadas describen tu posición en este momento. Elige el rol desde el que contribuyes a la promesa de experiencia:</p><div class="choices">${[["generador","Generador","Vive y entrega la experiencia: interactúa, asesora y soluciona en los puntos de contacto."],["disenador","Diseñador","Define la experiencia: estructura estrategias e iniciativas desde las necesidades y vivencias de clientes y usuarios."],["habilitador","Habilitador","Soporta la experiencia: articula procesos, políticas, tecnologías, recursos e información para sostenerla."]].map(x=>`<button class="choice" data-action="pick-role" data-value="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></button>`).join("")}</div></article>`;}
function satellites(){const options=[["proveedores","Proveedores y contratistas","Aportan capacidades y recursos que se articulan para entregar la experiencia."],["dueno","Dueño","Orienta decisiones y condiciones para la sostenibilidad de la experiencia."],["comunidad","Comunidad","Aporta necesidades, expectativas y conocimiento del territorio."]];return `<article class="lesson"><p class="tag">05 · Satélites y constelaciones</p><h1>Ningún planeta viaja solo.</h1><p class="intro">Los satélites representan a Proveedores y contratistas, Dueño y Comunidad. La constelación guía conecta el modelo de gestión —Conocimiento, Diseño, Más digital, Eficiencias, Comunicación e Indicadores/Mejora— con la Arquitectura Empresarial: procesos, tecnología, información, organización, personas y cultura.</p><p class="scenario">Traza tu mapa de conexiones: elige los actores con quienes necesitas articularte para cumplir la promesa.</p><div class="satellites">${options.map(x=>`<button class="${pendingSatellites.includes(x[0])?"selected":""}" data-action="toggle-satellite" data-value="${x[0]}"><i>◌</i><b>${x[1]}</b><small>${x[2]}</small></button>`).join("")}</div><button class="primary" ${pendingSatellites.length?"":"disabled"} data-action="save-satellites">Llevar las señales al observatorio →</button></article>`;}
function observatory(){return `<article class="lesson"><p class="tag">06 · Observatorio de señales</p><h1>Medir hace visible la experiencia.</h1><p class="intro">Las mediciones focalizan necesidades, articulan equipos, humanizan procesos, muestran brechas y permiten priorizar acciones. Cada instrumento observa una señal diferente.</p><section class="story"><small>CASO DEL OBSERVATORIO</small><h2>Quieres saber qué tan fácil fue para una persona completar una gestión.</h2>${[["nps","NPS · Disposición a recomendar"],["is","IS · Satisfacción con la empresa, servicio o transacción"],["ces","CES · Esfuerzo percibido para completar una gestión"],["enps","eNPS / IEX · Recomendación y experiencia del empleado"]].map(x=>`<button class="${localAnswer===x[0]?"selected":""}" data-action="answer" data-value="${x[0]}">${x[1]}</button>`).join("")}</section>${localAnswer?`<p class="message ${localAnswer==="ces"?"good":""}">${localAnswer==="ces"?"Señal identificada. El CES pregunta qué tan fácil fue y hace visible el esfuerzo percibido por el cliente o usuario.":"Ese instrumento observa otra señal. Busca el que permite comprender el esfuerzo para completar una gestión."}</p>`:""}<button class="primary" ${localAnswer!=="ces"?"disabled":""} data-action="save-observatory">Definir mi misión →</button></article>`;}
function mission(){const m=trip.mission||{},profile=competencyProfile(trip.mainPlanet),suggestions=profile.missions||[],learning=[...new Set(Object.values(activeCompetencyProfiles()).map(x=>x.name))];return `<article class="lesson"><p class="tag">07 · Misión en la Tierra</p><h1>El viaje termina en un comportamiento observable.</h1><p class="intro">Convierte una oportunidad de desarrollo en un plan 70/20/10: aprender haciendo, aprender con otros y fortalecer conocimientos mediante formación.</p><div class="mission-grid"><label><b>70% · Una acción que voy a probar</b><select id="action-preset"><option value="">Escribe tu acción o elige una misión sugerida</option>${suggestions.map(x=>`<option value="${safe(x)}" ${m.accion===x?"selected":""}>${safe(x)}</option>`).join("")}</select><textarea id="action" maxlength="1500" placeholder="Escribe un comportamiento concreto que puedas aplicar y observar.">${safe(m.accion)}</textarea></label><label><b>20% · Con quién voy a aprender</b><select id="with"><option value="">Elige una opción</option>${["Líder","Compañero/a","Comunidad de práctica","Referente de otra área"].map(x=>`<option ${m.conQuien===x?"selected":""}>${x}</option>`).join("")}</select></label><label><b>10% · Algo que quiero aprender</b><select id="learning"><option value="">Elige una opción</option>${learning.map(x=>`<option ${m.aprendizaje===x?"selected":""}>${x}</option>`).join("")}<option ${m.aprendizaje==="Medición y mejora de la experiencia"?"selected":""}>Medición y mejora de la experiencia</option></select></label></div><button class="primary" data-action="save-mission">Generar mi pasaporte espacial ✦</button></article>`;}
function renderPassport(){if(!trip.mainPlanet){view="map";return render();}competencyRoute=inferCompetencyRoute(trip.duels)||competencyRoute;const p=competencyProfile(trip.mainPlanet),visual=planets[trip.mainPlanet]||planets.empaticos,m=trip.mission||{},role=({generador:"Generador",disenador:"Diseñador",habilitador:"Habilitador"})[trip.role]||"Por definir";app.innerHTML=`<main class="universo">${nav()}<section class="passport" id="passport-card"><img class="passport-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"><div class="seal">✦ PASAPORTE ESPACIAL</div><p>EXPLORADOR/A</p><h1>${safe(trip.name)}</h1><section class="passport-data"><div><small>MIS COORDENADAS</small><b>${role}</b></div><div><small>MI PLANETA PRINCIPAL</small><b style="color:${visual.color}">${p.name}</b></div><div><small>MI SUPERPODER</small><b>${p.power}</b></div><div><small>MI PRÓXIMA MISIÓN</small><b>${safe(m.accion||"Por definir")}</b></div><div><small>APRENDERÉ CON</small><b>${safe(m.conQuien||"Por definir")}</b></div><div><small>QUIERO APRENDER</small><b>${safe(m.aprendizaje||"Por definir")}</b></div></section><footer>Sembramos comportamientos, florecen experiencias.</footer></section><div class="passport-actions"><button class="secondary" data-action="show-map">← Volver al mapa</button><button class="primary" data-action="download-passport">Descargar mi pasaporte PDF</button></div></main>`;}
async function downloadPassport(){const card=document.querySelector('#passport-card');if(!card||!window.html2canvas||!window.jspdf){return window.print();}const button=document.querySelector('.passport-actions .primary');const original=button.textContent;button.disabled=true;button.textContent='Generando PDF…';try{const canvas=await window.html2canvas(card,{scale:2,backgroundColor:'#06102a',useCORS:true});const image=canvas.toDataURL('image/png');const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'landscape',unit:'px',format:[canvas.width,canvas.height],hotfixes:['px_scaling']});pdf.addImage(image,'PNG',0,0,canvas.width,canvas.height);pdf.save(`pasaporte-universo-${(trip.name||'explorador').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.pdf`);}catch{window.print();}finally{button.disabled=false;button.textContent=original;}}
async function loginParticipant(event){
  event?.preventDefault();
  const mode=document.querySelector('input[name="access-mode"]:checked')?.value||"register",name=document.querySelector("#name")?.value.trim()||"",accessKey=document.querySelector("#access-key")?.value||"";
  accessMode=mode;if(name)trip.name=name;
  if((mode==="register"||recoveryNeedsName)&&name.length<2)return render("Escribe tu nombre completo.");
  if(name&&(name.length>80||/[\u0000-\u001f\u007f]/.test(name)))return render("El nombre debe tener entre 2 y 80 caracteres y no contener caracteres de control.");
  if(accessKey.length<10||accessKey.length>64||new TextEncoder().encode(accessKey).length>72)return render("La palabra clave debe tener entre 10 y 64 caracteres y no superar 72 bytes.");
  if(accessKey!==accessKey.trim()||/[\u0000-\u001f\u007f]/.test(accessKey))return render("La palabra clave no puede empezar o terminar con espacios ni contener caracteres de control.");
  const button=document.querySelector(".access-form .primary");if(button){button.disabled=true;button.textContent=mode==="recover"?"Recuperando…":"Creando…";}
  try{
    const {data,error:err}=await rpcWithRetry("universo_ingresar",{p_nombre:name||null,p_palabra_clave:accessKey,p_modo:mode,p_legacy_client_id:clientId},1);
    if(err)throw err;const result=rpcPayload(data)||{};
    if(mode==="recover"&&result.requires_name){recoveryNeedsName=true;recoveryKeyDraft=accessKey;return render("Encontramos más de un viaje con esa palabra clave. Escribe el nombre completo con el que creaste el tuyo.");}
    if(result.ok===false||result.error)throw new Error(result.error||"No fue posible validar el acceso.");
    if(!result.token)throw new Error("Supabase no devolvió una sesión válida.");
    recoveryNeedsName=false;recoveryKeyDraft="";
    sessionEpoch++;sessionToken=result.token;sessionStorage.setItem(SESSION_KEY,sessionToken);
    if(!queuedEntry())sessionStorage.removeItem(PENDING_KEY);hydrate(result);
    view="map";startHeartbeat();render();
  }catch(err){render(`No pudimos ingresar: ${err.message||"intenta nuevamente."}`);}
}
function openFeedback(){const dialog=document.querySelector("#feedback-dialog");if(dialog&&!dialog.open)dialog.showModal();}
function closeFeedback(){document.querySelector("#feedback-dialog")?.close();}
async function saveFeedback(event){
  event.preventDefault();const form=event.currentTarget,rating=Number(new FormData(form).get("rating")),recommendation=document.querySelector("#feedback-recommendation")?.value.trim()||"";
  const status=document.querySelector("#feedback-status"),button=form.querySelector("button[type=submit]");button.disabled=true;status.textContent="Guardando tu evaluación…";
  try{const {data,error:err}=await rpcWithRetry("universo_guardar_feedback",{p_token:sessionToken,p_calificacion:rating,p_recomendacion:recommendation},1);if(err)throw err;const saved=rpcPayload(data)||{};feedback={rating:Number(saved.calificacion)||rating,recommendation:saved.recomendacion??recommendation};status.textContent="Gracias. Tu evaluación quedó guardada.";setTimeout(closeFeedback,900);}catch(err){status.textContent=`No pudimos guardar: ${err.message||"intenta nuevamente."}`;}finally{button.disabled=false;}
}
async function logoutParticipant(){const token=sessionToken;sessionEpoch++;sessionToken="";clearInterval(heartbeatTimer);clearTimeout(pendingSyncTimer);sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(PENDING_KEY);trip={name:"",step:"lanzamiento",duels:{},satellites:[],mission:{}};feedback={rating:0,recommendation:""};competencyRoute="";duelIndex=0;view="start";render();try{if(token)await rpcWithRetry("universo_salir",{p_token:token},0);}catch{}}
function showMap(){if(!sessionToken){view="start";return render();}view="map";render();}
function showPassport(){if(!sessionToken)return;view="passport";render();}
function goStep(step){localAnswer="";persist({step},"journey");}
function answer(value){localAnswer=value;render();}
function selectCompetencyRoute(route){
  if(!competencyProfiles[route])return;
  competencyRoute=route;duelIndex=0;
  trip={...trip,duels:{},mainPlanet:undefined,explorePlanet:undefined};
  render();
}
function resetCompetencies(){competencyRoute="";duelIndex=0;persist({duels:{},mainPlanet:null,explorePlanet:null},"journey");}
function pickDuel(id){
  const route=activeCompetencyRoute(),routeDuels=competencyDuels[route],profiles=competencyProfiles[route]?.profiles;
  if(!routeDuels||!profiles?.[id]||duelIndex>=routeDuels.length)return;
  const picks={...trip.duels,[duelIndex]:id};
  if(duelIndex<routeDuels.length-1){
    const firstChoice=duelIndex===0;duelIndex++;
    persist(firstChoice?{duels:picks,mainPlanet:null,explorePlanet:null}:{duels:picks});
    return;
  }
  const profileIds=Object.keys(profiles),points=Object.fromEntries(profileIds.map(key=>[key,0]));
  Object.values(picks).forEach(key=>{if(Object.prototype.hasOwnProperty.call(points,key))points[key]++;});
  const rank=profileIds.sort((a,b)=>points[b]-points[a]);
  persist({duels:picks,mainPlanet:rank[0],explorePlanet:rank[1],step:"coordenadas"});
}
function pickRole(role){persist({role,step:"satelites"});}
function toggleSatellite(id){pendingSatellites=pendingSatellites.includes(id)?pendingSatellites.filter(x=>x!==id):[...pendingSatellites,id];render();}
function saveSatellites(){persist({satellites:pendingSatellites,step:"observatorio"});}
function saveObservatory(){persist({observatory:"CES · Esfuerzo del cliente",step:"mision"});}
function saveMission(){const mission={accion:document.querySelector("#action").value.trim(),conQuien:document.querySelector("#with").value,aprendizaje:document.querySelector("#learning").value};if(!mission.accion||!mission.conQuien||!mission.aprendizaje)return render("Completa los tres componentes de tu misión.");persist({mission},"passport");}

app.addEventListener("submit",(event)=>{
  const form=event.target.closest("form[data-form]");
  if(!form)return;
  if(form.dataset.form==="access")loginParticipant(event);
  if(form.dataset.form==="feedback")saveFeedback(event);
});
app.addEventListener("change",(event)=>{
  if(event.target.matches('input[name="access-mode"]'))updateAccessMode();
  if(event.target.matches("#action-preset")){
    const action=document.querySelector("#action");
    if(action&&event.target.value)action.value=event.target.value;
  }
});
app.addEventListener("click",(event)=>{
  const control=event.target.closest("[data-action]");
  if(!control||control.disabled)return;
  const action=control.dataset.action,value=control.dataset.value;
  if(action==="home")return sessionToken?showMap():render();
  if(action==="show-map")return showMap();
  if(action==="show-passport")return showPassport();
  if(action==="open-feedback")return openFeedback();
  if(action==="close-feedback")return closeFeedback();
  if(action==="logout")return logoutParticipant();
  if(action==="go-step")return goStep(control.dataset.step);
  if(action==="answer")return answer(value);
  if(action==="select-competency-route")return selectCompetencyRoute(value);
  if(action==="reset-competencies")return resetCompetencies();
  if(action==="pick-duel")return pickDuel(value);
  if(action==="pick-role")return pickRole(value);
  if(action==="toggle-satellite")return toggleSatellite(value);
  if(action==="save-satellites")return saveSatellites();
  if(action==="save-observatory")return saveObservatory();
  if(action==="save-mission")return saveMission();
  if(action==="download-passport")return downloadPassport();
});
load();

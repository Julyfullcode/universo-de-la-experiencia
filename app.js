const ID_KEY = "universo-experiencia.identidad.v2";
const SESSION_KEY = "universo-experiencia.sesion.v3";
const PENDING_KEY = "universo-experiencia.pendiente.v1";
const UI_STEP_KEY = "universo-experiencia.paso-ui.v1";
const steps = [["lanzamiento", "Centro de lanzamiento", "Puerta de entrada al cúmulo Grupo EPM"], ["estrella", "Estrella principal", "Clientes y usuarios orientan nuestro universo"], ["satelites", "Satélites", "Actores que se articulan para crear valor"], ["coordenadas", "Coordenadas", "El rol desde el que aportamos a la experiencia"], ["planetas", "Planetas", "Competencias visibles en nuestras decisiones"], ["constelaciones", "Constelaciones", "Capacidades que conectan el modelo de gestión"], ["observatorio", "Observatorio", "Señales para aprender y actuar"], ["mision", "Mi misión", "Convertir aprendizaje en acción"]];
const planets = { empaticos:{name:"Planeta de los Empáticos",color:"#3fd6a8"}, conectores:{name:"Planeta de los Conectores",color:"#6fb6ff"}, impulsores:{name:"Planeta de los Impulsores",color:"#ffc15e"}, exploradores:{name:"Planeta de los Exploradores",color:"#c77bff"}, forjadores:{name:"Planeta de los Forjadores",color:"#b7e05a"} };
const competencyProfiles = {
  no_directivo:{
    label:"Ruta no directiva",
    profiles:{
      forjadores:{planetName:"Planeta de los Conscientes",name:"Liderazgo Personal Consciente",narrative:"Me observo, aprendo y evoluciono para aportar cada vez mejor.",power:"Transformas cada experiencia en una oportunidad para aprender, crecer y aportar mejor.",behaviors:["Reflexionas sobre tus actuaciones","Buscas aprender","Aplicas nuevos conocimientos","Compartes aprendizajes"],nextMission:"Convertir un aprendizaje en una acción observable.",missions:["Pedir retroalimentación sobre una situación reciente.","Aplicar conscientemente un aprendizaje en una situación real.","Después de un reto, identificar qué mantendrías y qué cambiarías."]},
      empaticos:{planetName:"Planeta de los Empáticos y Serviciales",name:"Empatía y Servicio",narrative:"Primero comprendo a la persona para poder servirle mejor.",power:"Comprendes a las personas y conviertes sus necesidades en oportunidades para facilitarles la vida.",behaviors:["Escuchas","Comprendes el contexto","Orientas con cercanía","Facilitas soluciones simples y oportunas"],nextMission:"Comprender mejor antes de responder.",missions:["Hacer una pregunta adicional antes de proponer una solución.","Explicar algo complejo de una manera más simple.","Verificar si la solución entregada respondió realmente a la necesidad."]},
      impulsores:{planetName:"Planeta de los Impulsores",name:"Orientación al Logro",narrative:"Convierto propósitos en acciones y resultados que generan valor.",power:"Mantienes el propósito en la mira y movilizas las acciones necesarias para convertirlo en resultados.",behaviors:["Priorizas","Conectas tu trabajo con el propósito","Cumples compromisos","Haces seguimiento a los resultados"],nextMission:"Concentrar tu energía en una acción de alto impacto.",missions:["Identificar y ejecutar la acción de mayor impacto frente a un reto.","Llevar un compromiso pendiente a cierre.","Simplificar una actividad que no esté generando suficiente valor."]},
      exploradores:{planetName:"Planeta de los Exploradores",name:"Adaptación al Cambio",narrative:"Si cambia la ruta, encuentro nuevas formas de avanzar.",power:"Lees los cambios como posibilidades y encuentras nuevas rutas para seguir avanzando.",behaviors:["Te adaptas","Anticipas cambios","Exploras alternativas","Propones nuevas formas de hacer las cosas"],nextMission:"Probar una ruta diferente.",missions:["Probar una forma diferente de realizar una actividad habitual.","Explorar una herramienta o tecnología nueva.","Experimentar una pequeña solución frente a una oportunidad de mejora."]},
      conectores:{planetName:"Planeta de los Conectores",name:"Trabajo en Equipo",narrative:"Conecto personas y perspectivas para construir resultados comunes.",power:"Conectas perspectivas, capacidades y personas para que juntos lleguen más lejos.",behaviors:["Integras aportes","Compartes información","Escuchas diferentes perspectivas","Construyes resultados colectivos"],nextMission:"Crear una conexión que ayude a resolver un reto.",missions:["Invitar a una persona con una perspectiva diferente a trabajar un reto contigo.","Compartir información que pueda ayudar a otro a avanzar.","Generar una conversación para integrar distintos puntos de vista."]}
    }
  },
  directivo:{
    label:"Ruta directiva",
    profiles:{
      forjadores:{planetName:"Planeta de los Conscientes",name:"Liderazgo Personal Consciente",narrative:"Me observo, reconozco mi impacto y evoluciono para liderar cada vez mejor.",power:"Tu liderazgo parte de la consciencia sobre ti mismo, tu impacto y tu capacidad de aprender y evolucionar.",behaviors:["Reflexionas sobre tu actuación","Reconoces tu impacto","Conviertes los aprendizajes en mejores formas de liderar"],nextMission:"Transformar una reflexión sobre tu liderazgo en una acción observable.",missions:["Pedir retroalimentación sobre tu impacto como líder.","Identificar un comportamiento que quieras ajustar conscientemente.","Revisar un reto reciente y definir qué mantendrías y qué cambiarías."]},
      empaticos:{planetName:"Planeta de los Empáticos y Serviciales",name:"Empatía y Servicio",narrative:"Comprendo a las personas y sus realidades para liderar y facilitar soluciones con cercanía.",power:"Comprendes las necesidades y perspectivas de las personas y las incorporas a tu manera de liderar y tomar decisiones.",behaviors:["Escuchas","Comprendes diferentes realidades","Comunicas con cercanía","Facilitas soluciones considerando a las personas"],nextMission:"Incorporar conscientemente la perspectiva de las personas en una decisión.",missions:["Hacer preguntas antes de tomar una decisión que impacte a otros.","Tener una conversación enfocada en escuchar y comprender una perspectiva diferente.","Revisar una decisión desde la experiencia de las personas impactadas."]},
      exploradores:{planetName:"Planeta de los Visionarios",name:"Visionario",narrative:"Leo el entorno, anticipo escenarios y conecto las decisiones de hoy con el futuro.",power:"Lees más allá del presente y conectas tendencias, oportunidades y decisiones para construir futuro.",behaviors:["Observas el entorno","Anticipas escenarios","Identificas oportunidades","Orientas decisiones con perspectiva de futuro"],nextMission:"Incorporar una mirada de futuro en una decisión actual.",missions:["Identificar una tendencia que pueda impactar a la organización.","Construir posibles escenarios frente a un reto estratégico.","Revisar las implicaciones futuras de una decisión actual."]},
      impulsores:{planetName:"Planeta de los Valientes",name:"Valentía",narrative:"Afronto los retos, tomo decisiones con criterio y asumo responsablemente sus consecuencias.",power:"Afrontas situaciones complejas, tomas decisiones con criterio y avanzas aun cuando el camino exige asumir riesgos.",behaviors:["Abordas situaciones difíciles","Evalúas riesgos","Decides oportunamente","Asumes responsablemente las consecuencias"],nextMission:"Afrontar una situación que requiere una decisión o conversación que has venido postergando.",missions:["Abordar oportunamente una conversación difícil.","Tomar una decisión necesaria valorando sus principales riesgos.","Comunicar con transparencia el fundamento de una decisión compleja."]}
    }
  }
};
const competencyDuels = {
  no_directivo:[
    ["Una persona te hace una observación sobre algo que podrías hacer mejor. ¿Qué te sale hacer primero?",["forjadores","Reflexiono sobre lo que puedo aprender y qué debería ajustar en mi forma de actuar."],["empaticos","Procuro comprender cómo vivió la situación la otra persona y qué necesitaba."]],
    ["Terminas un proyecto importante. ¿Qué haces naturalmente?",["forjadores","Reviso qué aprendí y qué haría diferente la próxima vez."],["impulsores","Verifico si alcanzamos el resultado que nos habíamos propuesto y qué queda pendiente."]],
    ["Debes resolver una necesidad importante en poco tiempo. ¿Qué haces primero?",["empaticos","Me aseguro de comprender bien qué necesita la persona antes de responder."],["impulsores","Identifico qué acciones son prioritarias para alcanzar oportunamente el resultado."]],
    ["Una persona tiene dificultades con un proceso que normalmente funciona bien. ¿Qué haces primero?",["empaticos","Procuro comprender qué está viviendo y qué necesita para facilitarle la experiencia."],["exploradores","Exploro una manera diferente de realizar el proceso que pueda resolver la dificultad."]],
    ["Cambian un procedimiento justo cuando ya tenías todo organizado. ¿Qué haces?",["impulsores","Aclaro cuál es el resultado que debemos preservar y reorganizo las prioridades para alcanzarlo."],["exploradores","Pruebo una nueva ruta y ajusto rápidamente la manera de trabajar."]],
    ["Tienes un reto importante que requiere el aporte de varias personas. ¿Qué haces primero?",["impulsores","Defino claramente el resultado que necesitamos alcanzar y las prioridades para lograrlo."],["conectores","Identifico quién puede aportar y articulo sus capacidades para construir juntos."]],
    ["Aparece un problema que tu equipo no había enfrentado antes. ¿Qué te sale hacer?",["exploradores","Exploro alternativas nuevas y pruebo diferentes maneras de resolverlo."],["conectores","Reúno perspectivas y conocimientos diferentes para construir una solución entre todos."]],
    ["Aparece una herramienta nueva que podría transformar tu forma habitual de trabajar. ¿Qué haces primero?",["exploradores","La exploro, pruebo sus posibilidades y pienso cómo podríamos aprovecharla."],["forjadores","Identifico qué necesito aprender para incorporarla y fortalecer mi manera de trabajar."]],
    ["Debes asumir un reto para el que todavía no tienes todas las respuestas. ¿Qué haces primero?",["conectores","Busco personas cuyos conocimientos puedan complementar los míos y las conecto al reto."],["forjadores","Identifico qué capacidades necesito fortalecer para enfrentarlo mejor."]],
    ["En una conversación aparecen puntos de vista muy diferentes. ¿Qué se parece más a ti?",["conectores","Busco conectar las diferentes perspectivas para construir una respuesta común."],["empaticos","Busco comprender profundamente la perspectiva y las necesidades de cada persona."]]
  ],
  directivo:[
    ["Una persona de tu equipo te comenta que una decisión tuya tuvo un impacto que no habías previsto. ¿Qué haces primero?",["forjadores","Reflexiono sobre mi actuación e identifico qué puedo aprender y ajustar en mi manera de liderar."],["empaticos","Busco comprender cómo vivió la situación la persona y qué necesitaba."]],
    ["Debes liderar un reto nuevo para el que todavía no tienes todas las respuestas. ¿Qué haces primero?",["forjadores","Identifico qué necesito aprender o fortalecer para liderarlo mejor."],["exploradores","Analizo hacia dónde puede evolucionar el reto y qué oportunidades futuras podría generar."]],
    ["Debes abordar una conversación difícil con una persona de tu equipo. ¿Qué haces primero?",["empaticos","Escucho y procuro comprender su perspectiva y sus necesidades antes de definir cómo actuar."],["impulsores","Abordo directamente la situación y tomo las decisiones necesarias para avanzar."]],
    ["Una decisión estratégica puede impactar de manera importante a varias personas. ¿Qué haces primero?",["empaticos","Procuro comprender sus realidades y necesidades para incorporarlas en la decisión."],["exploradores","Analizo cómo la decisión se conecta con los escenarios y necesidades futuras de la organización."]],
    ["El entorno está cambiando rápidamente y aparecen señales que podrían transformar el negocio. ¿Qué haces primero?",["exploradores","Analizo tendencias, proyecto escenarios y exploro oportunidades futuras."],["impulsores","Evalúo la información disponible, los riesgos y tomo oportunamente una decisión."]],
    ["Surge una oportunidad que podría transformar significativamente la manera de trabajar. ¿Qué se parece más a ti?",["exploradores","Exploro su potencial y cómo podría generar valor hacia el futuro."],["forjadores","Identifico qué necesito aprender o fortalecer para liderar adecuadamente esa transformación."]],
    ["Debes tomar una decisión importante que tendrá impacto sobre varias personas y no cuentas con toda la información que quisieras. ¿Qué haces?",["impulsores","Evalúo los riesgos, tomo una posición y avanzo oportunamente."],["empaticos","Busco comprender primero las perspectivas y necesidades de las personas más impactadas."]],
    ["Hay una decisión compleja que es necesario tomar y se ha venido postergando. ¿Qué haces?",["impulsores","Asumo la situación, tomo la decisión necesaria y me hago responsable de sus consecuencias."],["forjadores","Reflexiono sobre mis criterios y sobre qué debo ajustar en mi manera de abordar la situación."]]
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
let trip = {name:"",step:"lanzamiento",duels:{},satellites:[],mission:{}}; let view = "start"; let duelIndex = 0; let localAnswer = ""; let observatorySection = "benefits"; let observatoryChallengeIndex = 0; let observatoryScore = 0; let pendingSatellites = []; let competencyRoute = "";
const observatoryChallengeQuestions=[
  {signal:"Recomendación del cliente",prompt:"Queremos saber si una persona recomendaría nuestra marca a amigos y familiares.",answer:"nps",options:[["nps","NPS","Nivel de recomendación"],["is","IS","Índice de satisfacción"],["ces","CES","Nivel de esfuerzo"]]},
  {signal:"Satisfacción del cliente",prompt:"Queremos conocer qué tan satisfecha quedó una persona con una empresa, servicio o transacción.",answer:"is",options:[["nps","NPS","Nivel de recomendación"],["is","IS","Índice de satisfacción"],["ces","CES","Nivel de esfuerzo"]]},
  {signal:"Esfuerzo del cliente",prompt:"Una persona completó una gestión y queremos descubrir qué tan fácil fue para ella.",answer:"ces",options:[["nps","NPS","Nivel de recomendación"],["is","IS","Índice de satisfacción"],["ces","CES","Nivel de esfuerzo"]]},
  {signal:"Recomendación del empleado",prompt:"Queremos saber si un empleado recomendaría la empresa como un buen lugar para trabajar.",answer:"enps",options:[["enps","eNPS","Recomendación del empleado"],["iex","IEX","Experiencia del empleado"],["iex_stage","IEX etapas","Experiencia por etapa"]]},
  {signal:"Experiencia general del empleado",prompt:"Queremos conocer la percepción general de los empleados sobre su experiencia en la organización.",answer:"iex",options:[["enps","eNPS","Recomendación del empleado"],["iex","IEX","Experiencia del empleado"],["iex_stage","IEX etapas","Experiencia por etapa"]]},
  {signal:"Viaje del empleado",prompt:"Queremos comprender la experiencia percibida durante una etapa específica, como atracción y selección.",answer:"iex_stage",options:[["enps","eNPS","Recomendación del empleado"],["iex","IEX","Experiencia del empleado"],["iex_stage","IEX etapas","Experiencia por etapa"]]}
];
const app = document.querySelector("#app");
const safe = (v) => String(v || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const competencyRouteMarkers={directivo:"forjadores",no_directivo:"impulsores"};
function inferCompetencyRoute(duels=trip.duels){if(["directivo","no_directivo"].includes(duels?._route))return duels._route;const marker=duels?.[9]??duels?.["9"];if(marker==="forjadores")return "directivo";if(marker)return "no_directivo";return "";}
function activeCompetencyRoute(){return competencyRoute||inferCompetencyRoute();}
function activeCompetencyProfiles(){return competencyProfiles[activeCompetencyRoute()]?.profiles||competencyProfiles.no_directivo.profiles;}
function competencyProfile(id){const profiles=activeCompetencyProfiles();return profiles[id]||competencyProfiles.no_directivo.profiles[id]||{name:planets[id]?.name||"Planeta de talento",power:"Tu comportamiento aporta a la experiencia.",behaviors:[],missions:[]};}
function competencyAnswerAt(route,duels,index){const value=duels?.[index]??duels?.[String(index)];return route==="no_directivo"&&index===9&&value===competencyRouteMarkers.no_directivo?undefined:value;}
function nextCompetencyQuestion(route,duels){return (competencyDuels[route]||[]).findIndex((_,index)=>competencyAnswerAt(route,duels,index)===undefined);}
function competencyRanking(route=activeCompetencyRoute(),duels=trip.duels){const profiles=competencyProfiles[route]?.profiles||{},ids=Object.keys(profiles),points=Object.fromEntries(ids.map(id=>[id,0]));(competencyDuels[route]||[]).forEach((_,index)=>{const id=competencyAnswerAt(route,duels,index);if(Object.prototype.hasOwnProperty.call(points,id))points[id]++;});const rank=[...ids].sort((a,b)=>points[b]-points[a]);return {points,rank};}
function feedbackDialog() { return `<dialog class="feedback-dialog" id="feedback-dialog" aria-labelledby="feedback-title"><form method="dialog" class="feedback-card" data-form="feedback"><div class="feedback-signal" aria-hidden="true"><i></i><i></i><i></i></div><button class="dialog-close" type="button" data-action="close-feedback" aria-label="Cerrar">×</button><p class="tag">Tu voz orienta el viaje</p><h2 id="feedback-title">Evalúa la experiencia</h2><p>Cuéntanos cómo viviste este universo y qué podríamos mejorar.</p><fieldset class="rating-field"><legend>¿Cómo calificas la experiencia?</legend><div class="rating-stars">${[1,2,3,4,5].map((n)=>`<label data-rating="${n}" aria-label="${n} de 5 estrellas"><input type="radio" name="rating" value="${n}" ${feedback.rating===n?"checked":""}><span aria-hidden="true">${Array.from({length:n},(_,index)=>`<i style="--star:${index}">★</i>`).join("")}</span></label>`).join("")}</div></fieldset><label class="feedback-copy"><span>Comentario o recomendación <small>Opcional</small></span><textarea id="feedback-recommendation" maxlength="2000" placeholder="Si quieres, déjanos una recomendación concreta…">${safe(feedback.recommendation)}</textarea></label><p class="feedback-status" id="feedback-status" role="status" aria-live="polite"></p><div class="dialog-actions"><button class="secondary" type="button" data-action="close-feedback">Cancelar</button><button class="primary" type="submit">Enviar evaluación</button></div></form></dialog>`; }
function nav() { const signed=Boolean(sessionToken); return `<nav class="site-nav"><button class="nav-epm" data-action="home" aria-label="${signed?'Ir al universo':'Grupo EPM'}"><img class="epm-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"></button><button class="nav-button nav-product" data-action="home"><span>Universo de la Experiencia</span><i aria-hidden="true">—</i><strong class="nav-guide-title">Guía de la Experiencia<span class="nav-guide-tooltip" role="tooltip">Un recorrido para comprender la experiencia de clientes y usuarios, articularnos con los actores del ecosistema y contribuir desde cada rol a interacciones positivas y consistentes que fortalezcan su confianza y lealtad.</span></strong></button><div class="nav-actions">${signed?`<button class="nav-button nav-passport" ${trip.mainPlanet?"":"disabled"} data-action="show-passport"><span>Mi pasaporte</span><b aria-hidden="true">▣</b></button><button class="nav-button nav-feedback" data-action="open-feedback"><span>Evaluar experiencia</span><b aria-hidden="true">★</b></button><button class="nav-button nav-logout" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">↗</button>`:""}</div></nav>${signed?feedbackDialog():""}`; }
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
function backendStep(step) { return ({estrella:"estrellas",constelaciones:"planetas"})[step]||step; }
function rememberUiStep(step) {
  if(!sessionToken||!steps.some(([id])=>id===step))return;
  sessionStorage.setItem(UI_STEP_KEY,JSON.stringify({token:sessionToken,step}));
}
function restoredUiStep(serverStep) {
  const normalized=({estrellas:"estrella"})[serverStep]||serverStep||"lanzamiento";
  try{
    const saved=JSON.parse(sessionStorage.getItem(UI_STEP_KEY)||"null");
    return saved?.token===sessionToken&&backendStep(saved.step)===serverStep&&steps.some(([id])=>id===saved.step)?saved.step:normalized;
  }catch{return normalized;}
}
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
  const normalizedStep=restoredUiStep(row.paso);
  trip={name:row.nombre||trip.name||"",step:normalizedStep,duels:row.duelos||{},mainPlanet:row.planeta_principal||undefined,explorePlanet:row.planeta_explorar||undefined,role:row.rol||undefined,satellites:normalizeSatellites(row.satelites),observatory:row.observatorio||undefined,mission:row.mision||{}};
  competencyRoute=inferCompetencyRoute(trip.duels);const routeDuels=competencyDuels[competencyRoute]||[];const next=nextCompetencyQuestion(competencyRoute,trip.duels);duelIndex=next<0?routeDuels.length:next;
  const saved=result.feedback||null;feedback=saved?{rating:Number(saved.calificacion)||0,recommendation:saved.recomendacion||""}:{rating:0,recommendation:""};
  pendingSatellites=[...trip.satellites];
}
function tripPayload(changes) {
  const payload={},has=(key)=>Object.prototype.hasOwnProperty.call(changes,key);
  if(has("name"))payload.nombre=String(changes.name||"").trim();
  if(has("step"))payload.paso=backendStep(changes.step);
  if(has("duels"))payload.duelos=Object.fromEntries(Object.entries(changes.duels||{}).filter(([key])=>/^\d$/.test(key)));
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
  if(Object.prototype.hasOwnProperty.call(changes,"step"))rememberUiStep(changes.step);
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
  app.innerHTML=`<main class="universo orbital-realm-view">${nav()}<section class="orbital-realm" aria-label="Galaxia, estrellas cliente y sistemas de empleados"><div class="cosmos-fallback"><p>Preparando tu universo en 3D…</p><div>${steps.map((s)=>`<button data-action="go-step" data-step="${s[0]}">${s[1]}</button>`).join('')}</div></div></section>${error(message)}</main>`;
}

function renderStart(message) { const recovering=accessMode==="recover",showName=!recovering||recoveryNeedsName; app.innerHTML=`<main class="universo start-view">${nav()}<section class="hero access-hero"><p class="tag">Bienvenido/a a la Guía de la Experiencia</p><h1>Tu viaje empieza<br><em>en este universo.</em></h1><p class="intro">${recovering?(recoveryNeedsName?"Hay varios recorridos antiguos con esa palabra clave. Escribe también el nombre con el que creaste tu viaje.":"Recupera tu recorrido ingresando únicamente tu palabra clave."):"Crea un acceso con tu nombre y una palabra clave."}</p><form class="access-form" data-form="access"><fieldset class="access-mode"><legend>Selecciona una opción</legend><label><input type="radio" name="access-mode" value="register" ${recovering?"":"checked"}> Crear un viaje</label><label><input type="radio" name="access-mode" value="recover" ${recovering?"checked":""}> Recuperar mi sesión</label></fieldset>${showName?`<label class="field">Nombre completo<input id="name" value="${safe(trip.name)}" placeholder="Tu nombre y apellidos" autocomplete="name" minlength="2" maxlength="80" required></label>`:""}<label class="field">Palabra clave<input id="access-key" type="password" value="${safe(recoveryKeyDraft)}" placeholder="Mínimo 10 caracteres" autocomplete="${recovering?"current-password":"new-password"}" minlength="10" maxlength="64" aria-describedby="access-key-notice" required></label><button class="primary" id="access-submit" type="submit">${recovering?"Recuperar mi viaje":"Crear mi viaje"} →</button><p class="access-key-notice" id="access-key-notice" role="note">${recovering?(recoveryNeedsName?"El nombre solo se solicita para distinguir entre esos recorridos; tu palabra clave sigue siendo obligatoria.":"Ingresa la palabra clave que guardaste al crear tu viaje."):"<strong>Guarda tu palabra clave en un lugar seguro.</strong> La necesitarás para recuperar la sesión. No podremos mostrártela ni enviártela después."}</p></form>${error(message)}<small>Usa una frase difícil de adivinar, de al menos 10 caracteres, y no reutilices una contraseña personal o corporativa.</small><a class="admin-entry" href="admin.html">Acceso administrador</a></section></main>`; }
function updateAccessMode(){const recover=document.querySelector('input[name="access-mode"]:checked')?.value==="recover",name=document.querySelector("#name")?.value.trim();if(name)trip.name=name;accessMode=recover?"recover":"register";recoveryNeedsName=false;recoveryKeyDraft="";render();}
function renderJourney(message) { const index=Math.max(0,steps.findIndex((s)=>s[0]===trip.step)); let content=""; if(trip.step==="lanzamiento") content=launch(); if(trip.step==="estrella") content=stars(); if(trip.step==="satelites") content=satellites(); if(trip.step==="coordenadas") content=coordinates(); if(trip.step==="constelaciones") content=constellations(); if(trip.step==="planetas") content=planetsLesson(); if(trip.step==="observatorio") content=observatory(); if(trip.step==="mision") content=mission(); app.innerHTML=`<main class="universo journey-view"><div class="progress"><i style="width:${(index+1)/steps.length*100}%"></i></div>${content}${error(message)}</main>`; harmonizeJourneyHeading(); }
function harmonizeJourneyHeading(){const lesson=app.querySelector(".journey-view .lesson:not(.launch-station)"),label=lesson?.querySelector(".tag"),title=lesson?.querySelector("h1");if(!lesson||!label||!title)return;let heading=label.closest("header");if(!heading||!heading.contains(title)){heading=document.createElement("header");label.parentNode.insertBefore(heading,label);}heading.classList.add("journey-heading");const line=document.createElement("div");line.className="journey-title-line";heading.insertBefore(line,heading.firstChild);line.append(label,title);[...heading.children].forEach(child=>{if(child!==line&&!child.textContent.trim()&&!child.children.length)child.remove();});}
function launch(){return window.LaunchStation.render();}
function stars(){const expectations=["Solución ágil a sus solicitudes","Facilidad en los procesos: simplicidad","Anticipación en la comunicación de interrupciones","Claridad y honestidad en la comunicación (respuestas e instrucciones)","Personalización según sus necesidades y preferencias","Comprensión de la factura (precios justos)","Calidad y continuidad","Mayor autogestión – tecnología que facilite","Empatía: interacción cercana y respetuosa con soluciones efectivas"];const journey=[["Promesa de marca","✦"],["Interacciones","↗"],["Experiencias","◎"],["Opiniones","◌"],["Reputación","★"]];return `<article class="lesson journey-moment star-moment"><header class="star-heading"><p class="tag">02 · Estrella principal</p><h1>¿Por qué gestionar la experiencia?</h1><p class="star-definition">Los clientes esperan vivir experiencias positivas con sus marcas. Por ello se informan más, buscan alternativas que se ajustan a sus necesidades y forma de vida. Valoran la transparencia y facilidad en la experiencia.</p></header><div class="experience-journey" aria-label="De la promesa de marca a la reputación">${journey.map((item,index)=>`${index?'<i aria-hidden="true">→</i>':''}<span><b>${item[1]}</b><strong>${item[0]}</strong></span>`).join("")}</div><p class="emotion-definition">Las emociones y opiniones que generamos en cada interacción construyen reputación. Esa reputación fortalece la confianza, la preferencia, la permanencia y el vínculo con nuestras marcas.</p><section class="expectations-section"><h2>¿Qué esperan los clientes y usuarios de las empresas del Grupo EPM?</h2><p>Nuestros clientes y usuarios manifiestan reiterativamente desear y valorar:</p><div class="stellar-expectations" aria-label="Lo que esperan clientes y usuarios">${expectations.map((item,index)=>`<span style="--i:${index}"><i aria-hidden="true">✦</i>${item}</span>`).join("")}</div></section><div class="moment-actions"><button class="secondary" data-action="show-map">← Volver al universo</button><button class="primary" data-action="go-step" data-step="satelites">Continuar a Satélites →</button></div></article>`;}
function planetsLesson(){
  const route=activeCompetencyRoute();
  if(!route)return `<article class="lesson planet-journey"><p class="tag">05 · Planetas</p><h1>¿Eres directivo/a?</h1><p class="intro">Tu respuesta define la ruta de navegación y las situaciones que encontrarás. Elige la opción que corresponde a tu cargo actual.</p><p class="assessment-note">Las decisiones de navegación identifican una afinidad o preferencia hacia dos competencias predominantes. No constituyen una valoración formal o definitiva, ni miden su nivel de madurez o desarrollo.</p><div class="route-choice"><button class="choice" data-action="select-competency-route" data-value="directivo"><b>Sí, soy directivo/a</b><small>Iniciar una ruta diseñada para responsabilidades directivas.</small></button><button class="choice" data-action="select-competency-route" data-value="no_directivo"><b>No, no soy directivo/a</b><small>Iniciar una ruta diseñada para los demás roles.</small></button></div><div class="planet-question-actions"><button class="secondary planet-question-exit" data-action="show-map">← Volver al universo</button></div></article>`;
  const routeDuels=competencyDuels[route],next=nextCompetencyQuestion(route,trip.duels);
  duelIndex=next<0?routeDuels.length:next;
  if(duelIndex>=routeDuels.length){
    const ranking=competencyRanking(route),mainId=trip.mainPlanet||ranking.rank[0],secondaryId=trip.explorePlanet||ranking.rank[1],profile=competencyProfiles[route].profiles[mainId],secondary=competencyProfiles[route].profiles[secondaryId],visual=planets[mainId]||planets.empaticos;
    return `<article class="lesson planet-journey planet-result"><header class="planet-result-header"><div><p class="tag">05 · Planetas</p><h1>Resultado de afinidad</h1></div><p class="assessment-note">Este resultado muestra preferencias predominantes a partir de tus decisiones. No es una valoración formal ni definitiva.</p></header><div class="planet-result-layout" style="--color:${visual.color}"><div class="result-orbit-scene" aria-hidden="true"><i class="result-orbit-ring ring-one"></i><i class="result-orbit-ring ring-two"></i><span class="result-main-planet">✦</span><span class="result-orbiter orbiter-one"></span><span class="result-orbiter orbiter-two"></span><span class="result-orbiter orbiter-three"></span><small>Tu sistema de afinidades</small></div><section class="result-card"><div class="result-identity"><small>Tu planeta principal</small><h2>${safe(profile.planetName)}</h2><blockquote>“${safe(profile.narrative)}”</blockquote></div><div class="result-evidence"><p><b>Tu fuerza gravitacional:</b> ${safe(profile.power)}</p><p><b>Así se ve en la práctica:</b> ${profile.behaviors.map(safe).join(" · ")}</p><p>Otro planeta presente en tu ruta: <b>${safe(secondary.planetName)}</b></p></div></section></div><section class="planet-development"><div><p class="tag">Tu próxima misión</p><h2>${safe(profile.nextMission)}</h2></div><div><p class="tag">Acciones para desarrollarla</p><ul>${profile.missions.slice(0,2).map(action=>`<li>${safe(action)}</li>`).join("")}<li>Definir una acción propia.</li></ul></div></section><div class="planet-result-actions"><button class="secondary" data-action="show-map">← Volver al universo</button><button class="secondary" data-action="reset-competencies">Recorrer nuevamente esta órbita</button><button class="primary" data-action="go-step" data-step="constelaciones">Continuar a Constelaciones →</button></div></article>`;
  }
  const d=routeDuels[duelIndex],answered=routeDuels.filter((_,index)=>competencyAnswerAt(route,trip.duels,index)!==undefined).length;
  return `<article class="lesson planet-journey planet-question"><p class="tag">05 · Planetas · Decisión ${duelIndex+1}/${routeDuels.length}</p><div class="planet-question-head"><div><h1>Elige la ruta que más se parece a ti.</h1><p class="intro">${competencyProfiles[route].label}. No hay respuestas correctas o incorrectas: responde con naturalidad.</p></div><strong>${answered}/${routeDuels.length}</strong></div><div class="planet-question-progress" aria-label="${answered} de ${routeDuels.length} decisiones respondidas"><i style="width:${answered/routeDuels.length*100}%"></i></div><p class="scenario">${safe(d[0])}</p><div class="duel-cards">${orbital(d[1])}<span>o</span>${orbital(d[2])}</div><div class="planet-question-actions"><button class="secondary planet-question-exit" data-action="show-map">← Volver al universo</button></div></article>`;
}
function orbital(item){const visual=planets[item[0]]||planets.empaticos;return `<button class="orbital" style="--color:${visual.color}" data-action="pick-duel" data-value="${item[0]}"><strong>${safe(item[1])}</strong></button>`;}
function satellites(){const options=[["proveedores","Proveedores y contratistas","Aportan capacidades y recursos que se articulan para entregar la experiencia."],["dueno","Dueño","Orienta decisiones y condiciones para la sostenibilidad de la experiencia."],["comunidad","Comunidad","Aporta necesidades, expectativas y conocimiento del territorio."]],actors=["Clientes y usuarios","Empleados","Proveedores y contratistas","Dueño","Comunidad"];return `<article class="lesson journey-moment satellite-moment"><header class="satellite-heading"><p class="tag">03 · Satélites · Actores</p><h1>Articulación con actores del ecosistema de experiencia.</h1></header><section class="actor-ecosystem"><div class="actor-wheel" aria-label="Actores del ecosistema de experiencia"><strong>Actores<small>Marca · Ecosistema de experiencia</small></strong>${actors.map((actor,index)=>`<span style="--actor:${index}">${actor}</span>`).join("")}</div><div class="employee-role-copy"><h2>Empleados</h2><blockquote>“La articulación con el actor del ecosistema Empleados permite diseñar, generar y habilitar experiencias que se traducen en valor para clientes y usuarios.”</blockquote><h3>Roles de los empleados en la experiencia</h3><div class="employee-roles"><span>Diseñadores</span><span>Generadores</span><span>Habilitadores</span></div></div></section><p class="scenario">Elige los otros actores con quienes necesitas articularte para diseñar, generar o habilitar una experiencia que se traduzca en valor.</p><div class="satellites">${options.map(x=>`<button class="${pendingSatellites.includes(x[0])?"selected":""}" data-action="toggle-satellite" data-value="${x[0]}"><i>◌</i><b>${x[1]}</b><small>${x[2]}</small></button>`).join("")}</div><div class="moment-actions"><button class="secondary" data-action="show-map">← Volver al universo</button><button class="primary" ${pendingSatellites.length?"":"disabled"} data-action="save-satellites">Definir mis coordenadas →</button></div></article>`;}
function coordinates(){return `<article class="lesson journey-moment coordinates-moment"><header class="moment-heading"><div><p class="tag">04 · Coordenadas</p><h1>Ubica cómo aportas a la experiencia.</h1></div><p class="intro">Cada empresa clasifica los roles de acuerdo con sus procesos, cargos y particularidades. Elige el rol que mejor describe tu aporte principal.</p></header><div class="role-compass" aria-label="Roles del empleado">${[["disenador","Diseñador","Define la experiencia","Estructura estrategias e iniciativas desde las necesidades, expectativas y vivencias de clientes y usuarios.","Direccionamiento · Planeación · Portafolio · Comunicaciones · Mercadeo"],["generador","Generador","Vive y entrega la experiencia","Interactúa, asesora y soluciona mediante la operación del servicio y los puntos de contacto.","Mantenimiento · Ventas · Atención · Facturación · Educación"],["habilitador","Habilitador","Soporta la experiencia","Articula y optimiza procesos, políticas, tecnologías, recursos e información para sostener la experiencia.","Tecnología · Finanzas · Legal · Operaciones · Servicios generales"]].map((x,index)=>`<button class="role-coordinate" style="--role:${index}" data-action="pick-role" data-value="${x[0]}"><span aria-hidden="true">0${index+1}</span><b>${x[1]}</b><em>${x[2]}</em><small>${x[3]}</small><i>${x[4]}</i></button>`).join("")}</div><aside class="role-journey"><b>Sensibilizar</b><span>Comprender el rol</span><b>Desarrollar</b><span>Fortalecer competencias</span><b>Empoderar</b><span>Aplicarlo en decisiones</span></aside><button class="secondary" data-action="show-map">← Volver al universo</button></article>`;}
function constellations(){
  const capabilities=[["knowledge","Conocimiento","Conocer para empatizar"],["design","Diseño","Personalizar para simplificar"],["digital","Más digital","Digitalizar y facilitar para acercar"],["efficiency","Eficiencias","Maximizar resultados y disminuir fricción"]],dimensions=["Procesos","Tecnología","Información","Organización","Personas","Cultura"];
  return `<article class="lesson journey-moment constellation-moment"><header class="moment-heading"><div><p class="tag">06 · Constelaciones</p><h1>Dos constelaciones habilitan la experiencia.</h1></div><p class="intro">El modelo de gestión y la arquitectura empresarial conectan capacidades para entregar experiencias ágiles, consistentes y de valor.</p></header><div class="constellation-map"><section class="management-model"><small>Modelo de gestión de experiencia</small><div class="management-orbit">${capabilities.map(item=>`<span class="model-node ${item[0]}"><b>${item[1]}</b><em>${item[2]}</em></span>`).join("")}<div class="model-actors"><i aria-hidden="true">♙ ♙ ♙</i><b>Actores</b><em>Clientes y usuarios · Empleados · Comunidad · Proveedores y contratistas · Dueño</em></div></div><div class="model-foundations"><span><b>Comunicación</b><em>Conversaciones que conectan</em></span><span><b>Indicadores y mejora</b><em>Evolucionar en cada interacción</em></span></div></section><div class="constellation-bridge" aria-hidden="true"><i></i><b>conecta</b><i></i></div><section class="architecture-model"><small>Arquitectura empresarial</small>${dimensions.map((item,index)=>`<span style="--i:${index}"><i>✦</i><b>${item}</b></span>`).join("")}</section></div><p class="constellation-insight">Procesos integrados, tecnología interoperable, información confiable, roles claros, personas comprometidas y una cultura alineada hacen posible la promesa de experiencia.</p><div class="moment-actions"><button class="secondary" data-action="show-map">← Volver al universo</button><button class="primary" data-action="go-step" data-step="observatorio">Continuar al Observatorio →</button></div></article>`;
}
function observatory(){
  const sections=[["benefits","Beneficios de medir la experiencia"],["client","¿Cómo se mide la experiencia del cliente?"],["employee","¿Cómo se mide la experiencia del empleado?"],["challenge","Reto de señales"]];
  const benefits=["Focaliza las necesidades de los clientes en las distintas fases del servicio y etapas del viaje del empleado.","Articula los equipos bajo una misma óptica, enfocada en la promesa de experiencia.","Humaniza los procesos al incorporar el elemento emocional.","Muestra las brechas entre la experiencia deseada y la experiencia recibida.","Permite priorizar acciones para transformar las experiencias y evolucionar la gestión."];
  const clientMetrics=[["nps","NPS","Nivel de recomendación","Mide la disposición de los clientes para recomendar una empresa, producto o servicio.","¿Qué tan probable es que recomiende la marca a amigos y familiares?"],["is","IS","Índice de satisfacción","Mide el nivel de satisfacción de los clientes con una empresa, servicio o transacción.","¿Qué tan satisfecho se encuentra con…?"],["ces","CES","Nivel de esfuerzo","Mide el nivel de esfuerzo percibido por una persona para completar una gestión.","¿Qué tan fácil fue…?"]];
  const employeeMetrics=[["eNPS","Nivel de recomendación del empleado","Mide la lealtad y disposición de los empleados para recomendar la organización como un lugar para trabajar.","¿Qué tan probable es que recomiende la empresa a sus amigos y familiares como un buen lugar para trabajar?"],["IEX","Índice de experiencia del empleado","Mide la percepción general de los empleados sobre su experiencia en la organización.","En general, estoy satisfecho con la empresa como un buen lugar para trabajar."],["IEX etapas","Experiencia por etapa","Mide la experiencia percibida por el empleado en cada una de las etapas de su viaje.","En general, estoy satisfecho con mi experiencia en la etapa de atracción y selección."]];
  let content="";
  if(observatorySection==="benefits")content=`<section class="observatory-panel observatory-orbit benefits-orbit" aria-label="Beneficios de medir la experiencia"><i class="signal-ring ring-a" aria-hidden="true"></i><i class="signal-ring ring-b" aria-hidden="true"></i><div class="observatory-core"><span aria-hidden="true">✦</span><b>Medir la experiencia</b><small>Convierte señales en decisiones</small></div>${benefits.map((item,index)=>`<article class="signal-satellite signal-${index+1}"><span>0${index+1}</span><p>${item}</p></article>`).join("")}</section>`;
  if(observatorySection==="client")content=`<section class="observatory-panel metric-constellation client-metrics" aria-label="Métricas de experiencia del cliente"><div class="metric-beacon"><span aria-hidden="true">◎</span><b>Señales del cliente</b><small>Tres instrumentos para escuchar momentos diferentes</small></div>${clientMetrics.map((item,index)=>`<article class="metric-planet metric-${index+1}"><i aria-hidden="true"></i><span>${item[1]}</span><b>${item[2]}</b><p>${item[3]}</p><em>${item[4]}</em></article>`).join("")}</section>`;
  if(observatorySection==="employee")content=`<section class="observatory-panel metric-constellation employee-metrics" aria-label="Métricas de experiencia del empleado"><div class="metric-beacon employee-beacon"><span aria-hidden="true">✦</span><b>Señales del empleado</b><small>Escuchar la experiencia a lo largo de su viaje</small></div>${employeeMetrics.map((item,index)=>`<article class="metric-planet metric-${index+1}"><i aria-hidden="true"></i><span>${item[0]}</span><b>${item[1]}</b><p>${item[2]}</p><em>${item[3]}</em></article>`).join("")}</section>`;
  const challenge=observatoryChallengeQuestions[observatoryChallengeIndex],challengeCorrect=localAnswer===challenge.answer,challengeComplete=challengeCorrect&&observatoryChallengeIndex===observatoryChallengeQuestions.length-1;
  if(observatorySection==="challenge")content=`<div class="challenge-progress" aria-label="${observatoryChallengeIndex+1} de ${observatoryChallengeQuestions.length} señales"><span>Señal ${observatoryChallengeIndex+1} de ${observatoryChallengeQuestions.length}</span><i><b style="width:${((observatoryChallengeIndex+(challengeCorrect?1:0))/observatoryChallengeQuestions.length)*100}%"></b></i><strong>${observatoryScore}/${observatoryChallengeQuestions.length}</strong></div><section class="observatory-panel signal-challenge" aria-label="Reto interactivo de medición"><div class="incoming-signal"><span>${challenge.signal}</span><div class="signal-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><h2>Señal entrante</h2><p>${challenge.prompt}</p><small>¿Qué instrumento activarías?</small></div><div class="signal-radar"><i class="radar-ring radar-one" aria-hidden="true"></i><i class="radar-ring radar-two" aria-hidden="true"></i><span class="radar-core" aria-hidden="true">?</span>${challenge.options.map((item,index)=>`<button type="button" class="radar-satellite radar-${index+1} ${localAnswer===item[0]?"selected":""}" data-action="answer" data-value="${item[0]}" aria-pressed="${localAnswer===item[0]}"><b>${item[1]}</b><small>${item[2]}</small></button>`).join("")}</div></section>${localAnswer?`<p class="message signal-result ${challengeCorrect?"good":""}" role="status" aria-live="polite">${challengeCorrect?(challengeComplete?"¡Reto completado! Descifraste las seis señales de clientes y empleados.":"¡Señal descifrada! Encontraste el instrumento adecuado."):"Esa señal mide otra dimensión. Elige otro instrumento."}</p>`:""}`;
  const nextAction=challengeComplete?`<button class="primary" data-action="save-observatory">Crear mi misión →</button>`:observatorySection==="challenge"?(challengeCorrect?`<button class="primary" data-action="advance-observatory">Siguiente señal →</button>`:`<button class="primary" type="button" disabled>Elige un instrumento para continuar</button>`):`<button class="primary" data-action="observatory-section" data-value="challenge">Ir al reto de señales →</button>`;
  return `<article class="lesson journey-moment observatory-moment${observatorySection==="challenge"?" is-challenge":""}"><header class="moment-heading"><div><p class="tag">07 · Observatorio</p><h1>Medir hace visible la experiencia.</h1></div><p class="intro">Explora las señales que orbitan alrededor de clientes y empleados. Luego completa el reto para elegir el instrumento adecuado.</p></header><nav class="observatory-tabs" aria-label="Contenido del observatorio">${sections.map((item,index)=>`<button type="button" class="${observatorySection===item[0]?"selected":""}" data-action="observatory-section" data-value="${item[0]}" aria-pressed="${observatorySection===item[0]}"><span>0${index+1}</span>${item[1]}</button>`).join("")}</nav>${content}<div class="moment-actions"><button type="button" class="secondary" data-action="show-map">← Volver al universo</button>${nextAction}</div></article>`;
}
function mission(){const m=trip.mission||{},profile=competencyProfile(trip.mainPlanet),suggestions=profile.missions||[],learning=[...new Set(Object.values(activeCompetencyProfiles()).map(x=>x.name))];return `<article class="lesson journey-moment mission-moment"><p class="tag">08 · Mi misión</p><h1>El viaje termina en un comportamiento observable.</h1><p class="intro">Convierte una oportunidad de desarrollo en un plan 70/20/10: aprender haciendo, aprender con otros y fortalecer conocimientos mediante formación.</p>${profile.nextMission?`<p class="scenario"><b>Tu próxima misión sugerida:</b> ${safe(profile.nextMission)}</p>`:""}<div class="mission-grid"><label><b>70% · Una acción que voy a probar</b><select id="action-preset"><option value="">Escribe tu acción o elige una misión sugerida</option>${suggestions.map(x=>`<option value="${safe(x)}" ${m.accion===x?"selected":""}>${safe(x)}</option>`).join("")}</select><textarea id="action" maxlength="1500" placeholder="Escribe un comportamiento concreto que puedas aplicar y observar.">${safe(m.accion)}</textarea></label><label><b>20% · Con quién voy a aprender</b><select id="with"><option value="">Elige una opción</option>${["Líder","Compañero/a","Comunidad de práctica","Referente de otra área"].map(x=>`<option ${m.conQuien===x?"selected":""}>${x}</option>`).join("")}</select></label><label><b>10% · Algo que quiero aprender</b><select id="learning"><option value="">Elige una opción</option>${learning.map(x=>`<option ${m.aprendizaje===x?"selected":""}>${x}</option>`).join("")}<option ${m.aprendizaje==="Medición y mejora de la experiencia"?"selected":""}>Medición y mejora de la experiencia</option></select></label></div><div class="moment-actions"><button class="secondary" data-action="show-map">← Volver al universo</button><button class="primary" data-action="save-mission">Generar mi pasaporte espacial ✦</button></div></article>`;}
function renderPassport(){if(!trip.mainPlanet){view="map";return render();}competencyRoute=inferCompetencyRoute(trip.duels)||competencyRoute;const p=competencyProfile(trip.mainPlanet),secondary=competencyProfile(trip.explorePlanet),visual=planets[trip.mainPlanet]||planets.empaticos,m=trip.mission||{},role=({generador:"Generador",disenador:"Diseñador",habilitador:"Habilitador"})[trip.role]||"Por definir";app.innerHTML=`<main class="universo">${nav()}<section class="passport" id="passport-card"><header class="passport-header"><h2 class="passport-title"><span aria-hidden="true">✦</span> Pasaporte espacial</h2><img class="passport-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"></header><h1 class="passport-name">${safe(trip.name)}</h1><section class="passport-data"><div><small>Mis coordenadas</small><b>${role}</b></div><div><small>Mi planeta principal</small><b style="color:${visual.color}">${safe(p.planetName||p.name)}</b></div><div><small>Otro planeta en mi ruta</small><b>${safe(secondary.planetName||secondary.name)}</b></div><div><small>Mi fuerza gravitacional</small><b>${safe(p.power)}</b></div><div><small>Mi próxima misión</small><b>${safe(m.accion||"Por definir")}</b></div><div><small>Aprenderé con</small><b>${safe(m.conQuien||"Por definir")}</b></div><div><small>Quiero aprender</small><b>${safe(m.aprendizaje||"Por definir")}</b></div></section><footer>Sembramos comportamientos, florecen experiencias.</footer></section><div class="passport-actions"><button class="secondary" data-action="show-map">← Volver al mapa</button><button class="primary" data-action="download-passport">Descargar mi pasaporte PDF</button></div></main>`;}
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
    window.LaunchStation.reset();
    sessionEpoch++;sessionToken=result.token;sessionStorage.setItem(SESSION_KEY,sessionToken);
    if(!queuedEntry())sessionStorage.removeItem(PENDING_KEY);hydrate(result);
    view="map";startHeartbeat();render();
  }catch(err){render(`No pudimos ingresar: ${err.message||"intenta nuevamente."}`);}
}
function openFeedback(){const dialog=document.querySelector("#feedback-dialog");if(dialog&&!dialog.open)dialog.showModal();}
function closeFeedback(){document.querySelector("#feedback-dialog")?.close();}
async function saveFeedback(event){
  event.preventDefault();const form=event.target?.closest?.('form[data-form="feedback"]')||event.currentTarget?.closest?.('form[data-form="feedback"]')||event.currentTarget;
  if(!(form instanceof HTMLFormElement))return;const rating=Number(new FormData(form).get("rating")),recommendation=form.querySelector("#feedback-recommendation")?.value.trim()||"";
  const status=form.querySelector("#feedback-status"),button=form.querySelector("button[type=submit]"),original=button.textContent;
  if(!rating){form.querySelector(".rating-field")?.classList.add("needs-rating");status.textContent="Elige una cantidad de estrellas para enviar tu evaluación.";return;}
  form.querySelector(".rating-field")?.classList.remove("needs-rating");button.disabled=true;button.textContent="Enviando señal…";status.textContent="Guardando tu evaluación…";
  try{const {data,error:err}=await rpcWithRetry("universo_guardar_feedback",{p_token:sessionToken,p_calificacion:rating,p_recomendacion:recommendation},1);if(err)throw err;const saved=rpcPayload(data)||{};feedback={rating:Number(saved.calificacion)||rating,recommendation:saved.recomendacion??recommendation};form.classList.add("is-sent");status.textContent="¡Gracias! Tu señal quedó registrada.";button.textContent="Evaluación enviada ✓";setTimeout(()=>{closeFeedback();form.classList.remove("is-sent");button.disabled=false;button.textContent=original;},1800);}catch(err){status.textContent=`No pudimos guardar: ${err.message||"intenta nuevamente."}`;button.disabled=false;button.textContent=original;}
}
async function logoutParticipant(){const token=sessionToken;sessionEpoch++;sessionToken="";clearInterval(heartbeatTimer);clearTimeout(pendingSyncTimer);sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(PENDING_KEY);sessionStorage.removeItem(UI_STEP_KEY);trip={name:"",step:"lanzamiento",duels:{},satellites:[],mission:{}};feedback={rating:0,recommendation:""};competencyRoute="";duelIndex=0;window.LaunchStation.reset();view="start";render();try{if(token)await rpcWithRetry("universo_salir",{p_token:token},0);}catch{}}
function showMap(){if(!sessionToken){view="start";return render();}view="map";render();}
function showPassport(){if(!sessionToken)return;view="passport";render();}
function goStep(step){localAnswer="";observatorySection="benefits";observatoryChallengeIndex=0;observatoryScore=0;persist({step},"journey");}
function answer(value){localAnswer=value;if(trip.step==="observatorio"&&observatorySection==="challenge"&&value===observatoryChallengeQuestions[observatoryChallengeIndex].answer)observatoryScore=Math.max(observatoryScore,observatoryChallengeIndex+1);render();}
function showObservatorySection(section){if(!["benefits","client","employee","challenge"].includes(section))return;observatorySection=section;render();}
function advanceObservatoryChallenge(){if(localAnswer!==observatoryChallengeQuestions[observatoryChallengeIndex].answer||observatoryChallengeIndex>=observatoryChallengeQuestions.length-1)return;observatoryChallengeIndex++;localAnswer="";render();}
function selectCompetencyRoute(route){
  if(!competencyProfiles[route])return;
  competencyRoute=route;duelIndex=0;
  persist({duels:{9:competencyRouteMarkers[route]},mainPlanet:null,explorePlanet:null});
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
  const {rank}=competencyRanking(route,picks);
  persist({duels:picks,mainPlanet:rank[0],explorePlanet:rank[1]});
}
function pickRole(role){persist({role,step:"planetas"});}
function toggleSatellite(id){pendingSatellites=pendingSatellites.includes(id)?pendingSatellites.filter(x=>x!==id):[...pendingSatellites,id];render();}
function saveSatellites(){persist({satellites:pendingSatellites,step:"coordenadas"});}
function saveObservatory(){if(observatoryScore<observatoryChallengeQuestions.length)return;persist({observatory:"Reto de señales completado · 6 de 6",step:"mision"});}
function saveMission(){const mission={accion:document.querySelector("#action").value.trim(),conQuien:document.querySelector("#with").value,aprendizaje:document.querySelector("#learning").value};if(!mission.accion||!mission.conQuien||!mission.aprendizaje)return render("Completa los tres componentes de tu misión.");persist({mission},"passport");}

app.addEventListener("submit",(event)=>{
  const form=event.target.closest("form[data-form]");
  if(!form)return;
  if(form.dataset.form==="access")loginParticipant(event);
  if(form.dataset.form==="feedback")saveFeedback(event);
});
app.addEventListener("change",(event)=>{
  if(event.target.matches('input[name="access-mode"]'))updateAccessMode();
  if(event.target.matches('input[name="rating"]')){
    const form=event.target.closest('form[data-form="feedback"]'),status=form?.querySelector("#feedback-status");
    form?.querySelector(".rating-field")?.classList.remove("needs-rating");
    if(status?.textContent.includes("Elige una cantidad"))status.textContent="";
  }
  if(event.target.matches("#action-preset")){
    const action=document.querySelector("#action");
    if(action&&event.target.value)action.value=event.target.value;
  }
});
app.addEventListener("click",(event)=>{
  const control=event.target.closest("[data-action]");
  if(!control||control.disabled)return;
  const action=control.dataset.action,value=control.dataset.value;
  if(action.startsWith("launch-"))return window.LaunchStation.handle(action,value);
  if(action==="home")return sessionToken?showMap():render();
  if(action==="show-map")return showMap();
  if(action==="show-passport")return showPassport();
  if(action==="open-feedback")return openFeedback();
  if(action==="close-feedback")return closeFeedback();
  if(action==="logout")return logoutParticipant();
  if(action==="go-step")return goStep(control.dataset.step);
  if(action==="answer")return answer(value);
  if(action==="observatory-section")return showObservatorySection(value);
  if(action==="advance-observatory")return advanceObservatoryChallenge();
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

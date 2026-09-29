(function () {
  "use strict";

  const glossaryGroups = [
    {
      title: "01 · Mirar desde el cliente",
      description: "Reconoce a quién orienta el viaje y el valor que buscamos generar.",
      terms: [
        { id: "cx", name: "Experiencia del cliente (CX)", definition: "Resultado emocional del cliente de acuerdo con su interacción con la organización.", clue: "Resultado emocional del cliente de acuerdo con su interacción con la organización." },
        { id: "clientecentrismo", name: "Clientecentrismo", definition: "Decisiones y actuaciones pensando en el valor que les generamos a los clientes y usuarios.", clue: "Decidir y actuar pensando en el valor que generamos a clientes y usuarios." },
        { id: "conocimiento", name: "Conocimiento", definition: "Comprensión de necesidades, expectativas y fricciones del cliente y usuario para personalizar las interacciones.", clue: "Comprender necesidades, expectativas y fricciones para personalizar las interacciones." },
        { id: "promesa", name: "Promesa de Experiencia", definition: "Compromiso explícito que una empresa define y declara sobre cómo quiere que sus clientes se sientan y qué valor recibirán en cada interacción.", clue: "Compromiso declarado sobre cómo queremos que el cliente se sienta y qué valor recibirá." }
      ]
    },
    {
      title: "02 · Preparar la operación",
      description: "Conecta las capacidades y las decisiones que hacen posible la experiencia.",
      terms: [
        { id: "arquitectura", name: "Arquitectura Empresarial", definition: "Es una disciplina de gestión y de mejora continua que permite desarrollar las capacidades organizacionales (distintivas y del hacer) para habilitar el logro de la estrategia con acciones integradas en las dimensiones: procesos, personas, información, organización, cultura y tecnología.", clue: "Desarrollar capacidades para habilitar la estrategia integrando procesos, personas, información, organización, cultura y tecnología." },
        { id: "modelo", name: "Modelo de Gestión de Experiencia", definition: "Sistema estructurado, consistente, medible y sostenible definido para diseñar, ejecutar, evaluar y mejorar las vivencias y percepciones del cliente y demás actores del ecosistema.", clue: "Sistema estructurado, medible y sostenible para diseñar, ejecutar, evaluar y mejorar las vivencias del ecosistema." },
        { id: "diseno", name: "Diseño de Experiencia", definition: "Creación intencional de interacciones que simplifican y generan valor.", clue: "Crear intencionalmente interacciones que simplifican y generan valor." },
        { id: "eficiencias", name: "Eficiencias", definition: "Simplificación del trabajo, optimización de recursos y reducción de fricciones para el cliente.", clue: "Simplificar el trabajo, optimizar recursos y reducir fricciones para el cliente." }
      ]
    },
    {
      title: "03 · Leer las señales",
      description: "Escucha, mide y convierte lo aprendido en una mejor experiencia.",
      terms: [
        { id: "escucha", name: "Ecosistema de escucha", definition: "Conjunto de mecanismos e instrumentos que permiten comprender la percepción, necesidades y expectativas.", clue: "Mecanismos e instrumentos para comprender la percepción, necesidades y expectativas." },
        { id: "medicion", name: "Medición de la Experiencia", definition: "Evaluación estructurada de percepciones y vivencias.", clue: "Evaluar de forma estructurada las percepciones y vivencias." },
        { id: "indicadores", name: "Indicadores de Experiencia", definition: "Métricas que hacen visible y gestionable la experiencia.", clue: "Métricas que permiten hacer visible y gestionable la experiencia." },
        { id: "mejora", name: "Mejora continua", definition: "Evolución permanente basada en mediciones, datos y retroalimentación.", clue: "Evolucionar permanentemente a partir de mediciones, datos y retroalimentación." }
      ]
    },
    {
      title: "04 · Conectar el ecosistema",
      description: "Ubica a las personas y las relaciones que acompañan el recorrido.",
      terms: [
        { id: "ecosistema", name: "Ecosistema de Experiencia", definition: "Articulación de la gestión de la experiencia de Clientes y usuarios, Empleados, Proveedores y Contratistas, Dueño y Comunidad, soportado por la gestión de marca y reputación.", clue: "Articular las experiencias de clientes, empleados, proveedores y contratistas, dueño y comunidad, con marca y reputación." },
        { id: "ex", name: "Experiencia del empleado (EX)", definition: "Cómo las personas perciben, viven y sienten su relación con la organización.", clue: "Cómo las personas perciben, viven y sienten su relación con la organización." },
        { id: "viaje", name: "Viaje del empleado", definition: "Etapas e interacciones que vive el empleado en su relación con la organización.", clue: "Etapas e interacciones del empleado durante su relación con la organización." },
        { id: "comunicacion", name: "Comunicación", definition: "Interacciones que conectan, orientan y fortalecen la experiencia.", clue: "Interacciones que conectan, orientan y fortalecen la experiencia." }
      ]
    }
  ];
  const panelNames = ["Tu guía", "La experiencia", "La brújula", "Los códigos", "La práctica"];
  const definitionOrders = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 2, 1, 0], [2, 0, 1, 3]];
  let panel = 0;
  let visited = new Set([0]);
  let round = 0;
  let matched = new Set();
  let selected = "";
  let feedback = "Elige un concepto y luego la definición que corresponde.";
  let feedbackKind = "";

  function escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function source(slide) {
    return `<p class="launch-source">Guía de la Experiencia · lámina ${slide}</p>`;
  }

  function ready() {
    return matched.size === 16 && [0, 1, 2, 3].every(index => visited.has(index));
  }

  function briefing() {
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Prepara tu viaje</h2>
      <p class="launch-panel-intro">Antes de entrar al universo, conoce tu carta de navegación y la carga esencial que llevarás a cada estación.</p>
      <div class="launch-splash">
        <div class="launch-emblem" aria-hidden="true"><span class="launch-emblem-orbit"></span><span class="launch-emblem-orbit"></span><span class="launch-emblem-core">Tu rol<br><small>activa la experiencia</small></span><span class="launch-emblem-beacon">+</span></div>
        <div class="launch-definition"><p class="launch-kicker">Tu carta de navegación</p><h3>¿Qué es la Guía de la Experiencia?</h3><p>Es un recorrido que te invita a comprender el mundo de la experiencia de los clientes y usuarios, en articulación con los demás actores del ecosistema y a contribuir, desde cada rol, a que las interacciones con nuestros clientes y usuarios sean positivas y consistentes para que incrementen su confianza y lealtad hacia las empresas del Grupo EPM.</p></div>
      </div>
      <h3>La carga esencial de tu viaje</h3>
      <ol class="launch-cargo-list">
        <li><strong>Terminología</strong><span>Los conceptos que nos permiten hablar el mismo idioma.</span></li>
        <li><strong>Modelos y esquemas</strong><span>Relacionados con la gestión de Experiencia.</span></li>
        <li><strong>Escucha y medición</strong><span>Formas de escuchar a nuestros clientes y medir su experiencia.</span></li>
        <li><strong>Tu rol y participación</strong><span>El rol y participación de cada empleado como protagonista en la relación con nuestros clientes y usuarios.</span></li>
        <li><strong>Competencias y comportamientos</strong><span>Que aportan a la gestión de Experiencia.</span></li>
      </ol>
      <p class="launch-callout">Tus comportamientos y acciones marcan la diferencia en la relación que establecen nuestros clientes y usuarios con las empresas del Grupo EPM.</p>
      ${source(4)}
    </section>`;
  }

  function experience() {
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Las señales de una experiencia</h2>
      <p class="launch-panel-intro">Una interacción deja una señal. Aprende a reconocer la experiencia que construimos con nuestras decisiones.</p>
      <div class="launch-definition"><p class="launch-kicker">Experiencia del cliente y usuario · CX</p><p class="launch-statement">Es el resultado emocional del cliente y usuario luego de relacionarse con nuestras empresas.</p></div>
      <div class="launch-flow" role="img" aria-label="Valores, a través de emociones, para generar experiencias."><div class="launch-flow-node"><span>01</span><strong>Valores</strong></div><div class="launch-flow-link">A través de<span aria-hidden="true">→</span></div><div class="launch-flow-node"><span>02</span><strong>Emociones</strong></div><div class="launch-flow-link">Para generar<span aria-hidden="true">→</span></div><div class="launch-flow-node"><span>03</span><strong>Experiencias</strong></div></div>
      <h3>¿Qué significa poner al cliente y usuario en el centro?</h3>
      <p>Poner el cliente y usuario en el centro es tomar decisiones pensando en el valor que les generamos, lo cual nos exige alineación de la operación y la cultura con la estrategia, para sostener en el tiempo una forma de actuar coherente con nuestro enfoque de clientecentrismo.</p>
      <div class="launch-alignment" role="group" aria-label="Alineación para el clientecentrismo"><div class="launch-alignment-item">Operación</div><div class="launch-alignment-item">Cultura</div><div class="launch-alignment-item">Estrategia</div><div class="launch-alignment-core"><strong>Cliente y usuario</strong><span>Decisiones que generan valor</span></div></div>
      <details class="launch-example"><summary>Ejemplo de aplicación · ¿Resolver una solicitud es suficiente?</summary><p>Una persona obtiene una solución, pero tuvo que explicar su caso varias veces. La necesidad funcional pudo resolverse; aun así, la interacción puede dejar cansancio o frustración.</p><p>Al coordinar la información y explicar con claridad qué va a ocurrir, reducimos fricciones y cuidamos también cómo se siente la persona. Piensa en una interacción de tu trabajo: ¿qué podrías simplificar para quien la vive?</p></details>
      ${source(5)}
    </section>`;
  }

  function strategy() {
    const challenges = ["Calidad de los servicios", "Servicios eficientes", "Cobertura universal sostenible", "Protección Hídrica y Carbono Neutralidad", "Generación de valor"];
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">La brújula que nos orienta</h2>
      <p class="launch-panel-intro">Direccionamiento Estratégico Grupo EPM · Declaración de clientecentrismo</p>
      <div class="launch-strategy-grid">
        <div class="launch-strategy-card"><p class="launch-kicker">Propósito</p><h3>Hacia dónde viajamos</h3><p>Contribuimos a la armonía de la vida para un mundo mejor.</p></div>
        <div class="launch-strategy-card"><p class="launch-kicker">Identidad</p><h3>Cómo servimos</h3><p>Servimos con responsabilidad, transparencia y calidez.</p></div>
        <div class="launch-strategy-card"><p class="launch-kicker">Estrategia</p><h3>Cómo avanzamos</h3><p>Con servicios públicos eficientes y de calidad para todos, inspirados y guiados por nuestros clientes y usuarios, promovemos el desarrollo humano sostenible.</p></div>
      </div>
      <h3>Retos 2035 · Una misma estrella orienta el rumbo</h3>
      <div class="launch-challenges"><div class="launch-challenges-core"><strong>Experiencia cliente y usuario</strong><span>En el centro de los retos</span></div><ol class="launch-challenges-list">${challenges.map((challenge, index) => `<li class="launch-challenge"><span class="launch-challenge-number" aria-hidden="true">${index + 1}</span><span>${escape(challenge)}</span></li>`).join("")}</ol></div>
      <div class="launch-target"><div><p class="launch-kicker">NPS · Meta 2035</p><h3>El horizonte de recomendación</h3><p>Lograr que las empresas del Grupo EPM alcancen un nivel de recomendación alto (entre 52 y 70) o muy alto (mayor a 70), según su nivel de madurez de experiencia.</p></div><div class="launch-target-levels"><span><strong>52–70</strong>Alto</span><span><strong>&gt; 70</strong>Muy alto</span></div></div>
      <p class="launch-caption">Experiencia emocional y funcional del cliente y usuario.</p>
      ${source(6)}
    </section>`;
  }

  function glossary() {
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Los códigos de navegación</h2>
      <p class="launch-panel-intro">Estos 16 conceptos son tu equipaje para el recorrido. Explóralos en cuatro grupos y luego conecta cada uno con su significado.</p>
      <div class="launch-glossary-groups">${glossaryGroups.map(group => `<section class="launch-glossary-group"><h3>${escape(group.title)}</h3><p>${escape(group.description)}</p><dl class="launch-glossary-list">${group.terms.map(term => `<div class="launch-glossary-entry"><dt>${escape(term.name)}</dt><dd>${escape(term.definition)}</dd></div>`).join("")}</dl></section>`).join("")}</div>
      ${source(3)}
    </section>`;
  }

  function training() {
    const group = glossaryGroups[round];
    const done = group.terms.every(term => matched.has(term.id));
    const allDone = matched.size === 16;
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Entrenamiento antes del despegue</h2>
      <p class="launch-panel-intro">Enlaza los 16 códigos de navegación. Elige primero un concepto y después su definición. Puedes volver a consultar los códigos cuando lo necesites.</p>
      <div class="launch-match-status"><div><p class="launch-kicker">Ronda ${round + 1} de 4</p><h3>${escape(group.title.slice(5))}</h3></div><span><strong>${matched.size} / 16</strong> códigos enlazados</span></div>
      <div class="launch-match-grid">
        <div class="launch-match-column"><h4>1. Elige un concepto</h4>${group.terms.map(term => `<button type="button" class="launch-match-card${selected === term.id ? " is-selected" : ""}${matched.has(term.id) ? " is-matched" : ""}" data-action="launch-term" data-value="${term.id}" aria-pressed="${selected === term.id}"${matched.has(term.id) ? " disabled" : ""}><span>${escape(term.name)}</span>${matched.has(term.id) ? '<span class="launch-match-check" aria-label="Enlazado">✓</span>' : ""}</button>`).join("")}</div>
        <div class="launch-match-column"><h4>2. Encuentra su significado</h4>${definitionOrders[round].map(index => group.terms[index]).map(term => `<button type="button" class="launch-match-card${matched.has(term.id) ? " is-matched" : ""}" data-action="launch-definition" data-value="${term.id}"${matched.has(term.id) ? " disabled" : ""}><span>${escape(term.clue)}</span>${matched.has(term.id) ? '<span class="launch-match-check" aria-label="Enlazado">✓</span>' : ""}</button>`).join("")}</div>
      </div>
      <p class="launch-feedback${feedbackKind ? ` launch-feedback-${feedbackKind}` : ""}" role="status" aria-live="polite" aria-atomic="true">${escape(feedback)}</p>
      ${done && !allDone ? '<button type="button" class="launch-round-next" data-action="launch-round">Siguiente grupo de códigos <span aria-hidden="true">→</span></button>' : ""}
      ${allDone ? '<div class="launch-complete"><span aria-hidden="true">✓</span><div><h3>Tu equipaje de navegación está listo</h3><p>Conectaste los 16 conceptos. Lleva este lenguaje común a las siguientes estaciones y úsalo para reconocer cómo tus acciones aportan a la experiencia.</p></div></div>' : ""}
      ${source(3)}
    </section>`;
  }

  function render() {
    const panels = [briefing, experience, strategy, glossary, training];
    const visitedContent = [0, 1, 2, 3].filter(index => visited.has(index)).length;
    return `<article class="lesson launch-station" id="launch-station">
      <header class="launch-heading"><p class="launch-kicker">01 · Centro de lanzamiento</p><h1>Antes de despegar, hablemos el mismo idioma.</h1><p class="launch-intro">Tu misión empieza aquí: comprende la experiencia, reconoce el rumbo y prepara tus códigos de navegación.</p></header>
      <div class="launch-tabs" role="group" aria-label="Preparación para el despegue">${panelNames.map((name, index) => `<button type="button" class="launch-tab${panel === index ? " is-active" : ""}${visited.has(index) ? " is-visited" : ""}" data-action="launch-panel" data-value="${index}"${panel === index ? ' aria-current="step"' : ""}><span class="launch-tab-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span>${escape(name)}</span></button>`).join("")}</div>
      <div class="launch-scroll" tabindex="0" role="region" aria-label="Contenido del centro de lanzamiento">${panels[panel]()}</div>
      <footer class="launch-footer"><div class="launch-progress"><strong>Preparación ${panel + 1} de 5</strong><span>${visitedContent}/4 contenidos explorados · ${matched.size}/16 códigos enlazados</span></div><div class="launch-footer-actions">${panel > 0 ? '<button type="button" class="launch-back" data-action="launch-prev"><span aria-hidden="true">←</span> Anterior</button>' : ""}${panel < 4 ? '<button type="button" class="launch-forward" data-action="launch-next">Continuar <span aria-hidden="true">→</span></button>' : `<button type="button" class="launch-forward" data-action="go-step" data-step="estrellas"${ready() ? "" : ' disabled aria-describedby="launch-ready-hint"'}>Ir a la estrella principal <span aria-hidden="true">→</span></button>`}</div>${panel === 4 && !ready() ? `<p id="launch-ready-hint" class="launch-ready-hint">${matched.size < 16 ? "Enlaza los 16 códigos" : "Códigos completos"}${visitedContent < 4 ? " y explora los cuatro contenidos" : ""} para despegar.</p>` : ""}</footer>
    </article>`;
  }

  function update(focusSelector, panelChanged) {
    const article = document.getElementById("launch-station");
    if (!article) return;
    const previousScroll = article.querySelector(".launch-scroll").scrollTop;
    article.outerHTML = render();
    const replacement = document.getElementById("launch-station");
    const scroll = replacement.querySelector(".launch-scroll");
    scroll.scrollTop = panelChanged ? 0 : previousScroll;
    const target = replacement.querySelector(focusSelector || "#launch-panel-title");
    if (target) target.focus({ preventScroll: true });
    if (!panelChanged && target && scroll.contains(target)) {
      const bounds = scroll.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      if (targetBounds.bottom > bounds.bottom) scroll.scrollTop += targetBounds.bottom - bounds.bottom + 12;
      else if (targetBounds.top < bounds.top) scroll.scrollTop -= bounds.top - targetBounds.top + 12;
    }
    const live = replacement.querySelector(".launch-feedback");
    if (live) {
      const message = feedback;
      live.textContent = "";
      window.requestAnimationFrame(() => { if (live.isConnected) live.textContent = message; });
    }
  }

  function changePanel(next) {
    if (!Number.isInteger(next) || next < 0 || next >= panelNames.length) return;
    panel = next;
    visited.add(panel);
    update("#launch-panel-title", true);
  }

  function handle(action, value) {
    if (typeof action !== "string" || !action.startsWith("launch-")) return false;
    if (action === "launch-panel") changePanel(Number(value));
    else if (action === "launch-prev") changePanel(Math.max(0, panel - 1));
    else if (action === "launch-next") changePanel(Math.min(4, panel + 1));
    else if (action === "launch-term" && panel === 4) {
      const term = glossaryGroups[round].terms.find(item => item.id === value);
      if (!term || matched.has(term.id)) return true;
      selected = term.id;
      feedback = `Concepto seleccionado: ${term.name}. Ahora elige su definición.`;
      feedbackKind = "";
      update(`[data-action="launch-term"][data-value="${term.id}"]`);
    } else if (action === "launch-definition" && panel === 4) {
      const terms = glossaryGroups[round].terms;
      const term = terms.find(item => item.id === value);
      if (!term || matched.has(term.id)) return true;
      let focus = `[data-action="launch-definition"][data-value="${term.id}"]`;
      if (!selected) {
        feedback = "Elige primero un concepto en la columna de la izquierda.";
        feedbackKind = "notice";
        const first = terms.find(item => !matched.has(item.id));
        if (first) focus = `[data-action="launch-term"][data-value="${first.id}"]`;
      } else if (selected === term.id) {
        matched.add(term.id);
        selected = "";
        feedback = `¡Enlace correcto! ${term.name}: ${term.definition}`;
        feedbackKind = "success";
        const next = terms.find(item => !matched.has(item.id));
        if (next) focus = `[data-action="launch-term"][data-value="${next.id}"]`;
        else if (round < 3) focus = '[data-action="launch-round"]';
        else if (ready()) focus = '[data-action="go-step"][data-step="estrellas"]';
        else focus = '[data-action="launch-panel"][data-value="0"]';
      } else {
        feedback = "Ese enlace aún no corresponde. Conservamos tu concepto seleccionado: prueba con otra definición o consulta los códigos de navegación.";
        feedbackKind = "notice";
      }
      update(focus);
    } else if (action === "launch-round" && panel === 4 && round < 3 && glossaryGroups[round].terms.every(term => matched.has(term.id))) {
      round += 1;
      selected = "";
      feedback = "Nuevo grupo de códigos. Elige un concepto y luego su definición.";
      feedbackKind = "";
      update("#launch-panel-title", true);
    }
    return true;
  }

  function reset() {
    panel = 0;
    visited = new Set([0]);
    round = 0;
    matched = new Set();
    selected = "";
    feedback = "Elige un concepto y luego la definición que corresponde.";
    feedbackKind = "";
  }

  window.LaunchStation = Object.freeze({ render, handle, reset });
})();

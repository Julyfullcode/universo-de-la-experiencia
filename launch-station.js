(function () {
  "use strict";

  const glossaryGroups = [
    {
      title: "Mirar desde el cliente",
      terms: [
        { id: "cx", name: "Experiencia del cliente (CX)", definition: "Resultado emocional del cliente de acuerdo con su interacción con la organización." },
        { id: "clientecentrismo", name: "Clientecentrismo", definition: "Decisiones y actuaciones pensando en el valor que les generamos a los clientes y usuarios." },
        { id: "conocimiento", name: "Conocimiento", definition: "Comprensión de necesidades, expectativas y fricciones del cliente y usuario para personalizar las interacciones." },
        { id: "promesa", name: "Promesa de Experiencia", definition: "Compromiso explícito que una empresa define y declara sobre cómo quiere que sus clientes se sientan y qué valor recibirán en cada interacción." }
      ]
    },
    {
      title: "Preparar la operación",
      terms: [
        { id: "arquitectura", name: "Arquitectura Empresarial", definition: "Es una disciplina de gestión y de mejora continua que permite desarrollar las capacidades organizacionales (distintivas y del hacer) para habilitar el logro de la estrategia con acciones integradas en las dimensiones: procesos, personas, información, organización, cultura y tecnología." },
        { id: "modelo", name: "Modelo de Gestión de Experiencia", definition: "Sistema estructurado, consistente, medible y sostenible definido para diseñar, ejecutar, evaluar y mejorar las vivencias y percepciones del cliente y demás actores del ecosistema." },
        { id: "diseno", name: "Diseño de Experiencia", definition: "Creación intencional de interacciones que simplifican y generan valor." },
        { id: "eficiencias", name: "Eficiencias", definition: "Simplificación del trabajo, optimización de recursos y reducción de fricciones para el cliente." }
      ]
    },
    {
      title: "Leer las señales",
      terms: [
        { id: "escucha", name: "Ecosistema de escucha", definition: "Conjunto de mecanismos e instrumentos que permiten comprender la percepción, necesidades y expectativas." },
        { id: "medicion", name: "Medición de la Experiencia", definition: "Evaluación estructurada de percepciones y vivencias." },
        { id: "indicadores", name: "Indicadores de Experiencia", definition: "Métricas que hacen visible y gestionable la experiencia." },
        { id: "mejora", name: "Mejora continua", definition: "Evolución permanente basada en mediciones, datos y retroalimentación." }
      ]
    },
    {
      title: "Conectar el ecosistema",
      terms: [
        { id: "ecosistema", name: "Ecosistema de Experiencia", definition: "Articulación de la gestión de la experiencia de Clientes y usuarios, Empleados, Proveedores y Contratistas, Dueño y Comunidad, soportado por la gestión de marca y reputación." },
        { id: "ex", name: "Experiencia del empleado (EX)", definition: "Cómo las personas perciben, viven y sienten su relación con la organización." },
        { id: "viaje", name: "Viaje del empleado", definition: "Etapas e interacciones que vive el empleado en su relación con la organización." },
        { id: "comunicacion", name: "Comunicación", definition: "Interacciones que conectan, orientan y fortalecen la experiencia." }
      ]
    }
  ];
  const learningCodes = {
    cx: { simple: "Es lo que una persona siente después de relacionarse con la empresa. Resolver su solicitud influye, pero también importa cómo vivió el proceso.", example: "A Lucía le corrigieron un cobro. La explicación clara y el seguimiento le dejaron tranquilidad, además de una factura corregida.", contrast: "CX es el resultado emocional. Clientecentrismo es el criterio con el que tomamos decisiones para generar valor.", signal: "La solicitud de Lucía quedó resuelta. Al terminar dice: «Ahora estoy tranquila; entendí lo que pasó y sentí que me acompañaron». ¿Qué estamos reconociendo?", hint: "mira el resultado que quedó en la persona después de la interacción.", why: "La tranquilidad y la confianza describen el resultado emocional de la relación, además de la solución recibida." },
    clientecentrismo: { simple: "Es elegir pensando en el valor que recibe el cliente, y alinear la forma de trabajar para sostener esa elección.", example: "Un equipo decide que el cliente no tenga que repetir sus datos, aunque eso exija coordinar mejor dos áreas.", contrast: "No basta con conocer al cliente. Ese conocimiento debe cambiar lo que decidimos y hacemos.", signal: "Dos áreas pueden mantener sus trámites separados o coordinarse para evitarle una nueva gestión al usuario. Eligen coordinarse porque así le generan más valor. ¿Qué criterio guía su decisión?", hint: "busca el enfoque que pone el valor para el cliente en el centro de la decisión.", why: "La decisión se tomó por el valor que genera al usuario, y eso exigió alinear la operación." },
    conocimiento: { simple: "Es comprender qué necesita la persona, qué espera y dónde encuentra dificultades para responder a su situación.", example: "Antes de proponer un canal digital, el equipo descubre que varios usuarios no tienen conexión estable y necesitan otra alternativa.", contrast: "Escuchar recoge señales. Conocer implica interpretarlas para entender necesidades y adaptar la interacción.", signal: "Antes de cambiar un trámite, el equipo identifica qué necesitan los usuarios, qué esperan y en qué paso se atascan. Con esa comprensión adapta la atención. ¿Qué está construyendo?", hint: "la pista está en comprender la situación del usuario para personalizar la interacción.", why: "Comprender necesidades, expectativas y fricciones permite adaptar la respuesta a la persona." },
    promesa: { simple: "Es el compromiso que la empresa declara sobre el valor que entregará y cómo quiere que se sienta la persona en cada contacto.", example: "Una empresa declara que hará las gestiones más simples y explicará cada paso con claridad. Ese compromiso orienta a todos sus equipos.", contrast: "La promesa declara la experiencia que queremos ofrecer; CX muestra cómo terminó sintiéndose realmente la persona.", signal: "Una empresa declara públicamente qué valor quiere entregar y cómo desea que se sientan sus usuarios cada vez que se relacionan con ella. ¿Qué está definiendo?", hint: "se trata de un compromiso explícito que orienta las interacciones, no de un resultado ya medido.", why: "La declaración establece un compromiso común sobre el valor y la experiencia que se busca ofrecer." },
    arquitectura: { simple: "Es conectar las capacidades que necesita la estrategia: procesos, personas, información, organización, cultura y tecnología.", example: "Para que un usuario consulte su caso en cualquier canal, se ajustan responsabilidades, datos, herramientas, procesos y prácticas de los equipos.", contrast: "Arquitectura integra capacidades de la organización. El modelo de gestión organiza cómo diseñamos, ejecutamos, evaluamos y mejoramos la experiencia.", signal: "Una iniciativa requiere cambiar procesos, preparar personas, compartir información, ajustar responsabilidades, reforzar prácticas culturales e integrar tecnología. ¿Qué disciplina permite conectar esas capacidades con la estrategia?", hint: "identifica la disciplina que integra las seis dimensiones de la organización.", why: "La arquitectura desarrolla capacidades con acciones integradas en las seis dimensiones, para habilitar la estrategia." },
    modelo: { simple: "Es la forma organizada y sostenible de gestionar la experiencia: diseñarla, ponerla en marcha, evaluarla y mejorarla.", example: "Un equipo acuerda cómo diseñará las interacciones, quién las ejecutará, con qué evaluará los resultados y cómo hará ajustes periódicos.", contrast: "Diseñar una interacción es una parte. El modelo conecta todo el ciclo para que sea consistente, medible y sostenible.", signal: "La organización establece un sistema común para diseñar, ejecutar, evaluar y mejorar las vivencias de clientes y otros actores. Quiere sostenerlo y medirlo en el tiempo. ¿Qué está definiendo?", hint: "no es una intervención aislada: es el sistema que conecta todo el ciclo de gestión.", why: "El modelo estructura un ciclo consistente, medible y sostenible para gestionar la experiencia del ecosistema." },
    diseno: { simple: "Es pensar y crear, de manera intencional, interacciones que hagan las cosas más simples y valiosas para las personas.", example: "Antes de lanzar una solicitud digital, el equipo prueba un recorrido con instrucciones claras y confirmación del siguiente paso.", contrast: "Diseñar decide cómo debe vivirse la interacción. Eficiencias se concentra en simplificar trabajo, recursos y fricciones.", signal: "Antes de lanzar un servicio, el equipo crea y prueba cómo será la bienvenida, la solicitud y la confirmación, buscando que cada interacción sea simple y útil. ¿Qué está haciendo?", hint: "la clave es crear intencionalmente la interacción que va a vivir la persona.", why: "El equipo está creando interacciones con una intención explícita: simplificar y generar valor." },
    eficiencias: { simple: "Es quitar trabajo innecesario, aprovechar mejor los recursos y reducir obstáculos para quien usa el servicio.", example: "Se elimina la solicitud de un documento que la organización ya tiene. El usuario hace menos gestiones y el equipo evita una revisión duplicada.", contrast: "No equivale a recortar recursos sin mirar al cliente: la simplificación también debe reducir sus fricciones.", signal: "Un trámite pide dos veces el mismo soporte. El equipo elimina la duplicidad, reduce trabajo interno y le evita otra gestión al usuario. ¿Qué está logrando?", hint: "observa la simplificación del trabajo y la reducción de recursos y fricciones.", why: "Quitar una duplicidad optimiza el trabajo y los recursos mientras reduce una fricción para el cliente." },
    escucha: { simple: "Es el conjunto de medios con los que recogemos lo que las personas perciben, necesitan y esperan.", example: "Un equipo conecta entrevistas, encuestas y comentarios de atención para comprender mejor lo que viven sus usuarios.", contrast: "El ecosistema reúne mecanismos para escuchar. La medición evalúa de forma estructurada y los indicadores expresan resultados en métricas.", signal: "Para comprender a los usuarios, un equipo articula entrevistas, encuestas y comentarios recibidos en los canales de atención. ¿Cómo llamamos a este conjunto de mecanismos?", hint: "la pregunta se refiere al conjunto de medios para recoger la voz de las personas.", why: "Entrevistas, encuestas y otros mecanismos articulados permiten comprender percepciones, necesidades y expectativas." },
    medicion: { simple: "Es evaluar las percepciones y vivencias con un método definido, para entender la experiencia de manera estructurada.", example: "Después de un trámite se aplica una evaluación con preguntas y criterios comunes sobre lo que vivió la persona.", contrast: "La medición es el proceso de evaluación. El indicador es la métrica que hace visible un aspecto de esa experiencia.", signal: "Al terminar un trámite, se aplica una evaluación con preguntas y criterios definidos para valorar las percepciones y vivencias de los usuarios. ¿Qué proceso se está realizando?", hint: "busca el proceso de evaluación, no el conjunto de canales ni una cifra de resultado.", why: "Se están evaluando percepciones y vivencias con una estructura definida: eso es medir la experiencia." },
    indicadores: { simple: "Son las métricas que permiten ver aspectos de la experiencia y usarlos para gestionar decisiones.", example: "Un equipo revisa un índice de satisfacción para identificar qué interacciones requieren atención y seguir su evolución.", contrast: "Un indicador hace visible un resultado. Por sí solo no explica sus causas ni reemplaza la escucha o la mejora.", signal: "En el tablero del equipo aparece un índice de satisfacción que permite seguir los resultados y orientar decisiones. ¿Qué tipo de herramienta es esa métrica?", hint: "importa la métrica que vuelve visible y gestionable la experiencia.", why: "El índice es un indicador: una métrica que ayuda a hacer visible y gestionable la experiencia." },
    mejora: { simple: "Es convertir datos y retroalimentación en cambios, revisar sus efectos y seguir ajustando la experiencia.", example: "Los comentarios revelan instrucciones confusas. El equipo las cambia, vuelve a escuchar y ajusta lo que aún genera dudas.", contrast: "Medir permite conocer el resultado; mejorar implica actuar sobre lo aprendido y continuar el ciclo.", signal: "Tras revisar datos y comentarios, el equipo cambia una instrucción confusa. Luego evalúa el efecto y vuelve a ajustarla. ¿Qué práctica está sosteniendo?", hint: "hay una evolución permanente: aprender, cambiar, revisar y volver a ajustar.", why: "El equipo transforma mediciones y retroalimentación en una evolución continua, en lugar de quedarse solo con el diagnóstico." },
    ecosistema: { simple: "La experiencia conecta a clientes y usuarios, empleados, proveedores y contratistas, dueño y comunidad; la marca y la reputación soportan esa relación.", example: "Una intervención afecta al usuario, a la comunidad y al contratista que la realiza. Coordinar sus experiencias también cuida la relación con empleados y dueño, y la reputación de la empresa.", contrast: "El ecosistema de experiencia articula actores. El ecosistema de escucha articula mecanismos para comprenderlos.", signal: "Una decisión considera de manera articulada a clientes y usuarios, empleados, proveedores y contratistas, dueño y comunidad, con el soporte de marca y reputación. ¿Qué perspectiva está tomando?", hint: "la pista es la articulación de las experiencias de todos esos actores.", why: "La experiencia se gestiona entre actores relacionados, con el soporte de la marca y la reputación." },
    ex: { simple: "Es cómo una persona vive, percibe y siente su relación con la organización en la que trabaja.", example: "Una empleada encuentra orientación, herramientas y apoyo para aprender. Esa relación le hace sentirse acompañada y capaz de contribuir.", contrast: "EX habla de cómo se vive y siente la relación. El viaje del empleado organiza las etapas e interacciones de esa relación.", signal: "Una empleada cuenta que se siente escuchada, acompañada y valorada en su relación con la organización. ¿Qué estamos reconociendo?", hint: "mira cómo vive y siente la relación quien trabaja en la organización.", why: "La señal describe las percepciones y vivencias de una empleada en su relación con la organización." },
    viaje: { simple: "Es el recorrido de etapas e interacciones que vive una persona a lo largo de su relación laboral.", example: "Un equipo identifica qué ocurre en la vinculación, la bienvenida, el desarrollo y la salida, y qué interacciones acompañan cada etapa.", contrast: "El viaje permite ubicar momentos e interacciones. EX permite comprender cómo la persona los vive y siente.", signal: "Un equipo traza las etapas por las que pasa una persona desde que se vincula hasta que termina su relación laboral, incluyendo sus interacciones en cada momento. ¿Qué está trazando?", hint: "se está organizando el recorrido por etapas, no describiendo una emoción.", why: "El viaje del empleado permite reconocer las etapas e interacciones de su relación con la organización." },
    comunicacion: { simple: "Es interactuar para conectar, orientar y fortalecer la experiencia de las personas.", example: "Ante un cambio de fecha, el equipo explica lo ocurrido, indica el siguiente paso y comprueba que la persona sepa qué hacer.", contrast: "No consiste solo en enviar un mensaje. La interacción debe ayudar a conectar y orientar a quien lo recibe.", signal: "El equipo explica un cambio de fecha, aclara qué ocurrirá después y comprueba que el usuario entendió cómo continuar. ¿Qué está cuidando con esa interacción?", hint: "observa cómo la interacción conecta y orienta a la persona.", why: "Explicar, orientar y verificar la comprensión fortalece la experiencia a través de la comunicación." }
  };
  const cxDefinition = "La experiencia es el resultado de lo que sienten los clientes y usuarios después de relacionarse con nuestras empresas.";
  const clientCentricDefinition = "Poner el cliente y usuario en el centro es tomar decisiones pensando en el valor que les generamos, lo cual nos exige alineación de la operación y la cultura con la estrategia, para sostener en el tiempo una forma de actuar coherente con nuestro enfoque de clientecentrismo.";
  const experienceSteps = [
    { name: "Valores", heading: "Haz que se note", text: "Responsabilidad: coordina la solución. Transparencia: explica lo ocurrido. Calidez: reconoce cómo lo vive la persona." },
    { name: "Emociones", heading: "Escucha lo que queda", text: "Una explicación clara puede aportar tranquilidad. Pregunta cómo se sintió la persona; no supongas que resolver fue suficiente." },
    { name: "Experiencias", heading: "Cuida la relación", text: "La solución atiende una necesidad. Cómo se entrega también deja una huella emocional y puede fortalecer la confianza." }
  ];
  const challenges = ["Calidad de los servicios", "Servicios eficientes", "Cobertura universal sostenible", "Protección Hídrica y Carbono Neutralidad", "Generación de valor"];
  const strategyViews = [
    { name: "Propósito", heading: "Propósito", text: "Contribuimos a la armonía de la vida para un mundo mejor." },
    { name: "Identidad", heading: "Identidad", text: "Servimos con responsabilidad, transparencia y calidez." },
    { name: "Estrategia", heading: "Estrategia", text: "Con servicios públicos eficientes y de calidad para todos, inspirados y guiados por nuestros clientes y usuarios, promovemos el desarrollo humano sostenible." },
    { name: "Retos 2035", heading: "Retos al 2035" },
    { name: "Meta NPS", heading: "Meta NPS 2035", text: "Lograr que las empresas del Grupo EPM alcancen un nivel de recomendación alto (entre 52 y 70) o muy alto (mayor a 70), según su nivel de madurez de experiencia." }
  ];
  const panelNames = ["Experiencia", "Direccionamiento estratégico", "Lenguaje de experiencia", "Práctica · opcional"];
  const groupLabels = ["Cliente", "Operación", "Señales", "Ecosistema"];
  const codeViews = [{ id: "definition", name: "Concepto" }, { id: "example", name: "Ejemplo" }, { id: "contrast", name: "Diferencia" }];
  const answerOrders = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 2, 1, 0], [2, 0, 1, 3]];
  const allTerms = glossaryGroups.flatMap((group, groupIndex) => group.terms.map(term => ({ ...term, groupIndex })));
  let panel = 0;
  let visited = new Set([0]);
  let activeExperience = 0;
  let activeStrategy = 0;
  let activeCode = "cx";
  let activeCodeView = "definition";
  let caseIndex = 0;
  let matched = new Set();
  let selectedAnswer = "";
  let showResult = false;
  let feedback = "";
  let feedbackKind = "";

  function escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function ready() {
    return [0, 1, 2].every(index => visited.has(index));
  }

  function experience() {
    const selected = experienceSteps[activeExperience];
    const connectors = ["A través de", "para generar"];
    return `<section class="launch-panel launch-compact-panel" aria-label="Experiencia"><div class="launch-experience-definition"><p>${escape(cxDefinition)}</p><p class="launch-clientecentrism">${escape(clientCentricDefinition)}</p></div><div class="launch-chain" role="group" aria-label="Valores, a través de emociones, para generar experiencias">${experienceSteps.map((step, index) => `${index ? `<span class="launch-chain-connector" aria-hidden="true"><small>${connectors[index - 1]}</small><b>→</b></span>` : ""}<button type="button" class="launch-chain-step${activeExperience === index ? " is-active" : ""}" data-action="launch-experience" data-value="${index}" aria-pressed="${activeExperience === index}"><i aria-hidden="true">${["◆", "◌", "✦"][index]}</i><span>${escape(step.name)}</span></button>`).join("")}</div><div class="launch-focus-card launch-experience-detail" data-group="${activeExperience}"><div class="launch-experience-visual" aria-hidden="true"><i></i><i></i><i></i><span>${["◆", "◌", "✦"][activeExperience]}</span></div><div class="launch-experience-copy"><h3>${escape(selected.heading)}</h3><p>${escape(selected.text)}</p></div></div></section>`;
  }

  function strategy() {
    const selected = strategyViews[activeStrategy];
    const content = activeStrategy === 3 ? `<ol class="launch-retos">${challenges.map(challenge => `<li>${escape(challenge)}</li>`).join("")}</ol><p class="launch-caption">El cliente y usuario orienta los retos: experiencia emocional y funcional.</p>` : `${activeStrategy === 4 ? '<div class="launch-target-levels"><span><strong>52–70</strong>Alto</span><span><strong>&gt; 70</strong>Muy alto</span></div>' : ""}<p>${escape(selected.text)}</p>${activeStrategy === 4 ? '<p class="launch-caption">Meta 2035 · no es un resultado actual.</p>' : ""}`;
    return `<section class="launch-panel launch-compact-panel" aria-label="Direccionamiento estratégico"><div class="launch-selector" role="group" aria-label="Direccionamiento estratégico">${strategyViews.map((item, index) => `<button type="button" class="launch-strategy-choice${activeStrategy === index ? " is-active" : ""}" data-action="launch-strategy" data-value="${index}" aria-pressed="${activeStrategy === index}">${escape(item.name)}</button>`).join("")}</div><div class="launch-strategy-detail" data-view="${activeStrategy}" data-group="${activeStrategy % 4}"><div class="launch-strategy-orbit" aria-hidden="true"><i></i><i></i><span>${["✦","◆","↗","◎","NPS"][activeStrategy]}</span></div><div class="launch-strategy-copy"><h3>${escape(selected.heading)}</h3>${content}</div></div></section>`;
  }

  function glossary() {
    const term = allTerms.find(item => item.id === activeCode);
    const group = glossaryGroups[term.groupIndex];
    const copy = activeCodeView === "definition" ? term.definition : learningCodes[term.id][activeCodeView];
    return `<section class="launch-panel launch-compact-panel" aria-label="Lenguaje de experiencia"><div class="launch-group-tabs" role="group" aria-label="Grupos del lenguaje de experiencia">${glossaryGroups.map((item, index) => `<button type="button" class="launch-group-tab${term.groupIndex === index ? " is-active" : ""}" data-action="launch-code-group" data-value="${index}" data-group="${index}" aria-label="${escape(item.title)}" aria-pressed="${term.groupIndex === index}">${escape(groupLabels[index])}</button>`).join("")}</div><div class="launch-code-layout"><div class="launch-code-map" data-group="${term.groupIndex}" role="group" aria-label="${escape(group.title)}">${group.terms.map(item => `<button type="button" class="launch-code-button${activeCode === item.id ? " is-active" : ""}" data-action="launch-code" data-value="${item.id}" aria-pressed="${activeCode === item.id}">${escape(item.name)}</button>`).join("")}</div><div class="launch-code-detail" data-group="${term.groupIndex}" data-code="${term.id}" data-view="${activeCodeView}"><h3 id="launch-code-detail-title" tabindex="-1">${escape(term.name)}</h3><div class="launch-code-views" role="group" aria-label="Explorar el concepto">${codeViews.map(view => `<button type="button" class="launch-code-view${activeCodeView === view.id ? " is-active" : ""}" data-action="launch-code-view" data-value="${view.id}" aria-pressed="${activeCodeView === view.id}">${escape(view.name)}</button>`).join("")}</div><p class="launch-code-copy">${escape(copy)}</p>${activeCodeView === "example" ? '<p class="launch-caption">Ejemplo ficticio de aprendizaje.</p>' : ""}</div></div><div class="launch-code-pagination"><button type="button" data-action="launch-code-prev" aria-label="Concepto anterior">← Anterior</button><span>${allTerms.indexOf(term) + 1} / 16 conceptos</span><button type="button" data-action="launch-code-next" aria-label="Concepto siguiente">Siguiente →</button></div></section>`;
  }

  function constellation() {
    const points = [[39, 86], [89, 49], [141, 90], [118, 145], [204, 68], [268, 34], [319, 102], [258, 142], [36, 235], [79, 187], [115, 267], [169, 234], [204, 285], [255, 209], [318, 258], [279, 329]];
    const patterns = [[[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [0, 3]], [[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [1, 3]]];
    const ambient = Array.from({ length: 64 }, (_, index) => `<circle class="launch-ambient-star" cx="${10 + (index * 83 + 23) % 340}" cy="${10 + (index * index * 17 + index * 31 + 53) % 340}" r="${index % 7 === 0 ? 1.1 : 0.55}" opacity="${index % 3 === 0 ? 0.48 : 0.22}"/>`).join("");
    const links = glossaryGroups.map((group, groupIndex) => `<g data-group="${groupIndex}">${patterns[groupIndex].map(([start, end]) => `<path class="launch-link${matched.has(group.terms[start].id) && matched.has(group.terms[end].id) ? " is-lit" : ""}" d="M ${points[groupIndex * 4 + start].join(" ")} L ${points[groupIndex * 4 + end].join(" ")}"/>`).join("")}</g>`).join("");
    const nodes = allTerms.map((term, index) => `<g class="launch-node${matched.has(term.id) ? " is-lit" : ""}${caseIndex === index && !matched.has(term.id) ? " is-current" : ""}" data-code="${term.id}" data-group="${term.groupIndex}" transform="translate(${points[index].join(" ")})"><title>${escape(term.name)}${matched.has(term.id) ? ": estrella encendida" : ""}</title><circle class="launch-node-halo" r="17"/><circle class="launch-node-core" r="${index % 5 === 0 ? 2.8 : index % 3 === 0 ? 2.2 : 1.7}"/></g>`).join("");
    return `<svg class="launch-constellation" viewBox="0 0 360 360" role="img" aria-label="Constelación de aprendizaje: ${matched.size} de 16 estrellas encendidas"><title>Cada concepto aplicado enciende una estrella</title><g aria-hidden="true">${ambient}</g>${links}${nodes}</svg>`;
  }

  function training() {
    const term = allTerms[caseIndex];
    const learning = learningCodes[term.id];
    const group = glossaryGroups[term.groupIndex];
    const solved = matched.has(term.id);
    const allDone = matched.size === 16;
    const order = answerOrders[(caseIndex + term.groupIndex) % answerOrders.length];
    let card;
    if (allDone) {
      card = `<div class="launch-complete"><span aria-hidden="true">✦</span><h3 id="launch-result-title" tabindex="-1">Tu constelación está encendida</h3><p class="launch-feedback launch-feedback-success" role="status" aria-live="polite">${escape(learning.why)}</p><p>Aplicaste los 16 conceptos del lenguaje de experiencia. Tu equipo de navegación está listo para la estrella principal.</p></div>`;
    } else if (showResult) {
      card = `<div class="launch-result"><p class="launch-kicker">${solved ? "✦ Estrella encendida" : "Ajusta la lectura"}</p><h3 id="launch-result-title" tabindex="-1">${escape(solved ? term.name : "Esa señal apunta a otro concepto")}</h3><p class="launch-feedback launch-feedback-${feedbackKind}" role="status" aria-live="polite" aria-atomic="true">${escape(feedback)}</p><button type="button" class="launch-signal-next" data-action="${solved ? "launch-signal-next" : "launch-signal-retry"}">${solved ? "Recibir siguiente señal →" : "Intentar de nuevo →"}</button></div>`;
    } else {
      card = `<p class="launch-kicker">Señal ${caseIndex + 1} / 16 · práctica opcional</p><p class="launch-signal-text">${escape(learning.signal)}</p><div class="launch-answer-options" role="group" aria-label="Elige el concepto que explica esta señal">${order.map(index => group.terms[index]).map(option => `<button type="button" class="launch-code-answer" data-action="launch-code-answer" data-value="${option.id}"><span>${escape(option.name)}</span><span aria-hidden="true">↗</span></button>`).join("")}</div><button type="button" class="launch-consult" data-action="launch-panel" data-value="2">Consultar lenguaje de experiencia ↗</button>`;
    }
    return `<section class="launch-panel launch-compact-panel" aria-labelledby="launch-panel-title"><h2 id="launch-panel-title" tabindex="-1">Enciende tu constelación.</h2><div class="launch-training-grid"><aside class="launch-star-board"><div class="launch-match-status"><p class="launch-kicker">Tu constelación</p><span><strong>${matched.size} / 16</strong> estrellas encendidas</span></div>${constellation()}<div class="launch-group-progress">${glossaryGroups.map((item, index) => `<div data-group="${index}"><span>${escape(groupLabels[index])}</span><strong>${item.terms.filter(code => matched.has(code.id)).length}/4</strong></div>`).join("")}</div></aside><div class="launch-signal-case" data-group="${term.groupIndex}" data-signal="${caseIndex}" data-state="${allDone ? "complete" : showResult ? "result" : "question"}">${card}</div></div></section>`;
  }

  function render() {
    const panels = [experience, strategy, glossary, training];
    const visitedContent = [0, 1, 2].filter(index => visited.has(index)).length;
    return `<article class="lesson launch-station" id="launch-station"><header class="launch-heading"><p class="launch-kicker">01 · Centro de lanzamiento</p><h1>Antes de despegar</h1></header><div class="launch-tabs" role="group" aria-label="Preparación para el despegue">${panelNames.map((name, index) => `<button type="button" class="launch-tab${panel === index ? " is-active" : ""}${visited.has(index) ? " is-visited" : ""}" data-action="launch-panel" data-value="${index}"${panel === index ? ' aria-current="step"' : ""}><span class="launch-tab-number" aria-hidden="true">${index + 1}</span><span>${escape(name)}</span></button>`).join("")}</div><div class="launch-scroll" role="region" aria-label="Contenido del centro de lanzamiento">${panels[panel]()}</div><footer class="launch-footer"><div class="launch-progress"><strong>${panel + 1} / 4 etapas</strong><span>${visitedContent}/3 esenciales exploradas${panel === 3 ? ` · ${matched.size}/16 estrellas opcionales` : ""}</span></div><div class="launch-footer-actions">${panel > 0 ? '<button type="button" class="launch-back" data-action="launch-prev">← Anterior</button>' : ""}${panel < 3 ? '<button type="button" class="launch-forward" data-action="launch-next">Continuar →</button>' : `<button type="button" class="launch-forward" data-action="go-step" data-step="estrella"${ready() ? "" : ' disabled aria-describedby="launch-ready-hint"'}>${matched.size ? "Ir a la Estrella principal" : "Omitir práctica e ir a la Estrella principal"} →</button>`}</div>${panel === 3 && !ready() ? '<p id="launch-ready-hint" class="launch-ready-hint">Explora Experiencia, Direccionamiento estratégico y Lenguaje de experiencia para continuar. La práctica es opcional.</p>' : ""}</footer></article>`;
  }

  function update(focusSelector) {
    const article = document.getElementById("launch-station");
    if (!article) return;
    article.outerHTML = render();
    const replacement = document.getElementById("launch-station");
    const target = replacement.querySelector(focusSelector || ".launch-tab.is-active");
    if (target) target.focus({ preventScroll: true });
    const live = replacement.querySelector(".launch-feedback");
    if (live) {
      const message = live.textContent;
      live.textContent = "";
      window.requestAnimationFrame(() => { if (live.isConnected) live.textContent = message; });
    }
  }

  function changePanel(next) {
    if (!Number.isInteger(next) || next < 0 || next >= panelNames.length) return;
    panel = next;
    visited.add(panel);
    update(".launch-tab.is-active");
  }

  function chooseCode(id, focusSelector) {
    if (!allTerms.some(term => term.id === id)) return;
    activeCode = id;
    activeCodeView = "definition";
    update(focusSelector || `[data-action="launch-code"][data-value="${id}"]`);
  }

  function handle(action, value) {
    if (typeof action !== "string" || !action.startsWith("launch-")) return false;
    if (action === "launch-panel") changePanel(Number(value));
    else if (action === "launch-prev") changePanel(Math.max(0, panel - 1));
    else if (action === "launch-next") changePanel(Math.min(3, panel + 1));
    else if (action === "launch-experience" && panel === 0) {
      const next = Number(value);
      if (Number.isInteger(next) && experienceSteps[next]) { activeExperience = next; update(`[data-action="launch-experience"][data-value="${next}"]`); }
    } else if (action === "launch-strategy" && panel === 1) {
      const next = Number(value);
      if (Number.isInteger(next) && strategyViews[next]) { activeStrategy = next; update(`[data-action="launch-strategy"][data-value="${next}"]`); }
    } else if (action === "launch-code-group" && panel === 2) {
      const next = Number(value);
      if (Number.isInteger(next) && glossaryGroups[next]) chooseCode(glossaryGroups[next].terms[0].id, `[data-action="launch-code-group"][data-value="${next}"]`);
    } else if (action === "launch-code" && panel === 2) {
      chooseCode(value);
    } else if (action === "launch-code-view" && panel === 2 && codeViews.some(view => view.id === value)) {
      activeCodeView = value;
      update(`[data-action="launch-code-view"][data-value="${value}"]`);
    } else if ((action === "launch-code-prev" || action === "launch-code-next") && panel === 2) {
      const next = (allTerms.findIndex(term => term.id === activeCode) + (action === "launch-code-next" ? 1 : -1) + allTerms.length) % allTerms.length;
      chooseCode(allTerms[next].id, `[data-action="${action}"]`);
    } else if (action === "launch-code-answer" && panel === 3 && !showResult) {
      const term = allTerms[caseIndex];
      const answer = glossaryGroups[term.groupIndex].terms.find(item => item.id === value);
      if (!answer || matched.has(term.id)) return true;
      selectedAnswer = value;
      showResult = true;
      if (value === term.id) {
        matched.add(term.id);
        feedback = learningCodes[term.id].why;
        feedbackKind = "success";
        update(matched.size < 16 ? '[data-action="launch-signal-next"]' : '[data-action="go-step"][data-step="estrella"]');
      } else {
        const hint = learningCodes[term.id].hint;
        feedback = `Elegiste ${answer.name}. ${hint.charAt(0).toUpperCase()}${hint.slice(1)}`;
        feedbackKind = "notice";
        update('[data-action="launch-signal-retry"]');
      }
    } else if (action === "launch-signal-retry" && panel === 3 && showResult && !matched.has(allTerms[caseIndex].id)) {
      showResult = false;
      update(`[data-action="launch-code-answer"][data-value="${selectedAnswer}"]`);
    } else if (action === "launch-signal-next" && panel === 3 && matched.has(allTerms[caseIndex].id) && caseIndex < allTerms.length - 1) {
      caseIndex += 1;
      selectedAnswer = "";
      showResult = false;
      feedback = "";
      feedbackKind = "";
      update("#launch-panel-title");
    }
    return true;
  }

  function reset() {
    panel = 0;
    visited = new Set([0]);
    activeExperience = 0;
    activeStrategy = 0;
    activeCode = "cx";
    activeCodeView = "definition";
    caseIndex = 0;
    matched = new Set();
    selectedAnswer = "";
    showResult = false;
    feedback = "";
    feedbackKind = "";
  }

  window.LaunchStation = Object.freeze({ render, handle, reset });
})();

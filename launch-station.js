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
  const kit = [
    { name: "Terminología", use: "Distingue lo que una persona siente de las acciones con las que puedes mejorar su experiencia. Un lenguaje común evita que cada área entienda algo distinto.", prompt: "Piensa: ¿resolver una solicitud y generar confianza significan lo mismo?", official: "Los conceptos que nos permiten hablar el mismo idioma." },
    { name: "Modelos y esquemas", use: "Reconoce cómo se conectan las decisiones, los equipos y los recursos. Una buena interacción necesita coordinación, incluso entre personas que no atienden al cliente.", prompt: "Ubica una tarea tuya: ¿de quién recibes información y quién depende de lo que entregas?", official: "Relacionados con la gestión de Experiencia." },
    { name: "Escucha y medición", use: "Aprende a recoger lo que viven las personas y a evaluar sus percepciones. Así puedes orientar una mejora con señales y datos, además de intuiciones.", prompt: "Antes de cambiar un trámite, ¿qué te gustaría escuchar de quien lo usa?", official: "Formas de escuchar a nuestros clientes y medir su experiencia." },
    { name: "Tu rol y participación", use: "Encuentra tu aporte: atender, diseñar una interacción o hacer posible que otros entreguen una buena experiencia. Cada empleado participa en la relación con clientes y usuarios.", prompt: "¿Qué parte de tu trabajo llega al cliente, aunque no hables directamente con él?", official: "El rol y participación de cada empleado como protagonista en la relación con nuestros clientes y usuarios." },
    { name: "Competencias y comportamientos", use: "Lleva las capacidades a acciones observables: escuchar, coordinar, explicar o buscar una solución. Son tus comportamientos los que vuelven real la experiencia.", prompt: "Elige una acción que alguien pueda ver en tu trabajo, no solo una intención.", official: "Que aportan a la gestión de Experiencia." }
  ];
  const challenges = [
    { name: "Calidad de los servicios", action: "Ante una falla, coordina la solución y explica al usuario qué puede esperar. La calidad también se vive en la respuesta que recibe.", question: "¿Cómo comprobarías que la solución realmente respondió a su necesidad?" },
    { name: "Servicios eficientes", action: "Detecta una gestión repetida y acuerda con el equipo cómo evitarla, aprovechando mejor el tiempo y los recursos.", question: "¿Qué esfuerzo le ahorrarías al usuario sin trasladarle trabajo de otra área?" },
    { name: "Cobertura universal sostenible", action: "Al pensar una alternativa de servicio, reconoce a quienes enfrentan barreras de acceso y considera su viabilidad en el tiempo.", question: "¿Quién podría quedar por fuera de la solución que estás proponiendo?" },
    { name: "Protección Hídrica y Carbono Neutralidad", action: "Al evaluar una decisión, considera sus efectos sobre el agua y las emisiones, junto con el valor que genera para las personas.", question: "¿Qué información necesitarías para comprender esos efectos antes de decidir?" },
    { name: "Generación de valor", action: "Relaciona la mejora que propones con un beneficio concreto para las personas y para la sostenibilidad de la organización.", question: "¿Qué cambiará para el usuario y cómo sabrás si ese cambio le aportó valor?" }
  ];
  const panelNames = ["Tu guía", "La experiencia", "La brújula", "Los códigos", "La práctica"];
  const answerOrders = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 2, 1, 0], [2, 0, 1, 3]];
  const allTerms = glossaryGroups.flatMap((group, groupIndex) => group.terms.map(term => ({ ...term, groupIndex })));
  let panel = 0;
  let visited = new Set([0]);
  let activeKit = 0;
  let decision = "";
  let activeChallenge = 0;
  let activeCode = "cx";
  let caseIndex = 0;
  let matched = new Set();
  let selectedAnswer = "";
  let feedback = "Lee la señal y elige el código que mejor la explica.";
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
    const selected = kit[activeKit];
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Tu primera misión: generar confianza.</h2>
      <div class="launch-briefing-grid">
        <div class="launch-feature"><p class="launch-kicker">Tu carta de navegación</p><h3>Tu trabajo también llega al cliente.</h3><p>Esta Guía te ayuda a entender lo que viven clientes y usuarios, conectar tu aporte con los demás actores del ecosistema y convertirlo en interacciones positivas y consistentes. Cuando los equipos actúan con ese rumbo compartido, pueden fortalecer la confianza y la lealtad hacia las empresas del Grupo EPM.</p><div class="launch-briefing-goals"><div><strong>Comprende</strong><span>Reconoce la necesidad y cómo se siente la persona.</span></div><div><strong>Conecta</strong><span>Coordina tu aporte con quienes hacen posible la solución.</span></div><div><strong>Actúa</strong><span>Haz visible el cuidado en una decisión o comportamiento.</span></div></div></div>
        <aside class="launch-dispatch"><p class="launch-kicker">Señal recibida · caso ficticio</p><blockquote>«Me resolvieron, pero tuve que contar lo mismo tres veces. ¿La próxima vez será igual?»</blockquote><p>La solución llegó; la confianza quedó en duda. La Guía te invita a mirar el recorrido completo y reconocer qué puedes cambiar desde tu rol.</p></aside>
      </div>
      <div class="launch-kit"><h3>Abre tu equipo de navegación</h3><div class="launch-kit-tabs" role="group" aria-label="Herramientas de la Guía">${kit.map((item, index) => `<button type="button" class="launch-kit-button${activeKit === index ? " is-active" : ""}" data-action="launch-kit" data-value="${index}" aria-pressed="${activeKit === index}"><span aria-hidden="true">0${index + 1}</span>${escape(item.name)}</button>`).join("")}</div><div class="launch-kit-detail"><h3>${escape(selected.name)}</h3><p>${escape(selected.use)}</p><p class="launch-reflection">${escape(selected.prompt)}</p></div></div>
      <details class="launch-reference"><summary>Consultar la definición de la Guía y su contenido</summary><p>Es un recorrido que te invita a comprender el mundo de la experiencia de los clientes y usuarios, en articulación con los demás actores del ecosistema y a contribuir, desde cada rol, a que las interacciones con nuestros clientes y usuarios sean positivas y consistentes para que incrementen su confianza y lealtad hacia las empresas del Grupo EPM.</p><ul>${kit.map(item => `<li><strong>${escape(item.name)}:</strong> ${escape(item.official)}</li>`).join("")}</ul><p>Tus comportamientos y acciones marcan la diferencia en la relación que establecen nuestros clientes y usuarios con las empresas del Grupo EPM.</p></details>
      ${source(4)}
    </section>`;
  }

  function experience() {
    const decisionFeedback = decision === "cerrar" ? "Cerrar confirma que hubo una solución funcional, pero deja sin atender el esfuerzo y la duda de Lucía. La experiencia también incluye el resultado emocional: cómo terminó sintiéndose." : decision === "acompanar" ? "Acompañar cuida ambos resultados: confirmar la solución atiende la necesidad funcional; reconocer el esfuerzo, explicar y coordinar puede aportar tranquilidad y confianza. La reacción real de Lucía es la que debemos escuchar." : "Elige una respuesta y observa qué aspecto de la experiencia estás cuidando.";
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">¿Resolver también es cuidar?</h2>
      <div class="launch-experience-grid"><aside class="launch-dispatch"><p class="launch-kicker">Caso ficticio · una decisión de tu misión</p><blockquote>«El cobro ya está corregido, pero tuve que contar mi caso tres veces. Me preocupa que vuelva a pasar».</blockquote><p>La necesidad de Lucía se resolvió. ¿Qué harías al terminar la interacción?</p></aside><div class="launch-decision"><h3>Elige cómo cerrarías el encuentro</h3><div class="launch-decision-options"><button type="button" class="launch-decision-option${decision === "cerrar" ? " is-selected" : ""}" data-action="launch-decision" data-value="cerrar" aria-pressed="${decision === "cerrar"}"><strong>Confirmar y cerrar</strong><span>Indicar que el cobro quedó corregido y dar por finalizada la atención.</span></button><button type="button" class="launch-decision-option${decision === "acompanar" ? " is-selected" : ""}" data-action="launch-decision" data-value="acompanar" aria-pressed="${decision === "acompanar"}"><strong>Confirmar y acompañar</strong><span>Reconocer el esfuerzo, explicar lo ocurrido y coordinar cómo evitar que repita su historia.</span></button></div><p class="launch-decision-feedback" role="status" aria-live="polite">${decisionFeedback}</p></div></div>
      <p class="launch-statement"><span>Experiencia del cliente y usuario · CX</span>Es el resultado emocional del cliente y usuario luego de relacionarse con nuestras empresas.</p>
      <div class="launch-flow" role="group" aria-label="Los valores se expresan a través de emociones para generar experiencias"><div class="launch-flow-node"><strong>Valores</strong><span>Responsabilidad: coordinar.<br>Transparencia: explicar.<br>Calidez: reconocer el esfuerzo.</span></div><div class="launch-flow-link"><span aria-hidden="true">→</span>A través de</div><div class="launch-flow-node"><strong>Emociones</strong><span>La persona puede sentir tranquilidad y confianza. Escuchar permite comprobarlo.</span></div><div class="launch-flow-link"><span aria-hidden="true">→</span>Para generar</div><div class="launch-flow-node"><strong>Experiencias</strong><span>Una relación que resuelve la necesidad y cuida cómo se vive.</span></div></div>
      <h3>Para sostenerlo, alinea tres piezas</h3><div class="launch-alignment"><div class="launch-alignment-item"><strong>Operación</strong><p>Que el siguiente equipo reciba la información del caso.</p></div><div class="launch-alignment-item"><strong>Cultura</strong><p>Que coordinar y escuchar sea una práctica compartida.</p></div><div class="launch-alignment-item"><strong>Estrategia</strong><p>Que la decisión se valore por lo que aporta al cliente.</p></div></div>
      <details class="launch-reference"><summary>Consultar la declaración de clientecentrismo</summary><p>Poner el cliente y usuario en el centro es tomar decisiones pensando en el valor que les generamos, lo cual nos exige alineación de la operación y la cultura con la estrategia, para sostener en el tiempo una forma de actuar coherente con nuestro enfoque de clientecentrismo.</p></details>
      ${source(5)}
    </section>`;
  }

  function strategy() {
    const challenge = challenges[activeChallenge];
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Dale rumbo a una decisión.</h2>
      <div class="launch-strategy-grid"><div class="launch-strategy-card" data-group="0"><p class="launch-kicker">Propósito · para qué</p><h3>Mira el efecto en la vida de las personas.</h3><p>Conecta una tarea cotidiana con el bienestar al que puede contribuir.</p><details class="launch-reference"><summary>Leer la declaración</summary><p>Contribuimos a la armonía de la vida para un mundo mejor.</p></details></div><div class="launch-strategy-card" data-group="1"><p class="launch-kicker">Identidad · cómo</p><h3>Haz que el cuidado se note.</h3><p>Asume lo que te corresponde, explica con claridad y trata a la persona con cercanía.</p><details class="launch-reference"><summary>Leer la declaración</summary><p>Servimos con responsabilidad, transparencia y calidez.</p></details></div><div class="launch-strategy-card" data-group="2"><p class="launch-kicker">Estrategia · hacia dónde</p><h3>Decide con el cliente como guía.</h3><p>Relaciona calidad, eficiencia y acceso con el desarrollo humano sostenible.</p><details class="launch-reference"><summary>Leer la declaración</summary><p>Con servicios públicos eficientes y de calidad para todos, inspirados y guiados por nuestros clientes y usuarios, promovemos el desarrollo humano sostenible.</p></details></div></div>
      <h3>Cinco retos, una estrella que orienta: el cliente y usuario</h3><div class="launch-challenge-layout"><div class="launch-challenge-list" role="group" aria-label="Retos 2035">${challenges.map((item, index) => `<button type="button" class="launch-challenge${activeChallenge === index ? " is-active" : ""}" data-action="launch-challenge" data-value="${index}" aria-pressed="${activeChallenge === index}"><span class="launch-challenge-number" aria-hidden="true">0${index + 1}</span><span>${escape(item.name)}</span></button>`).join("")}</div><div class="launch-challenge-detail"><p class="launch-kicker">De la brújula a la acción · ejemplo ilustrativo</p><h3>${escape(challenge.name)}</h3><p>${escape(challenge.action)}</p><p class="launch-reflection">${escape(challenge.question)}</p><p class="launch-caption">Considera la experiencia funcional y emocional del cliente y usuario. Estos ejemplos son ejercicios de aprendizaje, no programas o compromisos adicionales del Grupo.</p></div></div>
      <div class="launch-target"><div><p class="launch-kicker">NPS · Meta 2035, no resultado actual</p><h3>El horizonte de recomendación</h3><p>Lograr que las empresas del Grupo EPM alcancen un nivel de recomendación alto (entre 52 y 70) o muy alto (mayor a 70), según su nivel de madurez de experiencia.</p></div><div class="launch-target-levels"><span><strong>52–70</strong>Alto</span><span><strong>&gt; 70</strong>Muy alto</span></div></div>
      ${source(6)}
    </section>`;
  }

  function glossary() {
    const term = allTerms.find(item => item.id === activeCode);
    const learning = learningCodes[term.id];
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Descifra los códigos de navegación.</h2><p class="launch-panel-intro">Elige un código. Descubre para qué te sirve, reconoce un ejemplo y aprende a distinguirlo de otros.</p>
      <div class="launch-code-layout"><div class="launch-code-map">${glossaryGroups.map((group, index) => `<section class="launch-code-group" data-group="${index}"><h3><span aria-hidden="true">0${index + 1}</span> ${escape(group.title)}</h3>${group.terms.map(item => `<button type="button" class="launch-code-button${activeCode === item.id ? " is-active" : ""}" data-action="launch-code" data-value="${item.id}" aria-pressed="${activeCode === item.id}">${escape(item.name)}<span aria-hidden="true">↗</span></button>`).join("")}</section>`).join("")}</div><div class="launch-code-detail" data-group="${term.groupIndex}" data-code="${term.id}"><p class="launch-kicker">Código ${allTerms.indexOf(term) + 1} de 16 · ${escape(glossaryGroups[term.groupIndex].title)}</p><h3 id="launch-code-detail-title" tabindex="-1">${escape(term.name)}</h3><p>${escape(learning.simple)}</p><div class="launch-code-example"><h4>Así se ve · ejemplo ficticio</h4><p>${escape(learning.example)}</p></div><div class="launch-code-contrast"><h4>Para distinguirlo</h4><p>${escape(learning.contrast)}</p></div><details class="launch-reference"><summary>Consultar la definición de la Guía</summary><p>${escape(term.definition)}</p></details><button type="button" class="launch-consult launch-code-return" data-action="launch-code-map">Volver a los 16 códigos <span aria-hidden="true">↑</span></button></div></div>
      ${source(3)}
    </section>`;
  }

  function constellation() {
    const points = [[48, 54], [112, 30], [136, 101], [67, 126], [242, 47], [305, 77], [283, 139], [217, 111], [49, 235], [120, 209], [139, 285], [77, 309], [220, 239], [292, 210], [310, 287], [240, 316]];
    const links = glossaryGroups.map((group, groupIndex) => {
      const offset = groupIndex * 4;
      return `<g data-group="${groupIndex}">${[0, 1, 2, 3].map(index => {
        const next = (index + 1) % 4;
        return `<path class="launch-link${matched.has(group.terms[index].id) && matched.has(group.terms[next].id) ? " is-lit" : ""}" d="M ${points[offset + index].join(" ")} L ${points[offset + next].join(" ")}"/>`;
      }).join("")}</g>`;
    }).join("");
    const nodes = allTerms.map((term, index) => `<g class="launch-node${matched.has(term.id) ? " is-lit" : ""}${caseIndex === index && !matched.has(term.id) ? " is-current" : ""}" data-code="${term.id}" data-group="${term.groupIndex}" transform="translate(${points[index].join(" ")})"><circle class="launch-node-halo" r="17"/><circle class="launch-node-core" r="6"/><text y="31" text-anchor="middle">${String(index + 1).padStart(2, "0")}</text></g>`).join("");
    return `<svg class="launch-constellation" viewBox="0 0 360 360" role="img" aria-label="Constelación de aprendizaje: ${matched.size} de 16 estrellas encendidas"><title>Cada concepto aplicado enciende una estrella</title>${links}${nodes}</svg>`;
  }

  function training() {
    const term = allTerms[caseIndex];
    const learning = learningCodes[term.id];
    const group = glossaryGroups[term.groupIndex];
    const solved = matched.has(term.id);
    const allDone = matched.size === 16;
    const order = answerOrders[(caseIndex + term.groupIndex) % answerOrders.length];
    return `<section class="launch-panel" aria-labelledby="launch-panel-title">
      <h2 id="launch-panel-title" tabindex="-1">Enciende tu constelación.</h2><p class="launch-panel-intro">Interpreta 16 señales de situaciones cotidianas. Cada código que aplicas enciende una estrella de tu equipo de navegación.</p>
      <div class="launch-training-grid"><aside class="launch-star-board"><div class="launch-match-status"><p class="launch-kicker">Tu constelación de aprendizaje</p><span><strong>${matched.size} / 16</strong> estrellas encendidas</span></div>${constellation()}<div class="launch-group-progress">${glossaryGroups.map((item, index) => `<div data-group="${index}"><span>${escape(item.title)}</span><strong>${item.terms.filter(code => matched.has(code.id)).length}/4</strong></div>`).join("")}</div></aside>
      <div class="launch-signal-case" data-group="${term.groupIndex}" data-signal="${caseIndex}"><p class="launch-kicker">Señal ${caseIndex + 1} de 16 · caso ficticio</p><h3>${escape(group.title)}</h3><p class="launch-signal-text">${escape(learning.signal)}</p><div class="launch-answer-options" role="group" aria-label="Elige el concepto que explica esta señal">${order.map(index => group.terms[index]).map(option => `<button type="button" class="launch-code-answer${selectedAnswer === option.id ? " is-selected" : ""}${solved && option.id === term.id ? " is-correct" : ""}" data-action="launch-code-answer" data-value="${option.id}"${solved ? " disabled" : ""}><span>${escape(option.name)}</span>${solved && option.id === term.id ? '<span aria-hidden="true">✓</span>' : '<span aria-hidden="true">↗</span>'}</button>`).join("")}</div><p class="launch-feedback${feedbackKind ? ` launch-feedback-${feedbackKind}` : ""}" role="status" aria-live="polite" aria-atomic="true">${escape(feedback)}</p>${solved && !allDone ? '<button type="button" class="launch-signal-next" data-action="launch-signal-next">Recibir siguiente señal <span aria-hidden="true">→</span></button>' : ""}<button type="button" class="launch-consult" data-action="launch-panel" data-value="3">Consultar los códigos de navegación</button></div></div>
      ${allDone ? '<div class="launch-complete"><span aria-hidden="true">✦</span><div><h3>Tu constelación está encendida</h3><p>Aplicaste los 16 conceptos a situaciones concretas. Lleva estas preguntas a tu trabajo: ¿qué vive la persona, qué puedo coordinar y qué acción puede mejorar su experiencia?</p></div></div>' : ""}
      ${source(3)}
    </section>`;
  }

  function render() {
    const panels = [briefing, experience, strategy, glossary, training];
    const visitedContent = [0, 1, 2, 3].filter(index => visited.has(index)).length;
    return `<article class="lesson launch-station" id="launch-station">
      <header class="launch-heading"><p class="launch-kicker">01 · Centro de lanzamiento</p><h1>Antes de despegar, hablemos el mismo idioma.</h1></header>
      <div class="launch-tabs" role="group" aria-label="Preparación para el despegue">${panelNames.map((name, index) => `<button type="button" class="launch-tab${panel === index ? " is-active" : ""}${visited.has(index) ? " is-visited" : ""}" data-action="launch-panel" data-value="${index}"${panel === index ? ' aria-current="step"' : ""}><span class="launch-tab-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span>${escape(name)}</span></button>`).join("")}</div>
      <div class="launch-scroll" tabindex="0" role="region" aria-label="Contenido del centro de lanzamiento">${panels[panel]()}</div>
      <footer class="launch-footer"><div class="launch-progress"><strong>Preparación ${panel + 1} de 5</strong><span>${visitedContent}/4 contenidos explorados · ${matched.size}/16 códigos aplicados</span></div><div class="launch-footer-actions">${panel > 0 ? '<button type="button" class="launch-back" data-action="launch-prev"><span aria-hidden="true">←</span> Anterior</button>' : ""}${panel < 4 ? '<button type="button" class="launch-forward" data-action="launch-next">Continuar <span aria-hidden="true">→</span></button>' : `<button type="button" class="launch-forward" data-action="go-step" data-step="estrellas"${ready() ? "" : ' disabled aria-describedby="launch-ready-hint"'}>Ir a la estrella principal <span aria-hidden="true">→</span></button>`}</div>${panel === 4 && !ready() ? `<p id="launch-ready-hint" class="launch-ready-hint">${matched.size < 16 ? "Aplica los 16 códigos" : "Códigos completos"}${visitedContent < 4 ? " y explora los cuatro contenidos" : ""} para despegar.</p>` : ""}</footer>
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
    if (focusSelector === "#launch-code-detail-title" && target) {
      const detail = target.closest(".launch-code-detail");
      scroll.scrollTop += detail.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    }
    if (!panelChanged && target && scroll.contains(target)) {
      const bounds = scroll.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      if (targetBounds.bottom > bounds.bottom) scroll.scrollTop += targetBounds.bottom - bounds.bottom + 12;
      else if (targetBounds.top < bounds.top) scroll.scrollTop -= bounds.top - targetBounds.top + 12;
    }
    const live = replacement.querySelector(".launch-feedback, .launch-decision-feedback");
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
    update("#launch-panel-title", true);
  }

  function handle(action, value) {
    if (typeof action !== "string" || !action.startsWith("launch-")) return false;
    if (action === "launch-panel") changePanel(Number(value));
    else if (action === "launch-prev") changePanel(Math.max(0, panel - 1));
    else if (action === "launch-next") changePanel(Math.min(4, panel + 1));
    else if (action === "launch-kit" && panel === 0) {
      const next = Number(value);
      if (Number.isInteger(next) && kit[next]) { activeKit = next; update(`[data-action="launch-kit"][data-value="${next}"]`); }
    } else if (action === "launch-decision" && panel === 1 && ["cerrar", "acompanar"].includes(value)) {
      decision = value;
      update(`[data-action="launch-decision"][data-value="${value}"]`);
    } else if (action === "launch-challenge" && panel === 2) {
      const next = Number(value);
      if (Number.isInteger(next) && challenges[next]) { activeChallenge = next; update(`[data-action="launch-challenge"][data-value="${next}"]`); }
    } else if (action === "launch-code" && panel === 3 && allTerms.some(term => term.id === value)) {
      activeCode = value;
      update(window.matchMedia("(max-width: 700px)").matches ? "#launch-code-detail-title" : `[data-action="launch-code"][data-value="${value}"]`);
    } else if (action === "launch-code-map" && panel === 3) {
      update(`[data-action="launch-code"][data-value="${activeCode}"]`);
    } else if (action === "launch-code-answer" && panel === 4) {
      const term = allTerms[caseIndex];
      const answer = glossaryGroups[term.groupIndex].terms.find(item => item.id === value);
      if (!answer || matched.has(term.id)) return true;
      selectedAnswer = value;
      if (value === term.id) {
        matched.add(term.id);
        feedback = `Estrella encendida · ${term.name}. ${learningCodes[term.id].why}`;
        feedbackKind = "success";
        update(matched.size < 16 ? '[data-action="launch-signal-next"]' : ready() ? '[data-action="go-step"][data-step="estrellas"]' : '[data-action="launch-panel"][data-value="0"]');
      } else {
        feedback = `${answer.name}: ${learningCodes[answer.id].simple} En esta señal, ${learningCodes[term.id].hint} Inténtalo de nuevo.`;
        feedbackKind = "notice";
        update(`[data-action="launch-code-answer"][data-value="${value}"]`);
      }
    } else if (action === "launch-signal-next" && panel === 4 && matched.has(allTerms[caseIndex].id) && caseIndex < allTerms.length - 1) {
      caseIndex += 1;
      selectedAnswer = "";
      feedback = "Lee la señal y elige el código que mejor la explica.";
      feedbackKind = "";
      update("#launch-panel-title", true);
    }
    return true;
  }

  function reset() {
    panel = 0;
    visited = new Set([0]);
    activeKit = 0;
    decision = "";
    activeChallenge = 0;
    activeCode = "cx";
    caseIndex = 0;
    matched = new Set();
    selectedAnswer = "";
    feedback = "Lee la señal y elige el código que mejor la explica.";
    feedbackKind = "";
  }

  window.LaunchStation = Object.freeze({ render, handle, reset });
})();

(() => {
  "use strict";

  const SUPABASE_URL = "https://vbrezgsxbfxtfzfcmqce.supabase.co";
  const SUPABASE_KEY = "sb_publishable_mwJdpfrhPEZCxzHIrJ-7_w_jze0OPzT";
  const TOKEN_KEY = "universo-experiencia.admin-session.v1";
  const ACTIVITY_KEY = "universo-experiencia.admin-activity.v1";
  const SESSION_STARTED_KEY = "universo-experiencia.admin-started.v1";
  const POLL_INTERVAL = 8000;
  const REQUEST_TIMEOUT = 12000;
  const IDLE_LIMIT = 30 * 60 * 1000;
  const ABSOLUTE_SESSION_LIMIT = 8 * 60 * 60 * 1000;
  const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
  const NUMBER_FORMAT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

  const elements = {
    skipLink: document.querySelector("#skip-link"),
    loginView: document.querySelector("#login-view"),
    loginMain: document.querySelector("#login-main"),
    dashboardView: document.querySelector("#dashboard-view"),
    loginForm: document.querySelector("#login-form"),
    user: document.querySelector("#admin-user"),
    password: document.querySelector("#admin-password"),
    passwordToggle: document.querySelector("#password-toggle"),
    loginButton: document.querySelector("#login-button"),
    loginMessage: document.querySelector("#login-message"),
    logoutButton: document.querySelector("#logout-button"),
    refreshButton: document.querySelector("#refresh-button"),
    dashboardMain: document.querySelector("#admin-main"),
    dashboardMessage: document.querySelector("#dashboard-message"),
    liveStatus: document.querySelector("#live-status"),
    lastUpdated: document.querySelector("#last-updated"),
    funnel: document.querySelector("#funnel"),
    participantsBody: document.querySelector("#participants-body"),
    participantSearch: document.querySelector("#participant-search"),
    participantCount: document.querySelector("#participant-count"),
    searchStatus: document.querySelector("#search-status"),
    recommendations: document.querySelector("#recommendations"),
    feedbackCount: document.querySelector("#feedback-count"),
    ratingAverage: document.querySelector("#rating-average"),
    ratingSpotlight: document.querySelector("#rating-spotlight"),
    ratingStars: document.querySelector("#rating-stars"),
    ratingCount: document.querySelector("#rating-count"),
    exportParticipants: document.querySelector("#export-participants-button"),
    exportFeedback: document.querySelector("#export-feedback-button")
  };

  let panel = emptyPanel();
  let pollTimer = 0;
  let expiryTimer = 0;
  let requestInProgress = false;
  let requestController = null;
  let sessionEpoch = 0;
  let lastActivityWrite = 0;

  function emptyPanel() {
    return { resumen: {}, embudo: [], participantes: [], feedback: [] };
  }

  function sessionToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; }
    catch { return ""; }
  }

  function saveSessionToken(token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
      scheduleSessionExpiry();
      return true;
    }
    catch { return false; }
  }

  function clearSessionToken() {
    stopExpiryTimer();
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ACTIVITY_KEY);
      sessionStorage.removeItem(SESSION_STARTED_KEY);
    } catch { /* The view is still locked. */ }
  }

  function markActivity() {
    if (!sessionToken() || elements.dashboardView.hidden) return;
    const now = Date.now();
    if (now - lastActivityWrite < 1000) return;
    lastActivityWrite = now;
    try { sessionStorage.setItem(ACTIVITY_KEY, String(now)); } catch { /* Session timeout still exists server-side. */ }
    scheduleSessionExpiry();
  }

  function sessionExpiryReason() {
    try {
      const activity = Number(sessionStorage.getItem(ACTIVITY_KEY));
      const started = Number(sessionStorage.getItem(SESSION_STARTED_KEY));
      if (Number.isFinite(started) && started > 0 && Date.now() - started >= ABSOLUTE_SESSION_LIMIT) return "absolute";
      if (Number.isFinite(activity) && activity > 0 && Date.now() - activity >= IDLE_LIMIT) return "idle";
      return "";
    } catch { return ""; }
  }

  function stopExpiryTimer() {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    expiryTimer = 0;
  }

  function scheduleSessionExpiry() {
    stopExpiryTimer();
    if (!sessionToken()) return;
    try {
      const activity = Number(sessionStorage.getItem(ACTIVITY_KEY));
      const started = Number(sessionStorage.getItem(SESSION_STARTED_KEY));
      const deadlines = [];
      if (Number.isFinite(activity) && activity > 0) deadlines.push(activity + IDLE_LIMIT);
      if (Number.isFinite(started) && started > 0) deadlines.push(started + ABSOLUTE_SESSION_LIMIT);
      if (!deadlines.length) return;
      const delay = Math.max(0, Math.min(...deadlines) - Date.now() + 25);
      expiryTimer = window.setTimeout(() => {
        const reason = sessionExpiryReason();
        if (reason) {
          logout({
            message: reason === "idle"
              ? "La sesión se cerró por inactividad. Ingresa nuevamente."
              : "La sesión alcanzó su tiempo máximo. Ingresa nuevamente.",
            success: false
          });
        } else {
          scheduleSessionExpiry();
        }
      }, delay);
    } catch { /* The server remains the final authority over expiration. */ }
  }

  async function callRpc(name, parameters, signal) {
    const controller = new AbortController();
    let timedOut = false;
    const relayAbort = () => controller.abort();
    if (signal?.aborted) relayAbort();
    else signal?.addEventListener("abort", relayAbort, { once: true });
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT);
    let response;
    let text;
    try {
      response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parameters),
        cache: "no-store",
        signal: controller.signal
      });
      text = await response.text();
    } catch (error) {
      if (error?.name === "AbortError" && signal?.aborted) throw error;
      if (timedOut) {
        const timeoutError = new Error("La solicitud tardó demasiado.");
        timeoutError.code = "REQUEST_TIMEOUT";
        throw timeoutError;
      }
      const connectionError = new Error("No fue posible conectar con el servicio.");
      connectionError.code = "NETWORK_ERROR";
      throw connectionError;
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", relayAbort);
    }
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); }
      catch { payload = text; }
    }
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.hint || "La solicitud no pudo completarse.");
      error.code = payload?.code || "HTTP_ERROR";
      error.details = payload?.details || "";
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function parseJson(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed || !/^[\[{]/.test(trimmed)) return value;
    try { return JSON.parse(trimmed); } catch { return value; }
  }

  function unwrapRpc(data, functionName) {
    let value = parseJson(data);
    if (Array.isArray(value) && value.length === 1) value = parseJson(value[0]);
    if (value && typeof value === "object" && functionName in value) value = parseJson(value[functionName]);
    if (value && typeof value === "object" && "result" in value) value = parseJson(value.result);
    if (value && typeof value === "object" && "panel" in value) value = parseJson(value.panel);
    return value;
  }

  function getLoginToken(data) {
    const value = unwrapRpc(data, "universo_admin_ingresar");
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    return String(value.token || value.p_token || value.session_token || value.access_token || "");
  }

  function normalizePanel(data) {
    const value = unwrapRpc(data, "universo_admin_panel");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("El panel recibió una respuesta no válida.");
    return {
      resumen: value.resumen && typeof value.resumen === "object" ? value.resumen : {},
      embudo: Array.isArray(value.embudo) ? value.embudo : [],
      participantes: Array.isArray(value.participantes) ? value.participantes : [],
      feedback: Array.isArray(value.feedback) ? value.feedback : []
    };
  }

  function showLogin(message = "") {
    stopPolling();
    elements.dashboardView.hidden = true;
    elements.loginView.hidden = false;
    elements.skipLink.href = "#login-main";
    setLoginMessage(message);
    document.title = "Administración · Universo de la Experiencia";
    window.requestAnimationFrame(() => (message ? elements.user : elements.loginMain).focus());
  }

  function showDashboard() {
    elements.loginView.hidden = true;
    elements.dashboardView.hidden = false;
    elements.skipLink.href = "#admin-main";
    setLoginMessage("");
    document.title = "Centro de control · Universo de la Experiencia";
    scheduleSessionExpiry();
    window.requestAnimationFrame(() => elements.dashboardMain.focus({ preventScroll: true }));
  }

  function setLoginMessage(message, success = false) {
    elements.loginMessage.textContent = message;
    elements.loginMessage.classList.toggle("success", success);
  }

  function setDashboardMessage(message, success = false) {
    elements.dashboardMessage.textContent = message;
    elements.dashboardMessage.classList.toggle("success", success);
  }

  function setLiveState(state, detail) {
    elements.liveStatus.classList.toggle("is-live", state === "live");
    elements.liveStatus.classList.toggle("has-error", state === "error");
    const heading = elements.liveStatus.querySelector("strong");
    heading.textContent = state === "live" ? "Datos actualizados" : state === "error" ? "Sin conexión" : "Actualizando";
    if (detail) elements.lastUpdated.textContent = detail;
  }

  function setLoading(button, isLoading) {
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
  }

  function isAuthError(error) {
    const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.toLocaleLowerCase("es");
    return error?.status === 401 || error?.status === 403 || /sesión|sesion|token|no autoriz|unauthor|forbidden|credencial/.test(text);
  }

  async function login(event) {
    event.preventDefault();
    const username = elements.user.value.trim();
    const password = elements.password.value;
    if (!username || !password) {
      setLoginMessage("Ingresa el usuario y la contraseña.");
      (!username ? elements.user : elements.password).focus();
      return;
    }
    setLoading(elements.loginButton, true);
    setLoginMessage("Validando credenciales…", true);
    elements.password.value = "";
    try {
      const data = await callRpc("universo_admin_ingresar", { p_usuario: username, p_clave: password });
      const token = getLoginToken(data);
      if (!token) throw new Error("Credenciales no válidas.");
      if (!saveSessionToken(token)) throw new Error("El navegador no permitió abrir una sesión segura.");
      showDashboard();
      await refreshPanel({ initial: true });
    } catch (error) {
      clearSessionToken();
      setLoginMessage(["NETWORK_ERROR", "REQUEST_TIMEOUT"].includes(error?.code)
        ? "No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo."
        : "Usuario o contraseña incorrectos.");
      elements.password.focus();
    } finally {
      setLoading(elements.loginButton, false);
    }
  }

  function clearAdministrativeState(message, success) {
    const token = sessionToken();
    sessionEpoch += 1;
    requestController?.abort();
    requestController = null;
    requestInProgress = false;
    clearSessionToken();
    panel = emptyPanel();
    elements.participantSearch.value = "";
    elements.searchStatus.textContent = "";
    renderPanel();
    showLogin(message);
    setLoginMessage(message, success);
    return token;
  }

  async function logout({ message = "La sesión se cerró correctamente.", success = true, revoke = true } = {}) {
    setLoading(elements.logoutButton, true);
    const token = clearAdministrativeState(message, success);
    if (revoke && token) {
      try { await callRpc("universo_admin_salir", { p_token: token }); }
      catch { /* Local logout always wins, even when the network is unavailable. */ }
    }
    setLoading(elements.logoutButton, false);
  }

  function schedulePolling() {
    stopPolling();
    if (elements.dashboardView.hidden || document.hidden || !navigator.onLine || !sessionToken()) return;
    pollTimer = window.setTimeout(() => refreshPanel(), POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = 0;
  }

  async function refreshPanel({ initial = false } = {}) {
    const token = sessionToken();
    if (!token) return clearAdministrativeState("Ingresa para consultar el centro de control.", false);
    const expiryReason = sessionExpiryReason();
    if (expiryReason) return logout({
      message: expiryReason === "idle"
        ? "La sesión se cerró por inactividad. Ingresa nuevamente."
        : "La sesión alcanzó su tiempo máximo. Ingresa nuevamente.",
      success: false
    });
    if (requestInProgress) return;

    requestInProgress = true;
    const epoch = sessionEpoch;
    requestController = new AbortController();
    stopPolling();
    elements.refreshButton.classList.add("is-loading");
    setLoading(elements.refreshButton, true);
    setLiveState("loading", initial ? "Consultando las primeras señales" : "Sincronizando información");
    try {
      const data = await callRpc("universo_admin_panel", { p_token: token }, requestController.signal);
      if (epoch !== sessionEpoch || token !== sessionToken()) return;
      panel = normalizePanel(data);
      renderPanel();
      const now = DATE_FORMAT.format(new Date());
      setLiveState("live", `Última actualización: ${now}`);
      setDashboardMessage("");
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (isAuthError(error)) {
        clearAdministrativeState("Tu sesión venció. Ingresa nuevamente.", false);
        return;
      }
      setLiveState("error", "No se pudo actualizar; reintentaremos automáticamente");
      setDashboardMessage("La conexión se interrumpió. Los últimos datos disponibles permanecen visibles.");
    } finally {
      requestInProgress = false;
      requestController = null;
      elements.refreshButton.classList.remove("is-loading");
      setLoading(elements.refreshButton, false);
      schedulePolling();
    }
  }

  function renderPanel() {
    renderKpis();
    renderFunnel();
    renderParticipants();
    renderFeedback();
    elements.exportParticipants.disabled = panel.participantes.length === 0;
    elements.exportFeedback.disabled = panel.feedback.length === 0;
  }

  function numeric(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function renderKpis() {
    document.querySelectorAll("[data-kpi]").forEach((element) => {
      const key = element.dataset.kpi;
      const value = numeric(panel.resumen[key]);
      const decimals = Number(element.dataset.decimals || 0);
      element.textContent = `${value.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${element.dataset.suffix || ""}`;
    });
    const rating = numeric(panel.resumen.calificacion_promedio);
    const count = numeric(panel.resumen.evaluaciones);
    elements.ratingAverage.textContent = count ? rating.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
    elements.ratingStars.textContent = ratingStars(rating);
    elements.ratingSpotlight.setAttribute("aria-label", count
      ? `Calificación promedio: ${NUMBER_FORMAT.format(rating)} de 5 estrellas, basada en ${NUMBER_FORMAT.format(count)} ${count === 1 ? "evaluación" : "evaluaciones"}`
      : "Sin calificación y sin evaluaciones recibidas");
    elements.ratingCount.textContent = count === 1 ? "1 evaluación recibida" : `${NUMBER_FORMAT.format(count)} evaluaciones recibidas`;
  }

  function ratingStars(value) {
    const rounded = Math.max(0, Math.min(5, Math.round(numeric(value))));
    return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
  }

  function renderFunnel() {
    elements.funnel.replaceChildren();
    if (!panel.embudo.length) {
      elements.funnel.append(emptyMessage("Aún no hay recorridos para mostrar."));
      return;
    }
    const maximum = Math.max(1, ...panel.embudo.map((item) => numeric(item.total)));
    panel.embudo.forEach((item, index) => {
      const total = Math.max(0, numeric(item.total));
      const row = create("div", "funnel-row");
      const label = create("span", "funnel-label", item.etiqueta || item.paso || `Momento ${index + 1}`);
      const track = create("div", "funnel-track");
      const bar = create("div", "funnel-bar");
      bar.style.width = `${Math.max(0, Math.min(100, (total / maximum) * 100))}%`;
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", `${label.textContent}: ${NUMBER_FORMAT.format(total)} personas`);
      track.append(bar);
      row.append(label, track, create("strong", "funnel-total", NUMBER_FORMAT.format(total)));
      elements.funnel.append(row);
    });
  }

  function searchableText(participant) {
    return [participant.nombre, participant.correo, participant.paso, participant.planeta, participant.rol]
      .map((value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es"))
      .join(" ");
  }

  function filteredParticipants() {
    const query = elements.participantSearch.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    return query ? panel.participantes.filter((participant) => searchableText(participant).includes(query)) : panel.participantes;
  }

  function renderParticipants({ announce = false } = {}) {
    const participants = filteredParticipants();
    elements.participantsBody.replaceChildren();
    elements.participantCount.textContent = participants.length === panel.participantes.length
      ? `${participants.length} ${participants.length === 1 ? "participante" : "participantes"}`
      : `${participants.length} de ${panel.participantes.length} participantes`;
    if (announce) elements.searchStatus.textContent = elements.participantCount.textContent;

    if (!participants.length) {
      const row = create("tr", "table-empty");
      const cell = create("td", "", panel.participantes.length ? "No encontramos coincidencias." : "Aún no hay participantes registrados.");
      cell.colSpan = 7;
      row.append(cell);
      elements.participantsBody.append(row);
      return;
    }

    participants.forEach((participant) => {
      const row = document.createElement("tr");
      const person = create("td");
      const personContent = create("div", "person-cell");
      personContent.append(create("strong", "", valueOrDash(participant.nombre)), create("small", "", valueOrDash(participant.correo)));
      person.append(personContent);
      row.append(person, create("td", "", valueOrDash(participant.paso)));

      const progressCell = create("td");
      const progressWrap = create("div", "progress-cell");
      const progress = document.createElement("progress");
      const percentage = Math.max(0, Math.min(100, numeric(participant.avance_porcentaje)));
      progress.max = 100;
      progress.value = percentage;
      progress.setAttribute("aria-label", `Avance de ${valueOrDash(participant.nombre)}: ${NUMBER_FORMAT.format(percentage)} por ciento`);
      progressWrap.append(progress, create("span", "", `${NUMBER_FORMAT.format(percentage)}%`));
      progressCell.append(progressWrap);
      row.append(progressCell, create("td", "", valueOrDash(participant.planeta)), create("td", "", valueOrDash(participant.rol)), create("td", "", formatDate(participant.last_seen_at)));

      const statusCell = create("td");
      statusCell.append(create("span", `status-pill${participant.completed_at ? " completed" : ""}`, participant.completed_at ? "Completado" : "En curso"));
      row.append(statusCell);
      elements.participantsBody.append(row);
    });
  }

  function renderFeedback() {
    elements.recommendations.replaceChildren();
    const feedback = panel.feedback;
    elements.feedbackCount.textContent = `${feedback.length} ${feedback.length === 1 ? "señal" : "señales"}`;
    if (!feedback.length) {
      elements.recommendations.append(emptyMessage("Las recomendaciones aparecerán aquí cuando las personas evalúen la experiencia."));
      return;
    }

    feedback.forEach((item) => {
      const card = create("article", "recommendation-card");
      const header = document.createElement("header");
      const stars = create("span", "", ratingStars(item.calificacion));
      stars.setAttribute("role", "img");
      stars.setAttribute("aria-label", `${NUMBER_FORMAT.format(numeric(item.calificacion))} de 5 estrellas`);
      header.append(create("h3", "", valueOrDash(item.nombre)), stars);
      const recommendation = String(item.recomendacion || "").trim() || "La persona dejó su calificación sin una recomendación escrita.";
      const footer = document.createElement("footer");
      footer.append(create("span", "", valueOrDash(item.correo)), create("time", "", formatDate(item.updated_at)));
      card.append(header, create("p", "", recommendation), footer);
      elements.recommendations.append(card);
    });
  }

  function create(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function emptyMessage(text) {
    return create("p", "empty-state", text);
  }

  function valueOrDash(value) {
    const text = String(value ?? "").trim();
    return text || "—";
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
  }

  function csvCell(value) {
    let text = String(value ?? "").replace(/\r\n?/g, "\n");
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv(filename, columns, rows) {
    const content = [columns.map((column) => csvCell(column.label)).join(",")]
      .concat(rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(",")))
      .join("\r\n");
    const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportParticipants() {
    const columns = [
      { label: "Nombre completo", value: (row) => row.nombre },
      { label: "Correo electrónico", value: (row) => row.correo },
      { label: "Momento actual", value: (row) => row.paso },
      { label: "Avance (%)", value: (row) => numeric(row.avance_porcentaje) },
      { label: "Planeta", value: (row) => row.planeta },
      { label: "Rol", value: (row) => row.rol },
      { label: "Fecha de registro", value: (row) => row.created_at },
      { label: "Último ingreso", value: (row) => row.last_seen_at },
      { label: "Fecha de finalización", value: (row) => row.completed_at }
    ];
    exportCsv("reporte-participantes-universo", columns, filteredParticipants());
  }

  function exportFeedback() {
    const columns = [
      { label: "Nombre completo", value: (row) => row.nombre },
      { label: "Correo electrónico", value: (row) => row.correo },
      { label: "Calificación", value: (row) => numeric(row.calificacion) },
      { label: "Recomendación", value: (row) => row.recomendacion },
      { label: "Fecha de actualización", value: (row) => row.updated_at }
    ];
    exportCsv("reporte-evaluaciones-universo", columns, panel.feedback);
  }

  function togglePassword() {
    const show = elements.password.type === "password";
    elements.password.type = show ? "text" : "password";
    elements.passwordToggle.textContent = show ? "Ocultar" : "Mostrar";
    elements.passwordToggle.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    elements.passwordToggle.setAttribute("aria-pressed", String(show));
    elements.password.focus({ preventScroll: true });
  }

  elements.loginForm.addEventListener("submit", login);
  elements.passwordToggle.addEventListener("click", togglePassword);
  elements.logoutButton.addEventListener("click", () => logout());
  elements.refreshButton.addEventListener("click", () => refreshPanel());
  elements.participantSearch.addEventListener("input", () => renderParticipants({ announce: true }));
  elements.exportParticipants.addEventListener("click", exportParticipants);
  elements.exportFeedback.addEventListener("click", exportFeedback);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPolling();
    else if (!elements.dashboardView.hidden) refreshPanel();
  });
  window.addEventListener("online", () => { if (!elements.dashboardView.hidden) refreshPanel(); });
  window.addEventListener("offline", () => { stopPolling(); setLiveState("error", "Sin conexión a internet"); });
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => document.addEventListener(eventName, markActivity, { passive: true }));
  elements.loginButton.disabled = false;

  if (sessionToken()) {
    try {
      const now = String(Date.now());
      if (!sessionStorage.getItem(ACTIVITY_KEY)) sessionStorage.setItem(ACTIVITY_KEY, now);
      if (!sessionStorage.getItem(SESSION_STARTED_KEY)) sessionStorage.setItem(SESSION_STARTED_KEY, now);
    } catch { /* The server still validates the token. */ }
    showDashboard();
    refreshPanel({ initial: true });
  } else {
    showLogin();
  }
})();

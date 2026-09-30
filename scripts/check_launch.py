"""Exercise the launch lesson in Edge with isolated in-memory participant data.

Uses the real index, app, station module and styles. Only the map renderer is
disabled in this focused test; check_scene.py owns the universe visual checks.
All participant RPCs are intercepted by its local fixture. No production data
or browser profile is used. Screenshots/reports stay in a temporary directory.
"""

import argparse
import base64
import functools
import http.server
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request

from check_scene import CDP, INTEGRATION_STUB, ROOT, stop_edge_profile_processes


BOOT = """<script>
window.__launchErrors=[];
window.addEventListener('error',event=>window.__launchErrors.push(event.message));
window.addEventListener('unhandledrejection',event=>window.__launchErrors.push(String(event.reason)));
window.initClientOrbitalScene=()=>{};
window.destroyClientOrbitalScene=()=>{};
</script>"""

SCENARIO_ROUNDS = [
    ["cx", "clientecentrismo", "conocimiento", "promesa"],
    ["arquitectura", "modelo", "diseno", "eficiencias"],
    ["escucha", "medicion", "indicadores", "mejora"],
    ["ecosistema", "ex", "viaje", "comunicacion"],
]
GLOSSARY_TERMS = [
    "Experiencia del cliente (CX)", "Clientecentrismo", "Conocimiento", "Promesa de Experiencia",
    "Arquitectura Empresarial", "Modelo de Gestión de Experiencia", "Diseño de Experiencia", "Eficiencias",
    "Ecosistema de escucha", "Medición de la Experiencia", "Indicadores de Experiencia", "Mejora continua",
    "Ecosistema de Experiencia", "Experiencia del empleado (EX)", "Viaje del empleado", "Comunicación",
]
STRATEGY_CHALLENGES = [
    "Calidad de los servicios", "Servicios eficientes", "Cobertura universal sostenible",
    "Protección Hídrica y Carbono Neutralidad", "Generación de valor",
]
GLOSSARY_DEFINITION_PARTS = [
    ["resultado emocional", "interacción"],
    ["decisiones", "valor", "clientes y usuarios"],
    ["necesidades", "expectativas", "fricciones", "personalizar"],
    ["compromiso explícito", "sientan", "valor", "interacción"],
    ["capacidades organizacionales", "procesos", "personas", "información", "organización", "cultura", "tecnología"],
    ["estructurado", "consistente", "medible", "sostenible", "diseñar", "ejecutar", "evaluar", "mejorar"],
    ["creación intencional", "interacciones", "simplifican", "valor"],
    ["simplificación", "optimización", "reducción de fricciones"],
    ["mecanismos", "instrumentos", "percepción", "necesidades", "expectativas"],
    ["evaluación estructurada", "percepciones", "vivencias"],
    ["métricas", "visible", "gestionable"],
    ["evolución permanente", "mediciones", "datos", "retroalimentación"],
    ["clientes y usuarios", "empleados", "proveedores", "contratistas", "dueño", "comunidad", "marca", "reputación"],
    ["perciben", "viven", "sienten", "organización"],
    ["etapas", "interacciones", "empleado", "organización"],
    ["interacciones", "conectan", "orientan", "fortalecen"],
]


def wait_for(cdp, expression, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if cdp.evaluate(expression):
            return
        time.sleep(.05)
    raise AssertionError(f"Timed out waiting for: {expression}")


def click(cdp, selector):
    cdp.evaluate("""(selector=>{
      const node=document.querySelector(selector);
      if(!node||node.disabled)throw Error('Unavailable control: '+selector);
      if(!node.getClientRects().length)throw Error('Hidden control: '+selector);
      node.focus({preventScroll:true});node.click();
    })(""" + json.dumps(selector) + ")")
    cdp.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))")


def press(cdp, key, code, virtual_key):
    down = {"type": "keyDown", "key": key, "code": code,
            "windowsVirtualKeyCode": virtual_key, "nativeVirtualKeyCode": virtual_key}
    # Chromium synthesizes Enter's activating keypress from its carriage-return
    # text. Omitting text sends an incomplete physical-key sequence to CDP.
    if key == "Enter":
        down.update(text="\r", unmodifiedText="\r")
    cdp.call("Input.dispatchKeyEvent", down)
    cdp.call("Input.dispatchKeyEvent", {"type": "keyUp", "key": key, "code": code,
             "windowsVirtualKeyCode": virtual_key, "nativeVirtualKeyCode": virtual_key})
    cdp.evaluate("new Promise(resolve=>setTimeout(resolve,180))")


def screenshot(cdp, artifacts, name, enabled):
    if enabled:
        result = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        (artifacts / f"{name}.png").write_bytes(base64.b64decode(result["data"]))


def check_layout(cdp):
    return cdp.evaluate("""(()=>{
      const root=document.querySelector('.launch-station');
      if(!root)throw Error('Launch station missing');
      const stage=root.querySelector('.launch-stage,.launch-scroll'),tolerance=2;
      const box=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
      const outside=(r,b,x=true,y=true)=>(x&&(r.left<b.left-tolerance||r.right>b.right+tolerance))||(y&&(r.top<b.top-tolerance||r.bottom>b.bottom+tolerance));
      const visible=node=>{
        if(!node.getClientRects().length||node.closest('[hidden],.sr-only,.visually-hidden'))return false;
        for(let parent=node;parent;parent=parent.parentElement){
          const style=getComputedStyle(parent);
          if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
        }
        return true;
      };
      const label=node=>node.id||node.className||node.tagName;
      const errors=[],overflow=[];let textFragments=0,controls=0;
      const rootRect=root.getBoundingClientRect(),viewport={left:0,top:0,right:innerWidth,bottom:innerHeight};
      if(outside(rootRect,viewport))errors.push({kind:'root-outside-viewport',rect:box(rootRect)});
      function checkRect(rect,node,kind,text){
        if(!rect.width||!rect.height)return;
        const bounds=stage&&stage.contains(node)?stage.getBoundingClientRect():rootRect;
        if(outside(rect,bounds))errors.push({kind:kind+'-outside-area',node:label(node),text,rect:box(rect),bounds:box(bounds)});
        if(outside(rect,viewport))errors.push({kind:kind+'-outside-viewport',node:label(node),text,rect:box(rect)});
        for(let parent=node;parent&&parent!==document.documentElement;parent=parent.parentElement){
          const style=getComputedStyle(parent),x=/hidden|clip|auto|scroll/.test(style.overflowX),y=/hidden|clip|auto|scroll/.test(style.overflowY);
          if((x||y)&&outside(rect,parent.getBoundingClientRect(),x,y)){
            errors.push({kind:kind+'-ancestor-clips',node:label(node),text,ancestor:label(parent),rect:box(rect),bounds:box(parent.getBoundingClientRect())});break;
          }
        }
      }
      for(const node of [root,...root.querySelectorAll('*')]){
        if(!visible(node)||node instanceof SVGElement)continue;
        const style=getComputedStyle(node);
        if(node.clientHeight>0&&style.display!=='inline'&&(node.scrollHeight>node.clientHeight+tolerance||((node===root||node===stage)&&node.scrollWidth>node.clientWidth+tolerance)))
          overflow.push({node:label(node),client:[node.clientWidth,node.clientHeight],scroll:[node.scrollWidth,node.scrollHeight],overflow:[style.overflowX,style.overflowY]});
      }
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const text=walker.currentNode,parent=text.parentElement;
        if(!text.textContent.trim()||!visible(parent))continue;
        const range=document.createRange();range.selectNodeContents(text);
        for(const rect of range.getClientRects()){textFragments++;checkRect(rect,parent,'text',text.textContent.trim().slice(0,85));}
      }
      for(const node of root.querySelectorAll('button,input,select,textarea,summary,[tabindex]')){
        if(!visible(node))continue;controls++;checkRect(node.getBoundingClientRect(),node,'control',node.innerText.slice(0,80));
      }
      const bodyOverflow={horizontal:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+tolerance,
        vertical:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)>innerHeight+tolerance};
      const focus=document.activeElement,focusRect=focus.getBoundingClientRect();
      return {viewport:{width:innerWidth,height:innerHeight},root:box(rootRect),stage:stage?box(stage.getBoundingClientRect()):null,
        textFragments,controls,overflow,errors,bodyOverflow,focus:{tag:focus.tagName,id:focus.id,action:focus.dataset.action,value:focus.dataset.value,
        visible:root.contains(focus)&&visible(focus)&&!outside(focusRect,rootRect)&&!outside(focusRect,viewport)},
        wordCount:(root.querySelector('.launch-panel')?.innerText||'').trim().split(/\\s+/).filter(Boolean).length};
    })()""")


def require_content(text, expected, context):
    missing = [item for item in expected if item.casefold() not in text.casefold()]
    assert not missing, f"{context} is missing required content: {missing}"


def check_content(cdp, panel, record, capture):
    """Explore every visible subview through its public controls, without scroll."""
    texts = []
    def state(name, official=False, photo=False):
        texts.append(cdp.evaluate("document.querySelector('.launch-panel').innerText"))
        record(name, panel, official)
        if photo:
            capture(name)

    if panel == 0:
        for index in range(3):
            click(cdp, f'[data-action="launch-experience"][data-value="{index}"]')
            state(f"experience-{index}", photo=index == 0)
        expected = ["La experiencia es el resultado de", "Valores", "A través de", "Emociones", "para generar", "Experiencias"]
        assert "Clientecentrismo:" not in "\n".join(texts), "The removed clientecentrism definition returned"
    elif panel == 1:
        for index in range(5):
            click(cdp, f'[data-action="launch-strategy"][data-value="{index}"]')
            assert cdp.evaluate("document.querySelector('.launch-strategy-detail').dataset.view") == str(index)
            state(f"strategy-{index}", photo=index in (0, 3, 4))
        expected = ["Propósito", "Identidad", "Estrategia", "2035", "armonía de la vida",
                    "responsabilidad, transparencia y calidez", "desarrollo humano sostenible",
                    "madurez", *STRATEGY_CHALLENGES]
        combined = "\n".join(texts)
        assert not any(question in combined for question in ("¿Para qué viajamos?", "¿Cómo servimos?", "¿Hacia dónde avanzamos?")), "Direction categories still use questions"
        assert "52–70" in combined or "entre 52 y 70" in combined, "The high NPS range is missing"
        assert "> 70" in combined or "mayor a 70" in combined, "The very-high NPS threshold is missing"
    elif panel == 2:
        for group_index, group in enumerate(SCENARIO_ROUNDS):
            click(cdp, f'[data-action="launch-code-group"][data-value="{group_index}"]')
            state(f"codes-group-{group_index}")
            for offset, concept in enumerate(group):
                index = group_index * 4 + offset
                if cdp.evaluate("innerWidth<=700"):
                    if offset:
                        click(cdp, '[data-action="launch-code-next"]')
                else:
                    click(cdp, f'[data-action="launch-code"][data-value="{concept}"]')
                assert cdp.evaluate("document.querySelector('.launch-code-detail').dataset.code") == concept
                assert cdp.evaluate("document.querySelector('.launch-code-button.is-active').dataset.value") == concept
                for view in ("definition", "example", "contrast"):
                    click(cdp, f'[data-action="launch-code-view"][data-value="{view}"]')
                    state(f"code-{concept}-{view}", photo=(concept in ("cx", "arquitectura", "ecosistema") and view == "definition"))
                    assert cdp.evaluate("document.querySelector('.launch-code-view.is-active').dataset.value") == view
                    detail = cdp.evaluate("document.querySelector('.launch-code-detail').innerText")
                    assert GLOSSARY_TERMS[index] in detail, f"Selected {concept} has the wrong heading"
                    if view == "definition":
                        require_content(detail, GLOSSARY_DEFINITION_PARTS[index], f"Official {concept} definition")
        click(cdp, '[data-action="launch-code-next"]')
        assert cdp.evaluate("document.querySelector('.launch-code-detail').dataset.code") == "cx", "Next code does not wrap across all 16 concepts"
        state("codes-next-wrap")
        click(cdp, '[data-action="launch-code-prev"]')
        assert cdp.evaluate("document.querySelector('.launch-code-detail').dataset.code") == "comunicacion", "Previous code does not wrap"
        state("codes-prev-wrap")
        expected = GLOSSARY_TERMS
    else:
        return
    require_content("\n".join(texts), expected, f"Panel {panel}")


def check_scenarios(cdp, record, capture):
    """Solve all 16 cases; exercise error, retry and success layouts for each."""
    result = {"signals": []}
    advance = '[data-action="go-step"][data-step="estrella"]'
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "Optional practice still blocks launch"
    assert "Omitir práctica" in cdp.evaluate("document.querySelector(" + json.dumps(advance) + ").innerText"), "Optional practice is not clearly identified"
    concepts = [concept for group in SCENARIO_ROUNDS for concept in group]
    for index, concept in enumerate(concepts):
        assert cdp.evaluate("document.querySelector('.launch-signal-case').dataset.signal") == str(index)
        assert cdp.evaluate("document.querySelector('.launch-signal-case').dataset.state") == "question"
        record(f"signal-{index}-question", 3)
        if index == 0:
            capture("practice-question")
        group = SCENARIO_ROUNDS[index // 4]
        wrong = next(item for item in group if item != concept)
        click(cdp, f'[data-action="launch-code-answer"][data-value="{wrong}"]')
        error = cdp.evaluate("({text:document.querySelector('.launch-feedback')?.innerText||'',completed:document.querySelectorAll('.launch-node.is-lit').length,live:document.querySelector('.launch-feedback')?.getAttribute('aria-live'),state:document.querySelector('.launch-signal-case').dataset.state})")
        assert error["text"] and error["completed"] == index and error["live"] == "polite", "Wrong answer incorrectly credits progress or lacks accessible feedback"
        assert error["state"] == "result", "Wrong-answer explanation did not replace the case"
        record(f"signal-{index}-wrong", 3)
        if index == 0:
            capture("practice-wrong")
        click(cdp, '[data-action="launch-signal-retry"]')
        record(f"signal-{index}-retry", 3)
        assert cdp.evaluate("document.querySelector('.launch-signal-case').dataset.state") == "question", "Retry failed to restore the case"
        click(cdp, f'[data-action="launch-code-answer"][data-value="{concept}"]')
        success = cdp.evaluate("({completed:document.querySelectorAll('.launch-node.is-lit').length,feedback:document.querySelector('.launch-feedback')?.innerText,state:document.querySelector('.launch-signal-case').dataset.state})")
        assert success["completed"] == index + 1 and success["feedback"], f"Scenario {index + 1} lacks credited progress/explanation"
        assert success["state"] in ("result", "complete"), "Success explanation did not replace the case"
        record(f"signal-{index}-correct", 3)
        if index in (0, 4, 12, 15):
            capture(f"practice-correct-{index}")
        result["signals"].append({"concept": concept, "wrong": error["text"], "success": success["feedback"]})
        if index == 0:
            click(cdp, '[data-action="launch-panel"][data-value="0"]')
            record("progress-detour", 0)
            click(cdp, '[data-action="launch-panel"][data-value="3"]')
            record("progress-return", 3)
            assert cdp.evaluate("document.querySelectorAll('.launch-node.is-lit').length") == 1, "Progress was lost while consulting content"
            assert cdp.evaluate("document.querySelector('.launch-signal-case').dataset.signal") == "0", "Consulting content changed the current case"
            result["retainedProgress"] = True
        if index < len(concepts) - 1:
            assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "Optional practice became mandatory"
            click(cdp, '[data-action="launch-signal-next"]')
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "Completing practice disabled launch"
    cdp.evaluate("document.querySelector('[data-action=launch-prev]').focus({preventScroll:true})")
    press(cdp, "Enter", "Enter", 13)
    assert cdp.evaluate("Boolean(document.querySelector('.launch-code-detail'))"), "Keyboard previous-panel control failed"
    record("keyboard-previous", 2)
    cdp.evaluate("document.querySelector('[data-action=launch-next]').focus({preventScroll:true})")
    press(cdp, "Enter", "Enter", 13)
    assert cdp.evaluate("document.activeElement.classList.contains('launch-tab')&&document.activeElement.classList.contains('is-active')"), "Keyboard next-panel control lost focus"
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "Panel navigation lost completed progress"
    record("keyboard-next", 3)
    result["keyboardNavigation"] = True
    return result


def run_checks(cdp, artifacts, screenshots):
    result = {"viewports": [], "layoutErrors": []}
    wait_for(cdp, "Boolean(document.querySelector('.orbital-realm-view'))")
    cdp.evaluate("goStep('lanzamiento')")
    wait_for(cdp, "Boolean(document.querySelector('.launch-station'))")
    cdp.evaluate("flushPending()")
    initial_writes = cdp.evaluate("window.__fixtureWrites.filter(item=>item.name==='universo_guardar_viaje').length")
    for width, height in ((1440, 900), (1366, 768), (1280, 720), (390, 844), (360, 740)):
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height,
                 "deviceScaleFactor": 1, "mobile": False})
        cdp.evaluate("window.LaunchStation.reset();render()")
        wait_for(cdp, "Boolean(document.querySelector('.launch-station'))")
        cdp.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))")
        viewport = {"width": width, "height": height, "states": []}
        result["viewports"].append(viewport)
        assert "Antes de despegar" in cdp.evaluate("document.querySelector('.lesson h1').innerText")
        assert cdp.evaluate("!document.querySelector('.launch-intro')"), "The removed introduction has returned"
        assert "Tu misión empieza aquí: comprende la experiencia" not in cdp.evaluate("document.querySelector('.launch-station').innerText")
        assert cdp.evaluate("document.querySelectorAll('.launch-tab').length===4"), "Launch does not have exactly four stages"
        assert "Guía" not in cdp.evaluate("document.querySelector('.launch-tabs').innerText"), "Removed Guide stage returned"

        def capture(name):
            screenshot(cdp, artifacts, f"{width}x{height}-{name}", screenshots)

        def record(name, panel, official=False):
            layout = check_layout(cdp)
            issues = []
            if layout["overflow"]:
                issues.append({"overflow": layout["overflow"]})
            if layout["errors"]:
                issues.append({"clipped": layout["errors"]})
            if any(layout["bodyOverflow"].values()):
                issues.append({"bodyOverflow": layout["bodyOverflow"]})
            if not layout["focus"]["visible"]:
                issues.append({"focus": layout["focus"]})
            if panel < 3 and layout["wordCount"] > (180 if official else 145):
                issues.append({"denseCopy": layout["wordCount"]})
            viewport["states"].append({"name": name, "panel": panel, "layout": layout})
            if issues:
                failure = {"viewport": f"{width}x{height}", "state": name, "issues": issues}
                result["layoutErrors"].append(failure)
                if len(result["layoutErrors"]) <= 12:
                    capture("FAIL-" + name)

        for panel in range(4):
            click(cdp, f'[data-action="launch-panel"][data-value="{panel}"]')
            assert cdp.evaluate("document.activeElement.classList.contains('launch-tab')&&document.activeElement.classList.contains('is-active')"), "Panel change did not retain visible focus on its active tab"
            record(f"panel-{panel}", panel)
            capture(f"panel-{panel + 1}")
            check_content(cdp, panel, record, capture)
        viewport["practice"] = check_scenarios(cdp, record, capture)
        # Station interactions are local state; completing the route is checked
        # only after the five viewport matrices so writes remain comparable.
        assert cdp.evaluate("window.__fixtureWrites.filter(item=>item.name==='universo_guardar_viaje').length") == initial_writes, "Learning controls unexpectedly wrote participant data"

    click(cdp, '[data-action="go-step"][data-step="estrella"]')
    wait_for(cdp, "document.querySelector('.lesson h1')?.innerText==='Clientes y usuarios orientan el universo.'")
    result["advancedToMainStar"] = True
    result["errors"] = cdp.evaluate("window.__launchErrors")
    result["network"] = cdp.evaluate("window.__networkAttempts")
    result["fixtureWrites"] = cdp.evaluate("window.__fixtureWrites.map(write=>write.name)")
    result["statesMeasured"] = sum(len(viewport["states"]) for viewport in result["viewports"])
    assert not result["errors"], result["errors"]
    assert not result["network"], result["network"]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-screenshot", action="store_true")
    args = parser.parse_args()
    edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    if not edge.is_file():
        raise RuntimeError("Microsoft Edge was not found")
    artifacts = Path(tempfile.gettempdir()) / f"universo-launch-check-{time.time_ns()}"
    artifacts.mkdir()
    report = {"artifacts": str(artifacts), "pass": False}

    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if urllib.parse.urlsplit(self.path).path == "/__launch_check__":
                page = (ROOT / "index.html").read_text(encoding="utf-8")
                fixture = INTEGRATION_STUB.replace('<script src="/launch-station.js"></script>', '')
                page = page.replace('<script src="app.js"></script>', BOOT + fixture)
                content = page.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            super().do_GET()

        def do_POST(self):
            self.send_error(405, "Network RPC disabled in the launch fixture")

        def log_message(self, *_):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = artifacts / "edge-profile"
    log = (artifacts / "edge.log").open("w", encoding="utf-8")
    process = None
    cdp = None
    try:
        process = subprocess.Popen([str(edge), "--headless=new", "--no-first-run", "--no-default-browser-check",
            "--disable-extensions", "--remote-debugging-port=0", "--remote-allow-origins=*",
            f"--user-data-dir={profile}", "about:blank"], stdout=log, stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW)
        port_file = profile / "DevToolsActivePort"
        deadline = time.monotonic() + 60
        port = None
        while port is None:
            try:
                port = int(port_file.read_text().splitlines()[0])
            except (OSError, ValueError, IndexError):
                if time.monotonic() > deadline:
                    raise RuntimeError("Edge debugging port did not open")
                time.sleep(.15)
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=5))
        cdp = CDP(next(item["webSocketDebuggerUrl"] for item in targets if item["type"] == "page"))
        cdp.sock.settimeout(30)
        for method in ("Runtime.enable", "Page.enable", "Network.enable"):
            cdp.call(method)
        cdp.call("Network.setBlockedURLs", {"urls": ["https://*"]})
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900,
                 "deviceScaleFactor": 1, "mobile": False})
        cdp.call("Page.navigate", {"url": f"http://127.0.0.1:{server.server_port}/__launch_check__"})
        report["checks"] = run_checks(cdp, artifacts, not args.no_screenshot)
        if report["checks"]["layoutErrors"]:
            failures = report["checks"]["layoutErrors"]
            summary = [f"{item['viewport']} {item['state']}" for item in failures[:12]]
            raise AssertionError(f"{len(failures)} layout states failed: {', '.join(summary)}")
        external = [event["params"]["request"]["url"] for event in cdp.events
                    if event.get("method") == "Network.requestWillBeSent" and
                    urllib.parse.urlsplit(event["params"]["request"]["url"]).scheme in ("http", "https") and
                    urllib.parse.urlsplit(event["params"]["request"]["url"]).hostname != "127.0.0.1"]
        assert not external, f"Unexpected external resources: {external}"
        report["pass"] = True
    except Exception as error:
        report["error"] = str(error)
        if cdp is not None:
            try:
                report["browser"] = cdp.evaluate("({errors:window.__launchErrors,network:window.__networkAttempts,html:document.body.innerHTML})")
                screenshot(cdp, artifacts, "failure", not args.no_screenshot)
            except Exception:
                pass
    finally:
        if cdp is not None:
            try:
                cdp.sock.settimeout(3)
                cdp.call("Browser.close")
            except (OSError, RuntimeError):
                pass
        if process is not None and process.poll() is None:
            process.terminate()
        stop_edge_profile_processes(profile)
        server.shutdown()
        log.close()
        (artifacts / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"pass": report["pass"], "artifacts": str(artifacts), "error": report.get("error")}, ensure_ascii=False))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

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

MATCH_ROUNDS = [
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
      node.scrollIntoView({block:'nearest',inline:'nearest'});node.focus();node.click();
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
      const viewport={width:innerWidth,height:innerHeight},rootRect=root.getBoundingClientRect();
      const nodes=[root,...root.querySelectorAll('*')];
      const scrollable=nodes.filter(node=>/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2);
      const scrollChecks=scrollable.map(node=>{
        const before=node.scrollTop;node.scrollTop=node.scrollHeight;
        const moved=node.scrollTop>0;node.scrollTop=before;
        return {className:node.className,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,moved};
      });
      const clipped=[];
      for(const node of root.querySelectorAll('h1,h2,h3,p,li,button,label,dt,dd')){
        if(node.closest('[hidden]')||!node.getClientRects().length)continue;
        if(getComputedStyle(node).display==='none')continue;
        let parent=node.parentElement;
        while(parent&&parent!==document.body){
          const style=getComputedStyle(parent),box=parent.getBoundingClientRect(),r=node.getBoundingClientRect();
          if(/hidden|clip/.test(style.overflowY)&&parent.scrollHeight>parent.clientHeight+3){
            const innerScroller=node.closest('[data-launch-scroll],.launch-scroll');
            const hasScrollableAncestor=scrollable.some(scroller=>parent.contains(scroller)&&scroller.contains(node));
            if(!hasScrollableAncestor&&!innerScroller&&(r.top<box.top-3||r.bottom>box.bottom+3))
              clipped.push({text:node.innerText.slice(0,100),container:parent.className});
          }
          parent=parent.parentElement;
        }
      }
      return {viewport,root:{left:rootRect.left,right:rootRect.right,top:rootRect.top,bottom:rootRect.bottom},
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1||root.scrollWidth>root.clientWidth+2,
        scrollChecks,clipped};
    })()""")


def check_content(cdp, panel):
    text = cdp.evaluate("document.querySelector('.launch-panel').innerText")
    expected = {
        0: ["confianza y lealtad", "Terminología", "Modelos y esquemas", "Escucha y medición",
            "Tu rol y participación", "Competencias y comportamientos"],
        1: ["resultado emocional", "Valores", "Emociones", "Experiencias", "Operación", "Cultura", "Estrategia"],
        2: ["Propósito", "Identidad", "Estrategia", "2035", "entre 52 y 70", "mayor a 70",
            "según su nivel de madurez", *STRATEGY_CHALLENGES],
        3: GLOSSARY_TERMS,
        4: ["16", "concepto", "definición"],
    }[panel]
    missing = [item for item in expected if item.casefold() not in text.casefold()]
    assert not missing, f"Panel {panel} is missing required content: {missing}"
    if panel == 3:
        labels = cdp.evaluate("Array.from(document.querySelectorAll('.launch-glossary-entry dt'),node=>node.innerText)")
        assert labels == GLOSSARY_TERMS, "Glossary must contain all 16 named concepts"
    return {"requiredItems": len(expected), "pass": True}


def run_checks(cdp, artifacts, screenshots):
    """Selectors intentionally exercise the delegated public UI controls."""
    result = {"desktop": [], "mobile": []}
    wait_for(cdp, "Boolean(document.querySelector('.orbital-realm-view'))")
    cdp.evaluate("goStep('lanzamiento')")
    wait_for(cdp, "Boolean(document.querySelector('.launch-station'))")
    cdp.evaluate("flushPending()")
    writes_before = cdp.evaluate("window.__fixtureWrites.length")
    assert "Antes de despegar" in cdp.evaluate("document.querySelector('.lesson h1').innerText")

    for panel in range(5):
        click(cdp, f'[data-action="launch-panel"][data-value="{panel}"]')
        layout = check_layout(cdp)
        result["desktop"].append({"panel": panel, "layout": layout,
                                  "content": check_content(cdp, panel),
                                  "text": cdp.evaluate("document.querySelector('.launch-station').innerText")})
        assert not layout["horizontalOverflow"], f"Desktop panel {panel} overflows horizontally"
        assert not layout["clipped"], f"Desktop panel {panel} clips content: {layout['clipped']}"
        assert all(item["moved"] for item in layout["scrollChecks"]), "Scrollable content is unreachable"
        assert cdp.evaluate("document.activeElement.id==='launch-panel-title'"), "Panel change did not focus its heading"
        screenshot(cdp, artifacts, f"desktop-panel-{panel + 1}", screenshots)

    result["matching"] = check_matching(cdp, artifacts, screenshots, writes_before)

    for width, height in [(390, 844)]:
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height,
                 "deviceScaleFactor": 1, "mobile": False})
        cdp.evaluate("window.LaunchStation.reset();goStep('lanzamiento')")
        wait_for(cdp, "Boolean(document.querySelector('.launch-station'))")
        for panel in range(5):
            click(cdp, f'[data-action="launch-panel"][data-value="{panel}"]')
            layout = check_layout(cdp)
            result["mobile"].append({"panel": panel, "layout": layout})
            assert not layout["horizontalOverflow"], f"Mobile panel {panel} overflows horizontally"
            assert not layout["clipped"], f"Mobile panel {panel} clips content: {layout['clipped']}"
            assert all(item["moved"] for item in layout["scrollChecks"]), "Mobile content cannot scroll"
            if panel in (0, 4):
                screenshot(cdp, artifacts, f"mobile-panel-{panel + 1}", screenshots)
            if panel == 3:
                cdp.evaluate("document.querySelector('.launch-scroll').scrollTop=0;document.querySelector('.launch-scroll').focus()")
                press(cdp, "PageDown", "PageDown", 34)
                result["keyboardScroll"] = cdp.evaluate("({focused:document.activeElement.matches('.launch-scroll'),top:document.querySelector('.launch-scroll').scrollTop})")
                assert result["keyboardScroll"]["focused"] and result["keyboardScroll"]["top"] > 0, "Mobile glossary cannot scroll by keyboard"
        assert any(item["layout"]["scrollChecks"] for item in result["mobile"]), "No mobile scroll path was exercised"
        click(cdp, '[data-action="launch-term"][data-value="cx"]')
        click(cdp, '[data-action="launch-definition"][data-value="cx"]')
        result["mobileMatchFocus"] = cdp.evaluate("""(()=>{
          const focus=document.activeElement,box=focus.getBoundingClientRect();
          const scroll=document.querySelector('.launch-scroll').getBoundingClientRect();
          return {action:focus.dataset.action,value:focus.dataset.value,
            visible:box.top>=scroll.top-1&&box.bottom<=scroll.bottom+1,
            feedback:document.querySelector('.launch-feedback').innerText};
        })()""")
        assert result["mobileMatchFocus"]["action"] == "launch-term" and result["mobileMatchFocus"]["visible"], "Mobile correct answer moves focus outside visible lesson"
        assert result["mobileMatchFocus"]["feedback"], "Mobile answer has no feedback"
        screenshot(cdp, artifacts, "mobile-matching-feedback", screenshots)
    result["errors"] = cdp.evaluate("window.__launchErrors")
    result["network"] = cdp.evaluate("window.__networkAttempts")
    result["fixtureWrites"] = cdp.evaluate("window.__fixtureWrites.map(write=>write.name)")
    assert not result["errors"], result["errors"]
    assert not result["network"], result["network"]
    return result


def check_matching(cdp, artifacts, screenshots, writes_before):
    result = {"rounds": []}
    advance = '[data-action="go-step"][data-step="estrellas"]'
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===true"), "Launch can finish before matching"
    click(cdp, '[data-action="launch-term"][data-value="cx"]')
    click(cdp, '[data-action="launch-definition"][data-value="clientecentrismo"]')
    wrong = cdp.evaluate("({text:document.querySelector('.launch-feedback')?.innerText||'',matched:document.querySelectorAll('.is-matched').length,live:document.querySelector('.launch-feedback')?.getAttribute('aria-live')})")
    assert wrong["text"] and wrong["matched"] == 0 and wrong["live"] == "polite", "Wrong matching lacks accessible feedback"
    result["wrongMatch"] = wrong
    click(cdp, '[data-action="launch-term"][data-value="cx"]')
    click(cdp, '[data-action="launch-definition"][data-value="cx"]')
    completed_before = cdp.evaluate("document.querySelectorAll('.is-matched').length")
    assert completed_before >= 2, "Correct term/definition pair was not marked"
    click(cdp, '[data-action="launch-panel"][data-value="0"]')
    click(cdp, '[data-action="launch-panel"][data-value="4"]')
    completed_after = cdp.evaluate("document.querySelectorAll('.is-matched').length")
    assert completed_after == completed_before, "Matching progress was lost when revisiting a panel"
    result["retainedProgress"] = True
    for index, group in enumerate(MATCH_ROUNDS):
        for concept in group:
            if index == 0 and concept == "cx":
                continue
            click(cdp, f'[data-action="launch-term"][data-value="{concept}"]')
            click(cdp, f'[data-action="launch-definition"][data-value="{concept}"]')
        round_state = cdp.evaluate("({matched:document.querySelectorAll('.is-matched').length,focus:document.activeElement.dataset.action,feedback:document.querySelector('.launch-feedback')?.innerText})")
        assert round_state["matched"] >= 8, f"Round {index + 1} is incomplete"
        result["rounds"].append(round_state)
        if index < len(MATCH_ROUNDS) - 1:
            click(cdp, '[data-action="launch-round"]')
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "All pairs failed to unlock launch"
    screenshot(cdp, artifacts, "desktop-matching-complete", screenshots)
    cdp.evaluate("document.querySelector('[data-action=launch-prev]').focus()")
    press(cdp, "Enter", "Enter", 13)
    assert cdp.evaluate("document.querySelector('#launch-panel-title').innerText.includes('códigos')"), "Keyboard previous-panel control failed"
    cdp.evaluate("document.querySelector('[data-action=launch-next]').focus()")
    press(cdp, "Enter", "Enter", 13)
    assert cdp.evaluate("document.activeElement.id==='launch-panel-title'"), "Keyboard next-panel control lost focus"
    assert cdp.evaluate("document.querySelector(" + json.dumps(advance) + ")?.disabled===false"), "Completing panel navigation lost matching progress"
    result["keyboardNavigation"] = True
    assert cdp.evaluate("window.__fixtureWrites.length") == writes_before, "Learning interactions unexpectedly wrote participant data"
    click(cdp, advance)
    wait_for(cdp, "document.querySelector('.lesson h1')?.innerText==='Clientes y usuarios orientan el universo.'")
    result["advancedToStars"] = True
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

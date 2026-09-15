"""Run the isolated orbital map in Edge with real WebGL; no Node or Supabase.

Usage: python scripts/check_scene.py --width 1440 --height 900 --sweep --resize-sweep
Artifacts are kept in a temporary folder. Three r160 is cached outside the repo.
"""
import argparse
import base64
import functools
import http.server
import json
import math
import os
from pathlib import Path
import re
import shutil
import socket
import struct
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
HARNESS = """<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/universe-map.css">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}
.orbital-realm-view{width:100vw;height:100vh;display:flex;flex-direction:column}
.orbital-realm{flex:1;width:100%;min-height:0}</style>
<main class="universo orbital-realm-view"><nav><button class="nav-button nav-brand"><span>✦</span> Universo de la Experiencia</button><span class="nav-name">Guía de la experiencia</span><div class="nav-actions"><button class="nav-button">Continuar mi viaje</button><button class="nav-button">Mi pasaporte</button><img class="epm-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"></div></nav><header class="realm-heading"><h1>Explora tu universo</h1></header>
<div class="orbital-realm"></div></main>
<script>window.__errors=[];window.__clicked=[];
window.addEventListener('error',e=>window.__errors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
window.goStep=step=>window.__clicked.push(step);
// Keep screenshots deterministic and let software WebGL finish its current frame.
const nativeRAF=window.requestAnimationFrame.bind(window),deferredFrames=[];
let framesFrozen=false;
window.requestAnimationFrame=callback=>nativeRAF(time=>{
 if(framesFrozen)deferredFrames.push(callback);else callback(time);
});
window.__sceneFrameControl={pause(){framesFrozen=true;},resume(){
 framesFrozen=false;deferredFrames.splice(0).forEach(callback=>nativeRAF(callback));
}};</script>
<script src="/__three_local__.js"></script>
<script>
const OriginalRenderer=THREE.WebGLRenderer;
THREE.WebGLRenderer=class extends OriginalRenderer {
 constructor(...args){super(...args);const draw=this.render.bind(this);
  this.render=(scene,camera)=>{window.__sceneProbe={scene,camera,renderer:this};return draw(scene,camera);};}
};
window.__sceneSnapshot=()=>{
 const p=window.__sceneProbe;
 if(!p)return {errors:window.__errors,webgl:false};
 const objects=[];
 p.scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isSprite){
  const v=o.getWorldPosition(new THREE.Vector3());
  objects.push({id:o.uuid,name:o.name,type:o.type,geometry:o.geometry?.type,
    position:v.toArray(),rotation:o.rotation.toArray().slice(0,3),
    opacity:o.material?.opacity,visible:o.visible});
 }});
 return {errors:window.__errors,webgl:true,calls:p.renderer.info.render.calls,
  triangles:p.renderer.info.render.triangles,objects,
  viewport:[innerWidth,innerHeight],scroll:[document.body.scrollWidth,document.body.scrollHeight],
  inspector:document.querySelector('.cosmos-inspector')?.innerText,
  labels:Array.from(document.querySelectorAll('.three-space-label,.cosmos-object-label')).map(e=>{
   const r=e.getBoundingClientRect();return {text:e.innerText,disabled:e.disabled,
    rect:[r.x,r.y,r.width,r.height],visible:!e.hidden&&getComputedStyle(e).visibility!=='hidden'&&r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
    fullyInside:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5};
  })};
};
</script><!-- scene-helpers --><script src="/orbital-3d.js"></script>
<script>window.initClientOrbitalScene?.(7);</script></html>"""
INTEGRATION_STUB = """<script>
window.__fixtureWrites=[];window.__networkAttempts=[];
window.fetch=url=>{window.__networkAttempts.push(String(url));throw Error('Network disabled in isolated integration test');};
window.supabase={createClient:()=>({from:()=>({select(){return this},eq(){return this},
 maybeSingle:async()=>({data:{nombre:'Prueba local',paso:'mision',duelos:{},
 planeta_principal:'empaticos',planeta_explorar:'conectores',rol:'generador',satelites:[],mision:{}},error:null}),
 upsert:async data=>{window.__fixtureWrites.push(data);return {error:null};}
})})};
</script><script src="/app.js"></script>"""


class CDP:
    """Small stdlib-only WebSocket client for Chromium DevTools Protocol."""
    def __init__(self, url):
        parsed = urllib.parse.urlsplit(url)
        self.sock = socket.create_connection((parsed.hostname, parsed.port), timeout=45)
        key = base64.b64encode(os.urandom(16)).decode()
        request = (f"GET {parsed.path} HTTP/1.1\r\nHost: {parsed.hostname}:{parsed.port}\r\n"
                   f"Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
                   "Sec-WebSocket-Version: 13\r\n\r\n")
        self.sock.sendall(request.encode())
        response = b""
        while not response.endswith(b"\r\n\r\n"):
            response += self.sock.recv(1)
        if not response.startswith(b"HTTP/1.1 101 "):
            raise RuntimeError(response.decode())
        self.counter = 0
        self.events = []

    def exact(self, count):
        result = b""
        while len(result) < count:
            chunk = self.sock.recv(count - len(result))
            if not chunk:
                raise RuntimeError("Browser disconnected")
            result += chunk
        return result

    def send(self, message):
        data = json.dumps(message).encode()
        mask = os.urandom(4)
        if len(data) < 126:
            header = bytes([0x81, 0x80 | len(data)])
        elif len(data) < 65536:
            header = bytes([0x81, 0xFE]) + struct.pack("!H", len(data))
        else:
            header = bytes([0x81, 0xFF]) + struct.pack("!Q", len(data))
        self.sock.sendall(header + mask + bytes(byte ^ mask[i % 4] for i, byte in enumerate(data)))

    def receive(self):
        fragments = []
        while True:
            a, b = self.exact(2)
            size = b & 127
            if size == 126:
                size = struct.unpack("!H", self.exact(2))[0]
            elif size == 127:
                size = struct.unpack("!Q", self.exact(8))[0]
            mask = self.exact(4) if b & 128 else None
            data = self.exact(size)
            if mask:
                data = bytes(byte ^ mask[i % 4] for i, byte in enumerate(data))
            if (a & 15) == 8:
                raise RuntimeError("Browser closed WebSocket")
            fragments.append(data)
            if a & 128:
                return json.loads(b"".join(fragments))

    def call(self, method, params=None):
        self.counter += 1
        request_id = self.counter
        self.send({"id": request_id, "method": method, "params": params or {}})
        while True:
            message = self.receive()
            if message.get("id") == request_id:
                if "error" in message:
                    raise RuntimeError(message["error"])
                return message.get("result", {})
            self.events.append(message)

    def evaluate(self, expression):
        result = self.call("Runtime.evaluate", {"expression": expression, "returnByValue": True,
                                                "awaitPromise": True})
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")


def local_scene_helpers():
    """Mirror production's local helpers without loading analytics or Supabase."""
    scripts = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']',
                         (ROOT / "index.html").read_text(encoding="utf-8"), flags=re.I)
    helpers = []
    for source in scripts:
        parsed = urllib.parse.urlsplit(source)
        if Path(parsed.path).name == "orbital-3d.js":
            break
        if parsed.scheme or parsed.netloc or "three" in Path(parsed.path).name.lower():
            continue
        helpers.append(f'<script src="/{source.lstrip(chr(47))}"></script>')
    return "\n".join(helpers)


def visibility_sweep(cdp, seconds, samples):
    """Audit actual projected geometry synchronously across complete orbital cycles."""
    options = json.dumps({"seconds": seconds, "samples": samples})
    return cdp.evaluate("""(() => {
      const options=OPTIONS,debug=window.__universeDebug;
      if(!debug?.setTime||!debug?.auditVisibility)
        throw Error('Visibility sweep requires __universeDebug.setTime and auditVisibility');
      const original=debug.snapshot(),pause=document.querySelector('.cosmos-pause');
      if(!original.paused)pause.click();
      debug.select('client');
      const frames=[],failures=[];
      const expectedIds=original.objects.filter(o=>['client','planet','satellite','waypoint'].includes(o.kind))
        .map(o=>o.id).sort().join(',');
      try {
        for(let sample=0;sample<options.samples;sample++) {
          const t=options.seconds*sample/(options.samples-1);
          // CPU geometry/camera audit; defer GPU rendering to the final frame.
          debug.setTime(t,false);
          const audit=debug.auditVisibility(),objects=audit.objects||[],guides=audit.orbitGuides||[];
          if(!objects.length)throw Error('Visibility audit returned no stellar objects');
          const ids=objects.map(o=>o.id).sort().join(',');
          if(ids!==expectedIds)failures.push({time:t,type:'missing-object',ids});
          const invalid=objects.filter(o=>!o.inside||!o.selectable||!o.bounds||
            !['left','right','top','bottom'].every(k=>Number.isFinite(o.bounds[k])));
          invalid.forEach(o=>failures.push({time:t,type:'object',object:o,safeRect:audit.safeRect}));
          guides.filter(g=>g.visible&&(!g.occupied||g.soft!==true)).forEach(g=>
            failures.push({time:t,type:'orbit-guide',guide:g}));
          frames.push({time:t,view:audit.view,objects:objects.length,
            visibleGuides:guides.filter(g=>g.visible).length,invalid:invalid.length});
        }
      } finally {
        debug.setTime(original.elapsed);debug.select(original.selected);
        if(!original.paused)pause.click();
      }
      return {viewport:[innerWidth,innerHeight],duration:options.seconds,
        samples:options.samples,expectedIds,frames,failures,pass:failures.length===0};
    })()""".replace("OPTIONS", options))


def set_viewport(cdp, width, height):
    cdp.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height,
             "deviceScaleFactor": 1, "mobile": False})
    cdp.evaluate("""new Promise(resolve=>requestAnimationFrame(()=>
      requestAnimationFrame(()=>requestAnimationFrame(resolve))))""")


def capture_scene(cdp, target):
    cdp.evaluate("window.__sceneFrameControl?.pause()")
    try:
        # A screenshot must not race an unbounded stream of software-rendered frames.
        time.sleep(.25)
        screenshot = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        target.write_bytes(base64.b64decode(screenshot["data"]))
    finally:
        cdp.evaluate("window.__sceneFrameControl?.resume()")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--seconds", type=float, default=3)
    parser.add_argument("--advance", type=float, default=0, help="Advance the scene debug clock before the second snapshot")
    parser.add_argument("--click", help="Click a local CSS selector before the second snapshot")
    parser.add_argument("--select", help="Select a scene debug record before the second snapshot")
    parser.add_argument("--integration", action="store_true", help="Load the real app with a local fake Supabase")
    parser.add_argument("--sweep", action="store_true", help="Audit all selectable 3D bodies across a complete galactic orbit")
    parser.add_argument("--sweep-samples", type=int, default=61, help="Time samples including both orbital-cycle endpoints")
    parser.add_argument("--sweep-seconds", type=float, default=1500, help="Total simulated time for the visibility sweep")
    parser.add_argument("--resize-sweep", action="store_true", help="Also audit 1440x900, 1440x650 and 390x844 without relaunching Edge")
    parser.add_argument("--no-screenshot", action="store_true", help="Only validate runtime and integration")
    parser.add_argument("--url", help="Optional local page path instead of the isolated scene")
    args = parser.parse_args()
    if args.sweep_samples < 2 or args.sweep_seconds <= 0:
        parser.error("A visibility sweep requires at least two samples and positive duration")
    edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    if not edge.exists():
        raise RuntimeError("Microsoft Edge was not found")
    cache = Path(tempfile.gettempdir()) / "universo-scene-check-cache"
    cache.mkdir(exist_ok=True)
    library = ROOT / "vendor" / "three.min.js"
    if not library.exists():
        library = cache / "three-r160.min.js"
    if not library.exists():
        urllib.request.urlretrieve(THREE_URL, library)
    artifacts = Path(tempfile.mkdtemp(prefix="universo-scene-check-", dir=str(ROOT / "node_modules") if (ROOT / "node_modules").exists() else None))

    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            path = urllib.parse.urlsplit(self.path).path
            if path in ("/__scene_check__", "/__three_local__.js"):
                page = HARNESS.replace('<!-- scene-helpers -->', local_scene_helpers())
                if args.integration:
                    first = page.index('<main class="universo orbital-realm-view">')
                    last = page.index('</main>', first) + len('</main>')
                    page = page[:first] + '<div id="app"></div>' + page[last:]
                    page = page.replace('<script>window.initClientOrbitalScene?.(7);</script>', INTEGRATION_STUB)
                content = page.encode() if path == "/__scene_check__" else library.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8" if path == "/__scene_check__" else "application/javascript")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            super().do_GET()

        def log_message(self, *_):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = artifacts / "edge-profile"
    log = (artifacts / "edge.log").open("w", encoding="utf-8")
    command = [str(edge), "--headless=new", "--no-first-run", "--no-default-browser-check",
               "--disable-extensions", "--remote-debugging-port=0", "--remote-allow-origins=*",
               "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
               f"--user-data-dir={profile}", "about:blank"]
    process = subprocess.Popen(command, stdout=log, stderr=log,
                               creationflags=subprocess.CREATE_NO_WINDOW)
    cdp = None
    try:
        port_file = profile / "DevToolsActivePort"
        deadline = time.monotonic() + 30
        port = None
        while port is None:
            if process.poll() is not None:
                raise RuntimeError(f"Edge exited {process.returncode}; see {artifacts / 'edge.log'}")
            if time.monotonic() > deadline:
                raise RuntimeError(f"DevTools port did not open; see {artifacts / 'edge.log'}")
            try:
                port = int(port_file.read_text().splitlines()[0])
            except (OSError, ValueError, IndexError):
                pass
            time.sleep(.2)
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
        cdp = CDP(next(t["webSocketDebuggerUrl"] for t in targets if t["type"] == "page"))
        cdp.call("Runtime.enable")
        cdp.call("Page.enable")
        cdp.call("Log.enable")
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": args.width, "height": args.height,
                                                        "deviceScaleFactor": 1, "mobile": False})
        path = args.url or "/__scene_check__"
        cdp.call("Page.navigate", {"url": f"http://127.0.0.1:{server.server_port}{path}"})
        deadline = time.monotonic() + 25
        while not cdp.evaluate("Boolean(window.__sceneProbe)"):
            if time.monotonic() > deadline:
                diagnostics = cdp.evaluate("({errors:window.__errors,three:window.THREE?.REVISION,init:typeof window.initClientOrbitalScene,realm:document.querySelector('.orbital-realm')?.getBoundingClientRect().toJSON(),html:document.documentElement.outerHTML})")
                (artifacts / "failure.json").write_text(json.dumps({"diagnostics": diagnostics, "events": cdp.events}, ensure_ascii=False, indent=2), encoding="utf-8")
                raise RuntimeError(f"Scene did not render; see {artifacts / 'failure.json'}")
            time.sleep(.2)
        deadline = time.monotonic() + 25
        while not cdp.evaluate("window.__universeDebug?.snapshot?.().assetsReady !== false"):
            if time.monotonic() > deadline:
                diagnostics = cdp.evaluate("window.__universeDebug?.snapshot?.()")
                (artifacts / "asset-failure.json").write_text(json.dumps(diagnostics,
                    ensure_ascii=False, indent=2), encoding="utf-8")
                raise RuntimeError(f"Scene textures did not finish loading; see {artifacts / 'asset-failure.json'}")
            time.sleep(.2)
        time.sleep(1)
        before = cdp.evaluate("window.__sceneSnapshot()")
        hierarchy_before = cdp.evaluate("window.__universeDebug?.snapshot?.() ?? null")
        if args.advance:
            cdp.evaluate(f"window.__universeDebug?.advance?.({args.advance})")
        if args.click:
            cdp.evaluate("document.querySelector(" + json.dumps(args.click) + ")?.click()")
        if args.select:
            cdp.evaluate("window.__universeDebug?.select?.(" + json.dumps(args.select) + ")")
        time.sleep(args.seconds)
        after = cdp.evaluate("window.__sceneSnapshot()")
        hierarchy_after = cdp.evaluate("window.__universeDebug?.snapshot?.() ?? null")
        hierarchy_checks = []
        if hierarchy_before and hierarchy_after:
            first_objects = {o["id"]: o for o in hierarchy_before["objects"]}
            last_objects = {o["id"]: o for o in hierarchy_after["objects"]}
            for body in hierarchy_after["objects"]:
                if body["kind"] not in ("planet", "satellite"):
                    continue
                parent = last_objects[body["parent"]]
                relative = [a - b for a, b in zip(body["position"], parent["position"])]
                world_radius = math.sqrt(sum(c*c for c in relative))
                local_radius = math.sqrt(sum(c*c for c in body["local"]))
                prior_body = first_objects[body["id"]]
                prior_parent = first_objects[body["parent"]]
                prior_relative = [a-b for a,b in zip(prior_body["position"],prior_parent["position"])]
                hierarchy_checks.append({"id":body["id"], "parent":body["parent"],
                    "radius":world_radius, "parentTransformValid":abs(world_radius-local_radius)<1e-6,
                    "orbitalMotion":math.dist(relative,prior_relative)>1e-5})
        pause_check = cdp.evaluate("""(async()=>{
          if(!window.__universeDebug)return null;
          const button=document.querySelector('.cosmos-pause');
          if(!window.__universeDebug.snapshot().paused)button.click();
          const before=window.__universeDebug.snapshot().elapsed;
          await new Promise(r=>setTimeout(r,180));
          const after=window.__universeDebug.snapshot().elapsed;button.click();
          return {before,after,pass:before===after};
        })()""")
        if not args.no_screenshot:
            capture_scene(cdp, artifacts / "scene.png")
        sweeps = []
        if args.sweep or args.resize_sweep:
            layouts = [(args.width, args.height)]
            if args.resize_sweep:
                layouts += [(1440, 900), (1440, 650), (390, 844)]
            for width, height in dict.fromkeys(layouts):
                if (width, height) != (args.width, args.height):
                    set_viewport(cdp, width, height)
                sweep = visibility_sweep(cdp, args.sweep_seconds, args.sweep_samples)
                layout_snapshot = cdp.evaluate("window.__sceneSnapshot()")
                sweep["clippedLabels"] = [label for label in layout_snapshot.get("labels", [])
                    if label["visible"] and not label["fullyInside"]]
                sweep["scroll"] = layout_snapshot["scroll"]
                sweep["pass"] = sweep["pass"] and not sweep["clippedLabels"] and \
                    layout_snapshot["scroll"][0] <= width and layout_snapshot["scroll"][1] <= height
                sweeps.append(sweep)
                if not args.no_screenshot and (width, height) != (args.width, args.height):
                    capture_scene(cdp, artifacts / f"scene-{width}x{height}.png")
            set_viewport(cdp, args.width, args.height)
        integration = None
        if args.integration:
            integration = cdp.evaluate("""(async()=>{
              const results=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
              for(let n=0;n<2;n++){
                window.__universeDebug.select('client');document.querySelector('.cosmos-action').click();await wait(400);
                results.push({phase:'activity',h1:document.querySelector('.lesson h1')?.innerText,
                  canvas:document.querySelectorAll('canvas').length,debug:!!window.__universeDebug});
                showMap();await wait(700);
                results.push({phase:'map',canvas:document.querySelectorAll('.cosmos-stage canvas').length,
                  stage:document.querySelectorAll('.cosmos-stage').length,debug:!!window.__universeDebug,
                  fallback:!!document.querySelector('.cosmos-fallback:not([hidden])')});
              }
              return {results,writes:window.__fixtureWrites.length,network:window.__networkAttempts,errors:window.__errors};
            })()""")
        report = {"before": before, "after": after, "hierarchyBefore": hierarchy_before,
                  "hierarchyAfter": hierarchy_after, "hierarchyChecks":hierarchy_checks,
                  "pauseCheck":pause_check, "visibilitySweeps":sweeps,
                  "integration": integration, "browserEvents": cdp.events}
        (artifacts / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        output_dir = ROOT / "node_modules"
        output_dir.mkdir(exist_ok=True)
        if not args.no_screenshot:
            shutil.copyfile(artifacts / "scene.png", output_dir / f"scene-check-{args.width}x{args.height}.png")
            for sweep in sweeps:
                width, height = sweep["viewport"]
                source = artifacts / f"scene-{width}x{height}.png"
                if source.exists():
                    shutil.copyfile(source, output_dir / f"scene-check-{width}x{height}.png")
        shutil.copyfile(artifacts / "report.json", output_dir / f"scene-check-{args.width}x{args.height}.json")
        prior = {o["id"]: o for o in before.get("objects", [])}
        moved = sum(o["position"] != prior.get(o["id"], {}).get("position") for o in after.get("objects", []))
        exceptions = [e for e in cdp.events if e.get("method") == "Runtime.exceptionThrown"]
        console_errors = [e for e in cdp.events if e.get("method") == "Runtime.consoleAPICalled"
                          and e.get("params", {}).get("type") == "error"]
        failed_resources = [e for e in cdp.events if e.get("method") == "Log.entryAdded"
                            and e.get("params", {}).get("entry", {}).get("level") == "error"
                            and not e.get("params", {}).get("entry", {}).get("url", "").endswith("favicon.ico")]
        print(json.dumps({"artifacts": str(artifacts), "webgl": after.get("webgl"),
                          "calls": after.get("calls"), "objects": len(after.get("objects", [])),
                          "movedObjects": moved, "errors": after.get("errors"),
                          "exceptions": exceptions, "consoleErrors": console_errors,
                          "resourceErrors": failed_resources, "labels": after.get("labels"),
                          "scroll": after.get("scroll"), "integration": integration,
                          "hierarchyChecks":hierarchy_checks, "pauseCheck":pause_check,
                          "visibilitySweeps":[{k:v for k,v in sweep.items() if k != "frames"} for sweep in sweeps],
                          "assetErrors": hierarchy_after.get("assetErrors",[]) if hierarchy_after else [],
                          "shaderErrors": hierarchy_after.get("shaderErrors",[]) if hierarchy_after else []}, ensure_ascii=True))
        integration_failed = integration and (integration["errors"] or integration["network"] or
            any(r.get("debug") or r.get("canvas") != 0 or not r.get("h1") for r in integration["results"] if r["phase"] == "activity") or
            any(not r.get("debug") or r.get("canvas") != 1 or r.get("stage") != 1 or r.get("fallback") for r in integration["results"] if r["phase"] == "map"))
        hierarchy_failed = any(not c["parentTransformValid"] or not c["orbitalMotion"] for c in hierarchy_checks)
        if after.get("errors") or exceptions or console_errors or failed_resources or not after.get("calls") or (hierarchy_after and (hierarchy_after.get("shaderErrors") or hierarchy_after.get("assetErrors"))) or integration_failed or hierarchy_failed or (pause_check and not pause_check["pass"]) or any(not sweep["pass"] for sweep in sweeps):
            raise SystemExit(1)
    finally:
        if cdp is not None and process.poll() is None:
            try:
                cdp.sock.settimeout(3)
                cdp.call("Browser.close")
            except (OSError, RuntimeError):
                pass
        if process.poll() is None:
            process.terminate()
        server.shutdown()
        log.close()


if __name__ == "__main__":
    main()

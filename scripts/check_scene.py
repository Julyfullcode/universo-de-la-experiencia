"""Run the isolated orbital map in Edge with real WebGL; no Node or Supabase.

Usage: python scripts/check_scene.py --width 1440 --height 900 --sweep --resize-sweep
The resize sweep includes normal, 4K-class, ultrawide, and mobile layouts.
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
<main class="universo orbital-realm-view"><nav class="site-nav"><button class="nav-epm"><img class="epm-logo" src="assets/logo-grupo-epm.png" alt="Grupo EPM"></button><button class="nav-button nav-product"><span>Universo de la Experiencia</span><i>—</i><strong>Guía de la Experiencia</strong></button><div class="nav-actions"><button class="nav-button nav-passport">Mi pasaporte</button><button class="nav-button nav-feedback">Evaluar experiencia</button></div></nav>
<div class="orbital-realm"></div></main>
<script>window.__errors=[];window.__clicked=[];
window.addEventListener('error',e=>window.__errors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
window.goStep=step=>window.__clicked.push(step);
// Keep screenshots deterministic and let software WebGL finish its current frame.
const nativeRAF=window.requestAnimationFrame.bind(window),deferredFrames=[];
let framesFrozen=false;
window.requestAnimationFrame=callback=>nativeRAF(time=>{
 if(framesFrozen){deferredFrames.push(callback);return;}
 // Software WebGL gets idle time for CDP snapshots; production RAF is untouched.
 setTimeout(()=>{
  if(framesFrozen)deferredFrames.push(callback);else callback(performance.now());
 },90);
});
window.__sceneFrameControl={pause(){framesFrozen=true;},resume(){
 framesFrozen=false;deferredFrames.splice(0).forEach(callback=>nativeRAF(callback));
}};
// RAF is intentionally throttled in this software-WebGL harness. A 350ms timer
// can read an older frame (one failure reflected only 160ms of hover decay).
// Sample after the next frame; record actual elapsed time, not a 350ms deadline.
window.__sceneWaitAndFrame=async(delay=350)=>{
 const started=performance.now();await new Promise(resolve=>setTimeout(resolve,delay));
 const timerWakeAt=performance.now();await new Promise(resolve=>requestAnimationFrame(resolve));
 return {elapsedMs:performance.now()-started,timerWakeAt,sceneFrameAt:window.__sceneProbe?.renderedAt};
};</script>
<script src="/__three_local__.js"></script>
<script>
const OriginalRenderer=THREE.WebGLRenderer;
THREE.WebGLRenderer=class extends OriginalRenderer {
 constructor(...args){super(...args);const draw=this.render.bind(this);
  this.render=(scene,camera)=>{const result=draw(scene,camera);window.__sceneProbe={scene,camera,renderer:this,renderedAt:performance.now()};return result;};}
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
   const r=e.getBoundingClientRect();return {text:e.innerText,className:e.className,disabled:e.disabled,
    rect:[r.x,r.y,r.width,r.height],visible:!e.hidden&&getComputedStyle(e).visibility!=='hidden'&&r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
    fullyInside:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5};
  })};
};
</script><!-- scene-helpers --><script src="/orbital-3d.js"></script>
<script>window.initClientOrbitalScene?.(7);</script></html>"""
INTEGRATION_STUB = """<script>
window.__fixtureWrites=[];window.__networkAttempts=[];
localStorage.setItem('universo-experiencia.sesion.v3','fixture-session');
window.fetch=url=>{window.__networkAttempts.push(String(url));throw Error('Network disabled in isolated integration test');};
const fixtureJourney={nombre:'Prueba local',paso:'mision',duelos:{},planeta_principal:'empaticos',
 planeta_explorar:'conectores',rol:'generador',satelites:[],observatorio:'CES',mision:{},avance_maximo:7};
window.supabase={createClient:()=>({rpc:async(name,args)=>{
 window.__fixtureWrites.push({name,args});
 if(name==='universo_mi_viaje')return {data:{correo:'prueba@local.test',viaje:fixtureJourney,feedback:null},error:null};
 if(name==='universo_guardar_viaje'){Object.assign(fixtureJourney,args.p_viaje);return {data:{correo:'prueba@local.test',viaje:fixtureJourney,feedback:null},error:null};}
 if(name==='universo_guardar_feedback')return {data:{calificacion:args.p_calificacion,recomendacion:args.p_recomendacion},error:null};
 return {data:true,error:null};
}})};
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
          objects.filter(o=>o.safeRect&&o.bounds).forEach(o=>{
            const s=o.safeRect,b=o.bounds;
            const bounded=['left','right','top','bottom'].every(k=>Number.isFinite(s[k]))&&
              b.left>=s.left-.01&&b.right<=s.right+.01&&b.top>=s.top-.01&&b.bottom<=s.bottom+.01;
            if(o.inside&&!bounded)failures.push({time:t,type:'invalid-inside-claim',object:o});
          });
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


def layout_metrics(cdp):
    """Record proportional framing separately from time-dependent orbital positions."""
    return cdp.evaluate("""(() => {
      const debug=window.__universeDebug,original=debug.snapshot();
      debug.select('client');
      debug.setTime(0,false);
      try {
        const audit=debug.auditVisibility(),snapshot=debug.snapshot();
        const stage=document.querySelector('.cosmos-stage').getBoundingClientRect();
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x-stage.x,y:r.y-stage.y,w:r.width,h:r.height};};
        const fonts={};
        for(const [key,selector] of Object.entries({title:'.nav-product strong',
          object:'.cosmos-object-label.planet',heading:'.cosmos-heading h2',
          inspector:'.cosmos-inspector p',route:'.cosmos-route button'})) {
          const element=document.querySelector(selector);
          if(element)fonts[key]=parseFloat(getComputedStyle(element).fontSize);
        }
        return {viewport:[innerWidth,innerHeight],stage:{x:stage.x,y:stage.y,w:stage.width,h:stage.height},
          views:snapshot.views,fonts,objects:(audit.objects||[]).map(o=>({id:o.id,kind:o.kind,
            view:o.view,bounds:o.bounds,safeRect:o.safeRect,
            pixelRadius:o.pixelRadius??o.pxRadius??((o.bounds.right-o.bounds.left)/2)})),
          constellationHeading:rect(document.querySelector('.cosmos-heading.constellations'))};
      } finally {debug.setTime(original.elapsed,false);debug.select(original.selected);}
    })()""")


def visual_copy_checks(cdp):
    """Only map annotations are checked; contextual lesson/inspector prose is allowed."""
    return cdp.evaluate("""(()=>{
      const stage=document.querySelector('.cosmos-stage'),box=stage.getBoundingClientRect();
      const shown=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
      const annotations=[...stage.querySelectorAll('.cosmos-heading,.cosmos-object-label,.cosmos-overview-link')]
        .filter(shown).map(e=>e.innerText.toLocaleLowerCase('es'));
      const forbidden=['modelo de experiencia + arquitectura empresarial','otros actores',
        'seguir a la estrella seleccionada','cliente seleccionado','explora tu universo',
        'continuar mi viaje','créditos de las superficies'];
      const forbiddenVisible=forbidden.filter(text=>annotations.some(annotation=>annotation.includes(text)));
      const audit=window.__universeDebug.auditVisibility(),launch=audit.objects.find(o=>o.id==='launch'),
        label=stage.querySelector('.cosmos-object-label.launch');
      let launchLabel=null;
      if(launch?.visible&&label&&shown(label)){
        const r=label.getBoundingClientRect(),bounds=launch.visualBounds;
        launchLabel={rect:{left:r.left-box.left,right:r.right-box.left,top:r.top-box.top,bottom:r.bottom-box.top},
          visualBounds:bounds||null,pass:!!bounds&&r.top-box.top>=bounds.bottom-.5};
      }else if(launch?.visible){
        launchLabel={pass:false,reason:'Visible launch object has no visible label'};
      }
      return {viewport:[innerWidth,innerHeight],forbiddenVisible,launchLabel,
        pass:forbiddenVisible.length===0&&(!launchLabel||launchLabel.pass)};
    })()""")


def hover_checks(cdp):
    """Dispatch real pointer movement and inspect the next frame after 350ms of settling.

    The harness throttles RAF by 90ms: an independent 350ms timer alone may inspect
    an older visual state. Thresholds below are unchanged; actual wait times are
    recorded instead of claiming a fixed 350ms animation deadline.
    """
    setup = cdp.evaluate("""(()=>{
      const debug=window.__universeDebug,original=debug.snapshot();
      if(!original.paused)document.querySelector('.cosmos-pause').click();
      window.__sceneFrameControl?.resume();debug.select('client');debug.setTime(0);
      return {original,ids:debug.snapshot().objects.filter(o=>
        ['client','planet','satellite','waypoint'].includes(o.kind)).map(o=>o.id)};
    })()""")
    results = []
    final_snapshot = None
    try:
        for object_id in setup["ids"]:
            selection = "satellite-0" if object_id.startswith("satellite-") else "client"
            point = cdp.evaluate("""(()=>{
              const debug=window.__universeDebug;debug.select(SELECTION);debug.setTime(0);
              const p=debug.project(ID),r=document.querySelector('.cosmos-stage').getBoundingClientRect();
              return p?{x:p.x+r.x,y:p.y+r.y}:null;
            })()""".replace("SELECTION", json.dumps(selection)).replace("ID", json.dumps(object_id)))
            if not point:
                results.append({"id": object_id, "pass": False, "reason": "Missing projected pointer target"})
                continue
            cdp.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 8, "y": 8})
            baseline = cdp.evaluate("""(async()=>{
              const timing=await window.__sceneWaitAndFrame(350);
              return {timing,object:window.__universeDebug.snapshot().objects.find(o=>o.id===ID)};
            })()""".replace("ID", json.dumps(object_id)))
            cdp.call("Input.dispatchMouseEvent", {"type": "mouseMoved", **point})
            hovered = cdp.evaluate("""(async()=>{
              const timing=await window.__sceneWaitAndFrame(350),s=window.__universeDebug.snapshot();
              return {timing,hovered:s.hovered,object:s.objects.find(o=>o.id===ID)};
            })()""".replace("ID", json.dumps(object_id)))
            cdp.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 8, "y": 8})
            restored = cdp.evaluate("""(async()=>{
              const timing=await window.__sceneWaitAndFrame(350),s=window.__universeDebug.snapshot();
              return {timing,hovered:s.hovered,object:s.objects.find(o=>o.id===ID)};
            })()""".replace("ID", json.dumps(object_id)))

            def scale(body):
                value = (body or {}).get("visualScale")
                return max(value) if isinstance(value, list) else value

            base_scale, hover_scale, reset_scale = scale(baseline["object"]), scale(hovered["object"]), scale(restored["object"])
            growth = hover_scale / base_scale if base_scale and hover_scale else None
            reset_ratio = reset_scale / base_scale if base_scale and reset_scale else None
            amount = (hovered["object"] or {}).get("hoverAmount")
            reset_amount = (restored["object"] or {}).get("hoverAmount")
            passed = hovered.get("hovered") == object_id and growth is not None and growth >= 1.02 and \
                amount is not None and amount > .05 and reset_ratio is not None and abs(reset_ratio-1) <= .02 and \
                reset_amount is not None and reset_amount <= .03
            results.append({"id": object_id, "point": point, "hovered": hovered.get("hovered"),
                "growth": growth, "hoverAmount": amount, "restoredScaleRatio": reset_ratio,
                "restoredHoverAmount": reset_amount, "restoredHovered": restored.get("hovered"),
                "settleMilliseconds": 350, "sampleAfterNextFrame": True,
                "timing": {"baseline": baseline["timing"], "hover": hovered["timing"],
                           "restore": restored["timing"]}, "pass": passed})
        final_snapshot = cdp.evaluate("""(async()=>{
          const timing=await window.__sceneWaitAndFrame(350);
          return {timing,...window.__universeDebug.snapshot()};
        })()""")
    finally:
        cdp.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 8, "y": 8})
        original = setup["original"]
        cdp.evaluate("window.__universeDebug.select(" + json.dumps(original["selected"]) + ");" +
                     "window.__universeDebug.setTime(" + json.dumps(original["elapsed"]) + ");")
        if not original["paused"]:
            cdp.evaluate("document.querySelector('.cosmos-pause').click()")
    return {"results": results, "finalSnapshot": final_snapshot,
            "pass": all(item["pass"] for item in results)}


def compare_body_metrics(metrics, baseline_report):
    """Report measured increases; visual design requests do not imply made-up thresholds."""
    if not baseline_report:
        return []
    baseline = json.loads(Path(baseline_report).read_text(encoding="utf-8"))
    comparisons = []
    targets = {"client", "launch", "forjadores", "satellite-0", "satellite-1", "satellite-2", "observatory"}
    previous = {tuple(item["viewport"]): {o["id"]: o for o in item["objects"]}
                for item in baseline.get("layoutMetrics", [])}
    for item in metrics:
        old = previous.get(tuple(item["viewport"]), {})
        for body in item["objects"]:
            prior = old.get(body["id"])
            if body["id"] not in targets or not prior or not prior.get("pixelRadius"):
                continue
            comparisons.append({"viewport": item["viewport"], "id": body["id"],
                "previousPixelRadius": prior["pixelRadius"], "pixelRadius": body["pixelRadius"],
                "radiusRatio": body["pixelRadius"] / prior["pixelRadius"]})
    return comparisons


def layout_checks(metrics):
    """Check desktop placement and prevent fixed-pixel UI on large displays."""
    checks = []
    for item in metrics:
        width, height = item["viewport"]
        if width <= 800:
            continue
        stage = item["stage"]
        launch = next((o for o in item["objects"] if o.get("view") == "launch" or
                       o["id"] in ("launch", "launchpad", "lanzamiento")), None)
        if launch:
            bounds = launch["bounds"]
            center_x = (bounds["left"] + bounds["right"]) / (2 * stage["w"])
            diameter = bounds["bottom"] - bounds["top"]
            checks.append({"viewport": [width, height], "check": "launch-far-left",
                           "centerXFraction": center_x, "pass": center_x <= .22})
            checks.append({"viewport": [width, height], "check": "launch-readable-size",
                           "projectedDiameter": diameter, "pass": diameter >= 90})
        else:
            checks.append({"viewport": [width, height], "check": "launch-present", "pass": False})
        constellation = item["views"].get("constellation")
        if constellation:
            center_x = (constellation["x"] + constellation["w"] / 2) / stage["w"]
            top = constellation["y"] / stage["h"]
            checks.append({"viewport": [width, height], "check": "constellation-top-center",
                           "centerXFraction": center_x, "topFraction": top,
                           "pass": .35 <= center_x <= .75 and 0 <= top <= .30})
        else:
            checks.append({"viewport": [width, height], "check": "constellation-present", "pass": False})
    normal = next((m for m in metrics if m["viewport"] == [1440, 900]), None)
    large = next((m for m in metrics if m["viewport"] == [2560, 1440]), None)
    if normal and large:
        normal_objects = {o["id"]: o for o in normal["objects"]}
        for body in large["objects"]:
            base = normal_objects.get(body["id"])
            if not base or not base["pixelRadius"]:
                continue
            ratio = body["pixelRadius"] / base["pixelRadius"]
            checks.append({"check": "large-screen-body-scale", "id": body["id"],
                           "ratio": ratio, "pass": ratio >= 1.60 - 1e-6})
        for name, size in large["fonts"].items():
            base = normal["fonts"].get(name)
            if base:
                ratio = size / base
                checks.append({"check": "large-screen-font-scale", "element": name,
                               "ratio": ratio, "pass": ratio >= 1.60 - 1e-6})
    return checks


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
    parser.add_argument("--hover", action="store_true", help="Check pointer hover growth, glow and restoration on all 12 bodies after 350ms settling plus the next rendered frame; record actual elapsed times")
    parser.add_argument("--baseline-report", help="Optional prior report.json for measured body-size comparisons")
    parser.add_argument("--sweep", action="store_true", help="Audit all selectable 3D bodies across a complete galactic orbit")
    parser.add_argument("--sweep-samples", type=int, default=61, help="Time samples including both orbital-cycle endpoints")
    parser.add_argument("--sweep-seconds", type=float, default=1500, help="Total simulated time for the visibility sweep")
    parser.add_argument("--resize-sweep", action="store_true", help="Audit 1440x900, 1920x1080, 2560x1440, 2560x1080 and 390x844; compare proportional sizing without relaunching Edge")
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
        # Managed Windows hosts may start the browser slowly before any page runs.
        deadline = time.monotonic() + 90
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
        cdp.call("Network.enable")
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
        deadline = time.monotonic() + 60
        while not cdp.evaluate("""(()=>{
            const ready=window.__universeDebug?.snapshot?.().assetsReady!==false;
            if(ready)window.__sceneFrameControl?.pause();
            return ready;
        })()"""):
            if time.monotonic() > deadline:
                diagnostics = cdp.evaluate("""({scene:window.__universeDebug?.snapshot?.(),
                    assets:document.querySelector('.orbital-realm')?.__planetMaterialSession?.getState(),
                    resources:performance.getEntriesByType('resource').map(r=>({name:r.name,
                        duration:r.duration,transferSize:r.transferSize,decodedBodySize:r.decodedBodySize})),
                    errors:window.__errors})""")
                diagnostics["networkEvents"] = [e for e in cdp.events
                    if e.get("method", "").startswith("Network.")]
                (artifacts / "asset-failure.json").write_text(json.dumps(diagnostics,
                    ensure_ascii=False, indent=2), encoding="utf-8")
                raise RuntimeError(f"Scene textures did not finish loading; see {artifacts / 'asset-failure.json'}")
            time.sleep(.2)
        time.sleep(1)
        before = cdp.evaluate("window.__sceneSnapshot()")
        hierarchy_before = cdp.evaluate("window.__universeDebug?.snapshot?.() ?? null")
        cdp.evaluate("window.__sceneFrameControl?.resume()")
        if args.advance:
            cdp.evaluate(f"window.__universeDebug?.advance?.({args.advance})")
        if args.click:
            cdp.evaluate("document.querySelector(" + json.dumps(args.click) + ")?.click()")
        if args.select:
            cdp.evaluate("window.__universeDebug?.select?.(" + json.dumps(args.select) + ")")
        time.sleep(args.seconds)
        after = cdp.evaluate("window.__sceneFrameControl?.pause();window.__sceneSnapshot()")
        hierarchy_after = cdp.evaluate("window.__universeDebug?.snapshot?.() ?? null")
        cdp.evaluate("window.__sceneFrameControl?.resume()")
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
        layout_measurements = []
        copy_checks = []
        if args.sweep or args.resize_sweep:
            layouts = [(args.width, args.height)]
            if args.resize_sweep:
                layouts += [(1440, 900), (1920, 1080), (2560, 1440), (2560, 1080), (390, 844)]
            for width, height in dict.fromkeys(layouts):
                if (width, height) != (args.width, args.height):
                    set_viewport(cdp, width, height)
                sweep = visibility_sweep(cdp, args.sweep_seconds, args.sweep_samples)
                layout_measurements.append(layout_metrics(cdp))
                copy_checks.append(visual_copy_checks(cdp))
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
        proportional_checks = layout_checks(layout_measurements)
        if not copy_checks:
            copy_checks.append(visual_copy_checks(cdp))
        body_comparisons = compare_body_metrics(layout_measurements, args.baseline_report)
        hover_report = hover_checks(cdp) if args.hover else None
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
              const nav=document.querySelector('.site-nav'),bodyCopy=document.body.innerText.toLocaleLowerCase('es');
              const header={epmFirst:nav?.firstElementChild?.classList.contains('nav-epm'),
                product:nav?.querySelector('.nav-product')?.innerText,
                feedbackButton:!!nav?.querySelector('.nav-feedback'),
                forbidden:['explora tu universo','continuar mi viaje','créditos de las superficies'].filter(x=>bodyCopy.includes(x))};
              openFeedback();const dialog=document.querySelector('#feedback-dialog'),form=dialog.querySelector('form');
              form.querySelector('input[value="5"]').checked=true;
              form.querySelector('#feedback-recommendation').value='Prueba de evaluación local';
              await saveFeedback({preventDefault(){},currentTarget:form});
              const evaluation={opened:dialog.open,saved:window.__fixtureWrites.some(x=>x.name==='universo_guardar_feedback')};
              await logoutParticipant();
              const access={name:!!document.querySelector('#name'),email:!!document.querySelector('#email'),
                adminLink:document.querySelector('.admin-entry')?.getAttribute('href')};
              return {results,header,evaluation,access,writes:window.__fixtureWrites.length,
                network:window.__networkAttempts,errors:window.__errors};
            })()""")
        report = {"before": before, "after": after, "hierarchyBefore": hierarchy_before,
                  "hierarchyAfter": hierarchy_after, "hierarchyChecks":hierarchy_checks,
                  "pauseCheck":pause_check, "visibilitySweeps":sweeps,
                  "layoutMetrics":layout_measurements, "layoutChecks":proportional_checks,
                  "visualCopyChecks":copy_checks, "bodySizeComparisons":body_comparisons,
                  "hoverChecks":hover_report,
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
                          "layoutChecks":proportional_checks,
                          "visualCopyChecks":copy_checks, "bodySizeComparisons":body_comparisons,
                          "hoverChecks":hover_report,
                          "visibilitySweeps":[{k:v for k,v in sweep.items() if k != "frames"} for sweep in sweeps],
                          "assetErrors": hierarchy_after.get("assetErrors",[]) if hierarchy_after else [],
                          "shaderErrors": hierarchy_after.get("shaderErrors",[]) if hierarchy_after else []}, ensure_ascii=True))
        integration_failed = integration and (integration["errors"] or integration["network"] or
            any(r.get("debug") or r.get("canvas") != 0 or not r.get("h1") for r in integration["results"] if r["phase"] == "activity") or
            any(not r.get("debug") or r.get("canvas") != 1 or r.get("stage") != 1 or r.get("fallback") for r in integration["results"] if r["phase"] == "map") or
            not integration["header"].get("epmFirst") or "—" not in (integration["header"].get("product") or "") or
            not integration["header"].get("feedbackButton") or integration["header"].get("forbidden") or
            not integration["evaluation"].get("opened") or not integration["evaluation"].get("saved") or
            not integration["access"].get("name") or not integration["access"].get("email") or
            integration["access"].get("adminLink") != "admin.html")
        hierarchy_failed = any(not c["parentTransformValid"] or not c["orbitalMotion"] for c in hierarchy_checks)
        if after.get("errors") or exceptions or console_errors or failed_resources or not after.get("calls") or (hierarchy_after and (hierarchy_after.get("shaderErrors") or hierarchy_after.get("assetErrors"))) or integration_failed or hierarchy_failed or (pause_check and not pause_check["pass"]) or any(not sweep["pass"] for sweep in sweeps) or any(not check["pass"] for check in proportional_checks) or any(not check["pass"] for check in copy_checks) or (hover_report and not hover_report["pass"]):
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

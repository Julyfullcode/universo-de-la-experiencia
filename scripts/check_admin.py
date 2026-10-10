"""Exercise the admin form in Edge with isolated API/CAPTCHA fixtures.

No production services or credentials are used. Run: python scripts/check_admin.py
"""
import functools
import http.server
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import urllib.request

from check_scene import CDP, stop_edge_profile_processes

ROOT = Path(__file__).resolve().parents[1]
STUB = r"""
window.__adminErrors=[];window.__adminCalls=[];window.__adminAuthenticated=false;window.__requireCaptcha=true;
window.addEventListener('error',e=>window.__adminErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.__adminErrors.push(String(e.reason)));
window.turnstile={render:(target,options)=>{target.textContent='Verificación local';options.callback('fixture-captcha');return 1;},reset:()=>{}};
window.fetch=async(url,options)=>{
 const action=String(url).split('/').pop(),body=JSON.parse(options.body||'{}');
 window.__adminCalls.push({action,body,headers:options.headers});
 let status=200,value={ok:true};
 if(action==='status')value={ok:true,authenticated:window.__adminAuthenticated,captcha_site_key:'fixture-site-key'};
 else if(action==='login'){
  if(window.__requireCaptcha){window.__requireCaptcha=false;status=403;value={code:'CAPTCHA_REQUIRED',message:'Completa la verificación',captcha_required:true};}
  else value={ok:true,mfa_required:true};
 }else if(action==='mfa'){
  if(body.code!=='123456'){status=401;value={code:'MFA_INVALID',message:'Código no válido'};}
  else window.__adminAuthenticated=true;
 }else if(action==='panel')value={resumen:{},embudo:[],participantes:[],feedback:[]};
 else if(action==='logout')window.__adminAuthenticated=false;
 return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','x-universe-admin':'1'}});
};
"""


def main():
    edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    if not edge.exists():
        raise RuntimeError("Microsoft Edge was not found")
    artifacts = Path(tempfile.mkdtemp(prefix="universo-admin-check-"))
    profile = artifacts / "edge-profile"

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    log = (artifacts / "edge.log").open("w", encoding="utf-8")
    process = subprocess.Popen([str(edge), "--headless=new", "--no-first-run", "--no-default-browser-check",
        "--disable-extensions", "--remote-debugging-port=0", "--remote-allow-origins=*",
        f"--user-data-dir={profile}", "about:blank"], stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    cdp = None
    try:
        deadline = time.monotonic() + 50
        while not (profile / "DevToolsActivePort").exists():
            if time.monotonic() > deadline:
                raise RuntimeError("Edge debugging port did not open")
            time.sleep(.2)
        port = int((profile / "DevToolsActivePort").read_text().splitlines()[0])
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
        cdp = CDP(next(item["webSocketDebuggerUrl"] for item in targets if item["type"] == "page"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call("Network.enable")
        cdp.call("Network.setBlockedURLs", {"urls": ["https://*"]})
        cdp.call("Page.addScriptToEvaluateOnNewDocument", {"source": STUB})
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
        cdp.call("Page.navigate", {"url": f"http://127.0.0.1:{server.server_port}/admin.html"})

        def wait(expression):
            deadline = time.monotonic() + 15
            while not cdp.evaluate(expression):
                if time.monotonic() > deadline:
                    raise AssertionError(f"Admin condition did not become true: {expression}")
                time.sleep(.1)

        wait("document.querySelector('#login-button')&&!document.querySelector('#login-button').disabled")
        submit = "document.querySelector('#admin-user').value='VPEUC';document.querySelector('#admin-password').value='fixture-password';document.querySelector('#login-form').requestSubmit();"
        cdp.evaluate(submit)
        wait("!document.querySelector('#admin-captcha').hidden&&!document.querySelector('#login-button').disabled")
        assert cdp.evaluate("document.querySelector('#admin-mfa-field').hidden")
        cdp.evaluate(submit)
        wait("!document.querySelector('#admin-mfa-field').hidden&&!document.querySelector('#login-button').disabled")
        assert cdp.evaluate("document.querySelector('#admin-user').disabled&&document.querySelector('#admin-password').disabled")
        cdp.evaluate("document.querySelector('#admin-mfa-code').value='111111';document.querySelector('#login-form').requestSubmit();")
        wait("document.querySelector('#login-message').textContent.includes('Código no válido')")
        assert cdp.evaluate("document.querySelector('#dashboard-view').hidden")
        cdp.evaluate("document.querySelector('#admin-mfa-code').value='123456';document.querySelector('#login-form').requestSubmit();")
        wait("!document.querySelector('#dashboard-view').hidden")
        assert cdp.evaluate("!sessionStorage.getItem('universo-experiencia.admin-session.v1')")
        assert cdp.evaluate("window.__adminCalls.every(call=>call.headers['X-Universo-Admin']==='1')")
        assert cdp.evaluate("window.__adminCalls.filter(call=>['panel','logout'].includes(call.action)).every(call=>Object.keys(call.body).length===0)")
        cdp.evaluate("document.querySelector('#logout-button').click()")
        wait("document.querySelector('#dashboard-view').hidden&&window.__adminCalls.some(call=>call.action==='logout')")
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        assert cdp.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        assert cdp.evaluate("window.__adminErrors.length===0"), cdp.evaluate("window.__adminErrors")
        print("Admin browser checks passed: CAPTCHA, MFA rejection/success, cookie-only session, logout and mobile layout.")
    finally:
        if cdp:
            try:
                cdp.call("Browser.close")
            except (OSError, RuntimeError):
                pass
            cdp.sock.close()
        if process.poll() is None:
            process.terminate()
        stop_edge_profile_processes(profile)
        log.close()
        server.shutdown()


if __name__ == "__main__":
    main()

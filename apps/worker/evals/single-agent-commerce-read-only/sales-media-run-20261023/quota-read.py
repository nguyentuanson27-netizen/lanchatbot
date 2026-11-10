import subprocess,os,json,sys,threading,queue
from pathlib import Path
binary=Path(os.environ['APPDATA'])/'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe'
p=subprocess.Popen([str(binary),'app-server'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8',creationflags=subprocess.CREATE_NO_WINDOW)
lines=queue.Queue()
def reader():
 for line in p.stdout:lines.put(line)
threading.Thread(target=reader,daemon=True).start()
def send(obj):p.stdin.write(json.dumps(obj)+'\n');p.stdin.flush()
def receive(id):
 while True:
  obj=json.loads(lines.get(timeout=25))
  if obj.get('id')==id:return obj
try:
 send({'id':1,'method':'initialize','params':{'clientInfo':{'name':'c3_read_only_quota','version':'1.0.0'}}});receive(1)
 send({'method':'initialized'})
 send({'id':2,'method':'account/rateLimits/read','params':{}})
 raw=receive(2); r=raw.get('result',{}); result={'ordinaryUsageAllowed':r.get('ordinaryUsageAllowed'),'rateLimits':{k:({a:b for a,b in v.items() if a in ['usedPercent','windowDurationMins']} if isinstance(v,dict) else v) for k,v in (r.get('rateLimits') or {}).items() if k in ['primary','secondary','limitReached','credits']},'providerGenerations':0}
 (Path(__file__).parent/'quota-read.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(result))
finally:
 p.terminate()
 try:p.wait(timeout=5)
 except subprocess.TimeoutExpired:p.kill();p.wait()

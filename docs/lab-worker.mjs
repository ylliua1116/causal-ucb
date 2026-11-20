/* CAUSAL-UCB Browser · browser Python worker. The original Python module is not edited. */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.mjs';

const CDN = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
let interpreter = null;
let initialized = false;

async function boot() {
  if (initialized) return;
  self.postMessage({type:'status',message:'Loading WebAssembly Python runtime from Pyodide CDN…'});
  interpreter = await loadPyodide({indexURL: CDN});
  self.postMessage({type:'status',message:'Loading NumPy and the original CAUSAL-UCB Python module…'});
  await interpreter.loadPackage('numpy');
  for (const name of ['causal_ucb_conditional.py','engine.py']) {
    const url = new URL(`./live-lab/${name}`, self.location.href);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Cannot load ${name}: HTTP ${resp.status}`);
    interpreter.FS.writeFile(`/home/pyodide/${name}`, await resp.text(), {encoding:'utf8'});
  }
  interpreter.runPython("import sys; sys.path.insert(0,'/home/pyodide'); import engine");
  initialized = true;
  self.postMessage({type:'status',message:'Python ready · evaluating real exploration trajectories…'});
}

self.onmessage = async ({data}) => {
  if (data?.type !== 'run') return;
  try {
    await boot();
    const request = JSON.stringify(data.params);
    interpreter.globals.set('live_request_json',request);
    let i=0;
    for (const method of data.methods) {
      i++;
      self.postMessage({type:'status',message:`Running ${method} (${i}/${data.methods.length}) · Python, seed ${data.params.seed}…`});
      interpreter.globals.set('live_method',method);
      const response = interpreter.runPython('engine.run_one(live_request_json,live_method)');
      self.postMessage({type:'method',result:JSON.parse(response),completed:i,total:data.methods.length});
    }
    self.postMessage({type:'done',count:i});
  } catch (e) {
    self.postMessage({type:'failure',message:String(e?.message || e),trace:String(e?.stack || '')});
  }
};

/* Sincronização voluntária e otimista: nunca substitui dados locais silenciosamente.
   Guarda a chave APENAS neste aparelho (localStorage), nunca no GitHub/exports.
*/
import {snapshot, replaceAll} from './db.js';

const E='travelbook.sync.endpoint', K='travelbook.sync.key', R='travelbook.sync.revision', D='travelbook.sync.dirty';
export const isConfigured = () => Boolean(localStorage.getItem(E) && localStorage.getItem(K));
export const isDirty = () => localStorage.getItem(D) === '1';
export const hasPaired = () => localStorage.getItem(R) !== null;
export const configuredEndpoint = () => localStorage.getItem(E) || '';
export function getSyncSummary() {
  return {configured:isConfigured(),endpoint:configuredEndpoint(),revision:localStorage.getItem(R),dirty:isDirty()};
}
export function markDirty() {
  localStorage.setItem(D,'1');
  window.dispatchEvent(new Event('travelbook-data-changed'));
}
export function saveSyncConfig(endpoint,key) {
  let url;try{url=new URL(endpoint);}catch{throw new Error('Endereço do Worker inválido.');}
  if(url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash)
    throw new Error('Indica um endereço HTTPS válido terminado em .workers.dev.');
  const base = `${url.origin}${url.pathname.replace(/\/+$/,'')}`;
  if(key && key.length < 24) throw new Error('A chave precisa de pelo menos 24 caracteres.');
  if(!key && (base !== localStorage.getItem(E) || !localStorage.getItem(K))) throw new Error('Introduz a chave privada de acesso para este servidor.');
  if(base !== localStorage.getItem(E)) { localStorage.removeItem(R); localStorage.setItem(D,'1'); }
  localStorage.setItem(E,base);
  if(key)localStorage.setItem(K,key);
}
export function disconnect() { [E,K,R].forEach(k=>localStorage.removeItem(k)); /* preservar dados locais */ }
function empty(data){ return !Object.values(data).some(rows => rows.length); }
async function api(method,data) {
  if(!navigator.onLine)throw new Error('Sem Internet. As alterações continuam guardadas neste dispositivo.');
  if(!isConfigured())throw new Error('Liga primeiro a Cloudflare nas opções.');
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),15000);
  try {
    const response = await fetch(`${localStorage.getItem(E)}/v1/state`, {
      method, headers: {'Accept':'application/json','Authorization':`Bearer ${localStorage.getItem(K)}`,...(data?{'Content-Type':'application/json'}:{})},
      ...(data?{body:JSON.stringify(data)}:{}), signal:controller.signal, cache:'no-store'
    });
    const result = await response.json().catch(()=>({error:'Resposta inválida do servidor.'}));
    if(!response.ok){
      if(response.status===409)throw new Error('CONFLICT: a viagem foi alterada noutro aparelho. Os teus dados locais foram mantidos.');
      throw new Error(result.message || result.error || `Erro HTTP ${response.status}`);
    }
    return result;
  }catch(e){if(e.name==='AbortError')throw new Error('O servidor não respondeu. Os teus dados locais estão seguros.');throw e;}
  finally{clearTimeout(timeout);}
}
let working;
async function performSync(mode){
  const counterAtStart=localStorage.getItem('travelbook.sync.counter');
  const remote = await api('GET');
  const local = await snapshot();
  const baseValue = localStorage.getItem(R);
  const paired = baseValue !== null;
  const base = Number(baseValue);
  if(mode==='receive') {
    if(localStorage.getItem('travelbook.sync.counter')!==counterAtStart)throw new Error('Os dados mudaram durante a sincronização. Tenta novamente.');
    await replaceAll(remote.data,{remote:true});
    localStorage.setItem(R,String(remote.revision));
    localStorage.removeItem(D);
    return {kind:'download',revision:remote.revision};
  }
  if(mode==='send') {
    const result=await api('PUT',{expectedRevision:remote.revision,data:local});
    localStorage.setItem(R,String(result.revision));
    if(counterAtStart===localStorage.getItem('travelbook.sync.counter'))localStorage.removeItem(D);
    return {kind:'upload',revision:result.revision};
  }
  if(!paired){
    if(empty(local)&&empty(remote.data)){localStorage.setItem(R,String(remote.revision));localStorage.removeItem(D);return {kind:'equal'};}
    if(empty(local)){
      if(localStorage.getItem('travelbook.sync.counter')!==counterAtStart)throw new Error('Os dados locais mudaram durante a sincronização. Tenta novamente.');
      await replaceAll(remote.data,{remote:true});localStorage.setItem(R,String(remote.revision));localStorage.removeItem(D);
      return {kind:'download',revision:remote.revision};
    }
    if(empty(remote.data)&&remote.revision===0) return {kind:'need-send'};
    return {kind:'need-choice'};
  }
  if(remote.revision!==base && isDirty())return {kind:'conflict',remoteRevision:remote.revision,localRevision:base};
  if(isDirty()){
    const result=await api('PUT',{expectedRevision:base,data:local});
    localStorage.setItem(R,String(result.revision));
    if(counterAtStart===localStorage.getItem('travelbook.sync.counter'))localStorage.removeItem(D);
    return {kind:'upload',revision:result.revision};
  }
  if(remote.revision!==base){
    if(localStorage.getItem('travelbook.sync.counter')!==counterAtStart)throw new Error('Os dados locais mudaram durante a sincronização. Tenta novamente.');
    await replaceAll(remote.data,{remote:true});
    localStorage.setItem(R,String(remote.revision));
    return {kind:'download',revision:remote.revision};
  }
  return {kind:'equal',revision:base};
}
export async function syncNow(mode='normal'){
  if(working) return working;
  working = performSync(mode).finally(()=>{working=null;});
  return working;
}

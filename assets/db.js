/* IndexedDB: dados locais persistentes; a sincronização remota é facultativa. */
const NAME = 'travelbook-v1';
const VERSION = 1;
const TABLES = ['trips', 'places', 'visits', 'expenses'];
let promise;

function connect() {
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const table of TABLES) {
        if (!db.objectStoreNames.contains(table)) {
          const store = db.createObjectStore(table, { keyPath: 'id' });
          if (table !== 'trips') store.createIndex('tripId', 'tripId', { unique: false });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return promise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function all(table) {
  const db = await connect();
  return requestToPromise(db.transaction(table).objectStore(table).getAll());
}
function noteChanged() {
  localStorage.setItem('travelbook.sync.dirty','1');
  localStorage.setItem('travelbook.sync.counter',String(Number(localStorage.getItem('travelbook.sync.counter')||'0')+1));
  window.dispatchEvent(new Event('travelbook-data-changed'));
}
export async function put(table, record) {
  const db = await connect();
  const tx = db.transaction(table,'readwrite');
  tx.objectStore(table).put(record);
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  noteChanged();
}

export async function remove(table, id) {
  const db=await connect();
  const tx=db.transaction(table,'readwrite');
  tx.objectStore(table).delete(id);
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  noteChanged();
}

export async function snapshot() {
  const rows = await Promise.all(TABLES.map(t => all(t)));
  return Object.fromEntries(TABLES.map((table, index) => [table, rows[index]]));
}
export async function replaceAll(data,{remote=false}={}) {
  const db = await connect();
  const tx = db.transaction(TABLES, 'readwrite');
  for (const table of TABLES) {
    const store = tx.objectStore(table);
    store.clear();
    for (const row of data[table]) store.put(row);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {if(!remote)noteChanged();resolve();};
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transação cancelada'));
  });
}
export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function validateBackup(data) {
  if (!data || data.format !== 'travelbook-v1' || !data.data || !TABLES.every(t => Array.isArray(data.data[t]))) {
    throw new Error('Ficheiro incompatível com a TravelBook v1.');
  }
  for (const table of TABLES) {
    for (const row of data.data[table]) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string') throw new Error(`Registo inválido em ${table}.`);
    }
  }
  return data.data;
}

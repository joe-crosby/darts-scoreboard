// Minimal IndexedDB wrapper for storing games & history
const DB_NAME = 'darts-db';
const DB_VERSION = 3;

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('history')) db.createObjectStore('history', {keyPath:'id'});
      if(!db.objectStoreNames.contains('games')) db.createObjectStore('games', {keyPath:'id'});
      if(!db.objectStoreNames.contains('users')) db.createObjectStore('users', {keyPath:'id'});
      if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', {keyPath:'id'});
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function put(store, value){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readwrite');
    const s = tx.objectStore(store);
    const r = s.put(value);
    r.onsuccess = ()=> resolve(r.result);
    r.onerror = ()=> reject(r.error);
  });
}

async function getAll(store){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.getAll();
    r.onsuccess = ()=> resolve(r.result);
    r.onerror = ()=> reject(r.error);
  });
}

async function get(store, key){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.get(key);
    r.onsuccess = ()=> resolve(r.result);
    r.onerror = ()=> reject(r.error);
  });
}

export async function saveHistory(record){
  if(!record.id) record.id = Date.now().toString();
  await put('history', record);
  return record.id;
}

export async function listHistory(){
  return getAll('history');
}

export async function saveGameSnapshot(game){
  if(!game.id) game.id = Date.now().toString();
  await put('games', game);
  return game.id;
}

export async function listGames(){
  return getAll('games');
}

export async function deleteGameSnapshot(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('games','readwrite');
    const store = tx.objectStore('games');
    const request = store.delete(id);
    request.onsuccess = ()=> resolve();
    request.onerror = ()=> reject(request.error);
  });
}

export async function saveKnownUsers(users){
  const names = Array.isArray(users) ? users : [];
  await put('users', { id: 'known-users', names });
}

export async function listKnownUsers(){
  const record = await get('users', 'known-users');
  return Array.isArray(record?.names) ? record.names : [];
}

export async function saveAppSetting(id, value){
  await put('settings', { id, value });
}

export async function getAppSetting(id){
  const record = await get('settings', id);
  return record?.value;
}

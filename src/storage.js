const database = () => new Promise((resolve,reject) => {
  const request=indexedDB.open('audita-vault-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('state');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('Armazenamento local indisponível.'));
});
async function operation(mode,callback) {
  const db=await database();
  try {
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction('state',mode);
      const request=callback(transaction.objectStore('state'));
      transaction.oncomplete=()=>resolve(request.result);
      transaction.onabort=transaction.onerror=()=>reject(new Error('Não foi possível salvar os dados neste dispositivo.'));
    });
  } finally {db.close();}
}
export const load=()=>operation('readonly',store=>store.get('audits'));
export const save=value=>operation('readwrite',store=>store.put(structuredClone(value),'audits'));
export const clear=()=>operation('readwrite',store=>store.clear());

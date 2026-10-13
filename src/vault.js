const encoder=new TextEncoder();
export const iterations=600000;
const base64=bytes=>{
  let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text);
};
const bytes=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export async function derive(password,salt) {
  if(typeof password!=='string'||password.length<12)throw new Error('Use uma senha local com pelo menos 12 caracteres.');
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(value,key,salt) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(value)));
  return {format:'audita-vault',version:1,iterations,salt:base64(salt),iv:base64(iv),data:base64(new Uint8Array(data))};
}
export async function open(envelope,password) {
  if(envelope?.format!=='audita-vault'||envelope.version!==1||envelope.iterations!==iterations||typeof envelope.data!=='string'||envelope.data.length>100*1024*1024)throw new Error('Backup criptografado inválido.');
  const salt=bytes(envelope.salt),iv=bytes(envelope.iv);
  if(salt.length!==16||iv.length!==12)throw new Error('Backup criptografado inválido.');
  const key=await derive(password,salt);
  try {
    const data=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,bytes(envelope.data));
    return {value:JSON.parse(new TextDecoder().decode(data)),key,salt};
  } catch {throw new Error('Senha incorreta ou backup alterado.');}
}

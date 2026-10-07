import {getSupabase} from './supabase';
export class HttpError extends Error{constructor(message:string,public status:number,public data:Record<string,unknown>={}){super(message);}}
const usesNeon=import.meta.env.VITE_BACKEND_PROVIDER==='neon';
export async function api<T>(path:string,body?:unknown):Promise<T>{
 if(!navigator.onLine)throw new Error('Sin señal. Los cambios quedan en este teléfono.');
 if(!usesNeon&&path==='auth/login'){const input=body as {email:string,password:string};const result=await getSupabase().auth.signInWithPassword(input);if(result.error)throw new HttpError('Correo o contraseña incorrectos.',401);return {ok:true} as T;}
 if(!usesNeon&&path==='auth/logout'){await getSupabase().auth.signOut({scope:'local'});return {ok:true} as T;}
 const session=usesNeon?null:(await getSupabase().auth.getSession()).data.session;
 const response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(session?{Authorization:'Bearer '+session.access_token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin'});
 const data=await response.json().catch(()=>({error:'El servidor no entregó una respuesta válida.'}));if(!response.ok)throw new HttpError(data.error||'No se pudo conectar.',response.status,data);
 if(data.session){const result=await getSupabase().auth.setSession(data.session);if(result.error)throw result.error;}
 return data as T;
}
export async function remoteFile(id:string,thumbnail=false,download=false){const result=await api<{url:string}>('media/'+id+(thumbnail?'/thumbnail':'')+(download?'?download=1':''));return result.url;}

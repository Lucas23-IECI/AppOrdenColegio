export type EntryLink={setupKey:string;inviteCode:string};
const key='orden-entry-link';
export function readEntryLink():EntryLink {
 const fragment=new URLSearchParams(location.hash.slice(1));
 const fromUrl={setupKey:fragment.get('setup')??'',inviteCode:fragment.get('invite')??''};
 if(fromUrl.setupKey||fromUrl.inviteCode){try{sessionStorage.setItem(key,JSON.stringify(fromUrl));}catch{}return fromUrl;}
 try{const stored=JSON.parse(sessionStorage.getItem(key)??'null');if(stored&&typeof stored.setupKey==='string'&&typeof stored.inviteCode==='string')return stored;}catch{}
 return {setupKey:'',inviteCode:''};
}
export function clearEntryLink(){try{sessionStorage.removeItem(key);}catch{}}

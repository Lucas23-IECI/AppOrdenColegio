import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readEntryLink,clearEntryLink} from '../lib/auth-entry';

test('el enlace de instalación sobrevive a una recarga de la misma pestaña y se elimina tras el ingreso',()=>{
 const originalLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
 const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 const values=new Map<string,string>();const location={hash:'#setup=clave-ficticia'};
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
 Object.defineProperty(globalThis,'location',{configurable:true,value:location});
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:storage});
 try{
  assert.deepEqual(readEntryLink(),{setupKey:'clave-ficticia',inviteCode:''});
  location.hash='';assert.equal(readEntryLink().setupKey,'clave-ficticia');
  location.hash='#invite=invitacion-nueva';assert.deepEqual(readEntryLink(),{setupKey:'',inviteCode:'invitacion-nueva'});
  location.hash='';clearEntryLink();assert.deepEqual(readEntryLink(),{setupKey:'',inviteCode:''});
  values.set('orden-entry-link','invalid JSON');assert.deepEqual(readEntryLink(),{setupKey:'',inviteCode:''});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get:()=>{throw new Error('Storage unavailable');}});
  location.hash='#setup=clave-temporal';assert.equal(readEntryLink().setupKey,'clave-temporal');assert.doesNotThrow(clearEntryLink);
 }finally{
  if(originalLocation)Object.defineProperty(globalThis,'location',originalLocation);else Reflect.deleteProperty(globalThis,'location');
  if(originalStorage)Object.defineProperty(globalThis,'sessionStorage',originalStorage);else Reflect.deleteProperty(globalThis,'sessionStorage');
 }
});

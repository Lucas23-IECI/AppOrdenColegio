import {type Room, type Phase, type CheckState, uuid} from './model';

export function reopenInspection<T extends Room>(room:T,phase:Phase):T {
 const clear=(stage:Room['reception'])=>({...stage,confirmedAt:null,confirmedBy:null});
 return {...room,[phase]:clear(room[phase]),...(phase==='reception'?{return:clear(room.return)}:{})};
}

export function addInventoryItem<T extends Room>(room:T,name:string):T {
 const clean=validateName(room,name);
 if(room.items.length>=150)throw new Error('El inventario admite hasta 150 elementos.');
 return {...reopenInspection(room,'reception'),items:[...room.items,{id:uuid(),name:clean,reception:null,return:null}]};
}

function validateName(room:Room,name:string,exceptId?:string){
 const clean=name.trim();
 if(!clean||clean.length>100)throw new Error('Escribe un nombre de 1 a 100 caracteres.');
 if(room.items.some(item=>item.id!==exceptId&&item.name.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))throw new Error('Ese elemento ya está en el inventario.');
 return clean;
}
export function renameInventoryItem<T extends Room>(room:T,id:string,name:string):T {
 if(!room.items.some(item=>item.id===id))throw new Error('El elemento ya no está en este inventario.');
 const clean=validateName(room,name,id);
 if(room.items.find(item=>item.id===id)!.name===clean)return room;
 return {...reopenInspection(room,'reception'),items:room.items.map(item=>item.id===id?{...item,name:clean}:item)};
}
export function removeInventoryItem<T extends Room>(room:T,id:string):T {
 if(!room.items.some(item=>item.id===id))return room;
 return {...reopenInspection(room,'reception'),items:room.items.filter(item=>item.id!==id)};
}
export function duplicateInventoryItem<T extends Room>(room:T,id:string):T {
 const source=room.items.find(item=>item.id===id);if(!source)throw new Error('No se encontró el elemento.');
 let n=1,name='';do{const suffix=n===1?' (copia)':` (copia ${n})`;name=source.name.slice(0,100-suffix.length)+suffix;n++;}while(room.items.some(item=>item.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')));
 return addInventoryItem(room,name);
}
export function copyInventoryNames<T extends Room>(room:T,source:Room):T {
 const names=new Set(room.items.map(item=>item.name.toLocaleLowerCase('es')));
 const additions=source.items.filter(item=>!names.has(item.name.toLocaleLowerCase('es')));
 if(!additions.length)throw new Error('Todos esos elementos ya están en este inventario.');
 let result=room;for(const item of additions)result=addInventoryItem(result,item.name);
 return result;
}
export function toggleCondition<T extends Room>(room:T,phase:Phase,name:string,value:Exclude<CheckState,'pending'>):T {
 if(room[phase].confirmedAt)throw new Error('Abre una corrección antes de cambiar una revisión confirmada.');
 if(!(name in room[phase].checks))throw new Error('No existe esa revisión.');
 return {...room,[phase]:{...room[phase],checks:{...room[phase].checks,[name]:room[phase].checks[name]===value?'pending':value}}};
}

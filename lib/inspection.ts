import {type Room, type Phase, uuid} from './model';

export function reopenInspection<T extends Room>(room:T,phase:Phase):T {
 const clear=(stage:Room['reception'])=>({...stage,confirmedAt:null,confirmedBy:null});
 return {...room,[phase]:clear(room[phase]),...(phase==='reception'?{return:clear(room.return)}:{})};
}

export function addInventoryItem<T extends Room>(room:T,name:string):T {
 const clean=name.trim();
 if(!clean)throw new Error('Escribe el nombre del elemento.');
 if(room.items.some(item=>item.name.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))throw new Error('Ese elemento ya está en el inventario.');
 return {...reopenInspection(room,'reception'),items:[...room.items,{id:uuid(),name:clean,reception:null,return:null}]};
}

import type {Media} from './model';
export const editableMediaFields=(m:Media)=>({name:m.name,note:m.note,category:m.category,deleted:!!m.deleted});
export const mediaPending=(m:Media)=>!!m.metaDirty||!m.deleted&&m.status!=='ready';
export function mergeMedia(local:Media|undefined,remote:Media):Media {
 return {...local,...remote,...(local?.metaDirty?{...editableMediaFields(local),metaDirty:true}:{}),status:'ready'};
}

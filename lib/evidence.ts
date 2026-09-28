import type {Media} from './model';
export type EvidencePair={reception:Media;returned:Media};
export function comparisonPairs(media:Media[]):EvidencePair[]{
 const photos=media.filter(m=>!m.deleted&&m.mime.startsWith('image/')),byId=new Map(photos.map(m=>[m.id,m]));
 return photos.flatMap(returned=>{const reception=returned.comparisonId?byId.get(returned.comparisonId):undefined;return returned.phase==='return'&&reception?.phase==='reception'&&reception.roomId===returned.roomId?[{reception,returned}]:[];});
}
export function validateComparison(returned:Media,reception:Media){
 if(returned.deleted||reception.deleted||returned.phase!=='return'||reception.phase!=='reception'||returned.roomId!==reception.roomId||!returned.mime.startsWith('image/')||!reception.mime.startsWith('image/'))throw new Error('Elige una foto de recepción y otra de devolución del mismo espacio.');
}
export function backupLabel(media:Media){return media.status==='ready'?(media.metaDirty?'Original respaldado · cambios pendientes':'Respaldado'):media.status==='uploading'?`Subiendo ${media.progress??0}%`:media.status==='error'?'Carga interrumpida · original en este equipo':'Solo en este equipo';}
export function sortedEvidence(media:Media[],order='oldest'){return [...media].sort((a,b)=>{const value=a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);return order==='newest'?-value:value;});}

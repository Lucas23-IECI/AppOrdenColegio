import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeMedia,mediaPending} from '../lib/media-state';
import {auditChanges,auditCsv,auditContext,type AuditEntry} from '../lib/audit';
import type {Media} from '../lib/model';
const remote:Media={id:'1',roomId:'2',phase:'reception',name:'original.jpg',mime:'image/jpeg',size:10,createdAt:'2026-01-01',author:'Persona',note:'',category:'General',status:'ready'};
test('sincronizar conserva ediciones y papelera local pendientes',()=>{
 const local={...remote,name:'Nombre nuevo',note:'Nota',deleted:true,metaDirty:true};const merged=mergeMedia(local,remote);assert.equal(merged.deleted,true);assert.equal(merged.name,'Nombre nuevo');assert.ok(mediaPending(merged));assert.equal(mediaPending({...local,metaDirty:false,status:'pending'}),false);
 assert.equal(mergeMedia({...remote,metaDirty:false},{...remote,deleted:true}).deleted,true);
});
test('la auditoría identifica el espacio y la etapa de una foto, incluso al eliminarla',()=>{
 const entry:AuditEntry={id:2,created_at:'2026-01-01',category:'files',action:'deleted',entity_id:'file',entity_name:'Foto',actor_id:null,actor_name:'Encargado',legacy:false,before_data:{roomId:'sala',phase:'return'},after_data:null};
 assert.deepEqual(auditContext(entry,{sala:'Colegio / Biblioteca'}),{room:'Colegio / Biblioteca',phase:'Devolución'});
 const csv=auditCsv([entry],{sala:'Colegio / Biblioteca'});assert.ok(csv.includes('Colegio / Biblioteca'));assert.ok(csv.includes('Devolución'));
});
test('auditoría describe diferencias de inventario y protege las celdas del CSV',()=>{
 const entry:AuditEntry={id:1,created_at:'2026-01-01',category:'spaces',action:'updated',entity_id:'1',entity_name:'=SUM(A1)',actor_id:null,actor_name:'Encargado',legacy:false,before_data:{items:[{id:'s',name:'Sillas',reception:30,return:null}],revision:1},after_data:{items:[{id:'s',name:'Sillas',reception:28,return:null}],revision:2}};
 assert.deepEqual(auditChanges(entry),[{field:'Inventario / Sillas / Recepción',before:'30',after:'28'}]);assert.ok(auditCsv([entry]).includes("'=SUM(A1)"));
});

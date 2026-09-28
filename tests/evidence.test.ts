import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparisonPairs,validateComparison,backupLabel,sortedEvidence} from '../lib/evidence';
import {defaultPdfOptions,reportEvidence} from '../lib/report-options';
import type {Media} from '../lib/model';
const photo=(id:string,patch:Partial<Media>={}):Media=>({id,roomId:'sala',phase:'reception',mime:'image/jpeg',name:id,size:42,status:'ready',createdAt:'2026-09-28',author:'Persona',category:'General',note:'',...patch});
const before=photo('before'),after=photo('after',{phase:'return',comparisonId:before.id});
test('pairs require explicit links, matching room, correct phases and visible photos',()=>{
 assert.equal(comparisonPairs([before,after]).length,1);
 for(const invalid of [{roomId:'other'},{deleted:true},{mime:'video/mp4'},{phase:'return' as const}]){assert.equal(comparisonPairs([{...before,...invalid},after]).length,0);assert.throws(()=>validateComparison(after,{...before,...invalid}));}
 assert.equal(comparisonPairs([before,{...after,comparisonId:undefined}]).length,0);
});
test('PDF comparisons are opt-in and empty selections never silently include every photo',()=>{
 assert.equal(reportEvidence([before,after],'comparison',defaultPdfOptions()).pairs.length,0);
 const options={includePhotos:false,includeComparison:true,selectedComparisonIds:[after.id]};
 assert.deepEqual(reportEvidence([before,after],'comparison',options),{photos:[],pairs:[{reception:before,returned:after}]});
 assert.equal(reportEvidence([before,after],'reception',options).pairs.length,0);
 assert.deepEqual(reportEvidence([before,after],'comparison',{includePhotos:true,includeComparison:true,selectedPhotoIds:[],selectedComparisonIds:[]}),{photos:[],pairs:[]});
});
test('backup state distinguishes original from unsynced edits and gallery has stable order',()=>{
 assert.match(backupLabel({...after,metaDirty:true}),/cambios pendientes/);
 assert.equal(sortedEvidence([photo('b'),photo('a')])[0].id,'a');
});

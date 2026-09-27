import type {Room,Media,EventInfo,Phase} from './model';
import {dateLabel,phaseTitle} from './model';
import {fileBlob} from './local-store';
import {downloadBlob} from './media-tools';
export type ReportKind='comparison'|'reception'|'return';
const number=(value:number|null)=>value===null?'Sin registrar':String(value);
const labels:Record<string,string>={pending:'Sin revisar',ok:'Revisado sin observaciones',issue:'Con observaciones',na:'No corresponde'};
export function reportTitle(kind:ReportKind){return kind==='comparison'?'Informe de recepción y devolución':kind==='reception'?'Acta de recepción':'Acta de devolución';}
export function makeText(rooms:Room[],media:Media[],event:EventInfo,kind:ReportKind){
 const lines=[reportTitle(kind).toUpperCase(),event.name,event.institution,event.location,'Emitido: '+dateLabel(new Date().toISOString()),'Coordinador: '+(event.coordinator||'Sin registrar'),'ESTADO: BORRADOR DE REVISIÓN',''];
 for(const r of rooms){lines.push(r.site+' / '+r.name+(r.sector?' / '+r.sector:''),'Responsable: '+(r.responsible||'Sin asignar'));
 for(const i of r.items){let line=i.name+': ';if(kind!=='return')line+='recepción '+number(i.reception);if(kind==='comparison')line+='; ';if(kind!=='reception')line+='devolución '+number(i.return);if(kind==='comparison'&&i.reception!==null&&i.return!==null)line+='; diferencia '+(i.return-i.reception);lines.push(line);}
 for(const phase of (kind==='comparison'?['reception','return']:[kind]) as Phase[]){lines.push(phaseTitle(phase)+': '+(r[phase].confirmedAt?'Revisada por '+r[phase].confirmedBy+' · '+dateLabel(r[phase].confirmedAt):'Revisión pendiente'));Object.entries(r[phase].checks).forEach(([k,v])=>lines.push('  '+k+': '+labels[v]));lines.push('Observaciones: '+(r[phase].notes||'Sin registrar.'));const files=media.filter(m=>m.roomId===r.id&&m.phase===phase&&!m.deleted);for(const f of files)lines.push('Archivo '+f.id+': '+f.name+' · '+(f.status==='ready'?'Respaldado':'Pendiente de respaldo')+(f.note?' · '+f.note:''));}
 lines.push('');}
 lines.push('Alcance: '+rooms.length+' espacio(s).','Los campos sin registrar no equivalen a conformidad.','Aceptación por parte del colegio: no registrada en la aplicación.','Firma de quien entrega: __________________________','Firma de quien recibe: __________________________');return lines.join('\n');
}
async function original(m:Media){const blob=await fileBlob(m.id);if(blob)return blob;if(m.status!=='ready')throw new Error('Falta el archivo '+m.name+' en este teléfono.');const response=await fetch('/api/media/'+m.id);if(!response.ok)throw new Error('No se pudo descargar '+m.name);return response.blob();}
async function dataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
export async function exportPdf(rooms:Room[],media:Media[],event:EventInfo,kind:ReportKind,photos:boolean){
 const {jsPDF}=await import('jspdf');const doc=new jsPDF({unit:'mm',format:'a4'});const margin=18;let y=20;let page=1;
 const clean=(s:string)=>s.replace(/→/g,' > ').replace(/·/g,' - ');
 function footer(){doc.setFontSize(8);doc.setTextColor(100);doc.text('Orden Colegio | '+event.location+' | Borrador',margin,287);doc.text(String(page),192,287,{align:'right'});}
 function next(){footer();doc.addPage();page++;y=20;}
 function line(text:string,size=10,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(25,34,52);const rows=doc.splitTextToSize(clean(text),174);for(const row of rows){if(y>270)next();doc.text(row,margin,y);y+=size*.48;}y+=2;}
 line(reportTitle(kind),19,true);line(event.name,12,true);line(event.institution+' | '+event.location);line('Borrador - Emitido '+dateLabel(new Date().toISOString()),9);line('Coordinador: '+(event.coordinator||'Sin registrar'));y+=3;
 for(const r of rooms){if(y>220)next();line(r.site+' / '+r.name,14,true);line('Responsable: '+(r.responsible||'Sin asignar'),9);
 for(const item of r.items){line(item.name+': '+(kind!=='return'?'Recepción '+number(item.reception):'')+(kind==='comparison'?' / ':'')+(kind!=='reception'?'Devolución '+number(item.return):''));}
 for(const phase of (kind==='comparison'?['reception','return']:[kind]) as Phase[]){line(phaseTitle(phase),11,true);line('Revisión: '+(r[phase].confirmedAt?dateLabel(r[phase].confirmedAt)+' / '+r[phase].confirmedBy:'Pendiente'),9);Object.entries(r[phase].checks).forEach(([k,v])=>line(k+': '+labels[v],9));line('Observaciones: '+(r[phase].notes||'Sin registrar.'),10);}
 const files=media.filter(m=>m.roomId===r.id&&!m.deleted&&(kind==='comparison'||m.phase===kind));
 if(files.length)line('Evidencias ('+files.length+')',11,true);
 for(const m of files){line(phaseTitle(m.phase)+' / '+m.name+' / '+(m.status==='ready'?'Respaldado':'Pendiente de respaldo'),9);line('ID: '+m.id,8);if(m.note)line(m.note,9);
 if(photos&&m.mime.startsWith('image/')){try{let b=await fileBlob(m.id+':thumbnail');if(!b&&m.thumbnailReady){const res=await fetch('/api/media/'+m.id+'/thumbnail');if(res.ok)b=await res.blob();}if(!b)b=await original(m);const data=await dataUrl(b);const props=doc.getImageProperties(data);const width=Math.min(150,props.width);const height=Math.min(90,width*props.height/props.width);const adjustedWidth=height*props.width/props.height;if(y+height>270){next();line(r.name+' / '+phaseTitle(m.phase)+' / '+m.name,10,true);line('ID: '+m.id,8);}doc.addImage(data,props.fileType,margin,y,adjustedWidth,height);y+=height+6;}catch{line('Imagen no incluida: conservar el archivo original indicado en el índice.',9);}}
 }y+=7;}
 line('Los campos sin registrar no equivalen a conformidad.',10,true);line('Aceptación del colegio: no registrada en la aplicación.',10);y+=8;line('Entrega: ____________________    Recibe: ____________________',10);footer();doc.save('OrdenColegio-'+kind+'-'+new Date().toISOString().slice(0,10)+'.pdf');
}
const safe=(s:string)=>s.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,100);
export async function exportEvidence(rooms:Room[],media:Media[],event:EventInfo,onProgress:(s:string)=>void){
 const selected=media.filter(m=>!m.deleted&&rooms.some(r=>r.id===m.roomId));const size=selected.reduce((a,m)=>a+m.size,0);if(size>300*1024*1024)throw new Error('Este respaldo supera 300 MB. Exporta un espacio a la vez o descarga los videos desde la galería.');
 const {zipSync,strToU8}=await import('fflate');const files:Record<string,Uint8Array>={'informe.txt':strToU8(makeText(rooms,selected,event,'comparison')),'registro.json':strToU8(JSON.stringify({event,rooms,media:selected,exportedAt:new Date().toISOString()},null,2))};
 for(let n=0;n<selected.length;n++){const m=selected[n];const r=rooms.find(r=>r.id===m.roomId)!;onProgress('Preparando '+(n+1)+' de '+selected.length);files[safe(r.site)+'/'+safe(r.name)+'/'+phaseTitle(m.phase)+'/'+m.id+'-'+safe(m.name)]=new Uint8Array(await (await original(m)).arrayBuffer());}
 const bytes=zipSync(files,{level:0});downloadBlob(new Blob([bytes as BlobPart],{type:'application/zip'}),'OrdenColegio-respaldo.zip');
}

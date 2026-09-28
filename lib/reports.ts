import {remoteFile} from './http';
import type {Room,Media,EventInfo,Phase} from './model';
import {dateLabel,phaseTitle} from './model';
import {fileBlob} from './local-store';
import {downloadBlob} from './media-tools';
import {reportEvidence,type PdfEvidenceOptions} from './report-options';
import {backupLabel} from './evidence';
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
async function original(m:Media){const blob=await fileBlob(m.id);if(blob)return blob;if(m.status!=='ready')throw new Error('Falta el archivo '+m.name+' en este teléfono.');const response=await fetch(await remoteFile(m.id));if(!response.ok)throw new Error('No se pudo descargar '+m.name);return response.blob();}
export async function exportPdf(rooms:Room[],media:Media[],event:EventInfo,kind:ReportKind,options:boolean|PdfEvidenceOptions){
 const selection=reportEvidence(media,kind,typeof options==='boolean'?{includePhotos:options,includeComparison:false}:options);
 const photoIds=new Set(selection.photos.map(m=>m.id));
 const {jsPDF}=await import('jspdf');const doc=new jsPDF({unit:'mm',format:'a4'});const margin=18;let y=20;let page=1;
 const clean=(s:string)=>s.replace(/→/g,' > ').replace(/·/g,' - ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-');
 function footer(){doc.setFontSize(8);doc.setTextColor(100);doc.text('Orden Colegio | '+event.location+' | Borrador',margin,287);doc.text(String(page),192,287,{align:'right'});}
 function next(){footer();doc.addPage();page++;y=20;}
 function line(text:string,size=10,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(25,34,52);const rows=doc.splitTextToSize(clean(text),174);for(const row of rows){if(y>270){next();doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(25,34,52);}doc.text(row,margin,y);y+=size*.48;}y+=2;}
 // Normalize browser-readable originals to JPEG without changing stored evidence.
 const images=new Map<string,Promise<{data:string;width:number;height:number;preview:boolean}|null>>();
 function picture(m:Media){let pending=images.get(m.id);if(pending)return pending;pending=(async()=>{let b:Blob|undefined,preview=false;try{b=await original(m);}catch{/* A cached preview can still document which image was selected. */}if(!b){preview=true;b=await fileBlob(m.id+':thumbnail');if(!b&&m.thumbnailReady){try{const response=await fetch(await remoteFile(m.id,true));if(response.ok)b=await response.blob();}catch{/* Missing evidence gets an explicit placeholder below. */}}}if(!b)return null;
  const url=URL.createObjectURL(b);try{return await new Promise<{data:string;width:number;height:number;preview:boolean}|null>(resolve=>{const image=new Image();let done=false;const finish=(value:{data:string;width:number;height:number;preview:boolean}|null)=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;resolve(value);};const timer=setTimeout(()=>finish(null),15000);image.onload=()=>{try{const scale=Math.min(1,2000/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)return finish(null);context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);finish({data:canvas.toDataURL('image/jpeg',.9),width:canvas.width,height:canvas.height,preview});}catch{finish(null);}};image.onerror=()=>finish(null);image.src=url;});}finally{URL.revokeObjectURL(url);}
  })();images.set(m.id,pending);return pending;}
 function framed(image:Awaited<ReturnType<typeof picture>>,x:number,top:number,width:number,height:number){doc.setDrawColor(205);doc.setFillColor(247,247,244);doc.rect(x,top,width,height,'FD');if(image){const scale=Math.min(width/image.width,height/image.height),w=image.width*scale,h=image.height*scale;doc.addImage(image.data,'JPEG',x+(width-w)/2,top+(height-h)/2,w,h);}else{doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(70);doc.text(doc.splitTextToSize('Imagen no disponible. Consultar el original identificado debajo.',width-10),x+5,top+height/2);}}
 line(reportTitle(kind),19,true);line(event.name,12,true);line(event.institution+' | '+event.location);line('Borrador - Emitido '+dateLabel(new Date().toISOString()),9);line('Coordinador: '+(event.coordinator||'Sin registrar'));y+=3;
 line('Selección visual de esta descarga: '+selection.photos.length+' foto(s) individual(es) y '+selection.pairs.length+' pareja(s).',9);line('El índice conserva todos los archivos del alcance elegido. Los videos se entregan por separado como originales.',9);
 for(const r of rooms){if(y>220)next();line(r.site+' / '+r.name,14,true);line('Responsable: '+(r.responsible||'Sin asignar'),9);
 for(const item of r.items){line(item.name+': '+(kind!=='return'?'Recepción '+number(item.reception):'')+(kind==='comparison'?' / ':'')+(kind!=='reception'?'Devolución '+number(item.return):''));}
 for(const phase of (kind==='comparison'?['reception','return']:[kind]) as Phase[]){line(phaseTitle(phase),11,true);line('Revisión: '+(r[phase].confirmedAt?dateLabel(r[phase].confirmedAt)+' / '+r[phase].confirmedBy:'Pendiente'),9);Object.entries(r[phase].checks).forEach(([k,v])=>line(k+': '+labels[v],9));line('Observaciones: '+(r[phase].notes||'Sin registrar.'),10);}
 const files=media.filter(m=>m.roomId===r.id&&!m.deleted&&(kind==='comparison'||m.phase===kind));
 if(files.length)line('Evidencias ('+files.length+')',11,true);
 for(const m of files){const caption=phaseTitle(m.phase)+' / '+m.name+' / '+backupLabel(m);doc.setFont('helvetica','normal');doc.setFontSize(9);const captionHeight=doc.splitTextToSize(clean(caption),174).length*4.32+2+(m.note?doc.splitTextToSize(clean(m.note),174).length*4.32+2:0)+6;if(y+Math.min(captionHeight,235)>270){next();line(r.name+' / Evidencias (continuación)',10,true);}line(caption,9);line('ID: '+m.id,8);if(m.note)line(m.note,9);
 if(photoIds.has(m.id)){const image=await picture(m);if(y+90>270){next();line(r.name+' / '+phaseTitle(m.phase)+' / '+m.name,10,true);line('ID: '+m.id,8);}framed(image,margin,y,150,90);y+=96;if(image?.preview)line('Se incluyó la vista previa; el original no estaba disponible en este equipo.',9);}
 }y+=7;}
 for(const pair of selection.pairs){const room=rooms.find(r=>r.id===pair.returned.roomId);if(!room)continue;next();line('Comparación visual',17,true);line(room.site+' / '+room.name,13,true);line('Pareja elegida por el equipo. Las imágenes no certifican conformidad.',9);if(y>110)next();
  const [before,after]=await Promise.all([picture(pair.reception),picture(pair.returned)]),x=[margin,110],width=82;
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(25,34,52);doc.text('Recepción',x[0],y);doc.text('Devolución',x[1],y);y+=5;framed(before,x[0],y,width,90);framed(after,x[1],y,width,90);y+=97;
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  const captions=[pair.reception,pair.returned].map((m,index)=>[m.name,'ID: '+m.id,backupLabel(m),'Registrada: '+dateLabel(m.createdAt),m.note||'Sin nota',([before,after][index]?.preview?'Vista previa: original no disponible.':'')].filter(Boolean).flatMap(text=>[...doc.splitTextToSize(clean(text),width),'']));
  for(let row=0;row<Math.max(captions[0].length,captions[1].length);row++){if(y>270){next();line('Comparación visual (continuación) / '+room.name,11,true);doc.setFontSize(9);doc.setFont('helvetica','normal');}doc.setTextColor(25,34,52);for(let side=0;side<2;side++)if(captions[side][row])doc.text(captions[side][row],x[side],y);y+=4.5;}
  y+=5;
 }
 if(y>225)next();
 line('Los campos sin registrar no equivalen a conformidad.',10,true);line('Aceptación del colegio: no registrada en la aplicación.',10);y+=8;line('Entrega: ____________________    Recibe: ____________________',10);footer();doc.save('OrdenColegio-'+kind+'-'+new Date().toISOString().slice(0,10)+'.pdf');
}
const safe=(s:string)=>s.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,100);
export async function exportEvidence(rooms:Room[],media:Media[],event:EventInfo,onProgress:(s:string)=>void){
 const selected=media.filter(m=>!m.deleted&&rooms.some(r=>r.id===m.roomId));const size=selected.reduce((a,m)=>a+m.size,0);if(size>300*1024*1024)throw new Error('Este respaldo supera 300 MB. Exporta un espacio a la vez o descarga los videos desde la galería.');
 const {zipSync,strToU8}=await import('fflate');const files:Record<string,Uint8Array>={'informe.txt':strToU8(makeText(rooms,selected,event,'comparison')),'registro.json':strToU8(JSON.stringify({event,rooms,media:selected,exportedAt:new Date().toISOString()},null,2))};
 for(let n=0;n<selected.length;n++){const m=selected[n];const r=rooms.find(r=>r.id===m.roomId)!;onProgress('Preparando '+(n+1)+' de '+selected.length);files[safe(r.site)+'/'+safe(r.name)+'/'+phaseTitle(m.phase)+'/'+m.id+'-'+safe(m.name)]=new Uint8Array(await (await original(m)).arrayBuffer());}
 const bytes=zipSync(files,{level:0});downloadBlob(new Blob([bytes as BlobPart],{type:'application/zip'}),'OrdenColegio-respaldo.zip');
}

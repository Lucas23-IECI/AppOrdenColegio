import {LABEL_SIZES,labelLayout,printableLabels,type LabelBatch,type LabelOptions} from './labels';
import type {jsPDF} from 'jspdf';

export function fittedLabel(doc:jsPDF,text:string,width:number,height:number,maxFont:number){
 for(let font=Math.max(8,Math.min(24,maxFont));font>=8;font-=.5){
  doc.setFontSize(font);const lines:string[]=doc.splitTextToSize(text,width);
  if(lines.length*font*.352778*1.15<=height&&lines.every(line=>doc.getTextWidth(line)<=width+.1))return {lines,font};
 }
 throw Error('El texto no cabe de forma legible. Acórtalo o elige etiquetas medianas.');
}
export async function createLabelsDocument(batches:LabelBatch[],options:LabelOptions){
 const labels=printableLabels(batches,options),layout=labelLayout(options);
 const {jsPDF}=await import('jspdf');const doc=new jsPDF({unit:'mm',format:options.paper==='letter'?'letter':'a4',orientation:'portrait'});
 doc.setProperties({title:'Etiquetas de espacios',subject:LABEL_SIZES[options.size].name+' · '+labels.length+' etiquetas',creator:'Orden Colegio'});
 doc.setFont('helvetica','bold');doc.setTextColor(0,0,0);doc.setDrawColor(155,155,155);doc.setLineWidth(.15);
 const fittedLabels:{lines:string[];font:number}[]=[];
 labels.forEach((text,index)=>{
  if(index&&index%layout.perPage===0)doc.addPage();const position=index%layout.perPage;
  const x=layout.margin+(position%layout.columns)*(layout.width+layout.gap),y=layout.margin+Math.floor(position/layout.columns)*(layout.height+layout.gap);
  if(options.border)doc.rect(x,y,layout.width,layout.height);
  const fitted=fittedLabel(doc,text,layout.width-4,layout.height-4,options.fontSize);fittedLabels.push(fitted);doc.setFontSize(fitted.font);
  const lineHeight=fitted.font*.352778*1.15,totalHeight=fitted.lines.length*lineHeight,baseline=y+(layout.height-totalHeight)/2+fitted.font*.352778*.8;
  fitted.lines.forEach((line,n)=>doc.text(line,x+layout.width/2,baseline+n*lineHeight,{align:'center'}));
 });
 return {blob:doc.output('blob'),labels:fittedLabels,layout};
}
export async function createLabelsPdf(batches:LabelBatch[],options:LabelOptions){return (await createLabelsDocument(batches,options)).blob;}
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function labelsPrintHtml(document:Awaited<ReturnType<typeof createLabelsDocument>>,options:LabelOptions){
 const {labels,layout}=document;const pages:string[]=[];
 for(let offset=0;offset<labels.length;offset+=layout.perPage)pages.push('<section class="sheet">'+labels.slice(offset,offset+layout.perPage).map(l=>'<div class="label"><div style="font-size:'+l.font+'pt">'+l.lines.map(escapeHtml).join('<br>')+'</div></div>').join('')+'</section>');
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas · Orden Colegio</title><style>@page{size:'+ (options.paper==='letter'?'letter':'A4')+';margin:0}*{box-sizing:border-box}body{margin:0;background:#ddd;font-family:Arial,sans-serif}.tools{padding:16px;background:white;text-align:center}.tools button{font-size:20px;padding:12px 24px}.sheet{width:'+layout.paper.width+'mm;height:'+layout.paper.height+'mm;padding:10mm;background:#fff;display:grid;grid-template-columns:repeat('+layout.columns+','+layout.width+'mm);grid-auto-rows:'+layout.height+'mm;gap:2mm;align-content:start;page-break-after:always;break-after:page;margin:12px auto}.sheet:last-child{page-break-after:auto;break-after:auto}.label{width:'+layout.width+'mm;height:'+layout.height+'mm;padding:2mm;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;color:#000;line-height:1.15;'+(options.border?'border:.15mm solid #9b9b9b;':'')+'}.label>div{overflow-wrap:anywhere}@media print{body{background:white}.tools{display:none}.sheet{margin:0}}'+ '</style></head><body><div class="tools"><button onclick="window.print()">Imprimir etiquetas</button><p>Escala 100 % · Papel '+(options.paper==='letter'?'Carta':'A4')+' · '+labels.length+' etiquetas</p></div>'+pages.join('')+'</body></html>';
}

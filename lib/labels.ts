import type {Room} from './model';

export const LABEL_SIZES={small:{name:'Pequeña',width:45,height:20,fontSize:12},medium:{name:'Mediana',width:65,height:30,fontSize:18}} as const;
export type LabelSize=keyof typeof LABEL_SIZES;
export type LabelOptions={size:LabelSize;paper:'a4'|'letter';includeItem:boolean;numbered:boolean;border:boolean;fontSize:number};
export type LabelBatch={roomId:string;text:string;item:string;quantity:number};
export const DEFAULT_LABEL_OPTIONS:LabelOptions={size:'small',paper:'a4',includeItem:false,numbered:false,border:true,fontSize:12};
export const MAX_LABELS=2000;
export function labelText(room:Room){return room.labelText?.trim()||room.name;}
export function labelLayout(options:LabelOptions){
 const label=LABEL_SIZES[options.size],paper=options.paper==='letter'?{width:215.9,height:279.4}:{width:210,height:297};
 const margin=10,gap=2,columns=Math.floor((paper.width-2*margin+gap)/(label.width+gap)),rows=Math.floor((paper.height-2*margin+gap)/(label.height+gap));
 return {...label,paper,margin,gap,columns,rows,perPage:columns*rows};
}
export function printableLabels(batches:LabelBatch[],options:LabelOptions){
 const total=batches.reduce((n,b)=>n+b.quantity,0);
 if(!total||total>MAX_LABELS)throw Error('Elige entre 1 y '+MAX_LABELS+' etiquetas.');
 const counters=new Map<string,number>();const labels:string[]=[];
 for(const batch of batches){
  if(!Number.isInteger(batch.quantity)||batch.quantity<0||batch.quantity>1000)throw Error('Cada cantidad debe ser un número entero de 0 a 1000.');
  const title=batch.text.trim().normalize('NFC');if(!title||title.length>120)throw Error('El texto debe tener entre 1 y 120 caracteres.');
  if(/[^\u0020-\u007e\u00a0-\u00ff\n\r€–—“”‘’]/u.test(title+(options.includeItem?batch.item:'')))throw Error('Para imprimir, usa letras, números y signos habituales; evita emojis.');
  for(let i=0;i<batch.quantity;i++){const n=(counters.get(batch.roomId)||0)+1;counters.set(batch.roomId,n);labels.push([title,options.includeItem?batch.item:'',options.numbered?String(n).padStart(2,'0'):''].filter(Boolean).join('\n'));}
 }
 return labels;
}

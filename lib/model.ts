export type Phase = 'reception' | 'return';
export type CheckState = 'pending' | 'ok' | 'issue' | 'na';
export type Item = { id: string; name: string; reception: number | null; return: number | null };
export type Inspection = { notes: string; checks: Record<string, CheckState>; confirmedAt: string | null; confirmedBy: string | null };
export type Room = { id: string; name: string; type: string; site: string; sector: string; responsible: string; archived: boolean; items: Item[]; reception: Inspection; return: Inspection; revision: number; updatedAt: string; updatedBy: string; mutationId?: string };
export type LocalRoom = Room & { dirty?: boolean; localVersion?: string; conflict?: Room; error?: string };
export type Media = { id: string; roomId: string; phase: Phase; name: string; mime: string; size: number; createdAt: string; author: string; note: string; category: string; status: 'pending' | 'uploading' | 'ready' | 'error'; error?: string; progress?: number; parts?: { partNumber: number; etag: string }[]; blob?: Blob; thumbnail?: Blob; duration?: number; thumbnailReady?: boolean; deleted?: boolean; metaDirty?:boolean };
export const MEDIA_TYPE=/^(image\/(jpeg|png|webp|avif|gif|heic|heif)|video\/(mp4|quicktime|webm|3gpp|3gpp2|x-m4v|ogg))$/;
export type User = { id: string; name: string; email: string; role: 'admin' | 'coordinator' | 'recorder' };
export type TeamMember = User & { disabled: boolean };
export const ROLE_LABELS: Record<User['role'], string> = {admin:'Administrador',coordinator:'Coordinador',recorder:'Encargado'};
export type EventInfo = { name: string; institution: string; location: string; coordinator: string };
export const DEFAULT_EVENT: EventInfo = { name: 'Encuentro de ciclistas', institution: 'Iglesia de Dios Pentecostal', location: 'Hualqui', coordinator: '' };
export const TYPES = ['Sala','Baño','Biblioteca','Patio','Estacionamiento','Gimnasio','Cocina','Otro'];
export const CHECKS = ['Limpieza','Puertas y ventanas','Piso y muros','Instalaciones','Distribución original'];
export const newInspection = (): Inspection => ({ notes: '', checks: Object.fromEntries(CHECKS.map(k=>[k,'pending'])), confirmedAt:null, confirmedBy:null });
export const uuid = () => crypto.randomUUID();
export function newRoom(name: string, type='Sala', site='Colegio', sector=''): Room {
 const names=type==='Baño'?['Inodoros','Lavamanos','Llaves']:type==='Estacionamiento'?['Portones','Luminarias']:type==='Patio'?['Bancas','Basureros']:type==='Cocina'?['Mesas','Sillas','Lavaplatos']:['Sillas','Mesas'];
 return { id:uuid(),name,type,site,sector,responsible:'',archived:false,items:names.map(name=>({id:uuid(),name,reception:null,return:null})),reception:newInspection(),return:newInspection(),revision:0,updatedAt:new Date().toISOString(),updatedBy:'' };
}
export function roomStatus(r: Room) { return r.return.confirmedAt?'Devuelto':r.reception.confirmedAt?'Recibido':'Por recibir'; }
export function differences(r:Room) { return r.items.filter(i=>i.reception!==null&&i.return!==null&&i.reception!==i.return); }
export function phaseTitle(p:Phase) { return p==='reception'?'Recepción':'Devolución'; }
export function fileSize(n:number) { return n>=1073741824?(n/1073741824).toFixed(1)+' GB':n>=1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB'; }
export function dateLabel(s?:string|null) { return s?new Date(s).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short'}):'Sin registrar'; }
export function plainRoom(r:LocalRoom):Room { const {dirty,localVersion,conflict,error,...rest}=r;void dirty;void localVersion;void conflict;void error;return rest; }

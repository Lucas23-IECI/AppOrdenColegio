import { db,bucket } from '../server/storage';
import { identity,AuthError } from '../server/auth';
import { DEFAULT_EVENT, type Room, type User } from './model';
import { z } from 'zod';
export {db,bucket,identity};
export class ApiError extends Error { constructor(message:string,public status=400){super(message);} }
export function coordinator(user:User){if(user.role!=='coordinator')throw new ApiError('Esta acción corresponde al coordinador.',403);}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('Origen no permitido.',403);}
export function responseError(error:unknown){if(error instanceof ApiError || error instanceof AuthError)return Response.json({error:error.message},{status:error.status});if(error instanceof z.ZodError)return Response.json({error:'Revisa los datos: '+error.issues.map(i=>i.path.join('.')+' '+i.message).join('; ')},{status:400});console.error('OrdenColegio API',error);return Response.json({error:'No se pudo completar el respaldo. Tus cambios locales se conservan; vuelve a intentar.'},{status:503});}
export const count=z.number().int().min(0).max(1000000).nullable();
const inspection=z.object({notes:z.string().max(20000),checks:z.record(z.enum(['pending','ok','issue','na'])),confirmedAt:z.string().nullable(),confirmedBy:z.string().nullable()});
export const roomSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),type:z.string().min(1).max(60),site:z.string().min(1).max(100),sector:z.string().max(100),responsible:z.string().max(100),archived:z.boolean(),items:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),reception:count,return:count})).max(150),reception:inspection,return:inspection,revision:z.number().int().min(0),updatedAt:z.string(),updatedBy:z.string(),mutationId:z.string().uuid()});
export async function getRoom(id:string){const row=await db().prepare('SELECT * FROM rooms WHERE id=?').bind(id).first<{data:string,revision:number,mutation_id:string}>();return row?{room:JSON.parse(row.data) as Room,...row}:null;}
export async function eventInfo(){const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind('event').first<{value:string}>();return row?JSON.parse(row.value):DEFAULT_EVENT;}
export const PART_SIZE=8*1024*1024;
export async function boundedBytes(request:Request,max:number){if(Number(request.headers.get('content-length')??0)>max)throw new ApiError('El bloque supera el tamaño permitido.',413);const reader=request.body?.getReader();if(!reader)throw new ApiError('Falta el contenido del archivo.');const chunks:Uint8Array[]=[];let size=0;try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>max){await reader.cancel();throw new ApiError('El bloque supera el tamaño permitido.',413);}chunks.push(chunk.value);}}finally{reader.releaseLock();}const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;}

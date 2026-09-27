import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { open, rename, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';

export const DATA_DIR = resolve(process.env.DATA_DIR || 'data');
mkdirSync(DATA_DIR, { recursive: true });
export const sqlite = new DatabaseSync(resolve(DATA_DIR, 'colegio.sqlite'));
sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL,mutation_id TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,author TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS history_room ON history(room_id,revision);
CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,phase TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,upload_id TEXT,owner_id TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS media_room ON media(room_id,phase);
CREATE TABLE IF NOT EXISTS upload_parts(id TEXT PRIMARY KEY,media_id TEXT NOT NULL,part_number INTEGER NOT NULL,etag TEXT NOT NULL,UNIQUE(media_id,part_number));
CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,data TEXT NOT NULL,created_at TEXT NOT NULL,author TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS credentials(user_id TEXT PRIMARY KEY REFERENCES members(id),username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES members(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invites(code_hash TEXT PRIMARY KEY,name TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
`);
class Statement {
 constructor(private sql:string,private values:SQLInputValue[]=[]){}
 bind(...values:SQLInputValue[]){return new Statement(this.sql,values);}
 async first<T=Record<string,unknown>>():Promise<T|null>{return (sqlite.prepare(this.sql).get(...this.values) as T)??null;}
 async all<T=Record<string,unknown>>(){return {results:sqlite.prepare(this.sql).all(...this.values) as T[]};}
 execute(){const statement=sqlite.prepare(this.sql);if(statement.columns().length){return {results:statement.all(...this.values),meta:{changes:Number(sqlite.prepare('SELECT changes() AS n').get()?.n??0)}};}const result=statement.run(...this.values);return {results:[],meta:{changes:Number(result.changes)}};}
 async run(){return this.execute();}
}
const database={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
export function db(){return database;}
function objectPath(key:string){if(!/^(originals|thumbnails)\/[a-f0-9-]{36}$/.test(key))throw new Error('Identificador de archivo inválido');return resolve(DATA_DIR,'files',key);}
function multipartPath(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Carga inválida');return resolve(DATA_DIR,'uploads',id);}
function atomicWrite(path:string,data:Uint8Array|string){mkdirSync(dirname(path),{recursive:true});const temp=path+'.'+randomUUID()+'.tmp';writeFileSync(temp,data);renameSync(temp,path);}
function upload(key:string,uploadId:string){const folder=multipartPath(uploadId);const target=objectPath(key);return {
 uploadId,
 async uploadPart(partNumber:number,bytes:Uint8Array){if(!Number.isInteger(partNumber)||partNumber<1||partNumber>10000)throw new Error('Parte inválida');const manifest=JSON.parse(readFileSync(resolve(folder,'manifest.json'),'utf8'));if(manifest.key!==key)throw new Error('Carga incorrecta');const etag=createHash('sha256').update(bytes).digest('hex');atomicWrite(resolve(folder,String(partNumber)),bytes);return {partNumber,etag};},
 async complete(parts:{partNumber:number,etag:string}[]){if(existsSync(target))return;const manifest=JSON.parse(readFileSync(resolve(folder,'manifest.json'),'utf8'));if(manifest.key!==key)throw new Error('Carga incorrecta');mkdirSync(dirname(target),{recursive:true});const temp=target+'.'+randomUUID()+'.tmp';const output=await open(temp,'wx');try{for(let i=0;i<parts.length;i++){const part=parts[i];if(part.partNumber!==i+1)throw new Error('Orden de partes inválido');const hash=createHash('sha256');for await(const chunk of createReadStream(resolve(folder,String(part.partNumber)))){hash.update(chunk);let written=0;while(written<chunk.length){const result=await output.write(chunk,written,chunk.length-written);written+=result.bytesWritten;}}if(hash.digest('hex')!==part.etag)throw new Error('La parte no coincide con el original');}await output.sync();}catch(e){await output.close();await rm(temp,{force:true});throw e;}await output.close();await rename(temp,target);await rm(folder,{recursive:true,force:true});},
 async abort(){rmSync(folder,{recursive:true,force:true});}
};}
const files={
 async head(key:string){const path=objectPath(key);try{return {size:statSync(path).size};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
 async get(key:string,options?:{range:{offset:number,length:number}}){const head=await files.head(key);if(!head)return null;const range=options?.range;const stream=createReadStream(objectPath(key),range?{start:range.offset,end:range.offset+range.length-1}:undefined);return {size:head.size,body:Readable.toWeb(stream) as ReadableStream<Uint8Array>};},
 async put(key:string,bytes:Uint8Array,_options?:unknown){atomicWrite(objectPath(key),bytes);},
 async createMultipartUpload(key:string,_options?:unknown){objectPath(key);const id=randomUUID();const folder=multipartPath(id);mkdirSync(folder,{recursive:true});atomicWrite(resolve(folder,'manifest.json'),JSON.stringify({key}));return upload(key,id);},
 resumeMultipartUpload:upload
};
export function bucket(){return files;}

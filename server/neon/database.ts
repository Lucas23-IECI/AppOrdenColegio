import {Pool} from 'pg';

let pool:Pool|undefined;
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('Falta DATABASE_URL.');
 const connection=new URL(process.env.DATABASE_URL);if(!['localhost','127.0.0.1','::1'].includes(connection.hostname))connection.searchParams.set('sslmode','verify-full');
 if(!pool){pool=new Pool({connectionString:connection.href,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:15000});pool.on('error',error=>console.error('Idle database connection closed',{code:(error as {code?:string}).code}));}return pool;
}

// Only the existing event repository can select tables or call procedures.
// Values are always parameters; these identifiers never come from a request.
const tables=new Set(['oc_members','oc_settings','oc_rooms','oc_history','oc_media','oc_reports','oc_invites','oc_audit']);
const procedures=new Set(['oc_register_open_member','oc_register_member','oc_manage_member','oc_save_room_audited','oc_save_event','oc_finish_media','oc_edit_media','oc_save_report']);
const identifier=(value:string)=>{if(!/^[a-z_][a-z_0-9]*$/.test(value))throw new Error('Invalid repository identifier');return '"'+value+'"';};
export class Query implements PromiseLike<any>{
 private fields='*';private values:unknown[]=[];private where:string[]=[];private ordering='';private offset=0;private maximum:number|undefined;private single=false;private count=false;private head=false;private input:Record<string,unknown>|undefined;
 constructor(private table:string){if(!tables.has(table))throw new Error('Unknown event table');}
 select(fields='*',options?:{count?:string,head?:boolean}){this.fields=fields==='*'?'*':fields.split(',').map(identifier).join(',');this.count=!!options?.count;this.head=!!options?.head;return this;}
 private condition(field:string,operator:string,value:unknown){this.values.push(value);this.where.push(identifier(field)+' '+operator+' $'+this.values.length);return this;}
 eq(f:string,v:unknown){return this.condition(f,'=',v);}lt(f:string,v:unknown){return this.condition(f,'<',v);}gt(f:string,v:unknown){return this.condition(f,'>',v);}gte(f:string,v:unknown){return this.condition(f,'>=',v);}lte(f:string,v:unknown){return this.condition(f,'<=',v);}ilike(f:string,v:unknown){return this.condition(f,'ilike',v);}
 in(f:string,v:unknown[]){return this.condition(f,'= any',v).fixAny();}
 private fixAny(){const last=this.where.length-1;this.where[last]=this.where[last].replace(/= any (\$\d+)/,'= any($1)');return this;}
 is(f:string,v:null){if(v!==null)throw new Error('Only null supported');this.where.push(identifier(f)+' is null');return this;}
 order(f:string,o:{ascending:boolean}){this.ordering=' order by '+identifier(f)+(o.ascending?' asc':' desc');return this;}
 limit(n:number){this.maximum=n;return this;}range(start:number,end:number){this.offset=start;this.maximum=end-start+1;return this;}maybeSingle(){this.single=true;return this;}insert(value:Record<string,unknown>){this.input=value;return this;}
 private async run(){try{
  if(this.input){const keys=Object.keys(this.input);await database().query('insert into '+identifier(this.table)+' ('+keys.map(identifier).join(',')+') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',keys.map(k=>this.input![k]));return {data:null,error:null};}
  const result=await database().query('select '+(this.count?'count(*)::int as count':this.fields)+' from '+identifier(this.table)+(this.where.length?' where '+this.where.join(' and '):'')+this.ordering+(this.maximum===undefined?'':' limit '+this.maximum)+(this.offset?' offset '+this.offset:''),this.values);
  return {data:this.head?null:this.single?result.rows[0]??null:result.rows,count:this.count?result.rows[0].count:null,error:null};
 }catch(error){return {data:null,error};}}
 then<TResult1=any,TResult2=never>(resolve?:((value:any)=>TResult1|PromiseLike<TResult1>)|null,reject?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2>{return this.run().then(resolve,reject);}
}
export const repository={from:(table:string)=>new Query(table),rpc:async(name:string,args:Record<string,unknown>)=>{try{if(!procedures.has(name))throw new Error('Unknown event procedure');const keys=Object.keys(args);const result=await database().query('select '+identifier(name)+'('+keys.map((k,i)=>identifier(k)+' => $'+(i+1)).join(',')+') as data',keys.map(k=>args[k]));return {data:result.rows[0].data,error:null};}catch(error){return {data:null,error};}}};

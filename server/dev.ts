import {createServer} from 'node:http';
import {createServer as createViteServer} from 'vite';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {handleRequest} from './cloud';
const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});
createServer(async(req,res)=>{if(!req.url?.startsWith('/api/'))return vite.middlewares(req,res);try{const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);const body=Buffer.concat(chunks);const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,body:body.length?new Uint8Array(body):undefined});const response=await handleRequest(request);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),res);else res.end();}catch(e){console.error(e);if(!res.headersSent)res.writeHead(500);res.end();}}).listen(5173,'127.0.0.1',()=>console.log('Orden Colegio + Supabase: http://127.0.0.1:5173'));

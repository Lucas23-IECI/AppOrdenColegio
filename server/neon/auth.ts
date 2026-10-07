import {betterAuth,type BetterAuthOptions} from 'better-auth';
import {hashPassword,verifyPassword} from 'better-auth/crypto';
import {compare} from 'bcryptjs';
import {database} from './database.js';

let instance:ReturnType<typeof betterAuth>|undefined;
export const authOptions=():BetterAuthOptions=>({
 database:database(),baseURL:process.env.APP_ORIGIN??'http://127.0.0.1:5173',basePath:'/api/session',secret:process.env.BETTER_AUTH_SECRET,
 trustedOrigins:[process.env.APP_ORIGIN??'http://127.0.0.1:5173'],
 emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:200,password:{hash:hashPassword,verify:async({hash,password}:{hash:string,password:string})=>/^\$2[aby]\$/.test(hash)?compare(password,hash):verifyPassword({hash,password})}},
 user:{modelName:'oc_auth_user'},session:{modelName:'oc_auth_session',expiresIn:30*24*3600,updateAge:24*3600},account:{modelName:'oc_auth_account'},verification:{modelName:'oc_auth_verification'},
 rateLimit:{enabled:true,storage:'database' as const,modelName:'oc_auth_rate_limit',window:60,max:30,customRules:{'/sign-in/email':{window:60,max:8},'/sign-up/email':{window:60,max:5}}},
 advanced:{database:{generateId:'uuid' as const},cookiePrefix:'orden',useSecureCookies:process.env.APP_ORIGIN?.startsWith('https://')??false},
 logger:{disabled:true},
});
export function authentication(){if(!process.env.BETTER_AUTH_SECRET||process.env.BETTER_AUTH_SECRET.length<32)throw new Error('Falta configurar la clave de sesión.');return instance??=betterAuth(authOptions());}
export async function accountSession(request:Request){return authentication().api.getSession({headers:request.headers});}
export async function accountAction(request:Request,action:string){
 const mapping:Record<string,string>={login:'sign-in/email',register:'sign-up/email',logout:'sign-out'};
 if(!mapping[action]||request.method!=='POST')return Response.json({error:'Acción no encontrada.'},{status:404});
 const input=await request.json();const body=action==='logout'?{}:action==='login'?{email:input.email,password:input.password}:{email:input.email,password:input.password,name:input.name};
 const origin=process.env.APP_ORIGIN??new URL(request.url).origin;
 const headers=new Headers(request.headers);headers.set('Content-Type','application/json');
 const response=await authentication().handler(new Request(origin+'/api/session/'+mapping[action],{method:'POST',headers,body:JSON.stringify(body)}));
 const data=await response.json();
 const output=Response.json(response.ok?{ok:true}:{error:response.status===429?'Demasiados intentos. Espera un minuto.':data.code==='USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'?'Ese correo ya tiene una cuenta. Ingresa con tu contraseña.':action==='login'?'Correo o contraseña incorrectos.':'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.'},{status:response.status});
 for(const cookie of response.headers.getSetCookie())output.headers.append('Set-Cookie',cookie);
 return output;
}

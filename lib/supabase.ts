import {createClient,type SupabaseClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let client:SupabaseClient|undefined;
export function getSupabase(){return client??=createClient(url||'https://not-configured.supabase.co',key||'not-configured',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});}

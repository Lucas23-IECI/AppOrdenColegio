create table public.oc_audit (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 category text not null,
 action text not null,
 entity_id text not null,
 entity_name text not null,
 actor_id uuid,
 actor_name text not null,
 before_data jsonb,
 after_data jsonb,
 legacy boolean not null default false,
 search_text text not null
);
create index oc_audit_category_id on public.oc_audit(category,id desc);
alter table public.oc_audit enable row level security;
revoke all on public.oc_audit from public,anon,authenticated;
grant select,insert on public.oc_audit to service_role;
grant usage,select on sequence public.oc_audit_id_seq to service_role;

-- Only pre-existing room history can be reconstructed truthfully.
insert into public.oc_audit(created_at,category,action,entity_id,entity_name,actor_name,before_data,after_data,legacy,search_text)
select created_at,'spaces','revision',room_id::text,coalesce(data->>'name','Espacio'),author,
 lag(data) over(partition by room_id order by revision),data,true,
 coalesce(data->>'name','')||' '||author||' revisión anterior'
from public.oc_history order by created_at,id;

create function public.oc_audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare old_data jsonb; new_data jsonb; old_row jsonb; new_row jsonb; row_data jsonb; actor uuid; actor_name text; category text; action text; entity text; label text;
begin
 if TG_OP<>'INSERT' then old_row:=to_jsonb(OLD); end if;
 if TG_OP<>'DELETE' then new_row:=to_jsonb(NEW); end if;
 row_data:=coalesce(new_row,old_row);
 actor:=nullif(current_setting('orden.actor_id',true),'')::uuid;
 if TG_TABLE_NAME='oc_rooms' then
  category:='spaces';old_data:=old_row->'data';new_data:=new_row->'data';label:=coalesce(new_data->>'name',old_data->>'name','Espacio');
 elsif TG_TABLE_NAME='oc_media' then
  category:='files';old_data:=old_row->'data';new_data:=new_row->'data';label:=coalesce(new_data->>'name',old_data->>'name','Archivo');
  if TG_OP='UPDATE' and (old_data-'thumbnailReady')=(new_data-'thumbnailReady') then return NEW; end if;
  actor:=coalesce(actor,(row_data->>'owner_id')::uuid);
 elsif TG_TABLE_NAME='oc_members' then
  category:='team';old_data:=old_row;new_data:=new_row;label:=row_data->>'name';
  if TG_OP='INSERT' then actor:=coalesce(actor,(row_data->>'id')::uuid); end if;
 elsif TG_TABLE_NAME='oc_settings' then
  category:='event';old_data:=old_row->'value';new_data:=new_row->'value';label:=coalesce(new_data->>'name',old_data->>'name','Evento');
 elsif TG_TABLE_NAME='oc_reports' then
  category:='reports';old_data:=(old_row->'data')-'text';new_data:=(new_row->'data')-'text';label:=coalesce(new_data->>'title',old_data->>'title','Informe');
 end if;
 if TG_OP='UPDATE' and old_data=new_data then return NEW; end if;
 entity:=coalesce(row_data->>'id',row_data->>'key');
 action:=case TG_OP when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
 if category='files' and TG_OP='UPDATE' then
  if coalesce(new_data->>'deleted','false')<>coalesce(old_data->>'deleted','false') then action:=case when new_data->>'deleted'='true' then 'trashed' else 'restored' end;
  elsif old_row->>'status'<>'ready' and new_row->>'status'='ready' then action:='uploaded'; end if;
 elsif category='team' and TG_OP='UPDATE' then
  if new_data->>'disabled'<>old_data->>'disabled' then action:=case when new_data->>'disabled'='true' then 'disabled' else 'reactivated' end;
  elsif new_data->>'role'<>old_data->>'role' then action:='role';end if;
 elsif category='spaces' and TG_OP='UPDATE' and old_data->>'archived'<>new_data->>'archived' then action:=case when new_data->>'archived'='true' then 'archived' else 'restored' end;
 end if;
 select m.name into actor_name from public.oc_members m where m.id=actor;
 actor_name:=coalesce(actor_name,new_data->>'updatedBy',row_data->>'author',old_data->>'updatedBy','Sin autor registrado');
 insert into public.oc_audit(category,action,entity_id,entity_name,actor_id,actor_name,before_data,after_data,search_text)
 values(category,action,entity,label,actor,actor_name,old_data,new_data,label||' '||actor_name||' '||category||' '||action);
 if TG_OP='DELETE' then return OLD;end if;return NEW;
end $$;
create trigger oc_audit_spaces after insert or update or delete on public.oc_rooms for each row execute function public.oc_audit_change();
create trigger oc_audit_files after insert or update or delete on public.oc_media for each row execute function public.oc_audit_change();
create trigger oc_audit_team after insert or update or delete on public.oc_members for each row execute function public.oc_audit_change();
create trigger oc_audit_event after insert or update or delete on public.oc_settings for each row execute function public.oc_audit_change();
create trigger oc_audit_reports after insert or update or delete on public.oc_reports for each row execute function public.oc_audit_change();

create function public.oc_save_room_audited(p_input jsonb,p_actor uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_name text;
begin
 select name into actor_name from public.oc_members where id=p_actor and not disabled;
 if not found then raise exception 'Cuenta sin acceso' using errcode='42501'; end if;
 perform set_config('orden.actor_id',p_actor::text,true);
 return public.oc_save_room(p_input,actor_name);
end $$;
create function public.oc_save_event(p_actor uuid,p_value jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.oc_members where id=p_actor and role in ('admin','coordinator') and not disabled) then raise exception 'Sin permiso' using errcode='42501';end if;
 perform set_config('orden.actor_id',p_actor::text,true);
 insert into public.oc_settings(key,value) values('event',p_value) on conflict(key) do update set value=excluded.value;
end $$;
create function public.oc_save_report(p_actor uuid,p_value jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare actor_name text; report_id uuid;
begin
 select name into actor_name from public.oc_members where id=p_actor and not disabled;
 if not found then raise exception 'Cuenta sin acceso' using errcode='42501';end if;
 perform set_config('orden.actor_id',p_actor::text,true);
 insert into public.oc_reports(data,author) values(p_value,actor_name) returning id into report_id;return report_id;
end $$;
revoke all on function public.oc_save_room_audited(jsonb,uuid),public.oc_save_event(uuid,jsonb),public.oc_save_report(uuid,jsonb),public.oc_audit_change() from public,anon,authenticated;
grant execute on function public.oc_save_room_audited(jsonb,uuid),public.oc_save_event(uuid,jsonb),public.oc_save_report(uuid,jsonb) to service_role;

create or replace function public.oc_manage_member(p_actor uuid,p_target uuid,p_role text default null,p_disabled boolean default null)
returns void language plpgsql security definer set search_path=public as $$
declare target public.oc_members; next_role text; next_disabled boolean;
begin
 perform set_config('orden.actor_id',p_actor::text,true);
 perform pg_advisory_xact_lock(71927261);
 if not exists(select 1 from public.oc_members where id=p_actor and role='admin' and not disabled) then
  raise exception 'Solo un administrador puede gestionar el equipo' using errcode='42501';
 end if;
 if p_role is null and p_disabled is null then raise exception 'Falta indicar el cambio'; end if;
 if p_role is not null and p_role not in ('admin','coordinator','recorder') then raise exception 'Rol no válido'; end if;
 select * into target from public.oc_members where id=p_target for update;
 if not found then raise exception 'No se encontró la cuenta'; end if;
 next_role:=coalesce(p_role,target.role);
 next_disabled:=coalesce(p_disabled,target.disabled);
 if target.role='admin' and not target.disabled and (next_role<>'admin' or next_disabled)
   and not exists(select 1 from public.oc_members where id<>p_target and role='admin' and not disabled) then
  raise exception 'Debe quedar al menos un administrador activo';
 end if;
 update public.oc_members set role=next_role,disabled=next_disabled where id=p_target;
end $$;


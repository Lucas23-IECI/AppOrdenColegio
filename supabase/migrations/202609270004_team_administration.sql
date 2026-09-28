-- Preserve the original owner's management permissions and distinguish team roles.
alter table public.oc_members drop constraint oc_members_role_check;
alter table public.oc_members add constraint oc_members_role_check check(role in ('admin','coordinator','recorder'));
update public.oc_members set role='admin' where role='coordinator';

create or replace function public.oc_register_open_member(p_user uuid,p_email text,p_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71927261);
 insert into public.oc_members(id,email,name,role)
 values(p_user,p_email,p_name,case when exists(select 1 from public.oc_members where role='admin') then 'recorder' else 'admin' end);
end $$;

create or replace function public.oc_register_member(p_user uuid,p_email text,p_name text,p_invite_hash text default null,p_owner boolean default false)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71927261);
 if p_owner then
  if exists(select 1 from public.oc_members where role in ('admin','coordinator')) then raise exception 'Ya existe un administrador'; end if;
 else
  update public.oc_invites set used_at=now() where code_hash=p_invite_hash and used_at is null and expires_at>now();
  if not found then raise exception 'Invitación vencida o utilizada'; end if;
 end if;
 insert into public.oc_members(id,email,name,role) values(p_user,p_email,p_name,case when p_owner then 'admin' else 'recorder' end);
end $$;

create function public.oc_manage_member(p_actor uuid,p_target uuid,p_role text default null,p_disabled boolean default null)
returns void language plpgsql security definer set search_path=public as $$
declare target public.oc_members; next_role text; next_disabled boolean;
begin
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

revoke all on function public.oc_manage_member(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.oc_manage_member(uuid,uuid,text,boolean) to service_role;

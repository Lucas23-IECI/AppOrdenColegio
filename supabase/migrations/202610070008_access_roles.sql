alter table public.oc_members add column primary_admin boolean not null default false;
alter table public.oc_members drop constraint oc_members_role_check;
alter table public.oc_members add constraint oc_members_role_check check (role in ('admin','coordinator','recorder','viewer'));
alter table public.oc_members add constraint oc_members_primary_admin_check check (not primary_admin or (role='admin' and not disabled));
create unique index oc_members_one_primary_admin on public.oc_members(primary_admin) where primary_admin;

create or replace function public.oc_register_open_member(p_user uuid,p_email text,p_name text)
returns void language plpgsql security definer set search_path=public as $$
declare first_account boolean;
begin
 perform pg_advisory_xact_lock(71927261);
 first_account:=not exists(select 1 from public.oc_members where role='admin');
 insert into public.oc_members(id,email,name,role,primary_admin)
 values(p_user,p_email,p_name,case when first_account then 'admin' else 'viewer' end,first_account);
end $$;

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
 if p_role is not null and p_role not in ('admin','coordinator','recorder','viewer') then raise exception 'Rol no válido'; end if;
 select * into target from public.oc_members where id=p_target for update;
 if not found then raise exception 'No se encontró la cuenta'; end if;
 next_role:=coalesce(p_role,target.role);next_disabled:=coalesce(p_disabled,target.disabled);
 if target.primary_admin and (next_role<>'admin' or next_disabled) then
  raise exception 'El administrador principal no se puede desactivar ni cambiar de rol';
 end if;
 if target.role='admin' and not target.disabled and (next_role<>'admin' or next_disabled)
  and not exists(select 1 from public.oc_members where id<>p_target and role='admin' and not disabled) then
  raise exception 'Debe quedar al menos un administrador activo';
 end if;
 update public.oc_members set role=next_role,disabled=next_disabled where id=p_target;
end $$;

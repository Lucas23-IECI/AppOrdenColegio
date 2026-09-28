-- Registration is open to the event team. Account creation still goes through
-- the server, and event data and evidence remain restricted to active members.
create function public.oc_register_open_member(p_user uuid,p_email text,p_name text)
returns void language plpgsql security definer set search_path=public as $$
declare member_role text;
begin
 -- Share the lock with the original setup function so simultaneous first
 -- registrations (including an old setup link) can elect only one coordinator.
 perform pg_advisory_xact_lock(71927261);
 member_role:=case when exists(select 1 from public.oc_members where role='coordinator')
   then 'recorder' else 'coordinator' end;
 insert into public.oc_members(id,email,name,role)
 values(p_user,p_email,p_name,member_role);
end $$;

revoke all on function public.oc_register_open_member(uuid,text,text) from public,anon,authenticated;
grant execute on function public.oc_register_open_member(uuid,text,text) to service_role;

-- Edit metadata atomically and keep originals recoverable in the trash.
create or replace function public.oc_edit_media(p_actor uuid,p_id uuid,p_patch jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare member public.oc_members; file public.oc_media; room public.oc_rooms; updated jsonb; mutation uuid; clear jsonb:='{"confirmedAt":null,"confirmedBy":null}'::jsonb;
begin
 select * into member from public.oc_members where id=p_actor and not disabled;
 if not found then raise exception 'Cuenta sin acceso' using errcode='42501'; end if;
 select * into file from public.oc_media where id=p_id;
 if not found then
  if p_patch->>'deleted'='true' then return; end if;
  raise exception 'Archivo no encontrado';
 end if;
 if file.owner_id<>p_actor and member.role='recorder' then raise exception 'Archivo de otro encargado' using errcode='42501'; end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('name','note','category','deleted','comparisonId')) then raise exception 'Campo no permitido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(file.room_id::text,0));
 perform set_config('orden.actor_id',p_actor::text,true);
 select * into file from public.oc_media where id=p_id for update;
 if p_patch ? 'comparisonId' and (p_patch->>'comparisonId') is distinct from (file.data->>'comparisonId') and p_patch->>'comparisonId' is not null then
  if file.phase<>'return' or file.data->>'mime' not like 'image/%' or coalesce((file.data->>'deleted')::boolean,false) then raise exception 'La comparación debe partir de una foto de devolución'; end if;
  if not exists(select 1 from public.oc_media r where r.id=(p_patch->>'comparisonId')::uuid and r.room_id=file.room_id and r.phase='reception' and r.data->>'mime' like 'image/%' and not coalesce((r.data->>'deleted')::boolean,false)) then raise exception 'Elige una foto de recepción del mismo espacio'; end if;
 end if;
 if (p_patch ? 'deleted') and coalesce((p_patch->>'deleted')::boolean,false)<>coalesce((file.data->>'deleted')::boolean,false) then
  select * into room from public.oc_rooms where id=file.room_id for update;
  if room.data->file.phase->>'confirmedAt' is not null then
   mutation:=gen_random_uuid();
   updated:=jsonb_set(room.data,array[file.phase],(room.data->file.phase)||clear);
   if file.phase='reception' then updated:=jsonb_set(updated,'{return}',(updated->'return')||clear); end if;
   updated:=updated||jsonb_build_object('revision',room.revision+1,'updatedBy',member.name,'updatedAt',now(),'mutationId',mutation);
   update public.oc_rooms set data=updated,revision=revision+1,mutation_id=mutation,updated_at=now() where id=room.id;
   insert into public.oc_history(id,room_id,revision,data,author) values(mutation,room.id,room.revision+1,updated,member.name);
  end if;
 end if;
 update public.oc_media set data=data||p_patch where id=p_id;
end $$;
revoke all on function public.oc_edit_media(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.oc_edit_media(uuid,uuid,jsonb) to service_role;


create or replace function public.oc_finish_media(p_actor uuid,p_id uuid,p_thumbnail boolean default false)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.oc_media f join public.oc_members m on m.id=p_actor where f.id=p_id and not m.disabled and (f.owner_id=p_actor or (p_thumbnail and m.role in ('admin','coordinator')))) then raise exception 'Archivo de otro encargado' using errcode='42501'; end if;
 perform set_config('orden.actor_id',p_actor::text,true);
 if p_thumbnail then update public.oc_media set data=data||'{"thumbnailReady":true}'::jsonb where id=p_id;
 else update public.oc_media set status='ready',data=data||'{"status":"ready"}'::jsonb where id=p_id; end if;
end $$;
revoke all on function public.oc_finish_media(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.oc_finish_media(uuid,uuid,boolean) to service_role;

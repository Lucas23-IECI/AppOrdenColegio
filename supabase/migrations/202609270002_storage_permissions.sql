create function public.oc_can_upload(object_name text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from oc_media f join oc_members m on m.id=f.owner_id where f.object_path=object_name and f.owner_id=auth.uid() and f.status='pending' and not m.disabled);
$$;
create function public.oc_can_read(object_name text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from oc_media f where f.object_path=object_name and (f.status='ready' or f.owner_id=auth.uid()))
 and exists(select 1 from oc_members where id=auth.uid() and not disabled);
$$;
revoke all on function public.oc_can_upload(text),public.oc_can_read(text) from public,anon;
grant execute on function public.oc_can_upload(text),public.oc_can_read(text) to authenticated;
create policy evidence_upload_registered on storage.objects for insert to authenticated with check(bucket_id='evidence' and public.oc_can_upload(name));
create policy evidence_read_member on storage.objects for select to authenticated using(bucket_id='evidence' and public.oc_can_read(name));

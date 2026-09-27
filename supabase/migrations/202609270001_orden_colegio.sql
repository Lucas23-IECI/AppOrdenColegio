create table public.oc_members(id uuid primary key references auth.users(id) on delete cascade,email text not null,name text not null,role text not null check(role in ('coordinator','recorder')),disabled boolean not null default false);
create table public.oc_settings(key text primary key,value jsonb not null);
create table public.oc_rooms(id uuid primary key,data jsonb not null,revision integer not null,mutation_id uuid not null,updated_at timestamptz not null default now());
create table public.oc_history(id uuid primary key,room_id uuid not null references public.oc_rooms(id),revision integer not null,data jsonb not null,author text not null,created_at timestamptz not null default now());
create index oc_history_room on public.oc_history(room_id,revision desc);
create table public.oc_media(id uuid primary key,room_id uuid not null references public.oc_rooms(id),phase text not null check(phase in ('reception','return')),data jsonb not null,status text not null default 'pending',owner_id uuid not null references auth.users(id),object_path text not null unique,created_at timestamptz not null default now());
create index oc_media_room on public.oc_media(room_id,phase);
create table public.oc_reports(id uuid primary key default gen_random_uuid(),data jsonb not null,author text not null,created_at timestamptz not null default now());
create table public.oc_invites(code_hash text primary key,name text not null,expires_at timestamptz not null,used_at timestamptz);
alter table public.oc_members enable row level security;
alter table public.oc_settings enable row level security;
alter table public.oc_rooms enable row level security;
alter table public.oc_history enable row level security;
alter table public.oc_media enable row level security;
alter table public.oc_reports enable row level security;
alter table public.oc_invites enable row level security;
revoke all on public.oc_members,public.oc_settings,public.oc_rooms,public.oc_history,public.oc_media,public.oc_reports,public.oc_invites from anon,authenticated;
grant all on public.oc_members,public.oc_settings,public.oc_rooms,public.oc_history,public.oc_media,public.oc_reports,public.oc_invites to service_role;

create function public.oc_save_room(p_input jsonb,p_author text) returns jsonb language plpgsql security definer set search_path=public as $$
declare current_row oc_rooms; updated jsonb; next_revision integer; room_id uuid:=(p_input->>'id')::uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(room_id::text,0));
 select * into current_row from oc_rooms where id=room_id for update;
 if found then
   if current_row.mutation_id=(p_input->>'mutationId')::uuid then return jsonb_build_object('room',current_row.data); end if;
   if current_row.revision<>(p_input->>'revision')::integer then return jsonb_build_object('conflict',current_row.data); end if;
 elsif (p_input->>'revision')::integer<>0 then raise exception 'No existe la revisión original'; end if;
 next_revision:=coalesce(current_row.revision,0)+1;
 updated:=p_input||jsonb_build_object('revision',next_revision,'updatedAt',now(),'updatedBy',p_author);
 insert into oc_rooms(id,data,revision,mutation_id) values(room_id,updated,next_revision,(p_input->>'mutationId')::uuid)
 on conflict(id) do update set data=excluded.data,revision=excluded.revision,mutation_id=excluded.mutation_id,updated_at=now();
 insert into oc_history(id,room_id,revision,data,author) values((p_input->>'mutationId')::uuid,room_id,next_revision,updated,p_author);
 return jsonb_build_object('room',updated);
end $$;

create function public.oc_register_member(p_user uuid,p_email text,p_name text,p_invite_hash text default null,p_owner boolean default false) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_owner then
  perform pg_advisory_xact_lock(71927261);
  if exists(select 1 from oc_members where role='coordinator') then raise exception 'Ya existe el coordinador'; end if;
 else
  update oc_invites set used_at=now() where code_hash=p_invite_hash and used_at is null and expires_at>now();
  if not found then raise exception 'Invitación vencida o utilizada'; end if;
 end if;
 insert into oc_members(id,email,name,role) values(p_user,p_email,p_name,case when p_owner then 'coordinator' else 'recorder' end);
end $$;
revoke all on function public.oc_save_room(jsonb,text) from public,anon,authenticated;
revoke all on function public.oc_register_member(uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.oc_save_room(jsonb,text) to service_role;
grant execute on function public.oc_register_member(uuid,text,text,text,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evidence','evidence',false,52428800,array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/3gpp','video/3gpp2','video/x-m4v','video/ogg']);
-- No anonymous Storage policies: uploads and downloads use short-lived signatures
-- issued only after the server validates the event member and file ownership.

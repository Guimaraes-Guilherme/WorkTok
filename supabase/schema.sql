-- =====================================================================
-- WorkTok — banco de dados (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- Ele cria as tabelas, as regras de segurança (RLS), as funções e o
-- bucket de arquivos. Pode ser rodado de novo sem quebrar nada.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PERFIS
-- account_type: 'profissional' | 'recrutador' | 'empresa'
-- (as regras finas de cada tipo ainda serão definidas — ponto 3)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null check (username ~ '^[a-z0-9_.]{3,30}$'),
  full_name     text not null default '',
  headline      text not null default '',          -- ex.: "Product Designer"
  bio           text not null default '' check (char_length(bio) <= 300),
  account_type  text not null default 'profissional'
                check (account_type in ('profissional','recrutador','empresa')),
  areas         text[] not null default '{}',       -- até 3 áreas escolhidas no onboarding
  skills        text[] not null default '{}',
  avatar_url    text,
  open_to_work  boolean not null default false,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint areas_max_3 check (cardinality(areas) <= 3)
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
begin
  base_username := lower(coalesce(new.raw_user_meta_data->>'username',
                                  split_part(new.email, '@', 1)));
  base_username := regexp_replace(base_username, '[^a-z0-9_.]', '', 'g');
  if char_length(base_username) < 3 then
    base_username := base_username || substr(md5(new.id::text), 1, 5);
  end if;
  if exists (select 1 from public.profiles where username = base_username) then
    base_username := left(base_username, 24) || substr(md5(new.id::text), 1, 5);
  end if;

  insert into public.profiles (id, username, full_name, account_type)
  values (
    new.id,
    base_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'account_type', ''), 'profissional')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_recruiter(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and account_type in ('recrutador','empresa')
  );
$$;

-- ---------------------------------------------------------------------
-- SEGUIR
-- ---------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

create or replace function public.follows_each_other(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.follows where follower_id = a and following_id = b)
     and exists (select 1 from public.follows where follower_id = b and following_id = a);
$$;

-- ---------------------------------------------------------------------
-- POSTS (foto ou vídeo). Usuário comum pode divulgar vaga só por LINK
-- EXTERNO, no campo external_link.
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles on delete cascade,
  kind          text not null check (kind in ('foto','video')),
  media_url     text not null,
  caption       text not null default '' check (char_length(caption) <= 2200),
  area          text,
  external_link text check (external_link is null or external_link ~* '^https?://'),
  created_at    timestamptz not null default now()
);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_area_idx   on public.posts (area, created_at desc);

create table if not exists public.post_likes (
  user_id    uuid not null references public.profiles on delete cascade,
  post_id    uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);

create table if not exists public.post_saves (
  user_id    uuid not null references public.profiles on delete cascade,
  post_id    uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  author_id  uuid not null references public.profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- VÍDEOS DE APRESENTAÇÃO — 3 espaços, até 3 minutos cada
-- ---------------------------------------------------------------------
create table if not exists public.presentation_videos (
  user_id          uuid not null references public.profiles on delete cascade,
  slot             smallint not null check (slot between 1 and 3),
  title            text not null default '' check (char_length(title) <= 40),
  video_url        text not null,
  duration_seconds integer not null check (duration_seconds between 1 and 180),
  created_at       timestamptz not null default now(),
  primary key (user_id, slot)
);

-- ---------------------------------------------------------------------
-- VAGAS — só recrutador/RH ou empresa publicam (com informações no app)
-- ---------------------------------------------------------------------
create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles on delete cascade,
  title        text not null check (char_length(title) between 3 and 80),
  company_name text not null,
  location     text not null default '',
  work_mode    text not null default 'remoto' check (work_mode in ('remoto','hibrido','presencial')),
  contract     text not null default 'clt' check (contract in ('clt','pj','estagio','freelance','temporario')),
  salary_range text,
  description  text not null default '' check (char_length(description) <= 4000),
  area         text not null,
  skills       text[] not null default '{}',
  is_open      boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists jobs_area_idx on public.jobs (area, created_at desc) where is_open;

create table if not exists public.job_applications (
  job_id       uuid not null references public.jobs on delete cascade,
  applicant_id uuid not null references public.profiles on delete cascade,
  status       text not null default 'enviada'
               check (status in ('enviada','em_analise','entrevista','recusada','contratado')),
  created_at   timestamptz not null default now(),
  primary key (job_id, applicant_id)
);

create table if not exists public.job_saves (
  user_id    uuid not null references public.profiles on delete cascade,
  job_id     uuid not null references public.jobs on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- ---------------------------------------------------------------------
-- CHAT
-- Regra: só conversa quem se segue mutuamente, ou um recrutador/empresa
-- que inicia contato com alguém. Uma vez criada, os dois podem responder.
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles on delete cascade,
  user_b          uuid not null references public.profiles on delete cascade,
  started_by      uuid not null references public.profiles on delete cascade,
  job_id          uuid references public.jobs on delete set null,
  last_message    text,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists conversations_a_idx on public.conversations (user_a, last_message_at desc);
create index if not exists conversations_b_idx on public.conversations (user_b, last_message_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id       uuid not null references public.profiles on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create or replace function public.is_participant(conv uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations
    where id = conv and (user_a = uid or user_b = uid)
  );
$$;

create or replace function public.can_start_chat(me uuid, other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select me <> other and (public.follows_each_other(me, other) or public.is_recruiter(me));
$$;

-- Abre (ou devolve) a conversa com outra pessoa, respeitando a regra
create or replace function public.start_conversation(other uuid, about_job uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me   uuid := auth.uid();
  a    uuid;
  b    uuid;
  conv uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  a := least(me, other);
  b := greatest(me, other);

  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is not null then return conv; end if;

  if not public.can_start_chat(me, other) then
    raise exception 'chat_not_allowed'
      using hint = 'Vocês precisam se seguir, ou o contato precisa partir de um recrutador.';
  end if;

  insert into public.conversations (user_a, user_b, started_by, job_id)
  values (a, b, me, about_job)
  returning id into conv;
  return conv;
end $$;

-- Atualiza a prévia da conversa a cada mensagem
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = left(new.body, 120), last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Ao se candidatar, a conversa com quem publicou a vaga é aberta
create or replace function public.apply_to_job(job uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me     uuid := auth.uid();
  author uuid;
  a uuid; b uuid; conv uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select author_id into author from public.jobs where id = job and is_open;
  if author is null then raise exception 'job_not_found'; end if;
  if author = me then raise exception 'own_job'; end if;

  insert into public.job_applications (job_id, applicant_id)
  values (job, me) on conflict do nothing;

  a := least(me, author); b := greatest(me, author);
  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is null then
    insert into public.conversations (user_a, user_b, started_by, job_id)
    values (a, b, me, job) returning id into conv;
  end if;
  return conv;
end $$;

-- ---------------------------------------------------------------------
-- VIEWS (com security_invoker, respeitam o RLS de quem consulta)
-- ---------------------------------------------------------------------
create or replace view public.feed_posts with (security_invoker = true) as
select
  p.*,
  pr.username        as author_username,
  pr.full_name       as author_name,
  pr.headline        as author_headline,
  pr.avatar_url      as author_avatar,
  (select count(*) from public.post_likes l where l.post_id = p.id)::int as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int   as comment_count
from public.posts p
join public.profiles pr on pr.id = p.author_id;

create or replace view public.feed_jobs with (security_invoker = true) as
select
  j.*,
  pr.username   as author_username,
  pr.full_name  as author_name,
  pr.avatar_url as author_avatar
from public.jobs j
join public.profiles pr on pr.id = j.author_id;

create or replace function public.profile_stats(uid uuid)
returns table (following int, followers int, likes int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.follows where follower_id = uid)::int,
    (select count(*) from public.follows where following_id = uid)::int,
    (select count(*) from public.post_likes l join public.posts p on p.id = l.post_id
      where p.author_id = uid)::int;
$$;

-- ---------------------------------------------------------------------
-- RLS — regras de quem pode ler e escrever
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.follows             enable row level security;
alter table public.posts               enable row level security;
alter table public.post_likes          enable row level security;
alter table public.post_saves          enable row level security;
alter table public.comments            enable row level security;
alter table public.presentation_videos enable row level security;
alter table public.jobs                enable row level security;
alter table public.job_applications    enable row level security;
alter table public.job_saves           enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;

-- helper para recriar políticas sem erro
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- perfis: todos leem; cada um edita o seu (não pode trocar o próprio account_type por aqui)
create policy "perfis visiveis" on public.profiles for select to authenticated using (true);
create policy "edita o proprio perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.lock_account_type()
returns trigger language plpgsql as $$
begin
  if new.account_type <> old.account_type and current_user = 'authenticated' then
    raise exception 'account_type_locked';
  end if;
  return new;
end $$;
drop trigger if exists profiles_lock_account_type on public.profiles;
create trigger profiles_lock_account_type before update on public.profiles
  for each row execute function public.lock_account_type();

-- seguir
create policy "follows visiveis" on public.follows for select to authenticated using (true);
create policy "seguir" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "deixar de seguir" on public.follows for delete to authenticated using (follower_id = auth.uid());

-- posts
create policy "posts visiveis" on public.posts for select to authenticated using (true);
create policy "cria post" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "edita post" on public.posts for update to authenticated using (author_id = auth.uid());
create policy "apaga post" on public.posts for delete to authenticated using (author_id = auth.uid());

-- curtidas, salvos, comentários
create policy "likes visiveis" on public.post_likes for select to authenticated using (true);
create policy "curtir" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "descurtir" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "ve os proprios salvos" on public.post_saves for select to authenticated using (user_id = auth.uid());
create policy "salvar" on public.post_saves for insert to authenticated with check (user_id = auth.uid());
create policy "remover salvo" on public.post_saves for delete to authenticated using (user_id = auth.uid());

create policy "comentarios visiveis" on public.comments for select to authenticated using (true);
create policy "comentar" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "apaga comentario" on public.comments for delete to authenticated using (author_id = auth.uid());

-- apresentação
create policy "apresentacoes visiveis" on public.presentation_videos for select to authenticated using (true);
create policy "cria apresentacao" on public.presentation_videos for insert to authenticated with check (user_id = auth.uid());
create policy "edita apresentacao" on public.presentation_videos for update to authenticated using (user_id = auth.uid());
create policy "apaga apresentacao" on public.presentation_videos for delete to authenticated using (user_id = auth.uid());

-- vagas: só recrutador/empresa publica
create policy "vagas visiveis" on public.jobs for select to authenticated using (true);
create policy "recrutador publica vaga" on public.jobs for insert to authenticated
  with check (author_id = auth.uid() and public.is_recruiter(auth.uid()));
create policy "edita vaga" on public.jobs for update to authenticated using (author_id = auth.uid());
create policy "apaga vaga" on public.jobs for delete to authenticated using (author_id = auth.uid());

-- candidaturas: candidato vê as suas; autor da vaga vê e atualiza as da vaga dele
create policy "ve candidaturas" on public.job_applications for select to authenticated
  using (applicant_id = auth.uid()
         or exists (select 1 from public.jobs j where j.id = job_id and j.author_id = auth.uid()));
create policy "recrutador atualiza status" on public.job_applications for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.author_id = auth.uid()));
create policy "cancela candidatura" on public.job_applications for delete to authenticated
  using (applicant_id = auth.uid());
-- a candidatura é criada pela função apply_to_job

create policy "ve vagas salvas" on public.job_saves for select to authenticated using (user_id = auth.uid());
create policy "salva vaga" on public.job_saves for insert to authenticated with check (user_id = auth.uid());
create policy "remove vaga salva" on public.job_saves for delete to authenticated using (user_id = auth.uid());

-- conversas e mensagens: só participantes (criação via start_conversation/apply_to_job)
create policy "ve suas conversas" on public.conversations for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create policy "ve mensagens" on public.messages for select to authenticated
  using (public.is_participant(conversation_id, auth.uid()));
create policy "envia mensagem" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_participant(conversation_id, auth.uid()));
create policy "marca como lida" on public.messages for update to authenticated
  using (public.is_participant(conversation_id, auth.uid()) and sender_id <> auth.uid());

grant execute on function public.start_conversation(uuid, uuid) to authenticated;
grant execute on function public.apply_to_job(uuid) to authenticated;
grant execute on function public.profile_stats(uuid) to authenticated;
grant execute on function public.can_start_chat(uuid, uuid) to authenticated;

-- Chat em tempo real
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- ARQUIVOS (fotos, vídeos, avatares). Cada usuário grava só na própria
-- pasta: media/<id-do-usuario>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media leitura publica" on storage.objects;
drop policy if exists "media upload proprio"  on storage.objects;
drop policy if exists "media apaga proprio"   on storage.objects;
drop policy if exists "media atualiza proprio" on storage.objects;

create policy "media leitura publica" on storage.objects for select
  using (bucket_id = 'media');
create policy "media upload proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media atualiza proprio" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media apaga proprio" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- ENDURECIMENTO: só quem está logado chama as funções, e as funções
-- internas (gatilhos) não podem ser chamadas pela API.
-- ---------------------------------------------------------------------
alter function public.lock_account_type() set search_path = public;

revoke execute on function public.handle_new_user()                 from public, anon, authenticated;
revoke execute on function public.touch_conversation()              from public, anon, authenticated;
revoke execute on function public.lock_account_type()               from public, anon, authenticated;
revoke execute on function public.follows_each_other(uuid, uuid)    from public, anon, authenticated;
revoke execute on function public.is_recruiter(uuid)                from public, anon;
revoke execute on function public.is_participant(uuid, uuid)        from public, anon;
revoke execute on function public.can_start_chat(uuid, uuid)        from public, anon;
revoke execute on function public.start_conversation(uuid, uuid)    from public, anon;
revoke execute on function public.apply_to_job(uuid)                from public, anon;
revoke execute on function public.profile_stats(uuid)               from public, anon;
grant  execute on function public.is_recruiter(uuid)                to authenticated;
grant  execute on function public.is_participant(uuid, uuid)        to authenticated;

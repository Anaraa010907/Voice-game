-- Voice-game: суурь схем (өрөө, тоглогч, Mafia логик)
-- Бүх бичилт RPC функцээр дамжина (security definer). Хүснэгтүүд дээр
-- шууд insert/update/delete policy байхгүй тул хэрэглэгч хууран мэхэлж чадахгүй.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  game_type text not null check (game_type in ('mafia', 'spyfall', 'werewolf')),
  host_user uuid not null references auth.users (id) on delete cascade,
  is_public boolean not null default true,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  phase text not null default 'lobby',
  round int not null default 0,
  phase_ends_at timestamptz,
  winner text,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  avatar text not null default '🐺',
  is_host boolean not null default false,
  is_alive boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

-- Үүрэг нь нууц: policy байхгүй, зөвхөн get_my_role / reveal_roles RPC-ээр уншина.
create table public.player_roles (
  player_id uuid primary key references public.players (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  role text not null
);

create table public.night_actions (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round int not null,
  actor_id uuid not null references public.players (id) on delete cascade,
  kind text not null check (kind in ('kill', 'save', 'check')),
  target_id uuid not null references public.players (id) on delete cascade,
  primary key (room_id, round, actor_id)
);

create table public.votes (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round int not null,
  voter_id uuid not null references public.players (id) on delete cascade,
  target_id uuid references public.players (id) on delete cascade,
  primary key (room_id, round, voter_id)
);

create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  round int not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index on public.players (room_id);
create index on public.votes (room_id, round);
create index on public.private_notes (room_id, user_id);

-- ---------------------------------------------------------------- RLS

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.player_roles enable row level security;
alter table public.night_actions enable row level security;
alter table public.votes enable row level security;
alter table public.private_notes enable row level security;

create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players where room_id = p_room and user_id = auth.uid()
  );
$$;

create policy rooms_select on public.rooms for select to authenticated
  using (host_user = auth.uid() or public.is_room_member(id) or (is_public and status = 'lobby'));

create policy players_select on public.players for select to authenticated
  using (public.is_room_member(room_id));

create policy votes_select on public.votes for select to authenticated
  using (public.is_room_member(room_id));

create policy notes_select on public.private_notes for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- realtime

alter table public.players replica identity full;
alter table public.votes replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.rooms, public.players, public.votes, public.private_notes;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------- helpers

create or replace function public.gen_room_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  i int;
begin
  loop
    c := '';
    for i in 1..5 loop
      c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  return c;
end;
$$;

create or replace function public.append_log(p_room uuid, p_text text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.rooms
  set log = log || jsonb_build_array(jsonb_build_object('round', round, 'text', p_text))
  where id = p_room;
$$;
revoke all on function public.append_log(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- lobby RPC

create or replace function public.create_room(
  p_name text,
  p_game text default 'mafia',
  p_public boolean default true,
  p_avatar text default '🐺'
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.rooms;
begin
  if uid is null then raise exception 'Нэвтрээгүй байна'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Нэрээ оруулна уу'; end if;
  if p_game <> 'mafia' then raise exception 'Энэ тоглоом удахгүй нэмэгдэнэ'; end if;

  insert into public.rooms (code, game_type, host_user, is_public)
  values (public.gen_room_code(), p_game, uid, p_public)
  returning * into r;

  insert into public.players (room_id, user_id, name, avatar, is_host)
  values (r.id, uid, left(trim(p_name), 20), p_avatar, true);

  return r;
end;
$$;

create or replace function public.join_room(
  p_code text,
  p_name text,
  p_avatar text default '🐺'
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.rooms;
begin
  if uid is null then raise exception 'Нэвтрээгүй байна'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Нэрээ оруулна уу'; end if;

  select * into r from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'Өрөө олдсонгүй'; end if;

  if exists (select 1 from public.players where room_id = r.id and user_id = uid) then
    return r; -- дахин орж ирсэн
  end if;

  if r.status <> 'lobby' then raise exception 'Тоглоом эхэлсэн байна'; end if;
  if (select count(*) from public.players where room_id = r.id) >= 12 then
    raise exception 'Өрөө дүүрсэн (дээд тал нь 12)';
  end if;

  insert into public.players (room_id, user_id, name, avatar)
  values (r.id, uid, left(trim(p_name), 20), p_avatar);

  return r;
end;
$$;

create or replace function public.leave_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.rooms;
  me public.players;
  next_host public.players;
begin
  select * into r from public.rooms where id = p_room;
  if not found then return; end if;
  select * into me from public.players where room_id = p_room and user_id = uid;
  if not found then return; end if;

  if r.status = 'playing' then
    update public.players set is_alive = false where id = me.id;
    perform public.append_log(p_room, me.name || ' тоглоомоос гарлаа.');
    return;
  end if;

  delete from public.players where id = me.id;

  select * into next_host from public.players where room_id = p_room order by joined_at limit 1;
  if not found then
    delete from public.rooms where id = p_room;
  elsif me.is_host then
    update public.players set is_host = true where id = next_host.id;
    update public.rooms set host_user = next_host.user_id where id = p_room;
  end if;
end;
$$;

create or replace function public.list_public_rooms()
returns table (
  id uuid,
  code text,
  game_type text,
  player_count bigint,
  host_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.code, r.game_type,
         (select count(*) from public.players p where p.room_id = r.id),
         (select p.name from public.players p where p.room_id = r.id and p.is_host limit 1),
         r.created_at
  from public.rooms r
  where r.is_public and r.status = 'lobby' and r.created_at > now() - interval '6 hours'
  order by r.created_at desc
  limit 30;
$$;

-- ---------------------------------------------------------------- Mafia RPC

create or replace function public.start_game(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  n int;
  m int;
  roles text[] := '{}';
  i int;
  idx int := 1;
  pl record;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'Өрөө олдсонгүй'; end if;
  if r.host_user <> auth.uid() then raise exception 'Зөвхөн өрөөний эзэн эхлүүлнэ'; end if;
  if r.status <> 'lobby' then raise exception 'Тоглоом аль хэдийн эхэлсэн'; end if;

  select count(*) into n from public.players where room_id = p_room;
  if n < 4 then raise exception 'Хамгийн багадаа 4 тоглогч хэрэгтэй'; end if;

  m := greatest(1, n / 4);
  for i in 1..m loop roles := roles || 'mafia'; end loop;
  roles := roles || 'doctor' || 'detective';
  while array_length(roles, 1) < n loop roles := roles || 'civilian'; end loop;

  delete from public.player_roles where room_id = p_room;
  for pl in select id from public.players where room_id = p_room order by random() loop
    insert into public.player_roles (player_id, room_id, role) values (pl.id, p_room, roles[idx]);
    idx := idx + 1;
  end loop;

  update public.players set is_alive = true where room_id = p_room;
  update public.rooms
  set status = 'playing', phase = 'night', round = 1,
      phase_ends_at = now() + interval '45 seconds',
      winner = null,
      log = jsonb_build_array(jsonb_build_object('round', 1, 'text', 'Тоглоом эхэллээ. Хот нойрсож байна...'))
  where id = p_room;
end;
$$;

create or replace function public.get_my_role(p_room uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me public.players;
  my_role text;
  mates jsonb := '[]'::jsonb;
begin
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found then return null; end if;
  select role into my_role from public.player_roles where player_id = me.id;
  if my_role is null then return null; end if;

  if my_role = 'mafia' then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name)), '[]'::jsonb)
    into mates
    from public.player_roles pr
    join public.players p on p.id = pr.player_id
    where pr.room_id = p_room and pr.role = 'mafia' and p.id <> me.id;
  end if;

  return jsonb_build_object('player_id', me.id, 'role', my_role, 'teammates', mates);
end;
$$;

create or replace function public.reveal_roles(p_room uuid)
returns table (player_id uuid, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_room_member(p_room) then return; end if;
  if (select status from public.rooms where id = p_room) <> 'finished' then return; end if;
  return query select pr.player_id, pr.role from public.player_roles pr where pr.room_id = p_room;
end;
$$;

create or replace function public.submit_night_action(p_room uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  me public.players;
  my_role text;
  target public.players;
  target_role text;
  k text;
begin
  select * into r from public.rooms where id = p_room;
  if not found or r.status <> 'playing' or r.phase <> 'night' then
    raise exception 'Одоо шөнийн үе биш';
  end if;
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found or not me.is_alive then raise exception 'Та тоглоомд оролцохгүй байна'; end if;
  select role into my_role from public.player_roles where player_id = me.id;

  k := case my_role when 'mafia' then 'kill' when 'doctor' then 'save' when 'detective' then 'check' end;
  if k is null then raise exception 'Иргэн шөнө үйлдэл хийхгүй'; end if;

  select * into target from public.players where id = p_target and room_id = p_room and is_alive;
  if not found then raise exception 'Зорилт буруу байна'; end if;

  if k = 'kill' then
    select role into target_role from public.player_roles where player_id = target.id;
    if target_role = 'mafia' then raise exception 'Мафи өөрийн хүнийг алахгүй'; end if;
  end if;
  if k = 'check' and target.id = me.id then raise exception 'Өөрийгөө шалгах боломжгүй'; end if;

  insert into public.night_actions (room_id, round, actor_id, kind, target_id)
  values (p_room, r.round, me.id, k, target.id)
  on conflict (room_id, round, actor_id) do update set target_id = excluded.target_id;
end;
$$;

create or replace function public.cast_vote(p_room uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  me public.players;
begin
  select * into r from public.rooms where id = p_room;
  if not found or r.status <> 'playing' or r.phase <> 'day' then
    raise exception 'Одоо санал хураах үе биш';
  end if;
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found or not me.is_alive then raise exception 'Та санал өгөх эрхгүй'; end if;

  if p_target is not null then
    if p_target = me.id then raise exception 'Өөртөө санал өгөх боломжгүй'; end if;
    if not exists (select 1 from public.players where id = p_target and room_id = p_room and is_alive) then
      raise exception 'Зорилт буруу байна';
    end if;
  end if;

  insert into public.votes (room_id, round, voter_id, target_id)
  values (p_room, r.round, me.id, p_target)
  on conflict (room_id, round, voter_id) do update set target_id = excluded.target_id;
end;
$$;

-- Ялагчийг шалгаж, тоглоомыг дуусгана. Дууссан бол true.
create or replace function public.check_win(p_room uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mafia_alive int;
  others_alive int;
  w text;
begin
  select
    count(*) filter (where pr.role = 'mafia'),
    count(*) filter (where pr.role <> 'mafia')
  into mafia_alive, others_alive
  from public.players p
  join public.player_roles pr on pr.player_id = p.id
  where p.room_id = p_room and p.is_alive;

  if mafia_alive = 0 then w := 'town';
  elsif mafia_alive >= others_alive then w := 'mafia';
  else return false;
  end if;

  update public.rooms
  set status = 'finished', phase = 'finished', winner = w, phase_ends_at = null
  where id = p_room;
  perform public.append_log(
    p_room,
    case w when 'town' then 'Хотынхон ялалт байгууллаа! Бүх мафи баригдлаа.'
           else 'Мафи ялалт байгууллаа!' end
  );
  return true;
end;
$$;
revoke all on function public.check_win(uuid) from public, anon, authenticated;

-- p_phase / p_round: клиентийн харж буй үе. Хэд хэдэн клиент зэрэг дуудахад
-- давхар шилжихээс сэргийлж, үе таарахгүй бол юу ч хийхгүй.
create or replace function public.advance_phase(p_room uuid, p_phase text, p_round int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  kill_target uuid;
  save_target uuid;
  victim public.players;
  victim_role text;
  a record;
  t_name text;
  t_role text;
  vote_target uuid;
  top_count int;
  top_n int;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.status <> 'playing' then return; end if;
  if r.phase <> p_phase or r.round <> p_round then return; end if;
  if not public.is_room_member(p_room) then raise exception 'Та энэ өрөөний гишүүн биш'; end if;
  if r.host_user <> auth.uid() and (r.phase_ends_at is null or r.phase_ends_at > now()) then
    raise exception 'Хугацаа дуусаагүй байна';
  end if;

  if r.phase = 'night' then
    -- Мафийн хамгийн их санал авсан зорилт (тэнцвэл санамсаргүй)
    select target_id into kill_target
    from public.night_actions
    where room_id = p_room and round = r.round and kind = 'kill'
    group by target_id
    order by count(*) desc, random()
    limit 1;

    select target_id into save_target
    from public.night_actions
    where room_id = p_room and round = r.round and kind = 'save'
    limit 1;

    if kill_target is null then
      perform public.append_log(p_room, 'Шөнө тайван өнгөрлөө.');
    elsif kill_target = save_target then
      perform public.append_log(p_room, 'Шөнө хэн нэгнийг алахыг завдсан ч эмч аварлаа.');
    else
      select * into victim from public.players where id = kill_target;
      select role into victim_role from public.player_roles where player_id = victim.id;
      update public.players set is_alive = false where id = victim.id;
      perform public.append_log(
        p_room,
        victim.name || ' шөнө алагдлаа. Үүрэг: ' || public.role_label(victim_role)
      );
    end if;

    -- Мөрдөгчийн шалгалтын хариу (зөвхөн мөрдөгчид харагдана)
    for a in
      select na.actor_id, na.target_id from public.night_actions na
      where na.room_id = p_room and na.round = r.round and na.kind = 'check'
    loop
      select name into t_name from public.players where id = a.target_id;
      select role into t_role from public.player_roles where player_id = a.target_id;
      insert into public.private_notes (room_id, user_id, round, text)
      select p_room, p.user_id, r.round,
             t_name || ' — ' || case when t_role = 'mafia' then 'МАФИ' else 'мафи биш' end
      from public.players p where p.id = a.actor_id;
    end loop;

    if public.check_win(p_room) then return; end if;

    update public.rooms
    set phase = 'day', phase_ends_at = now() + interval '120 seconds'
    where id = p_room;

  elsif r.phase = 'day' then
    -- Санал хураалт: хамгийн их санал авсан нэг хүн хөөгдөнө, тэнцвэл хэн ч хөөгдөхгүй
    select count(*) into top_count
    from public.votes v
    join public.players p on p.id = v.voter_id and p.is_alive
    where v.room_id = p_room and v.round = r.round and v.target_id is not null
    group by v.target_id
    order by count(*) desc
    limit 1;

    vote_target := null;
    if top_count is not null then
      select count(*) into top_n from (
        select v.target_id
        from public.votes v
        join public.players p on p.id = v.voter_id and p.is_alive
        where v.room_id = p_room and v.round = r.round and v.target_id is not null
        group by v.target_id
        having count(*) = top_count
      ) s;

      if top_n = 1 then
        select v.target_id into vote_target
        from public.votes v
        join public.players p on p.id = v.voter_id and p.is_alive
        where v.room_id = p_room and v.round = r.round and v.target_id is not null
        group by v.target_id
        having count(*) = top_count;
      end if;
    end if;

    if vote_target is null then
      perform public.append_log(p_room, 'Санал тэнцлээ — хэн ч хөөгдсөнгүй.');
    else
      select * into victim from public.players where id = vote_target;
      select role into victim_role from public.player_roles where player_id = victim.id;
      update public.players set is_alive = false where id = victim.id;
      perform public.append_log(
        p_room,
        victim.name || ' санал хураалтаар хөөгдлөө. Үүрэг: ' || public.role_label(victim_role)
      );
    end if;

    if public.check_win(p_room) then return; end if;

    update public.rooms
    set phase = 'night', round = round + 1, phase_ends_at = now() + interval '45 seconds'
    where id = p_room;
    perform public.append_log(p_room, 'Шөнө болж байна...');
  end if;
end;
$$;

create or replace function public.role_label(p_role text)
returns text
language sql
immutable
as $$
  select case p_role
    when 'mafia' then 'Мафи'
    when 'doctor' then 'Эмч'
    when 'detective' then 'Мөрдөгч'
    else 'Иргэн'
  end;
$$;

create or replace function public.play_again(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'Өрөө олдсонгүй'; end if;
  if r.host_user <> auth.uid() then raise exception 'Зөвхөн өрөөний эзэн дахин эхлүүлнэ'; end if;
  if r.status <> 'finished' then raise exception 'Тоглоом дуусаагүй байна'; end if;

  delete from public.player_roles where room_id = p_room;
  delete from public.night_actions where room_id = p_room;
  delete from public.votes where room_id = p_room;
  delete from public.private_notes where room_id = p_room;
  update public.players set is_alive = true where room_id = p_room;
  update public.rooms
  set status = 'lobby', phase = 'lobby', round = 0, phase_ends_at = null, winner = null, log = '[]'::jsonb
  where id = p_room;
end;
$$;

-- ---------------------------------------------------------------- grants

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_room_member(uuid),
  public.create_room(text, text, boolean, text),
  public.join_room(text, text, text),
  public.leave_room(uuid),
  public.list_public_rooms(),
  public.start_game(uuid),
  public.get_my_role(uuid),
  public.reveal_roles(uuid),
  public.submit_night_action(uuid, uuid),
  public.cast_vote(uuid, uuid),
  public.advance_phase(uuid, text, int),
  public.play_again(uuid)
to authenticated;

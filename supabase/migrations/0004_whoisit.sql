-- Voice-game: "Хэн вэ?" тоглоом (нууц санал, эерэг асуултууд)
-- 0001–0003-ын дараа ажиллуулна.

-- Тоглоомын нийтэд ил төлөв (асуултууд, үр дүн, шагналууд)
alter table public.rooms add column if not exists state jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------- tables

create table public.whois_questions (
  id serial primary key,
  text text unique not null
);
alter table public.whois_questions enable row level security;

-- Нууц санал: policy байхгүй тул хэн хэнд санал өгснийг хэн ч уншиж чадахгүй.
-- Зөвхөн нийлбэр тоо rooms.state.results-д гарна.
create table public.whois_votes (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round int not null,
  voter_id uuid not null references public.players (id) on delete cascade,
  target_id uuid not null references public.players (id) on delete cascade,
  primary key (room_id, round, voter_id)
);
alter table public.whois_votes enable row level security;

insert into public.whois_questions (text) values
  ('Хэн хамгийн хөгжилтэй вэ?'),
  ('Хэн хамгийн нинжин сэтгэлтэй вэ?'),
  ('Хэн хамгийн цагаа баримталдаг вэ?'),
  ('Хэн хамгийн ухаалаг вэ?'),
  ('Хэн хамгийн зоригтой вэ?'),
  ('Хэн хамгийн сайхан инээдэг вэ?'),
  ('Хэн хамгийн амттай хоол хийдэг вэ?'),
  ('Хэн хамгийн найдвартай найз вэ?'),
  ('Хэн хамгийн сайн дуулдаг вэ?'),
  ('Хэн хамгийн сайхан хувцасладаг вэ?'),
  ('Хэн хамгийн сайн сонсогч вэ?'),
  ('Хэн хамгийн тусч вэ?'),
  ('Хэн хамгийн тайван байдаг вэ?'),
  ('Хэн хамгийн сайн удирдагч болох вэ?'),
  ('Хэн хамгийн сайн бүжиглэдэг вэ?'),
  ('Хэн хамгийн их газар нутаг үзсэн бэ?'),
  ('Хэн хамгийн сайн зөвлөгөө өгдөг вэ?'),
  ('Хэн хамгийн бүтээлч вэ?'),
  ('Хэн хамгийн хөдөлмөрч вэ?'),
  ('Хэн хамгийн сайн түүх ярьдаг вэ?'),
  ('Хэн хамгийн өгөөмөр вэ?'),
  ('Хэн хамгийн их мэдлэгтэй вэ?'),
  ('Хэн хамгийн сайн багаар ажилладаг вэ?'),
  ('Хэн хамгийн хурдан шийдвэр гаргадаг вэ?'),
  ('Хэн хамгийн итгэл төрүүлдэг вэ?'),
  ('Хэн хамгийн шинэ зүйл туршихад дуртай вэ?'),
  ('Хэн хамгийн их баяр баясгалан авчирдаг вэ?'),
  ('Хэн хамгийн сайн гоо зүйн мэдрэмжтэй вэ?'),
  ('Хэн хамгийн даруухан вэ?'),
  ('Хэн хамгийн их урам өгдөг вэ?')
on conflict do nothing;

-- ---------------------------------------------------------------- create_room

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
  if p_game not in ('mafia', 'imposter', 'whoisit') then
    raise exception 'Энэ тоглоом удахгүй нэмэгдэнэ';
  end if;

  insert into public.rooms (code, game_type, host_user, is_public)
  values (public.gen_room_code(), p_game, uid, p_public)
  returning * into r;

  insert into public.players (room_id, user_id, name, avatar, is_host)
  values (r.id, uid, left(trim(p_name), 20), p_avatar, true);

  return r;
end;
$$;

-- ---------------------------------------------------------------- RPC

create or replace function public.start_whoisit(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  n int;
  qs jsonb;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'Өрөө олдсонгүй'; end if;
  if r.game_type <> 'whoisit' then raise exception 'Энэ өрөө "Хэн вэ?" тоглоом биш'; end if;
  if r.host_user <> auth.uid() then raise exception 'Зөвхөн өрөөний эзэн эхлүүлнэ'; end if;
  if r.status <> 'lobby' then raise exception 'Тоглоом аль хэдийн эхэлсэн'; end if;

  select count(*) into n from public.players where room_id = p_room;
  if n < 3 then raise exception 'Хамгийн багадаа 3 тоглогч хэрэгтэй'; end if;

  select coalesce(jsonb_agg(q.text), '[]'::jsonb) into qs
  from (select text from public.whois_questions order by random() limit 8) q;

  delete from public.whois_votes where room_id = p_room;
  update public.players set is_alive = true where room_id = p_room;

  update public.rooms
  set status = 'playing', phase = 'vote', round = 1,
      phase_ends_at = now() + interval '30 seconds',
      winner = null,
      log = '[]'::jsonb,
      state = jsonb_build_object(
        'questions', qs,
        'total', jsonb_array_length(qs),
        'voted', 0,
        'results', 'null'::jsonb,
        'wins', '{}'::jsonb,
        'titles', '[]'::jsonb
      )
  where id = p_room;
end;
$$;

-- Нэг асуултын саналыг нийлбэрлэж, үр дүнг rooms.state-д бичнэ (дотоод функц).
-- Дуудагч нь өрөөний мөрийг түгжсэн байх ёстой.
create or replace function public.whois_close_round(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  st jsonb;
  res jsonb;
  max_cnt int;
  winners jsonb := '[]'::jsonb;
  wins jsonb;
  titles jsonb;
  q text;
  w record;
begin
  select * into r from public.rooms where id = p_room;
  st := r.state;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', x.id, 'name', x.name, 'count', x.cnt)
      order by x.cnt desc, x.name
    ),
    '[]'::jsonb
  )
  into res
  from (
    select p.id, p.name, count(v.voter_id)::int as cnt
    from public.players p
    left join public.whois_votes v
      on v.target_id = p.id and v.room_id = p_room and v.round = r.round
    where p.room_id = p_room
    group by p.id, p.name
  ) x;

  max_cnt := coalesce((res -> 0 ->> 'count')::int, 0);
  wins := coalesce(st -> 'wins', '{}'::jsonb);

  if max_cnt > 0 then
    for w in
      select e ->> 'id' as id, e ->> 'name' as name
      from jsonb_array_elements(res) e
      where (e ->> 'count')::int = max_cnt
    loop
      winners := winners || to_jsonb(w.name);
      wins := jsonb_set(wins, array[w.id], to_jsonb(coalesce((wins ->> w.id)::int, 0) + 1), true);
    end loop;
  end if;

  q := st -> 'questions' ->> (r.round - 1);
  titles := coalesce(st -> 'titles', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('question', q, 'winners', winners));

  st := jsonb_set(st, '{results}', res);
  st := jsonb_set(st, '{wins}', wins);
  st := jsonb_set(st, '{titles}', titles);

  update public.rooms
  set state = st, phase = 'result', phase_ends_at = now() + interval '10 seconds'
  where id = p_room;
end;
$$;
revoke all on function public.whois_close_round(uuid) from public, anon, authenticated;

create or replace function public.cast_whois_vote(p_room uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  me public.players;
  cnt int;
  total int;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.game_type <> 'whoisit' or r.status <> 'playing' or r.phase <> 'vote' then
    raise exception 'Одоо санал өгөх үе биш';
  end if;
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'Та энэ өрөөний гишүүн биш'; end if;
  if p_target = me.id then raise exception 'Өөртөө санал өгөх боломжгүй'; end if;
  if not exists (select 1 from public.players where id = p_target and room_id = p_room) then
    raise exception 'Зорилт буруу байна';
  end if;

  insert into public.whois_votes (room_id, round, voter_id, target_id)
  values (p_room, r.round, me.id, p_target)
  on conflict (room_id, round, voter_id) do update set target_id = excluded.target_id;

  select count(*) into cnt from public.whois_votes where room_id = p_room and round = r.round;
  select count(*) into total from public.players where room_id = p_room;

  update public.rooms set state = jsonb_set(state, '{voted}', to_jsonb(cnt)) where id = p_room;

  -- Бүгд санал өгсөн бол хугацаа хүлээлгүй үр дүнг гаргана
  if cnt >= total then
    perform public.whois_close_round(p_room);
  end if;
end;
$$;

-- vote → result → (дараагийн асуулт | finished)
create or replace function public.advance_whois(p_room uuid, p_phase text, p_round int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.game_type <> 'whoisit' or r.status <> 'playing' then return; end if;
  if r.phase <> p_phase or r.round <> p_round then return; end if;
  if not public.is_room_member(p_room) then raise exception 'Та энэ өрөөний гишүүн биш'; end if;
  if r.host_user <> auth.uid() and (r.phase_ends_at is null or r.phase_ends_at > now()) then
    raise exception 'Хугацаа дуусаагүй байна';
  end if;

  if r.phase = 'vote' then
    perform public.whois_close_round(p_room);

  elsif r.phase = 'result' then
    if r.round >= coalesce((r.state ->> 'total')::int, 0) then
      update public.rooms
      set status = 'finished', phase = 'finished', phase_ends_at = null
      where id = p_room;
    else
      update public.rooms
      set round = round + 1,
          phase = 'vote',
          phase_ends_at = now() + interval '30 seconds',
          state = jsonb_set(jsonb_set(state, '{voted}', '0'::jsonb), '{results}', 'null'::jsonb)
      where id = p_room;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------- grants

revoke execute on function
  public.start_whoisit(uuid),
  public.cast_whois_vote(uuid, uuid),
  public.advance_whois(uuid, text, int)
from public, anon;

grant execute on function
  public.start_whoisit(uuid),
  public.cast_whois_vote(uuid, uuid),
  public.advance_whois(uuid, text, int)
to authenticated;

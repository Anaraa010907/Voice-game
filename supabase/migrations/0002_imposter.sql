-- Voice-game: Who's the Imposter? тоглоом + шинэ тоглоомын төрлүүд
-- 0001_init.sql-ийн дараа ажиллуулна.

-- ---------------------------------------------------------------- game types

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.rooms add constraint rooms_game_type_check check (
  game_type in (
    'mafia', 'imposter', 'spyfall', 'werewolf', 'charades',
    'guesswho', 'truthdare', 'codenames', 'twotruths', 'taboo'
  )
);

-- Одоогоор зөвхөн mafia, imposter тоглогдоно
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
  if p_game not in ('mafia', 'imposter') then
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

-- ---------------------------------------------------------------- tables

-- Нууц үгс: policy байхгүй, зөвхөн RPC-ээр уншина
create table public.imposter_words (
  id serial primary key,
  category text not null,
  word text not null,
  unique (category, word)
);
alter table public.imposter_words enable row level security;

create table public.game_secrets (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  word text not null,
  category text not null
);
alter table public.game_secrets enable row level security;

insert into public.imposter_words (category, word) values
  ('Хоол', 'бууз'), ('Хоол', 'хуушуур'), ('Хоол', 'цуйван'), ('Хоол', 'банш'),
  ('Хоол', 'хорхог'), ('Хоол', 'шөл'), ('Хоол', 'пицца'), ('Хоол', 'самса'),
  ('Хоол', 'зайрмаг'), ('Хоол', 'талх'),
  ('Амьтан', 'морь'), ('Амьтан', 'тэмээ'), ('Амьтан', 'хонь'), ('Амьтан', 'ямаа'),
  ('Амьтан', 'үхэр'), ('Амьтан', 'чоно'), ('Амьтан', 'ирвэс'), ('Амьтан', 'тарвага'),
  ('Амьтан', 'нохой'), ('Амьтан', 'муур'),
  ('Газар', 'Хөвсгөл нуур'), ('Газар', 'Говийн цөл'), ('Газар', 'Эрдэнэ Зуу хийд'),
  ('Газар', 'Сүхбаатарын талбай'), ('Газар', 'Тэрэлж'), ('Газар', 'Хархорин'),
  ('Газар', 'Налайх'), ('Газар', 'Зайсан толгой'),
  ('Эд зүйл', 'гар утас'), ('Эд зүйл', 'шүхэр'), ('Эд зүйл', 'түлхүүр'),
  ('Эд зүйл', 'нүдний шил'), ('Эд зүйл', 'гар цүнх'), ('Эд зүйл', 'дугуй'),
  ('Эд зүйл', 'ном'), ('Эд зүйл', 'хайч'), ('Эд зүйл', 'цаг'), ('Эд зүйл', 'толь'),
  ('Мэргэжил', 'эмч'), ('Мэргэжил', 'багш'), ('Мэргэжил', 'жолооч'),
  ('Мэргэжил', 'тогооч'), ('Мэргэжил', 'цагдаа'), ('Мэргэжил', 'малчин'),
  ('Мэргэжил', 'жүжигчин'), ('Мэргэжил', 'программист'), ('Мэргэжил', 'барилгачин'),
  ('Мэргэжил', 'уурхайчин'),
  ('Спорт', 'бөх'), ('Спорт', 'сур харваа'), ('Спорт', 'морин уралдаан'),
  ('Спорт', 'хөлбөмбөг'), ('Спорт', 'сагсан бөмбөг'), ('Спорт', 'шатар'),
  ('Спорт', 'усан сэлэлт'),
  ('Баяр ёслол', 'Цагаан сар'), ('Баяр ёслол', 'Наадам'), ('Баяр ёслол', 'Шинэ жил'),
  ('Баяр ёслол', 'төрсөн өдөр'), ('Баяр ёслол', 'хуримын ёслол')
on conflict do nothing;

-- ---------------------------------------------------------------- my role / secret

-- 0001-ийн get_my_role-ийг imposter-ийн ангилал/үгийг буцаадаг болгож өргөтгөв
create or replace function public.get_my_role(p_room uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me public.players;
  g public.rooms;
  s public.game_secrets;
  my_role text;
  mates jsonb := '[]'::jsonb;
begin
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found then return null; end if;
  select role into my_role from public.player_roles where player_id = me.id;
  if my_role is null then return null; end if;

  select * into g from public.rooms where id = p_room;

  if g.game_type = 'imposter' then
    select * into s from public.game_secrets where room_id = p_room;
    return jsonb_build_object(
      'player_id', me.id,
      'role', my_role,
      'teammates', '[]'::jsonb,
      'category', s.category,
      'word', case when my_role = 'imposter' then null else s.word end
    );
  end if;

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

-- ---------------------------------------------------------------- imposter RPC

create or replace function public.start_imposter(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  n int;
  w public.imposter_words;
  imp uuid;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'Өрөө олдсонгүй'; end if;
  if r.game_type <> 'imposter' then raise exception 'Энэ өрөө imposter тоглоом биш'; end if;
  if r.host_user <> auth.uid() then raise exception 'Зөвхөн өрөөний эзэн эхлүүлнэ'; end if;
  if r.status <> 'lobby' then raise exception 'Тоглоом аль хэдийн эхэлсэн'; end if;

  select count(*) into n from public.players where room_id = p_room;
  if n < 3 then raise exception 'Хамгийн багадаа 3 тоглогч хэрэгтэй'; end if;

  select * into w from public.imposter_words order by random() limit 1;
  select id into imp from public.players where room_id = p_room order by random() limit 1;

  delete from public.player_roles where room_id = p_room;
  delete from public.votes where room_id = p_room;

  insert into public.player_roles (player_id, room_id, role)
  select id, p_room, case when id = imp then 'imposter' else 'crew' end
  from public.players where room_id = p_room;

  insert into public.game_secrets (room_id, word, category)
  values (p_room, w.word, w.category)
  on conflict (room_id) do update set word = excluded.word, category = excluded.category;

  update public.players set is_alive = true where room_id = p_room;
  update public.rooms
  set status = 'playing', phase = 'reveal', round = 1,
      phase_ends_at = now() + interval '20 seconds',
      winner = null,
      log = jsonb_build_array(jsonb_build_object(
        'round', 1,
        'text', 'Тоглоом эхэллээ. Үгээ хараарай — imposter зөвхөн ангиллыг мэднэ.'
      ))
  where id = p_room;
end;
$$;

create or replace function public.cast_imposter_vote(p_room uuid, p_target uuid)
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
  if not found or r.game_type <> 'imposter' or r.status <> 'playing' or r.phase <> 'vote' then
    raise exception 'Одоо санал хураах үе биш';
  end if;
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'Та энэ өрөөний гишүүн биш'; end if;

  if p_target is not null then
    if p_target = me.id then raise exception 'Өөртөө санал өгөх боломжгүй'; end if;
    if not exists (select 1 from public.players where id = p_target and room_id = p_room) then
      raise exception 'Зорилт буруу байна';
    end if;
  end if;

  insert into public.votes (room_id, round, voter_id, target_id)
  values (p_room, r.round, me.id, p_target)
  on conflict (room_id, round, voter_id) do update set target_id = excluded.target_id;
end;
$$;

-- Тоглоомыг дуусгаж, үгийг ил болгоно (дотоод функц)
create or replace function public.finish_imposter(p_room uuid, p_winner text, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.game_secrets;
  imp_name text;
begin
  select * into s from public.game_secrets where room_id = p_room;
  select p.name into imp_name
  from public.players p
  join public.player_roles pr on pr.player_id = p.id
  where pr.room_id = p_room and pr.role = 'imposter'
  limit 1;

  update public.rooms
  set status = 'finished', phase = 'finished', winner = p_winner, phase_ends_at = null
  where id = p_room;

  perform public.append_log(p_room, p_text);
  perform public.append_log(
    p_room,
    'Imposter: ' || coalesce(imp_name, '?') || ' · Үг: ' || coalesce(s.word, '?')
      || ' (' || coalesce(s.category, '') || ')'
  );
  perform public.append_log(
    p_room,
    case p_winner when 'crew' then 'Багийнхан ялалаа!' else 'Imposter ялалаа!' end
  );
end;
$$;

create or replace function public.submit_imposter_guess(p_room uuid, p_guess text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  me public.players;
  my_role text;
  s public.game_secrets;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.game_type <> 'imposter' or r.status <> 'playing' or r.phase <> 'guess' then
    raise exception 'Одоо таах үе биш';
  end if;
  select * into me from public.players where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'Та энэ өрөөний гишүүн биш'; end if;
  select role into my_role from public.player_roles where player_id = me.id;
  if my_role <> 'imposter' then raise exception 'Зөвхөн imposter таана'; end if;

  select * into s from public.game_secrets where room_id = p_room;

  if lower(trim(p_guess)) = lower(s.word) then
    perform public.finish_imposter(p_room, 'imposter', me.name || ' үгийг зөв таалаа: "' || s.word || '"');
  else
    perform public.finish_imposter(
      p_room, 'crew',
      me.name || ' буруу таалаа: "' || left(trim(p_guess), 40) || '"'
    );
  end if;
end;
$$;

-- reveal → discuss → vote → (guess) → finished
create or replace function public.advance_imposter(p_room uuid, p_phase text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  top_target uuid;
  top_count int;
  top_n int := 0;
  target_role text;
  target_name text;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.game_type <> 'imposter' or r.status <> 'playing' then return; end if;
  if r.phase <> p_phase then return; end if;
  if not public.is_room_member(p_room) then raise exception 'Та энэ өрөөний гишүүн биш'; end if;
  if r.host_user <> auth.uid() and (r.phase_ends_at is null or r.phase_ends_at > now()) then
    raise exception 'Хугацаа дуусаагүй байна';
  end if;

  if r.phase = 'reveal' then
    update public.rooms
    set phase = 'discuss', phase_ends_at = now() + interval '150 seconds'
    where id = p_room;
    perform public.append_log(p_room, 'Хэлэлцүүлэг эхэллээ. Үгээ шууд хэлэлгүй, тайлбарлан ярь.');

  elsif r.phase = 'discuss' then
    update public.rooms
    set phase = 'vote', phase_ends_at = now() + interval '45 seconds'
    where id = p_room;
    perform public.append_log(p_room, 'Санал хураалт эхэллээ — imposter хэн бэ?');

  elsif r.phase = 'vote' then
    select v.target_id, count(*) into top_target, top_count
    from public.votes v
    where v.room_id = p_room and v.round = r.round and v.target_id is not null
    group by v.target_id
    order by count(*) desc
    limit 1;

    if top_count is not null then
      select count(*) into top_n from (
        select 1
        from public.votes v
        where v.room_id = p_room and v.round = r.round and v.target_id is not null
        group by v.target_id
        having count(*) = top_count
      ) tied;
    end if;

    if top_target is null or top_n <> 1 then
      perform public.finish_imposter(
        p_room, 'imposter', 'Хэн ч хөөгдсөнгүй (санал тэнцсэн эсвэл өгөөгүй).'
      );
    else
      select role into target_role from public.player_roles where player_id = top_target;
      select name into target_name from public.players where id = top_target;
      if target_role = 'imposter' then
        update public.rooms
        set phase = 'guess', phase_ends_at = now() + interval '30 seconds'
        where id = p_room;
        perform public.append_log(
          p_room,
          target_name || ' imposter байсан! Гэхдээ үгийг зөв таавал ялна.'
        );
      else
        perform public.finish_imposter(
          p_room, 'imposter', target_name || ' хөөгдсөн ч imposter биш байлаа.'
        );
      end if;
    end if;

  elsif r.phase = 'guess' then
    perform public.finish_imposter(p_room, 'crew', 'Imposter үгээ тааж амжсангүй.');
  end if;
end;
$$;

-- ---------------------------------------------------------------- grants

revoke execute on function
  public.start_imposter(uuid),
  public.cast_imposter_vote(uuid, uuid),
  public.submit_imposter_guess(uuid, text),
  public.advance_imposter(uuid, text)
from public, anon;

grant execute on function
  public.start_imposter(uuid),
  public.cast_imposter_vote(uuid, uuid),
  public.submit_imposter_guess(uuid, text),
  public.advance_imposter(uuid, text)
to authenticated;

revoke all on function public.finish_imposter(uuid, text, text) from public, anon, authenticated;

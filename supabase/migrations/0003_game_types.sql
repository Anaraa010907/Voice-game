-- Voice-game: тоглоомын төрлийн жагсаалтыг шинэчилсэн
-- Хасагдсан: spyfall, werewolf, charades. Нэмэгдсэн: whoisit (Хэн вэ?), bluff (Худал үнэн).

delete from public.rooms where game_type in ('spyfall', 'werewolf', 'charades');

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.rooms add constraint rooms_game_type_check check (
  game_type in (
    'mafia', 'imposter', 'guesswho', 'truthdare',
    'codenames', 'twotruths', 'taboo', 'whoisit', 'bluff'
  )
);

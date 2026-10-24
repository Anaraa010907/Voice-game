-- Voice-game: тоглоомын төрлийн эцсийн жагсаалт
-- Хасагдсан: spyfall, werewolf, charades, bluff. Нэмэгдсэн: whoisit (Хэн вэ?).

delete from public.rooms where game_type in ('spyfall', 'werewolf', 'charades', 'bluff');

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.rooms add constraint rooms_game_type_check check (
  game_type in (
    'mafia', 'imposter', 'guesswho', 'truthdare',
    'codenames', 'twotruths', 'taboo', 'whoisit'
  )
);

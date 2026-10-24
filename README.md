# Voice-game

Найзуудтайгаа дуугаар тоглох хөзрийн тоглоомууд: **Мафи**, Spyfall (Тагнуулын ширээ), Werewolf (Чоно).
React + Vite + TypeScript, Supabase (өгөгдөл + realtime), LiveKit (voice).

| Тоглоом | Төлөв |
| --- | --- |
| Мафи (Мафи / Эмч / Мөрдөгч / Иргэн) | ✅ эхний хувилбар |
| Spyfall | ⏳ удахгүй |
| Werewolf | ⏳ удахгүй |

## Тохируулах

1. `npm install`
2. `.env.example`-ийг `.env` болгож хуулаад Supabase URL / anon key-ээ бөглөнө.
3. Supabase төсөл дээр:
   - **Authentication → Providers → Anonymous sign-ins**-ийг идэвхжүүлнэ.
   - `supabase/migrations/0001_init.sql`-ийг ажиллуулна (SQL editor эсвэл `supabase db push`).
   - Edge function байршуулна: `supabase functions deploy livekit-token`
   - Secrets: `supabase secrets set LIVEKIT_URL=wss://... LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...`
4. `npm run dev`

## Бүтэц

- `supabase/migrations/0001_init.sql` — хүснэгт, RLS, бүх тоглоомын логик (RPC). Үүрэг нууц хадгалагдана, зөвхөн өөрийн үүргийг уншиж чадна.
- `supabase/functions/livekit-token` — өрөөний гишүүнд LiveKit token олгоно.
- `src/games/registry.ts` — тоглоомуудын жагсаалт + voice дүрэм (хэн хэнийг сонсох).
- `src/games/mafia/` — Мафи UI.

## Мафи дүрэм

- Шөнө (45с): мафи хохирогч сонгоно, эмч аврана, мөрдөгч шалгана.
- Өдөр (120с): хэлэлцэж санал хураана, хамгийн их санал авсан хүн хөөгдөнө (тэнцвэл хэн ч үгүй).
- Voice: шөнө зөвхөн мафи хоорондоо ярина, өдөр амьд хүмүүс ярина, хасагдсан хүмүүс үзэгч болж бие биетэйгээ ярина.
- 4–12 тоглогч. Мафийн тоо = тоглогч / 4 (дор хаяж 1).

> Анхаар: voice-ийн дүрмийг одоогоор клиент талд хэрэгжүүлсэн (сонсохгүй/ярихгүй болгодог). Хатуу хамгаалалт хэрэгтэй бол LiveKit token-ий эрхийг үе бүрт шинэчилдэг болгоно.

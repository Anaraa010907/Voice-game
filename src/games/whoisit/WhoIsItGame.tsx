import { useState } from "react";
import { api } from "../../lib/api";
import { useAutoAdvance } from "../../lib/useAutoAdvance";
import { useNow } from "../../lib/useNow";
import { PlayerGrid } from "../../components/PlayerGrid";
import type { GameCtx } from "../registry";

interface WhoResult {
  id: string;
  name: string;
  count: number;
}

interface WhoState {
  questions?: string[];
  total?: number;
  voted?: number;
  results?: WhoResult[] | null;
  wins?: Record<string, number>;
  titles?: { question: string; winners: string[] }[];
}

interface Props {
  ctx: GameCtx;
  speaking: Set<string>;
  isHost: boolean;
}

export function WhoIsItGame({ ctx, speaking, isHost }: Props) {
  const { room, players, me } = ctx;
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ round: number; id: string } | null>(null);

  const st = room.state as unknown as WhoState;
  const total = st.total ?? 0;
  const question = st.questions?.[room.round - 1] ?? "";
  const results = st.results ?? null;
  const finished = room.status === "finished";
  const voting = room.phase === "vote";
  const showingResult = room.phase === "result";

  useAutoAdvance(room, isHost, () => api.whoisitAdvance(room.id, room.phase, room.round));

  const secondsLeft = room.phase_ends_at
    ? Math.max(0, Math.ceil((new Date(room.phase_ends_at).getTime() - now) / 1000))
    : 0;

  const myPick = picked && picked.round === room.round ? picked.id : null;

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const vote = (id: string) => {
    setPicked({ round: room.round, id });
    void act(() => api.whoisitVote(room.id, id));
  };

  // Нийт шагналын жагсаалт (finished)
  const leaderboard = players
    .map((p) => ({ player: p, wins: st.wins?.[p.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);
  const bestWins = leaderboard[0]?.wins ?? 0;

  const maxCount = Math.max(1, ...(results ?? []).map((r) => r.count));

  return (
    <>
      {finished ? (
        <div className="phase-banner day">
          <div className="big">🏆</div>
          <h2>Тоглоом дууслаа!</h2>
          <div className="muted">Найзууд чинь чамайг ингэж хардаг юм байна 💛</div>
        </div>
      ) : (
        <div className="phase-banner day">
          <div className="muted">
            Асуулт {room.round} / {total}
          </div>
          <div className="question">{question}</div>
          <div className="timer">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </div>
          {isHost && (
            <button
              className="small secondary"
              style={{ marginTop: 8 }}
              onClick={() => void act(() => api.whoisitAdvance(room.id, room.phase, room.round))}
            >
              {voting ? "Санал хураалтыг дуусгах →" : "Дараагийн асуулт →"}
            </button>
          )}
        </div>
      )}

      {voting && (
        <div className="card stack">
          <div className="row between">
            <h3>Хэнийг сонгох вэ?</h3>
            <span className="badge">
              🔒 нууц · {st.voted ?? 0}/{players.length}
            </span>
          </div>
          <PlayerGrid
            players={players}
            speaking={speaking}
            pickable={(p) => Boolean(me) && p.id !== me?.id}
            pickedId={myPick}
            onPick={(p) => vote(p.id)}
            sub={(p) => (me && p.id === me.id ? "та" : undefined)}
          />
          <div className="muted">Хэн хэнийг сонгосон нь хэнд ч харагдахгүй. Өөрийгөө сонгох боломжгүй.</div>
        </div>
      )}

      {showingResult && results && (
        <div className="card stack">
          <h3>Үр дүн</h3>
          {results.every((r) => r.count === 0) ? (
            <div className="muted">Энэ удаад хэн ч санал аваагүй.</div>
          ) : (
            results.map((r) => (
              <div key={r.id} className="bar-row">
                <div className="bar-label">{r.name}</div>
                <div className="bar-track">
                  <div
                    className={`bar ${r.count === results[0].count ? "top" : ""}`}
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="bar-count">{r.count}</div>
              </div>
            ))
          )}
        </div>
      )}

      {finished && (
        <>
          <div className="card stack">
            <h3>🏅 Шагналын самбар</h3>
            {leaderboard.map(({ player, wins }) => (
              <div key={player.id} className="row between">
                <div className="row">
                  <div className="avatar">{player.avatar}</div>
                  <b>{player.name}</b>
                  {wins > 0 && wins === bestWins && <span className="badge live">хамгийн их</span>}
                </div>
                <b>{wins} 🏆</b>
              </div>
            ))}
          </div>

          <div className="card stack">
            <h3>Асуулт бүрийн ялагч</h3>
            <div className="log">
              {(st.titles ?? []).map((t, i) => (
                <div key={i}>
                  <b>{t.question}</b>
                  <br />
                  {t.winners.length > 0 ? `🏆 ${t.winners.join(", ")}` : "— санал аваагүй"}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button onClick={() => void act(() => api.playAgain(room.id))}>Дахин тоглох</button>
          ) : (
            <div className="muted">Өрөөний эзэн дахин эхлүүлэхийг хүлээнэ үү…</div>
          )}
        </>
      )}

      {error && <div className="error">{error}</div>}
    </>
  );
}

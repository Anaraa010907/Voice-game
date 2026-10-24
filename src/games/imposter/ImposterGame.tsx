import { useState } from "react";
import { api } from "../../lib/api";
import type { Vote } from "../../lib/types";
import { useAutoAdvance } from "../../lib/useAutoAdvance";
import { useNow } from "../../lib/useNow";
import { PlayerGrid } from "../../components/PlayerGrid";
import type { GameCtx } from "../registry";

interface Props {
  ctx: GameCtx;
  votes: Vote[];
  /** Тоглоом дууссаны дараа ил болсон үүргүүд (player id -> role) */
  revealed: Record<string, string>;
  speaking: Set<string>;
  isHost: boolean;
}

const PHASES: Record<string, { icon: string; title: string; hint: string }> = {
  reveal: {
    icon: "👀",
    title: "Үгээ хар",
    hint: "Өөрийн үгийг санаарай. Imposter зөвхөн ангиллыг мэднэ.",
  },
  discuss: {
    icon: "💬",
    title: "Хэлэлцүүлэг",
    hint: "Үгээ шууд хэлэлгүй тайлбарла. Imposter-т үгийг мэдэхгүй гэдгээ нууж, бусдын үгнээс таамагла.",
  },
  vote: {
    icon: "🗳️",
    title: "Санал хураалт",
    hint: "Imposter хэн бэ? Сэжиглэсэн хүнээ сонгоно уу.",
  },
  guess: {
    icon: "🎯",
    title: "Үг таах",
    hint: "Imposter баригдсан. Үгийг зөв таавал ялна!",
  },
};

export function ImposterGame({ ctx, votes, revealed, speaking, isHost }: Props) {
  const { room, players, me, myRole } = ctx;
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [guess, setGuess] = useState("");

  useAutoAdvance(room, isHost, () => api.imposterAdvance(room.id, room.phase));

  const finished = room.status === "finished";
  const isImposter = myRole?.role === "imposter";
  const phase = PHASES[room.phase];

  const secondsLeft = room.phase_ends_at
    ? Math.max(0, Math.ceil((new Date(room.phase_ends_at).getTime() - now) / 1000))
    : 0;

  const roundVotes = votes.filter((v) => v.round === room.round);
  const tally = new Map<string, number>();
  for (const v of roundVotes) {
    if (v.target_id) tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
  }
  const myVote = me ? roundVotes.find((v) => v.voter_id === me.id)?.target_id ?? null : null;

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const voting = room.phase === "vote";

  return (
    <>
      {myRole && !finished && (
        <div className="role-card">
          <div className="big">{isImposter ? "🥸" : "🔤"}</div>
          {hidden ? (
            <div className="muted">Нуугдсан</div>
          ) : isImposter ? (
            <>
              <h2>Та IMPOSTER!</h2>
              <div className="muted">
                Ангилал: <b>{myRole.category}</b> — үгийг мэдэхгүй, бусдын тайлбараас таамагла.
              </div>
            </>
          ) : (
            <>
              <div className="muted">Таны үг ({myRole.category})</div>
              <h2 style={{ fontSize: 28 }}>{myRole.word}</h2>
            </>
          )}
          <button
            className="small secondary"
            style={{ marginTop: 10 }}
            onClick={() => setHidden((h) => !h)}
          >
            {hidden ? "👁 Харуулах" : "🙈 Нуух"}
          </button>
        </div>
      )}

      {finished ? (
        <div className="phase-banner day">
          <div className="big">{room.winner === "crew" ? "🙂" : "🥸"}</div>
          <h2>{room.winner === "crew" ? "Багийнхан ялалаа!" : "Imposter ялалаа!"}</h2>
        </div>
      ) : (
        phase && (
          <div className="phase-banner day">
            <div className="big">{phase.icon}</div>
            <h2>{phase.title}</h2>
            <div className="muted">{phase.hint}</div>
            <div className="timer">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </div>
            {isHost && (
              <button
                className="small secondary"
                style={{ marginTop: 8 }}
                onClick={() => void act(() => api.imposterAdvance(room.id, room.phase))}
              >
                Үеийг дуусгах →
              </button>
            )}
          </div>
        )
      )}

      <div className="card stack">
        <h3>{finished ? "Үүргүүд" : voting ? "Хэнийг сэжиглэж байна?" : "Тоглогчид"}</h3>
        <PlayerGrid
          players={players}
          speaking={speaking}
          pickable={(p) => voting && Boolean(me) && p.id !== me?.id}
          pickedId={voting ? myVote : null}
          onPick={(p) => void act(() => api.imposterVote(room.id, p.id))}
          sub={(p) => {
            if (finished) {
              const r = revealed[p.id];
              if (r === "imposter") return "🥸 Imposter";
              if (r) return "🙂 Багийн гишүүн";
              return undefined;
            }
            return me && p.id === me.id ? "та" : undefined;
          }}
          badge={(p) => (voting && tally.get(p.id) ? `🗳️ ${tally.get(p.id)}` : undefined)}
        />
        {voting && (
          <button className="small secondary" onClick={() => void act(() => api.imposterVote(room.id, null))}>
            Санал өгөхгүй (алгасах)
          </button>
        )}
      </div>

      {room.phase === "guess" && !finished && (
        <div className="card stack">
          {isImposter ? (
            <>
              <h3>🎯 Үгийг таа</h3>
              <input
                placeholder="Үг…"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
              />
              <button
                disabled={!guess.trim()}
                onClick={() => void act(() => api.imposterGuess(room.id, guess))}
              >
                Таах
              </button>
            </>
          ) : (
            <div className="muted">🎯 Imposter үгийг таах гэж байна…</div>
          )}
        </div>
      )}

      {finished && (
        <div className="card stack">
          {isHost ? (
            <button onClick={() => void act(() => api.playAgain(room.id))}>Дахин тоглох</button>
          ) : (
            <div className="muted">Өрөөний эзэн дахин эхлүүлэхийг хүлээнэ үү…</div>
          )}
        </div>
      )}

      <div className="card stack">
        <h3>Үйл явдал</h3>
        <div className="log">
          {[...room.log].reverse().map((l, i) => (
            <div key={`${room.log.length - i}`}>{l.text}</div>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}
    </>
  );
}

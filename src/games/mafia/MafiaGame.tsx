import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { Note, Vote } from "../../lib/types";
import { useNow } from "../../lib/useNow";
import { PlayerGrid } from "../../components/PlayerGrid";
import { ROLE_INFO, type GameCtx } from "../registry";

interface Props {
  ctx: GameCtx;
  votes: Vote[];
  notes: Note[];
  /** Тоглоом дууссаны дараа ил болсон үүргүүд (player id -> role) */
  revealed: Record<string, string>;
  speaking: Set<string>;
  isHost: boolean;
}

const NIGHT_PROMPT: Record<string, string> = {
  mafia: "Хэнийг алах вэ?",
  doctor: "Хэнийг аврах вэ?",
  detective: "Хэнийг шалгах вэ?",
};

export function MafiaGame({ ctx, votes, notes, revealed, speaking, isHost }: Props) {
  const { room, players, me, myRole } = ctx;
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [nightPick, setNightPick] = useState<{ round: number; id: string } | null>(null);

  const alive = me?.is_alive ?? false;
  const role = myRole?.role;
  const info = role ? ROLE_INFO[role] : undefined;
  const teammateIds = useMemo(() => new Set((myRole?.teammates ?? []).map((t) => t.id)), [myRole]);

  // Үе дуусахад автоматаар шилжүүлнэ (эзэн шууд, бусад 4 секундын дараа нөөцөөр)
  useEffect(() => {
    if (room.status !== "playing" || !room.phase_ends_at) return;
    const delay = Math.max(0, new Date(room.phase_ends_at).getTime() - Date.now()) + (isHost ? 300 : 4000);
    const t = setTimeout(() => {
      api.advance(room.id, room.phase, room.round).catch(() => undefined);
    }, delay);
    return () => clearTimeout(t);
  }, [room.id, room.status, room.phase, room.round, room.phase_ends_at, isHost]);

  const secondsLeft = room.phase_ends_at
    ? Math.max(0, Math.ceil((new Date(room.phase_ends_at).getTime() - now) / 1000))
    : 0;

  const roundVotes = votes.filter((v) => v.round === room.round);
  const aliveIds = new Set(players.filter((p) => p.is_alive).map((p) => p.id));
  const tally = new Map<string, number>();
  for (const v of roundVotes) {
    if (v.target_id && aliveIds.has(v.voter_id)) {
      tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
    }
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

  const isNight = room.phase === "night";
  const isDay = room.phase === "day";
  const finished = room.status === "finished";
  const hasNightAction = Boolean(role && NIGHT_PROMPT[role]);

  const pickable = (p: { id: string; is_alive: boolean }): boolean => {
    if (!alive || !me || !p.is_alive) return false;
    if (isNight && hasNightAction) {
      if (role === "mafia" && (teammateIds.has(p.id) || p.id === me.id)) return false;
      if (role === "detective" && p.id === me.id) return false;
      return true;
    }
    if (isDay) return p.id !== me.id;
    return false;
  };

  const onPick = (p: { id: string }) => {
    if (isNight && hasNightAction) {
      setNightPick({ round: room.round, id: p.id });
      void act(() => api.nightAction(room.id, p.id));
    } else if (isDay) {
      void act(() => api.vote(room.id, p.id));
    }
  };

  const pickedId = isNight
    ? nightPick && nightPick.round === room.round
      ? nightPick.id
      : null
    : isDay
      ? myVote
      : null;

  return (
    <>
      {info && !finished && (
        <div className="role-card">
          <div className="big">{info.icon}</div>
          <h2>Таны үүрэг: {info.label}</h2>
          <div className="muted">{info.desc}</div>
          {role === "mafia" && myRole && myRole.teammates.length > 0 && (
            <div style={{ marginTop: 8 }}>
              Багийнхан: <b>{myRole.teammates.map((t) => t.name).join(", ")}</b>
            </div>
          )}
        </div>
      )}

      {finished ? (
        <div className="phase-banner day">
          <div className="big">{room.winner === "town" ? "🏘️" : "🔪"}</div>
          <h2>{room.winner === "town" ? "Хотынхон ялалаа!" : "Мафи ялалаа!"}</h2>
        </div>
      ) : (
        <div className={`phase-banner ${isNight ? "night" : "day"}`}>
          <div className="big">{isNight ? "🌙" : "☀️"}</div>
          <h2>
            {isNight ? "Шөнө" : "Өдөр"} · {room.round}-р үе
          </h2>
          <div className="timer">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </div>
          {isHost && (
            <button
              className="small secondary"
              style={{ marginTop: 8 }}
              onClick={() => void act(() => api.advance(room.id, room.phase, room.round))}
            >
              Үеийг дуусгах →
            </button>
          )}
        </div>
      )}

      {!finished && (
        <div className="card stack">
          {!alive ? (
            <div className="muted">👻 Та хасагдсан — үзэгчээр үргэлжлүүлнэ үү.</div>
          ) : isNight ? (
            hasNightAction && role ? (
              <h3>🌙 {NIGHT_PROMPT[role]}</h3>
            ) : (
              <div className="muted">😴 Шөнө нойрсож байна… Өглөөг хүлээнэ үү.</div>
            )
          ) : (
            <h3>☀️ Хэнийг хөөх вэ? Санал өгнө үү</h3>
          )}

          <PlayerGrid
            players={players}
            speaking={speaking}
            pickable={pickable}
            pickedId={pickedId}
            onPick={onPick}
            sub={(p) => {
              if (!p.is_alive) return "хасагдсан";
              if (role === "mafia" && teammateIds.has(p.id)) return "мафи (багийнхан)";
              if (me && p.id === me.id) return "та";
              return undefined;
            }}
            badge={(p) => (isDay && tally.get(p.id) ? `🗳️ ${tally.get(p.id)}` : undefined)}
          />

          {isDay && alive && (
            <button className="small secondary" onClick={() => void act(() => api.vote(room.id, null))}>
              Санал өгөхгүй (алгасах)
            </button>
          )}
        </div>
      )}

      {finished && (
        <div className="card stack">
          <h3>Үүргүүд</h3>
          <PlayerGrid
            players={players}
            speaking={speaking}
            sub={(p) => {
              const r = revealed[p.id];
              return r ? `${ROLE_INFO[r]?.icon ?? ""} ${ROLE_INFO[r]?.label ?? r}` : undefined;
            }}
          />
          {isHost ? (
            <button onClick={() => void act(() => api.playAgain(room.id))}>Дахин тоглох</button>
          ) : (
            <div className="muted">Өрөөний эзэн дахин эхлүүлэхийг хүлээнэ үү…</div>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <div className="card stack">
          <h3>🔍 Таны мөрдөн байцаалт</h3>
          <div className="log">
            {notes.map((n) => (
              <div key={n.id}>
                {n.round}-р шөнө: {n.text}
              </div>
            ))}
          </div>
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

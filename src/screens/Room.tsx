import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useRoomData } from "../lib/useRoomData";
import { useVoice } from "../lib/voice";
import { gameById, type GameCtx } from "../games/registry";
import { PlayerGrid } from "../components/PlayerGrid";
import { MafiaGame } from "../games/mafia/MafiaGame";
import { ImposterGame } from "../games/imposter/ImposterGame";
import { WhoIsItGame } from "../games/whoisit/WhoIsItGame";

interface Props {
  roomId: string;
  userId: string;
  onLeave: () => void;
}

export function Room({ roomId, userId, onLeave }: Props) {
  const { room, players, votes, notes, myRole, revealed, gone } = useRoomData(roomId);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const me = players.find((p) => p.user_id === userId);
  const game = room ? gameById(room.game_type) : null;

  const ctx: GameCtx | null = useMemo(
    () => (room ? { room, players, me, myRole } : null),
    [room, players, me, myRole],
  );
  const policy = useMemo(
    () => (game && ctx ? game.voicePolicy(ctx) : { canSpeak: true, hearOnly: null }),
    [game, ctx],
  );
  const voice = useVoice(roomId, policy);

  const leave = async () => {
    try {
      await api.leaveRoom(roomId);
    } catch {
      /* гарахад алдаа гарсан ч дэлгэцээс гарна */
    }
    onLeave();
  };

  if (gone) {
    return (
      <div className="app">
        <div className="card stack">
          <h2>Өрөө олдсонгүй</h2>
          <div className="muted">Өрөө устгагдсан эсвэл та гишүүн биш байна.</div>
          <button onClick={onLeave}>Нүүр хуудас руу</button>
        </div>
      </div>
    );
  }
  if (!room || !game || !ctx) {
    return (
      <div className="app">
        <div className="muted">Ачаалж байна…</div>
      </div>
    );
  }

  const isHost = room.host_user === userId;

  const start = async () => {
    setError(null);
    try {
      await api.startGame(roomId, room.game_type);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard боломжгүй */
    }
  };

  const voiceStatus = voice.error
    ? voice.error
    : voice.connected
      ? "Voice холбогдсон"
      : "Voice холбогдож байна…";

  return (
    <div className="app" data-game={room.game_type}>
      <header className="room-head">
        <div className="room-head-top">
          <div className="room-game">
            <span className="glyph" aria-hidden="true">
              {game.icon}
            </span>
            {game.name}
          </div>
          <button className="small secondary" onClick={leave}>
            Гарах
          </button>
        </div>
        <button className="code-plate" onClick={copyCode} aria-label="Өрөөний кодыг хуулах">
          <span className="room-code">{room.code}</span>
          <span className="muted">{copied ? "Хуулагдлаа ✓" : "Дарж хуулаад найзуудаа урь"}</span>
        </button>
        <div className="ornament" aria-hidden="true" />
      </header>

      <div className={`voice-pill ${voice.error ? "bad" : voice.connected ? "ok" : ""}`}>
        <span className="dot" aria-hidden="true" />
        {voiceStatus}
      </div>

      {room.status === "lobby" ? (
        <div className="card stack">
          <div className="row between">
            <h3>Тоглогчид ({players.length})</h3>
            <span className="badge">дор хаяж {game.minPlayers}</span>
          </div>
          <PlayerGrid
            players={players}
            speaking={voice.speaking}
            sub={(p) => (p.is_host ? "Өрөөний эзэн" : undefined)}
          />
          {isHost ? (
            <button disabled={players.length < game.minPlayers} onClick={start}>
              Тоглоом эхлүүлэх
            </button>
          ) : (
            <div className="muted">Өрөөний эзэн тоглоомыг эхлүүлэхийг хүлээнэ үү…</div>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      ) : room.game_type === "whoisit" ? (
        <WhoIsItGame ctx={ctx} speaking={voice.speaking} isHost={isHost} />
      ) : room.game_type === "imposter" ? (
        <ImposterGame
          ctx={ctx}
          votes={votes}
          revealed={revealed}
          speaking={voice.speaking}
          isHost={isHost}
        />
      ) : (
        <MafiaGame
          ctx={ctx}
          votes={votes}
          notes={notes}
          revealed={revealed}
          speaking={voice.speaking}
          isHost={isHost}
        />
      )}

      <div className="mic-bar">
        <button
          className={`mic-btn ${voice.micOn && policy.canSpeak ? "on" : ""}`}
          disabled={!voice.connected || !policy.canSpeak}
          onClick={voice.toggleMic}
        >
          <span className="mic-ico" aria-hidden="true">
            {!policy.canSpeak ? "🔇" : voice.micOn ? "🎙️" : "🎤"}
          </span>
          {!policy.canSpeak ? "Одоо ярих боломжгүй" : voice.micOn ? "Mic асаалттай" : "Mic унтраалттай"}
        </button>
      </div>
    </div>
  );
}

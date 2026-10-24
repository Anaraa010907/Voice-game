import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { GameType, PublicRoom } from "../lib/types";
import { GAMES, LOCAL_GAMES, gameById, type LocalGameId } from "../games/registry";

const AVATARS = ["🐺", "🦊", "🐻", "🦁", "🐯", "🐼", "🐸", "🦉", "🐙", "🦄", "🐲", "🦅"];
const NAME_KEY = "voicegame.name";
const AVATAR_KEY = "voicegame.avatar";

interface Props {
  /** Supabase-д нэвтэрсэн эсэх (онлайн өрөөнүүдэд шаардлагатай) */
  online: boolean;
  authError: string | null;
  onEnter: (roomId: string) => void;
  onPlayLocal: (id: LocalGameId) => void;
}

export function Home({ online, authError, onEnter, onPlayLocal }: Props) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [avatar, setAvatar] = useState(() => localStorage.getItem(AVATAR_KEY) ?? AVATARS[0]);
  const [game, setGame] = useState<GameType>("mafia");
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.listPublicRooms().then(setRooms).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!online) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [online, refresh]);

  const remember = () => {
    localStorage.setItem(NAME_KEY, name.trim());
    localStorage.setItem(AVATAR_KEY, avatar);
  };

  const run = async (fn: () => Promise<{ id: string }>) => {
    if (!name.trim()) {
      setError("Эхлээд нэрээ оруулна уу");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      remember();
      const room = await fn();
      onEnter(room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(() => api.createRoom(name, game, isPublic, avatar));
  const join = (c: string) => run(() => api.joinRoom(c, name, avatar));

  return (
    <div className="app">
      <div>
        <h1>🎙️ Voice Game</h1>
        <div className="muted">Найзуудтайгаа дуугаар тоглох хөзрийн тоглоомууд</div>
      </div>

      <div className="card stack">
        <div>
          <h3>Нэг утсаар тоглох</h3>
          <div className="muted">Интернэт, өрөө шаардахгүй — утсаа дамжуулж тоглоно.</div>
        </div>
        {LOCAL_GAMES.map((g) => (
          <button key={g.id} className="game-card" onClick={() => onPlayLocal(g.id)}>
            <div className="game-icon">{g.icon}</div>
            <div className="grow">
              <div className="row between">
                <b>{g.name}</b>
                <span className="badge live">Бэлэн</span>
              </div>
              <div className="muted">{g.blurb}</div>
            </div>
          </button>
        ))}
      </div>

      {!online ? (
        <div className="card stack">
          <h3>Онлайн өрөөнүүд</h3>
          {authError ? (
            <div className="error">{authError}</div>
          ) : (
            <div className="muted">Холбогдож байна…</div>
          )}
        </div>
      ) : (
        <>
          <div className="card stack">
            <h3>Таны профайл</h3>
            <input
              placeholder="Нэр"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="row" style={{ flexWrap: "wrap" }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={a === avatar ? "small" : "small secondary"}
                  onClick={() => setAvatar(a)}
                  aria-label={`Аватар ${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="card stack">
            <h3>Онлайн тоглоом сонгох</h3>
            {GAMES.map((g) => (
              <button
                key={g.id}
                className={`game-card ${game === g.id ? "selected" : ""} ${g.available ? "" : "disabled"}`}
                onClick={() => g.available && setGame(g.id)}
              >
                <div className="game-icon">{g.icon}</div>
                <div className="grow">
                  <div className="row between">
                    <b>{g.name}</b>
                    <span className={`badge ${g.available ? "live" : ""}`}>
                      {g.available ? "Бэлэн" : "Удахгүй"}
                    </span>
                  </div>
                  <div className="muted">{g.blurb}</div>
                </div>
              </button>
            ))}
            <label className="row muted">
              <input
                type="checkbox"
                style={{ width: 18, height: 18 }}
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Нийтийн жагсаалтад харуулах
            </label>
            <button disabled={busy} onClick={create}>
              {gameById(game).icon} Өрөө үүсгэх
            </button>
          </div>

          <div className="card stack">
            <h3>Кодоор нэгдэх</h3>
            <div className="row">
              <input
                placeholder="ABCDE"
                value={code}
                maxLength={5}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: 4, textTransform: "uppercase" }}
              />
              <button disabled={busy || code.length < 5} onClick={() => join(code)}>
                Нэгдэх
              </button>
            </div>
          </div>

          <div className="card stack">
            <div className="row between">
              <h3>Нийтийн өрөөнүүд</h3>
              <button className="small secondary" onClick={refresh}>
                Шинэчлэх
              </button>
            </div>
            {rooms.length === 0 && <div className="muted">Одоогоор нээлттэй өрөө алга.</div>}
            {rooms.map((r) => (
              <div key={r.id} className="row between">
                <div>
                  <b>
                    {gameById(r.game_type).icon} {r.code}
                  </b>
                  <div className="muted">
                    {r.host_name ?? "—"} · {r.player_count} тоглогч
                  </div>
                </div>
                <button className="small" disabled={busy} onClick={() => join(r.code)}>
                  Орох
                </button>
              </div>
            ))}
          </div>

          {error && <div className="error">{error}</div>}
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { api } from "../lib/api";
import type { GameType, PublicRoom } from "../lib/types";
import { GAMES, LOCAL_GAMES, gameById, type GameDef, type LocalGameId } from "../games/registry";
import { RULES } from "../games/rules";

const AVATARS = ["🐺", "🦊", "🐻", "🦁", "🐯", "🐼", "🐸", "🦉", "🐙", "🦄", "🐲", "🦅"];
const NAME_KEY = "voicegame.name";
const AVATAR_KEY = "voicegame.avatar";

type Tab = "games" | "rooms" | "rules";
type SheetState = { kind: "game"; id: GameType } | { kind: "profile" } | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "games", label: "Тоглоом" },
  { id: "rooms", label: "Өрөө" },
  { id: "rules", label: "Дүрэм" },
];

const TITLES: Record<Tab, { h: string; p: string }> = {
  games: { h: "Өнөө орой юу тоглох вэ?", p: "Найзуудтайгаа дуугаар эсвэл нэг утсаар тогло." },
  rooms: { h: "Найзынхаа өрөөнд орох", p: "Код авсан бол оруулна, эсвэл нээлттэй өрөөнөөс сонгоно." },
  rules: { h: "Тоглохын өмнө", p: "Тоглоом бүрийн дүрмийг товчхон уншаарай." },
};

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TAB_ICONS: Record<Tab, ReactElement> = {
  games: (
    <svg {...svgProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  rooms: (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M17 14c2.5.2 4 1.9 4 4.5" />
    </svg>
  ),
  rules: (
    <svg {...svgProps}>
      <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5z" />
      <path d="M8.5 9h6M8.5 12.5h6" />
    </svg>
  ),
};

interface Props {
  /** Supabase-д нэвтэрсэн эсэх (онлайн өрөөнүүдэд шаардлагатай) */
  online: boolean;
  authError: string | null;
  onEnter: (roomId: string) => void;
  onPlayLocal: (id: LocalGameId) => void;
}

export function Home({ online, authError, onEnter, onPlayLocal }: Props) {
  const [tab, setTab] = useState<Tab>("games");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [avatar, setAvatar] = useState(() => localStorage.getItem(AVATAR_KEY) ?? AVATARS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.listPublicRooms().then(setRooms).catch(() => undefined);
  }, []);

  // Нийтийн өрөөний жагсаалтыг зөвхөн "Өрөө" цэс нээлттэй үед шинэчилнэ
  useEffect(() => {
    if (!online || tab !== "rooms") return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [online, tab, refresh]);

  useEffect(() => {
    localStorage.setItem(NAME_KEY, name.trim());
    localStorage.setItem(AVATAR_KEY, avatar);
  }, [name, avatar]);

  const sheetOpen = sheet !== null;
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.classList.add("sheet-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const open = (s: SheetState) => {
    setError(null);
    setSheet(s);
  };

  const run = async (fn: () => Promise<{ id: string }>) => {
    if (!name.trim()) {
      setError("Эхлээд нэрээ оруулна уу");
      setSheet((s) => s ?? { kind: "profile" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await fn();
      onEnter(room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const create = (game: GameType) => run(() => api.createRoom(name, game, isPublic, avatar));
  const join = (c: string) => run(() => api.joinRoom(c, name, avatar));

  const available = GAMES.filter((g) => g.available);
  const soon = GAMES.filter((g) => !g.available);
  const ruleEntries = [...LOCAL_GAMES, ...available].filter((g) => RULES[g.id]);

  const offlineCard = (
    <div className="card stack">
      {authError ? <div className="error">{authError}</div> : <div className="muted">Холбогдож байна…</div>}
    </div>
  );

  const gamesTab = (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Нэг утсаар</h2>
          <span className="muted">Интернэт шаардахгүй</span>
        </div>
        <div className="poster-grid">
          {LOCAL_GAMES.map((g) => (
            <button key={g.id} className="poster" data-game={g.id} onClick={() => onPlayLocal(g.id)}>
              <span className="poster-glyph" aria-hidden="true">
                {g.icon}
              </span>
              <span className="poster-body">
                <span className="poster-name">{g.name}</span>
                <span className="poster-meta">Утсаа дамжуулна</span>
                <span className="poster-blurb">{g.blurb}</span>
              </span>
              <span className="ornament" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Онлайн, дуугаар</h2>
          <span className="muted">Өрөө үүсгээд найзуудаа урь</span>
        </div>
        {!online ? (
          offlineCard
        ) : (
          <div className="poster-grid">
            {available.map((g) => (
              <button
                key={g.id}
                className="poster"
                data-game={g.id}
                onClick={() => open({ kind: "game", id: g.id })}
              >
                <span className="poster-glyph" aria-hidden="true">
                  {g.icon}
                </span>
                <span className="poster-body">
                  <span className="poster-name">{g.name}</span>
                  <span className="poster-meta">{g.minPlayers}+ хүн · Voice</span>
                  <span className="poster-blurb">{g.blurb}</span>
                </span>
                <span className="ornament" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Удахгүй</h2>
        </div>
        <div className="soon-list">
          {soon.map((g) => (
            <span key={g.id} className="soon">
              <span aria-hidden="true">{g.icon}</span>
              {g.name}
            </span>
          ))}
        </div>
      </section>
    </>
  );

  const roomsTab = !online ? (
    offlineCard
  ) : (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Кодоор нэгдэх</h2>
        </div>
        <div className="card stack">
          <input
            className="code-input"
            placeholder="ABCDE"
            aria-label="Өрөөний код"
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button disabled={busy || code.length < 5} onClick={() => join(code)}>
            Нэгдэх
          </button>
          {error && !sheet && <div className="error">{error}</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Нийтийн өрөөнүүд</h2>
          <button className="small secondary" onClick={refresh}>
            Шинэчлэх
          </button>
        </div>
        {rooms.length === 0 ? (
          <div className="empty">
            <span>Одоогоор нээлттэй өрөө алга.</span>
            <button className="small secondary" onClick={() => setTab("games")}>
              Өрөө үүсгэх
            </button>
          </div>
        ) : (
          rooms.map((r) => {
            const g = gameById(r.game_type);
            return (
              <div key={r.id} className="room-row" data-game={r.game_type}>
                <span className="glyph" aria-hidden="true">
                  {g.icon}
                </span>
                <div className="grow">
                  <div className="code">{r.code}</div>
                  <div className="muted">
                    {g.name} · {r.host_name ?? "—"} · {r.player_count} тоглогч
                  </div>
                </div>
                <button className="small" disabled={busy} onClick={() => join(r.code)}>
                  Орох
                </button>
              </div>
            );
          })
        )}
      </section>
    </>
  );

  const rulesTab = (
    <section className="section">
      {ruleEntries.map((g) => (
        <details key={g.id} className="rule-item" data-game={g.id}>
          <summary>
            <span className="glyph" aria-hidden="true">
              {g.icon}
            </span>
            {g.name}
          </summary>
          <ul className="rule-list">
            {RULES[g.id].map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );

  const gameSheet = (g: GameDef) => (
    <>
      <div className="sheet-head">
        <div className="sheet-glyph" aria-hidden="true">
          {g.icon}
        </div>
        <div>
          <h2>{g.name}</h2>
          <div className="meta">
            <span className="pill">{g.minPlayers}+ хүн</span>
            <span className="pill">🎙️ Voice</span>
          </div>
        </div>
      </div>
      <p className="sheet-blurb">{g.blurb}</p>
      <div className="ornament" aria-hidden="true" />
      <label className="field-label">
        Таны нэр
        <div className="row">
          <span className="avatar" aria-hidden="true">
            {avatar}
          </span>
          <input placeholder="Нэр" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </div>
      </label>
      <label className="switch">
        <span>
          Нийтийн жагсаалтад харуулах
          <small className="muted">Хэн ч өрөөнд нэгдэж чадна</small>
        </span>
        <input type="checkbox" role="switch" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
      </label>
      {error && <div className="error">{error}</div>}
      <button disabled={busy} onClick={() => create(g.id)}>
        Өрөө үүсгэх
      </button>
      <button
        className="secondary"
        onClick={() => {
          setSheet(null);
          setTab("rules");
        }}
      >
        Дүрэм харах
      </button>
    </>
  );

  const profileSheet = (
    <>
      <div className="sheet-head">
        <div>
          <h2>Таны профайл</h2>
          <div className="muted">Найзууд чинь таныг энэ нэр, зургаар харна.</div>
        </div>
      </div>
      <div className="me-hero">
        <span className="avatar" aria-hidden="true">
          {avatar}
        </span>
        <input
          placeholder="Нэр"
          aria-label="Нэр"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="avatar-grid" role="group" aria-label="Зураг сонгох">
        {AVATARS.map((a) => (
          <button
            key={a}
            className="avatar-pick"
            aria-pressed={a === avatar}
            aria-label={`Зураг ${a}`}
            onClick={() => setAvatar(a)}
          >
            {a}
          </button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <button disabled={!name.trim()} onClick={() => setSheet(null)}>
        Болсон
      </button>
    </>
  );

  return (
    <div className="app has-tabs">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
            </svg>
          </span>
          Voice Game
        </div>
        <button
          className={`me-chip ${name.trim() ? "" : "empty"}`}
          aria-label="Профайл засах"
          onClick={() => open({ kind: "profile" })}
        >
          <span className="avatar" aria-hidden="true">
            {avatar}
          </span>
          <span className="me-name">{name.trim() || "Нэрээ оруул"}</span>
        </button>
      </header>

      <div className="hero">
        <h1>{TITLES[tab].h}</h1>
        <div className="muted">{TITLES[tab].p}</div>
      </div>

      {tab === "games" ? gamesTab : tab === "rooms" ? roomsTab : rulesTab}

      <nav className="tabbar" aria-label="Үндсэн цэс">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            {TAB_ICONS[t.id]}
            {t.label}
          </button>
        ))}
      </nav>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={sheet.kind === "game" ? gameById(sheet.id).name : "Таны профайл"}
            data-game={sheet.kind === "game" ? sheet.id : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="sheet-close" aria-label="Хаах" onClick={() => setSheet(null)}>
              ✕
            </button>
            {sheet.kind === "game" ? gameSheet(gameById(sheet.id)) : profileSheet}
          </div>
        </div>
      )}
    </div>
  );
}

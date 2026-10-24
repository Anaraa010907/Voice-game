import { useRef, useState } from "react";
import {
  RANKS,
  RHYME_STARTERS,
  SUITS,
  fill,
  getRules,
  type Card,
  type Category,
  type Rank,
} from "./content";
import type { KingsCupConfig } from "./KingsCupSetup";

interface Props {
  config: KingsCupConfig;
  onExit: () => void;
  onRestart: () => void;
  onSettings: () => void;
}

type Choice = "truth" | "dare";

interface Drawn {
  card: Card;
  drawer: string | null;
  prompt: string | null;
  choice: Choice | null;
  pick: string | null;
  /** K карт бол хэд дэх K вэ (1–4), бусад үед 0 */
  kingNo: number;
}

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function bankFor(
  rank: Rank,
  choice: Choice | null,
  category: Category,
): { key: string; list: string[] } | null {
  if (rank === "5") {
    if (choice === "truth") return { key: "truth", list: category.truths };
    if (choice === "dare") return { key: "dare", list: category.dares };
    return null;
  }
  if (rank === "6") return { key: "whois", list: category.whois };
  if (rank === "J") return { key: "never", list: category.never };
  if (rank === "10") return { key: "topics", list: category.topics };
  if (rank === "9") return { key: "rhyme", list: RHYME_STARTERS };
  return null;
}

const PROMPT_LABEL: Partial<Record<Rank, string>> = {
  "6": "Асуулт",
  "9": "Эхлэх үг",
  "10": "Сэдэв",
  J: "Өгүүлбэр",
};

export function KingsCupPlay({ config, onExit, onRestart, onSettings }: Props) {
  const { category, points, names } = config;
  const mode = { points, simple: category.pointsOnly };
  const rules = getRules(points);

  const [deck, setDeck] = useState<Card[]>(() => buildDeck());
  const [current, setCurrent] = useState<Drawn | null>(null);
  const [turn, setTurn] = useState(0);
  const [kings, setKings] = useState(0);
  const [scores, setScores] = useState<number[]>(() => names.map(() => 0));
  const [finished, setFinished] = useState(false);
  const usedRef = useRef<Record<string, number[]>>({});

  const scoreboard = points && names.length > 0;
  const turnName = names.length > 0 ? names[turn % names.length] : null;

  const pickFrom = (key: string, list: string[]): string => {
    const used = usedRef.current[key] ?? [];
    let pool = list.map((_, i) => i).filter((i) => !used.includes(i));
    if (pool.length === 0) {
      usedRef.current[key] = [];
      pool = list.map((_, i) => i);
    }
    const idx = pool[Math.floor(Math.random() * pool.length)];
    usedRef.current[key] = [...(usedRef.current[key] ?? []), idx];
    return list[idx];
  };

  const draw = () => {
    if (current || finished) return;
    if (deck.length === 0) {
      setFinished(true);
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);

    let kingNo = 0;
    if (card.rank === "K") {
      kingNo = kings + 1;
      setKings(kingNo);
      // 4 дэх K: савны (3 хувь) оноог карт татсан хүн авна
      if (kingNo === 4 && scoreboard) {
        const idx = turn % names.length;
        setScores((s) => s.map((v, i) => (i === idx ? v + 3 : v)));
      }
    }

    const bank = bankFor(card.rank, null, category);
    const prompt = bank ? pickFrom(bank.key, bank.list) : null;
    setCurrent({ card, drawer: turnName, prompt, choice: null, pick: null, kingNo });
  };

  const choose = (choice: Choice) => {
    if (!current) return;
    const bank = bankFor("5", choice, category);
    if (!bank) return;
    setCurrent({ ...current, choice, prompt: pickFrom(bank.key, bank.list) });
  };

  const reroll = () => {
    if (!current) return;
    const bank = bankFor(current.card.rank, current.choice, category);
    if (!bank) return;
    setCurrent({ ...current, prompt: pickFrom(bank.key, bank.list) });
  };

  const randomPerson = () => {
    if (!current) return;
    const others = names.filter((n) => n !== current.drawer);
    if (others.length === 0) return;
    setCurrent({ ...current, pick: others[Math.floor(Math.random() * others.length)] });
  };

  const next = () => {
    if (!current) return;
    const last = current.card.rank === "K" && current.kingNo === 4;
    setCurrent(null);
    if (last || deck.length === 0) {
      setFinished(true);
      return;
    }
    setTurn((t) => t + 1);
  };

  const addPoint = (i: number) => setScores((s) => s.map((v, j) => (j === i ? v + 1 : v)));

  const Header = (
    <div className="row between">
      <div>
        <div className="muted">
          {category.icon} {category.name} · {points ? "Оноо" : "Балгам"}
        </div>
        <h2>👑 Kings Cup</h2>
      </div>
      <button className="small secondary" onClick={onExit}>
        Гарах
      </button>
    </div>
  );

  const Scores = scoreboard ? (
    <div className="card stack">
      <h3>Шийтгэлийн оноо</h3>
      {names.map((n, i) => (
        <div key={n} className="row between">
          <b>{n}</b>
          <div className="row">
            <span className="timer">{scores[i]}</span>
            {!finished && (
              <button className="small secondary" onClick={() => addPoint(i)}>
                +1
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  if (finished) {
    const ranked = names
      .map((n, i) => ({ name: n, score: scores[i] }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    return (
      <div className="app">
        {Header}
        <div className="phase-banner day">
          <div className="big">👑</div>
          <h2>Тоглоом дууслаа!</h2>
          {scoreboard && top && top.score > 0 && (
            <div className="muted">
              Хамгийн олон оноотой: <b>{top.name}</b> ({top.score}). Хөгжилтэй даалгавар хийнэ үү!
            </div>
          )}
        </div>
        {scoreboard && (
          <div className="card stack">
            <h3>Эцсийн оноо</h3>
            {ranked.map((r, i) => (
              <div key={r.name} className="row between">
                <b>
                  {i === 0 && r.score > 0 ? "🏆 " : ""}
                  {r.name}
                </b>
                <span className="timer">{r.score}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onRestart}>Дахин тоглох</button>
        <button className="secondary" onClick={onSettings}>
          Тохиргоо руу
        </button>
      </div>
    );
  }

  const rule = current ? rules[current.card.rank] : null;
  const red = current ? current.card.suit === "♥" || current.card.suit === "♦" : false;
  const rank = current?.card.rank;

  return (
    <div className="app">
      {Header}

      <div className="row between muted">
        <span>Үлдсэн карт: {deck.length}</span>
        <span>👑 K: {kings}/4</span>
      </div>
      {turnName && !current && (
        <div className="phase-banner day">
          <div className="muted">Ээлж</div>
          <h2>{turnName}</h2>
        </div>
      )}

      <div className={`playing-card ${current ? (red ? "red" : "") : "back"}`}>
        {current ? (
          <>
            <div className="corner">
              {current.card.rank}
              <br />
              {current.card.suit}
            </div>
            <div className="pip">{current.card.suit}</div>
          </>
        ) : (
          <div className="pip">👑</div>
        )}
      </div>

      {!current || !rule || !rank ? (
        <button onClick={draw}>Карт татах</button>
      ) : (
        <div className="card stack">
          <div className="row between">
            <h3>{rule.name}</h3>
            {current.drawer && <span className="badge">{current.drawer}</span>}
          </div>
          <div className="rule-text">{fill(rule.text, mode)}</div>

          {rank === "5" && !current.choice && (
            <div className="row">
              <button className="grow" onClick={() => choose("truth")}>
                Үнэн
              </button>
              <button className="grow" onClick={() => choose("dare")}>
                Зориг
              </button>
            </div>
          )}

          {current.prompt && (
            <div className="prompt-box">
              <div className="muted">
                {rank === "5" ? (current.choice === "truth" ? "Үнэн" : "Зориг") : PROMPT_LABEL[rank]}
              </div>
              <div className="prompt-text">{fill(current.prompt, mode)}</div>
            </div>
          )}

          {(rank === "2" || rank === "8") && names.length > 1 && (
            <div className="stack">
              <button className="small secondary" onClick={randomPerson}>
                🎲 Санамсаргүй хүн сонгох
              </button>
              {current.pick && (
                <div className="prompt-box">
                  <div className="prompt-text">{current.pick}</div>
                </div>
              )}
            </div>
          )}

          {rank === "K" && current.kingNo > 0 && (
            <div className="prompt-box">
              {current.kingNo < 4 ? (
                <div className="prompt-text">
                  {points ? "Шийтгэлийн санд" : "Аяганд"} {current.kingNo} хувь боллоо.
                </div>
              ) : (
                <div className="prompt-text">
                  {current.drawer ?? "Карт татсан хүн"}{" "}
                  {points ? "савны бүх оноог авлаа" : "аягыг бүгдийг ууна"}. Тоглоом дууслаа!
                </div>
              )}
            </div>
          )}

          <div className="muted">Хүсэхгүй бол алгасч болно: өөр асуулт авах эсвэл дараагийн ээлж рүү шилж.</div>

          <div className="row">
            {current.prompt && (
              <button className="secondary grow" onClick={reroll}>
                🔄 Өөр асуулт
              </button>
            )}
            <button className="grow" onClick={next}>
              {rank === "K" && current.kingNo === 4 ? "Дуусгах" : "Дараагийн ээлж →"}
            </button>
          </div>
        </div>
      )}

      {Scores}
    </div>
  );
}

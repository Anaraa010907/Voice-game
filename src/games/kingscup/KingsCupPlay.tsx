import { useRef, useState } from "react";
import { PUNISHMENTS, cardsFor, kindById, shuffle, type CardDef } from "./cards";
import type { KingsCupConfig } from "./KingsCupSetup";

interface Props {
  config: KingsCupConfig;
  onExit: () => void;
  onRestart: () => void;
  onSettings: () => void;
}

interface Drawn {
  card: CardDef;
  drawer: string | null;
  /** Үнэн эсвэл зориг: сонгосон хувилбарын индекс */
  choice: number | null;
  /** "Санамсаргүй хүн" товчоор сонгогдсон нэр */
  pick: string | null;
  punishment: string | null;
}

export function KingsCupPlay({ config, onExit, onRestart, onSettings }: Props) {
  const { category, names } = config;

  const [deck, setDeck] = useState<CardDef[]>(() => shuffle(cardsFor(category?.id ?? null)));
  const [total] = useState(deck.length);
  const [current, setCurrent] = useState<Drawn | null>(null);
  const [turn, setTurn] = useState(0);
  const [drawnCount, setDrawnCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const usedPunish = useRef<number[]>([]);

  const turnName = names.length > 0 ? names[turn % names.length] : null;

  /** Багцын дараагийн картыг татна. Багц хоосон бол тоглоом дуусна. */
  const dealNext = () => {
    if (deck.length === 0) {
      setCurrent(null);
      setFinished(true);
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);
    setDrawnCount((n) => n + 1);
    setCurrent({ card, drawer: turnName, choice: null, pick: null, punishment: null });
  };

  const choose = (index: number) => {
    if (!current) return;
    setCurrent({ ...current, choice: index });
  };

  const randomPerson = () => {
    if (!current) return;
    const others = names.filter((n) => n !== current.drawer);
    if (others.length === 0) return;
    setCurrent({ ...current, pick: others[Math.floor(Math.random() * others.length)] });
  };

  const choosePunishment = () => {
    if (!current) return;
    let pool = PUNISHMENTS.map((_, i) => i).filter((i) => !usedPunish.current.includes(i));
    if (pool.length === 0) {
      usedPunish.current = [];
      pool = PUNISHMENTS.map((_, i) => i);
    }
    const idx = pool[Math.floor(Math.random() * pool.length)];
    usedPunish.current = [...usedPunish.current, idx];
    setCurrent({ ...current, punishment: PUNISHMENTS[idx] });
  };

  /** Даалгавар дууссан: утсыг дараагийн хүнд дамжуулна */
  const done = () => {
    setCurrent(null);
    if (deck.length === 0) {
      setFinished(true);
      return;
    }
    setTurn((t) => t + 1);
  };

  const Header = (
    <div className="row between">
      <div>
        <div className="muted">
          {category ? `${category.icon} ${category.name}` : "🃏 Үндсэн багц"}
        </div>
        <h2>👑 Kings Cup</h2>
      </div>
      <button className="small secondary" onClick={onExit}>
        Гарах
      </button>
    </div>
  );

  if (finished) {
    return (
      <div className="app" data-game="kingscup">
        {Header}
        <div className="phase-banner day">
          <div className="big">👑</div>
          <h2>Багц дууслаа!</h2>
          <div className="muted">Бүх {total} карт татагдлаа. Дахин хутгаад тоглож болно.</div>
        </div>
        <button onClick={onRestart}>Дахин хутгаж тоглох</button>
        <button className="secondary" onClick={onSettings}>
          Тохиргоо руу
        </button>
      </div>
    );
  }

  const card = current?.card ?? null;
  const kind = card ? kindById(card.kind) : null;
  const chosen = card?.options && current && current.choice !== null ? card.options[current.choice] : null;
  const mainText = chosen ? chosen.text : (card?.text ?? null);
  const mainLabel = chosen ? chosen.label : (kind?.label ?? "");
  const needsChoice = Boolean(card?.options) && current?.choice === null;
  const canPickPerson = Boolean(card?.pickPerson) && names.length > 1;

  return (
    <div className="app" data-game="kingscup">
      {Header}

      <div className="row between muted">
        <span>
          Үлдсэн карт: {deck.length}/{total}
        </span>
        {turnName && (
          <span className="kc-turn">
            Ээлж: <b>{turnName}</b>
          </span>
        )}
      </div>

      <div aria-live="polite" className="kc-stage">
        {!current || !card || !kind ? (
          <div className="kc-card back">
            <div className="kc-back-crown">👑</div>
            <div className="kc-back-title">KINGS CUP</div>
            <div className="kc-back-sub">
              {drawnCount === 0 ? "Карт татаж эхэл" : "Дараагийн карт хүлээж байна"}
            </div>
          </div>
        ) : (
          <div className="kc-card deal" data-kind={card.kind} key={card.id}>
            <div className="kc-watermark" aria-hidden="true">
              {kind.icon}
            </div>
            <div className="kc-corner" aria-hidden="true">
              {kind.icon}
            </div>

            {card.title !== kind.name && <span className="kc-kind">{kind.name}</span>}
            <h3 className="kc-title">{card.title}</h3>
            {kind.howTo && <div className="kc-howto">{kind.howTo}</div>}

            {needsChoice && card.options && (
              <div className="kc-actions">
                {card.options.map((o, i) => (
                  <button key={o.label} onClick={() => choose(i)}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {mainText && (!card.options || chosen) && (
              <div className="kc-box">
                <span className="kc-box-label">{mainLabel}</span>
                <div className={mainText.length <= 60 ? "kc-box-big" : "kc-box-text"}>{mainText}</div>
              </div>
            )}

            {current.pick && (
              <div className="kc-box">
                <span className="kc-box-label">ХҮН</span>
                <div className="kc-box-big">{current.pick}</div>
              </div>
            )}

            {current.punishment && (
              <div className="kc-box punish">
                <span className="kc-box-label">ШИЙТГЭЛ</span>
                <div className="kc-box-text">{current.punishment}</div>
              </div>
            )}

            <div className="kc-footer">{kind.footer}</div>
          </div>
        )}
      </div>

      {!current || !card ? (
        <button onClick={dealNext}>{drawnCount === 0 ? "Карт татах" : "Дахин карт татах"}</button>
      ) : (
        <>
          <button disabled={needsChoice} onClick={done}>
            Дууслаа ✓
          </button>
          <button className="secondary" onClick={choosePunishment}>
            🎲 {current.punishment ? "Өөр шийтгэл" : "Шийтгэл сонгох"}
          </button>
          <div className="row">
            <button className="secondary grow" onClick={dealNext}>
              ⏭ Алгасах
            </button>
            {canPickPerson && (
              <button className="secondary grow" onClick={randomPerson}>
                🎯 Хүн сонгох
              </button>
            )}
          </div>
          <div className="muted">
            Уух нь сонголт. Хүсэхгүй бол шийтгэл сонгох, алгасах эсвэл ус, ундаа уух эрхтэй.
          </div>
        </>
      )}
    </div>
  );
}

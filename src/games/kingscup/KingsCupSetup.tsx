import { useState } from "react";
import { KINDS, cardsFor, categoriesWithCards, type Category, type CategoryId } from "./cards";

export interface KingsCupConfig {
  /** null = үндсэн багц */
  category: Category | null;
  names: string[];
}

interface Props {
  onStart: (config: KingsCupConfig) => void;
  onExit: () => void;
}

export function KingsCupSetup({ onStart, onExit }: Props) {
  const extraCategories = categoriesWithCards();
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [adultOk, setAdultOk] = useState(false);

  const category = extraCategories.find((c) => c.id === categoryId) ?? null;
  const blocked = Boolean(category?.adultsOnly) && !adultOk;
  const deck = cardsFor(category?.id ?? null);

  const addName = () => {
    const n = nameInput.trim().slice(0, 16);
    if (!n || names.includes(n) || names.length >= 12) return;
    setNames([...names, n]);
    setNameInput("");
  };

  return (
    <div className="app" data-game="kingscup">
      <div className="row between">
        <div>
          <h1>👑 Kings Cup</h1>
          <div className="muted">Нэг утсыг дамжуулж тоглоно</div>
        </div>
        <button className="small secondary" onClick={onExit}>
          Буцах
        </button>
      </div>

      <div className="card stack">
        <h3>Багц: {deck.length} карт</h3>
        <div className="kc-kinds">
          {KINDS.map((k) => {
            const n = deck.filter((c) => c.kind === k.id).length;
            if (n === 0) return null;
            return (
              <div key={k.id} className="kc-kind-row">
                <span className="kc-kind-ico" aria-hidden="true">
                  {k.icon}
                </span>
                <span className="grow">{k.name}</span>
                <b>{n}</b>
              </div>
            );
          })}
        </div>
        <div className="muted">
          Ээлжээр карт татна. Карт дээр асуулт эсвэл даалгавар шууд гарна. Оноо, ялагч байхгүй.
        </div>
      </div>

      {extraCategories.length > 0 && (
        <div className="card stack">
          <h3>Ангилал</h3>
          <button className={`game-card ${categoryId === null ? "selected" : ""}`} onClick={() => setCategoryId(null)}>
            <div className="game-icon">🃏</div>
            <div className="grow">
              <b>Үндсэн</b>
              <div className="muted">Бүх ангилалд нийтлэг картууд.</div>
            </div>
          </button>
          {extraCategories.map((c) => (
            <button
              key={c.id}
              className={`game-card ${c.id === categoryId ? "selected" : ""}`}
              onClick={() => setCategoryId(c.id)}
            >
              <div className="game-icon">{c.icon}</div>
              <div className="grow">
                <b>{c.name}</b>
                <div className="muted">{c.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="card stack">
        <h3>Тоглогчид (заавал биш)</h3>
        <div className="muted">Нэр оруулбал утас ээлжийг хөтөлж, "хань" картад санамсаргүй хүн сонгож өгнө.</div>
        <div className="row">
          <input
            placeholder="Нэр"
            value={nameInput}
            maxLength={16}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addName();
            }}
          />
          <button disabled={!nameInput.trim()} onClick={addName}>
            Нэмэх
          </button>
        </div>
        {names.length > 0 && (
          <div className="chips">
            {names.map((n) => (
              <span key={n} className="chip">
                {n}
                <button
                  className="chip-x"
                  aria-label={`${n}-г хасах`}
                  onClick={() => setNames(names.filter((x) => x !== n))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {category?.adultsOnly && (
        <label className="card row muted">
          <input
            type="checkbox"
            style={{ width: 20, height: 20 }}
            checked={adultOk}
            onChange={(e) => setAdultOk(e.target.checked)}
          />
          Би 18-аас дээш настай. Бүх хүн сайн дураараа оролцож байгаа.
        </label>
      )}

      <div className="muted">
        Уух нь сонголт. Хүсэхгүй бол ус, ундаа уух, шийтгэл сонгох эсвэл алгасах эрх хэнд ч бий. Уусан бол машин бүү
        барь.
      </div>

      <button disabled={blocked} onClick={() => onStart({ category, names })}>
        Тоглоом эхлүүлэх
      </button>
    </div>
  );
}

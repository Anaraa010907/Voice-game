import { useState } from "react";
import { CATEGORIES, type Category, type CategoryId } from "./content";

export interface KingsCupConfig {
  category: Category;
  /** true = оноогоор, false = балгамаар */
  points: boolean;
  names: string[];
}

interface Props {
  onStart: (config: KingsCupConfig) => void;
  onExit: () => void;
}

export function KingsCupSetup({ onStart, onExit }: Props) {
  const [categoryId, setCategoryId] = useState<CategoryId>("simple");
  const [points, setPoints] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [adultOk, setAdultOk] = useState(false);

  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  const usePoints = category.pointsOnly || points;
  const blocked = category.adultsOnly && !adultOk;

  const addName = () => {
    const n = nameInput.trim().slice(0, 16);
    if (!n || names.includes(n) || names.length >= 12) return;
    setNames([...names, n]);
    setNameInput("");
  };

  return (
    <div className="app">
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
        <h3>Ангилал сонгох</h3>
        {CATEGORIES.map((c) => (
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

      <div className="card stack">
        <h3>Горим</h3>
        {category.pointsOnly ? (
          <div className="muted">
            Энгийн ангилал үргэлж шийтгэлийн оноогоор тоглогдоно. Төгсгөлд хамгийн олон оноотой хүн хөгжилтэй даалгавар
            хийнэ.
          </div>
        ) : (
          <>
            <div className="row">
              <button className={`grow ${points ? "secondary" : ""}`} onClick={() => setPoints(false)}>
                🍺 Балгам
              </button>
              <button className={`grow ${points ? "" : "secondary"}`} onClick={() => setPoints(true)}>
                ⭐ Оноо
              </button>
            </div>
            {!points && (
              <div className="muted">
                Өөрийн хэмжээгээ мэд: ус, ундаагаар солих эрх хэнд ч бий. Уусан бол машин бүү барь.
              </div>
            )}
          </>
        )}
      </div>

      <div className="card stack">
        <h3>Тоглогчид (заавал биш)</h3>
        <div className="muted">
          Нэр оруулбал ээлжийг утас хөтөлж, "хүн заа" картад санамсаргүй хүн сонгож өгнө
          {usePoints ? ", мөн оноог тоолно." : "."}
        </div>
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

      {category.adultsOnly && (
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

      <button disabled={blocked} onClick={() => onStart({ category, points: usePoints, names })}>
        Тоглоом эхлүүлэх
      </button>
    </div>
  );
}

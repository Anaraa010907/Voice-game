import type { Player } from "../lib/types";

interface Props {
  players: Player[];
  speaking: Set<string>;
  sub?: (p: Player) => string | undefined;
  badge?: (p: Player) => string | undefined;
  pickable?: (p: Player) => boolean;
  pickedId?: string | null;
  onPick?: (p: Player) => void;
}

export function PlayerGrid({ players, speaking, sub, badge, pickable, pickedId, onPick }: Props) {
  return (
    <div className="players">
      {players.map((p) => {
        const canPick = Boolean(pickable?.(p));
        const cls = [
          "player",
          speaking.has(p.id) ? "speaking" : "",
          p.is_alive ? "" : "dead",
          canPick ? "pickable" : "",
          pickedId === p.id ? "picked" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const s = sub?.(p);
        const b = badge?.(p);
        return (
          <div key={p.id} className={cls} onClick={() => canPick && onPick?.(p)}>
            <div className="avatar">{p.avatar}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="player-name">{p.name}</div>
              {s && <div className="player-sub">{s}</div>}
            </div>
            {b && <span className="badge">{b}</span>}
          </div>
        );
      })}
    </div>
  );
}

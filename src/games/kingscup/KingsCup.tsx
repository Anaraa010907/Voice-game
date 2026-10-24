import { useState } from "react";
import { KingsCupPlay } from "./KingsCupPlay";
import { KingsCupSetup, type KingsCupConfig } from "./KingsCupSetup";

interface Props {
  onExit: () => void;
}

/** Нэг утсаар тоглох Kings Cup (Ring of Fire). Онлайн холболт шаардахгүй. */
export function KingsCup({ onExit }: Props) {
  const [config, setConfig] = useState<KingsCupConfig | null>(null);
  const [round, setRound] = useState(0);

  if (!config) return <KingsCupSetup onStart={setConfig} onExit={onExit} />;

  return (
    <KingsCupPlay
      key={round}
      config={config}
      onExit={onExit}
      onRestart={() => setRound((r) => r + 1)}
      onSettings={() => setConfig(null)}
    />
  );
}

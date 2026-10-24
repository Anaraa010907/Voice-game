import { useEffect, useState } from "react";
import { configured, ensureUser } from "./lib/supabase";
import type { LocalGameId } from "./games/registry";
import { KingsCup } from "./games/kingscup/KingsCup";
import { Home } from "./screens/Home";
import { Room } from "./screens/Room";

const ROOM_KEY = "voicegame.room";

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(() => localStorage.getItem(ROOM_KEY));
  const [local, setLocal] = useState<LocalGameId | null>(null);

  useEffect(() => {
    if (!configured) {
      setAuthError(
        ".env файлд VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY тохируулна уу (.env.example-ийг үз).",
      );
      return;
    }
    ensureUser()
      .then((u) => setUserId(u.id))
      .catch((e) => setAuthError(e instanceof Error ? e.message : String(e)));
  }, []);

  const enter = (id: string) => {
    localStorage.setItem(ROOM_KEY, id);
    setRoomId(id);
  };
  const leave = () => {
    localStorage.removeItem(ROOM_KEY);
    setRoomId(null);
  };

  // Нэг утасны тоглоомууд онлайн холболтгүй ажиллана
  if (local === "kingscup") return <KingsCup onExit={() => setLocal(null)} />;

  if (roomId && userId) {
    return <Room key={roomId} roomId={roomId} userId={userId} onLeave={leave} />;
  }

  return (
    <Home
      online={Boolean(userId)}
      authError={authError}
      onEnter={enter}
      onPlayLocal={setLocal}
    />
  );
}

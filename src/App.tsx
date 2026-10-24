import { useEffect, useState } from "react";
import { configured, ensureUser } from "./lib/supabase";
import { Home } from "./screens/Home";
import { Room } from "./screens/Room";

const ROOM_KEY = "voicegame.room";

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(() => localStorage.getItem(ROOM_KEY));

  useEffect(() => {
    if (!configured) {
      setError(".env файлд VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY тохируулна уу (.env.example-ийг үз).");
      return;
    }
    ensureUser()
      .then((u) => setUserId(u.id))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const enter = (id: string) => {
    localStorage.setItem(ROOM_KEY, id);
    setRoomId(id);
  };
  const leave = () => {
    localStorage.removeItem(ROOM_KEY);
    setRoomId(null);
  };

  if (error) {
    return (
      <div className="app">
        <div className="card stack">
          <h2>Алдаа</h2>
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="app">
        <div className="muted">Холбогдож байна…</div>
      </div>
    );
  }

  return roomId ? (
    <Room key={roomId} roomId={roomId} userId={userId} onLeave={leave} />
  ) : (
    <Home onEnter={enter} />
  );
}

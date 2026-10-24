import { useEffect, useRef } from "react";
import type { RoomRow } from "./types";

/**
 * Үеийн хугацаа дуусахад дараагийн үе рүү шилжүүлэх RPC-г дуудна.
 * Өрөөний эзэн шууд, бусад тоглогч 4 секундын дараа нөөцөөр дууддаг.
 * Сервер талд үе таарахгүй бол юу ч хийхгүй тул давхар дуудлага аюулгүй.
 */
export function useAutoAdvance(
  room: RoomRow,
  isHost: boolean,
  advance: () => Promise<unknown>,
) {
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (room.status !== "playing" || !room.phase_ends_at) return;
    const delay =
      Math.max(0, new Date(room.phase_ends_at).getTime() - Date.now()) + (isHost ? 300 : 4000);
    const t = setTimeout(() => {
      advanceRef.current().catch(() => undefined);
    }, delay);
    return () => clearTimeout(t);
  }, [room.id, room.status, room.phase, room.round, room.phase_ends_at, isHost]);
}

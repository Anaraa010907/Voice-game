import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { supabase } from "./supabase";
import type { MyRole, Note, Player, RoomRow, Vote } from "./types";

/** Өрөөний мэдээллийг татаж, realtime-аар шинэчилнэ. */
export function useRoomData(roomId: string) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [myRole, setMyRole] = useState<MyRole | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [gone, setGone] = useState(false);
  const roleKey = useRef<string>("");

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (!data) setGone(true);
    else setRoom(data as RoomRow);
  }, [roomId]);

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at");
    if (data) setPlayers(data as Player[]);
  }, [roomId]);

  const loadVotes = useCallback(async () => {
    const { data } = await supabase.from("votes").select("*").eq("room_id", roomId);
    if (data) setVotes(data as Vote[]);
  }, [roomId]);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("private_notes")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at");
    if (data) setNotes(data as Note[]);
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
    void loadPlayers();
    void loadVotes();
    void loadNotes();

    const filter = (col: string) => ({ schema: "public", filter: `${col}=eq.${roomId}` });
    const channel = supabase
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", table: "rooms", ...filter("id") }, () => void loadRoom())
      .on("postgres_changes", { event: "*", table: "players", ...filter("room_id") }, () => void loadPlayers())
      .on("postgres_changes", { event: "*", table: "votes", ...filter("room_id") }, () => void loadVotes())
      .on("postgres_changes", { event: "*", table: "private_notes", ...filter("room_id") }, () => void loadNotes())
      .subscribe();

    // Realtime тасалдсан тохиолдолд нөөц болгож 5 секунд тутам шинэчилнэ
    const timer = setInterval(() => {
      void loadRoom();
      void loadPlayers();
    }, 5000);

    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [roomId, loadRoom, loadPlayers, loadVotes, loadNotes]);

  // Үүргээ тоглоом эхлэх үед, нээгдэх үеийг дуусахад бүх үүргийг татна
  const status = room?.status;
  useEffect(() => {
    if (!status) return;
    const key = `${status}`;
    if (roleKey.current === key) return;
    roleKey.current = key;

    if (status === "playing") {
      api.myRole(roomId).then(setMyRole).catch(() => undefined);
    } else if (status === "finished") {
      api
        .revealRoles(roomId)
        .then((rows) => setRevealed(Object.fromEntries(rows.map((r) => [r.player_id, r.role]))))
        .catch(() => undefined);
    } else {
      setMyRole(null);
      setRevealed({});
    }
  }, [status, roomId]);

  return { room, players, votes, notes, myRole, revealed, gone };
}

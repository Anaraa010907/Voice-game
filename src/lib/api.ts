import { supabase } from "./supabase";
import type { GameType, MyRole, PublicRoom, RoomRow } from "./types";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  createRoom: (name: string, game: GameType, isPublic: boolean, avatar: string) =>
    call<RoomRow>("create_room", {
      p_name: name,
      p_game: game,
      p_public: isPublic,
      p_avatar: avatar,
    }),
  joinRoom: (code: string, name: string, avatar: string) =>
    call<RoomRow>("join_room", { p_code: code, p_name: name, p_avatar: avatar }),
  leaveRoom: (roomId: string) => call<void>("leave_room", { p_room: roomId }),
  listPublicRooms: () => call<PublicRoom[]>("list_public_rooms"),
  startGame: (roomId: string, game: GameType) => {
    const fn =
      game === "imposter" ? "start_imposter" : game === "whoisit" ? "start_whoisit" : "start_game";
    return call<void>(fn, { p_room: roomId });
  },
  myRole: (roomId: string) => call<MyRole | null>("get_my_role", { p_room: roomId }),
  revealRoles: (roomId: string) =>
    call<{ player_id: string; role: string }[]>("reveal_roles", { p_room: roomId }),
  nightAction: (roomId: string, targetId: string) =>
    call<void>("submit_night_action", { p_room: roomId, p_target: targetId }),
  vote: (roomId: string, targetId: string | null) =>
    call<void>("cast_vote", { p_room: roomId, p_target: targetId }),
  advance: (roomId: string, phase: string, round: number) =>
    call<void>("advance_phase", { p_room: roomId, p_phase: phase, p_round: round }),
  playAgain: (roomId: string) => call<void>("play_again", { p_room: roomId }),

  // Imposter
  imposterVote: (roomId: string, targetId: string | null) =>
    call<void>("cast_imposter_vote", { p_room: roomId, p_target: targetId }),
  imposterGuess: (roomId: string, guess: string) =>
    call<void>("submit_imposter_guess", { p_room: roomId, p_guess: guess }),
  imposterAdvance: (roomId: string, phase: string) =>
    call<void>("advance_imposter", { p_room: roomId, p_phase: phase }),

  // Хэн вэ?
  whoisitVote: (roomId: string, targetId: string) =>
    call<void>("cast_whois_vote", { p_room: roomId, p_target: targetId }),
  whoisitAdvance: (roomId: string, phase: string, round: number) =>
    call<void>("advance_whois", { p_room: roomId, p_phase: phase, p_round: round }),
};

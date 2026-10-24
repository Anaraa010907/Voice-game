export type GameType =
  | "mafia"
  | "imposter"
  | "spyfall"
  | "werewolf"
  | "charades"
  | "guesswho"
  | "truthdare"
  | "codenames"
  | "twotruths"
  | "taboo";
export type RoomStatus = "lobby" | "playing" | "finished";

export interface LogEntry {
  round: number;
  text: string;
}

export interface RoomRow {
  id: string;
  code: string;
  game_type: GameType;
  host_user: string;
  is_public: boolean;
  status: RoomStatus;
  phase: string;
  round: number;
  phase_ends_at: string | null;
  winner: string | null;
  log: LogEntry[];
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  avatar: string;
  is_host: boolean;
  is_alive: boolean;
  joined_at: string;
}

export interface Vote {
  room_id: string;
  round: number;
  voter_id: string;
  target_id: string | null;
}

export interface Note {
  id: string;
  room_id: string;
  user_id: string;
  round: number;
  text: string;
  created_at: string;
}

export interface MyRole {
  player_id: string;
  role: string;
  teammates: { id: string; name: string }[];
  /** Imposter тоглоом: ангилал, болон үг (imposter-д null) */
  category?: string;
  word?: string | null;
}

export interface PublicRoom {
  id: string;
  code: string;
  game_type: GameType;
  player_count: number;
  host_name: string | null;
  created_at: string;
}

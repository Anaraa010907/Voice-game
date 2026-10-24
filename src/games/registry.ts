import type { GameType, MyRole, Player, RoomRow } from "../lib/types";

export interface GameCtx {
  room: RoomRow;
  players: Player[];
  me: Player | undefined;
  myRole: MyRole | null;
}

/** Voice дээр хэн ярьж, хэнийг сонсохыг тоглоом бүр өөрөө тодорхойлно. */
export interface VoicePolicy {
  canSpeak: boolean;
  /** null = бүгдийг сонсоно; Set = зөвхөн эдгээр player id-г сонсоно */
  hearOnly: Set<string> | null;
}

export interface GameDef {
  id: GameType;
  name: string;
  icon: string;
  blurb: string;
  available: boolean;
  minPlayers: number;
  voicePolicy: (ctx: GameCtx) => VoicePolicy;
}

const openVoice = (): VoicePolicy => ({ canSpeak: true, hearOnly: null });

function mafiaVoice({ room, players, me, myRole }: GameCtx): VoicePolicy {
  if (room.status !== "playing" || !me) return openVoice();

  // Хасагдсан тоглогч: бүгдийг сонсоно, ярьсныг нь амьд хүмүүс сонсохгүй
  if (!me.is_alive) return openVoice();

  const alive = new Set(players.filter((p) => p.is_alive).map((p) => p.id));

  if (room.phase === "night") {
    if (myRole?.role === "mafia") {
      const team = new Set<string>([me.id, ...myRole.teammates.map((t) => t.id)]);
      return { canSpeak: true, hearOnly: team };
    }
    return { canSpeak: false, hearOnly: new Set() };
  }

  // Өдөр: амьд хүмүүс хоорондоо ярина
  return { canSpeak: true, hearOnly: alive };
}

export const GAMES: GameDef[] = [
  {
    id: "mafia",
    name: "Мафи",
    icon: "🕵️",
    blurb: "Шөнө мафи цохилт хийнэ, өдөр хотынхон хэлэлцэж санал хураана.",
    available: true,
    minPlayers: 4,
    voicePolicy: mafiaVoice,
  },
  {
    id: "spyfall",
    name: "Тагнуулын ширээ",
    icon: "🎭",
    blurb: "Spyfall — бүгд нэг байршилд, тагнуулч байршлаа мэдэхгүй.",
    available: false,
    minPlayers: 3,
    voicePolicy: openVoice,
  },
  {
    id: "werewolf",
    name: "Чоно",
    icon: "🐺",
    blurb: "Werewolf — тосгонд чоно нуугдаж байна.",
    available: false,
    minPlayers: 5,
    voicePolicy: openVoice,
  },
];

export const gameById = (id: GameType) => GAMES.find((g) => g.id === id)!;

export const ROLE_INFO: Record<string, { label: string; icon: string; desc: string }> = {
  mafia: {
    label: "Мафи",
    icon: "🔪",
    desc: "Шөнө багийнхантайгаа хамт нэг хүнийг сонгож ална. Өдөр хотынхон шиг дүр эсгэ.",
  },
  doctor: {
    label: "Эмч",
    icon: "💉",
    desc: "Шөнө нэг хүнийг аврана (өөрийгөө ч болно).",
  },
  detective: {
    label: "Мөрдөгч",
    icon: "🔍",
    desc: "Шөнө нэг хүнийг шалгаж мафи эсэхийг мэднэ.",
  },
  civilian: {
    label: "Иргэн",
    icon: "🏘️",
    desc: "Өдөр хэлэлцэж, мафийг олж санал хурааж хөөнө.",
  },
};

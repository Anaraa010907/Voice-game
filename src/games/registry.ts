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
    id: "imposter",
    name: "Who's the Imposter?",
    icon: "🥸",
    blurb: "Бүгд нэг үг авна, imposter зөвхөн ангиллыг мэднэ. Тайлбарлаж, imposter-ийг ол.",
    available: true,
    minPlayers: 3,
    voicePolicy: openVoice,
  },
  {
    id: "guesswho",
    name: "Дүр таах",
    icon: "🙈",
    blurb: "Өөрийн дүрийг мэдэхгүй — тийм/үгүй асуултаар таа.",
    available: false,
    minPlayers: 3,
    voicePolicy: openVoice,
  },
  {
    id: "truthdare",
    name: "Truth or Dare",
    icon: "🎲",
    blurb: "Үнэн хэлэх үү, даалгавар биелүүлэх үү?",
    available: false,
    minPlayers: 2,
    voicePolicy: openVoice,
  },
  {
    id: "codenames",
    name: "Кодын нэр",
    icon: "🗝️",
    blurb: "Codenames — хоёр баг, нэг үгээр түүчээлж үгсийг олно.",
    available: false,
    minPlayers: 4,
    voicePolicy: openVoice,
  },
  {
    id: "twotruths",
    name: "Хоёр үнэн, нэг худал",
    icon: "🤥",
    blurb: "Өөрийнхөө тухай 3 үг хэлнэ — аль нь худал вэ?",
    available: false,
    minPlayers: 3,
    voicePolicy: openVoice,
  },
  {
    id: "taboo",
    name: "Хориотой үг",
    icon: "🚫",
    blurb: "Taboo — хориотой үгсийг хэлэлгүй үгийг тайлбарла.",
    available: false,
    minPlayers: 4,
    voicePolicy: openVoice,
  },
  {
    id: "whoisit",
    name: "Хэн вэ?",
    icon: "🙋",
    blurb: "\"Хэн хамгийн ... вэ?\" — нууцаар санал өгч, найзууд чинь чамайг яаж харж байгааг мэд.",
    available: true,
    minPlayers: 3,
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

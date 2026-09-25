import type { BoardTile, TileType } from './gameTypes'

type TileSeed = { name: string; icon: string; type?: TileType; price?: number; rent?: number; color?: string }

const seeds: TileSeed[] = [
  { name: 'ЯВАХ', icon: '🚶', type: 'START' },
  { name: 'Улаанбаатар', icon: '🏙️', price: 250, rent: 40, color: 'blue' },
  { name: 'СЮРПРИЗ', icon: '❓', type: 'SURPRISE' },
  { name: 'Дархан', icon: '🏭', price: 250, rent: 40, color: 'blue' },
  { name: 'Эрдэнэт', icon: '⛏️', price: 300, rent: 50, color: 'blue' },
  { name: 'ТӨМӨР ЗАМ', icon: '🚂', type: 'COMPANY', price: 400, rent: 100 },
  { name: 'Чойбалсан', icon: '🌾', price: 350, rent: 60, color: 'green' },
  { name: 'ЭРДЭНЭСИЙН АВДАР', icon: '🎁', type: 'TREASURE' },
  { name: 'Сайншанд', icon: '🏜️', price: 350, rent: 60, color: 'green' },
  { name: 'ШОРОН', icon: '🚔', type: 'JAIL' },
  { name: 'Даланзадгад', icon: '🐫', price: 450, rent: 80, color: 'orange' },
  { name: 'Өмнөговь', icon: '🦕', price: 450, rent: 80, color: 'orange' },
  { name: 'ТАТВАР', icon: '💰', type: 'TAX' },
  { name: 'Ховд', icon: '⛰️', price: 400, rent: 70, color: 'purple' },
  { name: 'Өлгий', icon: '🦅', price: 400, rent: 70, color: 'purple' },
  { name: 'ХОВД НИСЭХ БУУДАЛ', icon: '✈️', type: 'AIRPORT', price: 500, rent: 100 },
  { name: 'Мөрөн', icon: '🏞️', price: 300, rent: 50, color: 'teal' },
  { name: 'СҮРПРИЗ', icon: '❓', type: 'SURPRISE' },
  { name: 'Арвайхээр', icon: '🐎', price: 300, rent: 50, color: 'teal' },
  { name: 'АМРАЛТ', icon: '🏖️', type: 'REST' },
  { name: 'Зуунмод', icon: '🌲', price: 350, rent: 60, color: 'green' },
  { name: 'Сүхбаатар', icon: '🐴', price: 400, rent: 70, color: 'green' },
  { name: 'УСНЫ КОМПАНИ', icon: '💧', type: 'COMPANY', price: 300, rent: 0 },
  { name: 'Замын-Үүд', icon: '🚉', price: 450, rent: 80, color: 'orange' },
  { name: 'ДАЛАНЗАДГАД НИСЭХ БУУДАЛ', icon: '✈️', type: 'AIRPORT', price: 500, rent: 100 },
  { name: 'Дорнод', icon: '🌄', price: 350, rent: 60, color: 'green' },
  { name: 'ЭРЧИМ ХҮЧНИЙ КОМПАНИ', icon: '⚡', type: 'COMPANY', price: 300, rent: 0 },
  { name: 'ЧИНГИС ХААН ОУНБ', icon: '✈️', type: 'AIRPORT', price: 500, rent: 100 },
  { name: 'Ховд гол', icon: '🌊', price: 300, rent: 50, color: 'purple' },
  { name: 'Өлгий хот', icon: '🏔️', price: 350, rent: 60, color: 'purple' },
  { name: 'ЭРДЭНЭСИЙН АВДАР', icon: '🎁', type: 'TREASURE' },
  { name: 'Сайншанд', icon: '🌵', price: 400, rent: 70, color: 'orange' },
  { name: 'Дорнод', icon: '🐎', price: 400, rent: 70, color: 'green' },
  { name: 'ТӨМӨР ЗАМ', icon: '🚂', type: 'COMPANY', price: 400, rent: 100 },
  { name: 'Налайх', icon: '⛏️', price: 250, rent: 40, color: 'blue' },
  { name: 'ХУДАЛДААНЫ ТӨВ', icon: '🏬', price: 300, rent: 50, color: 'blue' },
]

export const BOARD_DATA: BoardTile[] = seeds.map((tile, id) => ({
  id, name: tile.name, icon: tile.icon, type: tile.type ?? 'PROPERTY', price: tile.price ?? 0,
  rent: tile.rent ?? 0, color: tile.color, ownerId: null, buildingLevel: 0,
  buildable: tile.type === undefined || tile.type === 'PROPERTY',
}))

export type TileType = 'START' | 'PROPERTY' | 'COMPANY' | 'AIRPORT' | 'TAX' | 'JAIL' | 'GO_TO_JAIL' | 'SURPRISE' | 'TREASURE' | 'REST'

export type BoardTile = {
  id: number
  name: string
  type: TileType
  icon: string
  price: number
  rent: number
  color?: string
  ownerId: string | null
  buildingLevel: number
  buildable?: boolean
}

export type GamePlayer = {
  id: string
  name: string
  avatar: string
  color: string
  money: number
  position: number
  properties: number[]
  isInJail: boolean
  jailTurns: number
  isBankrupt: boolean
}

export type GameState = {
  players: GamePlayer[]
  board: BoardTile[]
  currentPlayerIndex: number
  gameStatus: 'waiting' | 'playing' | 'finished'
  dice: { dice1: number; dice2: number; total: number; isRolling: boolean }
  turn: { hasRolled: boolean; canBuy: boolean; canBuild: boolean; pendingMoves: number; doublesCount: number }
  log: string[]
  winnerId: string | null
  modal: { title: string; body: string } | null
}

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'STEP_MOVE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'BUILD_HOUSE' }
  | { type: 'END_TURN' }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'RESET_GAME' }

import { BOARD_DATA } from './boardData'
import { GAME_CONFIG } from './gameRules'
import type { BoardTile, GameAction, GamePlayer, GameState } from './gameTypes'

const playerSeeds = [
  { id: 'bold', name: 'Bold', avatar: '🐻', color: '#d9a441' },
  { id: 'sarnai', name: 'Sarnai', avatar: '🦊', color: '#44c9c5' },
  { id: 'zaya', name: 'Zaya', avatar: '🐯', color: '#ec784f' },
  { id: 'troga', name: 'Troga', avatar: '🐼', color: '#73a4dc' },
]

export function createInitialGame(): GameState {
  return {
    players: playerSeeds.map(p => ({ ...p, money: GAME_CONFIG.startingMoney, position: 0, properties: [], isInJail: false, jailTurns: 0, isBankrupt: false })),
    board: BOARD_DATA.map(tile => ({ ...tile })), currentPlayerIndex: 0, gameStatus: 'playing',
    dice: { dice1: 1, dice2: 1, total: 2, isRolling: false },
    turn: { hasRolled: false, canBuy: false, canBuild: false, pendingMoves: 0, doublesCount: 0 },
    log: ['Тоглоом эхэллээ. Bold-ын ээлж.'], winnerId: null, modal: null,
  }
}

const log = (state: GameState, message: string): GameState => ({ ...state, log: [...state.log.slice(-7), message] })
const active = (state: GameState) => state.players[state.currentPlayerIndex]
const updatePlayer = (state: GameState, id: string, patch: Partial<GamePlayer>) => ({ ...state, players: state.players.map(p => p.id === id ? { ...p, ...patch } : p) })
const tileOwner = (state: GameState, tile: BoardTile) => tile.ownerId ? state.players.find(p => p.id === tile.ownerId) : undefined

function finishLanding(state: GameState): GameState {
  const player = active(state)
  const tile = state.board[player.position]
  let next = { ...state, turn: { ...state.turn, canBuy: false, canBuild: false } }
  if (tile.type === 'START') return log(next, `${player.name} START дээр ирлээ.`)
  if (tile.type === 'TAX') return log(settleBankruptPlayers(updatePlayer(next, player.id, { money: player.money - GAME_CONFIG.taxAmount })), `${player.name} ${GAME_CONFIG.taxAmount} MNT татвар төллөө.`)
  if (tile.type === 'JAIL' || tile.type === 'GO_TO_JAIL') {
    next = updatePlayer(next, player.id, { position: 9, isInJail: true, jailTurns: 0 })
    return log(next, `${player.name} шоронд орлоо.`)
  }
  if (tile.type === 'SURPRISE' || tile.type === 'TREASURE') {
    const gain = tile.type === 'SURPRISE' ? (Math.random() > .5 ? 200 : -100) : [100, 200, 300, -50][Math.floor(Math.random() * 4)]
    next = settleBankruptPlayers(updatePlayer(next, player.id, { money: player.money + gain }))
    return { ...log(next, `${player.name} ${gain >= 0 ? '+' : ''}${gain} MNT авлаа.`), modal: { title: tile.type === 'SURPRISE' ? 'СЮРПРИЗ' : 'ЭРДЭНЭСИЙН АВДАР', body: `${gain >= 0 ? '+' : ''}${gain} MNT` } }
  }
  if (tile.type === 'REST') return log(next, `${player.name} амралтын талбайд ирлээ.`)
  if (tile.ownerId === null && tile.price > 0) return log({ ...next, turn: { ...next.turn, canBuy: true } }, `${player.name} ${tile.name}-д буулаа. Худалдаж авч болно.`)
  if (tile.ownerId === player.id) return log({ ...next, turn: { ...next.turn, canBuild: Boolean(tile.buildable) } }, `Энэ газар ${player.name}-ын өмч.`)
  if (tile.ownerId) {
    const owner = tileOwner(next, tile)
    const rent = tile.type === 'COMPANY' ? next.dice.total * GAME_CONFIG.companyMultiplier : tile.type === 'AIRPORT' ? tile.rent : tile.rent * Math.max(1, tile.buildingLevel + 1)
    if (owner) {
      next = updatePlayer(next, player.id, { money: player.money - rent })
      next = settleBankruptPlayers(updatePlayer(next, owner.id, { money: owner.money + rent }))
      return log(next, `${player.name} ${owner.name}-д ${rent} MNT түрээс төллөө.`)
    }
  }
  return next
}

function moveOneStep(state: GameState): GameState {
  const player = active(state)
  const nextPosition = (player.position + 1) % state.board.length
  const passedStart = nextPosition < player.position
  let next = updatePlayer(state, player.id, { position: nextPosition, money: player.money + (passedStart ? GAME_CONFIG.startReward : 0) })
  if (passedStart) next = log(next, `${player.name} START дайрлаа. +${GAME_CONFIG.startReward} MNT`)
  return next
}

function settleBankruptPlayers(state: GameState): GameState {
  let next = { ...state, players: state.players.map(p => p.money < 0 ? { ...p, isBankrupt: true, properties: [] } : p), board: state.board.map(tile => { const owner = state.players.find(p => p.id === tile.ownerId); return owner && owner.money < 0 ? { ...tile, ownerId: null, buildingLevel: 0 } : tile }) }
  const bankrupt = next.players.find(p => p.money < 0)
  return bankrupt ? log(next, `${bankrupt.name} дампуурлаа.`) : next
}

function nextTurn(state: GameState): GameState {
  const available = state.players.map((p, i) => (!p.isBankrupt ? i : -1)).filter(i => i >= 0)
  if (available.length <= 1) return { ...state, gameStatus: 'finished', winnerId: available.length ? state.players[available[0]].id : null, modal: { title: 'ТОГЛООМ ДУУСЛАА', body: available.length ? `${state.players[available[0]].name} яллаа!` : 'Тоглоом дууслаа.' } }
  const currentPos = available.indexOf(state.currentPlayerIndex)
  const index = available[(currentPos + 1) % available.length]
  const player = state.players[index]
  return log({ ...state, currentPlayerIndex: index, turn: { hasRolled: false, canBuy: false, canBuild: false, pendingMoves: 0, doublesCount: state.turn.doublesCount }, dice: { ...state.dice, isRolling: false } }, `${player.name}-ын ээлж.`)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const player = active(state)
  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.gameStatus !== 'playing' || state.turn.hasRolled || state.dice.isRolling || player.isInJail) return state
      const dice1 = Math.floor(Math.random() * 6) + 1, dice2 = Math.floor(Math.random() * 6) + 1, total = dice1 + dice2
      const doubles = dice1 === dice2, doublesCount = doubles ? state.turn.doublesCount + 1 : 0
      if (doublesCount >= GAME_CONFIG.doublesLimit) {
        const jailed = updatePlayer({ ...state, dice: { dice1, dice2, total, isRolling: true }, turn: { ...state.turn, hasRolled: true, doublesCount }, }, player.id, { position: 9, isInJail: true })
        return log({ ...jailed, dice: { ...jailed.dice, isRolling: false }, turn: { ...jailed.turn, pendingMoves: 0 } }, `${player.name} 3 удаа давхар шоо шидлээ. Шоронд орлоо.`)
      }
      return log({ ...state, dice: { dice1, dice2, total, isRolling: true }, turn: { ...state.turn, hasRolled: true, pendingMoves: total, doublesCount } }, `${player.name} шоо орхилоо: ${dice1} + ${dice2} = ${total}`)
    }
    case 'STEP_MOVE': {
      if (!state.dice.isRolling || state.turn.pendingMoves <= 0) return state
      const moved = moveOneStep({ ...state, turn: { ...state.turn, pendingMoves: state.turn.pendingMoves - 1 } })
      if (moved.turn.pendingMoves > 0) return moved
      return finishLanding({ ...moved, dice: { ...moved.dice, isRolling: false } })
    }
    case 'BUY_PROPERTY': {
      const tile = state.board[player.position]
      if (!state.turn.canBuy || tile.ownerId || player.money < tile.price) return state
      let next = updatePlayer(state, player.id, { money: player.money - tile.price, properties: [...player.properties, tile.id] })
      next = { ...next, board: next.board.map(t => t.id === tile.id ? { ...t, ownerId: player.id } : t), turn: { ...next.turn, canBuy: false, canBuild: Boolean(tile.buildable) } }
      return log(settleBankruptPlayers(next), `${player.name} ${tile.name}-ыг ${tile.price} MNT-р худалдаж авлаа.`)
    }
    case 'BUILD_HOUSE': {
      const tile = state.board[player.position]
      if (!state.turn.canBuild || tile.ownerId !== player.id || tile.buildingLevel >= GAME_CONFIG.maxBuildings || player.money < GAME_CONFIG.buildingCost) return state
      let next = updatePlayer(state, player.id, { money: player.money - GAME_CONFIG.buildingCost })
      next = { ...next, board: next.board.map(t => t.id === tile.id ? { ...t, buildingLevel: t.buildingLevel + 1 } : t) }
      return log(settleBankruptPlayers(next), `${tile.name} дээр байшин барилаа. Level ${tile.buildingLevel + 1}.`)
    }
    case 'END_TURN': {
      if (!state.turn.hasRolled || state.turn.pendingMoves !== 0) return state
      if (state.turn.doublesCount > 0 && state.turn.doublesCount < GAME_CONFIG.doublesLimit) return log({ ...state, turn: { ...state.turn, hasRolled: false, canBuy: false, canBuild: false }, dice: { ...state.dice, isRolling: false } }, `${player.name} давхар шоо шидлээ. Дахин шиднэ.`)
      return nextTurn(state)
    }
    case 'PAY_JAIL_FINE':
      if (!player.isInJail || player.money < GAME_CONFIG.jailFine) return state
      return log(updatePlayer(state, player.id, { money: player.money - GAME_CONFIG.jailFine, isInJail: false }), `${player.name} ${GAME_CONFIG.jailFine} MNT төлөөд шоронгоос гарлаа.`)
    case 'CLOSE_MODAL': return { ...state, modal: null }
    case 'RESET_GAME': return createInitialGame()
    default: return state
  }
}

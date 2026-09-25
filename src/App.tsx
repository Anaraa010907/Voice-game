import { useMemo, useState } from 'react'
import {
  ArrowLeft, Bell, Check, ChevronRight, CircleHelp, Coins, Crown, Gamepad2,
  Gift, Home, Mic, Mic2, MoreHorizontal, Package, Play, Plus, Settings,
  ShoppingBag, Sparkles, Trophy, Users, Volume2, X, Zap,
} from 'lucide-react'

type Screen = 'home' | 'voice' | 'board' | 'profile' | 'shop'
type Avatar = { emoji: string; name: string; color: string }

const avatars: Avatar[] = [
  { emoji: '🐻', name: 'Bear', color: '#d68a55' }, { emoji: '🐯', name: 'Tiger', color: '#f3aa45' },
  { emoji: '🦊', name: 'Fox', color: '#ed714c' }, { emoji: '🐱', name: 'Cat', color: '#d899c8' },
  { emoji: '🐼', name: 'Panda', color: '#8b9bb8' }, { emoji: '🐸', name: 'Frog', color: '#75c68c' },
]

const players = [
  { emoji: '🐯', name: 'Tomi', color: '#f3aa45', speaking: true },
  { emoji: '🐼', name: 'Bataa', color: '#8b9bb8' },
  { emoji: '🦊', name: 'Naraa', color: '#ed714c' },
  { emoji: '🐸', name: 'Saraa', color: '#75c68c' },
  { emoji: '🐱', name: 'Anu', color: '#d899c8' },
]

function AvatarBubble({ avatar, size = 'md', crown = false }: { avatar: Avatar | { emoji: string; color: string }, size?: 'sm' | 'md' | 'lg' | 'xl', crown?: boolean }) {
  return <div className={`avatar avatar-${size}`} style={{ background: avatar.color }}>
    {crown && <span className="avatar-crown">♛</span>}
    <span>{avatar.emoji}</span>
  </div>
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [nickname, setNickname] = useState('Anaraa')
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0])
  const [coins, setCoins] = useState(1500)
  const [toast, setToast] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAuth, setShowAuth] = useState(true)

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  const go = (next: Screen) => { setScreen(next); setShowProfile(false) }

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    {screen === 'home' ? <header className="lobby-topbar">
      <button className="exit-pill" onClick={() => notify('Өрөөнөөс гарах үйлдэл удахгүй')}><ArrowLeft size={16} /> Гарах</button>
      <div className="room-code"><small>ӨРӨӨНИЙ КОД</small><strong>254 852</strong></div>
      <div className="lobby-tools"><div className="room-code compact"><small>ӨРӨӨНИЙ КОД</small><strong>254 852</strong></div><button className="waiting-pill" onClick={() => notify('Хүлээлгийн өрөө')}><span>◷</span> Хүлээлгийн өрөө</button></div>
    </header> : screen === 'voice' || screen === 'board' ? null : <header className="topbar">
      <button className="brand" onClick={() => go('home')}><span className="brand-mark"><Mic2 size={19} /></span><span>VOICE<span className="gold">GAME</span></span></button>
      <div className="room-pill"><span className="live-dot" /> ROOM <strong>254852</strong><button onClick={() => navigator.clipboard?.writeText('254852')}><CopyIcon /></button></div>
      <div className="top-actions">
        <button className="icon-button"><Bell size={18} /><i /></button>
        <button className="coin-pill" onClick={() => go('shop')}><Coins size={16} /> {coins.toLocaleString()} <Plus size={14} /></button>
        <button className="profile-mini" onClick={() => setShowProfile(true)}><AvatarBubble avatar={selectedAvatar} size="sm" crown /><span><b>{nickname}</b><small>Level 38</small></span><ChevronRight size={16} /></button>
      </div>
    </header>}

    {showProfile && <ProfilePopover avatar={selectedAvatar} nickname={nickname} onClose={() => setShowProfile(false)} onProfile={() => go('profile')} />}
    {showAuth && <AuthModal nickname={nickname} setNickname={setNickname} selectedAvatar={selectedAvatar} setSelectedAvatar={setSelectedAvatar} onStart={() => setShowAuth(false)} />}

    <main className="page-wrap">
      {screen === 'home' && <HomeScreen go={go} selectedAvatar={selectedAvatar} nickname={nickname} notify={notify} />}
      {screen === 'voice' && <VoiceRoom go={go} micOn={micOn} setMicOn={setMicOn} notify={notify} />}
      {screen === 'board' && <BoardRoom go={go} />}
      {screen === 'profile' && <ProfileScreen go={go} avatar={selectedAvatar} nickname={nickname} setNickname={setNickname} selectedAvatar={selectedAvatar} setSelectedAvatar={setSelectedAvatar} />}
      {screen === 'shop' && <ShopScreen go={go} coins={coins} setCoins={setCoins} notify={notify} />}
    </main>

    <nav className="bottom-nav">
      <NavItem icon={<Home size={18} />} label="Нүүр" active={screen === 'home'} onClick={() => go('home')} />
      <NavItem icon={<Users size={18} />} label="Найзууд" onClick={() => notify('Найзуудын хэсэг удахгүй')} />
      <NavItem icon={<ShoppingBag size={18} />} label="Дэлгүүр" active={screen === 'shop'} onClick={() => go('shop')} />
      <NavItem icon={<Settings size={18} />} label="Тохиргоо" onClick={() => notify('Тохиргоо удахгүй')} />
    </nav>
    {toast && <div className="toast"><Check size={16} /> {toast}</div>}
  </div>
}

function HomeScreen({ go, selectedAvatar, nickname, notify }: { go: (s: Screen) => void; selectedAvatar: Avatar; nickname: string; notify: (s: string) => void }) {
  return <section className="lobby-screen">
    <div className="lobby-title"><h1>Тоглоом сонгоно уу</h1><span>Найзуудтайгаа өрөөгөө дүүргээд эхлүүлээрэй</span></div>
    <div className="lobby-games">
      <article className="lobby-game board-lobby">
        <div className="game-heading">BOARD GAME</div>
        <div className="board-art"><div className="board-square"><span>GO</span><i>🐕</i><b>MONOPOLY</b><em>⌂</em><u>★</u></div><div className="board-piece piece-one">🐘</div><div className="board-piece piece-two">🐧</div></div>
        <button className="join-or-play" onClick={() => go('board')}>PLAY NOW</button>
        <p>Up to 6 Players<br /><span>Monopoly Classic Rules</span></p>
        <button className="side-join join-left" onClick={() => notify('Board Game-д нэгдлээ')}><Plus size={20} /> <small>Join</small></button>
        <button className="side-join join-right" onClick={() => notify('Board Game-д нэгдлээ')}><Plus size={20} /> <small>Join</small></button>
        <div className="lobby-avatar elephant">🐘</div><div className="lobby-avatar penguin">🐧</div>
      </article>
      <article className="lobby-game voice-lobby">
        <div className="game-heading">VOICE GAME</div>
        <div className="voice-art"><div className="spy-circle"><div className="spy-logo">Ш<small>SPYFALL</small></div><span className="spy-card c1">?</span><span className="spy-card c2">?</span><span className="spy-card c3">⌁</span><span className="spy-card c4">?</span></div>{players.slice(0,4).map((p,i)=><div key={p.name} className={`lobby-player lp-${i}`}><AvatarBubble avatar={p} size="md" /><b>{['Zaya','Ssmal','Sarnai','Nomin'][i]}</b>{i===2&&<small>Sarnai is speaking</small>}</div>)}<button className="voice-invite" onClick={() => notify('Voice Game invite link хууллаа')}><Plus size={19} /><small>Урих</small></button></div>
        <button className="join-or-play" onClick={() => go('voice')}>PLAY NOW</button>
        <p>6/8 Players Connected<br /><span>Voice Chat Social Deduction</span></p>
      </article>
    </div>
    <div className="lobby-bottom-message">Найзуудаа урьж тоглоорой</div>
  </section>
}
function FeatureCard({ className, tag, title, subtitle, icon, extra, action, onClick }: { className: string; tag: string; title: string; subtitle: string; icon: string; extra: React.ReactNode; action: string; onClick: () => void }) {
  return <article className={`feature-card ${className}`}><div className="feature-copy"><span className="eyebrow">{tag}</span><h2>{icon} {title}</h2><p>{subtitle}</p><button className="gold-button" onClick={onClick}><Play size={15} fill="currentColor" /> {action}</button><span className="card-foot"><Users size={14} /> Up to 6 players <span>•</span> Classic rules</span></div>{extra}</article>
}

function VoiceRoom({ go, micOn, setMicOn, notify }: { go: (s: Screen) => void; micOn: boolean; setMicOn: (v: boolean) => void; notify: (s: string) => void }) {
  const lobbyPlayers = [
    { emoji: '🐯', name: 'Zaya', color: '#d59236', className: 'lobby-seat-left', accessory: '🕶️' },
    { emoji: '🐻', name: 'Bold', color: '#9b714c', className: 'lobby-seat-top', accessory: '🎩' },
    { emoji: '🦊', name: 'Sarnai', color: '#3ca5a6', className: 'lobby-seat-right-top', accessory: '🧢', speaking: true },
    { emoji: '🐱', name: 'Nomin', color: '#326c83', className: 'lobby-seat-right', accessory: '🎀' },
    { emoji: '🐼', name: 'Temka', color: '#41617c', className: 'lobby-seat-right-bottom', accessory: '🎓' },
    { emoji: '🐸', name: 'Beatna · Ta', color: '#36a95d', className: 'lobby-seat-bottom', accessory: '👑', you: true },
  ]
  return <section className="spy-lobby-screen">
    <div className="spy-lobby-header"><button className="exit-pill" onClick={() => go('home')}><ArrowLeft size={18} /> Гарах</button><div className="room-code"><small>ӨРӨӨНИЙ КОД</small><strong>254 852</strong></div><button className="waiting-pill" onClick={() => notify('Хүлээлгийн өрөө')}><span>◷</span> Хүлээлгийн өрөө</button></div>
    <div className="spy-lobby-panel"><div className="spy-panel-heading"><div><h1>Тагнуулын ширээ</h1><p>6/8 тоглогч холбогдсон</p></div><span className="big-live"><i /> LIVE</span></div>
      <div className="lobby-table-wrap"><div className="lobby-table"><div className="lobby-table-core"><b>Ш</b><small>SPYFALL</small></div><span className="question-card q-top">?</span><span className="question-card q-left">?</span><span className="question-card q-right">?</span><span className="question-card q-bottom">?</span>{lobbyPlayers.map(p => <div className={`lobby-seat ${p.className}`} key={p.name}>{p.speaking && <span className="lobby-speaking">ЯРЬЖ БАЙНА</span>}<span className="seat-accessory">{p.accessory}</span><AvatarBubble avatar={p} size="lg" /><b className={p.you ? 'you-name' : ''}>{p.name}</b></div>)}<button className="invite-seat invite-one" onClick={() => notify('Урилгын холбоос бэлэн боллоо')}><Plus size={34} /><b>Урих</b></button><button className="invite-seat invite-two" onClick={() => notify('Урилгын холбоос бэлэн боллоо')}><Plus size={34} /><b>Урих</b></button></div></div>
      <div className="mic-lobby-footer"><button className={`mic-button ${micOn ? 'mic-active' : ''}`} onClick={() => setMicOn(!micOn)}>{micOn ? <Mic size={24} /> : <Mic2 size={24} />}</button><span>Микрофоноо асаагаад ширээн дээр ярилцаарай</span></div>
    </div>
  </section>
}
const mongolianTiles = [
  { name: 'ЯВАХ', icon: '🚶', price: 'START', type: 'special' },
  { name: 'Улаанбаатар', icon: '🏙️', price: '250 MNT', color: 'blue' },
  { name: 'СЮРПРИЗ', icon: '❓', price: 'LUCK', type: 'special' },
  { name: 'Дархан', icon: '🏭', price: '250 MNT', color: 'blue' },
  { name: 'Эрдэнэт', icon: '⛏️', price: '300 MNT', color: 'blue' },
  { name: 'ТӨМӨР ЗАМ', icon: '🚂', price: '400 MNT', type: 'special' },
  { name: 'Чойбалсан', icon: '🌾', price: '350 MNT', color: 'green' },
  { name: 'ЭРДЭНЭСИЙН АВДАР', icon: '🎁', price: 'LUCK', type: 'special' },
  { name: 'Сайншанд', icon: '🏜️', price: '350 MNT', color: 'green' },
  { name: 'ШОРОН', icon: '🚔', price: 'VISIT', type: 'special' },
  { name: 'Даланзадгад', icon: '🐫', price: '450 MNT', color: 'orange' },
  { name: 'Өмнөговь', icon: '🦕', price: '450 MNT', color: 'orange' },
  { name: 'ТАТВАР', icon: '💰', price: '200 MNT', type: 'special' },
  { name: 'Ховд', icon: '⛰️', price: '400 MNT', color: 'purple' },
  { name: 'Өлгий', icon: '🦅', price: '400 MNT', color: 'purple' },
  { name: '✈️ ХОВД НИСЭХ БУУДАЛ', icon: '✈️', price: '500 MNT', type: 'special' },
  { name: 'Мөрөн', icon: '🏞️', price: '300 MNT', color: 'teal' },
  { name: 'СҮРПРИЗ', icon: '❓', price: 'LUCK', type: 'special' },
  { name: 'Арвайхээр', icon: '🐎', price: '300 MNT', color: 'teal' },
  { name: 'АМРАЛТ', icon: '🏖️', price: 'REST', type: 'special' },
  { name: 'Зуунмод', icon: '🌲', price: '350 MNT', color: 'green' },
  { name: 'Сүхбаатар', icon: '🐴', price: '400 MNT', color: 'green' },
  { name: 'УСНЫ КОМПАНИ', icon: '💧', price: '300 MNT', type: 'special' },
  { name: 'Замын-Үүд', icon: '🚉', price: '450 MNT', color: 'orange' },
  { name: '✈️ ДАЛАНЗАДГАД', icon: '✈️', price: '500 MNT', type: 'special' },
  { name: 'Дорнод', icon: '🌄', price: '350 MNT', color: 'green' },
  { name: 'ЭРЧИМ ХҮЧНИЙ КОМПАНИ', icon: '⚡', price: '300 MNT', type: 'special' },
  { name: 'ЧИНГИС ХААН ОУНБ', icon: '✈️', price: '500 MNT', type: 'special' },
  { name: 'Ховд гол', icon: '🌊', price: '300 MNT', color: 'purple' },
  { name: 'Өлгий хот', icon: '🏔️', price: '350 MNT', color: 'purple' },
  { name: 'ЭРДЭНЭСИЙН АВДАР', icon: '🎁', price: 'LUCK', type: 'special' },
  { name: 'Сайншанд', icon: '🌵', price: '400 MNT', color: 'orange' },
  { name: 'Дорнод', icon: '🐎', price: '400 MNT', color: 'green' },
  { name: 'ТӨМӨР ЗАМ', icon: '🚂', price: '400 MNT', type: 'special' },
  { name: 'Налайх', icon: '⛏️', price: '250 MNT', color: 'blue' },
  { name: 'ХУДАЛДААНЫ ТӨВ', icon: '🏬', price: '300 MNT', color: 'blue' },
]

const boardPlayers = [
  { name: 'Bold', money: '1500 MNT', coins: 5, emoji: '🐻', color: '#a77950', active: true },
  { name: 'Sarnai', money: '1500 MNT', coins: 5, emoji: '🦊', color: '#3da8a3' },
  { name: 'Zaya', money: '1500 MNT', coins: 5, emoji: '🐯', color: '#d8923d' },
  { name: 'Troga', money: '1500 MNT', coins: 5, emoji: '🐼', color: '#566b89' },
]

function BoardRoom({ go }: { go: (s: Screen) => void }) {
  const [rolled, setRolled] = useState(false)
  return <section className="mongol-board-screen"><header className="board-game-header"><button className="exit-pill" onClick={() => go('home')}><ArrowLeft size={18} /> Гарах</button><div className="board-room-code"><small>ӨРӨӨНИЙ КОД</small><strong>254 852</strong></div><button className="waiting-pill" onClick={() => {}}>Хүлээлгийн өрөө</button></header><div className="board-game-layout"><aside className="board-player-panel"><div className="panel-kicker"><Users size={14} /> ТОГЛОГЧИД <span>4 / 6</span></div>{boardPlayers.map(p => <PlayerCard key={p.name} player={p} />)}<button className="add-player" onClick={() => {}}><Plus size={16} /> Найз урих</button></aside><GameBoard tiles={mongolianTiles} rolled={rolled} /><aside className="game-action-panel"><DicePair rolled={rolled} /><div className="turn-label"><span className="live-dot" /> BOLD-ЫН ЭЭЛЖ</div><button className="game-action gold-action" onClick={() => setRolled(true)}><span>🎲</span> ШОО ОРУУЛАХ</button><button className="game-action" onClick={() => {}}><span>🪙</span> ХУДАЛДАЖ АВАХ</button><button className="game-action" onClick={() => {}}><span>🏠</span> БАЙШИН БАРИХ</button><GameChat /></aside></div></section>
}

function PlayerCard({ player }: { player: typeof boardPlayers[number] }) { return <div className={`board-player-card ${player.active ? 'active-player' : ''}`}><AvatarBubble avatar={{ emoji: player.emoji, color: player.color }} size="md" /><div><b>{player.name}</b><small>{player.money}</small><span><Coins size={11} /> {player.coins} ӨМЧ</span></div><MoreHorizontal size={16} /></div> }

function GameBoard({ tiles, rolled }: { tiles: typeof mongolianTiles; rolled: boolean }) { return <div className="game-board-shell"><div className="game-board"><div className="board-center-area"><div className="map-mark">🇲🇳</div><strong>MONGOLIA</strong><small>THE GREAT STEPPE</small><div className="board-dice-row"><span className={rolled ? 'dice rolling' : 'dice'}>⚄</span><span className={rolled ? 'dice rolling delay' : 'dice'}>⚂</span></div><div className="gold-pawn">♟<i /></div></div>{tiles.map((tile, index) => <PropertyTile tile={tile} index={index} key={`${tile.name}-${index}`} />)}</div></div> }

function PropertyTile({ tile, index }: { tile: typeof mongolianTiles[number]; index: number }) { const side = index < 10 ? 'top' : index < 18 ? 'right' : index < 28 ? 'bottom' : 'left'; const order = index < 10 ? index + 1 : index < 18 ? index - 8 : index < 28 ? 38 - index : 38 - index; return <div className={`property-tile ${tile.type === 'special' ? 'special-tile' : `property-${tile.color}`} tile-${side}`} style={side === 'top' ? { gridColumn: order, gridRow: 1 } : side === 'right' ? { gridColumn: 10, gridRow: order } : side === 'bottom' ? { gridColumn: order, gridRow: 10 } : { gridColumn: 1, gridRow: order }}><b>{tile.name}</b><span>{tile.icon}</span><small>{tile.price}</small></div> }

function DicePair({ rolled }: { rolled: boolean }) { return <div className="action-dice"><span className={rolled ? 'dice dice-large rolling' : 'dice dice-large'}>⚄</span><span className={rolled ? 'dice dice-large rolling delay' : 'dice dice-large'}>⚂</span></div> }

function GameChat() { return <div className="game-chat"><div className="chat-heading"><span>ТОГЛООМЫН ЯВЦ</span><MoreHorizontal size={15} /></div><p><b className="chat-orange">Zaya</b> шоронд орлоо.</p><p><b className="chat-gold">Bold</b> Налайхыг худалдаж авлаа.</p><p><b className="chat-cyan">Sarnai</b> 2 шоо шидлээ.</p></div> }

function ProfileScreen({ go, avatar, nickname, setNickname, selectedAvatar, setSelectedAvatar }: { go: (s: Screen) => void; avatar: Avatar; nickname: string; setNickname: (v: string) => void; selectedAvatar: Avatar; setSelectedAvatar: (v: Avatar) => void }) {
  return <section className="profile-screen"><div className="room-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><h1>Миний <span className="gold">profile</span></h1><p>Өөрийн тоглоомын дүр төрхийг тохируулна уу.</p></div></div><div className="profile-layout"><div className="profile-hero"><div className="large-avatar"><AvatarBubble avatar={avatar} size="xl" crown /></div><h2>{nickname}</h2><span className="level-pill"><Crown size={14} /> LEVEL 38</span><div className="level-progress"><span /><small>1,840 / 2,500 XP</small></div><div className="stat-grid"><Stat value="450" label="Нийт тоглолт" /><Stat value="68%" label="Win rate" /><Stat value="112" label="Spy roles" /><Stat value="86" label="Location master" /></div></div><div className="profile-tools"><div className="tool-card"><div className="side-title"><b>Дүрээ тохируулах</b><Settings size={17} /></div><label>Нэр</label><input value={nickname} onChange={e => setNickname(e.target.value)} /><label>Амьтны avatar</label><div className="avatar-picker">{avatars.map(a => <button className={selectedAvatar.name === a.name ? 'chosen' : ''} onClick={() => setSelectedAvatar(a)} key={a.name}><AvatarBubble avatar={a} size="md" /></button>)}</div></div><div className="mini-tools"><div><Trophy size={18} /><b>Achievements</b><small>24 unlocked</small></div><div><Users size={18} /><b>Teammates</b><small>18 recent friends</small></div><div><Gamepad2 size={18} /><b>Game history</b><small>View all matches</small></div></div></div></div></section>
}

function ShopScreen({ go, coins, setCoins, notify }: { go: (s: Screen) => void; coins: number; setCoins: (n: number) => void; notify: (s: string) => void }) {
  const [category, setCategory] = useState('Бүгд'); const items = useMemo(() => [{ icon: '👑', title: 'Royal Crown', type: 'Avatar frame', price: 500 }, { icon: '💬', title: 'Sus!', type: 'Voice sticker', price: 200 }, { icon: '🎁', title: 'Mystery Chest', type: 'Virtual gift', price: 800 }, { icon: '💐', title: 'Bouquet', type: 'Virtual gift', price: 350 }, { icon: '🚀', title: 'Rocket Boost', type: 'Virtual gift', price: 650 }, { icon: '✨', title: 'Golden Frame', type: 'Avatar frame', price: 1200 }].filter(x => category === 'Бүгд' || x.type === category), [category]);
  const buy = (price: number, title: string) => { if (coins >= price) { setCoins(coins - price); notify(`${title} таны inventory-д нэмэгдлээ`) } else notify('Coin хүрэлцэхгүй байна') }
  return <section className="shop-screen"><div className="shop-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><span className="eyebrow"><ShoppingBag size={13} /> THE MARKETPLACE</span><h1>Өөрийн <span className="gold">style</span>-аа нэм</h1></div><div className="shop-balance"><Coins size={19} /><div><small>ТАНЫ BALANCE</small><b>{coins.toLocaleString()} COINS</b></div></div></div><div className="shop-tabs">{['Бүгд', 'Avatar frame', 'Voice sticker', 'Virtual gift'].map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div><div className="shop-grid">{items.map(item => <article className="shop-item" key={item.title}><div className="item-art">{item.icon}<span className="sparkle">✦</span></div><small>{item.type}</small><h3>{item.title}</h3><button className="buy-button" onClick={() => buy(item.price, item.title)}><Coins size={14} /> {item.price} <span>BUY</span></button></article>)}</div></section>
}

function AuthModal({ nickname, setNickname, selectedAvatar, setSelectedAvatar, onStart }: { nickname: string; setNickname: (v: string) => void; selectedAvatar: Avatar; setSelectedAvatar: (v: Avatar) => void; onStart: () => void }) {
  return <div className="auth-overlay"><div className="auth-modal"><button className="auth-close" onClick={onStart}><X size={16} /></button><div className="auth-logo"><span className="brand-mark"><Mic2 size={20} /></span><span>VOICE<span className="gold">GAME</span></span></div><span className="eyebrow"><Sparkles size={13} /> WELCOME TO THE PARTY</span><h2>Тоглоомын дүрээ<br /><span className="gold">бүтээцгээе</span></h2><p>Найзуудтайгаа тоглохын өмнө өөрийн nickname болон avatar-аа сонгоно уу.</p><label>Хоч оруулах</label><input autoFocus value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Жишээ: Anaraa" /><label>Avatar сонгох</label><div className="auth-avatar-grid">{avatars.map((a, i) => <button key={a.name} className={selectedAvatar.name === a.name ? 'selected' : ''} onClick={() => setSelectedAvatar(a)}><AvatarBubble avatar={a} size="lg" /><span className="auth-accessory">{i % 2 === 0 ? '♛' : '🎩'}</span><small>{a.name}</small></button>)}</div><button className="auth-start" onClick={onStart}><Play size={16} fill="currentColor" /> Тоглож эхлэх</button></div></div>
}

function ProfilePopover({ avatar, nickname, onClose, onProfile }: { avatar: Avatar; nickname: string; onClose: () => void; onProfile: () => void }) { return <div className="profile-popover"><button className="close-pop" onClick={onClose}><X size={15} /></button><AvatarBubble avatar={avatar} size="lg" crown /><div><b>{nickname}</b><small>Level 38 · 68% Win rate</small></div><button className="text-button" onClick={onProfile}>Профайл харах <ChevronRight size={14} /></button></div> }
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button> }
function RecentItem({ icon, title, meta, score }: { icon: string; title: string; meta: string; score: string }) { return <div className="recent-item"><span className="recent-icon">{icon}</span><div><b>{title}</b><small>{meta}</small></div><strong>{score}</strong></div> }
function Stat({ value, label }: { value: string; label: string }) { return <div><b>{value}</b><small>{label}</small></div> }
function CopyIcon() { return <span className="copy-icon">⧉</span> }

export default App

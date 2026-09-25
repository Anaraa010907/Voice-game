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

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  const go = (next: Screen) => { setScreen(next); setShowProfile(false) }

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <button className="brand" onClick={() => go('home')}><span className="brand-mark"><Mic2 size={19} /></span><span>VOICE<span className="gold">GAME</span></span></button>
      <div className="room-pill"><span className="live-dot" /> ROOM <strong>254852</strong><button onClick={() => navigator.clipboard?.writeText('254852')}><CopyIcon /></button></div>
      <div className="top-actions">
        <button className="icon-button"><Bell size={18} /><i /></button>
        <button className="coin-pill" onClick={() => go('shop')}><Coins size={16} /> {coins.toLocaleString()} <Plus size={14} /></button>
        <button className="profile-mini" onClick={() => setShowProfile(true)}><AvatarBubble avatar={selectedAvatar} size="sm" crown /><span><b>{nickname}</b><small>Level 38</small></span><ChevronRight size={16} /></button>
      </div>
    </header>

    {showProfile && <ProfilePopover avatar={selectedAvatar} nickname={nickname} onClose={() => setShowProfile(false)} onProfile={() => go('profile')} />}

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
  return <section className="home-screen">
    <div className="welcome-row"><div><span className="eyebrow"><Sparkles size={13} /> PARTY PLAYGROUND</span><h1>Сайн уу, <span className="gold">{nickname}</span>!</h1><p>Найзуудтайгаа инээд хөөрөөр дүүрэн тоглоомын үдэш эхлүүлээрэй.</p></div><div className="streak-card"><Zap size={20} fill="currentColor" /><div><b>7 өдөр</b><small>идэвхтэй streak</small></div></div></div>
    <div className="feature-grid">
      <FeatureCard className="board-card" tag="BOARD GAME" title="Monopoly" subtitle="Сонгодог бизнесийн тулаан" icon="🎩" onClick={() => go('board')} action="Тоглох" extra={<div className="mini-board"><div className="board-center">MONO<br /><small>POLY</small></div>{['$','⌂','★','◈','✦','●'].map((x, i) => <span key={i} style={{ transform: `rotate(${i * 60}deg) translateY(-42px)` }}>{x}</span>)}</div>} />
      <FeatureCard className="voice-card" tag="VOICE GAME  •  LIVE" title="Spyfall" subtitle="Хэн нь тагнуул вэ? Ярьж олцгооё." icon="🕵️" onClick={() => go('voice')} action="Өрөөнд орох" extra={<div className="table-preview"><div className="table-ring"><span className="table-center">МУЗЕЙ<small>SECRET LOCATION</small></span>{players.slice(0, 4).map((p, i) => <div key={p.name} className={`table-player p${i}`}><AvatarBubble avatar={p} size="sm" /></div>)}</div><div className="live-badge"><span className="live-dot" /> LIVE</div><b className="player-count"><Users size={14} /> 6/8</b></div>} />
    </div>
    <div className="quick-row"><div className="section-label">СҮҮЛИЙН ТОГЛОСОН</div><button className="text-button" onClick={() => notify('Бүх түүх удахгүй')}>Бүгдийг харах <ChevronRight size={14} /></button></div>
    <div className="recent-row"><RecentItem icon="🕵️" title="Spyfall · Өчигдөр" meta="1-р байр • 6 тоглогч" score="+120 XP" /><RecentItem icon="🎩" title="Monopoly · 2 хоногийн өмнө" meta="Ялалт • $12,800" score="+250 XP" /><div className="invite-card" onClick={() => notify('Room code хууллаа')}><Gift size={21} /><b>Найзаа урих</b><small>Room code хуваалцах</small><ChevronRight size={16} /></div></div>
  </section>
}

function FeatureCard({ className, tag, title, subtitle, icon, extra, action, onClick }: { className: string; tag: string; title: string; subtitle: string; icon: string; extra: React.ReactNode; action: string; onClick: () => void }) {
  return <article className={`feature-card ${className}`}><div className="feature-copy"><span className="eyebrow">{tag}</span><h2>{icon} {title}</h2><p>{subtitle}</p><button className="gold-button" onClick={onClick}><Play size={15} fill="currentColor" /> {action}</button><span className="card-foot"><Users size={14} /> Up to 6 players <span>•</span> Classic rules</span></div>{extra}</article>
}

function VoiceRoom({ go, micOn, setMicOn, notify }: { go: (s: Screen) => void; micOn: boolean; setMicOn: (v: boolean) => void; notify: (s: string) => void }) {
  return <section className="room-screen"><div className="room-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><h1>Spyfall <span className="gold">Room</span></h1><p>Тагнуулын ширээ · Round 02 <span className="status-chip"><span className="live-dot" /> LIVE</span></p></div><button className="outline-button" onClick={() => go('home')}><X size={16} /> Гарах</button></div>
    <div className="room-layout"><div className="spy-table-panel"><div className="table-title"><span>ТАГНУУЛЫН ШИРЭЭ</span><b>Нууц байршил: <em>Музей</em></b></div><div className="spy-table"><div className="table-glow" /><div className="secret-location"><span>📍</span><b>МУЗЕЙ</b><small>SECRET LOCATION</small></div>{players.map((p, i) => <div key={p.name} className={`seat seat-${i}`}>{p.speaking && <div className="speaking"><Volume2 size={12} /> ЯРЬЖ БАЙНА</div>}<AvatarBubble avatar={p} size="lg" /><b>{p.name}</b>{i === 0 && <span className="you-tag">YOU</span>}</div>)}<button className="empty-seat seat-5" onClick={() => notify('Урилгын холбоос хууллаа')}><span><Plus size={20} /></span><b>Урих</b></button></div><div className="mic-instruction"><button className={`mic-button ${micOn ? 'mic-active' : ''}`} onClick={() => setMicOn(!micOn)}>{micOn ? <Mic size={23} /> : <Mic2 size={23} />}</button><div><b>{micOn ? 'Таны микрофон асаалттай' : 'Ярихдаа микрофоноо дарна уу'}</b><small>Бусад тоглогчид таны дууг сонсоно</small></div><span className="shortcut">SPACE</span></div></div>
      <aside className="room-sidebar"><div className="sidebar-card"><div className="side-title"><b>Тоглогчид</b><span>6 / 8</span></div>{players.map((p, i) => <div className="player-row" key={p.name}><AvatarBubble avatar={p} size="sm" /><div><b>{p.name}{i === 0 && ' (You)'}</b><small>{p.speaking ? 'Ярьж байна...' : i === 1 ? 'Тагнуул байж магадгүй' : 'Бэлэн'}</small></div><span className={`vote-dot ${p.speaking ? 'active' : ''}`} /></div>)}<button className="invite-button" onClick={() => notify('Invite link бэлэн боллоо')}><Plus size={16} /> Найз урих</button></div><div className="sidebar-card status-card"><div className="side-title"><b>Тоглоомын явц</b><MoreHorizontal size={17} /></div><div className="progress-line"><span style={{ width: '62%' }} /></div><div className="progress-meta"><span>Round 02 / 03</span><b>02:14</b></div><p><CircleHelp size={14} /> Байршилтай холбоотой асуулт асуугаарай.</p></div></aside></div>
  </section>
}

function BoardRoom({ go }: { go: (s: Screen) => void }) {
  const spaces = ['START', 'BEACH', 'TAX', 'PARK', 'JAIL', 'MALL', 'CHANCE', 'MUSEUM', 'GO TO JAIL', 'STATION', 'CLUB', 'PARKING'];
  return <section className="room-screen"><div className="room-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><h1>Monopoly <span className="gold">Classic</span></h1><p>Room 254852 · Round 05</p></div><button className="outline-button" onClick={() => go('home')}><X size={16} /> Гарах</button></div><div className="board-layout"><aside className="board-side left"><div className="sidebar-card"><div className="side-title"><b>Тоглогчид</b><span>4 / 6</span></div>{players.slice(0, 4).map((p, i) => <div className="player-row" key={p.name}><AvatarBubble avatar={p} size="sm" /><div><b>{p.name}</b><small>${[12800, 9500, 7200, 5600][i].toLocaleString()}</small></div><span className={`turn-dot ${i === 0 ? 'active' : ''}`} /></div>)}</div></aside><div className="monopoly-board"><div className="board-title">MONOPOLY<small>CLASSIC EDITION</small></div><div className="board-center"><Trophy size={21} /><b>Таны ээлж</b><small>Шоогоо шидээрэй!</small><button className="dice-button" onClick={() => {}}>⚄ <span>ШИДЭХ</span></button></div>{spaces.map((s, i) => <div key={s} className={`board-space space-${i}`}><small>{i + 1}</small><b>{s}</b></div>)}</div><aside className="board-side right"><div className="sidebar-card balance-card"><span>ТАНЫ МӨНГӨ</span><strong>$12,800</strong><div className="balance-line"><span style={{ width: '72%' }} /></div><small>Net worth $38,400</small></div><div className="sidebar-card"><div className="side-title"><b>Таны өмч</b><Package size={17} /></div><div className="property-chip pink"><span /> Beach Avenue <b>$1,200</b></div><div className="property-chip blue"><span /> Sky Tower <b>$2,400</b></div><div className="property-chip orange"><span /> Arcade Club <b>$1,800</b></div></div></aside></div></section>
}

function ProfileScreen({ go, avatar, nickname, setNickname, selectedAvatar, setSelectedAvatar }: { go: (s: Screen) => void; avatar: Avatar; nickname: string; setNickname: (v: string) => void; selectedAvatar: Avatar; setSelectedAvatar: (v: Avatar) => void }) {
  return <section className="profile-screen"><div className="room-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><h1>Миний <span className="gold">profile</span></h1><p>Өөрийн тоглоомын дүр төрхийг тохируулна уу.</p></div></div><div className="profile-layout"><div className="profile-hero"><div className="large-avatar"><AvatarBubble avatar={avatar} size="xl" crown /></div><h2>{nickname}</h2><span className="level-pill"><Crown size={14} /> LEVEL 38</span><div className="level-progress"><span /><small>1,840 / 2,500 XP</small></div><div className="stat-grid"><Stat value="450" label="Нийт тоглолт" /><Stat value="68%" label="Win rate" /><Stat value="112" label="Spy roles" /><Stat value="86" label="Location master" /></div></div><div className="profile-tools"><div className="tool-card"><div className="side-title"><b>Дүрээ тохируулах</b><Settings size={17} /></div><label>Нэр</label><input value={nickname} onChange={e => setNickname(e.target.value)} /><label>Амьтны avatar</label><div className="avatar-picker">{avatars.map(a => <button className={selectedAvatar.name === a.name ? 'chosen' : ''} onClick={() => setSelectedAvatar(a)} key={a.name}><AvatarBubble avatar={a} size="md" /></button>)}</div></div><div className="mini-tools"><div><Trophy size={18} /><b>Achievements</b><small>24 unlocked</small></div><div><Users size={18} /><b>Teammates</b><small>18 recent friends</small></div><div><Gamepad2 size={18} /><b>Game history</b><small>View all matches</small></div></div></div></div></section>
}

function ShopScreen({ go, coins, setCoins, notify }: { go: (s: Screen) => void; coins: number; setCoins: (n: number) => void; notify: (s: string) => void }) {
  const [category, setCategory] = useState('Бүгд'); const items = useMemo(() => [{ icon: '👑', title: 'Royal Crown', type: 'Avatar frame', price: 500 }, { icon: '💬', title: 'Sus!', type: 'Voice sticker', price: 200 }, { icon: '🎁', title: 'Mystery Chest', type: 'Virtual gift', price: 800 }, { icon: '💐', title: 'Bouquet', type: 'Virtual gift', price: 350 }, { icon: '🚀', title: 'Rocket Boost', type: 'Virtual gift', price: 650 }, { icon: '✨', title: 'Golden Frame', type: 'Avatar frame', price: 1200 }].filter(x => category === 'Бүгд' || x.type === category), [category]);
  const buy = (price: number, title: string) => { if (coins >= price) { setCoins(coins - price); notify(`${title} таны inventory-д нэмэгдлээ`) } else notify('Coin хүрэлцэхгүй байна') }
  return <section className="shop-screen"><div className="shop-heading"><div><button className="back-button" onClick={() => go('home')}><ArrowLeft size={17} /> Буцах</button><span className="eyebrow"><ShoppingBag size={13} /> THE MARKETPLACE</span><h1>Өөрийн <span className="gold">style</span>-аа нэм</h1></div><div className="shop-balance"><Coins size={19} /><div><small>ТАНЫ BALANCE</small><b>{coins.toLocaleString()} COINS</b></div></div></div><div className="shop-tabs">{['Бүгд', 'Avatar frame', 'Voice sticker', 'Virtual gift'].map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div><div className="shop-grid">{items.map(item => <article className="shop-item" key={item.title}><div className="item-art">{item.icon}<span className="sparkle">✦</span></div><small>{item.type}</small><h3>{item.title}</h3><button className="buy-button" onClick={() => buy(item.price, item.title)}><Coins size={14} /> {item.price} <span>BUY</span></button></article>)}</div></section>
}

function ProfilePopover({ avatar, nickname, onClose, onProfile }: { avatar: Avatar; nickname: string; onClose: () => void; onProfile: () => void }) { return <div className="profile-popover"><button className="close-pop" onClick={onClose}><X size={15} /></button><AvatarBubble avatar={avatar} size="lg" crown /><div><b>{nickname}</b><small>Level 38 · 68% Win rate</small></div><button className="text-button" onClick={onProfile}>Профайл харах <ChevronRight size={14} /></button></div> }
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button> }
function RecentItem({ icon, title, meta, score }: { icon: string; title: string; meta: string; score: string }) { return <div className="recent-item"><span className="recent-icon">{icon}</span><div><b>{title}</b><small>{meta}</small></div><strong>{score}</strong></div> }
function Stat({ value, label }: { value: string; label: string }) { return <div><b>{value}</b><small>{label}</small></div> }
function CopyIcon() { return <span className="copy-icon">⧉</span> }

export default App

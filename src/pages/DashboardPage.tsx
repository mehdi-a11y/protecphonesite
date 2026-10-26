import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiGetOrders, apiGetWhatsAppStats, apiLogin, isRoleAuthenticated, AUTH_EXPIRED_EVENT, type WhatsAppStats } from '../api'
import { IPHONE_MODELS, SAMSUNG_ULTRA_MODELS } from '../data'
import { getWilayaName } from '../delivery'
import type { Order } from '../types'
import './dashboard.css'

// ---------- Dates (heure d'Algérie) ----------

const TZ = 'Africa/Algiers'
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('fr-CA', { timeZone: TZ })
const hourOf = (d: string) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(d)))
const shiftDay = (key: string, delta: number) => {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}
const shortDay = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

type PeriodId = 'today' | '7' | '30' | '90' | 'all'
const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: 'today', label: "Aujourd'hui", days: 1 },
  { id: '7', label: '7 jours', days: 7 },
  { id: '30', label: '30 jours', days: 30 },
  { id: '90', label: '90 jours', days: 90 },
  { id: 'all', label: 'Tout', days: 0 },
]

// ---------- Formats ----------

const fmtInt = (n: number) => Math.round(n).toLocaleString('fr-FR')
const fmtDA = (n: number) => fmtInt(n) + ' DA'
const fmtCompact = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M'
  : n >= 10_000 ? Math.round(n / 1000).toLocaleString('fr-FR') + ' k'
  : fmtInt(n)
const fmtPct = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) + ' %' : '—')

// ---------- Statuts ----------

const PENDING = new Set(['none', 'tentative1', 'tentative2', 'tentative3', 'callback'])
const CONFIRMED_LIKE = new Set(['confirmed', 'livre', 'retourne'])

const PHONE_NAMES: Record<string, string> = Object.fromEntries(
  [...IPHONE_MODELS, ...SAMSUNG_ULTRA_MODELS].map((m) => [m.id, m.name]),
)

interface PeriodStats {
  recues: number
  enAttente: number
  confirmees: number
  annulees: number
  expediees: number
  livrees: number
  retournees: number
  enCours: number
  caLivre: number
  caConfirme: number
  panierMoyen: number
  tauxConfirmation: number
  tauxLivraison: number
}

function computeStats(orders: Order[]): PeriodStats {
  let enAttente = 0, confirmees = 0, annulees = 0, expediees = 0, livrees = 0, retournees = 0, enCours = 0
  let caLivre = 0, caConfirme = 0
  for (const o of orders) {
    if (PENDING.has(o.status)) enAttente++
    if (o.status === 'cancelled') annulees++
    if (CONFIRMED_LIKE.has(o.status)) {
      confirmees++
      caConfirme += o.total || 0
      if (o.yalidineTracking || o.colisExpedie) expediees++
    }
    if (o.status === 'confirmed') enCours++
    if (o.status === 'livre') { livrees++; caLivre += o.total || 0 }
    if (o.status === 'retourne') retournees++
  }
  return {
    recues: orders.length,
    enAttente, confirmees, annulees, expediees, livrees, retournees, enCours, caLivre, caConfirme,
    panierMoyen: confirmees ? caConfirme / confirmees : 0,
    tauxConfirmation: orders.length ? confirmees / orders.length : NaN,
    tauxLivraison: livrees + retournees ? livrees / (livrees + retournees) : NaN,
  }
}

// ---------- Petits composants ----------

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function Delta({ cur, prev, upIsGood = true, pct = false }: { cur: number; prev: number; upIsGood?: boolean; pct?: boolean }) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || (prev === 0 && !pct)) return <span className="delta flat">— <span className="vs">vs période préc.</span></span>
  const diff = pct ? (cur - prev) * 100 : ((cur - prev) / prev) * 100
  if (Math.abs(diff) < 0.5) return <span className="delta flat">= <span className="vs">vs période préc.</span></span>
  const up = diff > 0
  const good = up === upIsGood
  return (
    <span className={`delta ${good ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(Math.round(diff))}{pct ? ' pts' : ' %'} <span className="vs">vs période préc.</span>
    </span>
  )
}

function Tile({ label, value, delta }: { label: string; value: string; delta?: ReactNode }) {
  return (
    <div className="card">
      <p className="tile-label">{label}</p>
      <p className="tile-value">{value}</p>
      {delta}
    </div>
  )
}

function Card({ title, sub, link, className = '', children }: { title: string; sub?: string; link?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-head">
        <div>
          <h2 className="card-title">{title}</h2>
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {link}
      </div>
      {children}
    </section>
  )
}

/** Courbes jour par jour (une seule échelle), avec réticule et infobulle. */
function LineChart({ days, series }: { days: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 240, padL = 34, padR = 16, padT = 12, padB = 26
  const iw = width - padL - padR, ih = h - padT - padB
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const step = max <= 5 ? 1 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % 2 === 0)
  const x = (i: number) => padL + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw)
  const y = (v: number) => padT + ih - (v / top) * ih
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(iw / 70)))

  function onMove(e: PointerEvent<SVGRectElement>) {
    const rect = (e.target as SVGRectElement).getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = days.length <= 1 ? 0 : Math.round((px / rect.width) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${width} ${h}`} height={h} role="img" aria-label="Évolution jour par jour">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end">{fmtCompact(t)}</text>
          </g>
        ))}
        <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth={1} />
        {days.map((d, i) => (i % labelEvery === 0 || i === days.length - 1) && (
          <text key={d} x={x(i)} y={h - 6} textAnchor="middle">{shortDay(d)}</text>
        ))}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
          const area = `${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`
          return (
            <g key={s.name}>
              <polygon points={area} fill={s.color} opacity={0.1} />
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {days.length > 0 && (
                <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
              )}
            </g>
          )
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--axis)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect x={padL} y={padT} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: x(hover), top: Math.min(...series.map((s) => y(s.values[hover]))) }}>
          <div className="t-title">{new Date(days[hover] + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</div>
          {series.map((s) => (
            <div className="t-row" key={s.name}><span className="key-line" style={{ background: s.color }} />{s.name}<b>{fmtInt(s.values[hover])}</b></div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Colonnes (une série), infobulle au survol. */
function Columns({ labels, values, color, unit }: { labels: string[]; values: number[]; color: string; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 180, padL = 30, padR = 6, padT = 10, padB = 22
  const iw = width - padL - padR, ih = h - padT - padB
  const max = Math.max(1, ...values)
  const band = iw / values.length
  const bw = Math.min(24, band - 2)
  const y = (v: number) => padT + ih - (v / max) * ih
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${width} ${h}`} height={h} role="img" aria-label="Commandes par heure">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={width - padR} y1={y(max * f)} y2={y(max * f)} stroke={f === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
            <text x={padL - 6} y={y(max * f) + 4} textAnchor="end">{fmtCompact(Math.round(max * f))}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const bx = padL + i * band + (band - bw) / 2
          const bh = Math.max(v > 0 ? 2 : 0, (v / max) * ih)
          const r = Math.min(4, bh)
          const top = padT + ih - bh
          const d = bh <= 0 ? '' : `M${bx},${padT + ih} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + bw - r} Q${bx + bw},${top} ${bx + bw},${top + r} V${padT + ih} Z`
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={padL + i * band} y={padT} width={band} height={ih} fill="transparent" />
              {d && <path d={d} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {(i % (values.length > 12 && width < 600 ? 4 : 2) === 0) && <text x={bx + bw / 2} y={h - 6} textAnchor="middle">{labels[i]}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: padL + hover * band + band / 2, top: y(values[hover]) }}>
          <div className="t-title">{labels[hover]}</div>
          <div className="t-row"><span className="key-dot" style={{ background: color }} />{unit}<b>{fmtInt(values[hover])}</b></div>
        </div>
      )}
    </div>
  )
}

function HBars({ rows, color }: { rows: { label: string; value: number; note?: string }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className="muted">Aucune donnée sur la période.</p>
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label} title={`${r.label} : ${fmtInt(r.value)}${r.note ? ' — ' + r.note : ''}`}>
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `calc((100% - 70px) * ${r.value / max})`, background: color }} />
            <span className="hbar-val">{fmtInt(r.value)}{r.note && <i>{r.note}</i>}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------- Page ----------

export function DashboardPage() {
  const [auth, setAuth] = useState(() => isRoleAuthenticated('admin'))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [wa, setWa] = useState<WhatsAppStats | null>(null)
  const [waError, setWaError] = useState('')
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<PeriodId>('30')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onExpired = () => setAuth(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await apiGetOrders())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
    apiGetWhatsAppStats(dayKey(new Date()))
      .then((s) => { setWa(s); setWaError('') })
      .catch((e) => setWaError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (auth) load()
  }, [auth, load])

  const view = useMemo(() => {
    if (!orders) return null
    const today = dayKey(new Date())
    const def = PERIODS.find((p) => p.id === period)!
    const firstOrderDay = orders.reduce((m, o) => (o.createdAt && dayKey(o.createdAt) < m ? dayKey(o.createdAt) : m), today)
    const start = def.days ? shiftDay(today, -(def.days - 1)) : firstOrderDay
    const span = Math.round((Date.parse(today) - Date.parse(start)) / 86400000) + 1
    const prevStart = shiftDay(start, -span)
    const inRange = (o: Order, a: string, b: string) => { const k = dayKey(o.createdAt); return k >= a && k <= b }
    const cur = orders.filter((o) => o.createdAt && inRange(o, start, today))
    const prev = def.days ? orders.filter((o) => o.createdAt && inRange(o, prevStart, shiftDay(start, -1))) : []

    // Jour par jour (ou semaine par semaine au-delà de 120 jours)
    const weekly = span > 120
    const buckets: string[] = []
    for (let k = start; k <= today; k = shiftDay(k, weekly ? 7 : 1)) buckets.push(k)
    const bucketOf = (o: Order) => {
      const k = dayKey(o.createdAt)
      if (!weekly) return buckets.indexOf(k)
      return Math.min(buckets.length - 1, Math.floor((Date.parse(k) - Date.parse(start)) / (7 * 86400000)))
    }
    const recuesParJour = buckets.map(() => 0)
    const confirmeesParJour = buckets.map(() => 0)
    const caParJour = buckets.map(() => 0)
    const heures = Array.from({ length: 24 }, () => 0)
    const wilayas = new Map<string, { n: number; livre: number; retour: number }>()
    const produits = new Map<string, number>()
    const modeles = new Map<string, number>()
    let domicile = 0, bureau = 0
    for (const o of cur) {
      const b = bucketOf(o)
      if (b >= 0) {
        recuesParJour[b]++
        if (CONFIRMED_LIKE.has(o.status)) { confirmeesParJour[b]++; caParJour[b] += o.total || 0 }
      }
      heures[hourOf(o.createdAt)]++
      const w = o.wilaya ? getWilayaName(o.wilaya) : 'Inconnue'
      const ws = wilayas.get(w) || { n: 0, livre: 0, retour: 0 }
      ws.n++
      if (o.status === 'livre') ws.livre++
      if (o.status === 'retourne') ws.retour++
      wilayas.set(w, ws)
      if (o.deliveryType === 'yalidine') bureau++
      else if (o.deliveryType === 'domicile') domicile++
      for (const it of o.items || []) {
        const name = (it.antichoc?.name || 'Article').replace(/\s+/g, ' ').trim()
        produits.set(name, (produits.get(name) || 0) + 1)
        if (it.selectedPhoneId) {
          const m = PHONE_NAMES[it.selectedPhoneId] || it.selectedPhoneId
          modeles.set(m, (modeles.get(m) || 0) + 1)
        }
      }
    }
    const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }))

    return {
      start, today, weekly,
      s: computeStats(cur),
      p: computeStats(prev),
      hasPrev: !!def.days,
      buckets, recuesParJour, confirmeesParJour, caParJour, heures,
      wilayas: [...wilayas.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([label, v]) => ({
        label, value: v.n, note: v.livre + v.retour ? `${fmtPct(v.livre / (v.livre + v.retour))} livrées` : undefined,
      })),
      produits: top(produits, 8),
      modeles: top(modeles, 8),
      domicile, bureau,
    }
  }, [orders, period])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError('')
    try {
      await apiLogin('admin', password)
      setAuth(true)
      setPassword('')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Connexion impossible')
    }
  }

  if (!auth) {
    return (
      <div className="dash dash-login">
        <form onSubmit={handleLogin} className="card">
          <div className="dash-brand" style={{ marginBottom: 16 }}>
            <span className="dash-logo" />
            <div><h1>ProtecPhone Analytics</h1><p>Accès administrateur</p></div>
          </div>
          <label className="tile-label" htmlFor="dash-pw">Mot de passe admin</label>
          <input id="dash-pw" type="password" className="dash-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus />
          {loginError && <p style={{ color: 'var(--delta-down)', fontSize: 13, marginTop: -6 }}>{loginError}</p>}
          <button type="submit" className="dash-primary">Entrer</button>
        </form>
      </div>
    )
  }

  const s = view?.s
  const p = view?.p
  const statusRows = s ? [
    { label: 'Livrées', value: s.livrees, color: 'var(--good)', icon: '✓' },
    { label: 'Confirmées en cours', value: s.enCours, color: 'var(--series-1)', icon: '➜' },
    { label: 'En attente', value: s.enAttente, color: 'var(--warning)', icon: '…' },
    { label: 'Retournées', value: s.retournees, color: 'var(--serious)', icon: '↩' },
    { label: 'Annulées', value: s.annulees, color: 'var(--critical)', icon: '✕' },
  ] : []
  const statusTotal = statusRows.reduce((a, r) => a + r.value, 0)

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="dash-top-inner">
          <div className="dash-brand">
            <span className="dash-logo" />
            <div><h1>ProtecPhone Analytics</h1><p>Tableau de bord du business</p></div>
          </div>
          <nav className="dash-nav">
            <Link to="/admin/whatsapp">WhatsApp</Link>
            <Link to="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-filters">
          <div className="dash-seg" role="group" aria-label="Période">
            {PERIODS.map((pp) => (
              <button key={pp.id} type="button" aria-pressed={period === pp.id} onClick={() => setPeriod(pp.id)}>{pp.label}</button>
            ))}
          </div>
          <button type="button" className="dash-btn" onClick={load}>{loading ? 'Chargement…' : '↻ Actualiser'}</button>
          {view && <span className="dash-period-label">du {shortDay(view.start)} au {shortDay(view.today)}</span>}
        </div>

        {error && <p style={{ color: 'var(--delta-down)' }}>{error}</p>}
        {!view && !error && <div className="dash-grid"><div className="skeleton span-8" /><div className="skeleton span-4" /><div className="skeleton span-12" style={{ height: 260 }} /></div>}

        {view && s && p && (
          <div className="dash-grid">
            {/* Héros : chiffre d'affaires livré */}
            <section className="card hero span-8">
              <p className="hero-label">Chiffre d'affaires livré</p>
              <p className="hero-value">{fmtInt(s.caLivre)}<small>DA</small></p>
              {view.hasPrev && <Delta cur={s.caLivre} prev={p.caLivre} />}
              <div className="hero-row">
                <span>Confirmé (en cours + livré + retour) : <b>{fmtDA(s.caConfirme)}</b></span>
                <span>Panier moyen : <b>{fmtDA(s.panierMoyen)}</b></span>
                <span>Colis expédiés : <b>{fmtInt(s.expediees)}</b></span>
              </div>
            </section>

            {/* Répartition des statuts */}
            <Card title="Où en sont les commandes" sub={`${fmtInt(statusTotal)} commandes reçues sur la période`} className="span-4">
              <div className="stack" aria-hidden>
                {statusRows.filter((r) => r.value > 0).map((r) => (
                  <div key={r.label} style={{ flex: r.value, background: r.color }} title={`${r.label} : ${r.value}`} />
                ))}
              </div>
              <div className="status-list">
                {statusRows.map((r) => (
                  <div key={r.label}><span className="key-dot" style={{ background: r.color }} />{r.icon} {r.label}<b>{fmtInt(r.value)}</b></div>
                ))}
              </div>
            </Card>

            {/* Tuiles */}
            <div className="tiles span-12">
              <Tile label="Commandes reçues" value={fmtInt(s.recues)} delta={view.hasPrev ? <Delta cur={s.recues} prev={p.recues} /> : undefined} />
              <Tile label="Taux de confirmation" value={fmtPct(s.tauxConfirmation)} delta={view.hasPrev ? <Delta cur={s.tauxConfirmation} prev={p.tauxConfirmation} pct /> : undefined} />
              <Tile label="Taux de livraison" value={fmtPct(s.tauxLivraison)} delta={view.hasPrev ? <Delta cur={s.tauxLivraison} prev={p.tauxLivraison} pct /> : undefined} />
              <Tile label="Retours" value={fmtInt(s.retournees)} delta={view.hasPrev ? <Delta cur={s.retournees} prev={p.retournees} upIsGood={false} /> : undefined} />
            </div>

            {/* Évolution */}
            <Card
              title={view.weekly ? 'Commandes par semaine' : 'Commandes par jour'}
              sub="Reçues sur le site et confirmées (confirmées, livrées ou retournées)"
              className="span-12"
              link={<div className="legend"><span><i className="key-line" style={{ background: 'var(--series-1)' }} />Reçues</span><span><i className="key-line" style={{ background: 'var(--series-2)' }} />Confirmées</span></div>}
            >
              <LineChart days={view.buckets} series={[
                { name: 'Reçues', color: 'var(--series-1)', values: view.recuesParJour },
                { name: 'Confirmées', color: 'var(--series-2)', values: view.confirmeesParJour },
              ]} />
              <details>
                <summary>Voir en tableau</summary>
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>{view.weekly ? 'Semaine du' : 'Jour'}</th><th>Reçues</th><th>Confirmées</th><th>CA confirmé</th></tr></thead>
                    <tbody>
                      {view.buckets.map((d, i) => (
                        <tr key={d}><td>{shortDay(d)}</td><td>{view.recuesParJour[i]}</td><td>{view.confirmeesParJour[i]}</td><td>{fmtDA(view.caParJour[i])}</td></tr>
                      )).reverse()}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>

            {/* Entonnoir */}
            <Card title="Entonnoir" sub="De la commande reçue à la livraison" className="span-6">
              <HBars color="var(--series-1)" rows={[
                { label: 'Reçues', value: s.recues },
                { label: 'Confirmées', value: s.confirmees, note: fmtPct(s.recues ? s.confirmees / s.recues : NaN) },
                { label: 'Expédiées', value: s.expediees, note: fmtPct(s.confirmees ? s.expediees / s.confirmees : NaN) },
                { label: 'Livrées', value: s.livrees, note: fmtPct(s.expediees ? s.livrees / s.expediees : NaN) },
              ]} />
            </Card>

            {/* Heures */}
            <Card title="Heure des commandes" sub="Pour caler vos publicités sur les heures qui commandent" className="span-6">
              <Columns labels={Array.from({ length: 24 }, (_, i) => `${i}h`)} values={view.heures} color="var(--series-1)" unit="Commandes" />
            </Card>

            {/* Wilayas */}
            <Card title="Top wilayas" sub="Commandes reçues · taux de livraison quand connu" className="span-6">
              <HBars color="var(--series-1)" rows={view.wilayas} />
            </Card>

            {/* Livraison */}
            <Card title="Mode de livraison" sub="Commandes reçues sur la période" className="span-6">
              <HBars color="var(--series-1)" rows={[
                { label: 'À domicile', value: view.domicile, note: fmtPct(view.domicile + view.bureau ? view.domicile / (view.domicile + view.bureau) : NaN) },
                { label: 'Bureau Yalidine', value: view.bureau, note: fmtPct(view.domicile + view.bureau ? view.bureau / (view.domicile + view.bureau) : NaN) },
              ]} />
              <div style={{ height: 18 }} />
              <h3 className="card-title" style={{ fontSize: 13, marginBottom: 10 }}>Modèles de téléphone les plus demandés</h3>
              <HBars color="var(--series-1)" rows={view.modeles} />
            </Card>

            {/* Produits */}
            <Card title="Produits les plus commandés" sub="Nombre d'articles dans les commandes reçues" className="span-12">
              <HBars color="var(--series-1)" rows={view.produits} />
            </Card>

            {/* WhatsApp */}
            <Card title="WhatsApp aujourd'hui" sub="Confirmations et suivi automatiques" className="span-12" link={<Link className="card-link" to="/admin/whatsapp">Détails →</Link>}>
              {wa ? (
                <>
                  <p style={{ margin: '0 0 12px' }}>
                    <span className="pill"><i style={{ background: wa.numero.connecte ? 'var(--good)' : 'var(--critical)' }} />{wa.numero.connecte ? '✓ Connecté' : '✕ Déconnecté'} · {wa.numero.numero || 'numéro inconnu'}</span>
                    {wa.numero.restriction && <span className="pill" style={{ marginLeft: 8 }}><i style={{ background: 'var(--critical)' }} />⚠ Restriction WhatsApp</span>}
                  </p>
                  <div className="wa-grid">
                    <div className="wa-cell"><p>Confirmations envoyées</p><strong>{wa.confirmations.envoyees}</strong></div>
                    <div className="wa-cell"><p>Confirmées par WhatsApp</p><strong>{wa.confirmations.confirmees}</strong></div>
                    <div className="wa-cell"><p>À rappeler</p><strong>{wa.confirmations.a_rappeler}</strong></div>
                    <div className="wa-cell"><p>Messages suivi colis</p><strong>{wa.suivi.envoyes}</strong></div>
                  </div>
                </>
              ) : (
                <p className="muted">{waError ? 'Statistiques WhatsApp indisponibles : ' + waError : 'Chargement…'}</p>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

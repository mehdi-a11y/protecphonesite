import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiGetWhatsAppStats, apiLogin, isRoleAuthenticated, AUTH_EXPIRED_EVENT, type WhatsAppStats } from '../api'

const STATUT_COLIS: Record<string, string> = {
  arrive_wilaya: 'Arrivé dans la wilaya',
  au_bureau: 'Au bureau Yalidine',
  en_livraison: 'En livraison',
  echec: 'Échec de livraison',
  echec_repondu: 'Échec (client a répondu)',
  livre: 'Livré',
}
const CHOIX_COLIS: Record<string, string> = { OUI: '✅ Relivrer', REPORTER: '📅 Reporter', ANNULER: '❌ Annuler' }

/** Date du jour en Algérie au format AAAA-MM-JJ. */
function aujourdhui(): string {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Algiers' })
}

function decalerJour(jour: string, delta: number): string {
  const d = new Date(jour + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function jourLisible(jour: string): string {
  return new Date(jour + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Chiffre({ label, valeur, ton = 'neutre' }: { label: string; valeur: number; ton?: 'neutre' | 'bon' | 'alerte' }) {
  const couleur = ton === 'bon' ? 'text-emerald-400' : ton === 'alerte' && valeur > 0 ? 'text-amber-400' : 'text-white'
  return (
    <div className="rounded-lg bg-brand-dark border border-white/10 p-3">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className={`text-2xl font-bold ${couleur}`}>{valeur}</p>
    </div>
  )
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-brand-card border border-white/10 p-4">
      <h2 className="text-white font-semibold mb-3">{titre}</h2>
      {children}
    </section>
  )
}

function Tableau({ colonnes, lignes }: { colonnes: string[]; lignes: (string | ReactNode)[][] }) {
  if (lignes.length === 0) return <p className="text-sm text-brand-muted">Aucun.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th key={c} className="text-left text-brand-muted font-normal border-b border-white/10 py-1.5 pr-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-b border-white/5">
              {l.map((cell, j) => (
                <td key={j} className="py-1.5 pr-3 text-white whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LienTel({ tel }: { tel: string }) {
  return tel ? <a href={`tel:${tel}`} className="text-brand-accent hover:underline">{tel}</a> : <span className="text-brand-muted">—</span>
}

export function WhatsAppStatsPage() {
  const [auth, setAuth] = useState(() => isRoleAuthenticated('admin'))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [jour, setJour] = useState(aujourdhui)
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const onExpired = () => setAuth(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      setStats(await apiGetWhatsAppStats(jour))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setChargement(false)
    }
  }, [jour])

  useEffect(() => {
    if (auth) charger()
  }, [auth, charger])

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
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl bg-brand-card border border-white/10 p-6">
          <h1 className="text-xl font-bold text-white mb-4">Statistiques WhatsApp</h1>
          <label className="block text-sm text-brand-muted mb-2">Mot de passe admin</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-brand-dark border border-white/10 text-white mb-4 focus:border-brand-accent focus:outline-none"
            placeholder="••••••••"
            autoFocus
          />
          {loginError && <p className="text-red-400 text-sm mb-4">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-brand-accent text-brand-dark font-semibold rounded-lg hover:bg-brand-accentDim">
            Connexion
          </button>
        </form>
      </div>
    )
  }

  const estAujourdhui = jour === aujourdhui()
  const c = stats?.confirmations
  const s = stats?.suivi
  const n = stats?.numero

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/admin" className="text-brand-muted hover:text-white text-sm">← Admin</Link>
        <span className="text-brand-accent text-sm font-medium">Statistiques WhatsApp</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setJour(decalerJour(jour, -1))} className="px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm hover:border-brand-accent">← Veille</button>
          <input
            type="date"
            value={jour}
            max={aujourdhui()}
            onChange={(e) => e.target.value && setJour(e.target.value)}
            className="px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm"
          />
          <button type="button" disabled={estAujourdhui} onClick={() => setJour(decalerJour(jour, 1))} className="px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm hover:border-brand-accent disabled:opacity-40">Lendemain →</button>
          <button type="button" onClick={charger} className="px-3 py-2 rounded-lg bg-brand-accent text-brand-dark text-sm font-semibold hover:bg-brand-accentDim">
            {chargement ? 'Chargement…' : 'Actualiser'}
          </button>
          <span className="text-brand-muted text-sm capitalize">{jourLisible(jour)}</span>
        </div>

        {erreur && <p className="text-red-400 text-sm">{erreur}</p>}

        {stats && c && s && n && (
          <>
            <Section titre="📱 Numéro WhatsApp">
              <p className="text-sm text-white">
                {n.numero || 'Numéro inconnu'} :{' '}
                {n.connecte ? <span className="text-emerald-400">connecté</span> : <span className="text-red-400">déconnecté ({n.statut})</span>}
                {!n.reponses_branchees && <span className="text-amber-400"> — les réponses des clients ne sont pas branchées</span>}
                {n.restriction && <span className="text-red-400"> — restriction WhatsApp en cours</span>}
              </p>
            </Section>

            <Section titre="🛒 Confirmations de commande">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <Chiffre label="Messages envoyés" valeur={c.envoyees} />
                <Chiffre label="Confirmées" valeur={c.confirmees} ton="bon" />
                <Chiffre label="À rappeler" valeur={c.a_rappeler} ton="alerte" />
                <Chiffre label="Sans réponse" valeur={c.sans_reponse} />
                <Chiffre label="Non partis" valeur={c.non_parties} ton="alerte" />
              </div>
              <h3 className="text-sm text-brand-muted mb-1">Clients à rappeler (ont répondu 2)</h3>
              <Tableau colonnes={['Commande', 'Client', 'Téléphone']} lignes={c.liste_a_rappeler.map((r) => [r.commande, r.client, <LienTel tel={r.telephone} />])} />
              {c.liste_non_parties.length > 0 && (
                <>
                  <h3 className="text-sm text-brand-muted mt-4 mb-1">Message non parti : appeler ces clients</h3>
                  <Tableau colonnes={['Commande', 'Client', 'Téléphone']} lignes={c.liste_non_parties.map((r) => [r.commande, r.client, <LienTel tel={r.telephone} />])} />
                </>
              )}
            </Section>

            <Section titre="📦 Suivi des colis Yalidine">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Chiffre label="Messages envoyés" valeur={s.envoyes} />
                {Object.entries(s.par_statut).map(([k, v]) => (
                  <Chiffre key={k} label={STATUT_COLIS[k] || k} valeur={v} />
                ))}
                <Chiffre label="Non partis" valeur={s.non_partis} ton="alerte" />
              </div>
              <h3 className="text-sm text-brand-muted mb-1">Réponses aux échecs de livraison</h3>
              <Tableau
                colonnes={['Colis', 'Téléphone', 'Choix du client']}
                lignes={stats.reponses_colis.map((r) => [r.colis, <LienTel tel={r.telephone} />, CHOIX_COLIS[r.choix] || r.choix])}
              />
              {s.liste_non_partis.length > 0 && (
                <>
                  <h3 className="text-sm text-brand-muted mt-4 mb-1">Colis sans message WhatsApp (pas de WhatsApp ou numéro introuvable)</h3>
                  <Tableau
                    colonnes={['Colis', 'Client', 'Statut', 'Téléphone']}
                    lignes={s.liste_non_partis.map((r) => [r.colis, r.client, r.statut, <LienTel tel={r.telephone} />])}
                  />
                </>
              )}
            </Section>

            <Section titre="📈 7 derniers jours">
              <Tableau
                colonnes={['Jour', 'Confirmations envoyées', 'Confirmées', 'À rappeler', 'Suivi colis', 'Réponses colis']}
                lignes={stats.historique.map((h) => [
                  <button type="button" onClick={() => setJour(h.jour)} className={`hover:underline ${h.jour === jour ? 'text-brand-accent' : ''}`}>
                    {new Date(h.jour + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </button>,
                  String(h.confirmations_envoyees),
                  String(h.confirmees),
                  String(h.a_rappeler),
                  String(h.suivi_envoyes),
                  String(h.reponses_colis),
                ])}
              />
            </Section>
          </>
        )}
      </main>
    </div>
  )
}

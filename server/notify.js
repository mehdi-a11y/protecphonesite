/**
 * Notifications pour l'équipe via ntfy (app gratuite Android / iPhone : https://ntfy.sh).
 * Variables .env :
 *   NTFY_TOPIC  : nom du canal (long et secret, c'est lui qui protège les notifications). Vide = désactivé.
 *   NTFY_SERVER : serveur ntfy (défaut https://ntfy.sh).
 *   NTFY_TOKEN  : jeton d'accès, seulement si le serveur ntfy est protégé.
 *   SITE_URL    : adresse du site pour le lien des notifications (défaut https://www.protecphone.shop).
 */

// L'app ntfy affiche déjà l'emoji de l'étiquette (tags) devant le titre : pas d'emoji dans le titre
const EVENTS = {
  new: { title: 'Nouvelle commande', tags: ['shopping_cart'], priority: 4 },
  confirmed: { title: 'Commande confirmée', tags: ['white_check_mark'], priority: 3 },
  callback: { title: 'Client à rappeler', tags: ['telephone_receiver'], priority: 4 },
  cancelled: { title: 'Commande annulée', tags: ['x'], priority: 3 },
  expedie: { title: 'Colis expédié', tags: ['package'], priority: 2 },
  livre: { title: 'Commande livrée', tags: ['tada'], priority: 3 },
  retourne: { title: 'Colis retourné', tags: ['leftwards_arrow_with_hook'], priority: 4 },
}

/** Envoie une notification libre (ex. bilan quotidien n8n). Ne lève jamais d'erreur. */
export async function notifyTeamMessage({ title, message, tags = ['bar_chart'], priority = 3 }) {
  const topic = (process.env.NTFY_TOPIC || '').trim()
  if (!topic || !title) return false
  const server = (process.env.NTFY_SERVER || 'https://ntfy.sh').trim().replace(/\/+$/, '')
  const token = (process.env.NTFY_TOKEN || '').trim()
  try {
    const res = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ topic, title, message: message || '', tags, priority }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.error('[ntfy] message', title, 'réponse', res.status)
    return res.ok
  } catch (e) {
    console.error('[ntfy] message', title, e.message)
    return false
  }
}

/**
 * Envoie une notification d'événement de commande. Ne lève jamais d'erreur : une notification
 * ratée ne doit pas bloquer la commande.
 * @param {keyof EVENTS} event
 * @param {{ id: string, customerName?: string, total?: number, yalidineTracking?: string }} order
 * @param {{ wilayaName?: string, source?: string }} [details]
 */
export async function notifyTeam(event, order, details = {}) {
  const topic = (process.env.NTFY_TOPIC || '').trim()
  const def = EVENTS[event]
  if (!topic || !def || !order) return
  const server = (process.env.NTFY_SERVER || 'https://ntfy.sh').trim().replace(/\/+$/, '')
  const token = (process.env.NTFY_TOKEN || '').trim()
  const siteUrl = (process.env.SITE_URL || 'https://www.protecphone.shop').trim().replace(/\/+$/, '')

  // Pas de téléphone ni d'adresse : la notification reste lisible sur un écran verrouillé
  const firstName = String(order.customerName || '').trim().split(/\s+/)[0] || 'Client'
  const total = order.total != null ? `${Number(order.total).toLocaleString('fr-FR')} DA` : ''
  // Prénom isolé (U+2068…U+2069) : un prénom en arabe ne doit pas inverser l'ordre de la ligne
  const lines = [
    [`⁨${firstName}⁩`, details.wilayaName, total].filter(Boolean).join(' — '),
    order.yalidineTracking ? `${order.id} · ${order.yalidineTracking}` : order.id,
  ]
  if (details.source) lines.push(`Par : ${details.source}`)

  try {
    const res = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        topic,
        title: def.title,
        message: lines.join('\n'),
        tags: def.tags,
        priority: def.priority,
        click: `${siteUrl}/admin`,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.error('[ntfy]', event, order.id, 'réponse', res.status)
  } catch (e) {
    console.error('[ntfy]', event, order.id, e.message)
  }
}

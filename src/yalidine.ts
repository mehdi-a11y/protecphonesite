/**
 * Intégration API Yalidine (livraison Algérie).
 * Doc / identifiants : https://www.yalidine.com/ (section Développement).
 * En production, préférez un backend pour ne pas exposer API ID/Token.
 */

import type { Order } from './types'
import { getOrders, setOrderStatus } from './types'
import { getWilayaName } from './delivery'

const YALIDINE_CREDENTIALS_KEY = 'protecphone_yalidine_credentials'

export interface YalidineCredentials {
  apiId: string
  apiToken: string
}

export function getYalidineCredentials(): YalidineCredentials | null {
  try {
    const raw = localStorage.getItem(YALIDINE_CREDENTIALS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveYalidineCredentials(creds: YalidineCredentials): void {
  localStorage.setItem(YALIDINE_CREDENTIALS_KEY, JSON.stringify(creds))
}

/** Payload d'un colis pour l'API Yalidine (create parcels) */
interface YalidineParcelPayload {
  order_id: string
  firstname: string
  familyname: string
  contact_phone: string
  address: string
  to_commune_name: string
  to_wilaya_name: string
  product_list: string
  price: number
  freeshipping: boolean
  is_stopdesk: boolean
  has_exchange: number
  product_to_collect: string | null
}

function orderToParcelPayload(order: Order): YalidineParcelPayload {
  const nameParts = (order.customerName || 'Client').trim().split(/\s+/)
  const firstname = nameParts[0] ?? 'Client'
  const familyname = nameParts.slice(1).join(' ') || firstname
  const wilayaName = order.wilaya ? getWilayaName(order.wilaya) : 'Alger'
  // Yalidine exige un nom de commune valide (pas "À préciser"). On utilise le chef-lieu = nom de la wilaya.
  const productList = order.items
    .map((i) => `${i.antichoc.name}${i.isUpsell ? ' (offre)' : ''}`)
    .join(', ')

  return {
    order_id: order.id,
    firstname,
    familyname,
    contact_phone: order.phone || '',
    address: order.address || 'À préciser',
    to_commune_name: wilayaName,
    to_wilaya_name: wilayaName,
    product_list: productList || 'Commande Protecphone',
    price: order.total ?? 0,
    freeshipping: false,
    is_stopdesk: order.deliveryType === 'yalidine',
    has_exchange: 0,
    product_to_collect: null,
  }
}

export interface YalidineCreateResult {
  success: boolean
  order_id?: string
  tracking?: string
  import_id?: number
  message?: string
}

/**
 * Crée un colis sur Yalidine pour une commande via le proxy backend.
 * Les identifiants API sont gérés côté serveur (.env : YALIDINE_API_ID, YALIDINE_API_TOKEN).
 * Lancez le serveur proxy avec : npm run server
 */
export async function createParcelOnYalidine(
  order: Order,
): Promise<{ success: true; tracking: string } | { success: false; error: string }> {
  const payload = [orderToParcelPayload(order)]

  try {
    const res = await fetch('/api/yalidine/parcels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg =
        data?.error ?? data?.message ?? data?.detail ?? (typeof data === 'string' ? data : `Erreur ${res.status}`)
      return { success: false, error: String(msg) }
    }

    // Réponse possible : { "order_id": { "success": true, "tracking": "YAL-..." } }
    const firstKey = order.id
    const result = data?.[firstKey] ?? data?.[0] ?? data
    const tracking =
      result?.tracking ?? result?.tracking_number ?? (Array.isArray(data) ? data[0]?.tracking : null)

    if (tracking) {
      return { success: true, tracking: String(tracking).toUpperCase() }
    }

    return {
      success: false,
      error: result?.message ?? 'Réponse Yalidine sans numéro de suivi',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        success: false,
        error:
          'Impossible de joindre le proxy. Lancez le serveur avec : npm run server (et définissez YALIDINE_API_ID / YALIDINE_API_TOKEN dans un fichier .env).',
      }
    }
    return { success: false, error: message }
  }
}

/** Récupère le statut des colis depuis le proxy (appel API Yalidine). */
export async function getParcelStatuses(
  trackings: string[],
): Promise<{ success: true; statuses: Record<string, string> } | { success: false; error: string }> {
  if (trackings.length === 0) return { success: true, statuses: {} }
  try {
    const q = trackings.map((t) => encodeURIComponent(t.trim())).join(',')
    const res = await fetch(`/api/yalidine/parcels/status?tracking=${q}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error ?? data?.message ?? `Erreur ${res.status}`
      return { success: false, error: String(msg) }
    }
    const statuses = data.statuses ?? {}
    return { success: true, statuses }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/** Map statut Yalidine → statut plateforme */
function yalidineStatusToOrderStatus(yalidineStatus: string): Order['status'] | null {
  const s = yalidineStatus.toLowerCase().trim()
  if (/livr[eé]/.test(s) || s === 'delivered') return 'livre'
  if (/retour/.test(s) || s === 'returned' || s === 'retourne' || s === 'retournee') return 'retourne'
  if (/annul/.test(s) || s === 'cancelled' || s === 'canceled' || s === 'refuse') return 'cancelled'
  return null
}

/**
 * Synchronise les commandes avec les statuts Yalidine (livré, retourné, annulé).
 * Met à jour le localStorage pour chaque commande ayant un suivi Yalidine dont le statut a changé.
 * @returns nombre de commandes mises à jour, ou message d'erreur
 */
export async function syncOrdersWithYalidine(): Promise<
  { success: true; updated: number } | { success: false; error: string }
> {
  const orders = getOrders()
  const withTracking = orders.filter((o) => o.yalidineTracking?.trim())
  if (withTracking.length === 0) return { success: true, updated: 0 }

  const result = await getParcelStatuses(
    withTracking.map((o) => o.yalidineTracking!).filter(Boolean),
  )
  if (!result.success) return result

  const statuses = result.statuses
  let updated = 0
  for (const order of withTracking) {
    const tracking = order.yalidineTracking!.trim().toUpperCase()
    const yStatus = statuses[tracking] ?? statuses[order.yalidineTracking!]
    if (!yStatus) continue
    const newStatus = yalidineStatusToOrderStatus(yStatus)
    if (!newStatus || newStatus === order.status) continue
    setOrderStatus(order.id, newStatus)
    updated++
  }
  return { success: true, updated }
}

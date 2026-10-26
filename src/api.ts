/**
 * Client API pour la base de données partagée (remplace localStorage).
 * En production, définir VITE_API_URL (ex: https://api.monsite.com) si le backend est sur un autre domaine.
 */

import type { Order } from './types'
import type { Antichoc } from './data'
import type { DeliveryPrices } from './delivery'

const BASE = (import.meta.env.VITE_API_URL as string) || ''

// --- Authentification (jeton signé par le serveur, voir server/auth.js) ---

export type AuthRole = 'admin' | 'confirmateur'

const TOKEN_KEYS: Record<AuthRole, string> = {
  admin: 'protecphone_admin_token',
  confirmateur: 'protecphone_confirmateur_token',
}

/** Émis quand le serveur refuse le jeton (expiré / invalide) : les pages repassent à l'écran de connexion. */
export const AUTH_EXPIRED_EVENT = 'protecphone:auth-expired'

function tokenExpiry(token: string): number {
  try {
    const payload = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    return Number(JSON.parse(atob(payload)).exp) || 0
  } catch {
    return 0
  }
}

function getAuthToken(role: AuthRole): string | null {
  const token = sessionStorage.getItem(TOKEN_KEYS[role])
  if (!token) return null
  if (tokenExpiry(token) < Date.now()) {
    sessionStorage.removeItem(TOKEN_KEYS[role])
    return null
  }
  return token
}

export function isRoleAuthenticated(role: AuthRole): boolean {
  return getAuthToken(role) !== null
}

export function logoutRole(role: AuthRole): void {
  sessionStorage.removeItem(TOKEN_KEYS[role])
}

/** Connexion : le mot de passe est vérifié côté serveur, qui renvoie un jeton. */
export async function apiLogin(role: AuthRole, password: string): Promise<void> {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.token) throw new Error(data.error || `Erreur ${res.status}`)
  sessionStorage.setItem(TOKEN_KEYS[role], data.token)
}

/** En-tête Authorization (jeton admin en priorité, sinon confirmateur). */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken('admin') || getAuthToken('confirmateur')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** fetch avec le jeton ; sur 401, déconnecte et prévient les pages. */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  })
  if (res.status === 401 && url.indexOf('/api/auth/login') === -1) {
    logoutRole('admin')
    logoutRole('confirmateur')
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
  return res
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(BASE + url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || `Erreur ${res.status}`)
  }
  return res.json()
}

/** Statistiques WhatsApp d'une journée (calculées par n8n). */
export interface WhatsAppStats {
  jour: string
  numero: { numero: string; connecte: boolean; statut: string; reponses_branchees: boolean; restriction: boolean }
  confirmations: {
    envoyees: number
    non_parties: number
    confirmees: number
    a_rappeler: number
    sans_reponse: number
    liste_a_rappeler: { commande: string; client: string; telephone: string }[]
    liste_non_parties: { commande: string; client: string; telephone: string }[]
  }
  suivi: {
    envoyes: number
    non_partis: number
    par_statut: Record<string, number>
    liste_non_partis: { colis: string; client: string; statut: string; telephone: string }[]
  }
  reponses_colis: { colis: string; telephone: string; choix: string; recu_le: string }[]
  historique: { jour: string; confirmations_envoyees: number; confirmees: number; a_rappeler: number; suivi_envoyes: number; reponses_colis: number }[]
}

export async function apiGetWhatsAppStats(jour: string): Promise<WhatsAppStats> {
  return fetchJson<WhatsAppStats>('/api/admin/whatsapp-stats?jour=' + encodeURIComponent(jour))
}

export async function apiGetOrders(): Promise<Order[]> {
  const list = await fetchJson<Order[]>('/api/orders')
  return (list || []).map((o) => ({
    ...o,
    status: o.status === 'pending' ? 'none' : o.status,
  })) as Order[]
}

export async function apiSaveOrder(order: Order): Promise<void> {
  await fetchJson('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export async function apiUpdateOrder(orderId: string, partial: Partial<Order>): Promise<Order> {
  return fetchJson<Order>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify(partial),
  })
}

export async function apiSetOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function apiUpdateOrderYalidine(
  orderId: string,
  data: { tracking: string; sentAt: string }
): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/yalidine`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiDeleteOrder(orderId: string): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
  })
}

export async function apiSetOrderAchatDone(orderId: string, done: boolean): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/achat-done`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  })
}

export async function apiSetOrderDepotDone(orderId: string, done: boolean): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/depot-done`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  })
}

/** Demande de changement de commande : passe en non confirmée et notifie les confirmateurs (avec raison). */
export async function apiRequestOrderChange(orderId: string, reason: string): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/request-change`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.trim() || undefined }),
  })
}

export interface YalidineStopdesk {
  id: number | string
  name: string
  address?: string
  wilaya?: string
  /** Commune du bureau (pour to_commune_name à l'envoi Yalidine) */
  commune?: string
}

/** onlyFromApi: true = uniquement les bureaux renvoyés par l'API Yalidine (pas la liste statique), pour éviter des stopdesk_id invalides à l'envoi */
export async function apiGetYalidineStopdesks(wilaya?: string, options?: { onlyFromApi?: boolean }): Promise<YalidineStopdesk[]> {
  const params = new URLSearchParams()
  if (wilaya) params.set('wilaya', wilaya)
  if (options?.onlyFromApi) params.set('only_from_api', '1')
  const url = '/api/yalidine/stopdesks' + (params.toString() ? '?' + params.toString() : '')
  const res = await fetch(BASE + url)
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return data.stopdesks ?? []
}

/** Liste des communes (baladiyas) pour une wilaya — source officielle Algérie, utilisée par Yalidine */
export async function apiGetCommunes(wilaya: string): Promise<string[]> {
  if (!wilaya?.trim()) return []
  const res = await fetch(BASE + `/api/communes?wilaya=${encodeURIComponent(wilaya.trim())}`)
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data) ? data : []
}

export async function apiGetProducts(): Promise<Antichoc[]> {
  const list = await fetchJson<Antichoc[]>('/api/products')
  return list || []
}

/** Un seul produit (léger, images servies séparément). null si introuvable. */
export async function apiGetProduct(id: string): Promise<Antichoc | null> {
  try {
    return await fetchJson<Antichoc>(`/api/products/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function apiSaveProducts(products: Antichoc[]): Promise<void> {
  await fetchJson('/api/products', {
    method: 'PUT',
    body: JSON.stringify(products),
  })
}

/** Ajoute ou met à jour un seul produit (évite Payload Too Large quand le catalogue est lourd). */
export async function apiAddProduct(product: Antichoc): Promise<Antichoc[]> {
  return fetchJson<Antichoc[]>('/api/products/add', {
    method: 'POST',
    body: JSON.stringify(product),
  })
}

/** Supprime un produit de la base (et les landing pages / références collections liées). */
export async function apiDeleteProduct(id: string): Promise<void> {
  const res = await authFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Erreur lors de la suppression')
  }
}

export async function apiGetDeliveryPrices(): Promise<DeliveryPrices> {
  const prices = await fetchJson<DeliveryPrices>('/api/delivery-prices')
  return prices || {}
}

export async function apiSaveDeliveryPrices(prices: DeliveryPrices): Promise<void> {
  await fetchJson('/api/delivery-prices', {
    method: 'PUT',
    body: JSON.stringify(prices),
  })
}

export interface LandingPage {
  slug: string
  antichocId: string
  title: string | null
}

export async function apiGetLandingPages(): Promise<LandingPage[]> {
  const list = await fetchJson<LandingPage[]>('/api/landing-pages')
  return list || []
}

export async function apiGetLandingBySlug(slug: string): Promise<LandingPage | null> {
  const res = await fetch(BASE + '/api/landing-pages/' + encodeURIComponent(slug))
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Landing introuvable')
  return res.json()
}

export async function apiCreateLanding(landing: { slug: string; antichocId: string; title?: string | null }): Promise<LandingPage> {
  return fetchJson<LandingPage>('/api/landing-pages', {
    method: 'POST',
    body: JSON.stringify(landing),
  })
}

export async function apiUpdateLanding(
  slug: string,
  data: { slug?: string; antichocId?: string; title?: string | null },
): Promise<LandingPage> {
  return fetchJson<LandingPage>('/api/landing-pages/' + encodeURIComponent(slug), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function apiDeleteLanding(slug: string): Promise<void> {
  const res = await authFetch('/api/landing-pages/' + encodeURIComponent(slug), { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Erreur')
  }
}

export interface Collection {
  slug: string
  name: string
  landingSlugs: string[]
}

export async function apiGetCollections(): Promise<Collection[]> {
  const list = await fetchJson<Collection[]>('/api/collections')
  return list || []
}

export async function apiGetCollectionBySlug(slug: string): Promise<Collection | null> {
  const res = await fetch(BASE + '/api/collections/' + encodeURIComponent(slug))
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Collection introuvable')
  return res.json()
}

export async function apiCreateCollection(collection: { slug: string; name: string; landingSlugs?: string[] }): Promise<Collection> {
  return fetchJson<Collection>('/api/collections', {
    method: 'POST',
    body: JSON.stringify({
      slug: collection.slug,
      name: collection.name,
      landingSlugs: collection.landingSlugs ?? [],
    }),
  })
}

export async function apiUpdateCollection(slug: string, data: { name?: string; landingSlugs?: string[] }): Promise<Collection> {
  return fetchJson<Collection>('/api/collections/' + encodeURIComponent(slug), {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiDeleteCollection(slug: string): Promise<void> {
  const res = await authFetch('/api/collections/' + encodeURIComponent(slug), { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Erreur')
  }
}

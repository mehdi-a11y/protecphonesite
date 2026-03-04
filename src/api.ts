/**
 * Client API pour la base de données partagée (remplace localStorage).
 * En production, définir VITE_API_URL (ex: https://api.monsite.com) si le backend est sur un autre domaine.
 */

import type { Order } from './types'
import type { Antichoc } from './data'
import type { DeliveryPrices } from './delivery'

const BASE = (import.meta.env.VITE_API_URL as string) || ''

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || `Erreur ${res.status}`)
  }
  return res.json()
}

export async function apiGetOrders(): Promise<Order[]> {
  const list = await fetchJson<Order[]>('/api/orders')
  return (list || []).map((o) => ({
    ...o,
    status: o.status === 'pending' ? 'tentative1' : o.status,
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

/** Demande de changement de commande (article introuvable chez le fournisseur). Notifie les confirmateurs par email. */
export async function apiRequestOrderChange(orderId: string): Promise<void> {
  await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/request-change`, {
    method: 'POST',
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
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
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

export async function apiDeleteLanding(slug: string): Promise<void> {
  const res = await fetch('/api/landing-pages/' + encodeURIComponent(slug), { method: 'DELETE' })
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
  const res = await fetch('/api/collections/' + encodeURIComponent(slug), { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Erreur')
  }
}

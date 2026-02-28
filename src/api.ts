/**
 * Client API pour la base de données partagée (remplace localStorage).
 */

import type { Order } from './types'
import type { Antichoc } from './data'
import type { DeliveryPrices } from './delivery'

const BASE = ''

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

export interface YalidineStopdesk {
  id: number | string
  name: string
  address?: string
  wilaya?: string
}

export async function apiGetYalidineStopdesks(wilaya?: string): Promise<YalidineStopdesk[]> {
  const url = wilaya ? `/api/yalidine/stopdesks?wilaya=${encodeURIComponent(wilaya)}` : '/api/yalidine/stopdesks'
  const res = await fetch(BASE + url)
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return data.stopdesks ?? []
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

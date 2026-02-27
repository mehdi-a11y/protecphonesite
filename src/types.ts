import type { Antichoc } from './data'

export interface CartItem {
  antichoc: Antichoc
  isUpsell?: boolean
}

export type DeliveryType = 'domicile' | 'yalidine'

export interface Order {
  id: string
  customerName: string
  phone: string
  address: string
  /** @deprecated use wilaya */
  city?: string
  wilaya?: string
  deliveryType?: DeliveryType
  deliveryPrice?: number
  items: CartItem[]
  total: number
  status:
    | 'tentative1'
    | 'tentative2'
    | 'tentative3'
    | 'confirmed'
    | 'livre'
    | 'retourne'
    | 'cancelled'
    | 'callback'
  createdAt: string
  confirmationCode: string
  /** Numéro de suivi Yalidine après envoi */
  yalidineTracking?: string
  /** Date d'envoi vers Yalidine */
  yalidineSentAt?: string
}

export const ADMIN_PASSWORD = 'admin' // à changer en production

const ORDERS_KEY = 'protecphone_orders'
const ADMIN_AUTH_KEY = 'protecphone_admin_auth'

export function getOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as any[]
    // Migration douce des anciens statuts vers le nouveau modèle
    return parsed.map((o) => {
      if (o.status === 'pending') {
        return { ...o, status: 'tentative1' }
      }
      return o
    }) as Order[]
  } catch {
    return []
  }
}

export function saveOrder(order: Order): void {
  const orders = getOrders()
  orders.unshift(order)
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function setOrderStatus(orderId: string, status: Order['status']): void {
  const orders = getOrders().map((o) =>
    o.id === orderId ? { ...o, status } : o
  )
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function confirmOrder(orderId: string): void {
  setOrderStatus(orderId, 'confirmed')
}

export function updateOrderYalidine(
  orderId: string,
  data: { tracking: string; sentAt: string },
): void {
  const orders = getOrders().map((o) =>
    o.id === orderId
      ? { ...o, yalidineTracking: data.tracking, yalidineSentAt: data.sentAt }
      : o,
  )
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === '1'
}

export function setAdminAuthenticated(value: boolean): void {
  if (value) sessionStorage.setItem(ADMIN_AUTH_KEY, '1')
  else sessionStorage.removeItem(ADMIN_AUTH_KEY)
}

import type { Antichoc } from './data'
import type { IPhoneModelId } from './data'

export interface CartItem {
  antichoc: Antichoc
  isUpsell?: boolean
  /** Modèle iPhone choisi par le client (obligatoire pour commander) */
  selectedPhoneId?: IPhoneModelId
  /** Couleur choisie par le client (obligatoire pour commander) */
  selectedColorId?: string
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
  /** ID du bureau Yalidine (stop desk) choisi par le client */
  yalidineStopdeskId?: string
  /** Nom du bureau pour affichage */
  yalidineStopdeskName?: string
}

export const ADMIN_PASSWORD = 'admin' // à changer en production

const ADMIN_AUTH_KEY = 'protecphone_admin_auth'

import * as api from './api'

export async function getOrders(): Promise<Order[]> {
  try {
    return await api.apiGetOrders()
  } catch {
    return []
  }
}

export async function saveOrder(order: Order): Promise<void> {
  await api.apiSaveOrder(order)
}

export async function setOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  await api.apiSetOrderStatus(orderId, status)
}

export function confirmOrder(orderId: string): Promise<void> {
  return setOrderStatus(orderId, 'confirmed')
}

export async function updateOrderYalidine(
  orderId: string,
  data: { tracking: string; sentAt: string },
): Promise<void> {
  await api.apiUpdateOrderYalidine(orderId, data)
}

export async function deleteOrder(orderId: string): Promise<void> {
  await api.apiDeleteOrder(orderId)
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === '1'
}

export function setAdminAuthenticated(value: boolean): void {
  if (value) sessionStorage.setItem(ADMIN_AUTH_KEY, '1')
  else sessionStorage.removeItem(ADMIN_AUTH_KEY)
}

import type { Antichoc } from './data'

export interface CartItem {
  antichoc: Antichoc
  isUpsell?: boolean
  /** Modèle choisi par le client (iPhone ou Samsung) */
  selectedPhoneId?: string
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
    | 'none'
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
  /** true = colis remis au transporteur (expédié), pas seulement envoyé à Yalidine */
  colisExpedie?: boolean
  /** ID du bureau Yalidine (stop desk) choisi par le client */
  yalidineStopdeskId?: string
  /** Nom du bureau pour affichage */
  yalidineStopdeskName?: string
  /** Coche "à acheter" : true = achat fournisseur fait pour cette commande */
  achatFournisseurDone?: boolean
  /** Coche "dépôt" : true = expédition / préparation dépôt traitée pour cette commande */
  depotExpedieDone?: boolean
  /** true = l'admin a demandé un changement ; le confirmateur doit contacter le client et reconfirmer */
  changeRequestedByAdmin?: boolean
  /** Raison du changement demandé (indiquée par l'admin pour le confirmateur) */
  changeRequestedReason?: string
  /** Catégorie figée à la confirmation : dépôt (tout en stock), à acheter, ou bloquée */
  confirmedOrderCategory?: 'depot' | 'achats' | 'bloquees'
}

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

export async function updateOrder(orderId: string, partial: Partial<Order>): Promise<Order> {
  return api.apiUpdateOrder(orderId, partial)
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

export async function setOrderAchatDone(orderId: string, done: boolean): Promise<void> {
  await api.apiSetOrderAchatDone(orderId, done)
}

export async function setOrderDepotDone(orderId: string, done: boolean): Promise<void> {
  await api.apiSetOrderDepotDone(orderId, done)
}

/** Session admin : jeton valide (vérifié côté serveur à chaque appel API). */
export function isAdminAuthenticated(): boolean {
  return api.isRoleAuthenticated('admin')
}

/** Connexion admin : le mot de passe est vérifié par le serveur (ADMIN_PASSWORD dans .env). */
export async function loginAdmin(password: string): Promise<void> {
  await api.apiLogin('admin', password)
}

export function logoutAdmin(): void {
  api.logoutRole('admin')
}

export function isConfirmateurAuthenticated(): boolean {
  return api.isRoleAuthenticated('confirmateur')
}

/** Connexion confirmateur : vérifiée par le serveur (CONFIRMATEUR_PASSWORD dans .env). */
export async function loginConfirmateur(password: string): Promise<void> {
  await api.apiLogin('confirmateur', password)
}

export function logoutConfirmateur(): void {
  api.logoutRole('confirmateur')
}

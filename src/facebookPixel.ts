/**
 * Facebook / Meta Pixel — connexion avec Facebook Ads.
 * Définir VITE_FB_PIXEL_ID (et optionnellement VITE_FB_PIXEL_ID_2) dans .env
 * (ou variables d'environnement en build) pour activer le(s) pixel(s).
 * Les événements sont envoyés à tous les pixels initialisés.
 * Doc : https://developers.facebook.com/docs/meta-pixel
 */

declare global {
  interface Window {
    fbq?: (action: string, ...args: unknown[]) => void
    _fbq?: unknown
  }
}

function parsePixelIds(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((id) => id.trim()).filter(Boolean)
}

function getPixelIds(): string[] {
  const ids = [
    ...parsePixelIds(import.meta.env.VITE_FB_PIXEL_ID as string | undefined),
    ...parsePixelIds(import.meta.env.VITE_FB_PIXEL_ID_2 as string | undefined),
  ]
  return [...new Set(ids)]
}

const PIXEL_IDS = getPixelIds()

let loaded = false

let scriptInjected = false

/**
 * File d'attente fbq (sans réseau) : les événements sont mémorisés tout de suite,
 * puis envoyés quand le script Facebook arrive (voir loadFacebookPixelScript).
 */
function createQueue(): void {
  if (loaded || PIXEL_IDS.length === 0 || typeof window === 'undefined') return
  loaded = true
  if (!window.fbq) {
    // Même file d'attente que le snippet officiel de Meta
    const n = function (...args: unknown[]) {
      const self = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] }
      if (self.callMethod) self.callMethod(...args)
      else self.queue.push(args)
    } as unknown as Record<string, unknown> & ((action: string, ...args: unknown[]) => void)
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    window.fbq = n
    if (!window._fbq) window._fbq = n
  }
  for (const id of PIXEL_IDS) window.fbq!('init', id)
  window.fbq!('track', 'PageView')
}

/** Initialise le(s) pixel(s) au chargement de l'app : file d'attente seulement, aucun script lourd. */
export function initFacebookPixel(): void {
  if (PIXEL_IDS.length === 0) return
  createQueue()
}

/** Télécharge le script Facebook (à appeler une fois la page affichée) : il envoie les événements en attente. */
export function loadFacebookPixelScript(): void {
  if (PIXEL_IDS.length === 0 || scriptInjected || typeof document === 'undefined') return
  createQueue()
  scriptInjected = true
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/fr_FR/fbevents.js'
  document.head.appendChild(s)
}

/** Envoie un événement à tous les pixels initialisés (no-op si aucun pixel configuré). */
export function trackFacebookEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (PIXEL_IDS.length === 0 || !window.fbq) return
  if (params && Object.keys(params).length > 0) {
    window.fbq('track', eventName, params)
  } else {
    window.fbq('track', eventName)
  }
}

/** PageView (déjà envoyé à l'init, utile pour les changements de route SPA). */
export function trackPageView(): void {
  trackFacebookEvent('PageView')
}

/** Vue d'un produit (fiche produit). */
export function trackViewContent(contentName?: string, contentIds?: string[], value?: number, currency = 'DZD'): void {
  trackFacebookEvent('ViewContent', {
    content_name: contentName,
    content_ids: contentIds,
    content_type: 'product',
    value,
    currency,
  })
}

/** Ajout au panier. */
export function trackAddToCart(contentName?: string, contentIds?: string[], value?: number, currency = 'DZD'): void {
  trackFacebookEvent('AddToCart', {
    content_name: contentName,
    content_ids: contentIds,
    content_type: 'product',
    value,
    currency,
  })
}

/** Initiation du checkout. */
export function trackInitiateCheckout(value?: number, currency = 'DZD', numItems?: number): void {
  trackFacebookEvent('InitiateCheckout', { value, currency, num_items: numItems })
}

/** Achat complété (commande validée). */
export function trackPurchase(value: number, currency = 'DZD', orderId?: string, contentIds?: string[]): void {
  trackFacebookEvent('Purchase', {
    value,
    currency,
    order_id: orderId,
    content_ids: contentIds,
    content_type: 'product',
  })
}

export function isPixelEnabled(): boolean {
  return PIXEL_IDS.length > 0
}

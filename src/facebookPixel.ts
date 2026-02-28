/**
 * Facebook / Meta Pixel — connexion avec Facebook Ads.
 * Définir VITE_FB_PIXEL_ID dans .env (ou variables d'environnement en build) pour activer le pixel.
 * Doc : https://developers.facebook.com/docs/meta-pixel
 */

declare global {
  interface Window {
    fbq?: (action: string, ...args: unknown[]) => void
    _fbq?: unknown
  }
}

const PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string | undefined

let loaded = false

function loadPixel(): void {
  if (loaded || !PIXEL_ID || typeof document === 'undefined') return
  loaded = true

  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/fr_FR/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`
  const script = document.createElement('script')
  script.textContent = snippet
  document.head.appendChild(script)
}

/** Initialise le pixel au chargement de l'app (à appeler une fois, ex. dans main.tsx). */
export function initFacebookPixel(): void {
  if (!PIXEL_ID) return
  loadPixel()
}

/** Envoie un événement au pixel (no-op si le pixel n'est pas configuré). */
export function trackFacebookEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (!PIXEL_ID || !window.fbq) return
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
  return Boolean(PIXEL_ID)
}

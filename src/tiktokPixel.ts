/**
 * TikTok Pixel — suivi des conversions pour TikTok Ads.
 * Définir VITE_TIKTOK_PIXEL_ID dans .env pour activer le pixel.
 * Doc : https://ads.tiktok.com/help/article/tiktok-pixel
 */

declare global {
  interface Window {
    ttq?: {
      load: (pixelId: string) => void
      page: () => void
      track: (event: string, props?: Record<string, unknown>) => void
    }
  }
}

const PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined

let loaded = false

function loadPixel(): void {
  if (loaded || !PIXEL_ID || typeof document === 'undefined') return
  loaded = true

  // Snippet de base TikTok : définit ttq et charge events.js
  const bootstrap = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date(),ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load("${PIXEL_ID}");ttq.page();}(window,document,"ttq");`
  const script = document.createElement('script')
  script.textContent = bootstrap
  document.head.appendChild(script)
}

/** Initialise le pixel au chargement de l'app (à appeler une fois dans main.tsx). */
export function initTikTokPixel(): void {
  if (!PIXEL_ID) return
  loadPixel()
}

function trackTikTok(event: string, props?: Record<string, unknown>): void {
  if (!PIXEL_ID || !window.ttq) return
  try {
    if (props && Object.keys(props).length > 0) {
      window.ttq.track(event, props)
    } else {
      window.ttq.track(event)
    }
  } catch {
    // ignore
  }
}

/** PageView (déjà envoyé à l'init). */
export function trackTikTokPageView(): void {
  trackTikTok('PageView')
}

/** Vue d'un produit (fiche produit). */
export function trackTikTokViewContent(contentName?: string, contentIds?: string[], value?: number, currency = 'DZD'): void {
  trackTikTok('ViewContent', {
    content_name: contentName,
    content_id: contentIds?.[0],
    content_type: 'product',
    value,
    currency,
  })
}

/** Ajout au panier. */
export function trackTikTokAddToCart(contentName?: string, contentIds?: string[], value?: number, currency = 'DZD'): void {
  trackTikTok('AddToCart', {
    content_name: contentName,
    content_id: contentIds?.[0],
    content_type: 'product',
    value,
    currency,
  })
}

/** Initiation du checkout. */
export function trackTikTokInitiateCheckout(value?: number, currency = 'DZD', contentIds?: string[]): void {
  trackTikTok('InitiateCheckout', { value, currency, content_id: contentIds?.[0] })
}

/** Achat complété (commande validée). */
export function trackTikTokCompletePayment(value: number, currency = 'DZD', orderId?: string, contentIds?: string[]): void {
  trackTikTok('CompletePayment', {
    value,
    currency,
    order_id: orderId,
    content_id: contentIds?.[0],
    content_type: 'product',
  })
}

export function isTikTokPixelEnabled(): boolean {
  return Boolean(PIXEL_ID)
}

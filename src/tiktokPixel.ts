/**
 * TikTok Pixel — suivi des conversions pour TikTok Ads.
 * Définir VITE_TIKTOK_PIXEL_ID dans .env, et pour des pixels supplémentaires :
 * VITE_TIKTOK_PIXEL_ID_2, VITE_TIKTOK_PIXEL_ID_3, VITE_TIKTOK_PIXEL_ID_4... (jusqu'à _10).
 * Les événements sont envoyés à tous les pixels définis.
 * Doc : https://ads.tiktok.com/help/article/tiktok-pixel
 */

declare global {
  interface Window {
    ttq?: {
      load: (pixelId: string) => void
      page: () => void
      track: (event: string, props?: Record<string, unknown>) => void
      identify: (props: Record<string, string>) => void
    }
  }
}

/** Nombre max de pixels numérotés supportés (VITE_TIKTOK_PIXEL_ID_2 à _MAX_EXTRA_PIXELS). */
const MAX_EXTRA_PIXELS = 10

function parsePixelIds(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((id) => id.trim()).filter(Boolean)
}

function getPixelIds(): string[] {
  const env = import.meta.env as Record<string, string | undefined>
  const ids = parsePixelIds(env.VITE_TIKTOK_PIXEL_ID)
  for (let i = 2; i <= MAX_EXTRA_PIXELS; i++) {
    ids.push(...parsePixelIds(env[`VITE_TIKTOK_PIXEL_ID_${i}`]))
  }
  return [...new Set(ids)]
}

const PIXEL_IDS = getPixelIds()

let loaded = false

function loadPixel(): void {
  if (loaded || PIXEL_IDS.length === 0 || typeof document === 'undefined') return
  loaded = true

  const loadCalls = PIXEL_IDS.map((id) => `ttq.load("${id}");`).join('')
  // Snippet de base TikTok : définit ttq et charge events.js pour chaque pixel
  const bootstrap = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date(),ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};${loadCalls}ttq.page();}(window,document,"ttq");`
  const script = document.createElement('script')
  script.textContent = bootstrap
  document.head.appendChild(script)
}

/** Initialise le pixel au chargement de l'app (à appeler une fois dans main.tsx). */
export function initTikTokPixel(): void {
  if (PIXEL_IDS.length === 0) return
  loadPixel()
}

function trackTikTok(event: string, props?: Record<string, unknown>): void {
  if (PIXEL_IDS.length === 0 || !window.ttq) return
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

/** Numéro algérien au format E.164 (+213XXXXXXXXX), ou null si invalide. */
function toE164Algeria(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('213')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 9 ? `+213${digits}` : null
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Advanced Matching : envoie le téléphone du client (haché SHA-256) à TikTok.
 * À appeler avant trackTikTokCompletePayment pour améliorer l'attribution (EMQ).
 */
export async function identifyTikTokUser(phone: string): Promise<void> {
  if (PIXEL_IDS.length === 0 || !window.ttq || !crypto?.subtle) return
  const e164 = toE164Algeria(phone)
  if (!e164) return
  try {
    const hashed = await sha256(e164)
    window.ttq.identify({ phone_number: hashed, external_id: hashed })
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
  return PIXEL_IDS.length > 0
}

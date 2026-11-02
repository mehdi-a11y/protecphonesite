import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Antichoc } from '../data'
import { ANTICHOC_COLORS, GENERAL_MODEL_ID, isVariantOrderable, parseLandingBenefit } from '../data'
import type { CartItem } from '../types'
import { WILAYAS } from '../delivery'
import { useCheckoutForm } from '../steps/useCheckoutForm'
import { trackViewContent, trackInitiateCheckout, trackAddToCart } from '../facebookPixel'
import { trackTikTokViewContent, trackTikTokInitiateCheckout, trackTikTokAddToCart } from '../tiktokPixel'

interface Props {
  product: Antichoc
  title?: string | null
  /** 'full' = landing complète par sections (défaut), 'simple' = page produit courte : photos + formulaire */
  template?: 'full' | 'simple'
}

const MAX_QUANTITY = 10
const DEFAULT_ACCENT = '#3b82f6'

const TEXTS = {
  ar: {
    defaultBanner: 'التوصيل لـ 58 ولاية · الدفع عند الاستلام',
    cta: 'اطلب الآن',
    orderNow: 'اطلب الآن قبل نفاذ الكمية',
    trust: [['🚚', 'توصيل سريع'], ['✅', 'ضمان الجودة'], ['💵', 'الدفع عند الاستلام']],
    color: 'اللون',
    quantity: 'الكمية',
    name: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    wilaya: 'الولاية',
    chooseWilaya: 'اختر الولاية',
    commune: 'البلدية',
    chooseCommune: 'اختر البلدية',
    loadingCommunes: 'جاري التحميل…',
    noCommune: 'لا توجد بلديات',
    delivery: 'طريقة التوصيل',
    home: 'التوصيل للمنزل',
    office: 'الاستلام من مكتب ياليدين',
    chooseOffice: 'اختر المكتب',
    loadingOffices: 'جاري تحميل المكاتب…',
    noOffice: 'لا يوجد مكتب في هذه الولاية',
    summary: 'ملخص الطلب',
    shipping: 'التوصيل',
    shippingTbd: 'اختر الولاية',
    total: 'المجموع',
    submit: 'تأكيد الطلب',
    sending: 'جاري الإرسال…',
    unavailable: 'هذا المنتج غير متوفر حالياً',
    pickColor: 'اختر اللون',
    fillForm: 'يرجى ملء جميع الخانات',
    successTitle: 'تم إرسال طلبك بنجاح!',
    successText: 'سنتصل بك قريباً لتأكيد الطلب.',
    orderNumber: 'رقم الطلب',
    ok: 'حسناً',
    description: 'الوصف',
    privacy: 'سياسة الخصوصية',
    da: 'دج',
  },
  fr: {
    defaultBanner: 'Livraison 58 wilayas · Paiement à la livraison',
    cta: 'Commander maintenant',
    orderNow: 'Commandez avant rupture de stock',
    trust: [['🚚', 'Livraison rapide'], ['✅', 'Qualité garantie'], ['💵', 'Paiement à la livraison']],
    color: 'Couleur',
    quantity: 'Quantité',
    name: 'Nom complet',
    phone: 'Téléphone',
    wilaya: 'Wilaya',
    chooseWilaya: 'Choisir une wilaya',
    commune: 'Commune',
    chooseCommune: 'Choisir une commune',
    loadingCommunes: 'Chargement…',
    noCommune: 'Aucune commune',
    delivery: 'Livraison',
    home: 'À domicile',
    office: 'Bureau Yalidine',
    chooseOffice: 'Choisir un bureau',
    loadingOffices: 'Chargement des bureaux…',
    noOffice: 'Aucun bureau pour cette wilaya',
    summary: 'Récapitulatif',
    shipping: 'Livraison',
    shippingTbd: 'Choisir la wilaya',
    total: 'Total',
    submit: 'Confirmer la commande',
    sending: 'Envoi…',
    unavailable: 'Ce produit est momentanément indisponible.',
    pickColor: 'Choisissez une couleur',
    fillForm: 'Veuillez remplir tous les champs',
    successTitle: 'Commande envoyée !',
    successText: 'Nous vous appellerons bientôt pour confirmer.',
    orderNumber: 'N° commande',
    ok: 'OK',
    description: 'Description',
    privacy: 'Politique de confidentialité',
    da: 'DA',
  },
} as const

const ARABIC_FONT_ID = 'landing-font-cairo'

/** Couleurs de la page selon le thème (clair par défaut, sombre « sport »), exposées en variables CSS --lp-*. */
function themeVars(dark: boolean, accent: string): Record<string, string> {
  const palette = dark
    ? {
        page: `radial-gradient(120% 60% at 50% 0%, ${accent}26 0%, #0b0b0f 55%, #0b0b0f 100%)`,
        surface: '#16161d', surface2: '#1f1f28', text: '#f8fafc', muted: '#cbd5e1', faint: '#94a3b8',
        border: '#262631', borderStrong: '#34343f', bar: 'rgba(11,11,15,.88)', shadow: 'rgba(0,0,0,.55)', ink: accent,
      }
    : {
        page: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 35%, #ffffff 100%)',
        surface: '#ffffff', surface2: '#f8fafc', text: '#0f172a', muted: '#475569', faint: '#94a3b8',
        border: '#f1f5f9', borderStrong: '#e2e8f0', bar: 'rgba(255,255,255,.9)', shadow: 'rgba(226,232,240,.6)', ink: '#0f172a',
      }
  return {
    '--lp-accent': accent,
    '--lp-surface': palette.surface,
    '--lp-surface-2': palette.surface2,
    '--lp-text': palette.text,
    '--lp-muted': palette.muted,
    '--lp-faint': palette.faint,
    '--lp-border': palette.border,
    '--lp-border-strong': palette.borderStrong,
    '--lp-bar': palette.bar,
    '--lp-shadow': palette.shadow,
    '--lp-ink': palette.ink,
    background: palette.page,
    colorScheme: dark ? 'dark' : 'light',
  }
}

/**
 * Landing page d'un produit général (hors téléphonie), par sections configurables dans l'admin.
 * Le formulaire de commande est intégré à la page et enregistre la commande comme le checkout
 * classique (mêmes commandes / confirmateur / admin).
 */
export function GeneralProductLanding({ product, title, template = 'full' }: Props) {
  const simple = template === 'simple'
  const landing = product.landing ?? {}
  const lang = landing.lang === 'fr' ? 'fr' : 'ar'
  const dark = landing.theme === 'dark'
  const t = TEXTS[lang]
  const accent = /^#[0-9a-f]{3,8}$/i.test(landing.accentColor ?? '') ? landing.accentColor! : DEFAULT_ACCENT
  const displayTitle = title ?? product.name
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} ${t.da}`

  const [selectedColorId, setSelectedColorId] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [hint, setHint] = useState('')
  const [confirmed, setConfirmed] = useState<{ orderId: string } | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const formRef = useRef<HTMLElement>(null)
  const checkoutTracked = useRef(false)

  // Police arabe chargée seulement si besoin
  useEffect(() => {
    if (lang !== 'ar' || document.getElementById(ARABIC_FONT_ID)) return
    const link = document.createElement('link')
    link.id = ARABIC_FONT_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
    document.head.appendChild(link)
  }, [lang])

  const colorOptions = useMemo(() => {
    if (!product.colorIds?.length) return []
    return product.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [product.colorIds])

  const orderableColorIds = useMemo(() => {
    const ids = (product.colorIds?.length ? product.colorIds : ['']) as string[]
    return new Set(ids.filter((cid) => isVariantOrderable(product, cid, GENERAL_MODEL_ID)))
  }, [product])

  useEffect(() => {
    setQuantity(1)
    setHint('')
    const firstOrderable = colorOptions.find((c) => orderableColorIds.has(c.id))
    setSelectedColorId(colorOptions.length === 1 && firstOrderable ? firstOrderable.id : '')
  }, [product.id, colorOptions, orderableColorIds])

  useEffect(() => {
    try {
      trackViewContent(product.name, [product.id], product.price, 'DZD')
      trackTikTokViewContent(product.name, [product.id], product.price, 'DZD')
    } catch {
      // ignore pixel errors
    }
  }, [product.id, product.name, product.price])

  // Barre fixe masquée quand le formulaire est à l'écran
  useEffect(() => {
    const el = formRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const available = orderableColorIds.size > 0
  const colorOk = colorOptions.length === 0 || (selectedColorId !== '' && orderableColorIds.has(selectedColorId))
  const cart: CartItem[] = useMemo(
    () =>
      available && colorOk
        ? Array.from({ length: quantity }, () => ({
            antichoc: product,
            selectedPhoneId: GENERAL_MODEL_ID,
            selectedColorId: colorOptions.length ? selectedColorId : '',
          }))
        : [],
    [available, colorOk, quantity, product, selectedColorId, colorOptions.length],
  )
  const form = useCheckoutForm(cart)

  const photos = product.photoGallery?.length ? product.photoGallery : product.photoUrl ? [product.photoUrl] : []
  const heroPhoto = photos[0]
  const oldPrice = landing.oldPrice && landing.oldPrice > product.price ? landing.oldPrice : 0
  const discount = oldPrice ? Math.round((1 - product.price / oldPrice) * 100) : 0
  const features = (landing.benefits ?? []).map(parseLandingBenefit).filter((f): f is NonNullable<typeof f> => f != null)
  const ctaText = landing.ctaText?.trim() || t.cta
  const subtotal = product.price * quantity

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const trackCheckoutOnce = () => {
    if (checkoutTracked.current) return
    checkoutTracked.current = true
    try {
      trackAddToCart(product.name, [product.id], subtotal, 'DZD')
      trackTikTokAddToCart(product.name, [product.id], subtotal, 'DZD')
      trackInitiateCheckout(subtotal, 'DZD', quantity)
      trackTikTokInitiateCheckout(subtotal, 'DZD', [product.id])
    } catch {
      // ignore pixel errors
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!available) return setHint(t.unavailable)
    if (!colorOk) return setHint(t.pickColor)
    if (!form.canSubmitOrder) return setHint(t.fillForm)
    setHint('')
    trackCheckoutOnce()
    const result = await form.submit()
    if (result) {
      setConfirmed({ orderId: result.orderId })
      // Évite une 2e commande identique si le client reclique
      form.setName('')
      form.setPhone('')
      setQuantity(1)
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-border-strong)] text-[var(--lp-text)] placeholder-[var(--lp-faint)] focus:outline-none focus:border-[var(--lp-accent)] focus:ring-2 focus:ring-[var(--lp-accent)]/20'

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
      className="min-h-screen text-[var(--lp-text)]"
      style={{
        ...themeVars(dark, accent),
        fontFamily: lang === 'ar' ? "'Cairo', 'Outfit', system-ui, sans-serif" : undefined,
      }}
    >
      {/* Bandeau */}
      <div className="text-white text-center py-2 px-4 text-xs sm:text-sm font-semibold" style={{ backgroundColor: accent }}>
        {landing.topBanner?.trim() || t.defaultBanner}
      </div>
      {landing.brandName && (
        <header className="px-4 h-12 flex items-center justify-center border-b border-[var(--lp-border)] bg-[var(--lp-bar)] backdrop-blur">
          <span className="font-extrabold text-lg tracking-tight">{landing.brandName}</span>
        </header>
      )}

      <main className="max-w-xl mx-auto px-4 pb-32">
        {/* Page simple : photos avec miniatures + titre + prix, puis directement le formulaire */}
        {simple && (
          <section className="pt-5">
            <div className="relative rounded-3xl bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-lg shadow-[color:var(--lp-shadow)] overflow-hidden">
              {photos[selectedImageIndex] ?? heroPhoto ? (
                <img
                  src={photos[selectedImageIndex] ?? heroPhoto}
                  alt={displayTitle}
                  fetchPriority="high"
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-8xl">{product.image}</div>
              )}
              {discount > 0 && (
                <span className="absolute top-4 start-4 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold"><bdi dir="ltr">-{discount}%</bdi></span>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === i ? 'border-[var(--lp-accent)]' : 'border-[var(--lp-border-strong)]'
                    }`}
                    aria-label={`${i + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold leading-snug">{displayTitle}</h1>
              {discount > 0 && (
                <span className="shrink-0 mt-1 px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-sm font-bold"><bdi dir="ltr">-{discount}%</bdi></span>
              )}
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-extrabold" style={{ color: accent }}>{fmt(product.price)}</span>
              {oldPrice > 0 && <span className="text-lg text-[var(--lp-faint)] line-through">{fmt(oldPrice)}</span>}
            </div>
            {landing.subtitle && <p className="text-[var(--lp-muted)] mt-3 leading-relaxed">{landing.subtitle}</p>}
          </section>
        )}

        {!simple && (<>
        {/* Hero */}
        <section className="pt-8 text-center">
          {landing.badge && (
            <span className="inline-block px-4 py-1.5 rounded-full text-white text-sm font-bold mb-5" style={{ backgroundColor: accent }}>
              {landing.badge}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
            {displayTitle}
            {landing.headlineHighlight && (
              <>
                <br />
                <span style={{ color: accent }}>{landing.headlineHighlight}</span>
              </>
            )}
          </h1>
          {landing.subtitle && <p className="text-[var(--lp-muted)] text-lg leading-relaxed mb-6">{landing.subtitle}</p>}
          {heroPhoto ? (
            <div className="relative rounded-3xl bg-[var(--lp-surface)] shadow-xl shadow-[color:var(--lp-shadow)] border border-[var(--lp-border)] overflow-hidden">
              <img src={heroPhoto} alt={displayTitle} fetchPriority="high" className="w-full aspect-square object-cover" />
              {landing.heroBadge && (
                <span className="absolute top-4 end-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--lp-surface)] shadow-lg font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  {landing.heroBadge}
                </span>
              )}
              {discount > 0 && (
                <span className="absolute top-4 start-4 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold"><bdi dir="ltr">-{discount}%</bdi></span>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-[var(--lp-surface)] border border-[var(--lp-border)] aspect-square flex items-center justify-center text-8xl">{product.image}</div>
          )}
        </section>

        {/* Galerie */}
        {photos.length > 1 && (
          <section className="pt-12">
            {landing.galleryTitle && <h2 className="text-2xl font-extrabold text-center mb-5">{landing.galleryTitle}</h2>}
            <div className="grid grid-cols-2 gap-3">
              {photos.slice(1).map((url, i) => (
                <img key={i} src={url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)]" />
              ))}
            </div>
          </section>
        )}

        {/* Avantages */}
        {features.length > 0 && (
          <section className="pt-12">
            {landing.featuresTitle && <h2 className="text-2xl font-extrabold text-center mb-5">{landing.featuresTitle}</h2>}
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-sm">
                  {f.icon && (
                    <span className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${accent}1a` }}>
                      {f.icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">{f.title}</p>
                    {f.text && <p className="text-[var(--lp-muted)] text-sm mt-0.5 leading-relaxed">{f.text}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        {product.description && (
          <section className="pt-12">
            <h2 className="text-2xl font-extrabold text-center mb-4">{t.description}</h2>
            <p className="text-[var(--lp-muted)] leading-relaxed whitespace-pre-line">{product.description}</p>
          </section>
        )}

        {/* Offre */}
        <section className="mt-12 p-6 rounded-3xl text-center text-white" style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}>
          {landing.offerTitle && <h2 className="text-2xl font-extrabold mb-2">{landing.offerTitle}</h2>}
          {landing.offerText && <p className="text-white/85 mb-4">{landing.offerText}</p>}
          <div className="flex items-baseline justify-center gap-3 mb-5">
            <span className="text-4xl font-extrabold">{fmt(product.price)}</span>
            {oldPrice > 0 && <span className="text-lg text-white/60 line-through">{fmt(oldPrice)}</span>}
          </div>
          <button type="button" onClick={scrollToForm} className="w-full py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-lg hover:bg-slate-100 transition-colors">
            {ctaText}
          </button>
          <div className="grid grid-cols-3 gap-2 mt-5 text-xs">
            {t.trust.map(([icon, label]) => (
              <div key={label} className="rounded-xl bg-white/10 p-2">
                <div className="text-xl mb-1">{icon}</div>
                {label}
              </div>
            ))}
          </div>
        </section>
        </>)}

        {/* Commande */}
        <section
          ref={formRef}
          id="commander"
          className={`${simple ? 'mt-5' : 'mt-12'} p-5 rounded-3xl bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xl shadow-[color:var(--lp-shadow)] scroll-mt-4`}
        >
          {simple && <p className="text-lg font-extrabold mb-4">{t.orderNow}</p>}
          <div className={`flex items-start gap-3 mb-4 ${simple ? 'hidden' : ''}`}>
            {heroPhoto && <img src={heroPhoto} alt="" className="w-16 h-16 rounded-xl object-cover border border-[var(--lp-border)]" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{displayTitle}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold" style={{ color: accent }}>{fmt(product.price)}</span>
                {oldPrice > 0 && <span className="text-sm text-[var(--lp-faint)] line-through">{fmt(oldPrice)}</span>}
                {discount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold"><bdi dir="ltr">-{discount}%</bdi></span>}
              </div>
            </div>
          </div>

          {!available ? (
            <p className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">{t.unavailable}</p>
          ) : (
            <form onSubmit={handleSubmit} onFocus={trackCheckoutOnce} className="space-y-4">
              {colorOptions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">
                    {t.color} <span className="text-red-500">*</span>
                    {selectedColorId && <span className="font-normal text-[var(--lp-faint)] ms-2">{colorOptions.find((c) => c.id === selectedColorId)?.name}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => {
                      const orderable = orderableColorIds.has(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => orderable && setSelectedColorId(c.id)}
                          disabled={!orderable}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            selectedColorId === c.id ? 'border-[var(--lp-text)] ring-2 ring-[var(--lp-accent)]/40' : orderable ? 'border-[var(--lp-border-strong)]' : 'border-[var(--lp-border)] opacity-40 cursor-not-allowed'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                          aria-label={c.name}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">{t.name}</label>
                <input type="text" required value={form.name} onChange={(e) => form.setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t.phone}</label>
                <input type="tel" required dir="ltr" value={form.phone} onChange={(e) => form.setPhone(e.target.value)} placeholder="05 XX XX XX XX" className={`${inputCls} text-start`} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t.wilaya}</label>
                <select required value={form.wilaya} onChange={(e) => form.setWilaya(e.target.value)} className={inputCls}>
                  <option value="">{t.chooseWilaya}</option>
                  {WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">{t.delivery}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['domicile', 'yalidine'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setDeliveryType(type)}
                      className={`px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        form.deliveryType === type ? 'border-[var(--lp-accent)] bg-[var(--lp-accent)]/10' : 'border-[var(--lp-border-strong)] bg-[var(--lp-surface)]'
                      }`}
                    >
                      {type === 'domicile' ? `🏠 ${t.home}` : `🏢 ${t.office}`}
                    </button>
                  ))}
                </div>
              </div>

              {form.wilaya && form.deliveryType === 'domicile' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">{t.commune}</label>
                  <select required value={form.commune} onChange={(e) => form.setCommune(e.target.value)} className={inputCls}>
                    <option value="">
                      {form.communesLoading ? t.loadingCommunes : form.communes.length === 0 ? t.noCommune : t.chooseCommune}
                    </option>
                    {form.communes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.wilaya && form.deliveryType === 'yalidine' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">{t.office}</label>
                  <select
                    required
                    value={form.selectedStopdeskId}
                    onChange={(e) => form.selectStopdesk(e.target.value, e.target.options[e.target.selectedIndex]?.textContent ?? '')}
                    className={inputCls}
                  >
                    <option value="">
                      {form.stopdesksLoading ? t.loadingOffices : form.stopdesks.length === 0 ? t.noOffice : t.chooseOffice}
                    </option>
                    {form.stopdesks.map((s) => (
                      <option key={`${s.id}-${s.name}`} value={String(s.id)}>
                        {s.name}{s.address ? ` — ${s.address}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.quantity}</p>
                <div className="inline-flex items-center rounded-xl border border-[var(--lp-border-strong)] bg-[var(--lp-surface)]" dir="ltr">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-11 h-11 text-xl hover:bg-[var(--lp-surface-2)] rounded-l-xl" aria-label="-">−</button>
                  <span className="w-10 text-center font-bold">{String(quantity).padStart(2, '0')}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))} className="w-11 h-11 text-xl hover:bg-[var(--lp-surface-2)] rounded-r-xl" aria-label="+">+</button>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="rounded-2xl bg-[var(--lp-surface-2)] p-4 space-y-2 text-sm">
                <p className="font-bold mb-1">{t.summary}</p>
                <div className="flex justify-between gap-2">
                  <span className="truncate">{displayTitle} × {quantity}</span>
                  <span className="shrink-0">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-2 text-[var(--lp-muted)]">
                  <span>{t.shipping}</span>
                  <span>{form.wilaya ? fmt(form.deliveryPrice) : t.shippingTbd}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-[var(--lp-border-strong)] text-base font-extrabold">
                  <span>{t.total}</span>
                  <span style={{ color: accent }}>{fmt(subtotal + (form.wilaya ? form.deliveryPrice : 0))}</span>
                </div>
              </div>

              {hint && <p className="text-sm text-red-600 font-semibold">{hint}</p>}
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg transition-opacity disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {form.isSubmitting ? t.sending : t.submit}
              </button>
            </form>
          )}
        </section>

        {simple && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-5 text-xs text-center">
              {t.trust.map(([icon, label]) => (
                <div key={label} className="rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-border)] p-2.5 font-semibold">
                  <div className="text-xl mb-1">{icon}</div>
                  {label}
                </div>
              ))}
            </div>
            {product.description && (
              <section className="mt-8">
                <h2 className="text-xl font-extrabold mb-3">{t.description}</h2>
                <p className="text-[var(--lp-muted)] leading-relaxed whitespace-pre-line">{product.description}</p>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[var(--lp-border)] py-6 px-4 text-center text-xs text-[var(--lp-faint)]">
        {landing.brandName && <p className="mb-1">© {new Date().getFullYear()} {landing.brandName}</p>}
        <Link to="/confidentialite" className="hover:text-[var(--lp-text)]">{t.privacy}</Link>
      </footer>

      {/* Barre fixe */}
      {available && !formVisible && !confirmed && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[var(--lp-bar)] backdrop-blur border-t border-[var(--lp-border)]">
          <button
            type="button"
            onClick={scrollToForm}
            className="w-full max-w-xl mx-auto block py-4 rounded-2xl bg-[var(--lp-ink)] text-white font-extrabold text-lg shadow-xl"
          >
            {landing.ctaText?.trim() || `${t.orderNow} !!`}
          </button>
        </div>
      )}

      {/* Confirmation */}
      {confirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--lp-surface)] p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-white" style={{ backgroundColor: accent }}>✓</div>
            <p className="text-xl font-extrabold mb-2">{t.successTitle}</p>
            <p className="text-[var(--lp-muted)] mb-3">{t.successText}</p>
            <p className="text-sm text-[var(--lp-faint)] mb-5" dir="ltr">{t.orderNumber} : {confirmed.orderId}</p>
            <button type="button" onClick={() => setConfirmed(null)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ backgroundColor: accent }}>
              {t.ok}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

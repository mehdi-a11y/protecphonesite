import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Antichoc } from '../data'
import { ANTICHOC_COLORS, GENERAL_MODEL_ID, getModelName, includedItemsFor, isVariantOrderable, parseLandingBenefit } from '../data'
import type { LandingDesign } from '../data'
import { getScreenProtectorUpsell } from '../data-screen-protector'
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
    model: 'موديل الهاتف',
    chooseModel: 'اختار موديل الهاتف',
    pickModel: 'اختار موديل الهاتف',
    designsTitle: 'اختار الستيل تاعك',
    design: 'التصميم',
    pickDesign: 'اختار التصميم',
    designUnavailable: 'غير متوفر لهذا الموديل',
    offer: 'العرض',
    pieces: (n: number, phone: boolean) => (phone ? (n === 1 ? 'انتيشوك واحد' : '2 انتيشوك') : n === 1 ? 'قطعة واحدة' : 'قطعتين'),
    save: 'وفّر',
    popular: 'الأكثر طلباً',
    gift: 'هدية',
    free: 'مجاناً',
    giftEvery: 'مع كل طلب',
    badPhone: 'رقم الهاتف غير صحيح (مثال: 0555 12 34 56)',
    required: 'هذه الخانة مطلوبة',
    packTitle: 'واش كاين في الباك؟',
    included: 'مرفق',
    faqTitle: 'أسئلة شائعة',
    codNote: 'ما تخلّص والو دروك · تخلّص كي توصلك السلعة',
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
    model: 'Modèle du téléphone',
    chooseModel: 'Choisir le modèle',
    pickModel: 'Choisissez le modèle du téléphone',
    designsTitle: 'Choisissez votre style',
    design: 'Motif',
    pickDesign: 'Choisissez le motif',
    designUnavailable: 'Indisponible pour ce modèle',
    offer: 'Offre',
    pieces: (n: number, phone: boolean) => (phone ? (n === 1 ? '1 coque' : '2 coques') : n === 1 ? '1 pièce' : '2 pièces'),
    save: 'Économisez',
    popular: 'Le plus choisi',
    gift: 'Cadeau',
    free: 'Offert',
    giftEvery: 'avec chaque commande',
    badPhone: 'Numéro invalide (ex. 0555 12 34 56)',
    required: 'Champ obligatoire',
    packTitle: 'Contenu du pack',
    included: 'Inclus',
    faqTitle: 'Questions fréquentes',
    codNote: 'Rien à payer maintenant · paiement à la livraison',
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
  const [showErrors, setShowErrors] = useState(false)
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

  // Coque (iPhone / Samsung) : le client choisit son modèle ; produit général : modèle unique
  const isPhone = product.deviceType === 'iphone' || product.deviceType === 'samsung'
  const modelIds = useMemo<string[]>(
    () => (!isPhone ? [GENERAL_MODEL_ID] : product.deviceType === 'samsung' ? (product.compatibleWithSamsung ?? []) : product.compatibleWith),
    [isPhone, product.deviceType, product.compatibleWith, product.compatibleWithSamsung],
  )
  const [modelId, setModelId] = useState(isPhone ? '' : GENERAL_MODEL_ID)

  // Motifs (coques à motifs) : chacun est une variante avec sa photo de la galerie
  const designs = useMemo(() => (landing.designs ?? []).filter((d) => d && d.id), [landing.designs])
  const hasDesigns = designs.length > 0
  // Pack : nombre fixe d'articles (un motif / une couleur chacun) au prix du produit, sans offre « 1 ou 2 »
  const packSize = landing.packSize && landing.packSize > 1 ? Math.min(landing.packSize, 6) : 0
  const bundlePrice = !packSize && landing.bundlePrice && landing.bundlePrice > 0 ? landing.bundlePrice : 0
  const [designSlots, setDesignSlots] = useState<string[]>(['', ''])
  const [activeSlot, setActiveSlot] = useState(0)

  const colorOptions = useMemo(() => {
    if (hasDesigns || !product.colorIds?.length) return []
    return product.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [product.colorIds, hasDesigns])

  /** Variante commandable pour le modèle choisi (ou pour au moins un modèle tant qu'aucun n'est choisi). */
  const variantOrderable = (colorId: string, forModel = modelId) =>
    forModel ? isVariantOrderable(product, colorId, forModel) : modelIds.some((m) => isVariantOrderable(product, colorId, m))

  const variantIds = useMemo(
    () => (hasDesigns ? designs.map((d) => d.id) : (product.colorIds?.length ? product.colorIds : [''])) as string[],
    [hasDesigns, designs, product.colorIds],
  )
  const orderableColorIds = useMemo(
    () => new Set(variantIds.filter((cid) => variantOrderable(cid))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, variantIds, modelId, modelIds],
  )
  const orderableModelIds = useMemo(
    () => modelIds.filter((m) => variantIds.some((cid) => isVariantOrderable(product, cid, m))),
    [product, modelIds, variantIds],
  )

  useEffect(() => {
    setQuantity(packSize || (bundlePrice ? 2 : 1))
    setHint('')
    setDesignSlots(Array(Math.max(2, packSize)).fill(''))
    setActiveSlot(0)
    const firstOrderable = colorOptions.find((c) => isVariantOrderable(product, c.id, GENERAL_MODEL_ID))
    setSelectedColorId(colorOptions.length === 1 && firstOrderable ? firstOrderable.id : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, colorOptions, bundlePrice, packSize])

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

  const available = orderableModelIds.length > 0
  const modelOk = modelId !== '' && orderableModelIds.includes(modelId)
  // Avec l'offre « 2 = prix réduit », un motif par article ; sans offre, un seul motif pour toute la quantité
  const slotCount = hasDesigns ? (packSize || bundlePrice ? quantity : 1) : 0
  const slotDesign = (i: number) => designSlots[Math.min(i, slotCount - 1)] ?? ''
  const colorOk = hasDesigns
    ? Array.from({ length: slotCount }, (_, i) => slotDesign(i)).every((id) => id !== '' && orderableColorIds.has(id))
    : colorOptions.length === 0 || (selectedColorId !== '' && orderableColorIds.has(selectedColorId))
  const bundleActive = bundlePrice > 0 && quantity === 2
  const subtotal = packSize ? product.price : bundleActive ? bundlePrice : product.price * quantity
  const giftName = landing.gift?.trim() ?? ''
  // Articles inclus (pack) : ceux qui dépendent du modèle (ex. câble Lightning ou USB-C) suivent le modèle choisi
  const includedNames = includedItemsFor(landing.includes, modelId)

  const cart: CartItem[] = useMemo(() => {
    if (!available || !modelOk || !colorOk) return []
    // Le total de la commande = somme des prix des articles : l'offre 2 (ou le prix du pack) est répartie sur les articles
    const split = (total: number, n: number) =>
      Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0))
    const unitPrices = packSize ? split(product.price, packSize) : bundleActive ? split(bundlePrice, 2) : []
    const items: CartItem[] = Array.from({ length: quantity }, (_, i) => ({
      antichoc: unitPrices.length ? { ...product, price: unitPrices[i] } : product,
      selectedPhoneId: modelId,
      selectedColorId: hasDesigns ? slotDesign(i) : colorOptions.length ? selectedColorId : '',
    }))
    if (giftName) {
      const base = isPhone
        ? getScreenProtectorUpsell()
        : { ...product, id: `gift-${product.id}`, description: '', landing: undefined, photoGallery: undefined }
      items.push({ antichoc: { ...base, name: giftName, price: 0 }, isUpsell: true, selectedPhoneId: modelId })
    }
    includedNames.forEach((name, i) => {
      // Le verre garde l'id de l'incassable pour que le confirmateur le reconnaisse
      const base = /زجاج|incassable|verre|glass/i.test(name)
        ? getScreenProtectorUpsell()
        : { ...product, id: `inclus-${product.id}-${i}`, description: '', landing: undefined, photoGallery: undefined, photoUrl: '' }
      items.push({ antichoc: { ...base, name, price: 0 }, isUpsell: true, selectedPhoneId: modelId })
    })
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, modelOk, colorOk, quantity, product, selectedColorId, colorOptions.length, modelId, designSlots, bundleActive, bundlePrice, giftName, isPhone, hasDesigns, packSize, includedNames.join('|')])
  const form = useCheckoutForm(cart)

  const photos = product.photoGallery?.length ? product.photoGallery : product.photoUrl ? [product.photoUrl] : []
  const heroPhoto = photos[0]
  const designPhoto = (id: string) => {
    const d = designs.find((x) => x.id === id)
    return d && d.photo >= 0 ? photos[d.photo] : undefined
  }
  /** Photo du motif, ou pastille de sa couleur s'il n'a pas de photo. */
  const designVisual = (d: LandingDesign, cls: string) =>
    d.photo >= 0 && photos[d.photo] ? (
      <img src={photos[d.photo]} alt={d.name} loading="lazy" className={`${cls} object-cover`} />
    ) : (
      <span className={`${cls} block`} style={{ background: `linear-gradient(160deg, ${d.hex || '#94a3b8'} 55%, rgba(0,0,0,.25))` }} />
    )
  const designPhotoIndexes = new Set(designs.map((d) => d.photo))
  // Couleurs sans photo : grille compacte de pastilles au lieu de grandes cartes
  const swatchesOnly = hasDesigns && !designs.some((d) => d.photo >= 0 && photos[d.photo])
  const galleryPhotos = photos.filter((_, i) => i > 0 && !designPhotoIndexes.has(i))
  const oldPrice = landing.oldPrice && landing.oldPrice > product.price ? landing.oldPrice : 0
  const discount = oldPrice ? Math.round((1 - product.price / oldPrice) * 100) : 0
  const faq = (landing.faq ?? [])
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter(([q, a]) => q && a)
    .map(([q, ...a]) => ({ q, a: a.join(' | ') }))
  const packDetails = (landing.packDetails ?? []).map(parseLandingBenefit).filter((f): f is NonNullable<typeof f> => f != null)
  const features = (landing.benefits ?? []).map(parseLandingBenefit).filter((f): f is NonNullable<typeof f> => f != null)
  const ctaText = landing.ctaText?.trim() || t.cta
  const summaryPhoto = (hasDesigns && designPhoto(slotDesign(0))) || heroPhoto

  /** Choix d'un motif pour l'emplacement actif, puis passage à l'emplacement suivant vide. */
  const pickDesign = (id: string, slot = activeSlot) => {
    const next = [...designSlots]
    next[slot] = id
    setDesignSlots(next)
    const d = designs.find((x) => x.id === id)
    if (d && d.photo >= 0) setSelectedImageIndex(d.photo)
    const empty = Array.from({ length: slotCount }, (_, i) => i).find((i) => i !== slot && !next[i])
    setActiveSlot(empty ?? slot)
    setHint('')
  }

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

  // Champs manquants : affichés en rouge après un premier clic sur « تأكيد الطلب »
  const phoneValid = /^0[567]\d{8}$/.test(form.phone.replace(/[\s.-]/g, '').replace(/^\+?213/, '0'))
  const slotMissing = (i: number) => !slotDesign(i) || !orderableColorIds.has(slotDesign(i))
  const errors = {
    model: isPhone && !modelOk,
    color: colorOptions.length > 0 && !colorOk,
    name: !form.name.trim(),
    phone: !phoneValid,
    wilaya: !form.wilaya,
    commune: form.deliveryType === 'domicile' && !!form.wilaya && !form.commune.trim(),
    office: form.deliveryType === 'yalidine' && !!form.wilaya && !form.selectedStopdeskId,
  }
  const designsMissing = hasDesigns && Array.from({ length: slotCount }, (_, i) => i).some(slotMissing)
  const hasErrors = designsMissing || Object.values(errors).some(Boolean)
  const err = (key: keyof typeof errors) => showErrors && errors[key]
  const fieldCls = (invalid: boolean) =>
    invalid ? `${inputCls} !border-red-500 ring-2 ring-red-500/25` : inputCls
  const errMsg = (invalid: boolean, text: string = t.required) =>
    invalid ? <p className="text-xs text-red-500 font-semibold mt-1">⚠️ {text}</p> : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!available) return setHint(t.unavailable)
    if (hasErrors || !form.canSubmitOrder) {
      setShowErrors(true)
      setHint(t.fillForm)
      // Amène le client sur le premier champ en rouge
      requestAnimationFrame(() => {
        formRef.current?.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
    setHint('')
    setShowErrors(false)
    trackCheckoutOnce()
    const result = await form.submit()
    if (result) {
      setConfirmed({ orderId: result.orderId })
      // Évite une 2e commande identique si le client reclique
      form.setName('')
      form.setPhone('')
      setQuantity(packSize || (bundlePrice ? 2 : 1))
      setDesignSlots(Array(Math.max(2, packSize)).fill(''))
      setActiveSlot(0)
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-border-strong)] text-[var(--lp-text)] placeholder-[var(--lp-faint)] focus:outline-none focus:border-[var(--lp-accent)] focus:ring-2 focus:ring-[var(--lp-accent)]/20'

  const trustStrip = (
    <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center">
      {t.trust.map(([icon, label]) => (
        <div key={label} className="rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-border)] p-2.5 font-semibold">
          <div className="text-xl mb-1">{icon}</div>
          {label}
        </div>
      ))}
    </div>
  )

  // Contenu du pack (avant le choix du modèle, on liste toutes les variantes, ex. les 2 câbles)
  const packBox = packSize || landing.includes?.some((l) => l.trim()) ? (
    <div className="p-4 rounded-2xl border border-[var(--lp-border-strong)] bg-[var(--lp-surface)] text-start">
      <p className="font-extrabold mb-2">📦 {t.packTitle}</p>
      <ul className="space-y-1.5 text-sm font-semibold">
        {packSize > 0 && <li>✅ {t.pieces(packSize, isPhone)}{landing.designLabel ? ` · ${landing.designLabel}` : ''}</li>}
        {includedItemsFor(landing.includes, '').map((name) => (
          <li key={name}>✅ {name}</li>
        ))}
      </ul>
    </div>
  ) : null

  const giftBanner = giftName ? (
    <div className="flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed" style={{ borderColor: accent, backgroundColor: `${accent}14` }}>
      <span className="text-3xl shrink-0">🎁</span>
      <p className="text-sm leading-snug text-start">
        <span className="font-extrabold">{t.gift} : {giftName}</span>
        <br />
        <span className="text-[var(--lp-muted)]">{t.free} {t.giftEvery}</span>
      </p>
    </div>
  ) : null

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
      {/* Pulsation douce des boutons de commande (attire l'œil sans gêner) */}
      <style>{`@keyframes lp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}.lp-pulse{animation:lp-pulse 1.8s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.lp-pulse{animation:none}}`}</style>
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
            {bundlePrice > 0 && (
              <p className="mt-2 font-bold"><span style={{ color: accent }}>{t.pieces(2, isPhone)} : {fmt(bundlePrice)}</span></p>
            )}
            {landing.subtitle && <p className="text-[var(--lp-muted)] mt-3 leading-relaxed">{landing.subtitle}</p>}
            {packBox && <div className="mt-4">{packBox}</div>}
          {giftBanner && <div className="mt-4">{giftBanner}</div>}
            <p className="mt-3 text-sm font-semibold text-[var(--lp-muted)]">💵 {t.codNote}</p>
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
          <div className="flex items-baseline justify-center gap-3 mt-5">
            <span className="text-4xl font-extrabold" style={{ color: accent }}>{fmt(product.price)}</span>
            {oldPrice > 0 && <span className="text-lg text-[var(--lp-faint)] line-through">{fmt(oldPrice)}</span>}
          </div>
          {bundlePrice > 0 && (
            <p className="mt-1 font-bold">{t.pieces(2, isPhone)} : <span style={{ color: accent }}>{fmt(bundlePrice)}</span></p>
          )}
          {packBox && <div className="mt-4">{packBox}</div>}
          {giftBanner && <div className="mt-4">{giftBanner}</div>}
          <button
            type="button"
            onClick={scrollToForm}
            className="lp-pulse w-full mt-4 py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg"
            style={{ backgroundColor: accent }}
          >
            {ctaText} 👈
          </button>
          <p className="mt-2 text-sm text-[var(--lp-muted)]">{t.codNote}</p>
          {trustStrip}
        </section>

        {/* Motifs : un clic choisit le motif et descend au formulaire */}
        {hasDesigns && (
          <section className="pt-12">
            <h2 className="text-2xl font-extrabold text-center mb-5">{landing.designsTitle?.trim() || t.designsTitle}</h2>
            <div className={`grid gap-3 ${swatchesOnly ? 'grid-cols-5' : 'grid-cols-2'}`}>
              {designs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    const firstEmpty = designSlots.findIndex((id, i) => i < slotCount && !id)
                    pickDesign(d.id, firstEmpty === -1 ? activeSlot : firstEmpty)
                    scrollToForm()
                  }}
                  className="group text-start rounded-2xl overflow-hidden border border-[var(--lp-border)] bg-[var(--lp-surface)] shadow-sm"
                >
                  {designVisual(d, `w-full ${swatchesOnly ? 'aspect-square' : 'aspect-[3/4]'} transition-transform group-hover:scale-105`)}
                  {swatchesOnly ? (
                    <span className="block px-1 py-1 text-[11px] font-bold text-center truncate">{d.name}</span>
                  ) : (
                    <span className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="font-bold text-sm truncate">{d.name}</span>
                      <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: accent }}>{t.cta}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Galerie */}
        {(galleryPhotos.length > 0 || packDetails.length > 0) && (
          <section className="pt-12">
            {landing.galleryTitle && <h2 className="text-2xl font-extrabold text-center mb-5">{landing.galleryTitle}</h2>}
            {/* Détail de chaque article (pack) : ce que le client reçoit exactement */}
            {packDetails.length > 0 && (
              <div className="space-y-3 mb-4">
                {packDetails.map((f, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--lp-surface)] border-2 shadow-sm" style={{ borderColor: `${accent}40` }}>
                    <span className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white" style={{ backgroundColor: accent }}>
                      {f.icon || i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold">{f.title}</p>
                      {f.text && (
                        // Une ligne par détail (séparés par « · ») : évite les mélanges arabe / latin illisibles
                        <ul className="text-[var(--lp-muted)] text-sm mt-1 leading-relaxed space-y-0.5">
                          {f.text.split(' · ').map((part, j) => (
                            <li key={j} className="text-start">• {part}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {galleryPhotos.length > 0 && (
              <div className={`grid gap-3 ${galleryPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {galleryPhotos.map((url, i) => (
                  <img key={i} src={url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)]" />
                ))}
              </div>
            )}
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

        {/* Offre */}
        <section className="mt-12 p-6 rounded-3xl text-center text-white" style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}>
          {landing.offerTitle && <h2 className="text-2xl font-extrabold mb-2">{landing.offerTitle}</h2>}
          {landing.offerText && <p className="text-white/85 mb-4">{landing.offerText}</p>}
          <div className="flex items-baseline justify-center gap-3 mb-5">
            <span className="text-4xl font-extrabold">{fmt(product.price)}</span>
            {oldPrice > 0 && <span className="text-lg text-white/60 line-through">{fmt(oldPrice)}</span>}
          </div>
          {bundlePrice > 0 && (
            <p className="-mt-2 mb-5 font-bold text-lg">
              {t.pieces(2, isPhone)} : {fmt(bundlePrice)} <span className="text-white/70 text-sm">({t.save} {fmt(product.price * 2 - bundlePrice)})</span>
            </p>
          )}
          {giftName && <p className="-mt-2 mb-5 font-semibold">🎁 {giftName} {t.free}</p>}
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
            {summaryPhoto && <img src={summaryPhoto} alt="" className="w-16 h-16 rounded-xl object-cover border border-[var(--lp-border)]" />}
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
            <form noValidate onSubmit={handleSubmit} onFocus={trackCheckoutOnce} className="space-y-4">
              {isPhone && (
                <div data-invalid={err('model')}>
                  <label className={`block text-sm font-semibold mb-1 ${err('model') ? 'text-red-500' : ''}`}>{t.model} <span className="text-red-500">*</span></label>
                  <select
                    required
                    dir="ltr"
                    value={modelId}
                    onChange={(e) => { setModelId(e.target.value); setHint('') }}
                    className={`${fieldCls(err('model'))} text-start`}
                  >
                    <option value="">{t.chooseModel}</option>
                    {orderableModelIds.map((m) => (
                      <option key={m} value={m}>{getModelName(m)}</option>
                    ))}
                  </select>
                  {errMsg(err('model'), t.pickModel)}
                </div>
              )}

              {bundlePrice > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">{t.offer}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((n) => {
                      const price = n === 2 ? bundlePrice : product.price
                      const on = quantity === n
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { setQuantity(n); if (activeSlot >= n) setActiveSlot(0) }}
                          className={`relative px-3 pt-4 pb-3 rounded-2xl border-2 text-center transition-colors ${on ? 'border-[var(--lp-accent)] bg-[var(--lp-accent)]/10' : 'border-[var(--lp-border-strong)] bg-[var(--lp-surface)]'}`}
                        >
                          {n === 2 && (
                            <span className="absolute -top-2.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>
                              {t.popular}
                            </span>
                          )}
                          <span className="block font-bold">{t.pieces(n, isPhone)}</span>
                          <span className="block text-lg font-extrabold" style={{ color: accent }}>{fmt(price)}</span>
                          {n === 2 && product.price * 2 > bundlePrice && (
                            <span className="block text-xs text-green-600 font-bold">{t.save} {fmt(product.price * 2 - bundlePrice)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasDesigns && Array.from({ length: slotCount }, (_, slot) => {
                const chosen = designs.find((d) => d.id === designSlots[slot])
                const missing = showErrors && slotMissing(slot)
                return (
                  <div
                    key={slot}
                    data-invalid={missing}
                    onClick={() => setActiveSlot(slot)}
                    className={missing ? 'rounded-2xl p-2 -m-2 ring-2 ring-red-500/60' : ''}
                  >
                    <p className={`text-sm font-semibold mb-2 ${missing ? 'text-red-500' : ''}`}>
                      {landing.designLabel?.trim() || t.design}{slotCount > 1 ? ` ${slot + 1}` : ''} <span className="text-red-500">*</span>
                      {chosen && <span className="font-normal text-[var(--lp-faint)] ms-2">{chosen.name}</span>}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {designs.map((d) => {
                        const orderable = orderableColorIds.has(d.id)
                        const on = designSlots[slot] === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (orderable) pickDesign(d.id, slot) }}
                            disabled={!orderable}
                            title={orderable ? d.name : `${d.name} — ${t.designUnavailable}`}
                            className={`shrink-0 w-[72px] rounded-xl overflow-hidden border-2 transition-all ${
                              on ? 'border-[var(--lp-accent)] ring-2 ring-[var(--lp-accent)]/40' : orderable ? 'border-[var(--lp-border-strong)]' : 'border-[var(--lp-border)] opacity-30 cursor-not-allowed'
                            }`}
                          >
                            {designVisual(d, `w-full ${swatchesOnly ? 'aspect-square' : 'aspect-[3/4]'}`)}
                            <span className="block px-1 py-0.5 text-[10px] font-semibold truncate">{d.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {errMsg(missing, t.pickDesign)}
                  </div>
                )
              })}

              {colorOptions.length > 0 && (
                <div data-invalid={err('color')}>
                  <p className={`text-sm font-semibold mb-2 ${err('color') ? 'text-red-500' : ''}`}>
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
                  {errMsg(err('color'), t.pickColor)}
                </div>
              )}

              <div data-invalid={err('name')}>
                <label className={`block text-sm font-semibold mb-1 ${err('name') ? 'text-red-500' : ''}`}>{t.name}</label>
                <input type="text" required value={form.name} onChange={(e) => form.setName(e.target.value)} className={fieldCls(err('name'))} />
                {errMsg(err('name'))}
              </div>
              <div data-invalid={err('phone')}>
                <label className={`block text-sm font-semibold mb-1 ${err('phone') ? 'text-red-500' : ''}`}>{t.phone}</label>
                <input type="tel" required dir="ltr" value={form.phone} onChange={(e) => form.setPhone(e.target.value)} placeholder="05 XX XX XX XX" className={`${fieldCls(err('phone'))} text-start`} />
                {errMsg(err('phone'), form.phone.trim() ? t.badPhone : t.required)}
              </div>
              <div data-invalid={err('wilaya')}>
                <label className={`block text-sm font-semibold mb-1 ${err('wilaya') ? 'text-red-500' : ''}`}>{t.wilaya}</label>
                <select required value={form.wilaya} onChange={(e) => form.setWilaya(e.target.value)} className={fieldCls(err('wilaya'))}>
                  <option value="">{t.chooseWilaya}</option>
                  {WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                  ))}
                </select>
                {errMsg(err('wilaya'))}
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
                <div data-invalid={err('commune')}>
                  <label className={`block text-sm font-semibold mb-1 ${err('commune') ? 'text-red-500' : ''}`}>{t.commune}</label>
                  <select required value={form.commune} onChange={(e) => form.setCommune(e.target.value)} className={fieldCls(err('commune'))}>
                    <option value="">
                      {form.communesLoading ? t.loadingCommunes : form.communes.length === 0 ? t.noCommune : t.chooseCommune}
                    </option>
                    {form.communes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errMsg(err('commune'))}
                </div>
              )}
              {form.wilaya && form.deliveryType === 'yalidine' && (
                <div data-invalid={err('office')}>
                  <label className={`block text-sm font-semibold mb-1 ${err('office') ? 'text-red-500' : ''}`}>{t.office}</label>
                  <select
                    required
                    value={form.selectedStopdeskId}
                    onChange={(e) => form.selectStopdesk(e.target.value, e.target.options[e.target.selectedIndex]?.textContent ?? '')}
                    className={fieldCls(err('office'))}
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

              <div className={`flex items-center justify-between ${bundlePrice > 0 || packSize > 0 ? 'hidden' : ''}`}>
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
                  <span className="truncate">{displayTitle}{packSize ? '' : ` × ${quantity}`}</span>
                  <span className="shrink-0">{fmt(subtotal)}</span>
                </div>
                {(hasDesigns || modelId !== GENERAL_MODEL_ID) && (
                  <p className="text-xs text-[var(--lp-muted)]">
                    {[
                      modelId && modelId !== GENERAL_MODEL_ID ? getModelName(modelId) : '',
                      ...Array.from({ length: slotCount }, (_, i) => designs.find((d) => d.id === slotDesign(i))?.name ?? ''),
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {giftName && (
                  <div className="flex justify-between gap-2 font-semibold" style={{ color: accent }}>
                    <span className="truncate">🎁 {giftName}</span>
                    <span className="shrink-0">{t.free}</span>
                  </div>
                )}
                {modelId && includedNames.map((name) => (
                  <div key={name} className="flex justify-between gap-2 font-semibold">
                    <span className="truncate">✅ {name}</span>
                    <span className="shrink-0 text-[var(--lp-muted)]">{t.included}</span>
                  </div>
                ))}
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
                {form.isSubmitting ? t.sending : `${t.submit} · ${fmt(subtotal + (form.wilaya ? form.deliveryPrice : 0))}`}
              </button>
            </form>
          )}
        </section>

        {simple && trustStrip}

        {/* Questions fréquentes : lèvent les derniers doutes avant de commander */}
        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold mb-3">{t.faqTitle}</h2>
            <div className="space-y-2">
              {faq.map(({ q, a }, i) => (
                <details key={i} className="group rounded-2xl bg-[var(--lp-surface)] border border-[var(--lp-border)] p-4" open={i === 0}>
                  <summary className="font-bold cursor-pointer list-none flex justify-between gap-3">
                    {q}
                    <span className="shrink-0 transition-transform group-open:rotate-45" style={{ color: accent }}>＋</span>
                  </summary>
                  <p className="text-[var(--lp-muted)] text-sm mt-2 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Description en bas : le client a déjà tout vu plus haut, elle ne retarde plus le formulaire */}
        {product.description && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold mb-3">{t.description}</h2>
            <p className="text-[var(--lp-muted)] leading-relaxed whitespace-pre-line">{product.description}</p>
          </section>
        )}
      </main>

      <footer className="border-t border-[var(--lp-border)] py-6 px-4 text-center text-xs text-[var(--lp-faint)]">
        {landing.brandName && <p className="mb-1">© {new Date().getFullYear()} {landing.brandName}</p>}
        <Link to="/confidentialite" className="hover:text-[var(--lp-text)]">{t.privacy}</Link>
      </footer>

      {/* Barre fixe */}
      {available && !formVisible && !confirmed && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[var(--lp-bar)] backdrop-blur border-t border-[var(--lp-border)]">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <div className="shrink-0 leading-tight">
              <p className="text-lg font-extrabold" style={{ color: accent }}>{fmt(product.price)}</p>
              {oldPrice > 0 && <p className="text-xs text-[var(--lp-faint)] line-through">{fmt(oldPrice)}</p>}
            </div>
            <button
              type="button"
              onClick={scrollToForm}
              className="lp-pulse flex-1 py-3.5 rounded-2xl text-white font-extrabold text-lg shadow-xl"
              style={{ backgroundColor: accent }}
            >
              {ctaText}
            </button>
          </div>
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

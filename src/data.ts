// Modèles iPhone compatibles (pour filtrer les coques)
import { apiGetProducts, apiGetProduct, apiSaveProducts } from './api'

export const IPHONE_MODELS = [
  { id: 'iphone-11', name: 'iPhone 11', slug: 'iphone-11' },
  { id: 'iphone-11-pro', name: 'iPhone 11 Pro', slug: 'iphone-11-pro' },
  { id: 'iphone-11-pro-max', name: 'iPhone 11 Pro Max', slug: 'iphone-11-pro-max' },
  { id: 'iphone-12', name: 'iPhone 12', slug: 'iphone-12' },
  { id: 'iphone-12-pro', name: 'iPhone 12 Pro', slug: 'iphone-12-pro' },
  { id: 'iphone-12-pro-max', name: 'iPhone 12 Pro Max', slug: 'iphone-12-pro-max' },
  { id: 'iphone-13', name: 'iPhone 13', slug: 'iphone-13' },
  { id: 'iphone-13-pro', name: 'iPhone 13 Pro', slug: 'iphone-13-pro' },
  { id: 'iphone-13-pro-max', name: 'iPhone 13 Pro Max', slug: 'iphone-13-pro-max' },
  { id: 'iphone-14', name: 'iPhone 14', slug: 'iphone-14' },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', slug: 'iphone-14-pro' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', slug: 'iphone-14-pro-max' },
  { id: 'iphone-15', name: 'iPhone 15', slug: 'iphone-15' },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', slug: 'iphone-15-pro' },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max' },
  { id: 'iphone-16', name: 'iPhone 16', slug: 'iphone-16' },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', slug: 'iphone-16-pro' },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', slug: 'iphone-16-pro-max' },
  { id: 'iphone-17', name: 'iPhone 17', slug: 'iphone-17' },
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', slug: 'iphone-17-pro' },
  { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', slug: 'iphone-17-pro-max' },
] as const;

export type IPhoneModelId = (typeof IPHONE_MODELS)[number]['id'];

/**
 * iPhone proposés seulement par les landings qui les listent (anciens X → XS Max et modèles Plus),
 * pas dans le choix de modèle de la boutique, où il n'y a pas de coques pour eux.
 */
export const LEGACY_IPHONE_MODELS = [
  { id: 'iphone-x', name: 'iPhone X', slug: 'iphone-x' },
  { id: 'iphone-xr', name: 'iPhone XR', slug: 'iphone-xr' },
  { id: 'iphone-xs', name: 'iPhone XS', slug: 'iphone-xs' },
  { id: 'iphone-xs-max', name: 'iPhone XS Max', slug: 'iphone-xs-max' },
  { id: 'iphone-14-plus', name: 'iPhone 14 Plus', slug: 'iphone-14-plus' },
  { id: 'iphone-15-plus', name: 'iPhone 15 Plus', slug: 'iphone-15-plus' },
  { id: 'iphone-16-plus', name: 'iPhone 16 Plus', slug: 'iphone-16-plus' },
] as const;

/** Tous les iPhone dans l'ordre de sortie (les Plus juste après le modèle de base). */
export const ALL_IPHONE_MODELS: { id: string; name: string }[] = [
  ...LEGACY_IPHONE_MODELS.filter((m) => !m.id.endsWith('-plus')),
  ...IPHONE_MODELS.flatMap((m) => {
    const plus = LEGACY_IPHONE_MODELS.find((x) => x.id === `${m.id}-plus`)
    return plus ? [m, plus] : [m]
  }),
]

/** Ids de ALL_IPHONE_MODELS (sert aux plages « iphone-x..iphone-14-pro-max »). */
export const ALL_IPHONE_MODEL_IDS: string[] = ALL_IPHONE_MODELS.map((m) => m.id)

export const SAMSUNG_ULTRA_MODELS = [
  { id: 's21-ultra', name: 'Samsung S21 Ultra', slug: 's21-ultra' },
  { id: 's22-ultra', name: 'Samsung S22 Ultra', slug: 's22-ultra' },
  { id: 's23-ultra', name: 'Samsung S23 Ultra', slug: 's23-ultra' },
  { id: 's24-ultra', name: 'Samsung S24 Ultra', slug: 's24-ultra' },
  { id: 's25-ultra', name: 'Samsung S25 Ultra', slug: 's25-ultra' },
  { id: 's26-ultra', name: 'Samsung S26 Ultra', slug: 's26-ultra' },
] as const;

export type SamsungModelId = (typeof SAMSUNG_ULTRA_MODELS)[number]['id'];

/**
 * Produits généraux (hors téléphonie) : pas de choix de modèle. On utilise un modèle unique
 * « standard » pour garder la même logique de variantes / stock / commandes que les coques.
 */
export const GENERAL_MODEL_ID = 'standard'
export const GENERAL_MODEL_NAME = 'Modèle unique'

export type DeviceType = 'iphone' | 'samsung' | 'general'

/** compatibleWith d'un produit général (le type IPhoneModelId est historique). */
export function generalCompatibleWith(): IPhoneModelId[] {
  return [GENERAL_MODEL_ID] as unknown as IPhoneModelId[]
}

/** Nom lisible d'un modèle (iPhone, Samsung ou modèle unique d'un produit général). */
export function getModelName(modelId: string): string {
  if (modelId === GENERAL_MODEL_ID) return GENERAL_MODEL_NAME
  return (
    SAMSUNG_ULTRA_MODELS.find((m) => m.id === modelId)?.name ??
    IPHONE_MODELS.find((m) => m.id === modelId)?.name ??
    LEGACY_IPHONE_MODELS.find((m) => m.id === modelId)?.name ??
    modelId
  )
}

/** Contenu marketing de la landing page d'un produit général (chaque section vide est masquée). */
export interface ProductLandingContent {
  /** Langue de la page : 'ar' (arabe, de droite à gauche, par défaut) ou 'fr' */
  lang?: 'ar' | 'fr';
  /** Couleur principale (hex), ex. #3b82f6 */
  accentColor?: string;
  /** Thème de la page : 'light' (clair, par défaut) ou 'dark' (sombre, style sport) */
  theme?: 'light' | 'dark';
  /** Nom de marque affiché en haut (vide = aucun) */
  brandName?: string;
  /** Bandeau tout en haut (ex. « Commandez avant rupture de stock ») */
  topBanner?: string;
  /** Pastille au-dessus du titre */
  badge?: string;
  /** Partie du titre affichée en couleur sur la 2e ligne */
  headlineHighlight?: string;
  /** Sous-titre / accroche sous le titre */
  subtitle?: string;
  /** Pastille posée sur la photo principale (ex. « Live HD ») */
  heroBadge?: string;
  /** Titre de la section galerie photos */
  galleryTitle?: string;
  /** Titre de la section avantages */
  featuresTitle?: string;
  /** Avantages, une ligne chacun : « emoji | titre | texte » (ou juste un texte) */
  benefits?: string[];
  /** Titre et texte du bloc offre */
  offerTitle?: string;
  offerText?: string;
  /** Ancien prix barré (DA) */
  oldPrice?: number;
  /** Texte du bouton (défaut : « Commander maintenant » / « اطلب الآن ») */
  ctaText?: string;
  /** Motifs au choix (coques à motifs) : chaque motif est une variante (colorId = id) avec sa photo de la galerie */
  designs?: LandingDesign[];
  /** Prix total pour 2 articles (offre « 2 = prix réduit ») ; vide = pas d'offre */
  bundlePrice?: number;
  /** Cadeau ajouté à chaque commande (ex. « Incassable Magic HOCO Plus ») ; vide = aucun */
  gift?: string;
  /** Questions fréquentes, une ligne chacune : « question | réponse » */
  faq?: string[];
  /** Titre de la section des motifs et libellé du choix (ex. « اختار اللون » / « اللون » pour des couleurs) */
  designsTitle?: string;
  designLabel?: string;
  /** Détail des articles du pack (section galerie), une ligne chacun : « emoji | titre | texte » */
  packDetails?: string[];
  /** Ventes additionnelles proposées en case à cocher, une ligne chacune : « nom | prix » (DA) */
  crossSells?: string[];
  /** Pack : nombre fixe d'articles (ex. 2 coques) vendus au prix du produit, un motif/couleur par article */
  packSize?: number;
  /**
   * Articles inclus dans chaque commande, une ligne chacun : « nom | modèles ».
   * Modèles vides = pour tous ; sinon ids séparés par des virgules ou plage « iphone-x..iphone-14-pro-max ».
   */
  includes?: string[];
}

/** Un motif d'une coque : nom affiché et index de sa photo dans photoGallery. */
export interface LandingDesign {
  id: string;
  name: string;
  /** Index de la photo dans photoGallery (-1 = pas de photo : pastille de couleur) */
  photo: number;
  /** Couleur de la pastille quand le motif n'a pas de photo (ex. #1e3a8a) */
  hex?: string;
}

/** Développe « a..b » (plage dans l'ordre de sortie des iPhone) et les listes séparées par des virgules. */
export function expandModelList(spec: string): string[] {
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const [from, to] = part.split('..').map((x) => x.trim())
      if (!to) return [from]
      const i = ALL_IPHONE_MODEL_IDS.indexOf(from)
      const j = ALL_IPHONE_MODEL_IDS.indexOf(to)
      return i >= 0 && j >= i ? ALL_IPHONE_MODEL_IDS.slice(i, j + 1) : []
    })
}

/** Articles inclus (pack) pour un modèle donné : « nom | modèles » → noms qui s'appliquent à ce modèle. */
export function includedItemsFor(lines: string[] | undefined, modelId: string): string[] {
  return (lines ?? [])
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter(([name]) => name)
    .filter(([, models]) => !models || !modelId || expandModelList(models).includes(modelId))
    .map(([name]) => name)
}


/** Le produit a une landing page par sections (produit général, ou coque avec motifs). */
export function usesSectionLanding(p: { deviceType?: string; landing?: ProductLandingContent } | null | undefined): boolean {
  return isGeneralProduct(p) || (p?.landing?.designs?.length ?? 0) > 0
}

/** Nom d'une couleur ou d'un motif (motifs propres au produit, sinon couleurs ANTICHOC_COLORS). */
export function getColorName(colorId: string, product?: { landing?: ProductLandingContent } | null): string {
  if (!colorId) return ''
  return (
    product?.landing?.designs?.find((d) => d.id === colorId)?.name ||
    ANTICHOC_COLORS.find((c) => c.id === colorId)?.name ||
    colorId
  )
}

/** Une ligne d'avantage « emoji | titre | texte » → objet (tolère « titre » seul ou « titre | texte »). */
export function parseLandingBenefit(line: string): { icon: string; title: string; text: string } | null {
  const parts = line.split('|').map((x) => x.trim())
  if (!parts.some(Boolean)) return null
  if (parts.length >= 3) return { icon: parts[0], title: parts[1], text: parts.slice(2).join(' | ') }
  if (parts.length === 2) return { icon: '', title: parts[0], text: parts[1] }
  return { icon: '', title: parts[0], text: '' }
}

// Couleurs / designs des antichocs (stock à liquider)
export interface Antichoc {
  id: string;
  name: string; // titre
  description: string;
  price: number; // prix détail
  wholesalePrice?: number; // prix gros
  quantity?: number; // stock global (fallback si pas de variantStocks)
  /** Stock par variante (couleur + modèle) : clé "colorId|modelId" -> quantité */
  variantStocks?: Record<string, number>;
  /** Par variante : true = commandable même si stock 0 (disponible chez le fournisseur) */
  variantAvailableFromSupplier?: Record<string, boolean>;
  image: string; // emoji(s) ou pictogramme
  colorIds?: string[]; // couleurs sélectionnées (ids ANTICHOC_COLORS)
  photoUrl: string; // première photo (URL ou base64)
  photoGallery?: string[]; // plusieurs photos (la première = photoUrl si une seule)
  /** 'iphone' par défaut. Si 'samsung', utiliser compatibleWithSamsung. Si 'general', modèle unique GENERAL_MODEL_ID. */
  deviceType?: DeviceType;
  compatibleWith: IPhoneModelId[]; // modèles iPhone (si deviceType === 'iphone')
  compatibleWithSamsung?: SamsungModelId[]; // modèles Samsung (si deviceType === 'samsung')
  /** Contenu de landing page (produits généraux) */
  landing?: ProductLandingContent;
}

export function isGeneralProduct(p: { deviceType?: string } | null | undefined): boolean {
  return p?.deviceType === 'general'
}

/** Normalise un objet produit (API ou cache) pour avoir la forme Antichoc attendue par l'UI. */
export function normalizeProduct(p: Partial<Antichoc> | null): Antichoc | null {
  if (!p || typeof p !== 'object') return null
  const id = typeof p.id === 'string' ? p.id : String(p.id ?? '')
  const name = typeof p.name === 'string' ? p.name : String(p.name ?? '')
  const description = typeof p.description === 'string' ? p.description : String(p.description ?? '')
  const price = Number(p.price)
  const quantity = typeof p.quantity === 'number' ? p.quantity : 0
  const image = typeof p.image === 'string' ? p.image : String(p.image ?? '')
  const photoUrl = typeof p.photoUrl === 'string' ? p.photoUrl : String(p.photoUrl ?? '')
  const colorIds = Array.isArray(p.colorIds) ? p.colorIds.filter((x) => typeof x === 'string') : undefined
  const deviceType: DeviceType = p.deviceType === 'samsung' || p.deviceType === 'general' ? p.deviceType : 'iphone'
  const compatibleWith = deviceType === 'general'
    ? generalCompatibleWith()
    : Array.isArray(p.compatibleWith)
    ? p.compatibleWith.filter((x) => typeof x === 'string') as IPhoneModelId[]
    : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
  const compatibleWithSamsung = Array.isArray(p.compatibleWithSamsung)
    ? p.compatibleWithSamsung.filter((x) => typeof x === 'string') as SamsungModelId[]
    : (SAMSUNG_ULTRA_MODELS.map((m) => m.id) as SamsungModelId[])
  const photoGallery = Array.isArray(p.photoGallery) ? p.photoGallery.filter((x) => typeof x === 'string') : undefined
  const variantStocks =
    p.variantStocks && typeof p.variantStocks === 'object' && !Array.isArray(p.variantStocks)
      ? p.variantStocks
      : undefined
  const variantAvailableFromSupplier =
    p.variantAvailableFromSupplier &&
    typeof p.variantAvailableFromSupplier === 'object' &&
    !Array.isArray(p.variantAvailableFromSupplier)
      ? p.variantAvailableFromSupplier
      : undefined
  return {
    id,
    name,
    description,
    price: Number.isFinite(price) ? price : 0,
    wholesalePrice: typeof p.wholesalePrice === 'number' ? p.wholesalePrice : undefined,
    quantity,
    variantStocks,
    variantAvailableFromSupplier,
    image,
    colorIds: colorIds?.length ? colorIds : undefined,
    photoUrl,
    photoGallery: photoGallery?.length ? photoGallery : undefined,
    deviceType,
    compatibleWith: compatibleWith.length ? compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[]),
    compatibleWithSamsung: deviceType === 'samsung' && compatibleWithSamsung.length ? compatibleWithSamsung : undefined,
    landing: p.landing && typeof p.landing === 'object' ? p.landing : undefined,
  }
}

/** Clé unique pour une variante (couleur + modèle iPhone ou Samsung). */
export function variantKey(colorId: string, modelId: string): string {
  return `${colorId || ''}|${modelId}`
}

/** Retourne le stock pour une variante (couleur + modèle iPhone ou Samsung). */
export function getVariantStock(antichoc: Antichoc, colorId: string, modelId: string): number {
  const key = variantKey(colorId, modelId)
  if (antichoc.variantStocks && antichoc.variantStocks[key] !== undefined) {
    return Number(antichoc.variantStocks[key]) || 0
  }
  if (antichoc.variantStocks && antichoc.variantStocks[colorId] !== undefined) {
    return Number(antichoc.variantStocks[colorId]) || 0
  }
  return Number(antichoc.quantity) ?? 0
}

/** La variante est commandable si stock > 0 OU disponible chez le fournisseur. */
export function isVariantOrderable(antichoc: Antichoc, colorId: string, modelId: string): boolean {
  const stock = getVariantStock(antichoc, colorId, modelId)
  if (stock > 0) return true
  const key = variantKey(colorId, modelId)
  return antichoc.variantAvailableFromSupplier?.[key] === true
}

/** Au moins une variante du produit est commandable (pour un modèle iPhone donné). */
export function hasOrderableVariantForPhone(antichoc: Antichoc, phoneId: IPhoneModelId): boolean {
  const colorIds = antichoc.colorIds?.length ? antichoc.colorIds : ['']
  const phoneIds = antichoc.compatibleWith?.length ? antichoc.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
  if (!phoneIds.includes(phoneId)) return false
  return colorIds.some((cid) => isVariantOrderable(antichoc, cid, phoneId))
}

/** Au moins une variante du produit est commandable (pour un modèle Samsung donné). */
export function hasOrderableVariantForSamsung(antichoc: Antichoc, modelId: SamsungModelId): boolean {
  if (antichoc.deviceType !== 'samsung') return false
  const colorIds = antichoc.colorIds?.length ? antichoc.colorIds : ['']
  const modelIds = antichoc.compatibleWithSamsung?.length ? antichoc.compatibleWithSamsung : (SAMSUNG_ULTRA_MODELS.map((m) => m.id) as SamsungModelId[])
  if (!modelIds.includes(modelId)) return false
  return colorIds.some((cid) => isVariantOrderable(antichoc, cid, modelId))
}

/** Au moins une variante du produit est commandable (tous modèles confondus). */
export function hasAnyOrderableVariant(antichoc: Antichoc): boolean {
  if (antichoc.deviceType === 'samsung') {
    const modelIds = antichoc.compatibleWithSamsung?.length ? antichoc.compatibleWithSamsung : (SAMSUNG_ULTRA_MODELS.map((m) => m.id) as SamsungModelId[])
    return modelIds.some((mid) => hasOrderableVariantForSamsung(antichoc, mid))
  }
  const phoneIds = antichoc.compatibleWith?.length ? antichoc.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
  return phoneIds.some((pid) => hasOrderableVariantForPhone(antichoc, pid))
}

/** Variante à acheter chez le fournisseur : stock = 0 et disponible chez le fournisseur. Priorité au stock : si stock > 0 on n'achète pas. */
export function needToBuyVariantFromSupplier(
  antichoc: Antichoc,
  colorId: string,
  modelId: string,
): boolean {
  const stock = getVariantStock(antichoc, colorId, modelId)
  if (stock > 0) return false
  const key = variantKey(colorId, modelId)
  return antichoc.variantAvailableFromSupplier?.[key] === true
}

/** Variante bloquée : stock = 0 et pas disponible chez le fournisseur (impossible à honorer sans changer la commande). */
export function isVariantBlockedNoSupplier(
  antichoc: Antichoc,
  colorId: string,
  modelId: string,
): boolean {
  const stock = getVariantStock(antichoc, colorId, modelId)
  if (stock > 0) return false
  const key = variantKey(colorId, modelId)
  return antichoc.variantAvailableFromSupplier?.[key] !== true
}

/** Couleurs disponibles pour les antichocs (sélection dans l'admin) */
export const ANTICHOC_COLORS = [
  { id: 'noir-mat', name: 'Noir mat', emoji: '⬛', hex: '#1a1a1a' },
  { id: 'bleu-nuit', name: 'Bleu nuit', emoji: '🔵', hex: '#1e3a5f' },
  { id: 'bleu-ciel', name: 'Bleu ciel', emoji: '🩵', hex: '#7dd3fc' },
  { id: 'rouge', name: 'Rouge', emoji: '🔴', hex: '#b91c1c' },
  { id: 'orange', name: 'Orange', emoji: '🟠', hex: '#ea580c' },
  { id: 'vert-foret', name: 'Vert forêt', emoji: '🟢', hex: '#166534' },
  { id: 'transparent', name: 'Transparent', emoji: '🔲', hex: '#e5e5e5' },
  { id: 'gris', name: 'Gris', emoji: '⬜', hex: '#6b7280' },
  { id: 'lavande', name: 'Lavande', emoji: '🟣', hex: '#6b21a8' },
  { id: 'rose-gold', name: 'Rose gold', emoji: '🌸', hex: '#e8b4b8' },
  { id: 'camouflage', name: 'Camouflage', emoji: '🟫', hex: '#4a5568' },
] as const;

/** Libellé complet d’une ligne de commande : nom produit + variante (couleur, modèle iPhone) + offre si upsell. */
export function formatOrderItemLabel(item: {
  antichoc: { name: string; price?: number; landing?: ProductLandingContent }
  selectedColorId?: string
  selectedPhoneId?: string
  isUpsell?: boolean
}): string {
  const name = item.antichoc.name
  const colorName = item.selectedColorId ? getColorName(item.selectedColorId, item.antichoc) : ''
  const phoneName = item.selectedPhoneId && item.selectedPhoneId !== GENERAL_MODEL_ID
    ? getModelName(item.selectedPhoneId)
    : ''
  const variant = [colorName, phoneName].filter(Boolean).join(' — ')
  const suffix = item.isUpsell ? (item.antichoc.price === 0 ? ' (offert)' : ' (offre -50%)') : ''
  return variant ? `${name} — ${variant}${suffix}` : `${name}${suffix}`
}

type OrderLineItem = Parameters<typeof formatOrderItemLabel>[0] & { antichoc: { id: string; price?: number } }

/** Nom court d'un article offert / inclus, pour la ligne groupée (ex. « incassable + câble Lightning »). */
function shortExtraName(name: string): string {
  if (/زجاج|incassable|verre|glass/i.test(name)) return 'incassable'
  if (/lightning/i.test(name)) return 'câble Lightning'
  if (/type-?c/i.test(name)) return 'câble Type-C'
  return name
}

/**
 * Lignes d'une commande pour l'affichage (admin, confirmateur, Yalidine) : les articles identiques
 * d'un même modèle (pack, offre 2) et les articles offerts qui suivent sont regroupés sur une ligne :
 * « Produit — iPhone 14 Pro Max — Couleur 1 — Couleur 2 — incassable + câble Lightning ».
 */
export function groupOrderLines(items: OrderLineItem[]): { label: string; price: number }[] {
  const lines: { label: string; price: number }[] = []
  let i = 0
  while (i < items.length) {
    const first = items[i]
    if (first.isUpsell || !first.selectedPhoneId) {
      lines.push({ label: formatOrderItemLabel(first), price: Number(first.antichoc.price) || 0 })
      i++
      continue
    }
    const group = [first]
    while (
      i + group.length < items.length &&
      !items[i + group.length].isUpsell &&
      items[i + group.length].antichoc.id === first.antichoc.id &&
      items[i + group.length].selectedPhoneId === first.selectedPhoneId
    ) group.push(items[i + group.length])
    const extras: OrderLineItem[] = []
    while (
      i + group.length + extras.length < items.length &&
      items[i + group.length + extras.length].isUpsell &&
      Number(items[i + group.length + extras.length].antichoc.price) === 0 &&
      items[i + group.length + extras.length].selectedPhoneId === first.selectedPhoneId
    ) extras.push(items[i + group.length + extras.length])
    if (group.length === 1 && extras.length === 0) {
      lines.push({ label: formatOrderItemLabel(first), price: Number(first.antichoc.price) || 0 })
      i++
      continue
    }
    const model = first.selectedPhoneId !== GENERAL_MODEL_ID ? getModelName(first.selectedPhoneId) : ''
    const variants = group.map((it) => (it.selectedColorId ? getColorName(it.selectedColorId, it.antichoc) : '')).filter(Boolean)
    const extrasText = extras.map((it) => shortExtraName(it.antichoc.name)).join(' + ')
    const parts = [group.length > 1 && !variants.length ? `${first.antichoc.name} × ${group.length}` : first.antichoc.name, model, ...variants, extrasText]
    lines.push({
      label: parts.filter(Boolean).join(' — '),
      price: group.reduce((sum, it) => sum + (Number(it.antichoc.price) || 0), 0),
    })
    i += group.length + extras.length
  }
  return lines
}

const colors = ANTICHOC_COLORS
const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id)

// Générer un catalogue d'antichocs.
// Chaque design (couleur) est un produit qui peut exister sur plusieurs modèles d'iPhone (collections).
export const ANTICHOCS: Antichoc[] = colors.map((c, i) => ({
  id: `antichoc-${c.name.replace(/\s/g, '-').toLowerCase()}-${i}`,
  name: `Coque ${c.name}`,
  description: `Coque antichoc ${c.name} avec bords renforcés et protection 360° pour votre iPhone.`,
  price: 2900,
  wholesalePrice: 0,
  quantity: 0,
  image: c.emoji,
  photoUrl: '',
  // Par défaut : disponible pour tous les modèles. L'admin peut ensuite limiter par collection si besoin.
  compatibleWith: allIphoneIds,
}));

let productsCache: Antichoc[] | null = null

export async function loadProducts(): Promise<Antichoc[]> {
  if (productsCache != null) return productsCache.length ? productsCache : ANTICHOCS
  try {
    productsCache = await apiGetProducts()
    return productsCache.length ? productsCache : ANTICHOCS
  } catch {
    productsCache = ANTICHOCS
    return ANTICHOCS
  }
}

export function getStoredProducts(): Antichoc[] | null {
  return productsCache
}

export async function saveProducts(products: Antichoc[]): Promise<void> {
  await apiSaveProducts(products)
  productsCache = products
}

function getCatalog(): Antichoc[] {
  return productsCache ?? ANTICHOCS
}

export function getAntichocsForPhone(phoneId: IPhoneModelId): Antichoc[] {
  return getCatalog().filter(
    (a) =>
      a.deviceType !== 'samsung' &&
      // Coques à motifs : vendues uniquement par leur landing page (choix du motif avec photo)
      !usesSectionLanding(a) &&
      (a.compatibleWith && Array.isArray(a.compatibleWith) ? a.compatibleWith : []).includes(phoneId) &&
      hasOrderableVariantForPhone(a, phoneId),
  )
}

export function getAntichocsForSamsung(modelId: SamsungModelId): Antichoc[] {
  return getCatalog().filter(
    (a) =>
      a.deviceType === 'samsung' &&
      !usesSectionLanding(a) &&
      (a.compatibleWithSamsung && a.compatibleWithSamsung.length ? a.compatibleWithSamsung : []).includes(modelId) &&
      hasOrderableVariantForSamsung(a, modelId),
  )
}

export function getAllAntichocs(): Antichoc[] {
  return getCatalog()
}

export function getAntichocById(id: string): Antichoc | null {
  return getCatalog().find((a) => a.id === id) ?? null
}

/**
 * Récupère un seul produit sans télécharger tout le catalogue.
 * Utilise le cache s'il est déjà chargé, sinon appelle l'API produit unique,
 * et retombe sur le chargement complet en dernier recours.
 */
export async function fetchProductById(id: string): Promise<Antichoc | null> {
  const cached = productsCache?.find((a) => a.id === id)
  if (cached) return cached
  const single = await apiGetProduct(id).catch(() => null)
  if (single) return single
  await loadProducts()
  return getAntichocById(id)
}

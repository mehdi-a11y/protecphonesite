// Modèles iPhone compatibles (pour filtrer les coques)
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

// Couleurs / designs des antichocs (stock à liquider)
export interface Antichoc {
  id: string;
  name: string; // titre
  description: string;
  price: number; // prix détail
  wholesalePrice?: number; // prix gros
  quantity?: number; // stock global (fallback si pas de variantStocks)
  /** Stock par variante (couleur + iPhone) : clé "colorId|phoneId" -> quantité */
  variantStocks?: Record<string, number>;
  /** Par variante : true = commandable même si stock 0 (disponible chez le fournisseur) */
  variantAvailableFromSupplier?: Record<string, boolean>;
  image: string; // emoji(s) ou pictogramme
  colorIds?: string[]; // couleurs sélectionnées (ids ANTICHOC_COLORS)
  photoUrl: string; // première photo (URL ou base64)
  photoGallery?: string[]; // plusieurs photos (la première = photoUrl si une seule)
  compatibleWith: IPhoneModelId[]; // modèles d'iPhone compatibles
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
  const compatibleWith = Array.isArray(p.compatibleWith)
    ? p.compatibleWith.filter((x) => typeof x === 'string') as IPhoneModelId[]
    : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
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
    compatibleWith: compatibleWith.length ? compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[]),
  }
}

/** Clé unique pour une variante (couleur + modèle iPhone). */
export function variantKey(colorId: string, phoneId: IPhoneModelId): string {
  return `${colorId || ''}|${phoneId}`
}

/** Retourne le stock pour une variante (couleur + iPhone). */
export function getVariantStock(antichoc: Antichoc, colorId: string, phoneId: IPhoneModelId): number {
  const key = variantKey(colorId, phoneId)
  if (antichoc.variantStocks && antichoc.variantStocks[key] !== undefined) {
    return Number(antichoc.variantStocks[key]) || 0
  }
  if (antichoc.variantStocks && antichoc.variantStocks[colorId] !== undefined) {
    return Number(antichoc.variantStocks[colorId]) || 0
  }
  return Number(antichoc.quantity) ?? 0
}

/** La variante est commandable si stock > 0 OU disponible chez le fournisseur. */
export function isVariantOrderable(antichoc: Antichoc, colorId: string, phoneId: IPhoneModelId): boolean {
  const stock = getVariantStock(antichoc, colorId, phoneId)
  if (stock > 0) return true
  const key = variantKey(colorId, phoneId)
  return antichoc.variantAvailableFromSupplier?.[key] === true
}

/** Au moins une variante du produit est commandable (pour un modèle iPhone donné). */
export function hasOrderableVariantForPhone(antichoc: Antichoc, phoneId: IPhoneModelId): boolean {
  const colorIds = antichoc.colorIds?.length ? antichoc.colorIds : ['']
  const phoneIds = antichoc.compatibleWith?.length ? antichoc.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
  if (!phoneIds.includes(phoneId)) return false
  return colorIds.some((cid) => isVariantOrderable(antichoc, cid, phoneId))
}

/** Au moins une variante du produit est commandable (tous modèles confondus). */
export function hasAnyOrderableVariant(antichoc: Antichoc): boolean {
  const phoneIds = antichoc.compatibleWith?.length ? antichoc.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
  return phoneIds.some((pid) => hasOrderableVariantForPhone(antichoc, pid))
}

/** Variante à acheter chez le fournisseur : stock = 0 et disponible chez le fournisseur. Priorité au stock : si stock > 0 on n'achète pas. */
export function needToBuyVariantFromSupplier(
  antichoc: Antichoc,
  colorId: string,
  phoneId: IPhoneModelId,
): boolean {
  const stock = getVariantStock(antichoc, colorId, phoneId)
  if (stock > 0) return false
  const key = variantKey(colorId, phoneId)
  return antichoc.variantAvailableFromSupplier?.[key] === true
}

/** Variante bloquée : stock = 0 et pas disponible chez le fournisseur (impossible à honorer sans changer la commande). */
export function isVariantBlockedNoSupplier(
  antichoc: Antichoc,
  colorId: string,
  phoneId: IPhoneModelId,
): boolean {
  const stock = getVariantStock(antichoc, colorId, phoneId)
  if (stock > 0) return false
  const key = variantKey(colorId, phoneId)
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
  antichoc: { name: string }
  selectedColorId?: string
  selectedPhoneId?: string
  isUpsell?: boolean
}): string {
  const name = item.antichoc.name
  const colorName = item.selectedColorId
    ? ANTICHOC_COLORS.find((c) => c.id === item.selectedColorId)?.name ?? item.selectedColorId
    : ''
  const phoneName = item.selectedPhoneId
    ? IPHONE_MODELS.find((m) => m.id === item.selectedPhoneId)?.name ?? item.selectedPhoneId
    : ''
  const variant = [colorName, phoneName].filter(Boolean).join(' — ')
  const suffix = item.isUpsell ? ' (offre -50%)' : ''
  return variant ? `${name} — ${variant}${suffix}` : `${name}${suffix}`
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
  try {
    const { apiGetProducts } = await import('./api')
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
  const { apiSaveProducts } = await import('./api')
  await apiSaveProducts(products)
  productsCache = products
}

function getCatalog(): Antichoc[] {
  return productsCache ?? ANTICHOCS
}

export function getAntichocsForPhone(phoneId: IPhoneModelId): Antichoc[] {
  return getCatalog().filter((a) => (a.compatibleWith && Array.isArray(a.compatibleWith) ? a.compatibleWith : []).includes(phoneId))
}

export function getAllAntichocs(): Antichoc[] {
  return getCatalog()
}

export function getAntichocById(id: string): Antichoc | null {
  return getCatalog().find((a) => a.id === id) ?? null
}

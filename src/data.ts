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
  /** Stock par variante (couleur) : colorId -> quantité */
  variantStocks?: Record<string, number>;
  image: string; // emoji(s) ou pictogramme
  colorIds?: string[]; // couleurs sélectionnées (ids ANTICHOC_COLORS)
  photoUrl: string; // première photo (URL ou base64)
  photoGallery?: string[]; // plusieurs photos (la première = photoUrl si une seule)
  compatibleWith: IPhoneModelId[]; // modèles d'iPhone compatibles
}

/** Retourne le stock pour une variante (couleur). Si variantStocks[colorId] défini, l'utiliser ; sinon quantity. */
export function getVariantStock(antichoc: Antichoc, colorId: string): number {
  if (antichoc.variantStocks && antichoc.variantStocks[colorId] !== undefined) {
    return Number(antichoc.variantStocks[colorId]) || 0
  }
  return Number(antichoc.quantity) ?? 0
}

/** Couleurs disponibles pour les antichocs (sélection dans l'admin) */
export const ANTICHOC_COLORS = [
  { id: 'noir-mat', name: 'Noir mat', emoji: '⬛', hex: '#1a1a1a' },
  { id: 'bleu-nuit', name: 'Bleu nuit', emoji: '🔵', hex: '#1e3a5f' },
  { id: 'rouge', name: 'Rouge', emoji: '🔴', hex: '#b91c1c' },
  { id: 'vert-foret', name: 'Vert forêt', emoji: '🟢', hex: '#166534' },
  { id: 'transparent', name: 'Transparent', emoji: '🔲', hex: '#e5e5e5' },
  { id: 'lavande', name: 'Lavande', emoji: '🟣', hex: '#6b21a8' },
  { id: 'rose-gold', name: 'Rose gold', emoji: '🌸', hex: '#e8b4b8' },
  { id: 'camouflage', name: 'Camouflage', emoji: '🟫', hex: '#4a5568' },
] as const;

const colors = ANTICHOC_COLORS;

const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id);

/** Produit upsell : protecteur d'écran incassable (affiché sur la page produit, -50% en offre). */
export const SCREEN_PROTECTOR_UPSELL: Antichoc = {
  id: 'upsell-protecteur-ecran-incassable',
  name: "Protecteur d'écran incassable",
  description: 'Protection en verre trempé, résistant aux chocs.',
  price: 1200,
  wholesalePrice: 0,
  quantity: 0,
  image: '🛡️',
  photoUrl: '',
  compatibleWith: [...allIphoneIds],
};

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
  return getCatalog().filter((a) => a.compatibleWith.includes(phoneId))
}

export function getAllAntichocs(): Antichoc[] {
  return getCatalog()
}

export function getAntichocById(id: string): Antichoc | null {
  return getCatalog().find((a) => a.id === id) ?? null
}

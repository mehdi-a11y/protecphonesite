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
  quantity?: number; // stock disponible
  image: string; // emoji ou pictogramme
  photoUrl: string; // vraie photo (URL) si disponible
  compatibleWith: IPhoneModelId[]; // collections (modèles d'iPhone)
}

const colors = [
  { name: 'Noir mat', emoji: '⬛', hex: '#1a1a1a' },
  { name: 'Bleu nuit', emoji: '🔵', hex: '#1e3a5f' },
  { name: 'Rouge', emoji: '🔴', hex: '#b91c1c' },
  { name: 'Vert forêt', emoji: '🟢', hex: '#166534' },
  { name: 'Transparent', emoji: '🔲', hex: '#e5e5e5' },
  { name: 'Lavande', emoji: '🟣', hex: '#6b21a8' },
  { name: 'Rose gold', emoji: '🌸', hex: '#e8b4b8' },
  { name: 'Camouflage', emoji: '🟫', hex: '#4a5568' },
];

const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id);

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

const PRODUCTS_KEY = 'protecphone_products'

export function getStoredProducts(): Antichoc[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProducts(products: Antichoc[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}

function getCatalog(): Antichoc[] {
  const stored = getStoredProducts()
  return stored ?? ANTICHOCS
}

export function getAntichocsForPhone(phoneId: IPhoneModelId): Antichoc[] {
  return getCatalog().filter((a) => a.compatibleWith.includes(phoneId))
}

export function getAllAntichocs(): Antichoc[] {
  return getCatalog()
}

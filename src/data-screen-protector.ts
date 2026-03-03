import { IPHONE_MODELS } from './data'
import type { Antichoc, IPhoneModelId } from './data'

/** Produit upsell : protecteur d'écran incassable (affiché sur la page produit). Retourné par une fonction pour éviter les erreurs d'ordre d'initialisation (Cannot access 'S' before initialization). */
export function getScreenProtectorUpsell(): Antichoc {
  const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id)
  return {
    id: 'upsell-protecteur-ecran-incassable',
    name: "Protecteur d'écran incassable",
    description: 'Protection en verre trempé, résistant aux chocs.',
    price: 900,
    wholesalePrice: 0,
    quantity: 0,
    image: '🛡️',
    photoUrl: '',
    compatibleWith: [...allIphoneIds],
  }
}

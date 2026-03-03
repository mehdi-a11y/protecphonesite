import { IPHONE_MODELS } from './data'
import type { Antichoc, IPhoneModelId } from './data'

const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id)

/** Produit upsell : protecteur d'écran incassable (affiché sur la page produit). */
export const SCREEN_PROTECTOR_UPSELL: Antichoc = {
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

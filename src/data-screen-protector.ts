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

/**
 * Produit upsell : portefeuille magnétique Spigen Smart Fold (MagSafe).
 * Actuellement ajouté en upsell “toujours disponible” (comme l’upsell écran) côté UI.
 */
export function getSmartFoldUpsell(): Antichoc {
  const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id)
  return {
    id: 'upsell-spigen-smart-fold',
    name: 'Portefeuille magnétique Spigen Smart Fold',
    description: 'Compatible MagSafe. Avec support intégré.',
    // TODO: si tu as un prix différent, dis-moi et je l’ajuste.
    price: 2500,
    wholesalePrice: 0,
    quantity: 0,
    // On affiche la photo fournie (au lieu d'une icône texte).
    image: '',
    photoUrl: '/smart-fold-upsell.png',
    compatibleWith: [...allIphoneIds],
  }
}

/** Produit upsell : Nano Pop Silicone phone holder (Spigen). */
export function getNanoPopUpsell(): Antichoc {
  const allIphoneIds: IPhoneModelId[] = IPHONE_MODELS.map((m) => m.id)
  return {
    id: 'upsell-spigen-nano-pop',
    name: 'Nano Pop silicone phone holder Spigen',
    description: 'Support anneau en silicone. Compatible MagSafe.',
    price: 1800,
    wholesalePrice: 0,
    quantity: 0,
    image: '',
    photoUrl: '/nano-pop-upsell.png',
    compatibleWith: [...allIphoneIds],
  }
}

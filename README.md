# ProtecPhone — Site e-commerce liquidation antichocs iPhone

Site de liquidation de stock d’antichocs iPhone avec parcours : choix du modèle iPhone → choix de la coque → commande en **paiement à la livraison (COD)** et **upsell -50%** sur un 2ᵉ antichoc.

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173).

## Parcours client

1. **Accueil** — Message de liquidation, CTA « Choisir mon iPhone ».
2. **Choix iPhone** — Liste des modèles (15, 14, 13, 12, SE). Clic → voir les coques compatibles.
3. **Choix antichoc** — Grille des coques (couleurs) pour le modèle choisi. Sélection puis « Commander ».
4. **Checkout COD** — Formulaire (nom, téléphone, adresse, ville) + **offre upsell** : « 2ᵉ antichoc à -50% » (Oui / Non). Total mis à jour. Bouton « Confirmer la commande (COD) ».
5. **Confirmation** — Numéro de commande affiché, option « Passer une nouvelle commande ».

## Espace administrateur

- **URL** : [http://localhost:5173/admin](http://localhost:5173/admin) (ou lien « Admin » en bas de la page d’accueil).
- **Mot de passe par défaut** : `admin` (modifiable dans `src/types.ts` → `ADMIN_PASSWORD`).
- **Commandes** : liste des commandes en attente et confirmées ; bouton « Confirmer » pour valider une commande (COD).
- **Produits** : liste des antichocs par modèle iPhone ; modification du nom et du prix, puis « Enregistrer ». « Réinitialiser » remet le catalogue par défaut.

Les commandes et les modifications de produits sont stockées dans le navigateur (localStorage) ; en production, il faudra un backend pour les persister.

## Données

- Modèles : `src/data.ts` → `IPHONE_MODELS`, `ANTICHOCS`.
- Prix et couleurs des coques : modifiables dans `src/data.ts` ou depuis l’admin.
- Pour brancher un vrai backend : envoyer le panier + les infos formulaire depuis `CheckoutStep` (et stocker la commande côté serveur).

## Build production

```bash
npm run build
```

Les fichiers sont générés dans `dist/`.

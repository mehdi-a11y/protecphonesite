# Utiliser ton numéro algérien comme expéditeur WhatsApp (Twilio)

Pour envoyer les messages de confirmation depuis **ton** numéro (+213...) au lieu du Sandbox, il faut enregistrer ce numéro comme **expéditeur WhatsApp** dans Twilio. Voici les étapes principales.

---

## Sender « Offline » : comment le remettre Online

Si ton expéditeur WhatsApp affiche **Offline** dans Twilio, ce n’est pas un bouton à cliquer : le statut est décidé par **Meta** (WhatsApp). Voici quoi faire :

### 1. Vérifier dans Twilio
- Clique sur **Edit Sender** à côté du numéro Offline.
- Regarde s’il y a un message ou une étape en attente (ex. « Pending verification », « Complete registration »).
- Si une action est demandée (vérification du numéro, code SMS, etc.), fais-la.

### 2. Vérifier dans Meta (Facebook Business)
- Va sur [business.facebook.com](https://business.facebook.com) → **Paramètres** (ou **Business Settings**).
- Section **Sécurité** / **Security Center** : vérifie si la **vérification de l’entreprise** (Business verification) est demandée ou en attente. Si oui, envoie les documents demandés.
- Vérifie les **notifications** / **Alertes** : Meta peut indiquer un problème sur le compte WhatsApp Business (WABA) ou demander une action.

### 3. Causes fréquentes d’« Offline »
- **Inscription pas terminée** : numéro pas encore vérifié (code SMS/appel), ou étape Meta non validée → termine toutes les étapes dans Twilio et Meta.
- **Vérification entreprise incomplète** : Meta exige la vérification du business pour certains usages → complète dans Security Center.
- **Compte WABA désactivé par Meta** : en cas de non-respect des règles (spam, contenu interdit, etc.) → consulte les notifications Meta et les règles WhatsApp Business ; un recours peut être possible.

### 4. En attendant : utiliser le Sandbox
Tant que le sender reste Offline, tu ne peux pas l’utiliser comme `From`. Pour que les messages partent quand même, utilise le **Sandbox** :
- Dans Render ou `.env` : `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`
- Les destinataires doivent avoir envoyé **join xxx-xxx-xxx** au numéro du Sandbox.

---

## Nom affiché (display name) uniquement

Si tu veux seulement que les clients voient un **nom d’entreprise** (ex. « ProtecPhone ») au lieu du numéro :

- Le **nom affiché** se configure dans **Twilio** ou **Meta Business**, pas dans le code du site.
- **Sandbox** : dans la Console Twilio → **Messaging** → **Senders** → ton expéditeur WhatsApp → tu peux renseigner le profil (description, etc.). Le nom peut être défini à l’inscription ou via le profil WhatsApp Business.
- **Numéro enregistré (Self Sign-up)** : au moment de l’enregistrement du numéro, Meta demande un **display name** (nom d’affichage). C’est ce nom que le destinataire voit.
- Pour **modifier** le nom affiché après coup, il faut souvent passer par un ticket support Twilio ; WhatsApp limite les changements (ex. une fois par 30 jours).

Aucun changement n’est nécessaire dans le projet : le site envoie toujours via `TWILIO_WHATSAPP_FROM` ; le nom affiché côté client est géré par Twilio/Meta.

---

## 1. Prérequis

- **Compte Twilio** (idéalement passé en compte payant pour la prod).
- **Meta Business** : tu dois avoir un [Meta Business Portfolio](https://business.facebook.com) (compte professionnel Facebook) avec des droits administrateur.
- **Numéro algérien** :
  - capable de recevoir **SMS ou appels** (Meta envoie un code de vérification),
  - pas déjà enregistré comme expéditeur WhatsApp Business ailleurs,
  - de préférence dédié à ton activité (pas un numéro déjà utilisé sur WhatsApp perso sans migration).

---

## 2. Où faire l’enregistrement dans Twilio

1. Connecte-toi à [Twilio Console](https://console.twilio.com).
2. Menu **Messaging** → **Senders** (ou **Try it out** → **Send a WhatsApp message** selon l’interface).
3. Cherche une option du type **« Register your own WhatsApp sender »**, **« Self Sign-up »** ou **« Add WhatsApp sender »**.
4. Suis le flux **Self Sign-up** pour enregistrer ton **premier** expéditeur (ton numéro algérien).

---

## 3. Étapes typiques du Self Sign-up

Twilio et Meta te guident pas à pas. En général :

1. **Lier Meta Business**  
   Tu connectes ton compte Meta Business (Facebook) à Twilio pour WhatsApp.

2. **Choisir ou ajouter un numéro**  
   Tu indiques le numéro à utiliser (ex. +213 783 923 072). Ce numéro doit pouvoir **recevoir un SMS ou un appel** pour le code de vérification Meta.

3. **Vérification par Meta**  
   Meta envoie un code (SMS ou voix) sur ce numéro. Tu le saisis dans l’assistant.

4. **Validation et approbation**  
   Une fois vérifié, le numéro est enregistré comme expéditeur WhatsApp. Il peut prendre un peu de temps (quelques minutes à quelques heures) pour être actif.

5. **Templates de message**  
   Pour les messages « business-initiated » (tu envoies le premier), Meta exige des **templates approuvés**. Tu as déjà un template (ex. `order_confirmation`) ; assure-toi qu’il est bien approuvé et associé à ce numéro/sender.

---

## 4. Après l’enregistrement

Quand ton numéro est accepté comme expéditeur WhatsApp dans Twilio :

- Dans **Render** (ou ton `.env`), mets :
  ```env
  TWILIO_WHATSAPP_FROM=whatsapp:+213783923072
  ```
  (avec ton vrai numéro, sans espace).

- Redémarre ou redéploie ton app. Les messages de confirmation partiront depuis ton numéro algérien.

---

## 5. Liens utiles

- [Twilio : Register your own phone number for WhatsApp](https://help.twilio.com/articles/360052171393)
- [Twilio : Self Sign-up pour les expéditeurs WhatsApp](https://www.twilio.com/docs/whatsapp/self-sign-up)
- [Twilio : Senders API (pour enregistrements supplémentaires)](https://www.twilio.com/docs/whatsapp/register-senders-using-api)

---

## 6. Erreur « This phone number is already registered to a WhatsApp account »

Si Meta affiche ce message, ton numéro est **déjà utilisé** sur WhatsApp (app perso ou Business app). Tu as deux options :

### Option A : Migrer ce numéro (tu perds l’usage sur l’app)

Pour utiliser **le même numéro** avec Twilio (API uniquement) :

1. **Supprimer le compte WhatsApp** qui utilise ce numéro :
   - Sur l’app WhatsApp : **Paramètres** → **Compte** → **Supprimer mon compte** (ou équivalent).
   - Le numéro est alors libéré pour l’API (Meta indique que ça peut prendre jusqu’à **3 minutes**).
2. Attendre quelques minutes, puis **recommencer l’enregistrement** du numéro dans Twilio (Self Sign-up).
3. Après migration, ce numéro ne pourra plus servir sur l’app WhatsApp classique : il sera utilisé **uniquement** via l’API (messages envoyés par ton site).

### Option B : Utiliser un autre numéro

- Prendre un **nouveau numéro** (une autre ligne) qui **n’est pas** (ou plus) inscrit sur WhatsApp.
- Enregistrer **ce** numéro comme expéditeur dans Twilio.
- Utiliser ce numéro dans `TWILIO_WHATSAPP_FROM=whatsapp:+213XXXXXXXXX`.

Tu gardes ton numéro actuel sur l’app et tu envoies les confirmations depuis le second numéro.

---

## 7. Si tu restes en Sandbox

Sans enregistrer ton numéro, tu restes avec le **Sandbox** :
- **From** = `whatsapp:+14155238886` (numéro Twilio Sandbox).
- Chaque destinataire doit avoir envoyé **`join xxx-xxx-xxx`** au Sandbox pour recevoir des messages.
- La livraison vers l’international (ex. Algérie) peut être moins fiable.

Pour une utilisation sérieuse avec tes vrais clients en Algérie, enregistrer ton numéro (+213...) comme expéditeur est la bonne solution.

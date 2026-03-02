# WhatsApp — quoi faire maintenant (étapes claires)

Tu veux que les **clients reçoivent la confirmation** sans avoir à envoyer « join » à personne. Voici l’ordre des étapes.

---

## Où tu en es

- Ton site envoie déjà la requête à Twilio (log « Message envoyé avec succès »).
- Avec le **Sandbox**, les clients doivent envoyer « join » → pas pratique.
- Pour que ça marche sans « join », il faut **un numéro WhatsApp Business** enregistré et **Online** dans Twilio, dans le **même WABA** que tu as déjà (ID **942713845079592**).

---

## Option A : Tu as un deuxième numéro (pas sur WhatsApp)

1. Va dans **Twilio** → **Messaging** → **WhatsApp Senders**.
2. Clique sur **Create new sender** (ou **Register**).
3. Quand on te demande **quel compte WhatsApp Business (WABA)** utiliser :
   - **Choisis le compte existant** dont l’ID est **942713845079592**.
   - Ne crée pas de nouveau compte.
4. Saisis le **numéro** (la 2ᵉ ligne, celle qui n’est pas sur WhatsApp).
5. Suis les étapes (vérification par SMS/appel, etc.) jusqu’à la fin.
6. Quand le sender est **Online**, dans **Render** (Environment) mets :
   ```env
   TWILIO_WHATSAPP_FROM=whatsapp:+213XXXXXXXXX
   ```
   (ton 2ᵉ numéro avec indicatif 213).
7. Redéploie. Les clients recevront les messages sans rien envoyer.

---

## Option B : Tu veux utiliser ton numéro actuel (+213…)

1. **Sur ton téléphone** (app WhatsApp) : supprime le **compte WhatsApp** qui utilise ce numéro  
   (Paramètres → Compte → Supprimer mon compte).
2. Attends **2–3 minutes**.
3. Dans **Twilio** → **WhatsApp Senders** → **Create new sender**.
4. Quand on te demande le **WABA** : choisis **942713845079592** (ne crée pas de nouveau).
5. Saisis **ton numéro** (+213…). Meta enverra un code par SMS ou appel pour vérifier.
6. Valide tout jusqu’à ce que le sender soit **Online**.
7. Dans **Render** : `TWILIO_WHATSAPP_FROM=whatsapp:+213XXXXXXXXX` (ce numéro).
8. Redéploie.

Attention : ce numéro ne pourra **plus** servir sur l’app WhatsApp normale, seulement via l’API (ton site).

---

## Option C : Tu restes avec le Sandbox pour l’instant

- Garde `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`.
- Pour chaque numéro qui doit recevoir un message, il faut qu’il envoie **join xxx-xxx-xxx** au +1 415 523 8886 (code sur la page Sandbox Twilio).
- Pas pratique pour de vrais clients, mais ça marche pour tester.

---

## Récap

| Tu veux… | Tu fais |
|----------|--------|
| Que les clients reçoivent sans rien faire | Option A (2ᵉ numéro) ou B (migrer ton numéro). **Toujours** sélectionner le WABA **942713845079592** à l’inscription. |
| Juste tester | Option C (Sandbox + « join » pour chaque destinataire de test). |

L’erreur « ensure you select WABA 942713845079592 » veut dire : à l’étape où on te demande de choisir un compte WhatsApp Business, **sélectionne celui qui a l’ID 942713845079592**, ne pas en créer un nouveau.

---

## Erreur : « Phone Number is missing »

Cette erreur apparaît quand tu cliques sur **Continue with Facebook** (étape 2) **sans avoir rempli l’étape 1** dans la Console Twilio.

**À faire :**

1. Dans **Twilio Console** → **Messaging** → **WhatsApp Senders** → **Create new sender**.
2. **Étape 1 — « Select a phone number to register »** (reste sur cette page) :
   - Si tu utilises **ton propre numéro** (algérien) : choisis **« Use a non-Twilio phone number »** (ou « Add your own number »), puis **saisis le numéro en format international** : `+213` suivi des 9 chiffres (ex. `+213555123456`). Pas d’espace, pas de 0 au début.
   - Si tu utilises un **numéro Twilio** : sélectionne-le dans la liste.
3. Clique sur **Continue** (ou **Next**) **uniquement après** avoir saisi/sélectionné le numéro.
4. Ensuite seulement : **Étape 2** → **Continue with Facebook** et termine le flux Meta.

Si tu ouvres la fenêtre Facebook avant d’avoir validé l’étape 1 avec un numéro, Twilio/Meta n’ont pas le numéro → « Phone Number is missing ». Recommence en remplissant bien l’étape 1 d’abord.

---

## Le sender est enregistré mais « Offline »

Le numéro apparaît dans Twilio (ex. +213797554303) mais le **statut est Offline**. C’est Meta qui décide du statut, pas Twilio. Checklist pour le passer **Online** :

| Où | Quoi faire |
|----|------------|
| **Twilio** | Clique **Edit Sender** sur le numéro → regarde s’il y a une étape en attente (ex. « Complete registration »). Si oui, termine-la. |
| **Meta – Security Center** | [business.facebook.com](https://business.facebook.com) → **Paramètres** → **Security Center** → vérifie si **Business verification** est demandée. Si oui, envoie les documents (souvent la cause du Offline). |
| **Meta – Notifications** | Vérifie les **alertes / notifications** pour le compte WhatsApp Business : une action peut être demandée. |
| **WhatsApp Manager** | [WhatsApp Manager](https://business.facebook.com/wa/manage/home) → vérifie que le numéro est listé et s’il y a un bandeau « Complete setup » ou « Verify business ». |
| **Délai** | Parfois 24–48 h après l’inscription, Meta met le sender Online. Si tout est complété, attendre. |

Tant que le sender est **Offline**, tu ne peux pas l’utiliser comme `TWILIO_WHATSAPP_FROM`. Pour envoyer quand même : utilise le Sandbox (`whatsapp:+14155238886`) et fais envoyer « join » aux destinataires de test. Dès que le sender passe **Online**, mets `TWILIO_WHATSAPP_FROM=whatsapp:+213797554303` (ou ton numéro) dans Render et redéploie.

---

## « Importer des documents » — je n’ai pas tous les documents

Meta demande **au moins un** document pour vérifier l’entreprise (nom + adresse). Tu n’as pas besoin de tous les types listés.

- **Relevé bancaire** : un relevé ou extrait de compte où figure le **nom de l’entreprise** (ex. protecphone) et l’adresse. Souvent le plus simple.
- **Licence d’exploitation / registre du commerce** : si tu as une licence ou un document officiel pour ton activité.
- **Document fiscal** : NIF/NIS ou document des impôts au nom de l’activité.

Le **nom** sur le document doit correspondre à ce que tu as saisi. Un seul document (PDF, JPG ou PNG) peut suffire. **Si tu n’as aucun document** : tu ne peux pas faire passer le sender Online. Utilise le **Sandbox** (`TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`) ; chaque destinataire doit envoyer « join xxx-xxx-xxx » (le code affiché sur la page Sandbox Twilio) au numéro Sandbox une fois. Dès que tu auras un document (relevé bancaire, licence, etc.), refais la vérification dans Security Center → Importer des documents, puis tu pourras utiliser ton numéro +213….

# Configurer le template Quick Reply (WhatsApp) — Confirmation de commande en arabe

Tu as choisi **Quick Reply** pour le template `order_confirmation` en **Arabic**. Voici quoi remplir.

---

## 1. General Information (déjà fait)

- **Template Name** : `order_confirmation`
- **Template Language** : `Arabic`

Clique sur **Create** pour passer à la configuration du contenu.

---

## 2. Body (texte du message)

Dans la section **Body** du template Quick Reply, mets le texte avec **4 variables** dans cet ordre :

**Exemple en arabe :**

```
مرحباً {{1}}، تم تسجيل طلبك {{2}}.
رمز التأكيد: {{3}}
المبلغ الإجمالي: {{4}} د.ج
الدفع عند الاستلام. اضغط للتأكيد:
```

**Signification :**  
« Bonjour {{1}}, votre commande {{2}} a été enregistrée. Code : {{3}}. Montant : {{4}} د.ج. Paiement à la livraison. Appuyez pour confirmer : »

- **{{1}}** = nom du client  
- **{{2}}** = numéro de commande  
- **{{3}}** = code de confirmation  
- **{{4}}** = montant  

Utilise **+ Add Variable** pour créer les variables 1, 2, 3, 4 si l’interface le demande.

---

## 3. Quick Reply buttons (boutons de réponse rapide)

Tu peux ajouter jusqu’à 5 boutons. Chaque bouton a :
- **Title** : le texte affiché (max 25 caractères)
- **ID** : la valeur renvoyée au webhook quand le client appuie (max 200 caractères)

### Bouton 1 — Confirmation (obligatoire)

| Champ     | Valeur (arabe) | Limite |
|-----------|----------------|--------|
| **Title** | `تم الاستلام`  | 25 car. |
| **ID**    | `received`     | 200 car. |

Quand le client appuie sur ce bouton, le site reçoit `received` et met la commande en **Confirmée**.

### Bouton 2 — Support (optionnel)

| Champ     | Valeur (arabe)     | Limite |
|-----------|--------------------|--------|
| **Title** | `التواصل مع الدعم` | 25 car. |
| **ID**    | `support`          | 200 car. |

Tu peux ne mettre qu’un seul bouton « تم الاستلام » si tu veux garder le message simple.

---

## 4. Variables envoyées par le site

Le serveur envoie toujours les 4 variables dans cet ordre :

| Variable | Contenu              | Exemple    |
|----------|----------------------|------------|
| **1**    | Nom du client         | أحمد       |
| **2**    | N° de commande        | CMD-123    |
| **3**    | Code de confirmation  | 456789     |
| **4**    | Montant               | 5٬000 د.ج  |

Le **Body** doit utiliser **{{1}}**, **{{2}}**, **{{3}}**, **{{4}}** dans ce même ordre.

---

## 5. Après la création du template

1. Soumets le template pour validation (Meta/Twilio).
2. Une fois approuvé, récupère le **Content SID** (commence par `HX...`).
3. Dans ton `.env` :
   ```
   TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Configure le **webhook** Twilio (voir section 6).

---

## 6. Webhook : enregistrer la confirmation

Quand le client appuie sur **« تم الاستلام »**, Twilio envoie la réponse à ton serveur. Il faut lui indiquer l’URL du webhook :

1. **Console Twilio** → ton numéro WhatsApp → **Webhook** (ou « When a message comes in »).
2. **URL** : `https://TON-DOMAINE.com/api/whatsapp/webhook`
3. **Méthode** : **POST**
4. Enregistrer.

Le serveur reconnaît l’ID de bouton **`received`** (et aussi « تم الاستلام », « ok », etc.) et passe automatiquement la dernière commande en attente pour ce numéro en statut **Confirmée**.

---

**Résumé** : Quick Reply est plus simple qu’une liste : le client voit directement les boutons sous le message et un seul clic suffit pour confirmer. L’ID du bouton (`received`) est bien géré par le webhook existant.

---

## 7. Je ne reçois pas le message WhatsApp après une commande

**À vérifier :**

1. **.env (ou variables d’environnement)**  
   Les 3 variables doivent être définies là où tourne le serveur (PC ou Render) :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (Sandbox) ou ton numéro Business  
   Si tu utilises un template : `TWILIO_WHATSAPP_CONTENT_SID=HX...`

2. **Sandbox : le numéro doit avoir « rejoint » le Sandbox**  
   Le numéro qui reçoit (celui saisi dans la commande) doit avoir envoyé sur WhatsApp au numéro Twilio Sandbox (`+1 415 523 8886`) le message :  
   `join xxx-xxx-xxx`  
   (le code exact est affiché dans Twilio → Try WhatsApp → Sandbox.)  
   Sans ça, Twilio ne peut pas envoyer au destinataire.

3. **Logs du serveur**  
   Au moment de la commande, regarde la console où tourne `node server/index.js`. Tu devrais voir :
   - `[WhatsApp] Envoi vers +213... pour commande CMD-xxx` → envoi tenté
   - `[WhatsApp] Message envoyé avec succès` → Twilio a accepté
   - `[WhatsApp] Twilio error: ...` ou `[WhatsApp] Envoi ignoré : ...` → problème (config ou numéro)

4. **Numéro algérien**  
   Saisir le numéro en 0XXXXXXXX ou 5XXXXXXXX ; le serveur le convertit en +213. Si le message part mais n’arrive pas, le Sandbox peut être peu fiable vers l’international (voir message Twilio). En production, utiliser un numéro WhatsApp Business enregistré.

# Configurer le List Picker (WhatsApp) — Confirmation de commande en arabe

> **Tu préfères les boutons directs ?** → Utilise plutôt **Quick Reply** et suis le guide **`docs/WHATSAPP_QUICK_REPLY_AR.md`** (plus simple : le client appuie sur « تم الاستلام » sans ouvrir de liste).

Utilise les textes ci‑dessous dans l’interface **Configure content - List Picker**.

---

## 1. Body (texte principal)

**Champ : Body** — message qui s’affiche avant le bouton de liste.

Tu peux utiliser des variables pour le nom, la commande, le code et le montant.

**Exemple en arabe :**

```
مرحباً {{1}}، تم تسجيل طلبك {{2}}.
رمز التأكيد: {{3}}
المبلغ الإجمالي: {{4}} د.ج
الدفع عند الاستلام. اختر من القائمة:
```

**Signification :**  
« Bonjour {{1}}, votre commande {{2}} a été enregistrée. Code de confirmation : {{3}}. Montant total : {{4}} د.ج. Paiement à la livraison. Choisissez dans la liste : »

- **{{1}}** = nom du client  
- **{{2}}** = numéro de commande  
- **{{3}}** = code de confirmation  
- **{{4}}** = montant (ex. 5000)

Clique sur **+ Add Variable** pour chaque variable si l’interface te le demande (par ex. Variable 1, 2, 3, 4).

---

## 2. List button text (texte du bouton)

**Champ : List button text** (max 20 caractères).

**Exemple :**

```
اختر إجراء
```

ou plus court :

```
خيارات
```

**Signification :** « Choisir une action » / « Options ».

---

## 3. List items (éléments de la liste)

Tu dois définir au moins un (ou plusieurs) éléments. Chaque élément a : **Item name**, **Item ID**, **Item description** (optionnel).

### Élément 1 — Accusé de réception

| Champ            | Valeur (arabe)   | Limite |
|------------------|------------------|--------|
| **Item name**    | `تم الاستلام`    | 24 car. |
| **Item ID**      | `received`       | 200 car. |
| **Item description** | `شكراً، استلمت تفاصيل الطلب` | 72 car. (optionnel) |

**Signification :** « Reçu » / « Merci, j’ai bien reçu les détails de la commande ».

### Élément 2 — Contacter le support (optionnel)

| Champ            | Valeur (arabe)      | Limite |
|------------------|---------------------|--------|
| **Item name**    | `التواصل مع الدعم`  | 24 car. |
| **Item ID**      | `support`           | 200 car. |
| **Item description** | `أحتاج مساعدة`   | 72 car. (optionnel) |

**Signification :** « Contacter le support » / « J’ai besoin d’aide ».

### Élément 3 — Simple « OK » (si tu veux une seule option)

| Champ            | Valeur   | Limite |
|------------------|----------|--------|
| **Item name**    | `حسناً`  | 24 car. |
| **Item ID**      | `ok`     | 200 car. |
| **Item description** | (vide) | optionnel |

---

## 4. Rappel : variables envoyées par le site

Le serveur envoie toujours les 4 variables dans cet ordre pour ton template :

| Variable | Contenu        | Exemple   |
|----------|----------------|-----------|
| **1**    | Nom du client   | أحمد     |
| **2**    | N° de commande  | CMD-123  |
| **3**    | Code de confirmation | 456789 |
| **4**    | Montant         | 5٬000 د.ج |

Assure-toi que le **Body** de ton List Picker utilise bien **{{1}}**, **{{2}}**, **{{3}}**, **{{4}}** dans le même ordre.

---

## 5. Après la configuration

- Enregistre le template et récupère son **Content SID** (commence par `HX...`).
- Dans ton `.env` :
  ```
  TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Quand un client passe commande, il recevra le message avec le Body rempli et le bouton « اختر إجراء » (ou « خيارات ») qui ouvre la liste.

**Note :** Si l’interface exige un nombre précis de variables (p.ex. 4), crée bien 4 variables et associe-les dans l’ordre : 1 = nom, 2 = commande, 3 = code, 4 = montant.

---

## 6. Webhook : réception de la confirmation (client a cliqué « تم الاستلام »)

Pour que le site enregistre que le client a **confirmé** quand il choisit « تم الاستلام » dans la liste :

1. **URL du webhook**  
   Dans la console Twilio → ton numéro WhatsApp → **Webhook** (ou « When a message comes in »), configure :
   - **URL** : `https://TON-DOMAINE.com/api/whatsapp/webhook`
   - **Méthode** : **POST**

2. **Comportement**  
   Quand le client envoie un message (réponse liste ou texte) :
   - Si la réponse correspond à une confirmation (bouton **received** / **ok** ou texte « تم الاستلام », « استلام », « ok », « confirm »), le serveur cherche la **dernière commande en attente** pour ce numéro et passe son statut à **Confirmée**.

3. **En local**  
   Twilio doit pouvoir joindre ton serveur. En dev local, utilise un tunnel (ex. ngrok) et mets l’URL ngrok dans le webhook : `https://xxx.ngrok.io/api/whatsapp/webhook`.

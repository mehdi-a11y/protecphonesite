# Configurer l’envoi WhatsApp (Twilio) — confirmation de commande

## Ce que vous devez faire dans l’interface Twilio

### 1. Créer un template « Confirmation de commande »

- Dans la **Console Twilio** → **Messaging** → **Try it out** → **Send a WhatsApp message** (ou **Content Template**), vous êtes dans le **Sandbox**.
- Pour les messages **initiés par vous** (vous envoyez au client sans qu’il ait écrit first), Twilio exige un **template approuvé**.
- Il faut donc **créer un template** adapté à la confirmation de commande :
  - Allez dans la section **Content templates** (ou équivalent dans votre compte Twilio / Meta Business).
  - Créez un nouveau template, par exemple nommé **order_confirmation**.
  - Langue : Français.
  - Corps du message avec **4 variables** dans cet ordre :
    - `{{1}}` = nom du client  
    - `{{2}}` = numéro de commande  
    - `{{3}}` = code de confirmation  
    - `{{4}}` = montant total  

**Exemple de texte de template :**

```
Bonjour {{1}},

Votre commande {{2}} a bien été enregistrée.
Code de confirmation : {{3}}
Montant total : {{4}}

Paiement à la livraison (COD). Merci pour votre confiance !
```

- Soumettez le template pour validation (Meta/Twilio peuvent prendre quelques heures).
- Une fois approuvé, récupérez le **Content SID** du template (ex. `HXb5b62575e6e4ff6129ad7c8efe1f983e`).

### 2. Récupérer le Content SID

- Dans l’écran où vous testez l’envoi (comme sur votre capture), quand vous choisissez un template, la requête **Request** affiche :
  - `ContentSid=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Copiez cette valeur **Content SID** (commence par `HX`).

### 3. Configurer le projet

Dans votre fichier `.env` (ou variables d’environnement sur Render) :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- **From** : le numéro WhatsApp expéditeur (Sandbox : `whatsapp:+14155238886`, ou votre numéro Business `whatsapp:+213XXXXXXXXX`).
- **Content SID** : celui du template de confirmation de commande (avec les variables 1, 2, 3, 4 comme ci‑dessus).

### 4. Correspondance des variables dans le code

Le serveur envoie au template :

| Variable template | Contenu envoyé        |
|-------------------|------------------------|
| `{{1}}`           | Nom du client          |
| `{{2}}`           | Numéro de commande     |
| `{{3}}`           | Code de confirmation   |
| `{{4}}`           | Montant total (ex. 5000 DA) |

Si votre template utilise un autre ordre ou d’autres libellés, il faudra adapter `server/whatsapp.js` (objet `contentVariables`).

### 5. Tester

- En Sandbox : le destinataire doit d’abord avoir rejoint le Sandbox (en envoyant le code affiché par Twilio à ce numéro).
- Placez une commande de test sur le site : le client devrait recevoir le message WhatsApp avec le template rempli.

---

**Sans template (Body uniquement)** : si vous ne définissez pas `TWILIO_WHATSAPP_CONTENT_SID`, le serveur envoie un message en **Body** libre. Cela ne fonctionne en général que dans le Sandbox et si le client a déjà envoyé un message dans les dernières 24 h.

# Héberger la plateforme Protecphone

Une fois hébergée, vous aurez une **URL fixe** pour le webhook Yalidine (plus besoin de ngrok) et vous pourrez tester en conditions réelles.

## Option recommandée : Render (gratuit)

[Render](https://render.com) permet d’héberger gratuitement une app Node.js (front + API sur la même URL).

### 1. Préparer le projet

1. **Créer un dépôt sur GitHub**  
   Sur [github.com](https://github.com) : **New repository** → nom (ex. `protecphonesite`) → Create (sans README).

2. **Pousser le code** depuis votre PC, dans le dossier du projet :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/protecphonesite.git
   git push -u origin main
   ```
   Remplacez `VOTRE_USERNAME` et `protecphonesite` par votre compte et le nom du dépôt.

3. **Ne pas commiter `.env`**  
   Le fichier `.env` est déjà dans `.gitignore`, donc il ne sera pas envoyé sur GitHub. Vous renseignerez **YALIDINE_API_ID** et **YALIDINE_API_TOKEN** dans les variables d’environnement sur Render.

### 2. Créer le service sur Render

1. Allez sur **https://render.com** et connectez-vous (ou créez un compte).
2. **New** → **Web Service**.
3. Connectez votre dépôt GitHub et choisissez le repo **protecphonesite**.
4. Remplissez :
   - **Name** : `protecphone` (ou autre).
   - **Runtime** : `Node`.
   - **Build Command** :  
     `npm install && npm run build`
   - **Start Command** :  
     `node server/index.js`
   - **Instance Type** : Free.

### 3. Base de données PostgreSQL (recommandé)

Pour une **base partagée** (commandes, produits, tarifs livraison) :

1. Sur Render : **New** → **PostgreSQL**.
2. Créez une base (ex. `protecphone_db`), région proche de votre Web Service.
3. Une fois créée, copiez l’**Internal Database URL** (ou **External** si vous hébergez l’app ailleurs).
4. Dans votre **Web Service** : onglet **Environment** → **Add Environment Variable** :
   - Key : `DATABASE_URL`
   - Value : coller l’URL (ex. `postgres://user:pass@host/dbname?sslmode=require`).

Sans `DATABASE_URL`, le serveur utilise un stockage **en mémoire** (données perdues à chaque redémarrage).

### 4. Variables d’environnement (Render)

Dans l’onglet **Environment** du service :

| Key                  | Value                    |
|----------------------|--------------------------|
| `NODE_ENV`           | `production`             |
| `DATABASE_URL`       | URL PostgreSQL (voir §3) |
| `YALIDINE_API_ID`    | votre API ID Yalidine    |
| `YALIDINE_API_TOKEN` | votre API Token Yalidine |

(Pas besoin de `PORT`, Render le définit tout seul.)

### 5. Déployer

Cliquez sur **Create Web Service**. Render va :

- lancer la commande de build (install + `npm run build` → génère `dist/`) ;
- lancer `node server/index.js`, qui sert l’API **et** les fichiers du front depuis `dist/`.

Quand le déploiement est vert, votre site est en ligne.

### 6. URL de la plateforme

Render vous donne une URL du type :

`https://protecphone-xxxx.onrender.com`

- **Site** : ouvrez cette URL dans le navigateur.
- **Webhook Yalidine** : dans le formulaire Yalidine « Lien de réception », mettez :  
  `https://protecphone-xxxx.onrender.com/api/yalidine/webhook`  
  (en remplaçant par votre vraie URL Render).

---

## Autres hébergeurs

- **Railway** : même principe (Web Service Node, Build = `npm install && npm run build`, Start = `node server/index.js`, variables `NODE_ENV`, `YALIDINE_API_ID`, `YALIDINE_API_TOKEN`).
- **Fly.io** : déploiement Node possible avec un `Dockerfile` ou `fly.toml` (on peut les ajouter si besoin).

---

## Rappel

- Avec **DATABASE_URL** (PostgreSQL sur Render), les **commandes**, **produits** et **tarifs de livraison** sont stockés dans une base partagée. Sans `DATABASE_URL`, le serveur utilise un stockage en mémoire (données perdues au redémarrage).
- En production, changez le **mot de passe admin** dans le code (`src/types.ts` → `ADMIN_PASSWORD`) ou prévoyez une variable d’environnement.

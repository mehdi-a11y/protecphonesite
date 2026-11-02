#!/usr/bin/env node
/**
 * Crée (ou met à jour) un produit + sa landing page à partir d'un dossier :
 *   landings/<nom>/landing.json  (textes, prix, ordre des photos)
 *   landings/<nom>/*.jpg|png|webp (photos ; la 1re de la liste = photo principale)
 *
 * Produit général par défaut (modèle unique). Coque à motifs : "deviceType": "iphone",
 * "models": [ids iPhone] (vide = tous) et "landing.designs": [{ id, name, photo: "fichier.jpg" }].
 *
 * Usage (sur le VPS, dans le dossier du site, après déploiement) :
 *   node scripts/create-landing.mjs landings/hoco-hp65
 *   node scripts/create-landing.mjs landings/hoco-hp65 https://www.protecphone.shop
 *
 * URL par défaut : http://localhost:$PORT (ou 3001).
 * Mot de passe admin : variable ADMIN_PASSWORD, sinon lu dans le .env du site (jamais affiché).
 * Relancer le script met à jour textes et photos, mais garde le stock déjà réglé dans l'admin.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname, extname, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const GENERAL_MODEL_ID = 'standard'
const IPHONE_MODEL_IDS = ['11', '12', '13', '14', '15', '16', '17'].flatMap((n) => [
  `iphone-${n}`, `iphone-${n}-pro`, `iphone-${n}-pro-max`,
])

function readEnvFile() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf-8').replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' }

function toDataUrl(file) {
  const mime = MIME[extname(file).toLowerCase()]
  if (!mime) throw new Error(`Format d'image non pris en charge : ${file}`)
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

async function main() {
  const [dirArg, urlArg] = process.argv.slice(2)
  if (!dirArg) {
    console.error('Usage : node scripts/create-landing.mjs <dossier-landing> [url-du-site]')
    process.exit(1)
  }
  const dir = resolve(dirArg)
  const spec = JSON.parse(readFileSync(join(dir, 'landing.json'), 'utf-8'))
  const env = { ...readEnvFile(), ...process.env }
  const base = (urlArg || `http://localhost:${env.PORT || 3001}`).replace(/\/$/, '')
  const password = env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD introuvable (ni dans l’environnement, ni dans .env).')

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin', password }),
  })
  const login = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok || !login.token) throw new Error(`Connexion admin refusée (${loginRes.status}) : ${login.error || ''}`)
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }

  // Stock déjà réglé dans l'admin : on le garde si le produit existe
  const existingRes = await fetch(`${base}/api/products/${encodeURIComponent(spec.productId)}`)
  const existing = existingRes.ok ? await existingRes.json().catch(() => null) : null

  const photos = (spec.photos || []).map((f) => toDataUrl(join(dir, f)))
  const isPhone = spec.deviceType === 'iphone'
  const modelIds = isPhone ? (spec.models?.length ? spec.models : IPHONE_MODEL_IDS) : [GENERAL_MODEL_ID]

  // Motifs : la photo est donnée par nom de fichier → index dans la galerie
  const landing = { ...(spec.landing || {}) }
  if (Array.isArray(landing.designs)) {
    landing.designs = landing.designs.map((d) => {
      const photo = typeof d.photo === 'number' ? d.photo : (spec.photos || []).indexOf(d.photo)
      if (photo < 0) throw new Error(`Photo du motif « ${d.name} » absente de "photos" : ${d.photo}`)
      return { id: d.id, name: d.name, photo }
    })
  }
  const colorIds = landing.designs?.length ? landing.designs.map((d) => d.id) : (spec.colorIds?.length ? spec.colorIds : [])

  // Stock et dispo fournisseur par variante (motif|modèle) ; on garde ce qui est déjà réglé dans l'admin
  const variantStocks = { ...(existing?.variantStocks || {}) }
  const supplier = { ...(existing?.variantAvailableFromSupplier || {}) }
  for (const cid of colorIds.length ? colorIds : ['']) {
    for (const mid of modelIds) {
      const key = `${cid}|${mid}`
      if (variantStocks[key] === undefined) variantStocks[key] = spec.stock ?? 0
      if (supplier[key] === undefined && spec.availableFromSupplier) supplier[key] = true
    }
  }

  const product = {
    id: spec.productId,
    name: spec.name,
    description: spec.description || '',
    price: spec.price,
    wholesalePrice: existing?.wholesalePrice || spec.wholesalePrice || 0,
    quantity: existing ? existing.quantity : (spec.stock ?? 0),
    variantStocks,
    variantAvailableFromSupplier: Object.keys(supplier).length ? supplier : undefined,
    image: isPhone ? '📱' : '📦',
    colorIds: colorIds.length ? colorIds : undefined,
    photoUrl: photos[0] || '',
    photoGallery: photos.length ? photos : undefined,
    deviceType: isPhone ? 'iphone' : 'general',
    compatibleWith: modelIds,
    landing,
  }

  const addRes = await fetch(`${base}/api/products/add`, { method: 'POST', headers, body: JSON.stringify(product) })
  if (!addRes.ok) throw new Error(`Enregistrement du produit échoué (${addRes.status}) : ${await addRes.text()}`)
  console.log(`${existing ? 'Produit mis à jour' : 'Produit créé'} : ${spec.name} (${photos.length} photos)`)

  // Une ou plusieurs pages pour le même produit (ex. landing complète + page produit simple)
  const pages = [
    { slug: spec.slug, title: spec.title, template: spec.template || 'full' },
    ...(spec.extraPages || []),
  ]
  for (const page of pages) {
    const landingRes = await fetch(`${base}/api/landing-pages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ slug: page.slug, antichocId: spec.productId, title: page.title || null, template: page.template || 'full' }),
    })
    if (!landingRes.ok) throw new Error(`Création de la page /p/${page.slug} échouée (${landingRes.status}) : ${await landingRes.text()}`)
    const landing = await landingRes.json()
    console.log(`Page en ligne : /p/${landing.slug} (${landing.template === 'simple' ? 'page simple' : 'landing complète'})`)
  }
}

main().catch((e) => {
  console.error('Erreur :', e.message)
  process.exit(1)
})

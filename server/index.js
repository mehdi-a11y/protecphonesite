/**
 * Proxy backend pour l'API Yalidine (contourne CORS).
 * Les identifiants sont lus depuis les variables d'environnement.
 *
 * Démarrage : depuis la racine du projet :
 *   npm run server
 * ou avec les variables :
 *   set YALIDINE_API_ID=xxx && set YALIDINE_API_TOKEN=yyy && node server/index.js
 *
 * .env à la racine (optionnel) : YALIDINE_API_ID=... et YALIDINE_API_TOKEN=...
 */

import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'
import {
  initDb,
  dbGetOrders,
  dbSaveOrder,
  dbSetOrderStatus,
  dbUpdateOrderYalidine,
  dbFindOrderByYalidineTracking,
  dbGetProducts,
  dbSaveProducts,
  dbGetDeliveryPrices,
  dbSaveDeliveryPrices,
  dbGetLandingPages,
  dbGetLandingBySlug,
  dbSaveLanding,
  dbDeleteLanding,
} from './db.js'
import { getBureauxByWilaya } from './yalidine-bureaux.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Charger .env manuellement si présent
function loadEnv() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8').replace(/\r\n/g, '\n')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (val) process.env[key] = val
  }
}
loadEnv()

const app = express()
app.use(cors())
// Limite très élevée pour l'enregistrement des produits avec photos en base64 (compressées côté client)
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

const YALIDINE_API_BASE = 'https://api.yalidine.app/v1/'
const API_ID = process.env.YALIDINE_API_ID || ''
const API_TOKEN = process.env.YALIDINE_API_TOKEN || ''

app.post('/api/yalidine/parcels', async (req, res) => {
  if (!API_ID || !API_TOKEN) {
    return res.status(500).json({
      error: 'YALIDINE_API_ID et YALIDINE_API_TOKEN doivent être définis (fichier .env ou variables d\'environnement).',
    })
  }

  const parcels = req.body
  if (!Array.isArray(parcels) || parcels.length === 0) {
    return res.status(400).json({ error: 'Body doit être un tableau de colis.' })
  }

  try {
    const response = await fetch(`${YALIDINE_API_BASE}parcels/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-ID': API_ID,
        'X-API-TOKEN': API_TOKEN,
      },
      body: JSON.stringify(parcels),
    })

    const data = await response.json().catch(() => ({}))
    res.status(response.status).json(data)
  } catch (err) {
    res.status(502).json({
      error: err.message || 'Erreur lors de l\'appel à Yalidine.',
    })
  }
})

// Liste des bureaux Yalidine (stop desks) par wilaya — API Yalidine + liste statique en secours
app.get('/api/yalidine/stopdesks', async (req, res) => {
  const wilaya = (req.query.wilaya || req.query.wilaya_id || '').toString().trim()

  const normalize = (data, wilayaParam) => {
    const list = Array.isArray(data) ? data : (data.data ?? data.stopdesks ?? data.centers ?? [])
    return list.map((s) => ({
      id: s.id ?? s.stopdesk_id ?? s.center_id,
      name: s.name ?? s.stopdesk_name ?? s.center_name ?? s.address ?? String(s.id ?? ''),
      address: s.address ?? s.adresse ?? '',
      wilaya: s.wilaya ?? s.wilaya_name ?? wilayaParam ?? '',
    })).filter((s) => s.id != null)
  }

  if (API_ID && API_TOKEN) {
    for (const endpoint of ['stopdesks', 'centers']) {
      try {
        const url = new URL(endpoint, YALIDINE_API_BASE)
        if (wilaya) url.searchParams.set('wilaya_id', wilaya)
        const response = await fetch(url.toString(), {
          headers: { 'X-API-ID': API_ID, 'X-API-TOKEN': API_TOKEN },
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) {
          const stopdesks = normalize(data, wilaya)
          if (stopdesks.length > 0) return res.json({ stopdesks })
        }
        if (response.status !== 404) return res.status(response.status).json(data)
      } catch (_) {}
    }
  }

  const stopdesks = getBureauxByWilaya(wilaya).map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address ?? '',
    wilaya: s.wilaya ?? wilaya ?? '',
  }))
  return res.json({ stopdesks })
})

// Récupérer le statut de colis (pour synchronisation livré / retourné / annulé)
app.get('/api/yalidine/parcels/status', async (req, res) => {
  if (!API_ID || !API_TOKEN) {
    return res.status(500).json({
      error: 'YALIDINE_API_ID et YALIDINE_API_TOKEN doivent être définis.',
    })
  }
  const tracking = req.query.tracking
  const trackings = typeof tracking === 'string' ? tracking.split(',').map((t) => t.trim()).filter(Boolean) : []
  if (trackings.length === 0) {
    return res.json({ statuses: {} })
  }

  try {
    const url = new URL('parcels', YALIDINE_API_BASE)
    url.searchParams.set('tracking', trackings.join(','))
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-ID': API_ID,
        'X-API-TOKEN': API_TOKEN,
      },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    // Normaliser la réponse : Yalidine peut renvoyer { data: [...] }, [ ... ], ou { "YAL-xxx": { status: "Livré" } }
    const list = Array.isArray(data) ? data : (data.data ?? data.parcels ?? [])
    const statuses = {}
    if (Array.isArray(list)) {
      for (const p of list) {
        const t = (p.tracking ?? p.tracking_number ?? p.id ?? '').toString().trim().toUpperCase()
        const s = (p.status ?? p.state ?? p.etat ?? '').toString().trim()
        if (t) statuses[t] = s
      }
    } else if (data && typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        if (key === 'data' || key === 'parcels') continue
        const t = key.toString().trim().toUpperCase()
        const s = val && typeof val === 'object' ? (val.status ?? val.state ?? val.etat ?? '').toString().trim() : String(val || '').trim()
        if (t) statuses[t] = s
      }
    }
    res.json({ statuses })
  } catch (err) {
    res.status(502).json({
      error: err.message || 'Erreur lors de l\'appel à Yalidine.',
    })
  }
})

// Webhook Yalidine — validation CRC : GET avec subscribe + crc_token → répondre avec la valeur du crc_token
function getCrcFromRequest(req) {
  const q = req.query || {}
  const body = req.body || {}
  const subscribe = q.subscribe ?? q.Subscribe ?? body.subscribe ?? body.Subscribe
  const crcToken = q.crc_token ?? q['crc_token'] ?? q.Crc_Token ?? body.crc_token ?? body['crc_token'] ?? body.Crc_Token
  const hasSubscribe = subscribe !== undefined && subscribe !== null
  const crcValue = crcToken !== undefined && crcToken !== null ? String(crcToken).trim() : ''
  return { hasSubscribe, crcValue }
}

function sendCrcValidation(res, crcValue) {
  res.status(200)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.set('Content-Type', 'text/plain')
  res.send(crcValue)
}

app.get('/api/yalidine/webhook', (req, res) => {
  const { hasSubscribe, crcValue } = getCrcFromRequest(req)
  if (crcValue) {
    return sendCrcValidation(res, crcValue)
  }
  res.status(200).send('OK')
})

app.get('/api/yalidine/webhook/', (req, res) => {
  const { crcValue } = getCrcFromRequest(req)
  if (crcValue) return sendCrcValidation(res, crcValue)
  res.status(200).send('OK')
})

app.post('/api/yalidine/webhook', async (req, res) => {
  const { hasSubscribe, crcValue } = getCrcFromRequest(req)
  if (crcValue) {
    return sendCrcValidation(res, crcValue)
  }
  res.status(200).send('OK')
  const body = req.body || {}
  const type = body.type
  const events = body.events || []
  if (type === 'parcel_status_updated' && Array.isArray(events)) {
    for (const ev of events) {
      const data = ev.data || {}
      const tracking = (data.tracking ?? data.tracking_number ?? '').toString().trim()
      const status = (data.status ?? data.state ?? '').toString().trim().toLowerCase()
      if (!tracking) continue
      try {
        const order = await dbFindOrderByYalidineTracking(tracking)
        if (!order) continue
        if (/livr[eé]|delivered/.test(status)) await dbSetOrderStatus(order.id, 'livre')
        else if (/retour|return/.test(status)) await dbSetOrderStatus(order.id, 'retourne')
        else if (/annul|cancel|refus/.test(status)) await dbSetOrderStatus(order.id, 'cancelled')
      } catch (e) {
        console.warn('[Yalidine webhook]', e.message)
      }
    }
  }
  if (type || events.length) {
    console.log('[Yalidine webhook]', type, events.length, 'event(s)')
  }
})

// --- API base de données partagée ---
function orderToApi(o) {
  return {
    id: o.id,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    wilaya: o.wilaya,
    deliveryType: o.deliveryType,
    deliveryPrice: o.deliveryPrice,
    items: o.items,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt,
    confirmationCode: o.confirmationCode,
    yalidineTracking: o.yalidineTracking,
    yalidineSentAt: o.yalidineSentAt,
    yalidineStopdeskId: o.yalidineStopdeskId,
    yalidineStopdeskName: o.yalidineStopdeskName,
  }
}

function apiToOrder(a) {
  return {
    id: a.id,
    customerName: a.customerName,
    phone: a.phone,
    address: a.address,
    wilaya: a.wilaya,
    deliveryType: a.deliveryType,
    deliveryPrice: a.deliveryPrice,
    items: a.items || [],
    total: a.total,
    status: a.status,
    createdAt: a.createdAt,
    confirmationCode: a.confirmationCode,
    yalidineTracking: a.yalidineTracking,
    yalidineSentAt: a.yalidineSentAt,
    yalidineStopdeskId: a.yalidineStopdeskId,
    yalidineStopdeskName: a.yalidineStopdeskName,
  }
}

app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await dbGetOrders()
    res.json(orders.map(orderToApi))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const a = req.body
    const order = apiToOrder(a)
    if (!order.id || !order.confirmationCode) {
      return res.status(400).json({ error: 'id et confirmationCode requis' })
    }
    await dbSaveOrder(order)
    res.status(201).json(orderToApi(order))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status requis' })
    await dbSetOrderStatus(id, status)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/orders/:id/yalidine', async (req, res) => {
  try {
    const { id } = req.params
    const { tracking, sentAt } = req.body
    if (!tracking || !sentAt) return res.status(400).json({ error: 'tracking et sentAt requis' })
    await dbUpdateOrderYalidine(id, tracking, sentAt)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products', async (_req, res) => {
  try {
    const products = await dbGetProducts()
    res.json(products)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/products', async (req, res) => {
  try {
    const products = Array.isArray(req.body) ? req.body : [req.body]
    if (!products.length) return res.status(400).json({ error: 'products requis' })
    await dbSaveProducts(products)
    res.json(await dbGetProducts())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Ajoute un seul produit (évite d'envoyer toute la liste = Payload Too Large)
app.post('/api/products/add', async (req, res) => {
  try {
    const product = req.body
    if (!product || !product.id) return res.status(400).json({ error: 'product avec id requis' })
    const current = await dbGetProducts()
    const existing = current.find((p) => p.id === product.id)
    const next = existing
      ? current.map((p) => (p.id === product.id ? product : p))
      : [...current, product]
    await dbSaveProducts(next)
    res.json(await dbGetProducts())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/delivery-prices', async (_req, res) => {
  try {
    const prices = await dbGetDeliveryPrices()
    res.json(prices)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/delivery-prices', async (req, res) => {
  try {
    const prices = req.body
    if (!prices || typeof prices !== 'object') return res.status(400).json({ error: 'body requis' })
    await dbSaveDeliveryPrices(prices)
    res.json(await dbGetDeliveryPrices())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/landing-pages', async (_req, res) => {
  try {
    res.json(await dbGetLandingPages())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/landing-pages/:slug', async (req, res) => {
  try {
    const landing = await dbGetLandingBySlug(req.params.slug)
    if (!landing) return res.status(404).json({ error: 'Landing page introuvable' })
    res.json(landing)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/landing-pages', async (req, res) => {
  try {
    const { slug, antichocId, title } = req.body || {}
    if (!slug || !antichocId || typeof slug !== 'string' || typeof antichocId !== 'string') {
      return res.status(400).json({ error: 'slug et antichocId requis' })
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
    if (!cleanSlug) return res.status(400).json({ error: 'slug invalide' })
    await dbSaveLanding({ slug: cleanSlug, antichocId: antichocId.trim(), title: title ? String(title).trim() : null })
    res.json(await dbGetLandingBySlug(cleanSlug))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/landing-pages/:slug', async (req, res) => {
  try {
    await dbDeleteLanding(req.params.slug)
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// En production : servir le frontend (Vite build) et le SPA
const isProduction = process.env.NODE_ENV === 'production'
const distPath = join(root, 'dist')
if (isProduction && existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 3001
;(async () => {
  await initDb()
  app.listen(PORT, () => {
    console.log(isProduction ? `Serveur démarré sur le port ${PORT}` : `Proxy Yalidine démarré sur http://localhost:${PORT}`)
    if (!API_ID || !API_TOKEN) {
      console.warn('Attention : YALIDINE_API_ID ou YALIDINE_API_TOKEN manquant. Définissez-les (variables d\'environnement ou .env).')
    }
  })
})()

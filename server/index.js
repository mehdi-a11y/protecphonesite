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
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'

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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const YALIDINE_API_BASE = 'https://api.yalidine.app/v1/'
const API_ID = process.env.YALIDINE_API_ID || ''
const API_TOKEN = process.env.YALIDINE_API_TOKEN || ''
const USE_API_ID_FOR_CRC = process.env.YALIDINE_WEBHOOK_USE_API_ID === '1' || process.env.YALIDINE_WEBHOOK_USE_API_ID === 'true'
const WEBHOOK_SECRET = process.env.YALIDINE_WEBHOOK_SECRET || (USE_API_ID_FOR_CRC ? API_ID : API_TOKEN)

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

// Webhook Yalidine : validation crc_token — on renvoie les deux formats de clés au cas où
function computeCrcResponseToken(crcToken, secret) {
  const hash = crypto.createHmac('sha256', secret).update(crcToken).digest('base64')
  return { withPrefix: `sha256=${hash}`, raw: hash }
}

function sendCrcResponse(res, crcToken) {
  if (!crcToken || !WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'crc_token ou secret webhook manquant' })
  }
  const { withPrefix, raw } = computeCrcResponseToken(String(crcToken), WEBHOOK_SECRET)
  res.status(200).json({
    response_token: withPrefix,
    crc_token: withPrefix,
    token: raw,
  })
}

app.get('/api/yalidine/webhook', (req, res) => {
  const crcToken = (req.query && (req.query.crc_token ?? req.query['crc_token'])) || ''
  sendCrcResponse(res, crcToken)
})

app.post('/api/yalidine/webhook', (req, res) => {
  const body = req.body || {}
  const crcToken = body.crc_token ?? req.query?.crc_token ?? req.query?.['crc_token']
  if (crcToken) {
    return sendCrcResponse(res, crcToken)
  }
  res.status(200).send('OK')
  const tracking = body.tracking ?? body.tracking_number ?? body.parcel_id
  const status = (body.status ?? body.state ?? body.etat ?? '').toString().trim()
  if (tracking || status) console.log('[Yalidine webhook]', tracking, status)
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
app.listen(PORT, () => {
  console.log(isProduction ? `Serveur démarré sur le port ${PORT}` : `Proxy Yalidine démarré sur http://localhost:${PORT}`)
  if (!API_ID || !API_TOKEN) {
    console.warn('Attention : YALIDINE_API_ID ou YALIDINE_API_TOKEN manquant. Définissez-les (variables d\'environnement ou .env).')
  }
})

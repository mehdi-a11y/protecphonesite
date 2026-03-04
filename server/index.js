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
  dbSetOrderAchatDone,
  dbSetOrderDepotDone,
  dbSetOrderChangeRequested,
  dbRequestOrderChange,
  dbDecrementStockForOrder,
  dbUpdateOrderYalidine,
  dbDeleteOrder,
  dbFindOrderByYalidineTracking,
  dbGetProducts,
  dbSaveProducts,
  dbDeleteProduct,
  dbGetDeliveryPrices,
  dbSaveDeliveryPrices,
  dbGetLandingPages,
  dbGetLandingBySlug,
  dbSaveLanding,
  dbDeleteLanding,
  dbGetCollections,
  dbGetCollectionBySlug,
  dbSaveCollection,
  dbDeleteCollection,
} from './db.js'
import { getBureauxByWilaya, getCommuneByStopdeskId } from './yalidine-bureaux.js'
import { sendOrderConfirmationWhatsApp, normalizePhoneToE164 } from './whatsapp.js'
import { sendNewOrderNotificationToConfirmateurs, sendOrderChangeRequestToConfirmateurs, isEmailConfigured, sendTestEmail } from './email.js'

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

// Nom de wilaya (français) → code pour appeler l'API Yalidine (centers par wilaya_id)
const WILAYA_NAME_TO_CODE = {
  Adrar: '01', Chlef: '02', Laghouat: '03', 'Oum El Bouaghi': '04', Batna: '05', 'Béjaïa': '06',
  Biskra: '07', Béchar: '08', Blida: '09', Bouira: '10', Tamanrasset: '11', Tébessa: '12',
  Tlemcen: '13', Tiaret: '14', 'Tizi Ouzou': '15', Alger: '16', Djelfa: '17', Jijel: '18',
  Sétif: '19', Saïda: '20', Skikda: '21', 'Sidi Bel Abbès': '22', Annaba: '23', Guelma: '24',
  Constantine: '25', Médéa: '26', Mostaganem: '27', "M'Sila": '28', Mascara: '29', Ouargla: '30',
  Oran: '31', 'El Bayadh': '32', Illizi: '33', 'Bordj Bou Arréridj': '34', Boumerdès: '35',
  'El Tarf': '36', Tindouf: '37', Tissemsilt: '38', 'El Oued': '39', Khenchela: '40',
  'Souk Ahras': '41', Tipaza: '42', Mila: '43', 'Aïn Defla': '44', 'Naâma': '45',
  "Aïn Témouchent": '46', Ghardaïa: '47', Relizane: '48', "El M'Ghair": '49', 'El Meniaa': '50',
  'Ouled Djellal': '51', 'Bordj Badji Mokhtar': '52', 'Béni Abbès': '53', Timimoun: '54',
  Touggourt: '55', Djanet: '56', 'In Salah': '57', 'In Guezzam': '58',
}

/** Retourne un nom de commune valide pour la wilaya (pour to_commune_name Yalidine). */
async function getDefaultCommuneForWilaya(wilayaName) {
  const code = WILAYA_NAME_TO_CODE[wilayaName] || null
  if (!code) return wilayaName || 'Alger'
  const wilayaNum = parseInt(code, 10)
  if (Number.isNaN(wilayaNum) || wilayaNum < 1 || wilayaNum > 58) return wilayaName || 'Alger'
  try {
    const leblad = (await import('@dzcode-io/leblad')).default
    const baladyiats = leblad.getBaladyiatsForWilaya(wilayaNum) || []
    if (baladyiats.length > 0) {
      const first = baladyiats[0]
      const name = first?.name != null ? String(first.name).trim() : ''
      if (name) return name
    }
  } catch (_) {}
  return wilayaName || 'Alger'
}

async function fetchYalidineCentersForWilaya(wilayaCode) {
  for (const endpoint of ['centers', 'stopdesks']) {
    try {
      const url = new URL(endpoint, YALIDINE_API_BASE)
      url.searchParams.set('wilaya_id', wilayaCode)
      const response = await fetch(url.toString(), {
        headers: { 'X-API-ID': API_ID, 'X-API-TOKEN': API_TOKEN },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) continue
      const list = Array.isArray(data) ? data : (data.data ?? data.centers ?? data.stopdesks ?? [])
      return list.map((s) => Number(s.id ?? s.center_id ?? s.stopdesk_id)).filter((n) => !Number.isNaN(n))
    } catch (_) {}
  }
  return []
}

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

  // Colis bureau : exiger stopdesk_id, puis valider contre l'API Yalidine si disponible
  for (const parcel of parcels) {
    const isStopdesk = parcel.is_stopdesk === true
    if (isStopdesk) {
      const stopdeskId = parcel.stopdesk_id != null ? Number(parcel.stopdesk_id) : null
      if (stopdeskId == null || Number.isNaN(stopdeskId)) {
        return res.status(400).json({
          error: 'Commande bureau Yalidine sans bureau choisi (stopdesk_id manquant).',
          code: 'MISSING_STOPDESK_ID',
          order_id: parcel.order_id,
        })
      }
      const wilayaName = (parcel.to_wilaya_name || '').toString().trim()
      const wilayaCode = WILAYA_NAME_TO_CODE[wilayaName] || null
      if (!wilayaCode) {
        return res.status(400).json({
          error: 'Wilaya manquante ou invalide pour la commande bureau.',
          order_id: parcel.order_id,
        })
      }
      const validIds = await fetchYalidineCentersForWilaya(wilayaCode)
      if (validIds.length > 0 && !validIds.includes(stopdeskId)) {
        return res.status(400).json({
          error: 'Unknown stopdesk_id value in the order_id ' + (parcel.order_id || '') + '. Please check the acceptable stop-desk ids using the Centers Endpoint (see the docs)',
          code: 'INVALID_STOPDESK_ID',
          order_id: parcel.order_id,
          stopdesk_id: stopdeskId,
          message: 'Le bureau choisi n\'est pas reconnu par Yalidine pour cette wilaya. Passez la commande en livraison à domicile ou demandez au client de repasser commande en choisissant un bureau dans la liste à jour.',
        })
      }
    }
  }

  // Normaliser les payloads : stopdesk_id en entier, to_commune_name = commune du bureau si is_stopdesk
  const normalizedParcels = []
  for (const p of parcels) {
    const out = { ...p }
    if (out.is_stopdesk === true && out.stopdesk_id != null) {
      out.stopdesk_id = parseInt(out.stopdesk_id, 10)
      if (Number.isNaN(out.stopdesk_id)) delete out.stopdesk_id
    }
    const wilayaName = (out.to_wilaya_name || '').toString().trim()
    let communeName = (out.to_commune_name || '').toString().trim()
    const looksLikeAddress = communeName.length > 50 || communeName.includes(',')
    // Pour livraison bureau : utiliser la commune du bureau (API ou liste statique) pour éviter l'erreur stopdesk_id / to_commune_name
    if (out.is_stopdesk === true && out.stopdesk_id != null) {
      const bureauCommune = getCommuneByStopdeskId(out.stopdesk_id)
      if (bureauCommune) {
        out.to_commune_name = bureauCommune
        communeName = bureauCommune
      }
    }
    if (!communeName || communeName === wilayaName || looksLikeAddress) {
      out.to_commune_name = await getDefaultCommuneForWilaya(wilayaName)
    }
    normalizedParcels.push(out)
  }

  try {
    const response = await fetch(`${YALIDINE_API_BASE}parcels/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-ID': API_ID,
        'X-API-TOKEN': API_TOKEN,
      },
      body: JSON.stringify(normalizedParcels),
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
// ?only_from_api=1 : ne renvoyer que les bureaux de l'API (pas le fallback), pour éviter des stopdesk_id invalides à l'envoi
app.get('/api/yalidine/stopdesks', async (req, res) => {
  let wilaya = (req.query.wilaya || req.query.wilaya_id || '').toString().trim()
  if (wilaya && wilaya.length === 1) wilaya = '0' + wilaya
  const onlyFromApi = String(req.query.only_from_api || req.query.onlyFromApi || '').toLowerCase() === '1' || req.query.only_from_api === 'true'

  const normalize = (data, wilayaParam) => {
    const list = Array.isArray(data) ? data : (data.data ?? data.stopdesks ?? data.centers ?? [])
    return list.map((s) => ({
      id: s.id ?? s.stopdesk_id ?? s.center_id,
      name: s.name ?? s.stopdesk_name ?? s.center_name ?? s.address ?? String(s.id ?? ''),
      address: s.address ?? s.adresse ?? '',
      wilaya: s.wilaya ?? s.wilaya_name ?? wilayaParam ?? '',
      commune: (s.commune ?? s.commune_name ?? s.commune_name_ar ?? '').toString().trim() || undefined,
    })).filter((s) => s.id != null)
  }

  if (API_ID && API_TOKEN) {
    const wilayaName = Object.keys(WILAYA_NAME_TO_CODE).find((k) => WILAYA_NAME_TO_CODE[k] === wilaya) || ''
    for (const endpoint of ['stopdesks', 'centers']) {
      for (const param of [
        () => ({ wilaya_id: wilaya }),
        () => (wilayaName ? { wilaya: wilayaName } : null),
      ]) {
        const params = param()
        if (!params || !wilaya) continue
        try {
          const url = new URL(endpoint, YALIDINE_API_BASE)
          Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
          const response = await fetch(url.toString(), {
            headers: { 'X-API-ID': API_ID, 'X-API-TOKEN': API_TOKEN },
          })
          const data = await response.json().catch(() => ({}))
          if (response.ok) {
            const fromApi = normalize(data, wilaya)
            if (fromApi.length > 0) return res.json({ stopdesks: fromApi })
          }
          // En cas d'erreur API (401, 500, etc.) ou liste vide : on passe à la liste statique pour que le client ait toujours des bureaux
        } catch (_) {}
      }
    }
  }

  // Liste statique : toujours utilisée si l'API n'a rien renvoyé (même avec only_from_api=1), pour que le client puisse toujours choisir un bureau
  let stopdesks = []
  try {
    stopdesks = getBureauxByWilaya(wilaya).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address ?? '',
      wilaya: s.wilaya ?? wilaya ?? '',
      commune: s.commune ?? undefined,
    }))
  } catch (e) {
    console.warn('[Yalidine stopdesks]', e.message)
  }
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

// --- Webhook WhatsApp (réponse du client : confirmation de commande) ---
const PENDING_STATUSES = ['tentative1', 'tentative2', 'tentative3', 'callback']
const CONFIRM_LIST_IDS = ['received', 'ok', 'confirm', 'confirmed', 'تم الاستلام']

app.post('/api/whatsapp/webhook', async (req, res) => {
  res.type('text/xml')
  try {
    const fromRaw = req.body.From || req.body.from
    const body = (req.body.Body || req.body.body || '').trim()
    const buttonPayload = (req.body.ButtonPayload || req.body.button_payload || '').trim().toLowerCase()
    const buttonText = (req.body.ButtonText || req.body.button_text || '').trim()

    const fromNormalized = fromRaw ? normalizePhoneToE164(String(fromRaw).replace(/^whatsapp:/i, '')) : null
    if (!fromNormalized) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
    }

    const isConfirm = CONFIRM_LIST_IDS.some((id) => buttonPayload === id || body === id) ||
      /تم الاستلام|استلام|حسنا|ok|confirm/i.test(body) ||
      /تم الاستلام|استلام|حسنا|ok|confirm/i.test(buttonText)

    if (!isConfirm) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
    }

    const orders = await dbGetOrders()
    const order = orders
      .filter((o) => PENDING_STATUSES.includes(o.status))
      .filter((o) => normalizePhoneToE164(o.phone) === fromNormalized)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

    if (order) {
      await dbDecrementStockForOrder(order)
      await dbSetOrderStatus(order.id, 'confirmed')
      console.log('[WhatsApp webhook] Commande', order.id, 'confirmée par le client (réponse liste)')
    }

    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  } catch (e) {
    console.error('[WhatsApp webhook]', e.message)
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
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
    achatFournisseurDone: o.achatFournisseurDone === true,
    depotExpedieDone: o.depotExpedieDone === true,
    changeRequestedByAdmin: o.changeRequestedByAdmin === true,
    changeRequestedReason: o.changeRequestedReason || undefined,
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
    achatFournisseurDone: a.achatFournisseurDone === true,
    depotExpedieDone: a.depotExpedieDone === true,
    changeRequestedByAdmin: a.changeRequestedByAdmin === true,
    changeRequestedReason: a.changeRequestedReason || undefined,
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

app.get('/api/whatsapp/check', (_req, res) => {
  const sid = !!process.env.TWILIO_ACCOUNT_SID
  const token = !!process.env.TWILIO_AUTH_TOKEN
  const from = !!process.env.TWILIO_WHATSAPP_FROM
  const contentSid = !!process.env.TWILIO_WHATSAPP_CONTENT_SID
  res.json({
    configured: !!(sid && token && from),
    hasAccountSid: sid,
    hasAuthToken: token,
    hasFrom: from,
    hasContentSid: contentSid,
  })
})

// Diagnostic et test des notifications email confirmateur
app.get('/api/email/check', (_req, res) => {
  const configured = isEmailConfigured()
  const useResend = !!(process.env.RESEND_API_KEY || '').trim()
  const to = (process.env.CONFIRMATEUR_EMAILS || 'protecphonedz@gmail.com')
    .split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
  const message = configured
    ? (useResend ? 'Resend configuré. ' : 'SMTP configuré. ') + 'Les confirmateurs recevront un email à chaque nouvelle commande.'
    : 'Email non configuré. Ajoutez RESEND_API_KEY (recommandé sur Render) ou SMTP_HOST/SMTP_USER/SMTP_PASS.'
  res.json({ configured, method: useResend ? 'resend' : 'smtp', message, to })
})

app.post('/api/email/test', async (_req, res) => {
  const result = await sendTestEmail()
  if (result.ok) {
    return res.json({ ok: true, message: 'Email de test envoyé. Vérifiez la boîte des confirmateurs (et les spams).' })
  }
  res.status(500).json({ ok: false, error: result.error, code: result.code })
})

app.post('/api/orders', async (req, res) => {
  try {
    const a = req.body
    const order = apiToOrder(a)
    if (!order.id || !order.confirmationCode) {
      return res.status(400).json({ error: 'id et confirmationCode requis' })
    }
    await dbSaveOrder(order)
    sendOrderConfirmationWhatsApp(order).then((result) => {
      if (!result.ok) console.error('[WhatsApp]', result.error)
    }).catch((err) => console.error('[WhatsApp]', err))
    sendNewOrderNotificationToConfirmateurs(order).then((result) => {
      if (result.ok) console.log('[Email] Notification commande', order.id, 'envoyée.')
      else console.error('[Email] Notification commande', order.id, 'échouée:', result.error)
    }).catch((err) => console.error('[Email] Exception envoi notification:', err.message || err))
    res.status(201).json(orderToApi(order))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    const orders = await dbGetOrders()
    const existing = orders.find((o) => o.id === id)
    if (!existing) return res.status(404).json({ error: 'Commande introuvable' })
    const partial = apiToOrder({ ...orderToApi(existing), ...req.body })
    const merged = {
      ...existing,
      customerName: partial.customerName ?? existing.customerName,
      phone: partial.phone ?? existing.phone,
      address: partial.address ?? existing.address,
      wilaya: partial.wilaya ?? existing.wilaya,
      deliveryType: partial.deliveryType ?? existing.deliveryType,
      deliveryPrice: partial.deliveryPrice !== undefined ? partial.deliveryPrice : existing.deliveryPrice,
      total: partial.total !== undefined ? partial.total : existing.total,
      yalidineStopdeskId: partial.yalidineStopdeskId !== undefined ? partial.yalidineStopdeskId : existing.yalidineStopdeskId,
      yalidineStopdeskName: partial.yalidineStopdeskName !== undefined ? partial.yalidineStopdeskName : existing.yalidineStopdeskName,
    }
    await dbSaveOrder(merged)
    res.status(200).json(orderToApi(merged))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status requis' })
    if (status === 'confirmed') {
      const orders = await dbGetOrders()
      const order = orders.find((o) => o.id === id)
      if (order && order.status !== 'confirmed') {
        await dbDecrementStockForOrder(order)
      }
    }
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

app.patch('/api/orders/:id/achat-done', async (req, res) => {
  try {
    const { id } = req.params
    const done = req.body?.done === true
    await dbSetOrderAchatDone(id, done)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/orders/:id/depot-done', async (req, res) => {
  try {
    const { id } = req.params
    const done = req.body?.done === true
    await dbSetOrderDepotDone(id, done)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/orders/:id/request-change', async (req, res) => {
  try {
    const { id } = req.params
    const reason = req.body?.reason != null ? String(req.body.reason).trim() : ''
    const orders = await dbGetOrders()
    const order = orders.find((o) => o.id === id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable' })
    await dbRequestOrderChange(id, reason || undefined)
    const updatedOrders = await dbGetOrders()
    const updatedOrder = updatedOrders.find((o) => o.id === id) || { ...order, status: 'tentative1', changeRequestedByAdmin: true, changeRequestedReason: reason || undefined }
    sendOrderChangeRequestToConfirmateurs(updatedOrder).then((result) => {
      if (!result.ok) console.error('[API] request-change email:', result.error)
    }).catch((err) => console.error('[API] request-change email:', err.message))
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    await dbDeleteOrder(id)
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

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ error: 'id requis' })
    await dbDeleteProduct(id)
    res.status(204).send()
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

// --- Communes par wilaya (source: leblad / données officielles Algérie, utilisées par Yalidine) ---
app.get('/api/communes', async (req, res) => {
  try {
    const wilaya = (req.query.wilaya || req.query.wilaya_id || '').toString().trim()
    if (!wilaya) return res.json([])
    const code = wilaya.length === 1 ? '0' + wilaya : wilaya
    const wilayaNum = parseInt(code, 10)
    if (Number.isNaN(wilayaNum) || wilayaNum < 1 || wilayaNum > 58) return res.json([])
    const leblad = (await import('@dzcode-io/leblad')).default
    const baladyiats = leblad.getBaladyiatsForWilaya(wilayaNum) || []
    const names = baladyiats.map((b) => (b.name != null ? String(b.name).trim() : '')).filter(Boolean)
    res.json(names)
  } catch (e) {
    console.warn('[API communes]', e.message)
    res.json([])
  }
})

// --- Collections (1 ou plusieurs landing pages) ---
app.get('/api/collections', async (_req, res) => {
  try {
    res.json(await dbGetCollections())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/collections/:slug', async (req, res) => {
  try {
    const collection = await dbGetCollectionBySlug(req.params.slug)
    if (!collection) return res.status(404).json({ error: 'Collection introuvable' })
    res.json(collection)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/collections', async (req, res) => {
  try {
    const { slug, name, landingSlugs } = req.body || {}
    if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'slug requis' })
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
    if (!cleanSlug) return res.status(400).json({ error: 'slug invalide' })
    const slugs = Array.isArray(landingSlugs) ? landingSlugs : []
    await dbSaveCollection({ slug: cleanSlug, name: name ? String(name).trim() : '', landingSlugs: slugs })
    res.json(await dbGetCollectionBySlug(cleanSlug))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/collections/:slug', async (req, res) => {
  try {
    const existing = await dbGetCollectionBySlug(req.params.slug)
    if (!existing) return res.status(404).json({ error: 'Collection introuvable' })
    const { name, landingSlugs } = req.body || {}
    const name2 = name !== undefined ? String(name).trim() : existing.name
    const slugs = landingSlugs !== undefined ? (Array.isArray(landingSlugs) ? landingSlugs : []) : existing.landingSlugs
    await dbSaveCollection({ slug: existing.slug, name: name2, landingSlugs: slugs })
    res.json(await dbGetCollectionBySlug(existing.slug))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/collections/:slug', async (req, res) => {
  try {
    await dbDeleteCollection(req.params.slug)
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

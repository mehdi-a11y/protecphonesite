/**
 * Envoi d'un message WhatsApp de confirmation de commande (via Twilio).
 * Deux modes :
 * - Avec TWILIO_WHATSAPP_CONTENT_SID : envoi par template (recommandé pour la prod, obligatoire pour "business-initiated").
 * - Sans ContentSid : envoi avec Body (sandbox uniquement, si le client a déjà répondu).
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM // ex: whatsapp:+14155238886 (sandbox) ou whatsapp:+213XXX
const TWILIO_WHATSAPP_CONTENT_SID = process.env.TWILIO_WHATSAPP_CONTENT_SID // optionnel : SID du template (ex: HXb5b62...)

function isConfigured() {
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM
}

/**
 * Normalise un numéro de téléphone algérien en format E.164 (213XXXXXXXXX).
 * @param {string} phone - Numéro saisi (ex: 0550123456, 550123456, 213550123456)
 * @returns {string|null} - Numéro E.164 ou null si invalide
 */
export function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('5')) {
    return '213' + digits // 5XXXXXXXX mobile
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return '213' + digits.slice(1) // 05XXXXXXXX
  }
  if (digits.length === 12 && digits.startsWith('213')) {
    return digits
  }
  if (digits.length === 11 && digits.startsWith('213')) {
    return digits
  }
  if (digits.length === 9) {
    return '213' + digits
  }
  return null
}

/**
 * Envoie un message WhatsApp de confirmation de commande au client via l'API Twilio.
 * @param {object} order - Commande { id, customerName, phone, total, confirmationCode }
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendOrderConfirmationWhatsApp(order) {
  if (!isConfigured()) {
    console.log('[WhatsApp] Envoi ignoré : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ou TWILIO_WHATSAPP_FROM manquant dans .env')
    return { ok: false, error: 'WhatsApp (Twilio) non configuré' }
  }

  const toE164 = normalizePhoneToE164(order.phone)
  if (!toE164) {
    console.warn('[WhatsApp] Numéro invalide pour WhatsApp:', order.phone)
    return { ok: false, error: 'Numéro de téléphone invalide pour WhatsApp' }
  }
  console.log('[WhatsApp] Envoi vers +' + toE164 + ' pour commande', order.id)

  const toWhatsApp = `whatsapp:+${toE164}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  let body
  if (TWILIO_WHATSAPP_CONTENT_SID) {
    // Envoi par template (FR ou AR) : 1=nom, 2=n° commande, 3=code confirmation, 4=montant
    const amount = order.total ?? 0
    const amountLabel = `${amount.toLocaleString('ar-DZ')} د.ج` // ex: ٥٬٠٠٠ د.ج (arabe) ou garder "5000 DA"
    const contentVariables = JSON.stringify({
      1: (order.customerName || 'Client').trim(),
      2: String(order.id || ''),
      3: String(order.confirmationCode || ''),
      4: amountLabel,
    })
    body = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: toWhatsApp,
      ContentSid: TWILIO_WHATSAPP_CONTENT_SID,
      ContentVariables: contentVariables,
    })
  } else {
    const message = [
      `Bonjour ${order.customerName || 'Client'},`,
      '',
      `Votre commande *${order.id}* a bien été enregistrée.`,
      `Code de confirmation : *${order.confirmationCode || ''}*`,
      `Montant total : *${order.total ?? 0} DA*.`,
      '',
      'Paiement à la livraison (COD). Merci pour votre confiance !',
    ].join('\n')
    body = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: toWhatsApp,
      Body: message,
    })
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: body.toString(),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errMsg = data.message || data.error_message || res.statusText
      console.error('[WhatsApp] Twilio error:', res.status, errMsg, data.code || '')
      return { ok: false, error: errMsg }
    }
    console.log('[WhatsApp] Message envoyé avec succès vers +' + toE164)
    return { ok: true }
  } catch (e) {
    console.error('[WhatsApp] Send failed:', e.message)
    return { ok: false, error: e.message }
  }
}

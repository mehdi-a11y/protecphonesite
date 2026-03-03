/**
 * Notification email au confirmateur lors d'une nouvelle commande.
 *
 * Configuration dans .env :
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   Optionnel : EMAIL_FROM (sinon SMTP_USER), CONFIRMATEUR_EMAILS (sinon liste par défaut)
 *
 * Exemple Gmail : SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false,
 *   SMTP_USER=votre@gmail.com, SMTP_PASS=mot_de_passe_application_16_caracteres
 */

import nodemailer from 'nodemailer'

const CONFIRMATEUR_EMAILS_DEFAULT = [
  'brahimbouhounali2004@gmail.com',
  'nacermido68@gmail.com',
]

function getConfirmateurEmails() {
  const env = (process.env.CONFIRMATEUR_EMAILS || '').trim()
  if (env) return env.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
  return CONFIRMATEUR_EMAILS_DEFAULT
}

function getTransporter() {
  const host = process.env.SMTP_HOST || ''
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  if (!host || !user || !pass) return null
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'
  return nodemailer.createTransport({
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    auth: { user, pass },
    // Timeouts plus longs : sur hébergement gratuit (ex. Render), la connexion à Gmail peut être lente
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  })
}

/**
 * Envoie un email aux confirmateurs pour les notifier d'une nouvelle commande.
 * Ne bloque pas : en cas d'erreur, log et retourne { ok: false, error }.
 *
 * @param {object} order - Commande { id, customerName, phone, address, wilaya, deliveryType, total, confirmationCode, items }
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function isEmailConfigured() {
  const host = process.env.SMTP_HOST || ''
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  return !!(host && user && pass)
}

export async function sendNewOrderNotificationToConfirmateurs(order) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[Email] SMTP non configuré. Définissez SMTP_HOST, SMTP_USER et SMTP_PASS dans .env puis redémarrez le serveur.')
    return { ok: false, error: 'SMTP non configuré' }
  }

  const to = getConfirmateurEmails()
  if (to.length === 0) {
    console.warn('[Email] Aucune adresse confirmateur configurée.')
    return { ok: false, error: 'Aucune adresse' }
  }

  console.log('[Email] Envoi notification nouvelle commande', order.id, 'vers', to.length, 'destinataire(s)')

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@protecphone.dz'
  const subject = `[ProtecPhone] Nouvelle commande ${order.id}`
  const deliveryLabel = order.deliveryType === 'yalidine'
    ? `Bureau Yalidine${order.yalidineStopdeskName ? ` : ${order.yalidineStopdeskName}` : ''}`
    : 'À domicile'
  const itemsList = (order.items || [])
    .map((i) => `- ${i.antichoc?.name || 'Article'} ${i.isUpsell ? '(offre)' : ''} : ${i.antichoc?.price ?? 0} DA`)
    .join('\n')

  const text = [
    `Nouvelle commande sur ProtecPhone : ${order.id}`,
    '',
    `Client : ${order.customerName || '-'}`,
    `Téléphone : ${order.phone || '-'}`,
    `Adresse / Commune : ${order.address || '-'}`,
    `Wilaya : ${order.wilaya || '-'}`,
    `Livraison : ${deliveryLabel}`,
    `Total : ${order.total ?? 0} DA`,
    `Code de confirmation : ${order.confirmationCode || '-'}`,
    '',
    'Articles :',
    itemsList || '-',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nouvelle commande ${order.id}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
  <h2 style="color: #0ea5e9;">Nouvelle commande ProtecPhone</h2>
  <p><strong>N° commande :</strong> ${order.id}</p>
  <p><strong>Client :</strong> ${order.customerName || '-'}</p>
  <p><strong>Téléphone :</strong> ${order.phone || '-'}</p>
  <p><strong>Adresse / Commune :</strong> ${order.address || '-'}</p>
  <p><strong>Wilaya :</strong> ${order.wilaya || '-'}</p>
  <p><strong>Livraison :</strong> ${deliveryLabel}</p>
  <p><strong>Total :</strong> ${order.total ?? 0} DA</p>
  <p><strong>Code de confirmation :</strong> <code>${order.confirmationCode || '-'}</code></p>
  <h3>Articles</h3>
  <ul>${(order.items || []).map((i) => `<li>${i.antichoc?.name || 'Article'}${i.isUpsell ? ' (offre)' : ''} — ${i.antichoc?.price ?? 0} DA</li>`).join('') || '<li>-</li>'}</ul>
  <p style="color: #64748b; font-size: 12px;">Plateforme de confirmation : accédez au site pour confirmer et envoyer à Yalidine.</p>
</body>
</html>
`.trim()

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })
    console.log('[Email] Notification envoyée avec succès vers', to.join(', '))
    return { ok: true }
  } catch (err) {
    const message = err.message || String(err)
    console.error('[Email] Erreur envoi:', message)
    if (err.response) console.error('[Email] Réponse SMTP:', err.response)
    return { ok: false, error: message }
  }
}

/**
 * Envoie un email de test aux confirmateurs (pour vérifier la config SMTP).
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendTestEmail() {
  const transporter = getTransporter()
  if (!transporter) return { ok: false, error: 'SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS)' }
  const to = getConfirmateurEmails()
  if (to.length === 0) return { ok: false, error: 'Aucune adresse confirmateur' }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER
  try {
    await transporter.sendMail({
      from,
      to,
      subject: '[ProtecPhone] Test notification email',
      text: 'Ceci est un email de test. Si vous le recevez, les notifications commande sont opérationnelles.',
      html: '<p>Ceci est un email de test. Si vous le recevez, les notifications commande sont opérationnelles.</p>',
    })
    return { ok: true }
  } catch (err) {
    const msg = err.message || String(err)
    const code = err.code || err.responseCode
    return { ok: false, error: msg, code: code ? String(code) : undefined }
  }
}

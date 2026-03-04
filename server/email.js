/**
 * Notification email au confirmateur lors d'une nouvelle commande.
 *
 * Deux modes (priorité à Resend si défini) :
 * 1) Resend (API HTTP, recommandé sur Render) : RESEND_API_KEY + optionnel RESEND_FROM
 *    Créer un compte sur resend.com, vérifier un domaine ou utiliser onboarding@resend.dev pour test.
 * 2) SMTP (Gmail, etc.) : SMTP_HOST, SMTP_USER, SMTP_PASS — souvent bloqué sur hébergement gratuit.
 */

import dns from 'node:dns'
import nodemailer from 'nodemailer'

// Sur Render (et autres hébergeurs), l’IPv6 sortant peut être indisponible (ENETUNREACH).
// Forcer l’usage de l’IPv4 pour la connexion SMTP à Gmail.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

const CONFIRMATEUR_EMAILS_DEFAULT = ['protecphonedz@gmail.com']

function getConfirmateurEmails() {
  const env = (process.env.CONFIRMATEUR_EMAILS || '').trim()
  if (env) return env.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
  return CONFIRMATEUR_EMAILS_DEFAULT
}

let transporterPromise = null

/** Résout le host en IPv4 pour éviter ENETUNREACH sur Render (pas d'IPv6 sortant). */
async function getTransporter() {
  const host = process.env.SMTP_HOST || ''
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  if (!host || !user || !pass) return null
  if (transporterPromise) return transporterPromise
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'
  let connectHost = host
  if (host && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    try {
      const { address } = await dns.promises.lookup(host, { family: 4 })
      connectHost = address
    } catch (_) {}
  }
  const transport = nodemailer.createTransport({
    host: connectHost,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    auth: { user, pass },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    ...(connectHost !== host && { tls: { servername: host } }),
  })
  transporterPromise = transport
  return transport
}

/**
 * Envoie un email aux confirmateurs pour les notifier d'une nouvelle commande.
 * Ne bloque pas : en cas d'erreur, log et retourne { ok: false, error }.
 *
 * @param {object} order - Commande { id, customerName, phone, address, wilaya, deliveryType, total, confirmationCode, items }
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function isEmailConfigured() {
  if ((process.env.RESEND_API_KEY || '').trim()) return true
  const host = process.env.SMTP_HOST || ''
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  return !!(host && user && pass)
}

/** Envoi via l'API Resend (HTTP, non bloqué sur Render). */
async function sendViaResend({ from, to, subject, text, html }) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) return { ok: false, error: 'RESEND_API_KEY manquant' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: from || process.env.RESEND_FROM || 'ProtecPhone <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || undefined,
      html: html || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || data.error?.message || data.statusText || res.status
    return { ok: false, error: String(msg) }
  }
  return { ok: true }
}

export async function sendNewOrderNotificationToConfirmateurs(order) {
  const to = getConfirmateurEmails()
  if (to.length === 0) {
    console.warn('[Email] Aucune adresse confirmateur configurée.')
    return { ok: false, error: 'Aucune adresse' }
  }

  console.log('[Email] Envoi notification nouvelle commande', order.id, 'vers', to.length, 'destinataire(s)')

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

  // Resend (API HTTP) : prioritaire si défini, évite les blocages SMTP sur Render
  if ((process.env.RESEND_API_KEY || '').trim()) {
    const result = await sendViaResend({ to, subject, text, html })
    if (result.ok) console.log('[Email] Notification envoyée (Resend) vers', to.join(', '))
    else console.error('[Email] Resend:', result.error)
    return result
  }

  const transporter = await getTransporter()
  if (!transporter) {
    console.warn('[Email] Ni RESEND_API_KEY ni SMTP configuré.')
    return { ok: false, error: 'Email non configuré (Resend ou SMTP)' }
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@protecphone.dz'
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
 * Envoie un email aux confirmateurs : l'admin demande un changement de commande.
 * La commande a été repassée en « non confirmée ». Le confirmateur doit contacter le client
 * et reconfirmer / modifier la commande.
 * @param {object} order - Commande { id, customerName, phone, confirmationCode, items, changeRequestedReason }
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendOrderChangeRequestToConfirmateurs(order) {
  const to = getConfirmateurEmails()
  if (to.length === 0) {
    console.warn('[Email] Aucune adresse confirmateur configurée.')
    return { ok: false, error: 'Aucune adresse' }
  }

  console.log('[Email] Envoi demande changement commande', order.id, 'vers', to.length, 'destinataire(s)')

  const reason = order.changeRequestedReason ? String(order.changeRequestedReason).trim() : ''
  const reasonLabel = reason || 'Article(s) introuvable(s) chez le fournisseur.'
  const subject = `[ProtecPhone] Changer la commande ${order.id} — à reconfirmer`
  const itemsList = (order.items || [])
    .map((i) => `- ${i.antichoc?.name || 'Article'} ${i.isUpsell ? '(offre)' : ''}`)
    .join('\n')

  const text = [
    `L'administrateur demande de faire changer la commande ${order.id}. La commande a été repassée en « non confirmée ».`,
    '',
    `Raison indiquée par l'admin : ${reasonLabel}`,
    '',
    'Action requise :',
    '- Contacter le client (téléphone ci-dessous) pour lui demander de modifier sa commande.',
    '- Une fois le client d\'accord, reconfirmer la commande sur la plateforme (changement de produit / variante, puis confirmation).',
    '',
    `Commande : ${order.id}`,
    `Client : ${order.customerName || '-'}`,
    `Téléphone : ${order.phone || '-'}`,
    `Code de confirmation : ${order.confirmationCode || '-'}`,
    '',
    'Articles actuels :',
    itemsList || '-',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Changer la commande ${order.id}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
  <h2 style="color: #f59e0b;">Changer la commande — à reconfirmer</h2>
  <p>L'administrateur a demandé un changement pour la commande <strong>${order.id}</strong>. La commande a été repassée en « non confirmée ».</p>
  <p><strong>Raison indiquée par l'admin :</strong></p>
  <p style="background: #fef3c7; padding: 10px; border-radius: 6px;">${reasonLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  <p><strong>À faire :</strong></p>
  <ul>
    <li>Contacter le client (téléphone ci-dessous) pour lui demander de modifier sa commande.</li>
    <li>Une fois le client d'accord, reconfirmer la commande sur la plateforme (changement de produit / variante si besoin, puis confirmation).</li>
  </ul>
  <p><strong>Commande :</strong> ${order.id}</p>
  <p><strong>Client :</strong> ${order.customerName || '-'}</p>
  <p><strong>Téléphone :</strong> ${order.phone || '-'}</p>
  <p><strong>Code de confirmation :</strong> <code>${order.confirmationCode || '-'}</code></p>
  <h3>Articles actuels</h3>
  <ul>${(order.items || []).map((i) => `<li>${i.antichoc?.name || 'Article'}${i.isUpsell ? ' (offre)' : ''}</li>`).join('') || '<li>-</li>'}</ul>
  <p style="color: #64748b; font-size: 12px;">Accédez à la plateforme confirmateur pour voir cette commande et la gérer.</p>
</body>
</html>
`.trim()

  if ((process.env.RESEND_API_KEY || '').trim()) {
    const result = await sendViaResend({ to, subject, text, html })
    if (result.ok) console.log('[Email] Demande changement envoyée (Resend) vers', to.join(', '))
    else console.error('[Email] Resend:', result.error)
    return result
  }

  const transporter = await getTransporter()
  if (!transporter) {
    console.warn('[Email] Ni RESEND_API_KEY ni SMTP configuré.')
    return { ok: false, error: 'Email non configuré (Resend ou SMTP)' }
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@protecphone.dz'
  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })
    console.log('[Email] Demande changement envoyée vers', to.join(', '))
    return { ok: true }
  } catch (err) {
    const message = err.message || String(err)
    console.error('[Email] Erreur envoi demande changement:', message)
    return { ok: false, error: message }
  }
}

/**
 * Envoie un email de test aux confirmateurs (pour vérifier la config SMTP).
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendTestEmail() {
  const to = getConfirmateurEmails()
  if (to.length === 0) return { ok: false, error: 'Aucune adresse confirmateur' }
  const subject = '[ProtecPhone] Test notification email'
  const text = 'Ceci est un email de test. Si vous le recevez, les notifications commande sont opérationnelles.'
  const html = '<p>Ceci est un email de test. Si vous le recevez, les notifications commande sont opérationnelles.</p>'
  if ((process.env.RESEND_API_KEY || '').trim()) {
    return sendViaResend({ to, subject, text, html })
  }
  const transporter = await getTransporter()
  if (!transporter) return { ok: false, error: 'Ni RESEND_API_KEY ni SMTP configuré' }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER
  try {
    await transporter.sendMail({ from, to, subject, text, html })
    return { ok: true }
  } catch (err) {
    const msg = err.message || String(err)
    return { ok: false, error: msg, code: err.code ? String(err.code) : undefined }
  }
}

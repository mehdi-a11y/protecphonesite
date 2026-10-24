/**
 * Authentification admin / confirmateur (jeton signé HMAC, sans dépendance).
 * Variables .env : ADMIN_PASSWORD, CONFIRMATEUR_PASSWORD, AUTH_SECRET.
 * Sans AUTH_SECRET, un secret aléatoire est généré au démarrage (les sessions expirent à chaque redémarrage).
 * Sans mot de passe défini pour un rôle, la connexion à ce rôle est désactivée.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const ROLES = ['admin', 'confirmateur']

let secret = null
function getSecret() {
  if (secret) return secret
  secret = (process.env.AUTH_SECRET || '').trim()
  if (!secret) {
    console.warn('[Auth] AUTH_SECRET non défini : secret aléatoire utilisé (sessions perdues au redémarrage).')
    secret = randomBytes(32).toString('hex')
  }
  return secret
}

function passwordForRole(role) {
  const key = role === 'admin' ? 'ADMIN_PASSWORD' : 'CONFIRMATEUR_PASSWORD'
  return (process.env[key] || '').trim()
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function sign(payload) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createToken(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Retourne { role, exp } si le jeton est valide et non expiré, sinon null. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (!ROLES.includes(data.role) || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

/** POST /api/auth/login { role, password } → { token, role, expiresAt } */
export function loginHandler(req, res) {
  const role = String(req.body?.role || '')
  const password = String(req.body?.password || '')
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  const expected = passwordForRole(role)
  if (!expected) return res.status(503).json({ error: 'Connexion désactivée : mot de passe non configuré sur le serveur' })
  if (!safeEqual(password, expected)) return res.status(401).json({ error: 'Mot de passe incorrect.' })
  const token = createToken(role)
  res.json({ token, role, expiresAt: verifyToken(token).exp })
}

/** Middleware : exige un jeton Bearer valide pour l'un des rôles donnés. */
export function requireRole(...roles) {
  return (req, res, next) => {
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const data = verifyToken(token)
    if (!data) return res.status(401).json({ error: 'Non authentifié' })
    if (!roles.includes(data.role)) return res.status(403).json({ error: 'Accès refusé' })
    req.auth = data
    next()
  }
}

export const requireAdmin = requireRole('admin')
export const requireStaff = requireRole('admin', 'confirmateur')

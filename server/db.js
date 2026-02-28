/**
 * Base de données partagée : PostgreSQL si DATABASE_URL est défini, sinon stockage en mémoire.
 */

const ORDER_STATUSES = [
  'tentative1', 'tentative2', 'tentative3', 'callback',
  'confirmed', 'livre', 'retourne', 'cancelled',
]

let pool = null
let useMemory = true

export async function initDb() {
  const url = process.env.DATABASE_URL
  if (!url || url.trim() === '') {
    console.log('DATABASE_URL non défini : utilisation du stockage en mémoire (données perdues au redémarrage).')
    return
  }
  try {
    const { default: pg } = await import('pg')
    pool = new pg.Pool({
      connectionString: url,
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    })
    useMemory = false
    await runMigrations()
    console.log('Base de données PostgreSQL connectée.')
  } catch (err) {
    console.warn('PostgreSQL indisponible:', err.message, '- utilisation du stockage en mémoire.')
  }
}

async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        wilaya TEXT,
        delivery_type TEXT,
        delivery_price INTEGER,
        total INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'tentative1',
        confirmation_code TEXT NOT NULL,
        yalidine_tracking TEXT,
        yalidine_sent_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        items JSONB NOT NULL DEFAULT '[]'
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        wholesale_price INTEGER DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        image TEXT,
        photo_url TEXT,
        photo_gallery JSONB DEFAULT '[]',
        compatible_with JSONB NOT NULL DEFAULT '[]'
      )
    `)
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_gallery JSONB DEFAULT '[]'
    `).catch(() => {})
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS color_ids JSONB DEFAULT '[]'
    `).catch(() => {})
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_prices (
        wilaya_code TEXT PRIMARY KEY,
        domicile INTEGER NOT NULL DEFAULT 0,
        yalidine INTEGER NOT NULL DEFAULT 0
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS landing_pages (
        slug TEXT PRIMARY KEY,
        antichoc_id TEXT NOT NULL,
        title TEXT
      )
    `)
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS yalidine_stopdesk_id TEXT
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS yalidine_stopdesk_name TEXT
    `).catch(() => {})
  } finally {
    client.release()
  }
}

// --- Stockage en mémoire (fallback) ---
const memoryOrders = []
const memoryProducts = new Map()
const memoryDelivery = new Map()
const memoryLandingPages = new Map()

// --- Orders ---
export async function dbGetOrders() {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    )
    return rows.map(rowToOrder)
  }
  return memoryOrders.slice()
}

export async function dbSaveOrder(order) {
  const row = orderToRow(order)
  if (pool) {
    await pool.query(
      `INSERT INTO orders (id, customer_name, phone, address, wilaya, delivery_type, delivery_price, total, status, confirmation_code, yalidine_tracking, yalidine_sent_at, yalidine_stopdesk_id, yalidine_stopdesk_name, created_at, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::timestamptz,$16::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         customer_name=$2, phone=$3, address=$4, wilaya=$5, delivery_type=$6, delivery_price=$7, total=$8, status=$9,
         confirmation_code=$10, yalidine_tracking=$11, yalidine_sent_at=$12, yalidine_stopdesk_id=$13, yalidine_stopdesk_name=$14, created_at=$15::timestamptz, items=$16::jsonb`,
      [row.id, row.customer_name, row.phone, row.address, row.wilaya, row.delivery_type, row.delivery_price, row.total, row.status, row.confirmation_code, row.yalidine_tracking, row.yalidine_sent_at, row.yalidine_stopdesk_id, row.yalidine_stopdesk_name, row.created_at, JSON.stringify(row.items)]
    )
    return
  }
  const i = memoryOrders.findIndex((o) => o.id === order.id)
  if (i >= 0) memoryOrders[i] = order
  else memoryOrders.unshift(order)
}

export async function dbSetOrderStatus(orderId, status) {
  if (!ORDER_STATUSES.includes(status)) return
  if (pool) {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId])
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.status = status
}

export async function dbUpdateOrderYalidine(orderId, tracking, sentAt) {
  if (pool) {
    await pool.query(
      'UPDATE orders SET yalidine_tracking = $1, yalidine_sent_at = $2 WHERE id = $3',
      [tracking, sentAt, orderId]
    )
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) {
    o.yalidineTracking = tracking
    o.yalidineSentAt = sentAt
  }
}

export async function dbDeleteOrder(orderId) {
  if (pool) {
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId])
    return
  }
  const i = memoryOrders.findIndex((x) => x.id === orderId)
  if (i >= 0) memoryOrders.splice(i, 1)
}

export async function dbFindOrderByYalidineTracking(tracking) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE yalidine_tracking = $1 LIMIT 1',
      [String(tracking).trim()]
    )
    return rows[0] ? rowToOrder(rows[0]) : null
  }
  return memoryOrders.find((o) => (o.yalidineTracking || '').trim() === String(tracking).trim()) || null
}

function rowToOrder(r) {
  return {
    id: r.id,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    wilaya: r.wilaya || undefined,
    deliveryType: r.delivery_type || undefined,
    deliveryPrice: r.delivery_price ?? undefined,
    items: Array.isArray(r.items) ? r.items : (r.items && typeof r.items === 'object' ? (r.items.data || r.items) : []) || [],
    total: r.total,
    status: r.status,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    confirmationCode: r.confirmation_code,
    yalidineTracking: r.yalidine_tracking || undefined,
    yalidineSentAt: r.yalidine_sent_at || undefined,
    yalidineStopdeskId: r.yalidine_stopdesk_id ?? undefined,
    yalidineStopdeskName: r.yalidine_stopdesk_name ?? undefined,
  }
}

function orderToRow(o) {
  return {
    id: o.id,
    customer_name: o.customerName,
    phone: o.phone,
    address: o.address,
    wilaya: o.wilaya || null,
    delivery_type: o.deliveryType || null,
    delivery_price: o.deliveryPrice ?? null,
    total: o.total,
    status: o.status || 'tentative1',
    confirmation_code: o.confirmationCode,
    yalidine_tracking: o.yalidineTracking || null,
    yalidine_sent_at: o.yalidineSentAt || null,
    yalidine_stopdesk_id: o.yalidineStopdeskId ?? null,
    yalidine_stopdesk_name: o.yalidineStopdeskName ?? null,
    created_at: o.createdAt || new Date().toISOString(),
    items: o.items || [],
  }
}

// --- Products ---
export async function dbGetProducts() {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id')
    return rows.map(rowToProduct)
  }
  return Array.from(memoryProducts.values())
}

export async function dbSaveProducts(products) {
  if (pool) {
    for (const p of products) {
      const r = productToRow(p)
      await pool.query(
        `INSERT INTO products (id, name, description, price, wholesale_price, quantity, image, photo_url, photo_gallery, color_ids, compatible_with)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)
         ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, price=$4, wholesale_price=$5, quantity=$6, image=$7, photo_url=$8, photo_gallery=$9::jsonb, color_ids=$10::jsonb, compatible_with=$11::jsonb`,
        [r.id, r.name, r.description, r.price, r.wholesale_price, r.quantity, r.image, r.photo_url, JSON.stringify(r.photo_gallery || []), JSON.stringify(r.color_ids || []), JSON.stringify(r.compatible_with)]
      )
    }
    return
  }
  memoryProducts.clear()
  for (const p of products) memoryProducts.set(p.id, p)
}

function rowToProduct(r) {
  const gallery = r.photo_gallery != null && Array.isArray(r.photo_gallery) ? r.photo_gallery : (r.photo_gallery && r.photo_gallery.data ? r.photo_gallery.data : []) || []
  const colorIds = r.color_ids != null && Array.isArray(r.color_ids) ? r.color_ids : (r.color_ids && r.color_ids.data ? r.color_ids.data : []) || []
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    price: r.price ?? 0,
    wholesalePrice: r.wholesale_price ?? 0,
    quantity: r.quantity ?? 0,
    image: r.image || '',
    colorIds: colorIds.length ? colorIds : undefined,
    photoUrl: r.photo_url || (gallery[0] || ''),
    photoGallery: gallery.length ? gallery : undefined,
    compatibleWith: Array.isArray(r.compatible_with) ? r.compatible_with : (r.compatible_with && r.compatible_with.data ? r.compatible_with.data : []) || [],
  }
}

function productToRow(p) {
  const gallery = p.photoGallery ?? (p.photoUrl ? [p.photoUrl] : [])
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: p.price ?? 0,
    wholesale_price: p.wholesalePrice ?? p.wholesale_price ?? 0,
    quantity: p.quantity ?? 0,
    image: p.image || '',
    photo_url: (gallery[0] ?? p.photoUrl ?? p.photo_url) || '',
    photo_gallery: gallery,
    color_ids: p.colorIds ?? [],
    compatible_with: p.compatibleWith ?? p.compatible_with ?? [],
  }
}

// --- Delivery prices ---
export async function dbGetDeliveryPrices() {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM delivery_prices')
    const out = {}
    for (const r of rows) out[r.wilaya_code] = { domicile: r.domicile, yalidine: r.yalidine }
    return out
  }
  return Object.fromEntries(memoryDelivery)
}

export async function dbSaveDeliveryPrices(prices) {
  if (pool) {
    for (const [code, v] of Object.entries(prices)) {
      await pool.query(
        `INSERT INTO delivery_prices (wilaya_code, domicile, yalidine) VALUES ($1,$2,$3)
         ON CONFLICT (wilaya_code) DO UPDATE SET domicile=$2, yalidine=$3`,
        [code, v.domicile ?? 0, v.yalidine ?? 0]
      )
    }
    return
  }
  memoryDelivery.clear()
  for (const [k, v] of Object.entries(prices)) memoryDelivery.set(k, v)
}

// --- Landing pages ---
export async function dbGetLandingPages() {
  if (pool) {
    const { rows } = await pool.query('SELECT slug, antichoc_id, title FROM landing_pages ORDER BY slug')
    return rows.map((r) => ({ slug: r.slug, antichocId: r.antichoc_id, title: r.title || null }))
  }
  return Array.from(memoryLandingPages.values())
}

export async function dbGetLandingBySlug(slug) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT slug, antichoc_id, title FROM landing_pages WHERE slug = $1',
      [slug],
    )
    if (rows.length === 0) return null
    const r = rows[0]
    return { slug: r.slug, antichocId: r.antichoc_id, title: r.title || null }
  }
  return memoryLandingPages.get(slug) || null
}

export async function dbSaveLanding(landing) {
  const { slug, antichocId, title } = landing
  if (pool) {
    await pool.query(
      `INSERT INTO landing_pages (slug, antichoc_id, title) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET antichoc_id = $2, title = $3`,
      [slug, antichocId, title || null],
    )
    return
  }
  memoryLandingPages.set(slug, { slug, antichocId, title: title || null })
}

export async function dbDeleteLanding(slug) {
  if (pool) {
    await pool.query('DELETE FROM landing_pages WHERE slug = $1', [slug])
    return
  }
  memoryLandingPages.delete(slug)
}

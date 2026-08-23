/**
 * Base de données partagée : PostgreSQL si DATABASE_URL est défini, sinon stockage en mémoire.
 */

const ORDER_STATUSES = [
  'none', 'tentative1', 'tentative2', 'tentative3', 'callback',
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
        status TEXT NOT NULL DEFAULT 'none',
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
      ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_stocks JSONB DEFAULT '{}'
    `).catch(() => {})
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_available_at_supplier JSONB DEFAULT '{}'
    `).catch(() => {})
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'iphone'
    `).catch(() => {})
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS compatible_with_samsung JSONB DEFAULT '[]'
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
      CREATE TABLE IF NOT EXISTS collections (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        landing_slugs JSONB NOT NULL DEFAULT '[]'
      )
    `)
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS yalidine_stopdesk_id TEXT
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS yalidine_stopdesk_name TEXT
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS achat_fournisseur_done BOOLEAN DEFAULT false
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS depot_expedie_done BOOLEAN DEFAULT false
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_requested_by_admin BOOLEAN DEFAULT false
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_requested_reason TEXT
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS colis_expedie BOOLEAN DEFAULT false
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS variants_stock_decremented_at_confirm JSONB DEFAULT '[]'
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_order_category TEXT
    `).catch(() => {})
    await client.query(`
      ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'none'
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
const memoryCollections = new Map()

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
      `INSERT INTO orders (id, customer_name, phone, address, wilaya, delivery_type, delivery_price, total, status, confirmation_code, yalidine_tracking, yalidine_sent_at, yalidine_stopdesk_id, yalidine_stopdesk_name, created_at, items, achat_fournisseur_done, depot_expedie_done, change_requested_by_admin, change_requested_reason, colis_expedie, variants_stock_decremented_at_confirm, confirmed_order_category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::timestamptz,$16::jsonb,$17,$18,$19,$20,$21,$22::jsonb,$23)
       ON CONFLICT (id) DO UPDATE SET
         customer_name=$2, phone=$3, address=$4, wilaya=$5, delivery_type=$6, delivery_price=$7, total=$8, status=$9,
         confirmation_code=$10, yalidine_tracking=$11, yalidine_sent_at=$12, yalidine_stopdesk_id=$13, yalidine_stopdesk_name=$14, created_at=$15::timestamptz, items=$16::jsonb, achat_fournisseur_done=$17, depot_expedie_done=$18, change_requested_by_admin=$19, change_requested_reason=$20, colis_expedie=$21, variants_stock_decremented_at_confirm=$22::jsonb, confirmed_order_category=$23`,
      [row.id, row.customer_name, row.phone, row.address, row.wilaya, row.delivery_type, row.delivery_price, row.total, row.status, row.confirmation_code, row.yalidine_tracking, row.yalidine_sent_at, row.yalidine_stopdesk_id, row.yalidine_stopdesk_name, row.created_at, JSON.stringify(row.items), row.achat_fournisseur_done === true, row.depot_expedie_done === true, row.change_requested_by_admin === true, row.change_requested_reason || null, row.colis_expedie === true, JSON.stringify(row.variants_stock_decremented_at_confirm || []), row.confirmed_order_category || null]
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

export async function dbSetOrderAchatDone(orderId, done) {
  if (pool) {
    await pool.query('UPDATE orders SET achat_fournisseur_done = $1 WHERE id = $2', [done === true, orderId])
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.achatFournisseurDone = done === true
}

export async function dbSetOrderDepotDone(orderId, done) {
  if (pool) {
    await pool.query('UPDATE orders SET depot_expedie_done = $1 WHERE id = $2', [done === true, orderId])
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.depotExpedieDone = done === true
}

export async function dbSetOrderChangeRequested(orderId, value) {
  if (pool) {
    await pool.query('UPDATE orders SET change_requested_by_admin = $1 WHERE id = $2', [value === true, orderId])
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.changeRequestedByAdmin = value === true
}

/** Demande de changement : passe la commande en « pas de statut », pose le flag et la raison. */
export async function dbRequestOrderChange(orderId, reason) {
  const reasonStr = reason && String(reason).trim() ? String(reason).trim() : null
  if (pool) {
    await pool.query(
      'UPDATE orders SET status = $1, change_requested_by_admin = true, change_requested_reason = $2 WHERE id = $3',
      ['none', reasonStr, orderId]
    )
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) {
    o.status = 'none'
    o.changeRequestedByAdmin = true
    o.changeRequestedReason = reasonStr || undefined
  }
}

/** Clé variante (couleur|modèle iPhone), comme dans le frontend. */
function variantKey(colorId, phoneId) {
  return `${colorId || ''}|${phoneId || ''}`
}

/** Clé pour enregistrer quelles variantes ont été décrémentées (productId|colorId|phoneId). */
function decrementedKey(productId, colorId, phoneId) {
  return `${productId || ''}|${colorId || ''}|${phoneId || ''}`
}

/** Retourne le stock actuel d'une variante (même logique que le frontend). */
function getVariantStock(product, colorId, phoneId) {
  const key = variantKey(colorId, phoneId)
  if (product.variantStocks && Object.keys(product.variantStocks).length > 0) {
    if (product.variantStocks[key] !== undefined) return Number(product.variantStocks[key]) || 0
    if (colorId && product.variantStocks[colorId] !== undefined) return Number(product.variantStocks[colorId]) || 0
  }
  return Number(product.quantity ?? 0) || 0
}

/** Variante disponible chez le fournisseur (stock 0 mais commandable). */
function isVariantAvailableFromSupplier(product, colorId, phoneId) {
  const key = variantKey(colorId, phoneId)
  return product.variantAvailableFromSupplier && product.variantAvailableFromSupplier[key] === true
}

/**
 * Catégorie de la commande à la confirmation (figée) : 'bloquees' | 'achats' | 'depot'.
 * À appeler AVANT dbDecrementStockForOrder (avec le stock actuel).
 */
export function getOrderCategoryAtConfirm(order, products) {
  const items = order.items && Array.isArray(order.items) ? order.items : []
  let hasBlocked = false
  let hasAchats = false
  let hasMainItem = false
  for (const item of items) {
    if (item.isUpsell || !item.selectedPhoneId) continue
    hasMainItem = true
    const product = products.find((p) => p.id === (item.antichoc && item.antichoc.id))
    const colorId = item.selectedColorId || ''
    const phoneId = item.selectedPhoneId || ''
    if (!product) {
      hasBlocked = true
      break
    }
    const stock = getVariantStock(product, colorId, phoneId)
    const available = isVariantAvailableFromSupplier(product, colorId, phoneId)
    if (stock <= 0 && !available) {
      hasBlocked = true
      break
    }
    if (stock <= 0 && available) hasAchats = true
  }
  if (!hasMainItem) return 'depot'
  if (hasBlocked) return 'bloquees'
  if (hasAchats) return 'achats'
  return 'depot'
}

/** Décrémente le stock uniquement pour les variantes avec stock > 0. Retourne les clés des variantes effectivement décrémentées (à enregistrer sur la commande). */
export async function dbDecrementStockForOrder(order) {
  const items = order.items && Array.isArray(order.items) ? order.items : []
  const decrementedKeys = []
  if (items.length === 0) return { decrementedKeys }
  const products = await dbGetProducts()
  const changedProducts = new Map()
  for (const item of items) {
    const antichoc = item.antichoc
    if (!antichoc || !antichoc.id) continue
    const product = products.find((p) => p.id === antichoc.id)
    if (!product) continue
    const colorId = item.selectedColorId || ''
    const phoneId = item.selectedPhoneId || (antichoc.compatibleWith && antichoc.compatibleWith[0]) || ''
    const stock = getVariantStock(product, colorId, phoneId)
    if (stock <= 0) continue
    const key = variantKey(colorId, phoneId)
    if (product.variantStocks && Object.keys(product.variantStocks).length > 0) {
      if (product.variantStocks[key] !== undefined) {
        product.variantStocks[key] = Number(product.variantStocks[key]) - 1
      } else if (colorId && product.variantStocks[colorId] !== undefined) {
        product.variantStocks[colorId] = Number(product.variantStocks[colorId]) - 1
      } else {
        product.quantity = Number(product.quantity ?? 0) - 1
      }
    } else {
      product.quantity = Number(product.quantity ?? 0) - 1
    }
    decrementedKeys.push(decrementedKey(product.id, colorId, phoneId))
    changedProducts.set(product.id, product)
  }
  for (const p of changedProducts.values()) await dbSaveProduct(p)
  return { decrementedKeys }
}

/** Incrémente le stock uniquement pour les variantes qui avaient été décrémentées à la confirmation (stock > 0 à ce moment-là). */
export async function dbIncrementStockForOrder(order) {
  const keys = order.variantsStockDecrementedAtConfirm
  if (!Array.isArray(keys) || keys.length === 0) return
  const products = await dbGetProducts()
  const changedProducts = new Map()
  for (const key of keys) {
    const parts = key.split('|')
    if (parts.length < 3) continue
    const [productId, colorId, phoneId] = parts
    const product = products.find((p) => p.id === productId)
    if (!product) continue
    const vkey = variantKey(colorId, phoneId)
    if (product.variantStocks && Object.keys(product.variantStocks).length > 0) {
      if (product.variantStocks[vkey] !== undefined) {
        product.variantStocks[vkey] = Number(product.variantStocks[vkey]) + 1
      } else if (colorId && product.variantStocks[colorId] !== undefined) {
        product.variantStocks[colorId] = Number(product.variantStocks[colorId]) + 1
      } else {
        product.quantity = Number(product.quantity ?? 0) + 1
      }
    } else {
      product.quantity = Number(product.quantity ?? 0) + 1
    }
    changedProducts.set(product.id, product)
  }
  for (const p of changedProducts.values()) await dbSaveProduct(p)
  await dbSetOrderVariantsStockDecremented(order.id, [])
}

export async function dbSetOrderVariantsStockDecremented(orderId, keys) {
  const arr = Array.isArray(keys) ? keys : []
  if (pool) {
    await pool.query(
      'UPDATE orders SET variants_stock_decremented_at_confirm = $1::jsonb WHERE id = $2',
      [JSON.stringify(arr), orderId]
    )
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.variantsStockDecrementedAtConfirm = arr
}

export async function dbSetOrderConfirmedCategory(orderId, category) {
  const val = category === 'depot' || category === 'achats' || category === 'bloquees' ? category : null
  if (pool) {
    await pool.query(
      'UPDATE orders SET confirmed_order_category = $1 WHERE id = $2',
      [val, orderId]
    )
    return
  }
  const o = memoryOrders.find((x) => x.id === orderId)
  if (o) o.confirmedOrderCategory = val || undefined
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
    achatFournisseurDone: r.achat_fournisseur_done === true,
    depotExpedieDone: r.depot_expedie_done === true,
    changeRequestedByAdmin: r.change_requested_by_admin === true,
    changeRequestedReason: r.change_requested_reason || undefined,
    colisExpedie: r.colis_expedie === true,
    variantsStockDecrementedAtConfirm: Array.isArray(r.variants_stock_decremented_at_confirm) ? r.variants_stock_decremented_at_confirm : [],
    confirmedOrderCategory: r.confirmed_order_category === 'depot' || r.confirmed_order_category === 'achats' || r.confirmed_order_category === 'bloquees' ? r.confirmed_order_category : undefined,
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
    status: o.status || 'none',
    confirmation_code: o.confirmationCode,
    yalidine_tracking: o.yalidineTracking || null,
    yalidine_sent_at: o.yalidineSentAt || null,
    yalidine_stopdesk_id: o.yalidineStopdeskId ?? null,
    yalidine_stopdesk_name: o.yalidineStopdeskName ?? null,
    created_at: o.createdAt || new Date().toISOString(),
    items: o.items || [],
    achat_fournisseur_done: o.achatFournisseurDone === true,
    depot_expedie_done: o.depotExpedieDone === true,
    change_requested_by_admin: o.changeRequestedByAdmin === true,
    change_requested_reason: o.changeRequestedReason || null,
    colis_expedie: o.colisExpedie === true,
    variants_stock_decremented_at_confirm: Array.isArray(o.variantsStockDecrementedAtConfirm) ? o.variantsStockDecrementedAtConfirm : [],
    confirmed_order_category: o.confirmedOrderCategory === 'depot' || o.confirmedOrderCategory === 'achats' || o.confirmedOrderCategory === 'bloquees' ? o.confirmedOrderCategory : null,
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

/** Enregistre un seul produit (upsert). À préférer à dbSaveProducts quand un seul produit a changé. */
export async function dbSaveProduct(product) {
  if (pool) {
    const r = productToRow(product)
    await pool.query(
      `INSERT INTO products (id, name, description, price, wholesale_price, quantity, variant_stocks, variant_available_at_supplier, image, photo_url, photo_gallery, color_ids, device_type, compatible_with, compatible_with_samsung)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb,$12::jsonb,$13,$14::jsonb,$15::jsonb)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, price=$4, wholesale_price=$5, quantity=$6, variant_stocks=$7::jsonb, variant_available_at_supplier=$8::jsonb, image=$9, photo_url=$10, photo_gallery=$11::jsonb, color_ids=$12::jsonb, device_type=$13, compatible_with=$14::jsonb, compatible_with_samsung=$15::jsonb`,
      [r.id, r.name, r.description, r.price, r.wholesale_price, r.quantity, JSON.stringify(r.variant_stocks || {}), JSON.stringify(r.variant_available_at_supplier || {}), r.image, r.photo_url, JSON.stringify(r.photo_gallery || []), JSON.stringify(r.color_ids || []), r.device_type || 'iphone', JSON.stringify(r.compatible_with), JSON.stringify(r.compatible_with_samsung || [])]
    )
    return
  }
  memoryProducts.set(product.id, product)
}

/** Remplace tout le catalogue (upsert de chaque produit). Coûteux si le catalogue est grand : préférer dbSaveProduct pour une mise à jour unitaire. */
export async function dbSaveProducts(products) {
  if (pool) {
    for (const p of products) await dbSaveProduct(p)
    return
  }
  memoryProducts.clear()
  for (const p of products) memoryProducts.set(p.id, p)
}

/** Supprime un produit de la base et nettoie les données liées (landing pages, références dans les collections). */
export async function dbDeleteProduct(id) {
  if (pool) {
    const client = await pool.connect()
    try {
      const { rows: landings } = await client.query(
        'SELECT slug FROM landing_pages WHERE antichoc_id = $1',
        [id],
      )
      const slugsToRemove = landings.map((r) => r.slug)
      await client.query('DELETE FROM landing_pages WHERE antichoc_id = $1', [id])
      const { rows: collections } = await client.query('SELECT slug, landing_slugs FROM collections')
      for (const c of collections) {
        const current = Array.isArray(c.landing_slugs) ? c.landing_slugs : (c.landing_slugs?.data || []) || []
        const next = current.filter((s) => !slugsToRemove.includes(s))
        if (next.length !== current.length) {
          await client.query(
            'UPDATE collections SET landing_slugs = $1::jsonb WHERE slug = $2',
            [JSON.stringify(next), c.slug],
          )
        }
      }
      await client.query('DELETE FROM products WHERE id = $1', [id])
    } finally {
      client.release()
    }
    return
  }
  const landings = Array.from(memoryLandingPages.entries()).filter(([, v]) => v.antichocId === id)
  const slugsToRemove = landings.map(([, v]) => v.slug)
  for (const slug of slugsToRemove) memoryLandingPages.delete(slug)
  for (const [cSlug, col] of memoryCollections) {
    const next = (col.landingSlugs || []).filter((s) => !slugsToRemove.includes(s))
    if (next.length !== (col.landingSlugs || []).length) {
      memoryCollections.set(cSlug, { ...col, landingSlugs: next })
    }
  }
  memoryProducts.delete(id)
}

function rowToProduct(r) {
  const gallery = r.photo_gallery != null && Array.isArray(r.photo_gallery) ? r.photo_gallery : (r.photo_gallery && r.photo_gallery.data ? r.photo_gallery.data : []) || []
  const colorIds = r.color_ids != null && Array.isArray(r.color_ids) ? r.color_ids : (r.color_ids && r.color_ids.data ? r.color_ids.data : []) || []
  const variantStocks = r.variant_stocks != null && typeof r.variant_stocks === 'object' && !Array.isArray(r.variant_stocks)
    ? r.variant_stocks
    : (r.variant_stocks && r.variant_stocks.data ? r.variant_stocks.data : null)
  const vs = variantStocks && Object.keys(variantStocks).length > 0 ? variantStocks : undefined
  const supplierMap = r.variant_available_at_supplier != null && typeof r.variant_available_at_supplier === 'object' && !Array.isArray(r.variant_available_at_supplier)
    ? r.variant_available_at_supplier
    : {}
  const vas = supplierMap && Object.keys(supplierMap).length > 0 ? supplierMap : undefined
  const deviceType = r.device_type === 'samsung' ? 'samsung' : 'iphone'
  const compatibleWithSamsung = Array.isArray(r.compatible_with_samsung) ? r.compatible_with_samsung : (r.compatible_with_samsung && r.compatible_with_samsung.data ? r.compatible_with_samsung.data : []) || []
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    price: r.price ?? 0,
    wholesalePrice: r.wholesale_price ?? 0,
    quantity: r.quantity ?? 0,
    variantStocks: vs,
    variantAvailableFromSupplier: vas,
    image: r.image || '',
    colorIds: colorIds.length ? colorIds : undefined,
    photoUrl: r.photo_url || (gallery[0] || ''),
    photoGallery: gallery.length ? gallery : undefined,
    deviceType,
    compatibleWith: Array.isArray(r.compatible_with) ? r.compatible_with : (r.compatible_with && r.compatible_with.data ? r.compatible_with.data : []) || [],
    compatibleWithSamsung: deviceType === 'samsung' && compatibleWithSamsung.length ? compatibleWithSamsung : undefined,
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
    variant_stocks: p.variantStocks ?? {},
    variant_available_at_supplier: p.variantAvailableFromSupplier ?? {},
    image: p.image || '',
    photo_url: (gallery[0] ?? p.photoUrl ?? p.photo_url) || '',
    photo_gallery: gallery,
    color_ids: p.colorIds ?? [],
    device_type: p.deviceType === 'samsung' ? 'samsung' : 'iphone',
    compatible_with: p.compatibleWith ?? p.compatible_with ?? [],
    compatible_with_samsung: p.compatibleWithSamsung ?? p.compatible_with_samsung ?? [],
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

/** Met à jour une landing (slug, title, antichocId). Si le slug change, met à jour les collections qui référencent l'ancien slug. */
export async function dbUpdateLanding(oldSlug, { slug: newSlug, antichocId, title }) {
  const existing = await dbGetLandingBySlug(oldSlug)
  if (!existing) return null
  const slug = (newSlug && String(newSlug).trim()) || oldSlug
  const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || slug
  const antichocIdVal = antichocId != null ? String(antichocId).trim() : null
  const titleVal = title !== undefined ? (title ? String(title).trim() : null) : null

  if (cleanSlug !== oldSlug) {
    const collections = await dbGetCollections()
    for (const col of collections) {
      const slugs = col.landingSlugs || []
      if (slugs.includes(oldSlug)) {
        const next = slugs.map((s) => (s === oldSlug ? cleanSlug : s))
        await dbSaveCollection({ ...col, landingSlugs: next })
      }
    }
    await dbDeleteLanding(oldSlug)
  }

  const finalAntichocId = antichocIdVal ?? existing.antichocId
  const finalTitle = titleVal !== null ? titleVal : existing.title
  await dbSaveLanding({ slug: cleanSlug, antichocId: finalAntichocId, title: finalTitle })
  return dbGetLandingBySlug(cleanSlug)
}

// --- Collections (1 ou plusieurs landing pages) ---
function rowToCollection(r) {
  const slugs = r.landing_slugs != null && Array.isArray(r.landing_slugs) ? r.landing_slugs : (r.landing_slugs && r.landing_slugs.data ? r.landing_slugs.data : []) || []
  return { slug: r.slug, name: r.name || '', landingSlugs: slugs }
}

export async function dbGetCollections() {
  if (pool) {
    const { rows } = await pool.query('SELECT slug, name, landing_slugs FROM collections ORDER BY name')
    return rows.map(rowToCollection)
  }
  return Array.from(memoryCollections.values())
}

export async function dbGetCollectionBySlug(slug) {
  if (pool) {
    const { rows } = await pool.query('SELECT slug, name, landing_slugs FROM collections WHERE slug = $1', [slug])
    if (rows.length === 0) return null
    return rowToCollection(rows[0])
  }
  return memoryCollections.get(slug) || null
}

export async function dbSaveCollection(collection) {
  const { slug, name, landingSlugs } = collection
  const slugs = Array.isArray(landingSlugs) ? landingSlugs : []
  if (pool) {
    await pool.query(
      `INSERT INTO collections (slug, name, landing_slugs) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (slug) DO UPDATE SET name = $2, landing_slugs = $3::jsonb`,
      [slug, name || '', JSON.stringify(slugs)],
    )
    return
  }
  memoryCollections.set(slug, { slug, name: name || '', landingSlugs: slugs })
}

export async function dbDeleteCollection(slug) {
  if (pool) {
    await pool.query('DELETE FROM collections WHERE slug = $1', [slug])
    return
  }
  memoryCollections.delete(slug)
}

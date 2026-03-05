import { useState, useEffect, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  getOrders,
  confirmOrder,
  setOrderStatus,
  setOrderAchatDone,
  setOrderDepotDone,
  updateOrderYalidine,
  deleteOrder,
  isAdminAuthenticated,
  setAdminAuthenticated,
  ADMIN_PASSWORD,
  type Order,
} from '../types'
import { getAllAntichocs, loadProducts, saveProducts, ANTICHOCS, ANTICHOC_COLORS, variantKey, needToBuyVariantFromSupplier, isVariantBlockedNoSupplier, formatOrderItemLabel } from '../data'
import { IPHONE_MODELS, type IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import {
  WILAYAS,
  loadDeliveryPrices,
  getDeliveryPrices,
  saveDeliveryPrices,
  type DeliveryPrices,
} from '../delivery'
import {
  getYalidineCredentials,
  saveYalidineCredentials,
  createParcelOnYalidine,
  syncOrdersWithYalidine,
} from '../yalidine'
import {
  apiGetLandingPages,
  apiCreateLanding,
  apiUpdateLanding,
  apiDeleteLanding,
  apiAddProduct,
  apiGetCollections,
  apiCreateCollection,
  apiUpdateCollection,
  apiDeleteCollection,
  apiRequestOrderChange,
  type LandingPage,
  type Collection,
} from '../api'

/** Redimensionne et compresse une image (qualité correcte pour l'affichage produit, tout en limitant la taille). */
function compressImageToDataUrl(
  file: File,
  maxSize = 1024,
  quality = 0.88,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.width
      const h = img.height
      let tw = w
      let th = h
      if (w > maxSize || h > maxSize) {
        if (w >= h) {
          tw = maxSize
          th = Math.round((h * maxSize) / w)
        } else {
          th = maxSize
          tw = Math.round((w * maxSize) / h)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas non disponible'))
        return
      }
      ctx.drawImage(img, 0, 0, tw, th)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression échouée'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Chargement image échoué'))
    }
    img.src = url
  })
}

type Tab = 'dashboard' | 'commandes' | 'achats' | 'bloquees' | 'depot' | 'produits' | 'statistiques' | 'benefice' | 'livraison' | 'yalidine' | 'landings' | 'collections'

export function AdminPage() {
  const [auth, setAuth] = useState(isAdminAuthenticated())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dashboardDateRange, setDashboardDateRange] = useState<'today' | 'yesterday' | '7d' | '30d'>('7d')
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('')
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>('')
  const [products, setProducts] = useState<Antichoc[]>([])
  const [deliveryPrices, setDeliveryPrices] = useState<DeliveryPrices>({})
  const [yalidineApiId, setYalidineApiId] = useState('')
  const [yalidineApiToken, setYalidineApiToken] = useState('')
  const [yalidineSendingId, setYalidineSendingId] = useState<string | null>(null)
  const [yalidineMessage, setYalidineMessage] = useState<{ orderId: string; type: 'success' | 'error'; text: string } | null>(null)
  const [beneficeWeek, setBeneficeWeek] = useState<'this' | 'last'>('this')
  const [beneficeFraisPub, setBeneficeFraisPub] = useState<string>('0')
  const [yalidineSyncing, setYalidineSyncing] = useState(false)
  const [yalidineSyncMessage, setYalidineSyncMessage] = useState<string | null>(null)
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [editingLanding, setEditingLanding] = useState<LandingPage | null>(null)
  const [editLandingSlug, setEditLandingSlug] = useState('')
  const [editLandingTitle, setEditLandingTitle] = useState('')
  const [editLandingAntichocId, setEditLandingAntichocId] = useState('')
  const [newLandingSlug, setNewLandingSlug] = useState('')
  const [newLandingAntichocId, setNewLandingAntichocId] = useState('')
  const [newLandingTitle, setNewLandingTitle] = useState('')
  const [landingProductMode, setLandingProductMode] = useState<'existing' | 'new'>('existing')
  const [newLandingProductName, setNewLandingProductName] = useState('')
  const [newLandingProductPrice, setNewLandingProductPrice] = useState('')
  const [newLandingProductWholesalePrice, setNewLandingProductWholesalePrice] = useState('')
  const [newLandingProductQuantity, setNewLandingProductQuantity] = useState('')
  const [newLandingProductDescription, setNewLandingProductDescription] = useState('')
  const [newLandingProductPhotoUrl, setNewLandingProductPhotoUrl] = useState('')
  const [newLandingProductPhotos, setNewLandingProductPhotos] = useState<string[]>([])
  const [newLandingProductIphones, setNewLandingProductIphones] = useState<IPhoneModelId[]>([])
  const [newLandingProductColorIds, setNewLandingProductColorIds] = useState<string[]>([])
  const [landingMessage, setLandingMessage] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null)
  const [newCollectionSlug, setNewCollectionSlug] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionLandingSlugs, setNewCollectionLandingSlugs] = useState<string[]>([])
  const [editingCollectionSlug, setEditingCollectionSlug] = useState<string | null>(null)
  const [editCollectionName, setEditCollectionName] = useState('')
  const [editCollectionLandingSlugs, setEditCollectionLandingSlugs] = useState<string[]>([])
  const [productsSaveStatus, setProductsSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [productsSaveMessage, setProductsSaveMessage] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [stockModalProductId, setStockModalProductId] = useState<string | null>(null)
  const [stockModalDraft, setStockModalDraft] = useState<Record<string, number>>({})
  const [stockModalSupplierDraft, setStockModalSupplierDraft] = useState<Record<string, boolean>>({})
  const [requestChangeOrderId, setRequestChangeOrderId] = useState<string | null>(null)
  const [changeReasonOrderId, setChangeReasonOrderId] = useState<string | null>(null)
  const [changeReasonInput, setChangeReasonInput] = useState('')

  useEffect(() => {
    if (auth) {
      getOrders().then(setOrders)
      loadProducts().then(() => setProducts(getAllAntichocs()))
      loadDeliveryPrices().then(() => setDeliveryPrices(getDeliveryPrices()))
      const creds = getYalidineCredentials()
      if (creds) {
        setYalidineApiId(creds.apiId)
        setYalidineApiToken(creds.apiToken)
      }
      syncOrdersWithYalidine().then((r) => {
        if (r.success && r.updated > 0) getOrders().then(setOrders)
      })
      apiGetLandingPages().then(setLandingPages)
      apiGetCollections().then(setCollections)
    }
  }, [auth, tab])

  const handleSyncYalidine = async () => {
    setYalidineSyncing(true)
    setYalidineSyncMessage(null)
    const result = await syncOrdersWithYalidine()
    setYalidineSyncing(false)
    getOrders().then(setOrders)
    if (result.success) {
      setYalidineSyncMessage(result.updated > 0 ? `${result.updated} commande(s) mise(s) à jour.` : 'Aucun changement.')
    } else {
      setYalidineSyncMessage(result.error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true)
      setAuth(true)
      getOrders().then(setOrders)
      loadProducts().then(() => setProducts(getAllAntichocs()))
    } else {
      setError('Mot de passe incorrect')
    }
  }

  const handleLogout = () => {
    setAdminAuthenticated(false)
    setAuth(false)
    setPassword('')
  }

  const handleConfirm = async (orderId: string) => {
    await confirmOrder(orderId)
    getOrders().then(setOrders)
  }

  const handleSetOrderStatus = async (orderId: string, status: Order['status']) => {
    await setOrderStatus(orderId, status)
    getOrders().then(setOrders)
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Supprimer définitivement cette commande ?')) return
    await deleteOrder(orderId)
    getOrders().then(setOrders)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ? Il sera retiré de la base et des landing pages liées.')) return
    try {
      const { apiDeleteProduct } = await import('../api')
      await apiDeleteProduct(id)
      await loadProducts()
      setProducts(getAllAntichocs())
      apiGetLandingPages().then(setLandingPages)
      apiGetCollections().then(setCollections)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    }
  }

  const handleAddProduct = () => {
    const newProduct: Antichoc = {
      id: `custom-${Date.now()}`,
      name: 'Nouveau produit',
      description: '',
      price: 0,
      wholesalePrice: 0,
      quantity: 0,
      image: '🆕',
      photoUrl: '',
      compatibleWith: IPHONE_MODELS.map((m) => m.id as IPhoneModelId),
    }
    setProducts((prev) => [...prev, newProduct])
  }

  const handleProductChange = (
    id: string,
    field: 'name' | 'price' | 'wholesalePrice' | 'quantity' | 'description' | 'photoUrl',
    value: string,
  ) => {
    const next = products.map((p) =>
      p.id === id
        ? {
            ...p,
            [field]:
              field === 'price' || field === 'wholesalePrice' || field === 'quantity'
                ? Number(value)
                : value,
          }
        : p,
    )
    setProducts(next)
  }

  const handleVariantStockChange = (productId: string, colorId: string, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const vs = { ...(p.variantStocks || {}) }
        if (num === 0 && colorId === '') delete vs['']
        else vs[colorId] = num
        return { ...p, variantStocks: vs }
      }),
    )
  }

  const handleSaveProducts = async () => {
    setProductsSaveStatus('saving')
    setProductsSaveMessage(null)
    try {
      await saveProducts(products)
      setProductsSaveStatus('ok')
      setProductsSaveMessage('Produits enregistrés.')
      setTimeout(() => {
        setProductsSaveStatus('idle')
        setProductsSaveMessage(null)
      }, 3000)
    } catch (e) {
      setProductsSaveStatus('error')
      setProductsSaveMessage(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const handleCollectionsChange = (
    id: string,
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value as IPhoneModelId,
    )
    const next = products.map((p) =>
      p.id === id ? { ...p, compatibleWith: values } : p,
    )
    setProducts(next)
  }

  const handlePhotoFileChange = (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    compressImageToDataUrl(file, 1024, 0.88).then((url) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, photoUrl: url } : p)),
      )
    }).catch(() => {
      const reader = new FileReader()
      reader.onload = () => {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, photoUrl: reader.result as string } : p)),
        )
      }
      reader.readAsDataURL(file)
    })
  }

  const resetToDefaultProducts = () => {
    if (confirm('Réinitialiser tous les produits aux valeurs par défaut ?')) {
      saveProducts(ANTICHOCS)
      setProducts(ANTICHOCS)
    }
  }

  const handleDeliveryPriceChange = (
    wilayaCode: string,
    type: 'domicile' | 'yalidine',
    value: string,
  ) => {
    const num = Number(value) || 0
    setDeliveryPrices((prev) => ({
      ...prev,
      [wilayaCode]: {
        domicile: type === 'domicile' ? num : prev[wilayaCode]?.domicile ?? 0,
        yalidine: type === 'yalidine' ? num : prev[wilayaCode]?.yalidine ?? 0,
      },
    }))
  }

  const handleSaveDeliveryPrices = async () => {
    await saveDeliveryPrices(deliveryPrices)
  }

  const handleSaveYalidineCredentials = () => {
    saveYalidineCredentials({ apiId: yalidineApiId.trim(), apiToken: yalidineApiToken.trim() })
  }

  const handleSendToYalidine = async (order: Order) => {
    if (order.status !== 'confirmed') {
      setYalidineMessage({ orderId: order.id, type: 'error', text: 'Seules les commandes confirmées peuvent être envoyées à Yalidine.' })
      return
    }
    if (order.yalidineTracking) {
      setYalidineMessage({ orderId: order.id, type: 'error', text: `Déjà envoyé : ${order.yalidineTracking}` })
      return
    }
    setYalidineSendingId(order.id)
    setYalidineMessage(null)
    const result = await createParcelOnYalidine(order)
    setYalidineSendingId(null)
    if (result.success) {
      await updateOrderYalidine(order.id, { tracking: result.tracking, sentAt: new Date().toISOString() })
      getOrders().then(setOrders)
      setYalidineMessage({ orderId: order.id, type: 'success', text: `Suivi : ${result.tracking}` })
    } else {
      setYalidineMessage({ orderId: order.id, type: 'error', text: result.error })
    }
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl bg-brand-card border border-white/10 p-6">
          <h1 className="text-xl font-bold text-white mb-4">Administration</h1>
          <label className="block text-sm text-brand-muted mb-2">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-brand-dark border border-white/10 text-white mb-4 focus:border-brand-accent focus:outline-none"
            placeholder="••••••••"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full py-3 bg-brand-accent text-brand-dark font-semibold rounded-lg hover:bg-brand-accentDim">
            Connexion
          </button>
        </form>
      </div>
    )
  }

  const isPendingOrder = (o: Order) =>
    o.status !== 'confirmed' && o.status !== 'cancelled' && o.status !== 'livre' && o.status !== 'retourne'
  const ordersSearch = ordersSearchQuery.trim().toLowerCase()
  const ordersSearchNorm = ordersSearch.replace(/\s/g, '')
  const ordersFilteredBySearch =
    ordersSearch === ''
      ? orders
      : orders.filter(
          (o) =>
            (o.id && o.id.toLowerCase().includes(ordersSearch)) ||
            (o.customerName && o.customerName.toLowerCase().includes(ordersSearch)) ||
            (o.phone && o.phone.replace(/\s/g, '').includes(ordersSearchNorm)) ||
            (o.confirmationCode && o.confirmationCode.includes(ordersSearch)),
        )
  const ordersForSections = ordersStatusFilter
    ? ordersFilteredBySearch.filter((o) => {
        if (ordersStatusFilter === 'pending') return isPendingOrder(o)
        return o.status === ordersStatusFilter
      })
    : ordersFilteredBySearch
  const sortByDateDesc = (a: Order, b: Order) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  const pendingOrders = ordersForSections.filter(isPendingOrder).sort(sortByDateDesc)
  const confirmedOrders = ordersForSections.filter((o) => o.status === 'confirmed').sort(sortByDateDesc)
  const livreOrders = ordersForSections.filter((o) => o.status === 'livre').sort(sortByDateDesc)
  const retourneOrders = ordersForSections.filter((o) => o.status === 'retourne').sort(sortByDateDesc)
  const cancelledOrders = ordersForSections.filter((o) => o.status === 'cancelled').sort(sortByDateDesc)

  const productMapForStock = new Map(products.map((p) => [p.id, p]))
  const ordersToBuyCount = (() => {
    let n = 0
    for (const order of confirmedOrders) {
      if (order.achatFournisseurDone) continue
      for (const item of order.items) {
        if (item.isUpsell || !item.selectedPhoneId) continue
        const product = productMapForStock.get(item.antichoc.id)
        if (!product) continue
        if (needToBuyVariantFromSupplier(product, item.selectedColorId ?? '', item.selectedPhoneId)) {
          n++
          break
        }
      }
    }
    return n
  })()
  /** Commandes "dépôt" (tout en stock) pas encore cochées comme traitées — pour le badge. */
  const ordersInDepotCount = (() => {
    let n = 0
    for (const order of confirmedOrders) {
      if (order.depotExpedieDone) continue
      let hasMainItem = false
      let allInStock = true
      for (const item of order.items) {
        if (item.isUpsell || !item.selectedPhoneId) continue
        hasMainItem = true
        const product = productMapForStock.get(item.antichoc.id)
        if (!product || needToBuyVariantFromSupplier(product, item.selectedColorId ?? '', item.selectedPhoneId)) {
          allInStock = false
          break
        }
      }
      if (hasMainItem && allInStock) n++
    }
    return n
  })()
  /** Commandes avec au moins une ligne bloquée : stock 0 ET indisponible chez le fournisseur (ou produit introuvable). */
  const ordersBlockedCount = (() => {
    let n = 0
    for (const order of confirmedOrders) {
      for (const item of order.items) {
        if (item.isUpsell || !item.selectedPhoneId) continue
        const product = productMapForStock.get(item.antichoc.id)
        if (!product) {
          n++
          break
        }
        if (isVariantBlockedNoSupplier(product, item.selectedColorId ?? '', item.selectedPhoneId)) {
          n++
          break
        }
      }
    }
    return n
  })()

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-brand-muted hover:text-white text-sm">
          ← Retour au site
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-brand-accent text-sm font-medium">Admin</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-brand-muted hover:text-white text-sm"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex border-b border-white/10 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            tab === 'dashboard'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Tableau de bord
        </button>
        <button
          type="button"
          onClick={() => setTab('commandes')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            tab === 'commandes'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Commandes
        </button>
        <button
          type="button"
          onClick={() => setTab('achats')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'achats'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          À acheter
          {ordersToBuyCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs">
              {ordersToBuyCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('bloquees')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'bloquees'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Bloquées
          {ordersBlockedCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs">
              {ordersBlockedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('depot')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'depot'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Dépôt
          {ordersInDepotCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs">
              {ordersInDepotCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('produits')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'produits'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Produits
        </button>
        <button
          type="button"
          onClick={() => setTab('statistiques')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'statistiques'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Statistiques
        </button>
        <button
          type="button"
          onClick={() => setTab('benefice')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'benefice'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Bénéfice
        </button>
        <button
          type="button"
          onClick={() => setTab('livraison')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'livraison'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Livraison
        </button>
        <button
          type="button"
          onClick={() => setTab('yalidine')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'yalidine'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Yalidine
        </button>
        <button
          type="button"
          onClick={() => setTab('landings')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'landings'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Landing pages
        </button>
        <button
          type="button"
          onClick={() => setTab('collections')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'collections'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Collections
        </button>
      </div>

      <main className="p-4 max-w-5xl mx-auto">
        {tab === 'dashboard' && (() => {
          const now = new Date()
          let startDate: Date
          let endDate: Date | null = null
          let rangeLabel: string
          if (dashboardDateRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
            endDate = now
            rangeLabel = "aujourd'hui"
          } else if (dashboardDateRange === 'yesterday') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
            rangeLabel = 'hier'
          } else {
            const rangeDays = dashboardDateRange === '7d' ? 7 : 30
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - rangeDays)
            startDate.setHours(0, 0, 0, 0)
            rangeLabel = `sur les ${rangeDays} derniers jours`
          }
          const ordersInRange = orders.filter((o) => {
            const t = new Date(o.createdAt).getTime()
            if (t < startDate.getTime()) return false
            if (endDate != null && t > endDate.getTime()) return false
            return true
          })
          const ordersConfirmedOrLivre = ordersInRange.filter((o) => o.status === 'confirmed' || o.status === 'livre')
          const totalSalesInRange = ordersConfirmedOrLivre.reduce((s, o) => s + (o.total ?? 0), 0)
          const ordersByDay: { date: string; count: number; label: string }[] = []
          if (dashboardDateRange === 'today') {
            const count = ordersInRange.length
            ordersByDay.push({
              date: startDate.toISOString().slice(0, 10),
              count,
              label: "Aujourd'hui",
            })
          } else if (dashboardDateRange === 'yesterday') {
            const count = ordersInRange.length
            ordersByDay.push({
              date: startDate.toISOString().slice(0, 10),
              count,
              label: 'Hier',
            })
          } else {
            const rangeDays = dashboardDateRange === '7d' ? 7 : 30
            for (let i = rangeDays - 1; i >= 0; i--) {
              const d = new Date(now)
              d.setDate(d.getDate() - i)
              d.setHours(0, 0, 0, 0)
              const next = new Date(d)
              next.setDate(next.getDate() + 1)
              const count = orders.filter(
                (o) => (o.createdAt && new Date(o.createdAt) >= d && new Date(o.createdAt) < next),
              ).length
              ordersByDay.push({
                date: d.toISOString().slice(0, 10),
                count,
                label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
              })
            }
          }
          const maxOrdersInChart = Math.max(1, ...ordersByDay.map((x) => x.count))
          const salesByProduct = new Map<string, { name: string; revenue: number }>()
          for (const order of orders.filter((o) => o.status === 'confirmed' || o.status === 'livre')) {
            const t = new Date(order.createdAt).getTime()
            if (t < startDate.getTime()) continue
            if (endDate != null && t > endDate.getTime()) continue
            for (const item of order.items || []) {
              const id = item.antichoc?.id ?? ''
              const name = item.antichoc?.name ?? 'Article'
              const rev = (item.antichoc?.price ?? 0)
              const cur = salesByProduct.get(id) ?? { name, revenue: 0 }
              salesByProduct.set(id, { name: cur.name, revenue: cur.revenue + rev })
            }
          }
          const topProducts = [...salesByProduct.entries()]
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
          const ordersByPhone = new Map<string, number>()
          for (const o of orders) {
            const phone = (o.phone || '').replace(/\s/g, '')
            if (!phone) continue
            ordersByPhone.set(phone, (ordersByPhone.get(phone) ?? 0) + 1)
          }
          let newCustomers = 0
          let returningCustomers = 0
          ordersByPhone.forEach((count) => {
            if (count === 1) newCustomers++
            else if (count >= 2) returningCustomers++
          })
          const pendingToConfirm = pendingOrders.length
          const confirmedNoYalidine = confirmedOrders.filter((o) => !o.yalidineTracking?.trim()).length
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-white">Tableau de bord</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-brand-muted text-sm">Période :</span>
                  <button
                    type="button"
                    onClick={() => setDashboardDateRange('today')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      dashboardDateRange === 'today'
                        ? 'bg-brand-accent text-brand-dark'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Aujourd&apos;hui
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardDateRange('yesterday')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      dashboardDateRange === 'yesterday'
                        ? 'bg-brand-accent text-brand-dark'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Hier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardDateRange('7d')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      dashboardDateRange === '7d'
                        ? 'bg-brand-accent text-brand-dark'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    7 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardDateRange('30d')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      dashboardDateRange === '30d'
                        ? 'bg-brand-accent text-brand-dark'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    30 jours
                  </button>
                </div>
              </div>

              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">Commandes</p>
                  <p className="text-2xl font-bold text-white">{ordersInRange.length}</p>
                  <p className="text-brand-muted text-xs mt-1">{rangeLabel}</p>
                </div>
                <div className="rounded-xl bg-brand-card border border-emerald-500/30 p-4">
                  <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">Chiffre d&apos;affaires</p>
                  <p className="text-2xl font-bold text-emerald-400">{totalSalesInRange.toLocaleString('fr-FR')} DA</p>
                  <p className="text-brand-muted text-xs mt-1">confirmées + livrées</p>
                </div>
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">Confirmées</p>
                  <p className="text-2xl font-bold text-brand-accent">{ordersConfirmedOrLivre.length}</p>
                  <p className="text-brand-muted text-xs mt-1">dans la période</p>
                </div>
                <div className="rounded-xl bg-brand-card border border-amber-500/30 p-4">
                  <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">En attente</p>
                  <p className="text-2xl font-bold text-amber-400">{pendingOrders.length}</p>
                  <p className="text-brand-muted text-xs mt-1">à confirmer</p>
                </div>
              </section>

              <section className="rounded-xl bg-brand-card border border-white/10 p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Commandes par jour</h2>
                <div className="flex items-end gap-1 h-32">
                  {ordersByDay.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.label}: ${day.count} commande(s)`}>
                      <div
                        className="w-full min-w-[8px] rounded-t bg-brand-accent/80 hover:bg-brand-accent transition-colors"
                        style={{ height: `${(day.count / maxOrdersInChart) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                      />
                      <span className="text-[10px] text-brand-muted truncate max-w-full">{day.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTab('commandes')}
                  className="rounded-xl bg-brand-card border border-white/10 p-4 text-left hover:border-brand-accent/50 hover:bg-brand-card transition-colors flex items-center gap-3"
                >
                  <span className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">📋</span>
                  <div>
                    <p className="font-semibold text-white">{pendingToConfirm} commande{pendingToConfirm !== 1 ? 's' : ''} en attente</p>
                    <p className="text-brand-muted text-sm">À confirmer</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('commandes')}
                  className="rounded-xl bg-brand-card border border-white/10 p-4 text-left hover:border-brand-accent/50 hover:bg-brand-card transition-colors flex items-center gap-3"
                >
                  <span className="w-12 h-12 rounded-xl bg-brand-accent/20 flex items-center justify-center text-2xl">📦</span>
                  <div>
                    <p className="font-semibold text-white">{confirmedNoYalidine} à envoyer à Yalidine</p>
                    <p className="text-brand-muted text-sm">Commandes confirmées sans suivi</p>
                  </div>
                </button>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <h2 className="text-sm font-semibold text-white mb-3">Chiffre d&apos;affaires par produit</h2>
                  {topProducts.length === 0 ? (
                    <p className="text-brand-muted text-sm">Aucune vente sur la période.</p>
                  ) : (
                    <ul className="space-y-2">
                      {topProducts.map((p) => (
                        <li key={p.id} className="flex justify-between text-sm">
                          <span className="text-white truncate pr-2">{p.name}</span>
                          <span className="text-brand-accent font-medium shrink-0">{p.revenue.toLocaleString('fr-FR')} DA</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <h2 className="text-sm font-semibold text-white mb-3">Clients nouveaux vs récurrents</h2>
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-lg bg-white/5 border border-white/10 p-4 text-center">
                      <p className="text-2xl font-bold text-white">{newCustomers}</p>
                      <p className="text-brand-muted text-xs mt-1">Nouveaux (1 commande)</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/5 border border-white/10 p-4 text-center">
                      <p className="text-2xl font-bold text-brand-accent">{returningCustomers}</p>
                      <p className="text-brand-muted text-xs mt-1">Récurrents (2+ commandes)</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )
        })()}

        {tab === 'commandes' && (
          <div className="space-y-6">
            <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-brand-dark/95 border-b border-white/10 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  value={ordersSearchQuery}
                  onChange={(e) => setOrdersSearchQuery(e.target.value)}
                  placeholder="Rechercher (n° commande, client, tél., code…)"
                  className="flex-1 min-w-[200px] max-w-md px-4 py-2 rounded-lg bg-brand-card border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                  aria-label="Rechercher dans les commandes"
                />
                <select
                  value={ordersStatusFilter}
                  onChange={(e) => setOrdersStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none text-sm"
                  aria-label="Filtrer par statut"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmées</option>
                  <option value="livre">Livrées</option>
                  <option value="retourne">Retournées</option>
                  <option value="cancelled">Annulées</option>
                </select>
                <button
                  type="button"
                  onClick={handleSyncYalidine}
                  disabled={yalidineSyncing || orders.filter((o) => o.yalidineTracking).length === 0}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {yalidineSyncing ? 'Synchronisation…' : 'Sync Yalidine'}
                </button>
              </div>
              {yalidineSyncMessage && (
                <span className="text-brand-muted text-sm block">{yalidineSyncMessage}</span>
              )}
              {(ordersSearchQuery.trim() || ordersStatusFilter) && (
                <p className="text-brand-muted text-xs">
                  {ordersForSections.length} commande{ordersForSections.length !== 1 ? 's' : ''} affichée{ordersForSections.length !== 1 ? 's' : ''}
                  {ordersSearchQuery.trim() && ` pour « ${ordersSearchQuery.trim()} »`}
                  {ordersStatusFilter && ` · statut: ${ordersStatusFilter === 'pending' ? 'En attente' : ordersStatusFilter === 'confirmed' ? 'Confirmées' : ordersStatusFilter === 'livre' ? 'Livrées' : ordersStatusFilter === 'retourne' ? 'Retournées' : 'Annulées'}`}
                </p>
              )}
            </div>
            {(!ordersStatusFilter || ordersStatusFilter === 'pending') && (
            <section className="rounded-xl border border-white/10 bg-brand-card/30 p-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden />
                En attente ({pendingOrders.length})
              </h2>
              <p className="text-brand-muted text-xs mb-3">Pas de statut, tentatives, rappel</p>
              {pendingOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande en attente.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onConfirm={handleConfirm}
                      onDelete={handleDeleteOrder}
                      onSendToYalidine={handleSendToYalidine}
                      yalidineSending={yalidineSendingId === order.id}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            )}
            {(!ordersStatusFilter || ordersStatusFilter === 'confirmed') && (
            <section className="rounded-xl border border-white/10 bg-brand-card/30 p-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-accent" aria-hidden />
                Confirmées ({confirmedOrders.length})
              </h2>
              <p className="text-brand-muted text-xs mb-3">Client a confirmé — en attente de livraison</p>
              {confirmedOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande confirmée.</p>
              ) : (
                <ul className="space-y-4">
                  {confirmedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onDelete={handleDeleteOrder}
                      onSendToYalidine={handleSendToYalidine}
                      onSetOrderStatus={handleSetOrderStatus}
                      yalidineSending={yalidineSendingId === order.id}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            )}
            {(!ordersStatusFilter || ordersStatusFilter === 'livre') && (
            <section className="rounded-xl border border-white/10 bg-brand-card/30 p-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden />
                Livrées ({livreOrders.length})
              </h2>
              {livreOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande livrée.</p>
              ) : (
                <ul className="space-y-4">
                  {livreOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onDelete={handleDeleteOrder}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            )}
            {(!ordersStatusFilter || ordersStatusFilter === 'retourne') && (
            <section className="rounded-xl border border-white/10 bg-brand-card/30 p-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden />
                Retournées ({retourneOrders.length})
              </h2>
              {retourneOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucun retour.</p>
              ) : (
                <ul className="space-y-4">
                  {retourneOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onDelete={handleDeleteOrder}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            )}
            {(!ordersStatusFilter || ordersStatusFilter === 'cancelled') && (
            <section className="rounded-xl border border-white/10 bg-brand-card/30 p-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" aria-hidden />
                Annulées ({cancelledOrders.length})
              </h2>
              {cancelledOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande annulée.</p>
              ) : (
                <ul className="space-y-4">
                  {cancelledOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onDelete={handleDeleteOrder} />
                  ))}
                </ul>
              )}
            </section>
            )}
          </div>
        )}

        {tab === 'achats' && (() => {
          const productMap = new Map(products.map((p) => [p.id, p]))
          type BuyLine = { productName: string; variantLabel: string }
          const ordersWithBuyList: { order: Order; linesToBuy: BuyLine[] }[] = []
          for (const order of confirmedOrders) {
            const linesToBuy: BuyLine[] = []
            for (const item of order.items) {
              if (item.isUpsell) continue
              const phoneId = item.selectedPhoneId
              if (!phoneId) continue
              const colorId = item.selectedColorId ?? ''
              // Toujours utiliser le produit actuel (stock à jour). Si absent de la liste, ne pas proposer à acheter.
              const product = productMap.get(item.antichoc.id)
              if (!product) continue
              // Priorité stock : si la variante a du stock, on n'achète pas (même si dispo fournisseur)
              if (!needToBuyVariantFromSupplier(product, colorId, phoneId)) continue
              const phoneName = IPHONE_MODELS.find((m) => m.id === phoneId)?.name ?? phoneId
              const colorName = colorId ? ANTICHOC_COLORS.find((c) => c.id === colorId)?.name ?? colorId : '—'
              linesToBuy.push({
                productName: item.antichoc.name,
                variantLabel: colorId ? `${colorName} — ${phoneName}` : phoneName,
              })
            }
            if (linesToBuy.length > 0) ordersWithBuyList.push({ order, linesToBuy })
          }
          const ordersAFaire = ordersWithBuyList.filter(({ order }) => !order.achatFournisseurDone)
          const ordersTermine = ordersWithBuyList.filter(({ order }) => order.achatFournisseurDone)
          const handleToggleAchatDone = (orderId: string, done: boolean) => {
            setOrderAchatDone(orderId, done).then(() => getOrders().then(setOrders)).catch(() => {})
          }
          const handleOpenChangeReason = (orderId: string) => {
            setChangeReasonOrderId(orderId)
            setChangeReasonInput('')
          }
          const renderOrderCard = ({ order, linesToBuy }: { order: Order; linesToBuy: BuyLine[] }, done: boolean) => (
            <li key={order.id} className={done ? 'rounded-xl p-4 border bg-brand-card/50 border-white/10' : 'rounded-xl p-4 border bg-brand-card border-amber-500/30'}>
              <div className="flex items-start gap-3">
                <label className="flex-shrink-0 mt-0.5 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={done} onChange={(e) => handleToggleAchatDone(order.id, e.target.checked)} className="rounded border-white/30 bg-brand-dark text-brand-accent focus:ring-brand-accent w-5 h-5" />
                  <span className="text-sm text-white select-none">{done ? 'Acheté' : 'À acheter'}</span>
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-white">{order.id}</span>
                    <span className="text-brand-muted text-sm">{order.customerName} — {order.phone}</span>
                  </div>
                  {order.changeRequestedByAdmin && (
                    <p className="text-amber-300 text-sm mb-2">Changement demandé : le confirmateur a été notifié.</p>
                  )}
                  <p className="text-amber-400 text-sm font-medium mb-2">À commander chez le fournisseur :</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-white">
                    {linesToBuy.map((line, idx) => <li key={idx}>{line.productName} — {line.variantLabel}</li>)}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab('commandes')} className="text-brand-accent text-sm hover:underline">Voir la commande</button>
                    {!done && (
                      <button
                        type="button"
                        onClick={() => handleOpenChangeReason(order.id)}
                        className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      >
                        Changer la commande
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
          return (
            <div className="space-y-6">
              <p className="text-brand-muted text-sm">
                Priorité au stock : si la commande confirmée est couverte par le stock, elle n’apparaît pas. Cochez quand vous avez passé la commande chez le fournisseur.
              </p>
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">
                  À faire ({ordersAFaire.length})
                </h2>
                {ordersAFaire.length === 0 ? (
                  <p className="text-brand-muted text-sm">
                    {ordersWithBuyList.length === 0 ? 'Aucune. Toutes les commandes confirmées sont couvertes par le stock actuel.' : "Tout est coché. Aucune commande en attente d'achat."}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {ordersAFaire.map((entry) => renderOrderCard(entry, false))}
                  </ul>
                )}
              </section>
              {ordersTermine.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-brand-muted mb-3">Terminé ({ordersTermine.length})</h2>
                  <ul className="space-y-4">
                    {ordersTermine.map((entry) => renderOrderCard(entry, true))}
                  </ul>
                </section>
              )}
            </div>
          )
        })()}

        {tab === 'bloquees' && (() => {
          type BlockedLine = { productName: string; variantLabel: string }
          const ordersWithBlocked: { order: Order; blockedLines: BlockedLine[] }[] = []
          for (const order of confirmedOrders) {
            const blockedLines: BlockedLine[] = []
            for (const item of order.items) {
              if (item.isUpsell || !item.selectedPhoneId) continue
              const product = productMapForStock.get(item.antichoc.id)
              const colorId = item.selectedColorId ?? ''
              const phoneId = item.selectedPhoneId
              if (!product) {
                blockedLines.push({
                  productName: item.antichoc.name,
                  variantLabel: 'Produit introuvable dans le catalogue',
                })
                continue
              }
              if (!isVariantBlockedNoSupplier(product, colorId, phoneId)) continue
              const phoneName = IPHONE_MODELS.find((m) => m.id === phoneId)?.name ?? phoneId
              const colorName = colorId ? ANTICHOC_COLORS.find((c) => c.id === colorId)?.name ?? colorId : '—'
              blockedLines.push({
                productName: item.antichoc.name,
                variantLabel: colorId ? `${colorName} — ${phoneName}` : phoneName,
              })
            }
            if (blockedLines.length > 0) ordersWithBlocked.push({ order, blockedLines })
          }
          return (
            <div className="space-y-6">
              <p className="text-brand-muted text-sm">
                Commandes confirmées contenant au moins un article <strong>en stock 0 et indisponible chez le fournisseur</strong> (ou produit introuvable dans le catalogue). Ces commandes ne peuvent pas être honorées sans demander au client de modifier sa commande.
              </p>
              {ordersWithBlocked.length === 0 ? (
                <p className="text-brand-muted text-sm">
                  Aucune. Toutes les commandes confirmées ont soit du stock, soit des articles commandables chez le fournisseur.
                </p>
              ) : (
                <ul className="space-y-4">
                  {ordersWithBlocked.map(({ order, blockedLines }) => (
                    <li key={order.id} className="rounded-xl p-4 border bg-brand-card border-red-500/30">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-medium text-white">{order.id}</span>
                        <span className="text-brand-muted text-sm">{order.customerName} — {order.phone}</span>
                      </div>
                      {order.changeRequestedByAdmin && (
                        <p className="text-amber-300 text-sm mb-2">Changement demandé : le confirmateur a été notifié.</p>
                      )}
                      <p className="text-red-400 text-sm font-medium mb-2">Indisponible (stock 0, pas chez le fournisseur) :</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-white mb-3">
                        {blockedLines.map((line, idx) => (
                          <li key={idx}>{line.productName} — {line.variantLabel}</li>
                        ))}
                      </ul>
                      <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setTab('commandes')} className="text-brand-accent text-sm hover:underline">
                          Voir la commande
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChangeReasonOrderId(order.id)
                            setChangeReasonInput('')
                          }}
                          className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                        >
                          Changer la commande
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}

        {tab === 'depot' && (() => {
          const ordersDepot: Order[] = []
          for (const order of confirmedOrders) {
            let hasMainItem = false
            let allInStock = true
            for (const item of order.items) {
              if (item.isUpsell || !item.selectedPhoneId) continue
              hasMainItem = true
              const product = productMapForStock.get(item.antichoc.id)
              if (!product || needToBuyVariantFromSupplier(product, item.selectedColorId ?? '', item.selectedPhoneId)) {
                allInStock = false
                break
              }
            }
            if (hasMainItem && allInStock) ordersDepot.push(order)
          }
          const ordersAFaire = ordersDepot.filter((o) => !o.depotExpedieDone)
          const ordersTermine = ordersDepot.filter((o) => o.depotExpedieDone)
          const handleToggleDepotDone = (orderId: string, done: boolean) => {
            setOrderDepotDone(orderId, done).then(() => getOrders().then(setOrders)).catch(() => {})
          }
          const renderDepotCard = (order: Order, done: boolean) => (
            <li key={order.id} className={done ? 'rounded-xl p-4 border bg-brand-card/50 border-white/10' : 'rounded-xl p-4 border bg-brand-card border-emerald-500/20'}>
              <div className="flex items-start gap-3">
                <label className="flex-shrink-0 mt-0.5 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={done} onChange={(e) => handleToggleDepotDone(order.id, e.target.checked)} className="rounded border-white/30 bg-brand-dark text-brand-accent focus:ring-brand-accent w-5 h-5" />
                  <span className="text-sm text-white select-none">{done ? 'Expédié / traité' : 'À expédier'}</span>
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-white">{order.id}</span>
                    <span className="text-brand-muted text-sm">{order.customerName} — {order.phone}</span>
                  </div>
                  <p className="text-emerald-400 text-sm mb-1">Tout en stock</p>
                  <p className="text-white/90 text-sm mb-2">
                    {(order.items || []).map((item) => formatOrderItemLabel(item)).join(' · ')}
                  </p>
                  <div className="pt-3 border-t border-white/10">
                    <button type="button" onClick={() => setTab('commandes')} className="text-brand-accent text-sm hover:underline">Voir la commande</button>
                  </div>
                </div>
              </div>
            </li>
          )
          return (
            <div className="space-y-6">
              <p className="text-brand-muted text-sm">
                Commandes confirmées entièrement couvertes par le stock (prêtes à expédier). Cochez quand la commande est expédiée ou préparée.
              </p>
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">À faire ({ordersAFaire.length})</h2>
                {ordersAFaire.length === 0 ? (
                  <p className="text-brand-muted text-sm">
                    {ordersDepot.length === 0 ? 'Aucune. Soit il n’y a pas de commande confirmée couverte par le stock, soit chaque commande confirmée a au moins un article à acheter.' : 'Tout est coché. Aucune commande en attente d’expédition.'}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {ordersAFaire.map((order) => renderDepotCard(order, false))}
                  </ul>
                )}
              </section>
              {ordersTermine.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-brand-muted mb-3">Terminé ({ordersTermine.length})</h2>
                  <ul className="space-y-4">
                    {ordersTermine.map((order) => renderDepotCard(order, true))}
                  </ul>
                </section>
              )}
            </div>
          )
        })()}

        {tab === 'produits' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-brand-muted text-sm">
                Modifiez, ajoutez ou supprimez un produit, puis enregistrez.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  Ajouter un produit
                </button>
                <button
                  type="button"
                  onClick={resetToDefaultProducts}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={handleSaveProducts}
                  disabled={productsSaveStatus === 'saving'}
                  className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {productsSaveStatus === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
              {productsSaveMessage && (
                <p className={`text-sm ${productsSaveStatus === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {productsSaveMessage}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-brand-muted border-b border-white/10">
                    <th className="pb-2 pr-4">Collections (iPhone)</th>
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Prix détail (DA)</th>
                    <th className="pb-2 pr-4">Prix gros (DA)</th>
                    <th className="pb-2 pr-4">Stock</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4">Photo</th>
                    <th className="pb-2 pr-0 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 align-top">
                      <td className="py-2 pr-4 text-white text-xs max-w-[220px]">
                        <select
                          multiple
                          value={p.compatibleWith}
                          onChange={(e) => handleCollectionsChange(p.id, e)}
                          className="w-full bg-brand-card border border-white/10 rounded px-2 py-1 h-[70px] text-xs focus:border-brand-accent focus:outline-none"
                        >
                          {IPHONE_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            handleProductChange(p.id, 'name', e.target.value)
                          }
                          className="w-full max-w-[200px] px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={p.price}
                          onChange={(e) =>
                            handleProductChange(p.id, 'price', e.target.value)
                          }
                          className="w-20 px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={p.wholesalePrice ?? 0}
                          onChange={(e) =>
                            handleProductChange(p.id, 'wholesalePrice', e.target.value)
                          }
                          className="w-24 px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-4 text-brand-muted text-xs">
                        {(() => {
                          const total = p.variantStocks && Object.keys(p.variantStocks).length > 0
                            ? Object.values(p.variantStocks).reduce((a, b) => a + b, 0)
                            : (p.quantity ?? 0)
                          const variantCount = Object.keys(p.variantStocks || {}).length || (p.colorIds?.length ? p.colorIds.length * (p.compatibleWith?.length || 1) : 1)
                          return `${total} (${variantCount} variante${variantCount > 1 ? 's' : ''})`
                        })()}
                      </td>
                      <td className="py-2 pr-4">
                        <textarea
                          value={p.description}
                          onChange={(e) =>
                            handleProductChange(
                              p.id,
                              'description',
                              e.target.value,
                            )
                          }
                          className="w-full max-w-[260px] min-h-[60px] px-2 py-1 rounded bg-brand-card border border-white/10 text-white text-xs focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-4 min-w-[220px]">
                        {p.photoUrl && (
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded mb-1 border border-white/10"
                          />
                        )}
                        <input
                          type="text"
                          value={p.photoUrl}
                          onChange={(e) =>
                            handleProductChange(
                              p.id,
                              'photoUrl',
                              e.target.value,
                            )
                          }
                          className="w-full max-w-[220px] px-2 py-1 rounded bg-brand-card border border-white/10 text-white text-xs focus:border-brand-accent focus:outline-none"
                          placeholder="https://..."
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoFileChange(p.id, e)}
                          className="mt-1 block text-[11px] text-brand-muted file:text-xs file:bg-white/10 file:border-0 file:px-2 file:py-1 file:rounded"
                        />
                      </td>
                      <td className="py-2 pr-0 align-middle text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingProductId(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const colorIds = (p.colorIds?.length ? p.colorIds : ['']) as string[]
                              const phoneIds = p.compatibleWith?.length ? p.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
                              const draft: Record<string, number> = {}
                              const supplierDraft: Record<string, boolean> = {}
                              colorIds.forEach((cid) => {
                                phoneIds.forEach((pid) => {
                                  const key = variantKey(cid, pid)
                                  draft[key] = p.variantStocks?.[key] ?? p.variantStocks?.[cid] ?? p.quantity ?? 0
                                  supplierDraft[key] = p.variantAvailableFromSupplier?.[key] === true
                                })
                              })
                              setStockModalDraft(draft)
                              setStockModalSupplierDraft(supplierDraft)
                              setStockModalProductId(p.id)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-accent/20 text-brand-accent text-xs hover:bg-brand-accent/30"
                          >
                            Gérer le stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 border border-red-500/30"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Modifier produit */}
            {editingProductId && (() => {
              const p = products.find((x) => x.id === editingProductId)
              if (!p) return null
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setEditingProductId(null)}>
                  <div className="bg-brand-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-white">Modifier le produit</h3>
                    <p className="text-brand-muted text-sm">{p.name}</p>
                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Nom</label>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleProductChange(p.id, 'name', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-brand-muted mb-1">Prix détail (DA)</label>
                        <input
                          type="number"
                          min={0}
                          value={p.price}
                          onChange={(e) => handleProductChange(p.id, 'price', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-brand-muted mb-1">Prix gros (DA)</label>
                        <input
                          type="number"
                          min={0}
                          value={p.wholesalePrice ?? 0}
                          onChange={(e) => handleProductChange(p.id, 'wholesalePrice', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Description</label>
                      <textarea
                        value={p.description}
                        onChange={(e) => handleProductChange(p.id, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Photo (URL)</label>
                      <input
                        type="text"
                        value={p.photoUrl}
                        onChange={(e) => handleProductChange(p.id, 'photoUrl', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setEditingProductId(null)} className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium">
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Modal Gérer le stock (par variante = couleur + iPhone) */}
            {stockModalProductId && (() => {
              const p = products.find((x) => x.id === stockModalProductId)
              if (!p) return null
              const colorIds = (p.colorIds?.length ? p.colorIds : ['']) as string[]
              const phoneIds = p.compatibleWith?.length ? p.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
              const variantEntries = colorIds.flatMap((cid) =>
                phoneIds.map((pid) => ({ key: variantKey(cid, pid), colorId: cid, phoneId: pid })),
              )
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setStockModalProductId(null)}>
                  <div className="bg-brand-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-white">Gérer le stock</h3>
                    <p className="text-brand-muted text-sm mb-2">{p.name}</p>
                    <p className="text-xs text-brand-muted mb-3">Stock ou « Disponible chez le fournisseur ». Si stock = 0 et pas disponible fournisseur, le client ne peut pas commander cette variante.</p>
                    <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
                      {variantEntries.map(({ key, colorId, phoneId }) => {
                        const colorName = colorId ? (ANTICHOC_COLORS.find((c) => c.id === colorId)?.name ?? colorId) : '—'
                        const phoneName = IPHONE_MODELS.find((m) => m.id === phoneId)?.name ?? phoneId
                        const label = colorId ? `${colorName} — ${phoneName}` : phoneName
                        return (
                          <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 flex-wrap">
                            <span className="text-white text-sm truncate min-w-0 flex-1">{label}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <label className="flex items-center gap-1.5 text-sm text-brand-muted cursor-pointer whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={stockModalSupplierDraft[key] === true}
                                  onChange={(e) => setStockModalSupplierDraft((prev) => ({ ...prev, [key]: e.target.checked }))}
                                  className="rounded border-white/30 text-brand-accent focus:ring-brand-accent"
                                />
                                Fournisseur
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={stockModalDraft[key] ?? 0}
                                onChange={(e) => setStockModalDraft((prev) => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                                className="w-16 px-2 py-1.5 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                                placeholder="Stock"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProducts((prev) =>
                            prev.map((prod) =>
                              prod.id !== stockModalProductId
                                ? prod
                                : {
                                    ...prod,
                                    variantStocks: { ...stockModalDraft },
                                    variantAvailableFromSupplier: Object.fromEntries(
                                      Object.entries(stockModalSupplierDraft).filter(([, v]) => v === true),
                                    ),
                                  },
                            ),
                          )
                          setStockModalProductId(null)
                        }}
                        className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium"
                      >
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => setStockModalProductId(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white">
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'statistiques' && (
          <div className="space-y-6">
            {(() => {
              const chStock = products.reduce((sum, p) => {
                const qty = p.variantStocks && Object.keys(p.variantStocks).length > 0
                  ? Object.values(p.variantStocks).reduce((a, b) => a + b, 0)
                  : (p.quantity ?? 0)
                return sum + (p.wholesalePrice ?? 0) * qty
              }, 0)
              return (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                    <p className="text-xs text-brand-muted mb-1">Total commandes</p>
                    <p className="text-2xl font-semibold text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-xl bg-brand-card border border-emerald-500/40 p-4">
                    <p className="text-xs text-brand-muted mb-1">Confirmées</p>
                    <p className="text-2xl font-semibold text-emerald-400">
                      {orders.filter((o) => o.status === 'confirmed').length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-brand-card border border-amber-500/40 p-4">
                    <p className="text-xs text-brand-muted mb-1">En attente (tentatives / rappel)</p>
                    <p className="text-2xl font-semibold text-amber-300">
                      {
                        orders.filter(
                          (o) =>
                            o.status === 'none' ||
                            o.status === 'tentative1' ||
                            o.status === 'tentative2' ||
                            o.status === 'tentative3' ||
                            o.status === 'callback',
                        ).length
                      }
                    </p>
                  </div>
                  <div className="rounded-xl bg-brand-card border border-brand-accent/40 p-4">
                    <p className="text-xs text-brand-muted mb-1">CH stock (prix gros × quantité)</p>
                    <p className="text-2xl font-semibold text-brand-accent">{chStock.toLocaleString('fr-FR')} DA</p>
                  </div>
                </section>
              )
            })()}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                <h2 className="text-sm font-semibold text-white mb-3">Par statut</h2>
                <ul className="space-y-1 text-sm text-brand-muted">
                  <li className="flex justify-between">
                    <span>Pas de statut</span>
                    <span className="text-white">
                      {orders.filter((o) => o.status === 'none').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Tentative 1</span>
                    <span className="text-white">
                      {orders.filter((o) => o.status === 'tentative1').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Tentative 2</span>
                    <span className="text-white">
                      {orders.filter((o) => o.status === 'tentative2').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Tentative 3</span>
                    <span className="text-white">
                      {orders.filter((o) => o.status === 'tentative3').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Rappel</span>
                    <span className="text-white">
                      {orders.filter((o) => o.status === 'callback').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Confirmé</span>
                    <span className="text-emerald-400">
                      {orders.filter((o) => o.status === 'confirmed').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Livré</span>
                    <span className="text-emerald-300">
                      {orders.filter((o) => o.status === 'livre').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Retourné</span>
                    <span className="text-amber-400">
                      {orders.filter((o) => o.status === 'retourne').length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Annulé</span>
                    <span className="text-red-400">
                      {orders.filter((o) => o.status === 'cancelled').length}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                <h2 className="text-sm font-semibold text-white mb-3">Chiffre d&apos;affaires estimé</h2>
                <p className="text-xs text-brand-muted mb-1">
                  Total des commandes confirmées (en DA)
                </p>
                <p className="text-3xl font-semibold text-brand-accent">
                  {orders
                    .filter((o) => o.status === 'confirmed')
                    .reduce((sum, o) => sum + o.total, 0)}{' '}
                  DA
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-brand-card border border-white/10 p-4 overflow-x-auto">
              <h2 className="text-sm font-semibold text-white mb-3">Par produit (stock, chiffre d&apos;affaires, prix de gros)</h2>
              <p className="text-xs text-brand-muted mb-3">
                Chiffre d&apos;affaires = somme des ventes (commandes confirmées) pour ce produit. Stock = quantité actuelle.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left text-brand-muted">
                    <th className="py-2 pr-4 font-medium">Produit</th>
                    <th className="py-2 pr-4 font-medium text-right">Stock</th>
                    <th className="py-2 pr-4 font-medium text-right">Chiffre d&apos;affaires (DA)</th>
                    <th className="py-2 pr-4 font-medium text-right">Prix de gros (DA)</th>
                    <th className="py-2 font-medium text-right">Valeur stock (DA)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const stock =
                      p.variantStocks && Object.keys(p.variantStocks).length > 0
                        ? Object.values(p.variantStocks).reduce((a, b) => a + b, 0)
                        : p.quantity ?? 0
                    const revenue = orders
                      .filter((o) => o.status === 'confirmed' || o.status === 'livre')
                      .reduce((sum, o) => {
                        const itemTotal = (o.items || []).reduce(
                          (s, it) => (it.antichoc?.id === p.id ? s + (it.antichoc?.price ?? 0) : s),
                          0,
                        )
                        return sum + itemTotal
                      }, 0)
                    const wholesalePrice = p.wholesalePrice ?? 0
                    const stockValue = wholesalePrice * stock
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 pr-4 text-white">{p.name}</td>
                        <td className="py-2 pr-4 text-right text-white">{stock.toLocaleString('fr-FR')}</td>
                        <td className="py-2 pr-4 text-right text-brand-accent">{revenue.toLocaleString('fr-FR')}</td>
                        <td className="py-2 pr-4 text-right text-white">{wholesalePrice.toLocaleString('fr-FR')}</td>
                        <td className="py-2 text-right text-white">{stockValue.toLocaleString('fr-FR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {tab === 'benefice' && (() => {
          // Lundi = début de semaine (ISO)
          const getWeekStart = (d: Date) => {
            const x = new Date(d)
            const day = x.getDay()
            const diff = x.getDate() - (day === 0 ? 7 : day) + 1
            x.setDate(diff)
            x.setHours(0, 0, 0, 0)
            return x
          }
          const now = new Date()
          const thisWeekStart = getWeekStart(now)
          const lastWeekStart = new Date(thisWeekStart)
          lastWeekStart.setDate(lastWeekStart.getDate() - 7)
          const lastWeekEnd = new Date(lastWeekStart)
          lastWeekEnd.setDate(lastWeekEnd.getDate() + 6)
          lastWeekEnd.setHours(23, 59, 59, 999)
          const periodStart = beneficeWeek === 'this' ? thisWeekStart : lastWeekStart
          const periodEnd =
            beneficeWeek === 'this'
              ? new Date(now.getTime())
              : lastWeekEnd
          const livreInPeriod = orders.filter((o) => {
            if (o.status !== 'livre') return false
            const created = new Date(o.createdAt).getTime()
            return created >= periodStart.getTime() && created <= periodEnd.getTime()
          })
          const retourneInPeriod = orders.filter((o) => {
            if (o.status !== 'retourne') return false
            const created = new Date(o.createdAt).getTime()
            return created >= periodStart.getTime() && created <= periodEnd.getTime()
          })
          const echoueInPeriod = orders.filter((o) => {
            if (o.status !== 'cancelled') return false
            const created = new Date(o.createdAt).getTime()
            return created >= periodStart.getTime() && created <= periodEnd.getTime()
          })
          const caNetSansLivraison = livreInPeriod.reduce(
            (sum, o) => sum + (o.total ?? 0) - (o.deliveryPrice ?? 0),
            0,
          )
          const coutGros = livreInPeriod.reduce((sum, o) => {
            return (
              sum +
              o.items.reduce((s, item) => s + (item.antichoc.wholesalePrice ?? 0), 0)
            )
          }, 0)
          const fraisPub = Number(beneficeFraisPub) || 0
          const benefice = caNetSansLivraison - coutGros - fraisPub
          const periodLabel =
            beneficeWeek === 'this'
              ? `Semaine en cours (du ${periodStart.toLocaleDateString('fr-FR')} à aujourd'hui)`
              : `Semaine dernière (${periodStart.toLocaleDateString('fr-FR')} → ${periodEnd.toLocaleDateString('fr-FR')})`
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-brand-muted text-sm">Période :</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="beneficeWeek"
                    checked={beneficeWeek === 'this'}
                    onChange={() => setBeneficeWeek('this')}
                    className="text-brand-accent"
                  />
                  <span className="text-white text-sm">Semaine en cours</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="beneficeWeek"
                    checked={beneficeWeek === 'last'}
                    onChange={() => setBeneficeWeek('last')}
                    className="text-brand-accent"
                  />
                  <span className="text-white text-sm">Semaine dernière</span>
                </label>
              </div>
              <p className="text-brand-muted text-sm">{periodLabel}</p>
              <div className="rounded-xl bg-brand-card border border-white/10 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Commandes sur la période</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-emerald-400">
                    Livrées : {livreInPeriod.length}
                  </span>
                  <span className="text-amber-400">
                    Retours : {retourneInPeriod.length}
                  </span>
                  <span className="text-red-400">
                    Tentatives échouées (annulées) : {echoueInPeriod.length}
                  </span>
                </div>
                {livreInPeriod.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-muted hover:text-white">
                      Voir les {livreInPeriod.length} commande(s) livrée(s)
                    </summary>
                    <ul className="mt-2 space-y-1 text-brand-muted">
                      {livreInPeriod.map((o) => (
                        <li key={o.id}>
                          {o.id} — {o.customerName} — {(o.total ?? 0) - (o.deliveryPrice ?? 0)} DA net
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {retourneInPeriod.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-muted hover:text-white">
                      Voir les {retourneInPeriod.length} retour(s)
                    </summary>
                    <ul className="mt-2 space-y-1 text-brand-muted">
                      {retourneInPeriod.map((o) => (
                        <li key={o.id}>{o.id} — {o.customerName}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {echoueInPeriod.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-muted hover:text-white">
                      Voir les {echoueInPeriod.length} tentative(s) échouée(s)
                    </summary>
                    <ul className="mt-2 space-y-1 text-brand-muted">
                      {echoueInPeriod.map((o) => (
                        <li key={o.id}>{o.id} — {o.customerName}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <p className="text-brand-muted text-sm">
                Le bénéfice est calculé uniquement sur les {livreInPeriod.length} commande(s) livrée(s).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-1">CA net (sans livraison)</h3>
                  <p className="text-2xl font-semibold text-white">
                    {caNetSansLivraison.toLocaleString('fr-FR')} DA
                  </p>
                  <p className="text-xs text-brand-muted mt-1">
                    Total des commandes − livraison
                  </p>
                </div>
                <div className="rounded-xl bg-brand-card border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-1">Coût gros</h3>
                  <p className="text-2xl font-semibold text-amber-400">
                    − {coutGros.toLocaleString('fr-FR')} DA
                  </p>
                  <p className="text-xs text-brand-muted mt-1">
                    Somme des prix gros des produits vendus
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-brand-card border border-white/10 p-4 max-w-md">
                <label className="block text-sm font-semibold text-white mb-2">
                  Frais publicitaires (DA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={beneficeFraisPub}
                  onChange={(e) => setBeneficeFraisPub(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                />
              </div>
              <div className="rounded-xl bg-brand-card border-2 border-brand-accent p-6">
                <h3 className="text-sm font-semibold text-brand-muted mb-1">Bénéfice de la période</h3>
                <p className="text-3xl font-bold text-brand-accent">
                  {benefice.toLocaleString('fr-FR')} DA
                </p>
                <p className="text-xs text-brand-muted mt-2">
                  CA net − coût gros − frais publicitaires
                </p>
              </div>
            </div>
          )
        })()}

        {tab === 'livraison' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-brand-muted text-sm">
                Définissez le prix de livraison (DA) par wilaya pour « À domicile » et « Bureau Yalidine ».
              </p>
              <button
                type="button"
                onClick={handleSaveDeliveryPrices}
                className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
              >
                Enregistrer
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-brand-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Wilaya</th>
                    <th className="px-3 py-2 text-left">Prix à domicile (DA)</th>
                    <th className="px-3 py-2 text-left">Prix Bureau Yalidine (DA)</th>
                  </tr>
                </thead>
                <tbody>
                  {WILAYAS.map((w) => (
                    <tr key={w.code} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white">
                        {w.code} - {w.name}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={deliveryPrices[w.code]?.domicile ?? ''}
                          onChange={(e) =>
                            handleDeliveryPriceChange(w.code, 'domicile', e.target.value)
                          }
                          className="w-28 px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={deliveryPrices[w.code]?.yalidine ?? ''}
                          onChange={(e) =>
                            handleDeliveryPriceChange(w.code, 'yalidine', e.target.value)
                          }
                          className="w-28 px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'yalidine' && (
          <div className="space-y-6">
            <p className="text-brand-muted text-sm">
              Saisissez vos identifiants API Yalidine (portail <a href="https://www.yalidine.com" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">yalidine.com</a>, section Développement). Les commandes pourront être envoyées en colis depuis l’onglet Commandes.
            </p>
            <div className="rounded-xl bg-brand-card border border-white/10 p-4 max-w-md space-y-4">
              <div>
                <label className="block text-sm text-brand-muted mb-1">API ID</label>
                <input
                  type="text"
                  value={yalidineApiId}
                  onChange={(e) => setYalidineApiId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none font-mono text-sm"
                  placeholder="Votre API ID"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">API Token</label>
                <input
                  type="password"
                  value={yalidineApiToken}
                  onChange={(e) => setYalidineApiToken(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none font-mono text-sm"
                  placeholder="Votre API Token"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveYalidineCredentials}
                className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
              >
                Enregistrer les identifiants
              </button>
            </div>
          </div>
        )}

        {tab === 'landings' && (
          <div className="space-y-6">
            <p className="text-brand-muted text-sm">
              Créez des pages dédiées pour vendre un seul modèle d&apos;antichoc. Chaque landing a une URL du type <strong className="text-white">/p/slug</strong> (ex. /p/coque-noir). Vous pouvez choisir un produit existant ou en créer un nouveau.
            </p>
            <div className="rounded-xl bg-brand-card border border-white/10 p-4 max-w-lg space-y-4">
              <h3 className="font-semibold text-white">Nouvelle landing page</h3>
              <div>
                <p className="block text-sm text-brand-muted mb-2">Produit</p>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="landingProductMode"
                      checked={landingProductMode === 'existing'}
                      onChange={() => setLandingProductMode('existing')}
                      className="text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="text-white text-sm">Choisir un produit existant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="landingProductMode"
                      checked={landingProductMode === 'new'}
                      onChange={() => setLandingProductMode('new')}
                      className="text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="text-white text-sm">Créer un nouveau produit</span>
                  </label>
                </div>
                {landingProductMode === 'existing' ? (
                  <select
                    value={newLandingAntichocId}
                    onChange={(e) => setNewLandingAntichocId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                  >
                    <option value="">Choisir un produit</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.price} DA
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3 rounded-lg bg-brand-dark/50 border border-white/10 p-3">
                    <input
                      type="text"
                      value={newLandingProductName}
                      onChange={(e) => setNewLandingProductName(e.target.value)}
                      placeholder="Nom du produit (ex: Coque Noir Mat)"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                    <div>
                      <p className="text-xs text-brand-muted mb-1">Couleurs (plusieurs possibles)</p>
                      <select
                        multiple
                        value={newLandingProductColorIds}
                        onChange={(e) =>
                          setNewLandingProductColorIds(
                            Array.from(e.target.selectedOptions).map((o) => o.value),
                          )
                        }
                        className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none text-sm h-24"
                      >
                        {ANTICHOC_COLORS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-brand-muted mt-0.5">Ctrl+clic pour sélectionner plusieurs couleurs</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-muted mb-1">Modèles iPhone compatibles (plusieurs possibles)</p>
                      <select
                        multiple
                        value={newLandingProductIphones}
                        onChange={(e) =>
                          setNewLandingProductIphones(
                            Array.from(e.target.selectedOptions).map((o) => o.value as IPhoneModelId),
                          )
                        }
                        className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none text-sm h-24"
                      >
                        {IPHONE_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-brand-muted mt-0.5">Ctrl+clic pour sélectionner plusieurs modèles</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={newLandingProductPrice}
                      onChange={(e) => setNewLandingProductPrice(e.target.value)}
                      placeholder="Prix détail (DA)"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={newLandingProductWholesalePrice}
                      onChange={(e) => setNewLandingProductWholesalePrice(e.target.value)}
                      placeholder="Prix de gros (DA)"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={newLandingProductQuantity}
                      onChange={(e) => setNewLandingProductQuantity(e.target.value)}
                      placeholder="Stock (quantité)"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                    <textarea
                      value={newLandingProductDescription}
                      onChange={(e) => setNewLandingProductDescription(e.target.value)}
                      placeholder="Description courte"
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm resize-none"
                    />
                    <div>
                      <p className="text-xs text-brand-muted mb-1">Photos (max 5, compressées pour éviter erreur)</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length === 0) return
                          const maxPhotos = 5
                          const urls: string[] = []
                          for (const file of files) {
                            if (urls.length >= maxPhotos) break
                            try {
                              const url = await compressImageToDataUrl(file, 1024, 0.88)
                              urls.push(url)
                            } catch {
                              const reader = new FileReader()
                              urls.push(
                                await new Promise<string>((res, rej) => {
                                  reader.onload = () => res(reader.result as string)
                                  reader.onerror = rej
                                  reader.readAsDataURL(file)
                                }),
                              )
                            }
                          }
                          setNewLandingProductPhotos((prev) => {
                            const next = [...prev, ...urls]
                            return next.slice(0, maxPhotos)
                          })
                        }}
                        className="block text-[11px] text-brand-muted file:text-xs file:bg-white/10 file:border-0 file:px-2 file:py-1 file:rounded file:mr-2"
                      />
                      <input
                        type="text"
                        value={newLandingProductPhotoUrl}
                        onChange={(e) => setNewLandingProductPhotoUrl(e.target.value)}
                        placeholder="Ou URL d'une photo"
                        className="w-full mt-1 px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                      />
                      {newLandingProductPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newLandingProductPhotos.map((url, i) => (
                            <div key={i} className="relative">
                              <img
                                src={url}
                                alt=""
                                className="w-14 h-14 object-cover rounded border border-white/10"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setNewLandingProductPhotos((prev) => prev.filter((_, j) => j !== i))
                                }
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">Slug (URL) — lettres, chiffres, tirets</label>
                <input
                  type="text"
                  value={newLandingSlug}
                  onChange={(e) => setNewLandingSlug(e.target.value)}
                  placeholder="ex: coque-noir-mat"
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">Titre (optionnel) — affiché sur la page</label>
                <input
                  type="text"
                  value={newLandingTitle}
                  onChange={(e) => setNewLandingTitle(e.target.value)}
                  placeholder="ex: Coque Noir Mat à prix réduit"
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
                />
              </div>
              {landingMessage && (
                <p className={`text-sm ${landingMessage.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {landingMessage}
                </p>
              )}
              <button
                type="button"
                onClick={async () => {
                  const slugRaw = newLandingSlug.trim()
                  if (!slugRaw) {
                    setLandingMessage('Remplissez le slug (URL).')
                    return
                  }
                  const cleanSlug = slugRaw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || slugRaw
                  let antichocId: string
                  if (landingProductMode === 'new') {
                    if (!newLandingProductName.trim()) {
                      setLandingMessage('Remplissez le nom du produit.')
                      return
                    }
                    const price = Number(newLandingProductPrice) || 0
                    const wholesalePrice = Number(newLandingProductWholesalePrice) || 0
                    const quantity = Number(newLandingProductQuantity) || 0
                    antichocId = `landing-${cleanSlug}-${Date.now()}`
                    const selectedColorEmojis = newLandingProductColorIds
                      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id)?.emoji)
                      .filter(Boolean) as string[]
                    const imageEmojis = selectedColorEmojis.length ? selectedColorEmojis.join(' ') : '📱'
                    const allPhotos = [
                      ...newLandingProductPhotos,
                      ...(newLandingProductPhotoUrl.trim() ? [newLandingProductPhotoUrl.trim()] : []),
                    ]
                    const variantStocks: Record<string, number> = {}
                    const landingColorIds = newLandingProductColorIds.length > 0 ? newLandingProductColorIds : ['']
                    const landingPhoneIds = newLandingProductIphones.length > 0 ? newLandingProductIphones : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
                    landingColorIds.forEach((cid) => {
                      landingPhoneIds.forEach((pid) => {
                        variantStocks[variantKey(cid, pid)] = quantity
                      })
                    })
                    const newProduct: Antichoc = {
                      id: antichocId,
                      name: newLandingProductName.trim(),
                      description: newLandingProductDescription.trim(),
                      price,
                      wholesalePrice,
                      quantity,
                      variantStocks: Object.keys(variantStocks).length ? variantStocks : undefined,
                      image: imageEmojis,
                      colorIds: newLandingProductColorIds.length > 0 ? newLandingProductColorIds : undefined,
                      photoUrl: allPhotos[0] ?? '',
                      photoGallery: allPhotos.length > 0 ? allPhotos : undefined,
                      compatibleWith:
                        newLandingProductIphones.length > 0
                          ? newLandingProductIphones
                          : IPHONE_MODELS.map((m) => m.id as IPhoneModelId),
                    }
                    setLandingMessage(null)
                    try {
                      const updated = await apiAddProduct(newProduct)
                      setProducts(updated.length ? updated : getAllAntichocs())
                      loadProducts().catch(() => {})
                    } catch (e) {
                      setLandingMessage('Erreur produit : ' + (e instanceof Error ? e.message : String(e)))
                      return
                    }
                  } else {
                    if (!newLandingAntichocId) {
                      setLandingMessage('Choisissez un produit existant.')
                      return
                    }
                    antichocId = newLandingAntichocId
                  }
                  setLandingMessage(null)
                  try {
                    await apiCreateLanding({
                      slug: cleanSlug,
                      antichocId,
                      title: newLandingTitle.trim() || undefined,
                    })
                    setNewLandingSlug('')
                    setNewLandingTitle('')
                    setNewLandingProductName('')
                    setNewLandingProductPrice('')
                    setNewLandingProductWholesalePrice('')
                    setNewLandingProductQuantity('')
                    setNewLandingProductDescription('')
                    setNewLandingProductPhotoUrl('')
                    setNewLandingProductPhotos([])
                    setNewLandingProductIphones([])
                    setNewLandingProductColorIds([])
                    setLandingMessage('Landing créée.')
                    apiGetLandingPages().then(setLandingPages)
                  } catch (e) {
                    setLandingMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                  }
                }}
                className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
              >
                Créer la landing page
              </button>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Landing pages existantes</h3>
              {editingLanding && (
                <div className="rounded-xl bg-brand-card border border-brand-accent/30 p-4 mb-4 max-w-lg space-y-3">
                  <h4 className="text-white font-medium">Modifier la landing page</h4>
                  <div>
                    <label className="block text-xs text-brand-muted mb-1">URL (slug)</label>
                    <input
                      type="text"
                      value={editLandingSlug}
                      onChange={(e) => setEditLandingSlug(e.target.value)}
                      placeholder="ex: coque-noir"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-muted mb-1">Titre (optionnel)</label>
                    <input
                      type="text"
                      value={editLandingTitle}
                      onChange={(e) => setEditLandingTitle(e.target.value)}
                      placeholder="Titre de la page"
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-muted mb-1">Produit</label>
                    <select
                      value={editLandingAntichocId}
                      onChange={(e) => setEditLandingAntichocId(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none text-sm"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} DA
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const cleanSlug = editLandingSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || editLandingSlug.trim()
                        if (!cleanSlug) {
                          setLandingMessage('Slug invalide.')
                          return
                        }
                        try {
                          await apiUpdateLanding(editingLanding.slug, {
                            slug: cleanSlug,
                            title: editLandingTitle.trim() || null,
                            antichocId: editLandingAntichocId,
                          })
                          setLandingMessage('Landing mise à jour.')
                          setEditingLanding(null)
                          apiGetLandingPages().then(setLandingPages)
                          apiGetCollections().then(setCollections)
                          setTimeout(() => setLandingMessage(null), 2000)
                        } catch (e) {
                          setLandingMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLanding(null)
                        setLandingMessage(null)
                      }}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {landingPages.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune landing page.</p>
              ) : (
                <ul className="space-y-2">
                  {landingPages.map((lp) => {
                    const product = products.find((p) => p.id === lp.antichocId)
                    return (
                      <li
                        key={lp.slug}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-card border border-white/10 px-4 py-3"
                      >
                        <div>
                          <span className="font-mono text-brand-accent">/p/{lp.slug}</span>
                          {lp.title && <span className="ml-2 text-brand-muted text-sm">— {lp.title}</span>}
                          {product && <span className="ml-2 text-white text-sm">({product.name})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLanding(lp)
                              setEditLandingSlug(lp.slug)
                              setEditLandingTitle(lp.title ?? '')
                              setEditLandingAntichocId(lp.antichocId)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                          >
                            Modifier
                          </button>
                          <Link
                            to={`/p/${lp.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                          >
                            Ouvrir
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Supprimer cette landing page ?')) return
                              try {
                                await apiDeleteLanding(lp.slug)
                                apiGetLandingPages().then(setLandingPages)
                                setLandingMessage('Landing supprimée.')
                                setTimeout(() => setLandingMessage(null), 2000)
                              } catch (e) {
                                setLandingMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'collections' && (
          <div className="space-y-6">
            <p className="text-brand-muted text-sm">
              Les collections regroupent une ou plusieurs landing pages. URL publique : <strong className="text-white">/c/slug</strong> (ex. /c/coques-iphone).
            </p>
            <div className="rounded-xl bg-brand-card border border-white/10 p-4 max-w-lg space-y-4">
              <h3 className="font-semibold text-white">
                {editingCollectionSlug ? 'Modifier la collection' : 'Nouvelle collection'}
              </h3>
              <div>
                <label className="block text-sm text-brand-muted mb-1">Nom de la collection</label>
                <input
                  type="text"
                  value={editingCollectionSlug ? editCollectionName : newCollectionName}
                  onChange={(e) =>
                    editingCollectionSlug ? setEditCollectionName(e.target.value) : setNewCollectionName(e.target.value)
                  }
                  placeholder="ex: Coques iPhone 15"
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
                />
              </div>
              {!editingCollectionSlug && (
                <div>
                  <label className="block text-sm text-brand-muted mb-1">Slug (URL) — lettres, chiffres, tirets</label>
                  <input
                    type="text"
                    value={newCollectionSlug}
                    onChange={(e) => setNewCollectionSlug(e.target.value)}
                    placeholder="ex: coques-iphone-15"
                    className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-brand-muted mb-1">Landing pages dans la collection</label>
                <select
                  multiple
                  value={editingCollectionSlug ? editCollectionLandingSlugs : newCollectionLandingSlugs}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                    editingCollectionSlug ? setEditCollectionLandingSlugs(selected) : setNewCollectionLandingSlugs(selected)
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none min-h-[120px]"
                >
                  {landingPages.map((lp) => {
                    const product = products.find((p) => p.id === lp.antichocId)
                    return (
                      <option key={lp.slug} value={lp.slug}>
                        /p/{lp.slug} — {lp.title || product?.name || lp.antichocId}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[10px] text-brand-muted mt-0.5">Ctrl+clic pour sélectionner plusieurs</p>
              </div>
              {collectionMessage && (
                <p className={`text-sm ${collectionMessage.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {collectionMessage}
                </p>
              )}
              <div className="flex gap-2">
                {editingCollectionSlug ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editCollectionName.trim()) {
                          setCollectionMessage('Nom requis.')
                          return
                        }
                        setCollectionMessage(null)
                        try {
                          await apiUpdateCollection(editingCollectionSlug, {
                            name: editCollectionName.trim(),
                            landingSlugs: editCollectionLandingSlugs,
                          })
                          setEditingCollectionSlug(null)
                          setEditCollectionName('')
                          setEditCollectionLandingSlugs([])
                          setCollectionMessage('Collection mise à jour.')
                          apiGetCollections().then(setCollections)
                          setTimeout(() => setCollectionMessage(null), 2000)
                        } catch (e) {
                          setCollectionMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCollectionSlug(null)
                        setEditCollectionName('')
                        setEditCollectionLandingSlugs([])
                        setCollectionMessage(null)
                      }}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const slugRaw = newCollectionSlug.trim()
                      if (!slugRaw) {
                        setCollectionMessage('Remplissez le slug (URL).')
                        return
                      }
                      if (!newCollectionName.trim()) {
                        setCollectionMessage('Remplissez le nom.')
                        return
                      }
                      const cleanSlug = slugRaw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || slugRaw
                      setCollectionMessage(null)
                      try {
                        await apiCreateCollection({
                          slug: cleanSlug,
                          name: newCollectionName.trim(),
                          landingSlugs: newCollectionLandingSlugs,
                        })
                        setNewCollectionSlug('')
                        setNewCollectionName('')
                        setNewCollectionLandingSlugs([])
                        setCollectionMessage('Collection créée.')
                        apiGetCollections().then(setCollections)
                        setTimeout(() => setCollectionMessage(null), 2000)
                      } catch (e) {
                        setCollectionMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
                  >
                    Créer la collection
                  </button>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Collections existantes</h3>
              {collections.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune collection.</p>
              ) : (
                <ul className="space-y-2">
                  {collections.map((c) => (
                    <li
                      key={c.slug}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-card border border-white/10 px-4 py-3"
                    >
                      <div>
                        <span className="font-mono text-brand-accent">/c/{c.slug}</span>
                        <span className="ml-2 text-white">{c.name}</span>
                        <span className="ml-2 text-brand-muted text-sm">
                          ({c.landingSlugs.length} landing{c.landingSlugs.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/c/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                        >
                          Ouvrir
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCollectionSlug(c.slug)
                            setEditCollectionName(c.name)
                            setEditCollectionLandingSlugs([...c.landingSlugs])
                            setCollectionMessage(null)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Supprimer cette collection ?')) return
                            try {
                              await apiDeleteCollection(c.slug)
                              apiGetCollections().then(setCollections)
                              setCollectionMessage('Collection supprimée.')
                              setTimeout(() => setCollectionMessage(null), 2000)
                            } catch (e) {
                              setCollectionMessage('Erreur : ' + (e instanceof Error ? e.message : String(e)))
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal : raison du changement de commande (pour le confirmateur) */}
      {changeReasonOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !requestChangeOrderId && setChangeReasonOrderId(null)}>
          <div className="rounded-xl bg-brand-card border border-white/10 w-full max-w-md shadow-xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Changer la commande {changeReasonOrderId}</h3>
            <p className="text-brand-muted text-sm">La commande sera repassée en « non confirmée ». Indiquez la raison pour le confirmateur (obligatoire).</p>
            <label className="block">
              <span className="text-brand-muted text-xs">Raison du changement</span>
              <textarea
                value={changeReasonInput}
                onChange={(e) => setChangeReasonInput(e.target.value)}
                placeholder="Ex : Article introuvable chez le fournisseur, demander une autre couleur..."
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm placeholder-brand-muted focus:border-brand-accent focus:outline-none"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setChangeReasonOrderId(null); setChangeReasonInput('') }}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!changeReasonInput.trim() || requestChangeOrderId === changeReasonOrderId}
                onClick={() => {
                  const reason = changeReasonInput.trim()
                  if (!reason) return
                  setRequestChangeOrderId(changeReasonOrderId)
                  apiRequestOrderChange(changeReasonOrderId, reason)
                    .then(() => getOrders().then(setOrders))
                    .finally(() => {
                      setRequestChangeOrderId(null)
                      setChangeReasonOrderId(null)
                      setChangeReasonInput('')
                    })
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-brand-dark font-medium text-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestChangeOrderId === changeReasonOrderId ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function OrderCard({
  order,
  onConfirm,
  onDelete,
  onSetOrderStatus,
  onSendToYalidine,
  yalidineSending,
  yalidineMsg,
}: {
  order: Order
  onConfirm?: (id: string) => void
  onDelete?: (id: string) => void
  onSetOrderStatus?: (orderId: string, status: Order['status']) => void
  onSendToYalidine?: (order: Order) => void
  yalidineSending?: boolean
  yalidineMsg?: { type: 'success' | 'error'; text: string } | null
}) {
  const date = new Date(order.createdAt).toLocaleString('fr-FR')
  const isPending =
    order.status !== 'confirmed' &&
    order.status !== 'cancelled' &&
    order.status !== 'livre' &&
    order.status !== 'retourne'
  return (
    <li className="rounded-xl bg-brand-card border border-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-mono text-brand-accent">{order.id}</span>
          <span className="ml-2 text-brand-muted text-sm">{date}</span>
          {order.confirmationCode && (
            <div className="text-brand-accent text-xs mt-1">
              Code: {order.confirmationCode}
            </div>
          )}
          {order.yalidineTracking && (
            <div className="text-emerald-400 text-xs mt-1">
              Yalidine : {order.yalidineTracking}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPending && onConfirm && (
            <button
              type="button"
              onClick={() => onConfirm(order.id)}
              className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
            >
              Confirmer
            </button>
          )}
          {order.status === 'none' && (
            <span className="px-2 py-1 rounded bg-white/10 text-brand-muted text-xs font-medium">
              Pas de statut
            </span>
          )}
          {order.status === 'confirmed' && (
            <>
              <span className="px-2 py-1 rounded bg-brand-accent/20 text-brand-accent text-xs font-medium">
                Confirmée
              </span>
              {onSetOrderStatus && (
                <>
                  <button
                    type="button"
                    onClick={() => onSetOrderStatus(order.id, 'livre')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                  >
                    Marquer livré
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetOrderStatus(order.id, 'retourne')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs hover:bg-amber-500"
                  >
                    Marquer retourné
                  </button>
                </>
              )}
            </>
          )}
          {order.status === 'livre' && (
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              Livrée
            </span>
          )}
          {order.status === 'retourne' && (
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
              Retournée
            </span>
          )}
          {order.status === 'cancelled' && (
            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium">
              Annulée
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(order.id)}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 border border-red-500/30"
              title="Supprimer la commande"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
      {yalidineMsg && (
        <p className={`text-xs mb-2 ${yalidineMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {yalidineMsg.text}
        </p>
      )}
      {onSendToYalidine && (
        <div className="mt-2">
          {order.yalidineTracking ? (
            <a
              href={`https://www.yalidine.com/suivre-un-colis/?tracking=${encodeURIComponent(order.yalidineTracking)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-accent text-sm hover:underline"
            >
              Suivre le colis →
            </a>
          ) : order.status === 'confirmed' ? (
            <button
              type="button"
              onClick={() => onSendToYalidine(order)}
              disabled={yalidineSending}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 disabled:opacity-50"
            >
              {yalidineSending ? 'Envoi…' : 'Envoyer à Yalidine'}
            </button>
          ) : (
            <span className="text-brand-muted text-xs">Confirmer la commande pour envoyer à Yalidine</span>
          )}
        </div>
      )}
      <p className="text-white font-medium">{order.customerName}</p>
      <p className="text-brand-muted text-sm">{order.phone}</p>
      <p className="text-brand-muted text-sm">
        {order.wilaya
          ? `${order.address} — ${order.wilaya}${order.deliveryType ? ` (${order.deliveryType === 'domicile' ? 'À domicile' : order.yalidineStopdeskName ? `Bureau: ${order.yalidineStopdeskName}` : 'Bureau Yalidine'})` : ''}`
          : `${order.address}${order.city ? `, ${order.city}` : ''}`}
      </p>
      {order.deliveryPrice != null && order.deliveryPrice > 0 && (
        <p className="text-brand-muted text-xs">Livraison : {order.deliveryPrice} DA</p>
      )}
      <div className="mt-2 pt-2 border-t border-white/10">
        {order.items.map((item) => (
          <div key={item.antichoc.id + (item.selectedPhoneId ?? '') + (item.selectedColorId ?? '')} className="flex justify-between text-sm text-white">
            <span>{formatOrderItemLabel(item)}</span>
            <span>{item.antichoc.price} DA</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-brand-accent mt-1">
          <span>Total</span>
          <span>{order.total} DA</span>
        </div>
      </div>
    </li>
  )
}

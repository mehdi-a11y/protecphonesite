import { useState, useEffect, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  getOrders,
  confirmOrder,
  setOrderStatus,
  updateOrderYalidine,
  isAdminAuthenticated,
  setAdminAuthenticated,
  ADMIN_PASSWORD,
  type Order,
} from '../types'
import { getAllAntichocs, saveProducts, ANTICHOCS } from '../data'
import { IPHONE_MODELS, type IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import {
  WILAYAS,
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

type Tab = 'commandes' | 'produits' | 'statistiques' | 'benefice' | 'livraison' | 'yalidine'

export function AdminPage() {
  const [auth, setAuth] = useState(isAdminAuthenticated())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('commandes')
  const [orders, setOrders] = useState<Order[]>([])
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

  useEffect(() => {
    if (auth) {
      setOrders(getOrders())
      setProducts(getAllAntichocs())
      setDeliveryPrices(getDeliveryPrices())
      const creds = getYalidineCredentials()
      if (creds) {
        setYalidineApiId(creds.apiId)
        setYalidineApiToken(creds.apiToken)
      }
      // Synchronisation automatique avec Yalidine au chargement (livré / retourné / annulé)
      syncOrdersWithYalidine().then((r) => {
        if (r.success && r.updated > 0) {
          setOrders(getOrders())
        }
      })
    }
  }, [auth, tab])

  const handleSyncYalidine = async () => {
    setYalidineSyncing(true)
    setYalidineSyncMessage(null)
    const result = await syncOrdersWithYalidine()
    setYalidineSyncing(false)
    setOrders(getOrders())
    if (result.success) {
      setYalidineSyncMessage(result.updated > 0 ? `${result.updated} commande(s) mise(s) à jour.` : 'Aucun changement.')
    } else {
      setYalidineSyncMessage(result.error)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true)
      setAuth(true)
      setOrders(getOrders())
      setProducts(getAllAntichocs())
    } else {
      setError('Mot de passe incorrect')
    }
  }

  const handleLogout = () => {
    setAdminAuthenticated(false)
    setAuth(false)
    setPassword('')
  }

  const handleConfirm = (orderId: string) => {
    confirmOrder(orderId)
    setOrders(getOrders())
  }

  const handleSetOrderStatus = (orderId: string, status: Order['status']) => {
    setOrderStatus(orderId, status)
    setOrders(getOrders())
  }

  const handleDeleteProduct = (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    setProducts((prev) => prev.filter((p) => p.id !== id))
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

  const handleSaveProducts = () => {
    saveProducts(products)
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
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, photoUrl: url } : p)),
      )
    }
    reader.readAsDataURL(file)
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

  const handleSaveDeliveryPrices = () => {
    saveDeliveryPrices(deliveryPrices)
  }

  const handleSaveYalidineCredentials = () => {
    saveYalidineCredentials({ apiId: yalidineApiId.trim(), apiToken: yalidineApiToken.trim() })
  }

  const handleSendToYalidine = async (order: Order) => {
    if (order.yalidineTracking) {
      setYalidineMessage({ orderId: order.id, type: 'error', text: `Déjà envoyé : ${order.yalidineTracking}` })
      return
    }
    setYalidineSendingId(order.id)
    setYalidineMessage(null)
    const result = await createParcelOnYalidine(order)
    setYalidineSendingId(null)
    if (result.success) {
      updateOrderYalidine(order.id, { tracking: result.tracking, sentAt: new Date().toISOString() })
      setOrders(getOrders())
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

  const pendingOrders = orders.filter(
    (o) =>
      o.status !== 'confirmed' &&
      o.status !== 'cancelled' &&
      o.status !== 'livre' &&
      o.status !== 'retourne',
  )
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed')
  const livreOrders = orders.filter((o) => o.status === 'livre')
  const retourneOrders = orders.filter((o) => o.status === 'retourne')
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')

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

      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('commandes')}
          className={`px-6 py-3 font-medium text-sm ${
            tab === 'commandes'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-muted hover:text-white'
          }`}
        >
          Commandes
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
      </div>

      <main className="p-4 max-w-5xl mx-auto">
        {tab === 'commandes' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSyncYalidine}
                disabled={yalidineSyncing || orders.filter((o) => o.yalidineTracking).length === 0}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {yalidineSyncing ? 'Synchronisation…' : 'Synchroniser avec Yalidine'}
              </button>
              {yalidineSyncMessage && (
                <span className="text-brand-muted text-sm">{yalidineSyncMessage}</span>
              )}
              <span className="text-brand-muted text-xs">
                Met à jour Livré / Retourné / Annulé depuis Yalidine
              </span>
            </div>
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">
                En attente ({pendingOrders.length})
              </h2>
              {pendingOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande en attente.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onConfirm={handleConfirm}
                      onSendToYalidine={handleSendToYalidine}
                      yalidineSending={yalidineSendingId === order.id}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">
                Confirmées ({confirmedOrders.length})
              </h2>
              <p className="text-brand-muted text-xs mb-2">Client a confirmé — en attente de livraison</p>
              {confirmedOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande confirmée.</p>
              ) : (
                <ul className="space-y-4">
                  {confirmedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onSendToYalidine={handleSendToYalidine}
                      onSetOrderStatus={handleSetOrderStatus}
                      yalidineSending={yalidineSendingId === order.id}
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">
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
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">
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
                      yalidineMsg={yalidineMessage?.orderId === order.id ? yalidineMessage : null}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">
                Annulées / tentatives échouées ({cancelledOrders.length})
              </h2>
              {cancelledOrders.length === 0 ? (
                <p className="text-brand-muted text-sm">Aucune commande annulée.</p>
              ) : (
                <ul className="space-y-4">
                  {cancelledOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

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
                  className="px-4 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim"
                >
                  Enregistrer
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-brand-muted border-b border-white/10">
                    <th className="pb-2 pr-4">Collections (iPhone)</th>
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Prix détail (DA)</th>
                    <th className="pb-2 pr-4">Prix gros (DA)</th>
                    <th className="pb-2 pr-4">Quantité</th>
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
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={p.quantity ?? 0}
                          onChange={(e) =>
                            handleProductChange(p.id, 'quantity', e.target.value)
                          }
                          className="w-24 px-2 py-1 rounded bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                        />
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
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 border border-red-500/30"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'statistiques' && (
          <div className="space-y-6">
            {(() => {
              const chStock = products.reduce(
                (sum, p) => sum + (p.wholesalePrice ?? 0) * (p.quantity ?? 0),
                0,
              )
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
      </main>
    </div>
  )
}

function OrderCard({
  order,
  onConfirm,
  onSetOrderStatus,
  onSendToYalidine,
  yalidineSending,
  yalidineMsg,
}: {
  order: Order
  onConfirm?: (id: string) => void
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
          ) : (
            <button
              type="button"
              onClick={() => onSendToYalidine(order)}
              disabled={yalidineSending}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 disabled:opacity-50"
            >
              {yalidineSending ? 'Envoi…' : 'Envoyer à Yalidine'}
            </button>
          )}
        </div>
      )}
      <p className="text-white font-medium">{order.customerName}</p>
      <p className="text-brand-muted text-sm">{order.phone}</p>
      <p className="text-brand-muted text-sm">
        {order.wilaya
          ? `${order.address} — ${order.wilaya}${order.deliveryType ? ` (${order.deliveryType === 'domicile' ? 'À domicile' : 'Bureau Yalidine'})` : ''}`
          : `${order.address}${order.city ? `, ${order.city}` : ''}`}
      </p>
      {order.deliveryPrice != null && order.deliveryPrice > 0 && (
        <p className="text-brand-muted text-xs">Livraison : {order.deliveryPrice} DA</p>
      )}
      <div className="mt-2 pt-2 border-t border-white/10">
        {order.items.map((item) => (
          <div key={item.antichoc.id} className="flex justify-between text-sm text-white">
            <span>{item.antichoc.name}{item.isUpsell ? ' (offre -50%)' : ''}</span>
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

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, setOrderStatus, updateOrder, updateOrderYalidine, CONFIRMATEUR_PASSWORD, isConfirmateurAuthenticated, setConfirmateurAuthenticated, type Order, type CartItem } from '../types'
import { createParcelOnYalidine, syncOrdersWithYalidine } from '../yalidine'
import { formatOrderItemLabel, IPHONE_MODELS, ANTICHOC_COLORS, normalizeProduct, type Antichoc, type IPhoneModelId } from '../data'
import { apiGetProducts } from '../api'

type FilterStatus =
  | 'all'
  | 'none'
  | 'tentative1'
  | 'tentative2'
  | 'tentative3'
  | 'callback'
  | 'confirmed'
  | 'livre'
  | 'retourne'
  | 'cancelled'

function getStatusLabel(status: Order['status']): string {
  switch (status) {
    case 'none':
      return 'Pas de statut'
    case 'tentative1':
      return 'Tentative 1'
    case 'tentative2':
      return 'Tentative 2'
    case 'tentative3':
      return 'Tentative 3'
    case 'callback':
      return 'Rappel'
    case 'confirmed':
      return 'Confirmée'
    case 'livre':
      return 'Livrée'
    case 'retourne':
      return 'Retournée'
    case 'cancelled':
      return 'Annulée'
    default:
      return status
  }
}

export function ConfirmPage() {
  const [auth, setAuth] = useState(isConfirmateurAuthenticated())
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [confirmTab, setConfirmTab] = useState<'a-confirmer' | 'non-envoyees' | 'envoyees'>('a-confirmer')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterChangeRequestOnly, setFilterChangeRequestOnly] = useState(false)
  const [yalidineSending, setYalidineSending] = useState(false)
  const [yalidineSendingAll, setYalidineSendingAll] = useState(false)
  const [yalidineMsg, setYalidineMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [yalidineSyncing, setYalidineSyncing] = useState(false)
  const [yalidineSyncMsg, setYalidineSyncMsg] = useState<string | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Order> & { items?: CartItem[] }>({})
  const [products, setProducts] = useState<Antichoc[]>([])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (password === CONFIRMATEUR_PASSWORD) {
      setConfirmateurAuthenticated(true)
      setAuth(true)
      setPassword('')
    } else {
      setLoginError('Mot de passe incorrect.')
    }
  }

  const handleLogout = () => {
    setConfirmateurAuthenticated(false)
    setAuth(false)
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-brand-card border border-white/10 p-6">
          <h1 className="text-lg font-semibold text-white mb-2">Plateforme de confirmation</h1>
          <p className="text-brand-muted text-sm mb-4">Entrez le mot de passe pour accéder.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
              autoFocus
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" className="w-full py-2 rounded-lg bg-brand-accent text-white font-medium hover:opacity-90">
              Connexion
            </button>
          </form>
          <p className="mt-4 text-center">
            <Link to="/" className="text-brand-muted hover:text-white text-sm">Retour au site</Link>
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    getOrders().then(setOrders)
    syncOrdersWithYalidine().then((r) => {
      if (r.success && r.updated > 0) getOrders().then(setOrders)
    })
  }, [])

  useEffect(() => {
    if (auth) {
      apiGetProducts().then((list) => {
        const normalized = (list || []).map((p) => normalizeProduct(p)).filter(Boolean) as Antichoc[]
        setProducts(normalized)
      })
    }
  }, [auth])

  const refreshOrders = () => {
    getOrders().then(setOrders)
  }

  const handleSyncYalidine = async () => {
    setYalidineSyncing(true)
    setYalidineSyncMsg(null)
    const result = await syncOrdersWithYalidine()
    setYalidineSyncing(false)
    const orders = await getOrders()
    setOrders(orders)
    setSelectedOrder(orders.find((o) => o.id === selectedOrder?.id) ?? null)
    if (result.success) {
      setYalidineSyncMsg(result.updated > 0 ? `${result.updated} commande(s) mise(s) à jour.` : 'À jour.')
    } else {
      setYalidineSyncMsg(result.error)
    }
  }

  const handleSearchByCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSelectedOrder(null)

    const trimmed = codeInput.trim()
    if (!trimmed) {
      setError('Veuillez entrer un code de confirmation.')
      return
    }

    const found = orders.find((o) => o.confirmationCode === trimmed)

    if (!found) {
      setError('Aucune commande trouvée pour ce code.')
      return
    }

    setSelectedOrder(found)
  }

  const handleStatusChange = async (order: Order, status: Order['status']) => {
    await setOrderStatus(order.id, status)
    const orders = await getOrders()
    setOrders(orders)
    setSelectedOrder(orders.find((o) => o.id === order.id) ?? null)
    setInfo(`Commande ${order.id} mise à jour en "${getStatusLabel(status)}".`)
  }

  const openEditOrder = (order: Order) => {
    setEditingOrder(order)
    const itemsCopy: CartItem[] = (order.items || []).map((i) => ({
      ...i,
      antichoc: { ...i.antichoc },
    }))
    setEditForm({
      customerName: order.customerName ?? '',
      phone: order.phone ?? '',
      address: order.address ?? '',
      wilaya: order.wilaya ?? '',
      deliveryType: order.deliveryType ?? 'domicile',
      deliveryPrice: order.deliveryPrice,
      total: order.total,
      yalidineStopdeskId: order.yalidineStopdeskId ?? '',
      yalidineStopdeskName: order.yalidineStopdeskName ?? '',
      items: itemsCopy,
    })
  }

  const editItems = editForm.items ?? []
  const computedTotal = editItems.reduce((s, i) => s + (i.antichoc?.price ?? 0), 0) + (editForm.deliveryPrice ?? 0)
  const updateEditItem = (index: number, patch: Partial<CartItem>) => {
    const next = [...editItems]
    next[index] = { ...next[index], ...patch }
    setEditForm((f) => ({ ...f, items: next, total: next.reduce((s, i) => s + (i.antichoc?.price ?? 0), 0) + (f.deliveryPrice ?? 0) }))
  }
  const removeEditItem = (index: number) => {
    const next = editItems.filter((_, i) => i !== index)
    setEditForm((f) => ({ ...f, items: next, total: next.reduce((s, i) => s + (i.antichoc?.price ?? 0), 0) + (f.deliveryPrice ?? 0) }))
  }
  const addEditItem = () => {
    const first = products[0]
    if (!first) return
    const colorIds = first.colorIds?.length ? first.colorIds : [ANTICHOC_COLORS[0]?.id ?? '']
    const phoneIds = first.compatibleWith?.length ? first.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
    const newItem: CartItem = {
      antichoc: { ...first },
      selectedColorId: colorIds[0] ?? '',
      selectedPhoneId: phoneIds[0],
      isUpsell: false,
    }
    setEditForm((f) => {
      const next = [...(f.items ?? []), newItem]
      return { ...f, items: next, total: next.reduce((s, i) => s + (i.antichoc?.price ?? 0), 0) + (f.deliveryPrice ?? 0) }
    })
  }

  const handleSaveEditOrder = async () => {
    if (!editingOrder) return
    const itemsToSave = editForm.items ?? []
    if (itemsToSave.length === 0) {
      setError('La commande doit avoir au moins un article.')
      return
    }
    setEditSaving(true)
    setError('')
    try {
      const totalToSave = itemsToSave.reduce((s, i) => s + (i.antichoc?.price ?? 0), 0) + (editForm.deliveryPrice ?? 0)
      const updated = await updateOrder(editingOrder.id, {
        customerName: editForm.customerName,
        phone: editForm.phone,
        address: editForm.address,
        wilaya: editForm.wilaya,
        deliveryType: editForm.deliveryType,
        deliveryPrice: editForm.deliveryPrice,
        total: totalToSave,
        items: itemsToSave,
        yalidineStopdeskId: editForm.yalidineStopdeskId || undefined,
        yalidineStopdeskName: editForm.yalidineStopdeskName || undefined,
      })
      const orders = await getOrders()
      setOrders(orders)
      setSelectedOrder(orders.find((o) => o.id === editingOrder.id) ?? updated)
      setEditingOrder(null)
      setInfo(`Commande ${editingOrder.id} mise à jour.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la mise à jour.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSendToYalidine = async (order: Order) => {
    if (order.status !== 'confirmed') {
      setYalidineMsg({ type: 'error', text: 'Seules les commandes confirmées peuvent être envoyées à Yalidine.' })
      return
    }
    if (order.yalidineTracking) {
      setYalidineMsg({ type: 'error', text: `Déjà envoyé : ${order.yalidineTracking}` })
      return
    }
    setYalidineSending(true)
    setYalidineMsg(null)
    const result = await createParcelOnYalidine(order)
    setYalidineSending(false)
    if (result.success) {
      await updateOrderYalidine(order.id, { tracking: result.tracking, sentAt: new Date().toISOString() })
      const orders = await getOrders()
      setOrders(orders)
      setSelectedOrder(orders.find((o) => o.id === order.id) ?? null)
      setYalidineMsg({ type: 'success', text: `Suivi : ${result.tracking}` })
    } else {
      setYalidineMsg({ type: 'error', text: result.error })
    }
  }

  const handleSendAllToYalidine = async () => {
    if (ordersToSendToYalidine.length === 0) return
    setYalidineSendingAll(true)
    setYalidineMsg(null)
    let ok = 0
    const errors: string[] = []
    for (const order of ordersToSendToYalidine) {
      const result = await createParcelOnYalidine(order)
      if (result.success) {
        await updateOrderYalidine(order.id, { tracking: result.tracking, sentAt: new Date().toISOString() })
        ok++
      } else {
        errors.push(`${order.id}: ${result.error}`)
      }
    }
    const orders = await getOrders()
    setOrders(orders)
    setSelectedOrder(null)
    setYalidineSendingAll(false)
    if (errors.length === 0) {
      setYalidineMsg({ type: 'success', text: `${ok} commande(s) envoyée(s) à Yalidine.` })
    } else {
      setYalidineMsg({ type: 'error', text: `${ok} envoyée(s), ${errors.length} échec(s). ${errors.slice(0, 2).join(' — ')}${errors.length > 2 ? '…' : ''}` })
    }
  }

  const pendingCount = orders.filter(
    (o) =>
      o.status !== 'confirmed' &&
      o.status !== 'cancelled' &&
      o.status !== 'livre' &&
      o.status !== 'retourne',
  ).length
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length

  const changeRequestedCount = orders.filter((o) => o.changeRequestedByAdmin).length
  const filteredOrders = orders.filter((o) => {
    if (filterChangeRequestOnly && !o.changeRequestedByAdmin) return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (!searchText.trim()) return true
    const q = searchText.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q)
    )
  })
  const PENDING_STATUSES: Order['status'][] = ['none', 'tentative1', 'tentative2', 'tentative3', 'callback']
  const ordersToConfirm = filteredOrders.filter((o) => PENDING_STATUSES.includes(o.status))
  const ordersSentYalidine = filteredOrders.filter((o) => o.status === 'confirmed' && o.yalidineTracking)
  const ordersNotSentYalidine = filteredOrders.filter((o) => o.status === 'confirmed' && !o.yalidineTracking)
  const ordersToSendToYalidine = ordersNotSentYalidine

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-brand-muted hover:text-white text-sm">
          ← Retour au site
        </Link>
        <span className="text-brand-accent text-sm font-medium">Confirmation des commandes</span>
        <button type="button" onClick={handleLogout} className="text-brand-muted hover:text-white text-sm">
          Déconnexion
        </button>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        <section className="mb-6">
          <h1 className="text-xl font-bold text-white mb-2">
            Plateforme de confirmation (call center)
          </h1>
          <p className="text-brand-muted text-sm">
            Page dédiée au confirmateur : recherchez par <span className="font-semibold text-white">code</span> ou
            travaillez dans la liste des commandes en attente pour les marquer comme <span className="text-emerald-400 font-semibold">confirmées</span>.
          </p>
        </section>

        <form onSubmit={handleSearchByCode} className="rounded-xl bg-brand-card border border-white/10 p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <label className="block text-sm text-brand-muted mb-1">
              Code de confirmation
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-brand-dark border border-white/10 text-white focus:border-brand-accent focus:outline-none font-mono"
              placeholder="Ex : 123456"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-colors mt-4 sm:mt-6"
          >
            Rechercher
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-sm mb-4">
            {error}
          </p>
        )}
        {info && (
          <p className="text-emerald-400 text-sm mb-4">
            {info}
          </p>
        )}

        <div className="flex border-b border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setConfirmTab('a-confirmer')}
            className={`px-5 py-3 font-medium text-sm ${
              confirmTab === 'a-confirmer'
                ? 'text-brand-accent border-b-2 border-brand-accent'
                : 'text-brand-muted hover:text-white'
            }`}
          >
            À confirmer
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirmTab('non-envoyees')}
            className={`px-5 py-3 font-medium text-sm ${
              confirmTab === 'non-envoyees'
                ? 'text-brand-accent border-b-2 border-brand-accent'
                : 'text-brand-muted hover:text-white'
            }`}
          >
            Non envoyées
            {ordersNotSentYalidine.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs">
                {ordersNotSentYalidine.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirmTab('envoyees')}
            className={`px-5 py-3 font-medium text-sm ${
              confirmTab === 'envoyees'
                ? 'text-brand-accent border-b-2 border-brand-accent'
                : 'text-brand-muted hover:text-white'
            }`}
          >
            Envoyées à Yalidine
            {ordersSentYalidine.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs">
                {ordersSentYalidine.length}
              </span>
            )}
          </button>
        </div>

        {selectedOrder && (
          <section className="rounded-xl bg-brand-card border border-white/10 p-4 space-y-3">
            {selectedOrder.changeRequestedByAdmin && (
              <div className="rounded-lg p-3 bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm space-y-1">
                <p><strong>Changement demandé par l&apos;admin</strong> — la commande a été repassée en « non confirmée ». Contacter le client pour qu&apos;il modifie sa commande, puis reconfirmer.</p>
                {selectedOrder.changeRequestedReason && (
                  <p className="mt-2 pt-2 border-t border-amber-500/30"><strong>Raison :</strong> {selectedOrder.changeRequestedReason}</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs text-brand-muted">N° commande</p>
                <p className="font-mono text-brand-accent">{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-xs text-brand-muted">Code de confirmation</p>
                <p className="font-mono text-brand-accent">{selectedOrder.confirmationCode}</p>
              </div>
              <div>
                <p className="text-xs text-brand-muted">Statut</p>
                <p className="text-sm text-white">
                  {getStatusLabel(selectedOrder.status)}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1">
              <p className="text-white font-medium">{selectedOrder.customerName}</p>
              <p className="text-brand-muted text-sm">{selectedOrder.phone}</p>
              <p className="text-brand-muted text-sm">
                {selectedOrder.wilaya
                  ? `${selectedOrder.address} — Wilaya ${selectedOrder.wilaya}${selectedOrder.deliveryType ? ` (${selectedOrder.deliveryType === 'domicile' ? 'À domicile' : selectedOrder.yalidineStopdeskName ? `Bureau: ${selectedOrder.yalidineStopdeskName}` : 'Bureau Yalidine'})` : ''}`
                  : `${selectedOrder.address}${selectedOrder.city ? `, ${selectedOrder.city}` : ''}`}
              </p>
              {selectedOrder.deliveryPrice != null && selectedOrder.deliveryPrice > 0 && (
                <p className="text-brand-muted text-xs">Livraison : {selectedOrder.deliveryPrice} DA</p>
              )}
              {selectedOrder.yalidineTracking && (
                <p className="text-emerald-400 text-xs mt-1">
                  Yalidine : {selectedOrder.yalidineTracking}{' '}
                  <a
                    href={`https://www.yalidine.com/suivre-un-colis/?tracking=${encodeURIComponent(selectedOrder.yalidineTracking)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Suivre
                  </a>
                </p>
              )}
            </div>

            {yalidineMsg && (
              <p className={`text-sm ${yalidineMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {yalidineMsg.text}
              </p>
            )}
            {selectedOrder.yalidineTracking ? null : selectedOrder.status === 'confirmed' ? (
              <button
                type="button"
                onClick={() => handleSendToYalidine(selectedOrder)}
                disabled={yalidineSending}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
              >
                {yalidineSending ? 'Envoi vers Yalidine…' : 'Envoyer à Yalidine'}
              </button>
            ) : (
              <p className="text-brand-muted text-sm">Confirmez la commande pour pouvoir l&apos;envoyer à Yalidine.</p>
            )}

            <div className="pt-3 border-t border-white/10 space-y-1">
              <p className="text-sm text-brand-muted mb-1">Articles</p>
              {selectedOrder.items.map((item) => (
                <div
                  key={item.antichoc.id + (item.selectedPhoneId ?? '') + (item.selectedColorId ?? '') + (item.isUpsell ? '-upsell' : '')}
                  className="flex justify-between text-sm text-white"
                >
                  <span>{formatOrderItemLabel(item)}</span>
                  <span>{item.antichoc.price} DA</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-brand-accent mt-1">
                <span>Total</span>
                <span>{selectedOrder.total} DA</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => openEditOrder(selectedOrder)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
              >
                Modifier la commande
              </button>
              <select
                value={selectedOrder.status}
                onChange={(e) =>
                  handleStatusChange(selectedOrder, e.target.value as Order['status'])
                }
                className="px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-xs text-white focus:border-brand-accent focus:outline-none"
              >
                <option value="none">Pas de statut</option>
                <option value="tentative1">Tentative 1</option>
                <option value="tentative2">Tentative 2</option>
                <option value="tentative3">Tentative 3</option>
                <option value="callback">Rappel</option>
                <option value="confirmed">Confirmé</option>
                <option value="livre">Livrée</option>
                <option value="retourne">Retournée</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </section>
        )}

        {/* Modal Modifier la commande */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !editSaving && setEditingOrder(null)}>
            <div className="rounded-xl bg-brand-card border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-semibold">Modifier la commande {editingOrder.id}</h3>
              <div className="space-y-2">
                <label className="block text-xs text-brand-muted">Nom client</label>
                <input
                  value={editForm.customerName ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                />
                <label className="block text-xs text-brand-muted">Téléphone</label>
                <input
                  value={editForm.phone ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                />
                <label className="block text-xs text-brand-muted">Adresse / Commune</label>
                <input
                  value={editForm.address ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                />
                <label className="block text-xs text-brand-muted">Wilaya</label>
                <input
                  value={editForm.wilaya ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, wilaya: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                />
                <label className="block text-xs text-brand-muted">Livraison</label>
                <select
                  value={editForm.deliveryType ?? 'domicile'}
                  onChange={(e) => setEditForm((f) => ({ ...f, deliveryType: e.target.value as Order['deliveryType'] }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                >
                  <option value="domicile">À domicile</option>
                  <option value="yalidine">Bureau Yalidine</option>
                </select>
                {(editForm.deliveryType === 'yalidine') && (
                  <>
                    <label className="block text-xs text-brand-muted">Bureau Yalidine (nom)</label>
                    <input
                      value={editForm.yalidineStopdeskName ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, yalidineStopdeskName: e.target.value }))}
                      placeholder="Nom du bureau"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                    />
                    <label className="block text-xs text-brand-muted">ID bureau (stopdesk_id)</label>
                    <input
                      value={editForm.yalidineStopdeskId ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, yalidineStopdeskId: e.target.value }))}
                      placeholder="ex. 160101"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                    />
                  </>
                )}
                <label className="block text-xs text-brand-muted">Livraison (DA)</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.deliveryPrice ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, deliveryPrice: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                />

                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-brand-muted mb-2">Articles</p>
                  {editItems.map((item, index) => {
                    const antichoc = item.antichoc
                    const colorIds = antichoc?.colorIds?.length ? antichoc.colorIds : ['']
                    const phoneIds = (antichoc?.compatibleWith?.length ? antichoc.compatibleWith : IPHONE_MODELS.map((m) => m.id)) as IPhoneModelId[]
                    const safeColorId = item.selectedColorId && colorIds.includes(item.selectedColorId) ? item.selectedColorId : (colorIds[0] ?? '')
                    const safePhoneId = item.selectedPhoneId && phoneIds.includes(item.selectedPhoneId) ? item.selectedPhoneId : phoneIds[0]
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2 py-2 border-b border-white/5 last:border-0">
                        <select
                          value={antichoc?.id ?? ''}
                          onChange={(e) => {
                            const p = products.find((x) => x.id === e.target.value)
                            if (p) {
                              const cids = p.colorIds?.length ? p.colorIds : [ANTICHOC_COLORS[0]?.id ?? '']
                              const pids = p.compatibleWith?.length ? p.compatibleWith : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
                              updateEditItem(index, { antichoc: { ...p }, selectedColorId: cids[0] ?? '', selectedPhoneId: pids[0], isUpsell: item.isUpsell })
                            }
                          }}
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={safeColorId}
                          onChange={(e) => updateEditItem(index, { selectedColorId: e.target.value })}
                          className="w-28 px-2 py-1.5 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent focus:outline-none"
                        >
                          {colorIds.map((cid) => (
                            <option key={cid || 'none'} value={cid}>{cid ? (ANTICHOC_COLORS.find((c) => c.id === cid)?.name ?? cid) : '—'}</option>
                          ))}
                        </select>
                        <select
                          value={safePhoneId ?? ''}
                          onChange={(e) => updateEditItem(index, { selectedPhoneId: e.target.value as IPhoneModelId })}
                          className="w-32 px-2 py-1.5 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent focus:outline-none"
                        >
                          {phoneIds.map((pid) => (
                            <option key={pid} value={pid}>{IPHONE_MODELS.find((m) => m.id === pid)?.name ?? pid}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1 text-xs text-brand-muted whitespace-nowrap">
                          <input type="checkbox" checked={!!item.isUpsell} onChange={(e) => updateEditItem(index, { isUpsell: e.target.checked })} className="rounded border-white/30 bg-brand-dark text-brand-accent" />
                          Upsell
                        </label>
                        <span className="text-brand-accent text-xs font-medium">{item.antichoc?.price ?? 0} DA</span>
                        <button type="button" onClick={() => removeEditItem(index)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30">Supprimer</button>
                      </div>
                    )
                  })}
                  <button type="button" onClick={addEditItem} disabled={products.length === 0} className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 disabled:opacity-50">
                    + Ajouter une ligne
                  </button>
                </div>

                <p className="text-xs text-brand-muted">Total (DA) — recalculé</p>
                <p className="text-lg font-semibold text-brand-accent">{computedTotal} DA</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveEditOrder}
                  disabled={editSaving}
                  className="flex-1 py-2 rounded-lg bg-brand-accent text-brand-dark font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenu selon l'onglet */}
        <section className="space-y-4">
          {/* Page À confirmer */}
          {confirmTab === 'a-confirmer' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-brand-muted">En attente</p>
                    <p className="text-lg font-semibold text-white">{pendingCount}</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-brand-muted">Confirmées</p>
                    <p className="text-lg font-semibold text-emerald-400">{confirmedCount}</p>
                  </div>
                  {changeRequestedCount > 0 && (
                    <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-300">À appeler (changement)</p>
                      <p className="text-lg font-semibold text-amber-300">{changeRequestedCount}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSyncYalidine}
                    disabled={yalidineSyncing || orders.filter((o) => o.yalidineTracking).length === 0}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {yalidineSyncing ? 'Synchro…' : 'Sync Yalidine'}
                  </button>
                  {yalidineSyncMsg && (
                    <span className="text-brand-muted text-xs">{yalidineSyncMsg}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterChangeRequestOnly(!filterChangeRequestOnly)}
                    className={`px-3 py-1.5 rounded-full text-xs ${
                      filterChangeRequestOnly ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50' : 'bg-white/5 text-brand-muted hover:text-white'
                    }`}
                  >
                    À appeler (changement)
                    {changeRequestedCount > 0 && <span className="ml-1 font-semibold">({changeRequestedCount})</span>}
                  </button>
                  <button type="button" onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'all' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Tous</button>
                  <button type="button" onClick={() => setFilterStatus('none')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'none' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Pas de statut</button>
                  <button type="button" onClick={() => setFilterStatus('tentative1')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'tentative1' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Tentative 1</button>
                  <button type="button" onClick={() => setFilterStatus('tentative2')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'tentative2' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Tentative 2</button>
                  <button type="button" onClick={() => setFilterStatus('tentative3')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'tentative3' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Tentative 3</button>
                  <button type="button" onClick={() => setFilterStatus('callback')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'callback' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Rappel</button>
                  <button type="button" onClick={() => setFilterStatus('confirmed')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'confirmed' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Confirmé</button>
                  <button type="button" onClick={() => setFilterStatus('livre')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'livre' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Livré</button>
                  <button type="button" onClick={() => setFilterStatus('retourne')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'retourne' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Retourné</button>
                  <button type="button" onClick={() => setFilterStatus('cancelled')} className={`px-3 py-1.5 rounded-full text-xs ${filterStatus === 'cancelled' ? 'bg-brand-accent text-brand-dark' : 'bg-white/5 text-brand-muted hover:text-white'}`}>Annulé</button>
                </div>
              </div>
              <div className="flex justify-end mb-2">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm placeholder-brand-muted focus:border-brand-accent focus:outline-none"
                  placeholder="Rechercher par commande, client ou téléphone..."
                />
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-brand-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Commande</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-left">Téléphone</th>
                      <th className="px-3 py-2 text-left">Total</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersToConfirm.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-brand-muted text-sm">Aucune commande à confirmer.</td>
                      </tr>
                    ) : (
                      ordersToConfirm.map((o) => {
                        const date = new Date(o.createdAt).toLocaleString('fr-FR')
                        return (
                          <tr key={o.id} className="border-t border-white/5">
                            <td className="px-3 py-2 text-white font-mono text-xs">{o.id}</td>
                            <td className="px-3 py-2 text-brand-muted text-xs">{date}</td>
                            <td className="px-3 py-2 text-white">{o.customerName}</td>
                            <td className="px-3 py-2 text-brand-muted text-xs">{o.phone}</td>
                            <td className="px-3 py-2 text-brand-accent font-semibold">{o.total} DA</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/5 text-xs text-white">{getStatusLabel(o.status)}</span>
                              {o.changeRequestedByAdmin && <span className="ml-1 inline-flex items-center px-2 py-1 rounded-full bg-amber-500/25 text-amber-300 text-xs" title="Changement demandé">Changer</span>}
                            </td>
                            <td className="px-3 py-2 text-right space-x-2">
                              <button type="button" onClick={() => setSelectedOrder(o)} className="px-3 py-1 rounded-lg border border-white/15 text-xs text-white hover:bg-white/10">Détails</button>
                              <select value={o.status} onChange={(e) => handleStatusChange(o, e.target.value as Order['status'])} className="px-2 py-1 rounded-lg bg-brand-dark border border-white/15 text-xs text-white focus:border-brand-accent focus:outline-none">
                                <option value="none">Pas de statut</option>
                                <option value="tentative1">Tentative 1</option>
                                <option value="tentative2">Tentative 2</option>
                                <option value="tentative3">Tentative 3</option>
                                <option value="callback">Rappel</option>
                                <option value="confirmed">Confirmé</option>
                                <option value="livre">Livrée</option>
                                <option value="retourne">Retournée</option>
                                <option value="cancelled">Annulé</option>
                              </select>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Page Non envoyées */}
          {confirmTab === 'non-envoyees' && (() => {
            const renderRow = (o: Order) => {
              const date = new Date(o.createdAt).toLocaleString('fr-FR')
              return (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white font-mono text-xs">{o.id}</td>
                  <td className="px-3 py-2 text-brand-muted text-xs">{date}</td>
                  <td className="px-3 py-2 text-white">{o.customerName}</td>
                  <td className="px-3 py-2 text-brand-muted text-xs">{o.phone}</td>
                  <td className="px-3 py-2 text-brand-accent font-semibold">{o.total} DA</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/5 text-xs text-white">{getStatusLabel(o.status)}</span>
                    {o.changeRequestedByAdmin && <span className="ml-1 inline-flex px-2 py-1 rounded-full bg-amber-500/25 text-amber-300 text-xs">Changer</span>}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button type="button" onClick={() => setSelectedOrder(o)} className="px-3 py-1 rounded-lg border border-white/15 text-xs text-white hover:bg-white/10">Détails</button>
                    <select value={o.status} onChange={(e) => handleStatusChange(o, e.target.value as Order['status'])} className="px-2 py-1 rounded-lg bg-brand-dark border border-white/15 text-xs text-white focus:border-brand-accent focus:outline-none">
                      <option value="none">Pas de statut</option>
                      <option value="tentative1">Tentative 1</option>
                      <option value="tentative2">Tentative 2</option>
                      <option value="tentative3">Tentative 3</option>
                      <option value="callback">Rappel</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="livre">Livrée</option>
                      <option value="retourne">Retournée</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </td>
                </tr>
              )
            }
            return (
              <>
                <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
                  <p className="text-brand-muted text-sm">Commandes confirmées sans envoi Yalidine.</p>
                  <div className="flex items-center gap-2">
                    <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-64 px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm placeholder-brand-muted focus:border-brand-accent focus:outline-none" placeholder="Rechercher..." />
                    {ordersToSendToYalidine.length > 0 && (
                      <button type="button" onClick={handleSendAllToYalidine} disabled={yalidineSendingAll} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        {yalidineSendingAll ? `Envoi… (${ordersToSendToYalidine.length})` : `Envoyer tout à Yalidine (${ordersToSendToYalidine.length})`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-brand-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Commande</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Client</th>
                        <th className="px-3 py-2 text-left">Téléphone</th>
                        <th className="px-3 py-2 text-left">Total</th>
                        <th className="px-3 py-2 text-left">Statut</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersNotSentYalidine.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-brand-muted text-sm">Aucune commande non envoyée.</td></tr>
                      ) : (
                        ordersNotSentYalidine.map(renderRow)
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}

          {/* Page Envoyées à Yalidine */}
          {confirmTab === 'envoyees' && (() => {
            const renderRow = (o: Order) => {
              const date = new Date(o.createdAt).toLocaleString('fr-FR')
              return (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white font-mono text-xs">{o.id}</td>
                  <td className="px-3 py-2 text-brand-muted text-xs">{date}</td>
                  <td className="px-3 py-2 text-white">{o.customerName}</td>
                  <td className="px-3 py-2 text-brand-muted text-xs">{o.phone}</td>
                  <td className="px-3 py-2 text-brand-accent font-semibold">{o.total} DA</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/5 text-xs text-white">{getStatusLabel(o.status)}</span>
                    {o.yalidineTracking && (
                      <a href={`https://www.yalidine.com/suivre-un-colis/?tracking=${encodeURIComponent(o.yalidineTracking)}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-emerald-400 text-xs hover:underline">{o.yalidineTracking}</a>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button type="button" onClick={() => setSelectedOrder(o)} className="px-3 py-1 rounded-lg border border-white/15 text-xs text-white hover:bg-white/10">Détails</button>
                    <select value={o.status} onChange={(e) => handleStatusChange(o, e.target.value as Order['status'])} className="px-2 py-1 rounded-lg bg-brand-dark border border-white/15 text-xs text-white focus:border-brand-accent focus:outline-none">
                      <option value="none">Pas de statut</option>
                      <option value="tentative1">Tentative 1</option>
                      <option value="tentative2">Tentative 2</option>
                      <option value="tentative3">Tentative 3</option>
                      <option value="callback">Rappel</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="livre">Livrée</option>
                      <option value="retourne">Retournée</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </td>
                </tr>
              )
            }
            return (
              <>
                <div className="flex justify-end mb-4">
                  <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-64 px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm placeholder-brand-muted focus:border-brand-accent focus:outline-none" placeholder="Rechercher..." />
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-brand-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Commande</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Client</th>
                        <th className="px-3 py-2 text-left">Téléphone</th>
                        <th className="px-3 py-2 text-left">Total</th>
                        <th className="px-3 py-2 text-left">Statut / Suivi</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersSentYalidine.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-brand-muted text-sm">Aucune commande envoyée à Yalidine.</td></tr>
                      ) : (
                        ordersSentYalidine.map(renderRow)
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </section>
      </main>
    </div>
  )
}


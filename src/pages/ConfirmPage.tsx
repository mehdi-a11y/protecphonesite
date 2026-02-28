import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, setOrderStatus, updateOrderYalidine, type Order } from '../types'
import { createParcelOnYalidine, syncOrdersWithYalidine } from '../yalidine'

type FilterStatus =
  | 'all'
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
  const [codeInput, setCodeInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [yalidineSending, setYalidineSending] = useState(false)
  const [yalidineMsg, setYalidineMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [yalidineSyncing, setYalidineSyncing] = useState(false)
  const [yalidineSyncMsg, setYalidineSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    getOrders().then(setOrders)
    syncOrdersWithYalidine().then((r) => {
      if (r.success && r.updated > 0) getOrders().then(setOrders)
    })
  }, [])

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

  const handleSendToYalidine = async (order: Order) => {
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

  const pendingCount = orders.filter(
    (o) =>
      o.status !== 'confirmed' &&
      o.status !== 'cancelled' &&
      o.status !== 'livre' &&
      o.status !== 'retourne',
  ).length
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (!searchText.trim()) return true
    const q = searchText.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-brand-muted hover:text-white text-sm">
          ← Retour au site
        </Link>
        <span className="text-brand-accent text-sm font-medium">Confirmation des commandes</span>
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

        {selectedOrder && (
          <section className="rounded-xl bg-brand-card border border-white/10 p-4 space-y-3">
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
                  ? `${selectedOrder.address} — Wilaya ${selectedOrder.wilaya}${selectedOrder.deliveryType ? ` (${selectedOrder.deliveryType === 'domicile' ? 'À domicile' : 'Bureau Yalidine'})` : ''}`
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
            {!selectedOrder.yalidineTracking && (
              <button
                type="button"
                onClick={() => handleSendToYalidine(selectedOrder)}
                disabled={yalidineSending}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
              >
                {yalidineSending ? 'Envoi vers Yalidine…' : 'Envoyer à Yalidine'}
              </button>
            )}

            <div className="pt-3 border-t border-white/10 space-y-1">
              <p className="text-sm text-brand-muted mb-1">Articles</p>
              {selectedOrder.items.map((item) => (
                <div
                  key={item.antichoc.id + (item.isUpsell ? '-upsell' : '')}
                  className="flex justify-between text-sm text-white"
                >
                  <span>
                    {item.antichoc.name}
                    {item.isUpsell ? ' (offre -50%)' : ''}
                  </span>
                  <span>{item.antichoc.price} DA</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-brand-accent mt-1">
                <span>Total</span>
                <span>{selectedOrder.total} DA</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <select
                value={selectedOrder.status}
                onChange={(e) =>
                  handleStatusChange(selectedOrder, e.target.value as Order['status'])
                }
                className="px-3 py-2 rounded-lg bg-brand-dark border border-white/10 text-xs text-white focus:border-brand-accent focus:outline-none"
              >
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

        {/* Tableau principal comme une plateforme de confirmation */}
        <section className="mt-8 space-y-4">
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
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'all'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('tentative1')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'tentative1'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Tentative 1
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('tentative2')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'tentative2'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Tentative 2
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('tentative3')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'tentative3'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Tentative 3
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('callback')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'callback'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Rappel
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('confirmed')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'confirmed'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Confirmé
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('livre')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'livre'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Livré
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('retourne')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'retourne'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Retourné
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('cancelled')}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filterStatus === 'cancelled'
                    ? 'bg-brand-accent text-brand-dark'
                    : 'bg-white/5 text-brand-muted hover:text-white'
                }`}
              >
                Annulé
              </button>
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
                  <th className="px-3 py-2 text-left">Confirmation</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-4 text-center text-brand-muted text-sm"
                    >
                      Aucune commande à afficher.
                    </td>
                  </tr>
                )}
                {filteredOrders.map((o) => {
                  const date = new Date(o.createdAt).toLocaleString('fr-FR')
                  return (
                    <tr key={o.id} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white font-mono text-xs">
                        {o.id}
                      </td>
                      <td className="px-3 py-2 text-brand-muted text-xs">
                        {date}
                      </td>
                      <td className="px-3 py-2 text-white">
                        {o.customerName}
                      </td>
                      <td className="px-3 py-2 text-brand-muted text-xs">
                        {o.phone}
                      </td>
                      <td className="px-3 py-2 text-brand-accent font-semibold">
                        {o.total} DA
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/5 text-xs text-white">
                          {getStatusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1 rounded-lg border border-white/15 text-xs text-white hover:bg-white/10"
                        >
                          Détails
                        </button>
                        <select
                          value={o.status}
                          onChange={(e) =>
                            handleStatusChange(o, e.target.value as Order['status'])
                          }
                          className="px-2 py-1 rounded-lg bg-brand-dark border border-white/15 text-xs text-white focus:border-brand-accent focus:outline-none"
                        >
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
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}


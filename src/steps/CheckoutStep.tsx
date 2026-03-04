import { useState, useMemo, useEffect } from 'react'
import { isVariantOrderable, formatOrderItemLabel } from '../data'
import { saveOrder } from '../types'
import type { CartItem } from '../types'
import type { IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import { WILAYAS, getDeliveryPriceForWilaya } from '../delivery'
import type { DeliveryType } from '../types'
import { apiGetYalidineStopdesks, apiGetCommunes, type YalidineStopdesk } from '../api'
import { trackPurchase, trackInitiateCheckout } from '../facebookPixel'

interface Props {
  cart: CartItem[]
  onBack: () => void
  onConfirm: (orderId: string, confirmationCode: string) => void
}

function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function CheckoutStep({ cart, onBack, onConfirm }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [communesLoading, setCommunesLoading] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile')
  const [stopdesks, setStopdesks] = useState<YalidineStopdesk[]>([])
  const [stopdesksLoading, setStopdesksLoading] = useState(false)
  const [selectedStopdeskId, setSelectedStopdeskId] = useState('')
  const [selectedStopdeskName, setSelectedStopdeskName] = useState('')
  const [selectedStopdeskCommune, setSelectedStopdeskCommune] = useState('')

  useEffect(() => {
    if (!wilaya) {
      setCommunes([])
      setCommune('')
      return
    }
    setCommunesLoading(true)
    setCommune('')
    let cancelled = false
    apiGetCommunes(wilaya)
      .then((list) => { if (!cancelled && list?.length) setCommunes(list) })
      .catch(() => { if (!cancelled) setCommunes([]) })
      .finally(() => { if (!cancelled) setCommunesLoading(false) })
    return () => { cancelled = true }
  }, [wilaya])

  useEffect(() => {
    if (deliveryType !== 'yalidine' || !wilaya) {
      setStopdesks([])
      setSelectedStopdeskId('')
      setSelectedStopdeskName('')
      setSelectedStopdeskCommune('')
      return
    }
    setStopdesksLoading(true)
    setSelectedStopdeskId('')
    setSelectedStopdeskName('')
    setSelectedStopdeskCommune('')

    let cancelled = false
    // Bureaux uniquement depuis l'API Yalidine pour que le stopdesk_id soit accepté à l'envoi
    apiGetYalidineStopdesks(wilaya, { onlyFromApi: true })
      .then((list) => {
        if (!cancelled && list && list.length > 0) setStopdesks(list)
      })
      .catch(() => { if (!cancelled) setStopdesks([]) })
      .finally(() => { if (!cancelled) setStopdesksLoading(false) })
    return () => { cancelled = true }
  }, [deliveryType, wilaya])

  const totalMain = cart.reduce((sum, i) => sum + i.antichoc.price, 0)
  const deliveryPrice = useMemo(
    () => (wilaya ? getDeliveryPriceForWilaya(wilaya, deliveryType) : 0),
    [wilaya, deliveryType],
  )
  const total = totalMain + deliveryPrice

  const canSubmitBureau =
    (deliveryType !== 'yalidine' || (selectedStopdeskId && selectedStopdeskName)) &&
    (deliveryType !== 'domicile' || !wilaya || commune.trim() !== '')

  const invalidCartItems = useMemo(() => {
    return cart.filter((item) => {
      if (item.isUpsell) return false
      const phoneId = item.selectedPhoneId
      const colorId = item.selectedColorId ?? ''
      if (!phoneId) return false
      return !isVariantOrderable(item.antichoc, colorId, phoneId)
    })
  }, [cart])
  const canSubmitOrder = canSubmitBureau && invalidCartItems.length === 0

  useEffect(() => {
    if (cart.length > 0) trackInitiateCheckout(total, 'DZD', cart.length)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitOrder) return
    const orderId = 'CMD-' + Date.now()
    const confirmationCode = generateConfirmationCode()
    const finalCart: CartItem[] = [...cart]
    await saveOrder({
      id: orderId,
      customerName: name,
      phone,
      address: deliveryType === 'domicile' ? commune.trim() : (deliveryType === 'yalidine' ? selectedStopdeskCommune : ''),
      wilaya,
      deliveryType,
      deliveryPrice,
      items: finalCart,
      total,
      status: 'none',
      createdAt: new Date().toISOString(),
      confirmationCode,
      ...(deliveryType === 'yalidine' && selectedStopdeskId
        ? { yalidineStopdeskId: selectedStopdeskId, yalidineStopdeskName: selectedStopdeskName }
        : {}),
    })
    trackPurchase(total, 'DZD', orderId, finalCart.map((i) => i.antichoc.id))
    onConfirm(orderId, confirmationCode)
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-32 animate-fade-in">
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="text-brand-muted hover:text-white mb-6"
        >
          ← Retour au panier
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">
          Finaliser la commande
        </h2>
        <p className="text-brand-muted mb-6">
          Paiement à la livraison (COD). Remplissez vos informations.
        </p>

        {/* Récap panier */}
        <div className="rounded-xl bg-brand-card border border-white/10 p-4 mb-6">
          <p className="text-sm text-brand-muted mb-2">Votre commande</p>
          {cart.map((item) => (
              <div key={item.antichoc.id + (item.selectedPhoneId ?? '') + (item.selectedColorId ?? '')} className="flex justify-between text-white">
                <span>{formatOrderItemLabel(item)}</span>
                <span>{item.antichoc.price} DA</span>
              </div>
            ))}
        </div>

        {invalidCartItems.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
            <p className="font-medium mb-1">Commande impossible</p>
            <p>Un ou plusieurs articles ne sont plus disponibles (stock épuisé et non disponible chez le fournisseur). Retournez au panier et retirez-les ou choisissez une autre variante.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nom complet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Téléphone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
              placeholder="06 12 34 56 78"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Wilaya</label>
            <select
              required
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
            >
              <option value="">Choisir une wilaya</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>
          {wilaya && deliveryType === 'domicile' && (
            <div>
              <label className="block text-sm text-brand-muted mb-1">Commune</label>
              <select
                required
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
              >
                <option value="">
                  {communesLoading ? 'Chargement des communes…' : communes.length === 0 ? 'Aucune commune' : 'Choisir une commune'}
                </option>
                {communes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-brand-muted mb-2">Choix de livraison</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryType"
                  checked={deliveryType === 'domicile'}
                  onChange={() => setDeliveryType('domicile')}
                  className="text-brand-accent focus:ring-brand-accent"
                />
                <span className="text-white">À domicile</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryType"
                  checked={deliveryType === 'yalidine'}
                  onChange={() => setDeliveryType('yalidine')}
                  className="text-brand-accent focus:ring-brand-accent"
                />
                <span className="text-white">Bureau Yalidine</span>
              </label>
            </div>
            {deliveryType === 'yalidine' && wilaya && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-white mb-1">
                  Choisir le bureau de retrait <span className="text-brand-muted font-normal">(obligatoire)</span>
                </label>
                <p className="text-xs text-brand-muted mb-2">
                  Sélectionnez le bureau Yalidine où vous voulez retirer votre colis.
                </p>
                <select
                  required={deliveryType === 'yalidine'}
                  value={selectedStopdeskId}
                  onChange={(e) => {
                    const value = e.target.value
                    const opt = e.target.options[e.target.selectedIndex]
                    const bureau = stopdesks.find((s) => String(s.id) === value)
                    setSelectedStopdeskId(value)
                    setSelectedStopdeskName(opt?.textContent ?? '')
                    setSelectedStopdeskCommune(bureau?.commune ?? '')
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                  aria-label="Choisir un bureau Yalidine"
                >
                  <option value="">
                    {stopdesksLoading ? 'Chargement des bureaux…' : stopdesks.length === 0 ? 'Aucun bureau pour cette wilaya' : 'Choisir un bureau'}
                  </option>
                  {stopdesks.map((s) => (
                    <option key={`${s.id}-${s.name}`} value={String(s.id)}>
                      {s.name}
                      {s.address ? ` — ${s.address}` : ''}
                    </option>
                  ))}
                </select>
                {!stopdesksLoading && stopdesks.length === 0 && wilaya && (
                  <p className="text-amber-400/90 text-xs mt-1">
                    Aucun bureau trouvé pour cette wilaya. Réessayez dans un instant ou choisissez une autre wilaya.
                  </p>
                )}
              </div>
            )}
            {wilaya && (
              <p className="text-brand-muted text-xs mt-1">
                Livraison : {deliveryPrice} DA
              </p>
            )}
          </div>

          <div className="pt-4 space-y-1">
            {deliveryPrice > 0 && (
              <div className="flex justify-between text-sm text-brand-muted">
                <span>Livraison ({deliveryType === 'domicile' ? 'à domicile' : 'Bureau Yalidine'})</span>
                <span>{deliveryPrice} DA</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-semibold text-white">
              <span>Total (paiement à la livraison)</span>
              <span className="text-brand-accent">{total} DA</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmitOrder}
            className="w-full py-4 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer la commande (COD)
          </button>
        </form>
      </div>
    </div>
  )
}

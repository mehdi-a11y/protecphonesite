import { useState, useMemo, useEffect } from 'react'
import { getAntichocsForPhone } from '../data'
import { IPHONE_MODELS, ANTICHOC_COLORS } from '../data'
import { saveOrder } from '../types'
import type { CartItem } from '../types'
import type { IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import { WILAYAS, getDeliveryPriceForWilaya } from '../delivery'
import type { DeliveryType } from '../types'
import { apiGetYalidineStopdesks, type YalidineStopdesk } from '../api'

const UPSELL_DISCOUNT = 0.5 // -50%

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
  const [address, setAddress] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile')
  const [stopdesks, setStopdesks] = useState<YalidineStopdesk[]>([])
  const [stopdesksLoading, setStopdesksLoading] = useState(false)
  const [selectedStopdeskId, setSelectedStopdeskId] = useState('')
  const [selectedStopdeskName, setSelectedStopdeskName] = useState('')
  const [acceptUpsell, setAcceptUpsell] = useState<Antichoc | null>(null)

  useEffect(() => {
    if (deliveryType !== 'yalidine' || !wilaya) {
      setStopdesks([])
      setSelectedStopdeskId('')
      setSelectedStopdeskName('')
      return
    }
    setStopdesksLoading(true)
    setSelectedStopdeskId('')
    setSelectedStopdeskName('')
    apiGetYalidineStopdesks(wilaya)
      .then((list) => setStopdesks(list))
      .catch(() => setStopdesks([]))
      .finally(() => setStopdesksLoading(false))
  }, [deliveryType, wilaya])

  const mainItem = cart[0]
  const phoneId = mainItem?.antichoc.compatibleWith[0] as IPhoneModelId | undefined
  const upsellCandidates = phoneId
    ? getAntichocsForPhone(phoneId).filter((a) => a.id !== mainItem?.antichoc.id)
    : []
  const upsellOffer = upsellCandidates[0] ?? null
  const upsellPrice = upsellOffer ? Math.round(upsellOffer.price * (1 - UPSELL_DISCOUNT)) : 0

  const totalMain = cart.reduce((sum, i) => sum + (i.isUpsell ? 0 : i.antichoc.price), 0)
  const totalUpsell = acceptUpsell ? upsellPrice : 0
  const deliveryPrice = useMemo(
    () => (wilaya ? getDeliveryPriceForWilaya(wilaya, deliveryType) : 0),
    [wilaya, deliveryType],
  )
  const total = totalMain + totalUpsell + deliveryPrice

  const canSubmitBureau = deliveryType !== 'yalidine' || (selectedStopdeskId && selectedStopdeskName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitBureau) return
    const orderId = 'CMD-' + Date.now()
    const confirmationCode = generateConfirmationCode()
    const finalCart: CartItem[] = [
      ...cart,
      ...(acceptUpsell ? [{ antichoc: acceptUpsell, isUpsell: true }] : []),
    ]
    await saveOrder({
      id: orderId,
      customerName: name,
      phone,
      address,
      wilaya,
      deliveryType,
      deliveryPrice,
      items: finalCart,
      total,
      status: 'tentative1',
      createdAt: new Date().toISOString(),
      confirmationCode,
      ...(deliveryType === 'yalidine' && selectedStopdeskId
        ? { yalidineStopdeskId: selectedStopdeskId, yalidineStopdeskName: selectedStopdeskName }
        : {}),
    })
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
          {cart.map((item) => {
            const phoneName = item.selectedPhoneId
              ? IPHONE_MODELS.find((m) => m.id === item.selectedPhoneId)?.name ?? item.selectedPhoneId
              : null
            const colorName = item.selectedColorId
              ? ANTICHOC_COLORS.find((c) => c.id === item.selectedColorId)?.name ?? item.selectedColorId
              : null
            return (
              <div key={item.antichoc.id + (item.isUpsell ? '-upsell' : '')} className="flex justify-between text-white">
                <span>
                  {item.antichoc.name}
                  {(phoneName || colorName) && (
                    <span className="block text-xs text-brand-muted font-normal mt-0.5">
                      {[phoneName, colorName].filter(Boolean).join(' — ')}
                    </span>
                  )}
                </span>
                <span>{item.antichoc.price} DA</span>
              </div>
            )
          })}
          {acceptUpsell && upsellOffer && (
            <div className="flex justify-between text-brand-gold mt-2 pt-2 border-t border-white/10">
              <span>{upsellOffer.name} (offre -50%)</span>
              <span>{upsellPrice} DA</span>
            </div>
          )}
        </div>

        {/* Upsell -50% */}
          {upsellOffer && (
          <div className="rounded-xl border-2 border-brand-gold/50 bg-brand-gold/5 p-4 mb-6">
            <p className="text-brand-gold font-semibold mb-2">
              🎁 Offre spéciale : 2ème antichoc à -50%
            </p>
            <p className="text-white text-sm mb-3">
              Ajoutez « {upsellOffer.name} » pour seulement {upsellPrice} DA (au lieu de {upsellOffer.price} DA).
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAcceptUpsell(acceptUpsell ? null : upsellOffer)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  acceptUpsell ? 'bg-brand-accent text-brand-dark' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Oui, j’en profite
              </button>
              <button
                type="button"
                onClick={() => setAcceptUpsell(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-brand-muted hover:bg-white/20"
              >
                Non merci
              </button>
            </div>
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
          <div>
            <label className="block text-sm text-brand-muted mb-1">Adresse</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted focus:border-brand-accent focus:outline-none"
              placeholder="Rue, quartier, commune..."
            />
          </div>
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
                <label className="block text-sm text-brand-muted mb-1">Bureau Yalidine (obligatoire)</label>
                <select
                  required={deliveryType === 'yalidine'}
                  value={selectedStopdeskId}
                  onChange={(e) => {
                    const opt = e.target.options[e.target.selectedIndex]
                    setSelectedStopdeskId(e.target.value)
                    setSelectedStopdeskName(opt?.textContent ?? '')
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                >
                  <option value="">
                    {stopdesksLoading ? 'Chargement des bureaux…' : 'Choisir un bureau'}
                  </option>
                  {stopdesks.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                      {s.address ? ` — ${s.address}` : ''}
                    </option>
                  ))}
                </select>
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
            disabled={!canSubmitBureau}
            className="w-full py-4 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer la commande (COD)
          </button>
        </form>
      </div>
    </div>
  )
}

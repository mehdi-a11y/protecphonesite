import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAntichocsForPhone } from '../data'
import { ANTICHOC_COLORS } from '../data'
import type { IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import type { CartItem } from '../types'
import { trackAddToCart } from '../facebookPixel'

interface Props {
  phoneId: IPhoneModelId
  cart: CartItem[]
  onBack: () => void
  onAddToCart: (item: CartItem) => void
  onCheckout: () => void
}

export function ProductsStep({ phoneId, cart, onBack, onAddToCart, onCheckout }: Props) {
  const products = getAntichocsForPhone(phoneId)
  const [selected, setSelected] = useState<Antichoc | null>(null)
  const [selectedColorId, setSelectedColorId] = useState<string>('')
  const [addedFeedback, setAddedFeedback] = useState(false)

  const colorOptions = useMemo(() => {
    if (!selected || !selected.colorIds?.length) return []
    return selected.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [selected])

  useEffect(() => {
    if (selected && colorOptions.length === 1) setSelectedColorId(colorOptions[0].id)
    else if (selected && (colorOptions.length > 1 || colorOptions.length === 0)) setSelectedColorId('')
  }, [selected?.id, colorOptions.length])

  const canAddToCart = selected && (colorOptions.length === 0 || colorOptions.length === 1 || selectedColorId !== '')

  const handleAddToCart = () => {
    if (!selected || !canAddToCart) return
    const colorId = colorOptions.length === 1 ? colorOptions[0].id : colorOptions.length > 1 ? selectedColorId : undefined
    onAddToCart({
      antichoc: selected,
      selectedPhoneId: phoneId,
      ...(colorId ? { selectedColorId: colorId } : {}),
    })
    trackAddToCart(selected.name, [selected.id], selected.price, 'DZD')
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 1500)
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-24 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="text-brand-muted hover:text-white mb-6 flex items-center gap-2 transition-colors"
        >
          ← Changer de modèle
        </button>
        <h2 className="text-2xl font-bold text-white mb-2">
          Choisissez votre antichoc
        </h2>
        <p className="text-brand-muted mb-8">
          {products.length} modèles disponibles pour votre iPhone.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={`rounded-xl border-2 p-4 transition-all duration-200 text-left ${
                selected?.id === p.id
                  ? 'border-brand-accent bg-brand-accent/10'
                  : 'border-white/10 bg-brand-card hover:border-white/20'
              }`}
            >
              <div className="mb-2 flex items-center justify-center">
                {(p.photoGallery?.[0] ?? p.photoUrl) ? (
                  <img
                    src={p.photoGallery?.[0] ?? p.photoUrl}
                    alt={p.name}
                    className="w-20 h-20 object-cover rounded-md border border-white/10"
                  />
                ) : (
                  <div className="text-3xl">{p.image}</div>
                )}
              </div>
              <div className="font-medium text-white text-sm mb-1">
                {p.name}
              </div>
              <p className="text-xs text-brand-muted line-clamp-3">
                {p.description}
              </p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-brand-accent font-semibold">{p.price} DA</span>
                <Link
                  to={`/product/${p.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-brand-muted hover:text-brand-accent"
                >
                  Voir la fiche →
                </Link>
              </div>
            </button>
          ))}
        </div>
        {(selected || cart.length > 0) ? (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-dark/95 border-t border-white/10 animate-slide-up">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {selected && colorOptions.length > 1 ? (
                <div>
                  <label className="block text-xs text-brand-muted mb-1">Couleur (obligatoire)</label>
                  <select
                    value={selectedColorId}
                    onChange={(e) => setSelectedColorId(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 rounded-lg bg-brand-card border border-white/10 text-white text-sm focus:border-brand-accent focus:outline-none"
                  >
                    <option value="">Choisir une couleur</option>
                    {colorOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {selected ? (
                    <p className="text-white truncate">
                      <span className="text-brand-muted">Sélection :</span>{' '}
                      {selected.name} — {selected.price} DA
                      {colorOptions.length === 1 ? (
                        <span className="text-brand-muted text-sm"> — {colorOptions[0].name}</span>
                      ) : null}
                    </p>
                  ) : null}
                  {cart.length > 0 ? (
                    <p className="text-brand-muted text-sm mt-0.5">
                      Panier : {cart.length} article{cart.length > 1 ? 's' : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {selected ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!canAddToCart}
                      className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        addedFeedback
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-brand-accent text-brand-dark hover:bg-brand-accentDim'
                      }`}
                    >
                      {addedFeedback ? '✓ Ajouté !' : 'Ajouter au panier'}
                    </button>
                  ) : null}
                  {cart.length > 0 ? (
                    <button
                      type="button"
                      onClick={onCheckout}
                      className="flex-1 sm:flex-none px-5 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 border border-white/20 transition-colors"
                    >
                      Voir le panier ({cart.length}) →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

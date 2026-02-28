import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAntichocsForPhone } from '../data'
import { ANTICHOC_COLORS } from '../data'
import type { IPhoneModelId } from '../data'
import type { Antichoc } from '../data'
import type { CartItem } from '../types'
import { trackAddToCart } from '../facebookPixel'

const MAX_SWATCHES = 4 // nombre de pastilles visibles avant "+ N"

interface Props {
  phoneId: IPhoneModelId
  cart: CartItem[]
  onBack: () => void
  onAddToCart: (item: CartItem) => void
  onCheckout: () => void
}

export function ProductsStep({ phoneId, cart, onBack, onAddToCart, onCheckout }: Props) {
  const products = getAntichocsForPhone(phoneId)
  const [selectedColorByProductId, setSelectedColorByProductId] = useState<Record<string, string>>({})
  const [addedProductId, setAddedProductId] = useState<string | null>(null)

  const getColorOptions = (p: Antichoc) =>
    (p.colorIds?.length
      ? p.colorIds
          .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
          .filter((c): c is NonNullable<typeof c> => c != null)
      : []) as Array<{ id: string; name: string; emoji: string; hex: string }>

  const canAddProduct = (p: Antichoc) => {
    const colors = getColorOptions(p)
    if (colors.length <= 1) return true
    return !!selectedColorByProductId[p.id]
  }

  const handleAdd = (p: Antichoc) => {
    const colors = getColorOptions(p)
    const colorId = colors.length === 1 ? colors[0].id : colors.length > 1 ? selectedColorByProductId[p.id] : undefined
    if (colors.length > 1 && !colorId) return
    onAddToCart({
      antichoc: p,
      selectedPhoneId: phoneId,
      ...(colorId ? { selectedColorId: colorId } : {}),
    })
    trackAddToCart(p.name, [p.id], p.price, 'DZD')
    setAddedProductId(p.id)
    setTimeout(() => setAddedProductId(null), 1500)
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-28 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="text-brand-muted hover:text-white mb-6 flex items-center gap-2 transition-colors text-sm"
        >
          ← Changer de modèle
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">
          Choisissez votre antichoc
        </h2>
        <p className="text-brand-muted text-sm mb-8">
          {products.length} modèles disponibles pour votre iPhone.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const colors = getColorOptions(p)
            const selectedColorId = selectedColorByProductId[p.id]
            const added = addedProductId === p.id
            const canAdd = canAddProduct(p)
            const photo = p.photoGallery?.[0] ?? p.photoUrl
            const visibleSwatches = colors.slice(0, MAX_SWATCHES)
            const moreCount = colors.length > MAX_SWATCHES ? colors.length - MAX_SWATCHES : 0

            return (
              <article
                key={p.id}
                className="rounded-2xl bg-brand-card border border-white/10 overflow-hidden flex flex-col"
              >
                {/* Image */}
                <Link
                  to={`/product/${p.id}`}
                  className="block aspect-[4/5] bg-brand-dark overflow-hidden"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={p.name}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      {p.image}
                    </div>
                  )}
                </Link>

                <div className="p-4 flex flex-col flex-1">
                  {/* Label + Wishlist */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">
                      ProtecPhone
                    </span>
                    <button
                      type="button"
                      className="p-1 text-brand-muted hover:text-white transition-colors"
                      aria-label="Favoris"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Titre */}
                  <Link to={`/product/${p.id}`} className="group">
                    <h3 className="font-semibold text-white text-sm leading-tight mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">
                      {p.name}
                    </h3>
                  </Link>

                  {/* Note (placeholder style e-commerce) */}
                  <div className="flex items-center gap-1.5 mb-2 text-amber-400">
                    <span className="flex" aria-hidden>
                      {'★★★★★'.split('').map((_, i) => (
                        <span key={i} className="text-xs">★</span>
                      ))}
                    </span>
                    <span className="text-xs text-brand-muted">(Avis)</span>
                  </div>

                  {/* Pastilles couleurs */}
                  {colors.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {visibleSwatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedColorByProductId((prev) => ({ ...prev, [p.id]: c.id }))}
                          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${
                            selectedColorId === c.id
                              ? 'border-white ring-2 ring-brand-accent/50 scale-110'
                              : 'border-white/30 hover:border-white/50'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                          aria-label={c.name}
                        />
                      ))}
                      {moreCount > 0 && (
                        <span className="text-xs text-brand-muted">+{moreCount}</span>
                      )}
                    </div>
                  )}

                  {/* Prix */}
                  <p className="text-brand-accent font-semibold text-lg mb-4 mt-auto">
                    {p.price.toLocaleString('fr-FR')} DA
                  </p>

                  {/* Bouton Ajouter */}
                  <button
                    type="button"
                    onClick={() => handleAdd(p)}
                    disabled={!canAdd}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      added
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-white text-black hover:bg-neutral-200 border border-transparent'
                    }`}
                  >
                    {added ? (
                      '✓ Ajouté'
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {/* Barre panier en bas */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-dark/95 border-t border-white/10 animate-slide-up">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <p className="text-brand-muted text-sm">
                Panier : {cart.length} article{cart.length > 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={onCheckout}
                className="px-6 py-3 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-colors"
              >
                Voir le panier ({cart.length}) →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

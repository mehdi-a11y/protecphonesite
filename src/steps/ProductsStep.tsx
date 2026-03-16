import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { loadProducts, getAntichocsForPhone, getAntichocsForSamsung, SAMSUNG_ULTRA_MODELS } from '../data'
import { ANTICHOC_COLORS } from '../data'
import type { Antichoc } from '../data'
import type { CartItem } from '../types'

const MAX_SWATCHES = 4 // nombre de pastilles visibles avant "+ N"

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** modelId = iPhone ou Samsung (ex: iphone-14, s24-ultra) */
interface Props {
  modelId: string
  cart: CartItem[]
  onBack: () => void
  onAddToCart: (item: CartItem) => void
  onCheckout: () => void
}

export function ProductsStep({ modelId, cart, onBack, onAddToCart, onCheckout }: Props) {
  const [products, setProducts] = useState<Antichoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedColorByProductId, setSelectedColorByProductId] = useState<Record<string, string>>({})
  const isSamsung = SAMSUNG_ULTRA_MODELS.some((m) => m.id === modelId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadProducts()
      .then(() => {
        if (!cancelled) {
          const list = isSamsung ? getAntichocsForSamsung(modelId) : getAntichocsForPhone(modelId)
          setProducts(shuffleArray(list))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const list = isSamsung ? getAntichocsForSamsung(modelId) : getAntichocsForPhone(modelId)
          setProducts(shuffleArray(list))
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [modelId, isSamsung])

  const getColorOptions = (p: Antichoc) =>
    (p.colorIds?.length
      ? p.colorIds
          .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
          .filter((c): c is NonNullable<typeof c> => c != null)
      : []) as Array<{ id: string; name: string; emoji: string; hex: string }>

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
          {loading ? 'Chargement des modèles…' : `${products.length} modèles disponibles pour votre iPhone.`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" aria-hidden />
            <span className="sr-only">Chargement</span>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map((p) => {
            const colors = getColorOptions(p)
            const selectedColorId = selectedColorByProductId[p.id]
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
                      loading="lazy"
                      decoding="async"
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
                </div>
              </article>
            )
          })}
        </div>
        )}

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

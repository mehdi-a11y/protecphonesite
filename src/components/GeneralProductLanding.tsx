import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Antichoc } from '../data'
import { ANTICHOC_COLORS, GENERAL_MODEL_ID, isVariantOrderable } from '../data'
import { trackViewContent } from '../facebookPixel'
import { trackTikTokViewContent } from '../tiktokPixel'

interface Props {
  product: Antichoc
  title?: string | null
  /** (selectedColorId, quantity) */
  onCommander: (selectedColorId: string, quantity: number) => void
}

const MAX_QUANTITY = 5

/**
 * Landing page d'un produit général (hors téléphonie) : pas de choix de modèle, pas de marque ProtecPhone.
 * La commande passe ensuite par le même CheckoutStep que les coques (mêmes commandes / confirmateur / admin).
 */
export function GeneralProductLanding({ product, title, onCommander }: Props) {
  const landing = product.landing ?? {}
  const displayTitle = title ?? product.name
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedColorId, setSelectedColorId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [hint, setHint] = useState('')

  const colorOptions = useMemo(() => {
    if (!product.colorIds?.length) return []
    return product.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [product.colorIds])

  const orderableColorIds = useMemo(() => {
    const ids = (product.colorIds?.length ? product.colorIds : ['']) as string[]
    return new Set(ids.filter((cid) => isVariantOrderable(product, cid, GENERAL_MODEL_ID)))
  }, [product])

  useEffect(() => {
    setSelectedImageIndex(0)
    setQuantity(1)
    setHint('')
    const firstOrderable = colorOptions.find((c) => orderableColorIds.has(c.id))
    setSelectedColorId(colorOptions.length === 1 && firstOrderable ? firstOrderable.id : '')
  }, [product.id, colorOptions, orderableColorIds])

  useEffect(() => {
    try {
      trackViewContent(product.name, [product.id], product.price, 'DZD')
      trackTikTokViewContent(product.name, [product.id], product.price, 'DZD')
    } catch {
      // ignore pixel errors
    }
  }, [product.id, product.name, product.price])

  const photos = product.photoGallery?.length ? product.photoGallery : product.photoUrl ? [product.photoUrl] : []
  const mainPhoto = photos[selectedImageIndex] ?? photos[0]
  const available = orderableColorIds.size > 0
  const oldPrice = landing.oldPrice && landing.oldPrice > product.price ? landing.oldPrice : 0
  const discount = oldPrice ? Math.round((1 - product.price / oldPrice) * 100) : 0
  const benefits = (landing.benefits ?? []).map((b) => b.trim()).filter(Boolean)
  const ctaText = landing.ctaText?.trim() || 'Commander maintenant'
  const total = product.price * quantity

  const handleCommander = () => {
    if (!available) {
      setHint('Produit momentanément indisponible.')
      return
    }
    if (colorOptions.length > 0 && !selectedColorId) {
      setHint('Choisissez une couleur.')
      document.getElementById('choix-couleur')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!isVariantOrderable(product, selectedColorId, GENERAL_MODEL_ID)) {
      setHint('Cette couleur n’est pas disponible.')
      return
    }
    setHint('')
    onCommander(selectedColorId, quantity)
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      <div className="bg-brand-topbar text-neutral-800 text-center py-2 px-4 text-xs sm:text-sm font-medium">
        Livraison 58 wilayas · Paiement à la livraison
      </div>
      {landing.brandName && (
        <header className="border-b border-white/10 px-4 h-12 flex items-center justify-center">
          <span className="text-white font-bold text-lg tracking-tight">{landing.brandName}</span>
        </header>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Galerie */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl bg-brand-card border border-white/10 overflow-hidden">
              {mainPhoto ? (
                <img src={mainPhoto} alt={displayTitle} fetchPriority="high" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">{product.image}</div>
              )}
              {discount > 0 && (
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold">
                  -{discount}%
                </span>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden focus:outline-none transition-colors ${
                      selectedImageIndex === i ? 'border-brand-accent ring-2 ring-brand-accent/30' : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos + achat */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{displayTitle}</h1>
            {landing.subtitle && <p className="text-brand-muted mb-3">{landing.subtitle}</p>}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-brand-accent">{product.price.toLocaleString('fr-FR')} DA</span>
              {oldPrice > 0 && (
                <span className="text-lg text-brand-muted line-through">{oldPrice.toLocaleString('fr-FR')} DA</span>
              )}
            </div>

            {benefits.length > 0 && (
              <ul className="mb-6 space-y-2">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-white text-sm">
                    <span className="text-brand-accent mt-0.5">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {!available ? (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
                Ce produit est momentanément indisponible.
              </div>
            ) : (
              <>
                {colorOptions.length > 0 && (
                  <div id="choix-couleur" className="mb-6">
                    <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                      Couleur <span className="text-red-400">*</span>
                      {selectedColorId && (
                        <span className="normal-case text-white ml-2">
                          {colorOptions.find((c) => c.id === selectedColorId)?.name}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => {
                        const orderable = orderableColorIds.has(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => orderable && setSelectedColorId(c.id)}
                            disabled={!orderable}
                            className={`w-9 h-9 rounded-full border-2 transition-all shrink-0 ${
                              selectedColorId === c.id
                                ? 'border-white ring-2 ring-brand-accent/50'
                                : orderable
                                  ? 'border-white/30 hover:border-white/50'
                                  : 'border-white/10 opacity-50 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={orderable ? c.name : `${c.name} — Indisponible`}
                            aria-label={orderable ? c.name : `${c.name} (indisponible)`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">Quantité</label>
                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-brand-card">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-11 h-11 text-white text-xl hover:bg-white/10 rounded-l-xl"
                      aria-label="Diminuer la quantité"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-white font-semibold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                      className="w-11 h-11 text-white text-xl hover:bg-white/10 rounded-r-xl"
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommander}
                  className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg border-2 border-black hover:bg-neutral-200 transition-colors"
                >
                  {ctaText} — {total.toLocaleString('fr-FR')} DA
                </button>
                {hint && <p className="mt-2 text-amber-300 text-sm">{hint}</p>}
              </>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-brand-muted">
              <div className="rounded-xl bg-brand-card border border-white/10 p-3">
                <div className="text-xl mb-1">💵</div>Paiement à la livraison
              </div>
              <div className="rounded-xl bg-brand-card border border-white/10 p-3">
                <div className="text-xl mb-1">🚚</div>Livraison 58 wilayas
              </div>
              <div className="rounded-xl bg-brand-card border border-white/10 p-3">
                <div className="text-xl mb-1">📞</div>Confirmation par téléphone
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-12 pt-8 border-t border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
            <p className="text-brand-muted text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
          </section>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-brand-muted">
        {landing.brandName && <p className="mb-1">© {new Date().getFullYear()} {landing.brandName}</p>}
        <Link to="/confidentialite" className="hover:text-white">Politique de confidentialité</Link>
      </footer>

      {/* Barre fixe de commande */}
      {available && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-brand-dark/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-brand-muted truncate">{displayTitle}</p>
              <p className="text-sm font-semibold text-white">{total.toLocaleString('fr-FR')} DA</p>
            </div>
            <button
              type="button"
              onClick={handleCommander}
              className="px-5 py-3 rounded-xl font-semibold border-2 bg-white text-black border-black hover:bg-neutral-200 transition-colors"
            >
              {ctaText}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

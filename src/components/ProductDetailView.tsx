import { useState, useMemo, useEffect } from 'react'
import type { Antichoc } from '../data'
import type { IPhoneModelId } from '../data'
import { IPHONE_MODELS, ANTICHOC_COLORS } from '../data'
import { trackViewContent } from '../facebookPixel'

interface Props {
  product: Antichoc
  title?: string | null
  onCommander: (selectedPhoneId: IPhoneModelId, selectedColorId: string) => void
  backLink?: React.ReactNode
}

export function ProductDetailView({ product, title, onCommander, backLink }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const phoneOptions = useMemo(
    () =>
      (product.compatibleWith?.length ? product.compatibleWith : IPHONE_MODELS.map((m) => m.id)).map(
        (id) => IPHONE_MODELS.find((m) => m.id === id)!.id,
      ) as IPhoneModelId[],
    [product.compatibleWith],
  )
  const colorOptions = useMemo(() => {
    if (!product.colorIds?.length) return []
    return product.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter(Boolean) as { id: string; name: string; emoji: string }[]
  }, [product.colorIds])
  const [selectedPhoneId, setSelectedPhoneId] = useState<IPhoneModelId | ''>(
    phoneOptions.length === 1 ? phoneOptions[0] : '',
  )
  const [selectedColorId, setSelectedColorId] = useState<string>(
    colorOptions.length === 1 ? colorOptions[0].id : '',
  )

  const photos =
    product.photoGallery?.length ? product.photoGallery : product.photoUrl ? [product.photoUrl] : []
  const mainPhoto = photos[selectedImageIndex] ?? photos[0]
  const selectedColors = (product.colorIds || []).map((id) =>
    ANTICHOC_COLORS.find((c) => c.id === id),
  ).filter(Boolean)

  const canCommander =
    selectedPhoneId !== '' && (colorOptions.length === 0 || selectedColorId !== '')

  useEffect(() => {
    trackViewContent(product.name, [product.id], product.price, 'DZD')
  }, [product.id, product.name, product.price])

  const handleCommander = () => {
    if (!selectedPhoneId) return
    if (colorOptions.length > 0 && !selectedColorId) return
    onCommander(selectedPhoneId, colorOptions.length >= 1 ? selectedColorId : '')
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {backLink && (
        <header className="border-b border-white/10 px-4 py-3">
          <div className="max-w-6xl mx-auto">{backLink}</div>
        </header>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Galerie type Shopify */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl bg-brand-card border border-white/10 overflow-hidden">
              {mainPhoto ? (
                <img
                  src={mainPhoto}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  {product.image}
                </div>
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
                      selectedImageIndex === i
                        ? 'border-brand-accent ring-2 ring-brand-accent/30'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos produit */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
              {title ?? product.name}
            </h1>
            <p className="text-3xl font-bold text-brand-accent mb-6">{product.price} DA</p>

            {product.description && (
              <p className="text-brand-muted text-sm sm:text-base mb-6 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Choix iPhone (obligatoire) */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                Votre modèle iPhone <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedPhoneId}
                onChange={(e) => setSelectedPhoneId(e.target.value as IPhoneModelId)}
                required
                className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
              >
                <option value="">Choisir un modèle</option>
                {phoneOptions.map((id) => {
                  const model = IPHONE_MODELS.find((m) => m.id === id)
                  return (
                    <option key={id} value={id}>
                      {model?.name ?? id}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Choix couleur (uniquement si le produit a des couleurs définies) */}
            {colorOptions.length > 0 ? (
              <div className="mb-6">
                <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                  Couleur <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedColorId}
                  onChange={(e) => setSelectedColorId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
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

            <button
              type="button"
              onClick={handleCommander}
              disabled={!canCommander}
              className="w-full py-4 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-all duration-200 shadow-lg shadow-brand-accent/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Commander maintenant
            </button>

            <div className="mt-6 flex flex-col gap-2 text-sm text-brand-muted">
              <p className="flex items-center gap-2">
                <span className="text-brand-accent">✓</span> Paiement à la livraison (COD)
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-accent">✓</span> Livraison partout en Algérie
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-accent">✓</span> Protection antichoc qualité
              </p>
            </div>
          </div>
        </div>

        {/* Description complète (section en dessous) */}
        {product.description && product.description.length > 120 && (
          <section className="mt-12 pt-8 border-t border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
            <p className="text-brand-muted text-sm leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

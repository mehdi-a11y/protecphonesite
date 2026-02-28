import { useState, useMemo, useEffect } from 'react'
import type { Antichoc } from '../data'
import type { IPhoneModelId } from '../data'
import { IPHONE_MODELS, ANTICHOC_COLORS, SCREEN_PROTECTOR_UPSELL } from '../data'
import { trackViewContent } from '../facebookPixel'

const UPSELL_DISCOUNT = 0.5

interface Props {
  product: Antichoc
  title?: string | null
  /** (selectedPhoneId, selectedColorId, addUpsellScreenProtector) */
  onCommander: (selectedPhoneId: IPhoneModelId, selectedColorId: string, addUpsellScreenProtector: boolean) => void
  backLink?: React.ReactNode
}

export function ProductDetailView({ product, title, onCommander, backLink }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [addScreenProtector, setAddScreenProtector] = useState(false)

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
      .filter((c): c is NonNullable<typeof c> => c != null)
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
  const screenProtectorPromoPrice = Math.round(SCREEN_PROTECTOR_UPSELL.price * (1 - UPSELL_DISCOUNT))

  const canCommander =
    selectedPhoneId !== '' && (colorOptions.length === 0 || selectedColorId !== '')

  useEffect(() => {
    trackViewContent(product.name, [product.id], product.price, 'DZD')
  }, [product.id, product.name, product.price])

  const handleCommander = () => {
    if (!selectedPhoneId) return
    if (colorOptions.length > 0 && !selectedColorId) return
    onCommander(selectedPhoneId, colorOptions.length >= 1 ? selectedColorId : '', addScreenProtector)
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
          {/* Colonne gauche : galerie */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl bg-brand-card border border-white/10 overflow-hidden">
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
              <div className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white/80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
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

          {/* Colonne droite : infos + achat */}
          <div>
            <p className="text-xs font-medium text-brand-muted uppercase tracking-wider mb-1">
              ProtecPhone
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
              {title ?? product.name}
            </h1>
            <p className="text-2xl font-bold text-brand-accent mb-2">
              {product.price.toLocaleString('fr-FR')} DA
            </p>
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <span className="flex" aria-hidden>
                {'★★★★★'.split('').map((_, i) => (
                  <span key={i} className="text-sm">★</span>
                ))}
              </span>
              <span className="text-sm text-brand-muted">(Avis)</span>
            </div>

            {product.description && (
              <p className="text-brand-muted text-sm mb-6 leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Votre appareil */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                Votre appareil <span className="text-red-400">*</span>
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

            {/* Couleur : pastilles */}
            {colorOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                  Couleur <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColorId(c.id)}
                      className={`w-9 h-9 rounded-full border-2 transition-all shrink-0 ${
                        selectedColorId === c.id
                          ? 'border-white ring-2 ring-brand-accent/50'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: (c as { hex: string }).hex ?? '#444' }}
                      title={c.name}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCommander}
              disabled={!canCommander}
              className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all duration-200 border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
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

            {/* Upsell : Protecteur d'écran incassable */}
            <section className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Économisez avec les accessoires
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                  Best seller
                </span>
              </div>
              <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4">
                <label className="flex gap-4 cursor-pointer group">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-brand-card border border-white/10 flex items-center justify-center text-2xl">
                    {SCREEN_PROTECTOR_UPSELL.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white group-hover:text-brand-accent transition-colors">
                      {SCREEN_PROTECTOR_UPSELL.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-brand-muted line-through text-sm">
                        {SCREEN_PROTECTOR_UPSELL.price} DA
                      </span>
                      <span className="text-brand-accent font-semibold">
                        {screenProtectorPromoPrice} DA
                      </span>
                      <span className="text-amber-400 text-xs">(offre -50%)</span>
                    </div>
                    <p className="text-xs text-brand-muted mt-1">
                      Verre trempé, résistant aux chocs. Compatible avec votre modèle.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={addScreenProtector}
                    onChange={(e) => setAddScreenProtector(e.target.checked)}
                    className="mt-2 w-5 h-5 rounded border-white/30 text-brand-accent focus:ring-brand-accent"
                  />
                </label>
                <p className="text-xs text-brand-muted mt-2">
                  Cochez pour ajouter à votre commande au prix promo.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Description complète */}
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

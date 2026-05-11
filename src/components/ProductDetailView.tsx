import { useState, useMemo, useEffect } from 'react'
import type { Antichoc } from '../data'
import { IPHONE_MODELS, SAMSUNG_ULTRA_MODELS, ANTICHOC_COLORS, isVariantOrderable, hasOrderableVariantForPhone, hasOrderableVariantForSamsung } from '../data'
import { getScreenProtectorUpsell } from '../data-screen-protector'
import { trackViewContent } from '../facebookPixel'
import { trackTikTokViewContent } from '../tiktokPixel'

interface Props {
  product: Antichoc
  title?: string | null
  initialSelectedModelId?: string | null
  lockModelSelection?: boolean
  /** (selectedModelId, selectedColorId, addUpsellScreenProtector, addUpsellSmartFold, addUpsellNanoPop, addUpsellCardHolder) */
  onCommander: (
    selectedModelId: string,
    selectedColorId: string,
    addUpsellScreenProtector: boolean,
    addUpsellSmartFold: boolean,
    addUpsellNanoPop: boolean,
    addUpsellCardHolder: boolean,
  ) => void
  backLink?: React.ReactNode
}

export function ProductDetailView({
  product,
  title,
  initialSelectedModelId,
  lockModelSelection = false,
  onCommander,
  backLink,
}: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [addScreenProtector, setAddScreenProtector] = useState(false)
  const [commanderHint, setCommanderHint] = useState<string>('')
  const screenProtectorUpsell = useMemo(() => getScreenProtectorUpsell(), [])

  const modelOptions = useMemo(() => {
    if (product.deviceType === 'samsung') {
      const all = product.compatibleWithSamsung?.length ? product.compatibleWithSamsung : SAMSUNG_ULTRA_MODELS.map((m) => m.id)
      return all.filter((id) => hasOrderableVariantForSamsung(product, id))
    }
    const all = product.compatibleWith?.length ? product.compatibleWith : IPHONE_MODELS.map((m) => m.id)
    return all.filter((id) => hasOrderableVariantForPhone(product, id))
  }, [product])
  const colorOptions = useMemo(() => {
    if (!product.colorIds?.length) return []
    return product.colorIds
      .map((id) => ANTICHOC_COLORS.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
  }, [product.colorIds])

  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('')
  const [selectedColorId, setSelectedColorId] = useState<string>('')

  const orderableColorIdsForSelectedPhone = useMemo(() => {
    if (!selectedPhoneId) return new Set<string>()
    const colorIds = (product.colorIds?.length ? product.colorIds : ['']) as string[]
    return new Set(colorIds.filter((cid) => isVariantOrderable(product, cid, selectedPhoneId)))
  }, [product, selectedPhoneId])

  useEffect(() => {
    setSelectedPhoneId('')
    setSelectedColorId('')
    setSelectedImageIndex(0)
    setAddScreenProtector(false)
    setCommanderHint('')
  }, [product?.id ?? ''])

  useEffect(() => {
    if (modelOptions.length === 1 && !selectedPhoneId) {
      const first = modelOptions[0]
      if (first) setSelectedPhoneId(first)
    }
    if (colorOptions.length === 1 && !selectedColorId) {
      const first = colorOptions[0]
      if (first?.id) setSelectedColorId(first.id)
    }
  }, [modelOptions, colorOptions, selectedPhoneId, selectedColorId])
  useEffect(() => {
    if (!initialSelectedModelId) return
    if (!modelOptions.includes(initialSelectedModelId)) return
    if (selectedPhoneId) return
    setSelectedPhoneId(initialSelectedModelId)
  }, [initialSelectedModelId, modelOptions, selectedPhoneId])
  useEffect(() => {
    if (selectedPhoneId && colorOptions.length > 0 && selectedColorId && !orderableColorIdsForSelectedPhone.has(selectedColorId)) {
      const first = colorOptions.find((c) => orderableColorIdsForSelectedPhone.has(c.id))
      setSelectedColorId(first?.id ?? '')
    }
  }, [selectedPhoneId, orderableColorIdsForSelectedPhone, colorOptions, selectedColorId])

  const photos =
    product.photoGallery?.length ? product.photoGallery : product.photoUrl ? [product.photoUrl] : []
  const mainPhoto = photos[selectedImageIndex] ?? photos[0]

  const selectedVariantOrderable =
    selectedPhoneId !== '' &&
    (colorOptions.length === 0 ? true : isVariantOrderable(product, selectedColorId, selectedPhoneId))
  const canCommander =
    selectedPhoneId !== '' &&
    (colorOptions.length === 0 || selectedColorId !== '') &&
    selectedVariantOrderable

  useEffect(() => {
    try {
      trackViewContent(product?.name, product?.id ? [product.id] : [], product?.price ?? 0, 'DZD')
      trackTikTokViewContent(product?.name, product?.id ? [product.id] : [], product?.price ?? 0, 'DZD')
    } catch {
      // ignore pixel errors
    }
  }, [product?.id, product?.name, product?.price])

  const handleCommander = () => {
    if (!selectedPhoneId) return
    if (colorOptions.length > 0 && !selectedColorId) return
    onCommander(
      selectedPhoneId,
      colorOptions.length >= 1 ? selectedColorId : '',
      addScreenProtector,
      false,
      false,
      false,
    )
  }

  const handleCommanderClick = () => {
    if (!selectedPhoneId) {
      setCommanderHint('Il faut choisir un modèle.')
      return
    }
    if (colorOptions.length > 0 && !selectedColorId) {
      setCommanderHint('Il faut choisir une couleur.')
      return
    }
    if (!canCommander) {
      setCommanderHint('Cette variante n’est pas disponible.')
      return
    }
    setCommanderHint('')
    handleCommander()
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {backLink && (
        <header className="border-b border-white/10 px-4 py-3">
          <div className="max-w-6xl mx-auto">{backLink}</div>
        </header>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 pb-28 sm:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Colonne gauche : galerie */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl bg-brand-card border border-white/10 overflow-hidden">
              {mainPhoto ? (
                <img
                  src={mainPhoto}
                  alt={product.name}
                  fetchPriority="high"
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
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
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

            {modelOptions.length === 0 ? (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
                Ce produit est actuellement indisponible (stock épuisé et non disponible chez le fournisseur).
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                  Votre appareil <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedPhoneId}
                  onChange={(e) => setSelectedPhoneId(e.target.value)}
                  disabled={lockModelSelection}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-brand-card border border-white/10 text-white focus:border-brand-accent focus:outline-none"
                >
                  <option value="">Choisir un modèle</option>
                  {modelOptions.map((id) => {
                    const model =
                      SAMSUNG_ULTRA_MODELS.find((m) => m.id === id) ??
                      IPHONE_MODELS.find((m) => m.id === id)
                    return (
                      <option key={id} value={id}>
                        {model?.name ?? id}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Couleur : pastilles */}
            {colorOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
                  Couleur <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => {
                    const orderable = !selectedPhoneId || orderableColorIdsForSelectedPhone.has(c.id)
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
                        style={{ backgroundColor: (c as { hex: string }).hex ?? '#444' }}
                        title={orderable ? c.name : `${c.name} — Indisponible`}
                        aria-label={orderable ? c.name : `${c.name} (indisponible)`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upsell : Protecteur d'écran incassable (avant le bouton Commander) */}
            <section className="mb-6">
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
                    {screenProtectorUpsell.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white group-hover:text-brand-accent transition-colors">
                      {screenProtectorUpsell.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-brand-accent font-semibold">
                        {screenProtectorUpsell.price} DA
                      </span>
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
                  Cochez pour ajouter à votre commande.
                </p>
              </div>
            </section>

            {selectedPhoneId && !selectedVariantOrderable && (colorOptions.length === 0 || selectedColorId) && (
              <p className="mb-3 text-amber-400 text-sm">
                Cette variante n&apos;est pas disponible à la commande (stock épuisé et non disponible chez le fournisseur).
              </p>
            )}
            {/* Le bouton principal est dans la barre fixe en bas */}
            <p className="text-brand-muted text-sm">
              Choisissez votre modèle{colorOptions.length > 0 ? ' et votre couleur' : ''} puis validez avec le bouton ci-dessous.
            </p>

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

      {/* Barre fixe "Commander maintenant" (toujours visible) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-brand-dark/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-brand-muted truncate">
              {title ?? product.name}
            </p>
            <p className="text-sm font-semibold text-white">
              {product.price.toLocaleString('fr-FR')} DA
            </p>
            {commanderHint && (
              <p className="text-xs text-amber-300 mt-1">
                {commanderHint}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCommanderClick}
            className={`px-5 py-3 rounded-xl font-semibold border-2 transition-all duration-200 ${
              canCommander
                ? 'bg-white text-black border-black hover:bg-neutral-200'
                : 'bg-white/70 text-black/70 border-black/40 hover:bg-white/80'
            }`}
          >
            Commander maintenant
          </button>
        </div>
      </div>
    </div>
  )
}

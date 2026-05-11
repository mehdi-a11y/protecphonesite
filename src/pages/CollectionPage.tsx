import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetCollectionBySlug, apiGetLandingBySlug } from '../api'
import {
  loadProducts,
  getAntichocById,
  IPHONE_MODELS,
  SAMSUNG_ULTRA_MODELS,
  hasOrderableVariantForPhone,
  hasOrderableVariantForSamsung,
} from '../data'
import type { Antichoc, IPhoneModelId, SamsungModelId } from '../data'

interface CollectionProduct {
  landingSlug: string
  product: Antichoc
}

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const [name, setName] = useState<string | null>(null)
  const [items, setItems] = useState<CollectionProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeviceType, setSelectedDeviceType] = useState<'iphone' | 'samsung' | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError('URL invalide')
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([loadProducts(), apiGetCollectionBySlug(slug)])
      .then(([, collection]) => {
        if (cancelled) return
        if (!collection) {
          setError('Collection introuvable')
          return
        }
        setName(collection.name)
        const landingSlugs = collection.landingSlugs || []
        if (landingSlugs.length === 0) {
          setItems([])
          return
        }
        return Promise.all(
          landingSlugs.map((lpSlug) =>
            apiGetLandingBySlug(lpSlug).then((landing) => ({
              landingSlug: lpSlug,
              antichocId: landing?.antichocId,
            })),
          ),
        )
      })
      .then((pairs) => {
        if (cancelled || !pairs) return
        const list: CollectionProduct[] = []
        for (const { landingSlug, antichocId } of pairs) {
          if (!antichocId) continue
          const product = getAntichocById(antichocId)
          if (product) list.push({ landingSlug, product })
        }
        setItems(list)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const availableIphoneIds = useMemo(() => {
    const ids = new Set<IPhoneModelId>()
    for (const { product } of items) {
      if (product.deviceType === 'samsung') continue
      const compatible = product.compatibleWith?.length
        ? product.compatibleWith
        : (IPHONE_MODELS.map((m) => m.id) as IPhoneModelId[])
      for (const phoneId of compatible) {
        if (hasOrderableVariantForPhone(product, phoneId)) ids.add(phoneId)
      }
    }
    return IPHONE_MODELS.filter((m) => ids.has(m.id))
  }, [items])

  const availableSamsungIds = useMemo(() => {
    const ids = new Set<SamsungModelId>()
    for (const { product } of items) {
      if (product.deviceType !== 'samsung') continue
      const compatible = product.compatibleWithSamsung?.length
        ? product.compatibleWithSamsung
        : (SAMSUNG_ULTRA_MODELS.map((m) => m.id) as SamsungModelId[])
      for (const modelId of compatible) {
        if (hasOrderableVariantForSamsung(product, modelId)) ids.add(modelId)
      }
    }
    return SAMSUNG_ULTRA_MODELS.filter((m) => ids.has(m.id))
  }, [items])

  useEffect(() => {
    if (selectedDeviceType && selectedModelId) return
    if (availableIphoneIds.length > 0 && availableSamsungIds.length === 0) {
      setSelectedDeviceType('iphone')
      return
    }
    if (availableSamsungIds.length > 0 && availableIphoneIds.length === 0) {
      setSelectedDeviceType('samsung')
      return
    }
  }, [availableIphoneIds, availableSamsungIds, selectedDeviceType, selectedModelId])

  const filteredItems = useMemo(() => {
    if (!selectedDeviceType || !selectedModelId) return []
    return items.filter(({ product }) => {
      if (selectedDeviceType === 'iphone') {
        if (product.deviceType === 'samsung') return false
        return hasOrderableVariantForPhone(product, selectedModelId as IPhoneModelId)
      }
      if (product.deviceType !== 'samsung') return false
      return hasOrderableVariantForSamsung(product, selectedModelId as SamsungModelId)
    })
  }, [items, selectedDeviceType, selectedModelId])

  const chosenModelName =
    IPHONE_MODELS.find((m) => m.id === selectedModelId)?.name ??
    SAMSUNG_ULTRA_MODELS.find((m) => m.id === selectedModelId)?.name ??
    null

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-brand-muted">Chargement...</p>
      </div>
    )
  }

  if (error || name === null) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6">
        <p className="text-red-400 mb-4">{error ?? 'Collection introuvable'}</p>
        <Link to="/" className="text-brand-accent hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark px-4 py-8 pb-28 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="text-brand-muted hover:text-white mb-6 flex items-center gap-2 transition-colors text-sm"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">{name}</h1>
        <p className="text-brand-muted text-sm mb-8">
          Mini version : le client choisit d&apos;abord son modèle, puis voit uniquement les antichocs disponibles.
        </p>

        {items.length === 0 ? (
          <p className="text-brand-muted">Aucun produit dans cette collection.</p>
        ) : !selectedDeviceType ? (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-white mb-2">Quel appareil utilisez-vous ?</h2>
            <p className="text-brand-muted text-sm mb-4">Choisissez la gamme pour continuer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableIphoneIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeviceType('iphone')
                    setSelectedModelId(null)
                  }}
                  className="p-4 rounded-xl bg-brand-card border border-white/10 text-left hover:border-brand-accent/50 hover:bg-white/5 transition-all duration-200"
                >
                  <p className="font-medium text-white">iPhone</p>
                  <p className="text-xs text-brand-muted mt-1">{availableIphoneIds.length} modèle(s) disponible(s)</p>
                </button>
              )}
              {availableSamsungIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeviceType('samsung')
                    setSelectedModelId(null)
                  }}
                  className="p-4 rounded-xl bg-brand-card border border-white/10 text-left hover:border-brand-accent/50 hover:bg-white/5 transition-all duration-200"
                >
                  <p className="font-medium text-white">Samsung</p>
                  <p className="text-xs text-brand-muted mt-1">{availableSamsungIds.length} modèle(s) disponible(s)</p>
                </button>
              )}
            </div>
          </div>
        ) : !selectedModelId ? (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {selectedDeviceType === 'iphone' ? 'Quel est votre iPhone ?' : 'Quel est votre Samsung ?'}
                </h2>
                <p className="text-brand-muted text-sm">
                  Sélectionnez votre modèle pour voir les produits disponibles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeviceType(null)
                  setSelectedModelId(null)
                }}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Changer d&apos;appareil
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(selectedDeviceType === 'iphone' ? availableIphoneIds : availableSamsungIds).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModelId(m.id)}
                  className="p-4 rounded-xl bg-brand-card border border-white/10 text-left hover:border-brand-accent/50 hover:bg-white/5 transition-all duration-200 flex items-center justify-between group"
                >
                  <span className="font-medium text-white">{m.name}</span>
                  <span className="text-brand-muted group-hover:text-brand-accent transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSelectedModelId(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Changer de modèle
              </button>
              <span className="text-brand-muted text-sm">
                Modèle sélectionné :
                <strong className="text-white ml-1">{chosenModelName ?? selectedModelId}</strong>
              </span>
              <span className="text-brand-muted text-sm">
                • {filteredItems.length} produit{filteredItems.length > 1 ? 's' : ''} disponible{filteredItems.length > 1 ? 's' : ''}
              </span>
            </div>
            {filteredItems.length === 0 ? (
              <p className="text-brand-muted">Aucun produit disponible pour ce modèle dans cette collection.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredItems.map(({ landingSlug, product: p }) => {
              const photo = p.photoGallery?.[0] ?? p.photoUrl
              return (
                <article
                  key={landingSlug}
                  className="rounded-2xl bg-brand-card border border-white/10 overflow-hidden flex flex-col"
                >
                  <Link
                    to={`/p/${landingSlug}`}
                    className="block aspect-[4/5] bg-brand-dark overflow-hidden"
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        {p.image}
                      </div>
                    )}
                  </Link>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">
                        PROTECPHONE
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

                    <Link to={`/p/${landingSlug}`} className="group">
                      <h3 className="font-semibold text-white text-sm leading-tight mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1.5 mb-2 text-amber-400">
                      <span className="flex" aria-hidden>
                        {'★★★★★'.split('').map((_, i) => (
                          <span key={i} className="text-xs">★</span>
                        ))}
                      </span>
                      <span className="text-xs text-brand-muted">(Avis)</span>
                    </div>

                    <p className="text-brand-accent font-semibold text-lg mb-4 mt-auto">
                      {p.price.toLocaleString('fr-FR')} DA
                    </p>
                  </div>
                </article>
              )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

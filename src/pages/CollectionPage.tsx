import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetCollectionBySlug, apiGetLandingBySlug } from '../api'
import { loadProducts, getAntichocById } from '../data'
import type { Antichoc } from '../data'

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
        <h1 className="text-2xl font-bold text-white mb-1">
          Choisissez votre antichoc
        </h1>
        <p className="text-brand-muted text-sm mb-8">
          {items.length} modèles disponibles pour votre iPhone.
        </p>

        {items.length === 0 ? (
          <p className="text-brand-muted">Aucun produit dans cette collection.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {items.map(({ landingSlug, product: p }) => {
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
      </div>
    </div>
  )
}

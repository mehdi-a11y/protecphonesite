import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetCollectionBySlug } from '../api'

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const [name, setName] = useState<string | null>(null)
  const [landingSlugs, setLandingSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError('URL invalide')
      setLoading(false)
      return
    }
    let cancelled = false
    apiGetCollectionBySlug(slug)
      .then((collection) => {
        if (cancelled) return
        if (!collection) {
          setError('Collection introuvable')
          return
        }
        setName(collection.name)
        setLandingSlugs(collection.landingSlugs || [])
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
    <div className="min-h-screen bg-brand-dark px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="text-brand-muted hover:text-white text-sm flex items-center gap-1 mb-6">
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">{name}</h1>
        <p className="text-brand-muted text-sm mb-6">
          Choisissez un produit pour voir la page et commander.
        </p>
        {landingSlugs.length === 0 ? (
          <p className="text-brand-muted">Aucune landing page dans cette collection.</p>
        ) : (
          <ul className="space-y-3">
            {landingSlugs.map((lpSlug) => (
              <li key={lpSlug}>
                <Link
                  to={`/p/${lpSlug}`}
                  className="block rounded-xl bg-brand-card border border-white/10 p-4 text-white hover:border-brand-accent/50 hover:bg-brand-card/80 transition-colors"
                >
                  <span className="font-mono text-brand-accent">/p/{lpSlug}</span>
                  <span className="ml-2">Voir la page produit →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

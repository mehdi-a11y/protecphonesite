import { Link } from 'react-router-dom'

interface Props {
  onNext: () => void
}

export function LandingStep({ onNext }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      {/* Barre d'infos (style e-commerce) */}
      <div className="bg-brand-topbar text-neutral-800 text-center py-2.5 px-4 text-sm font-medium">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
          <span>LIVRAISON GRATUITE À PARTIR DE 3000 DZD</span>
          <span className="hidden sm:inline text-neutral-400">|</span>
          <span className="flex items-center justify-center gap-1">
            <span className="text-amber-500">★★★★★</span>
            <span>NOTÉ EXCELLENT</span>
          </span>
          <span className="hidden sm:inline text-neutral-400">|</span>
          <span>RETOURS SOUS 7 JOURS</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-brand-header border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-xl tracking-tight">
            PROTECPHONE
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-white/90">
            <span className="text-white font-medium">Promos</span>
            <Link to="/admin" className="text-white/60 hover:text-white text-xs">
              Admin
            </Link>
            <Link to="/confirmateur" className="text-white/60 hover:text-white text-xs">
              Confirmation
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — Liquidation de stock */}
      <section className="flex-1 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800/90 via-brand-card to-brand-dark border border-white/10 min-h-[320px] sm:min-h-[380px] flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-12 p-8 sm:p-12">
            {/* Fond décoratif */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-brand-accent/10 blur-3xl" />
              <div className="absolute left-1/4 top-0 w-48 h-48 rounded-full bg-brand-gold/5 blur-2xl" />
            </div>

            <div className="relative z-10 text-center sm:text-left max-w-xl">
              <p className="text-brand-accent font-semibold tracking-widest uppercase text-xs sm:text-sm mb-3">
                Promotions
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-tight leading-tight mb-4">
                Liquidation de stock
              </h1>
              <p className="text-white/80 text-base sm:text-lg mb-8">
                Découvrez nos antichocs iPhone à prix cassés. Choisissez votre modèle et commandez en paiement à la livraison (COD).
              </p>
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-lg border-2 border-black hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 uppercase tracking-wider text-sm"
              >
                Choisir votre iPhone
              </button>
            </div>

            {/* Bloc visuel côté droit (placeholder style produit) */}
            <div className="relative z-10 hidden md:flex items-center justify-center w-56 h-56 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="text-6xl opacity-50">📱</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pied de page léger */}
      <footer className="py-6 text-center text-sm text-brand-muted border-t border-white/5">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>✓ Paiement à la livraison</span>
          <span>✓ Stock limité</span>
        </p>
      </footer>
    </div>
  )
}

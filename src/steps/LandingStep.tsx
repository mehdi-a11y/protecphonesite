const CATEGORIES = [
  {
    id: 'antichocs',
    name: 'Antichocs iPhone',
    description: 'Coques antichoc à prix cassés',
    icon: '📱',
    available: true,
  },
  {
    id: 'smartwatch',
    name: 'Smartwatch',
    description: 'Montres connectées',
    icon: '⌚',
    available: false,
  },
  {
    id: 'chargeur',
    name: 'Chargeurs',
    description: 'Chargeurs et câbles',
    icon: '🔌',
    available: false,
  },
  {
    id: 'ecouteurs',
    name: 'Écouteurs',
    description: 'Écouteurs et casques',
    icon: '🎧',
    available: false,
  },
  {
    id: 'support',
    name: 'Supports',
    description: 'Supports voiture & bureau',
    icon: '📲',
    available: false,
  },
] as const

interface Props {
  onNext: () => void
}

export function LandingStep({ onNext }: Props) {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero — Liquidation de stock */}
      <section className="flex-1 flex items-center py-8 sm:py-12">
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

      {/* Catégories */}
      <section className="w-full max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
          Nos catégories
        </h2>
        <p className="text-brand-muted text-sm text-center mb-8 max-w-xl mx-auto">
          Antichocs, smartwatch, chargeurs, écouteurs, supports… tout en liquidation.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              role={cat.available ? 'button' : undefined}
              tabIndex={cat.available ? 0 : undefined}
              onClick={cat.available ? onNext : undefined}
              onKeyDown={cat.available ? (e) => e.key === 'Enter' && onNext() : undefined}
              className={`rounded-2xl border p-5 flex flex-col items-center text-center transition-all ${
                cat.available
                  ? 'bg-brand-card border-white/10 hover:border-brand-accent/50 cursor-pointer'
                  : 'bg-brand-card/50 border-white/5 opacity-80'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-3">
                {cat.icon}
              </div>
              <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                {cat.name}
              </h3>
              <p className="text-brand-muted text-xs mb-4 flex-1">
                {cat.description}
              </p>
              {cat.available ? (
                <span className="w-full py-2.5 rounded-lg bg-brand-accent text-brand-dark font-medium text-sm hover:bg-brand-accentDim transition-colors inline-block">
                  Voir les offres
                </span>
              ) : (
                <span className="text-xs text-brand-muted py-2.5">
                  Bientôt disponible
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

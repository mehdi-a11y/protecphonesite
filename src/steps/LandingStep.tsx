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
    </div>
  )
}

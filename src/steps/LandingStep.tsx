import { Link } from 'react-router-dom'

interface Props {
  onNext: () => void
}

export function LandingStep({ onNext }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="max-w-xl mx-auto">
        <p className="text-brand-accent font-medium tracking-wider uppercase text-sm mb-4">
          Liquidation stock
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Antichocs iPhone
          <br />
          <span className="text-brand-accent">à prix cassés</span>
        </h1>
        <p className="text-brand-muted text-lg mb-10">
          Choisissez votre iPhone, trouvez la coque qu’il vous faut et commandez en paiement à la livraison (COD).
        </p>
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-4 bg-brand-accent text-brand-dark font-semibold rounded-xl hover:bg-brand-accentDim transition-all duration-200 shadow-lg shadow-brand-accent/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          Choisir mon iPhone
        </button>
      </div>
      <div className="mt-16 flex flex-col items-center gap-3 text-sm text-brand-muted">
        <span className="flex gap-3">
          <span>✓ Livraison COD</span>
          <span>•</span>
          <span>✓ Stock limité</span>
        </span>
        <Link to="/admin" className="text-white/40 hover:text-white/60 text-xs">
          Admin
        </Link>
      </div>
    </div>
  )
}

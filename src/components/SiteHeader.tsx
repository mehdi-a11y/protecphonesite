import { Link } from 'react-router-dom'

export function SiteHeader() {
  return (
    <>
      {/* Barre d'infos */}
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

      {/* Navigation principale */}
      <header className="bg-brand-header border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-xl tracking-tight hover:opacity-90 transition-opacity">
            PROTECPHONE
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm text-white/90">
            <Link to="/" className="text-white/90 hover:text-white font-medium transition-colors">
              Accueil
            </Link>
            <Link to="/admin" className="text-white/60 hover:text-white transition-colors">
              Admin
            </Link>
            <Link to="/confirmateur" className="text-white/60 hover:text-white transition-colors">
              Confirmation
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}

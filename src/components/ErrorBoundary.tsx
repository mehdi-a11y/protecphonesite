import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 text-center">
          <p className="text-amber-400 mb-4">Une erreur s&apos;est produite.</p>
          <Link to="/" className="text-brand-accent hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

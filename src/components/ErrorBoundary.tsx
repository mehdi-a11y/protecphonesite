import { Component, type ReactNode, type ErrorInfo } from 'react'
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      const err = this.state.error
      return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 text-center">
          <p className="text-amber-400 mb-4">Une erreur s&apos;est produite.</p>
          {err?.message && (
            <p className="text-brand-muted text-sm mb-4 max-w-md font-mono">{err.message}</p>
          )}
          <Link to="/" className="text-brand-accent hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

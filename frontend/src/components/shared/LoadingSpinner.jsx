import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <Loader2
      data-testid="loading-spinner"
      className={`animate-spin text-td-green ${sizes[size] || sizes.md} ${className}`}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" />
    </div>
  )
}

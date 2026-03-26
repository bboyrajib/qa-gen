import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isAuthenticated } from '@/lib/auth'
import { Eye, EyeOff } from 'lucide-react'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import TDBankLogo from '@/components/shared/TDBankLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading, error } = useAuth()

  if (isAuthenticated()) return <Navigate to="/projects" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    await login(email, password)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && email && password && !loading) {
      handleSubmit(e)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0D1F14]">
      {/* Left: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <TDBankLogo size={40} />
              </div>
            <div>
              <h1 className="text-xl font-bold text-white">QGenie 2.0</h1>
              <p className="text-xs text-white/50">TD Bank Technology Centre of Excellence</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-[#1A3626] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-1">Sign In</h2>
            <p className="text-sm text-white/50 mb-6">Enter your TCoE credentials to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  data-testid="login-email-input"
                  type="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-td-green focus:border-td-green transition-all"
                  placeholder="you@tdbank.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-td-green focus:border-td-green transition-all pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  data-testid="login-error"
                  className="px-4 py-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </div>
              )}

              <button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-3 bg-td-green hover:bg-td-dark-green text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-xs text-white/30 text-center mt-4">
              Account managed by your TCoE administrator
            </p>
          </div>
        </div>
      </div>

      {/* Right: Background Visual */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden items-center justify-center">
        <img
          src="https://images.pexels.com/photos/225769/pexels-photo-225769.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="TD Bank abstract background"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0D1F14]/80" />
        <div className="relative z-10 text-center px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Enterprise QA Intelligence</h2>
          <p className="text-white/60 text-base leading-relaxed">
            AI-powered automation for Tosca conversion, test generation, failure analysis,
            impact assessment, and regression optimization.
          </p>
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            {['Tosca AI', 'Test Gen', 'RCA', 'Impact', 'Regression'].map((label) => (
              <span key={label} className="text-xs px-3 py-1.5 bg-td-green/20 text-td-mid border border-td-green/30 rounded-full">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAllRecentJobs } from '@/hooks/useJobs'
import { useProject } from '@/hooks/useProjects'
import JobStatusBadge from '@/components/shared/JobStatusBadge'
import {
  ShieldCheck, LayoutDashboard, ArrowLeftRight, FlaskConical,
  Bug, Search, BarChart3, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Tosca Conversion', path: 'tosca', icon: ArrowLeftRight },
  { label: 'Test Generation', path: 'test-gen', icon: FlaskConical },
  { label: 'Failure RCA', path: 'rca', icon: Bug },
  { label: 'Impact Analysis', path: 'impact', icon: Search },
  { label: 'Regression Optimizer', path: 'regression', icon: BarChart3 },
]

const MODULE_LABELS = {
  'tosca-convert': 'Tosca',
  'test-gen': 'Test Gen',
  'rca': 'RCA',
  'impact': 'Impact',
  'regression': 'Regression',
}

export default function Sidebar() {
  const { projectId } = useParams()
  const location = useLocation()
  const { data: recentJobs } = useAllRecentJobs()

  const isActive = (path) => {
    const full = `/projects/${projectId}${path ? `/${path}` : ''}`
    if (path === '') return location.pathname === `/projects/${projectId}`
    return location.pathname.startsWith(full)
  }

  return (
    <aside
      data-testid="sidebar"
      className="fixed left-0 top-0 bottom-0 w-[240px] z-30 flex flex-col"
      style={{ background: 'var(--sidebar-dark, #0D1F14)' }}
    >
      <style>{`:root { --sidebar-dark: #0D1F14; } .dark { --sidebar-dark: #0D1F14; } :not(.dark) { --sidebar-dark: #EEF7F2; }`}</style>

      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 dark:border-white/10">
        <ShieldCheck className="w-6 h-6 text-td-green flex-shrink-0" />
        <div>
          <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white">QGenie 2.0</p>
          <p className="text-[10px] text-gray-500 dark:text-white/50 leading-tight">TD Bank TCoE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 px-2 mb-2">
          AI Modules
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = isActive(path)
            return (
              <li key={path}>
                <Link
                  to={`/projects/${projectId}${path ? `/${path}` : ''}`}
                  data-testid={`sidebar-nav-${path || 'dashboard'}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-td-green/20 text-td-green border-l-2 border-td-green pl-[10px] dark:bg-td-green/20 dark:text-td-light'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-td-green' : 'text-gray-400 group-hover:text-gray-600 dark:text-white/40 dark:group-hover:text-white'}`} />
                  <span className="truncate">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-td-green/60" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Recent Jobs */}
      <div className="px-3 py-3 border-t border-white/10 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 px-2 mb-2">
          Recent Jobs
        </p>
        <ul className="space-y-1">
          {(recentJobs || []).slice(0, 5).map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors"
            >
              <span className="text-gray-600 dark:text-white/50 truncate max-w-[120px]">
                {MODULE_LABELS[job.type] || job.type}
              </span>
              <JobStatusBadge status={job.status} small />
            </li>
          ))}
          {(!recentJobs || recentJobs.length === 0) && (
            <li className="px-2 py-1 text-xs text-gray-400 dark:text-white/30">No recent jobs</li>
          )}
        </ul>
      </div>
    </aside>
  )
}

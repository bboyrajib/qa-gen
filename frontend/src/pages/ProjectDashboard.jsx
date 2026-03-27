import { useNavigate, useParams, Link } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useRecentJobs } from '@/hooks/useJobs'
import { useAppStore } from '@/store'
import JobStatusBadge from '@/components/shared/JobStatusBadge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import {
  ArrowLeftRight, FlaskConical, Bug, Search, BarChart3,
  Clock, User, ChevronRight, ExternalLink, RotateCcw
} from 'lucide-react'

const MODULE_CARDS = [
  {
    type: 'tosca-convert',
    label: 'Tosca Conversion',
    path: 'tosca',
    icon: ArrowLeftRight,
    description: 'Convert Tosca TCA/TSU files to Playwright TypeScript',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    type: 'test-gen',
    label: 'Test Generation',
    path: 'test-gen',
    icon: FlaskConical,
    description: 'Generate Gherkin test scenarios from Jira stories',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  },
  {
    type: 'rca',
    label: 'Failure RCA',
    path: 'rca',
    icon: Bug,
    description: 'Automated root cause analysis for CI/CD failures',
    color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  },
  {
    type: 'impact',
    label: 'Impact Analysis',
    path: 'impact',
    icon: Search,
    description: 'Assess test impact for code changes and PRs',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  },
  {
    type: 'regression',
    label: 'Regression Optimizer',
    path: 'regression',
    icon: BarChart3,
    description: 'AI-optimised regression suite with risk scoring',
    color: 'text-td-green bg-td-green/10',
  },
]

const MODULE_LABELS = {
  'tosca-convert': 'Tosca',
  'test-gen': 'Test Gen',
  rca: 'RCA',
  impact: 'Impact',
  regression: 'Regression',
}

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

export default function ProjectDashboard() {
  const { projectId } = useParams()
  const { data: project } = useProject(projectId)
  const { data: recentJobs, isLoading } = useRecentJobs(projectId)
  const navigate = useNavigate()
  const getProjectModules = useAppStore((s) => s.getProjectModules)
  useAppStore((s) => s.globalModules) // re-render when global modules change
  const enabledModules = getProjectModules(projectId)
  const visibleModuleCards = MODULE_CARDS.filter((m) => enabledModules[m.path] !== false)

  const getLastJobStatus = (type) => {
    const job = recentJobs?.find((j) => j.type === type)
    return job?.status || null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {project?.name || 'Project Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project?.domain_tag} · Jira: {project?.jira_project_key} · {project?.member_count} members
        </p>
      </div>

      {/* Agent Status Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleModuleCards.map(({ type, label, path, icon: Icon, description, color }) => {
            const lastStatus = getLastJobStatus(type)
            return (
              <Link
                key={type}
                to={`/projects/${projectId}/${path}`}
                data-testid={`module-card-${type}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-td-green/40 hover:shadow-sm transition-all duration-200 group flex flex-col gap-3"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-td-green transition-colors leading-tight">
                    {label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
                </div>
                <div className="flex items-center justify-between">
                  {lastStatus ? (
                    <JobStatusBadge status={lastStatus} small />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No jobs yet</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-td-green group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Jobs</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          )}
          {!isLoading && recentJobs?.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">No jobs yet for this project</div>
          )}
          {!isLoading && recentJobs?.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job, i) => (
                  <tr
                    key={job.id}
                    data-testid={`recent-job-row-${job.id}`}
                    className={`transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-muted/20`}
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {job.id}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {MODULE_LABELS[job.type] || job.type}
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(job.submitted)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {job.user}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const card = MODULE_CARDS.find((m) => m.type === job.type)
                        const moduleDisabled = card ? enabledModules[card.path] === false : false
                        return (
                          <div className="flex items-center justify-end gap-2">
                            {moduleDisabled ? (
                              <span className="text-xs text-muted-foreground italic px-1">Module disabled</span>
                            ) : (
                              <>
                                <Link
                                  to={`/projects/${projectId}/${card?.path || ''}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border text-foreground hover:border-td-green hover:text-td-green transition-all duration-150"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Open
                                </Link>
                                <button
                                  onClick={() => navigate(`/projects/${projectId}/${card?.path || ''}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-td-green/10 text-td-green hover:bg-td-green hover:text-white border border-td-green/30 hover:border-td-green transition-all duration-150"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Re-run
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {visibleModuleCards.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              data-testid={`quick-action-${path}`}
              onClick={() => navigate(`/projects/${projectId}/${path}`)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-td-green hover:text-td-green transition-all duration-150"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

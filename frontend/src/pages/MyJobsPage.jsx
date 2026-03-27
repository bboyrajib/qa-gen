import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRecentJobs } from '@/hooks/useJobs'
import { useJobStore, useAppStore } from '@/store'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, createColumnHelper
} from '@tanstack/react-table'
import {
  Briefcase, CheckCircle2, AlertCircle, Clock, Loader2,
  ArrowUpDown, ExternalLink, RotateCcw
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { toast } from 'sonner'

const MODULE_LABELS = {
  'tosca-convert': 'Tosca Conversion',
  'test-gen': 'Test Generation',
  rca: 'Failure RCA',
  impact: 'Impact Analysis',
  regression: 'Regression Optimizer',
  demo: 'Demo',
}

const MODULE_PATHS = {
  'tosca-convert': 'tosca',
  'test-gen': 'test-gen',
  rca: 'rca',
  impact: 'impact',
  regression: 'regression',
}

const STATUS_CONFIG = {
  COMPLETE: { label: 'Complete', icon: CheckCircle2, color: 'text-td-green bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  FAILED: { label: 'Failed', icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  RUNNING: { label: 'Running', icon: Loader2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  QUEUED: { label: 'Queued', icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
}

const colHelper = createColumnHelper()

export default function MyJobsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { data: apiJobs = [] } = useRecentJobs(projectId)
  const { jobs: sessionJobs } = useJobStore()
  const getProjectModules = useAppStore((s) => s.getProjectModules)
  useAppStore((s) => s.globalModules) // re-render when global modules change

  const allJobs = useMemo(() => {
    const sessionList = Object.entries(sessionJobs)
      .filter(([, j]) => j)
      .map(([id, j]) => ({
        id,
        type: j.type,
        status: j.failed ? 'FAILED' : j.complete ? 'COMPLETE' : 'RUNNING',
        submitted: new Date(parseInt(id.split('-').pop() || Date.now())).toISOString(),
        user: 'You',
        project_id: projectId,
        _session: true,
      }))

    const apiList = (apiJobs || []).filter((j) => j.project_id === projectId)
    const sessionIds = new Set(sessionList.map((j) => j.id))
    const merged = [...sessionList, ...apiList.filter((j) => !sessionIds.has(j.id))]
    return merged.sort((a, b) => new Date(b.submitted) - new Date(a.submitted))
  }, [sessionJobs, apiJobs, projectId])

  const columns = useMemo(() => [
    colHelper.accessor('id', {
      header: 'Job ID',
      cell: (info) => (
        <code className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
          {info.getValue()}
        </code>
      ),
    }),
    colHelper.accessor('type', {
      header: 'Module',
      cell: (info) => (
        <span className="text-sm font-medium text-foreground">
          {MODULE_LABELS[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    colHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue()
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.QUEUED
        const Icon = config.icon
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium ${config.color}`}>
            <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
            {config.label}
          </span>
        )
      },
    }),
    colHelper.accessor('user', {
      header: 'Triggered By',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>
      ),
    }),
    colHelper.accessor('submitted', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
          onClick={column.getToggleSortingHandler()}
        >
          Executed
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-xs text-foreground">
            {new Date(info.getValue()).toLocaleString('en-CA', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {timeAgo(info.getValue())}
          </span>
        </div>
      ),
    }),
    colHelper.display({
      id: 'actions',
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</span>
      ),
      cell: (info) => {
        const job = info.row.original
        const path = MODULE_PATHS[job.type]
        if (!path) return null
        const moduleDisabled = getProjectModules(projectId)[path] === false
        if (moduleDisabled) {
          return <span className="text-xs text-muted-foreground italic">Module disabled</span>
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              data-testid={`open-job-${job.id}`}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/projects/${projectId}/${path}`, { state: { autoShow: job.status === 'COMPLETE' } })
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border text-foreground hover:border-td-green hover:text-td-green transition-all duration-150"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
            <button
              data-testid={`rerun-job-${job.id}`}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/projects/${projectId}/${path}`, { state: { rerun: true } })
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-td-green/10 text-td-green hover:bg-td-green hover:text-white border border-td-green/30 hover:border-td-green transition-all duration-150"
            >
              <RotateCcw className="w-3 h-3" />
              Re-run
            </button>
          </div>
        )
      },
    }),
  ], [projectId, navigate, getProjectModules])

  const table = useReactTable({
    data: allJobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { sorting: [{ id: 'submitted', desc: true }] },
  })

  return (
    <div className="space-y-6 animate-fade-in" data-testid="my-jobs-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-td-green" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">My Jobs</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            All jobs submitted for this project — click a row to open that module
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {allJobs.length} job{allJobs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = allJobs.filter((j) => j.status === status).length
          const Icon = config.icon
          return (
            <div
              key={status}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
              data-testid={`jobs-stat-${status.toLowerCase()}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color.split(' ')[1]} ${config.color.split(' ')[2]}`}>
                <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{config.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Jobs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {allJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No jobs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run any AI module to see your jobs here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/30">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h.id === 'actions' ? 'text-right' : 'text-left'}`}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  data-testid={`job-row-${row.original.id}`}
                  onClick={() => {
                    const p = MODULE_PATHS[row.original.type]
                    if (!p) return
                    if (getProjectModules(projectId)[p] === false) {
                      toast.error('This module is disabled for this project')
                      return
                    }
                    navigate(`/projects/${projectId}/${p}`, { state: { autoShow: row.original.status === 'COMPLETE' } })
                  }}
                  className={`transition-colors cursor-pointer hover:bg-muted/30 ${i % 2 ? 'bg-muted/10' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

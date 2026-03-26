import { useState, useMemo, useEffect } from 'react'
import { useJobStore, useChatStore, useAppStore } from '@/store'
import { useJobSimulator } from '@/hooks/useJobs'
import StepProgress from '@/components/shared/StepProgress'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, createColumnHelper
} from '@tanstack/react-table'
import { DEMO_IMPACT_RESULT } from '@/lib/demo-data'
import { ChevronDown, ChevronUp, Loader2, Search, GitBranch } from 'lucide-react'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const STEPS = ['Fetching Diff', 'AST Analysis', 'Coverage Lookup', 'Call Graph', 'Risk Assessment', 'Scoring', 'Ready']
const colHelper = createColumnHelper()

const RISK_CONFIG = {
  HIGH: { label: 'HIGH RISK', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700' },
  MEDIUM: { label: 'MEDIUM RISK', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700' },
  LOW: { label: 'LOW RISK', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700' },
}

const REASON_COLORS = {
  DIRECT: 'bg-td-green/10 text-td-green',
  INDIRECT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MODULE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function ImpactModule() {
  const [commitSha, setCommitSha] = useState('')
  const [repo, setRepo] = useState('')
  const [prId, setPrId] = useState('')
  const [currentJobId, setCurrentJobId] = useState(null)
  const location = useLocation()
  const [jobDone, setJobDone] = useState(!!location.state?.autoShow)
  const [gapsOpen, setGapsOpen] = useState(false)
  const [showInjectDialog, setShowInjectDialog] = useState(false)
  const [reasonFilter, setReasonFilter] = useState('ALL')
  const [selectedRows, setSelectedRows] = useState({})

  const { jobs } = useJobStore()
  const { simulate } = useJobSimulator()
  const { setLastJobType } = useChatStore()
  const jobData = currentJobId ? jobs[currentJobId] : null
  const isRunning = jobData && !jobData.complete && !jobData.failed

  const handleAnalyse = () => {
    if (!commitSha) { toast.error('Please enter a Commit SHA'); return }
    setJobDone(false)
    const jobId = simulate(STEPS, {
      type: 'impact',
      delay: 700,
      onComplete: () => { setJobDone(true); setLastJobType('impact'); toast.success('Impact analysis complete!') },
    })
    setCurrentJobId(jobId)
  }

  const r = DEMO_IMPACT_RESULT
  const risk = RISK_CONFIG[r.risk_level]

  const filteredTests = useMemo(
    () => reasonFilter === 'ALL' ? r.test_plan : r.test_plan.filter((t) => t.reason === reasonFilter),
    [reasonFilter, r.test_plan] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const columns = useMemo(() => [
    colHelper.display({
      id: 'select',
      header: '',
      cell: (info) => {
        const rowId = info.row.original.id
        const checked = selectedRows[rowId] ?? info.row.original.selected
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setSelectedRows((s) => ({ ...s, [rowId]: e.target.checked }))}
            className="accent-td-green"
          />
        )
      },
    }),
    colHelper.accessor('name', {
      header: 'Test Name',
      cell: (i) => <span className="text-xs font-mono text-foreground">{i.getValue()}</span>,
    }),
    colHelper.accessor('score', {
      header: 'Score',
      cell: (i) => {
        const v = i.getValue()
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-muted rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-td-green" style={{ width: `${v * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{(v * 100).toFixed(0)}%</span>
          </div>
        )
      },
    }),
    colHelper.accessor('reason', {
      header: 'Reason',
      cell: (i) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${REASON_COLORS[i.getValue()]}`}>
          {i.getValue()}
        </span>
      ),
    }),
    colHelper.accessor('last_run', {
      header: 'Last Run',
      cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue()}</span>,
    }),
  ], [selectedRows])

  const table = useReactTable({
    data: filteredTests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4 animate-fade-in" data-testid="impact-module">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Impact Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assess test impact for code changes, commits, and PRs</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">
          Auto-triggered on PR
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-4 py-2 overflow-x-auto">
        <StepProgress steps={STEPS} jobData={jobData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* INPUT */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Input Configuration</h2>
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">This module also runs automatically on PR creation. Manual analysis is available for any commit.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Commit SHA *</label>
            <div className="flex gap-2">
              <input
                data-testid="impact-commit-sha"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="a3f9e2c"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
              />
              <button className="px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Repository</label>
            <input
              data-testid="impact-repo"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="td-digital-banking/payment-processor"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">PR ID (optional)</label>
            <input
              data-testid="impact-pr-id"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="PR-892"
              value={prId}
              onChange={(e) => setPrId(e.target.value)}
            />
          </div>

          <button
            data-testid="impact-analyse-btn"
            onClick={handleAnalyse}
            disabled={isRunning || !commitSha}
            className="w-full py-2.5 bg-td-green text-white text-sm font-semibold rounded-lg hover:bg-td-dark-green transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</> : 'Analyse Impact'}
          </button>
        </div>

        {/* OUTPUT */}
        <div className="space-y-4">
          {!jobDone ? (
            <div className="bg-card border border-border rounded-xl p-5 min-h-[300px] flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <div className="space-y-2"><Loader2 className="w-8 h-8 text-td-green animate-spin mx-auto" /><p className="text-sm text-muted-foreground">Analysing impact...</p></div>
              ) : (
                <><Search className="w-10 h-10 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Enter a Commit SHA to analyse impact</p></>
              )}
            </div>
          ) : (
            <>
              {/* Risk Banner + Summary */}
              <div className={`flex items-center gap-3 p-4 border rounded-xl ${risk.classes}`}>
                <span className="text-xl font-bold">{risk.label}</span>
                <div className="flex gap-4 ml-auto text-sm">
                  <div className="text-center"><p className="font-bold text-lg">{r.direct_tests}</p><p className="text-[10px] opacity-70">Direct</p></div>
                  <div className="text-center"><p className="font-bold text-lg">{r.indirect_tests}</p><p className="text-[10px] opacity-70">Indirect</p></div>
                  <div className="text-center"><p className="font-bold text-lg">{r.total_recommended}</p><p className="text-[10px] opacity-70">Recommended</p></div>
                  <div className="text-center"><p className="font-bold text-lg">{r.reduction_pct}%</p><p className="text-[10px] opacity-70">Reduction</p></div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground mb-2">Test Distribution</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={r.donut_data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" nameKey="name">
                      {r.donut_data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Test Plan Table - Full Width */}
      {jobDone && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Test Execution Plan</span>
              <div className="flex gap-2">
                {['ALL', 'DIRECT', 'INDIRECT', 'MODULE'].map((f) => (
                  <button
                    key={f}
                    data-testid={`impact-filter-${f.toLowerCase()}`}
                    onClick={() => setReasonFilter(f)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                      reasonFilter === f ? 'bg-td-green text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  data-testid="impact-inject-btn"
                  onClick={() => setShowInjectDialog(true)}
                  className="ml-2 text-xs px-3 py-1 bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
                >
                  Inject into CI/CD
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full">
                <thead className="sticky top-0">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="bg-muted/50 border-b border-border">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className={`hover:bg-muted/20 ${i % 2 ? 'bg-muted/10' : ''}`}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coverage Gaps */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              data-testid="impact-gaps-accordion"
              onClick={() => setGapsOpen((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                Coverage Gaps
                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">{r.coverage_gaps.length}</span>
              </span>
              {gapsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {gapsOpen && (
              <div className="px-4 pb-4 space-y-2 animate-fade-in">
                {r.coverage_gaps.map((gap, i) => (
                  <div key={i} className="p-3 bg-muted/30 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs text-foreground font-mono">{gap.file}</code>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        gap.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{gap.risk}</span>
                      <span className="text-[10px] text-muted-foreground">{gap.lines_uncovered} lines uncovered</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{gap.assessment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <FeedbackWidget jobId={currentJobId} moduleType="impact" />
        </div>
      )}

      {/* Inject Dialog */}
      <CenteredDialog
        open={showInjectDialog}
        onOpenChange={setShowInjectDialog}
        title="Inject into CI/CD"
        width="400px"
      >
        <p className="text-sm text-muted-foreground mb-4">
          This will inject the optimised test plan ({r.total_recommended} tests) into your CI/CD pipeline for this commit.
        </p>
        <div className="p-3 bg-td-green/10 border border-td-green/30 rounded-lg mb-4 text-xs text-foreground">
          Commit: <code className="font-mono font-bold">{r.commit_sha}</code> · Repo: {r.repository}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowInjectDialog(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground">Cancel</button>
          <button
            data-testid="impact-inject-confirm-btn"
            onClick={() => { setShowInjectDialog(false); toast.success('Test plan injected into CI/CD pipeline!') }}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Confirm Injection
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}

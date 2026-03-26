import { useState, useMemo, useEffect } from 'react'
import { useJobStore, useChatStore, useAppStore } from '@/store'
import { useJobSimulator } from '@/hooks/useJobs'
import StepProgress from '@/components/shared/StepProgress'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, createColumnHelper
} from '@tanstack/react-table'
import { DEMO_REGRESSION_RESULT, DEMO_JTMF_SUITES } from '@/lib/demo-data'
import * as Tabs from '@radix-ui/react-tabs'
import { ChevronDown, ChevronUp, Loader2, BarChart3, RefreshCw, Download } from 'lucide-react'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const STEPS = ['Loading History', 'Scoring Flakiness', 'Building Vectors', 'Clustering', 'Risk Scoring', 'LLM Validation', 'Coverage Check', 'Ready']
const colHelper = createColumnHelper()

const DECISION_COLORS = {
  INCLUDE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXCLUDE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  FLAKY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function SparkLine({ data }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm bg-amber-400"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

export default function RegressionModule() {
  const [selectedSuite, setSelectedSuite] = useState('')
  const [riskProfile, setRiskProfile] = useState('')
  const [riskProfileExpanded, setRiskProfileExpanded] = useState(false)
  const [currentJobId, setCurrentJobId] = useState(null)
  const location = useLocation()
  const [jobDone, setJobDone] = useState(!!location.state?.autoShow)
  const [expandedRow, setExpandedRow] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showInjectDialog, setShowInjectDialog] = useState(false)
  const [decisionFilter, setDecisionFilter] = useState('ALL')

  const { isDark } = useAppStore()
  const { jobs } = useJobStore()
  const { simulate } = useJobSimulator()
  const { setLastJobType } = useChatStore()
  const jobData = currentJobId ? jobs[currentJobId] : null
  const isRunning = jobData && !jobData.complete && !jobData.failed

  const handleOptimise = () => {
    if (!selectedSuite) { toast.error('Please select a JTMF suite'); return }
    setJobDone(false)
    const jobId = simulate(STEPS, {
      type: 'regression',
      delay: 700,
      onComplete: () => { setJobDone(true); setLastJobType('regression'); toast.success('Regression suite optimised!') },
    })
    setCurrentJobId(jobId)
  }

  const r = DEMO_REGRESSION_RESULT
  const filteredTests = decisionFilter === 'ALL'
    ? r.tests
    : r.tests.filter((t) => t.decision === decisionFilter)

  const columns = useMemo(() => [
    colHelper.accessor('name', {
      header: 'Test Name',
      cell: (info) => (
        <button
          data-testid={`regression-row-${info.row.original.id}`}
          onClick={() => setExpandedRow(expandedRow === info.row.original.id ? null : info.row.original.id)}
          className="text-xs font-mono text-left text-foreground hover:text-td-green transition-colors flex items-center gap-1"
        >
          {expandedRow === info.row.original.id ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
          {info.getValue()}
        </button>
      ),
    }),
    colHelper.accessor('score', {
      header: 'Score',
      cell: (info) => {
        const v = info.getValue()
        const color = v >= 0.8 ? 'bg-td-green' : v >= 0.5 ? 'bg-amber-500' : 'bg-gray-400'
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-muted rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${v * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-6">{(v * 100).toFixed(0)}</span>
          </div>
        )
      },
    }),
    colHelper.accessor('flakiness', {
      header: 'Flakiness',
      cell: (info) => {
        const v = info.getValue()
        return (
          <span className={`text-xs ${v > 0.1 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
            {(v * 100).toFixed(0)}%
          </span>
        )
      },
    }),
    colHelper.accessor('defect_links', {
      header: 'Defects',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((d) => (
            <span key={d} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded font-mono">{d}</span>
          ))}
        </div>
      ),
    }),
    colHelper.accessor('decision', {
      header: 'Decision',
      cell: (info) => {
        const rowId = info.row.original.id
        const decision = overrides[rowId] || info.getValue()
        return (
          <select
            data-testid={`regression-decision-${rowId}`}
            value={decision}
            onChange={(e) => setOverrides((prev) => ({ ...prev, [rowId]: e.target.value }))}
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border-0 cursor-pointer ${DECISION_COLORS[decision]}`}
          >
            {['INCLUDE', 'EXCLUDE', 'FLAKY'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )
      },
    }),
  ], [expandedRow, overrides])

  const table = useReactTable({
    data: filteredTests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4 animate-fade-in" data-testid="regression-module">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Regression Optimizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered regression suite optimisation with risk scoring</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-td-green/10 text-td-green rounded-full font-medium">LLM-validated</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-4 py-2 overflow-x-auto">
        <StepProgress steps={STEPS} jobData={jobData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* INPUT */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Input Configuration</h2>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">JTMF Suite *</label>
            <select
              data-testid="regression-suite-select"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedSuite}
              onChange={(e) => setSelectedSuite(e.target.value)}
            >
              <option value="">Select a suite...</option>
              {DEMO_JTMF_SUITES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => setRiskProfileExpanded((s) => !s)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Release Risk Profile (optional)
              {riskProfileExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {riskProfileExpanded && (
              <textarea
                data-testid="regression-risk-profile"
                className="mt-2 w-full px-3 py-2 bg-input border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={4}
                placeholder='{"critical_services": ["payment-processor"], "risk_level": "HIGH"}'
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value)}
              />
            )}
          </div>

          <button
            data-testid="regression-optimise-btn"
            onClick={handleOptimise}
            disabled={isRunning || !selectedSuite}
            className="w-full py-2.5 bg-td-green text-white text-sm font-semibold rounded-lg hover:bg-td-dark-green transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Optimising...</> : 'Optimise Suite'}
          </button>
        </div>

        {/* OUTPUT Summary */}
        <div className="space-y-4">
          {!jobDone ? (
            <div className="bg-card border border-border rounded-xl p-5 min-h-[300px] flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <div className="space-y-2"><Loader2 className="w-8 h-8 text-td-green animate-spin mx-auto" /><p className="text-sm text-muted-foreground">Optimising regression suite...</p></div>
              ) : (
                <><BarChart3 className="w-10 h-10 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Select a JTMF suite to optimise</p></>
              )}
            </div>
          ) : (
            <>
              {/* Summary Banner */}
              <div className="p-4 bg-td-green/10 border border-td-green/30 rounded-xl">
                <p className="text-sm font-bold text-td-green">
                  {r.original_count.toLocaleString()} → {r.optimized_count.toLocaleString()} tests ({r.reduction_pct}% reduction)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.coverage_preserved}% coverage preserved
                </p>
              </div>

              {/* Score Distribution */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground mb-2">Risk Score Distribution</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={r.score_distribution} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                    <Bar dataKey="count" fill="#007A33" radius={[3, 3, 0, 0]} name="Tests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Test Scoring Table + Tabs - Full Width */}
      {jobDone && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Tabs.Root defaultValue="all">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <Tabs.List className="flex gap-1">
                  {[
                    { value: 'all', label: 'All Tests' },
                    { value: 'flaky', label: `Flaky (${r.flaky_tests.length})` },
                    { value: 'coverage', label: 'Coverage' },
                  ].map((t) => (
                    <Tabs.Trigger
                      key={t.value}
                      value={t.value}
                      data-testid={`regression-tab-${t.value}`}
                      className="px-3 py-1 text-xs font-medium rounded-md data-[state=active]:bg-td-green data-[state=active]:text-white text-muted-foreground hover:text-foreground transition-all"
                    >
                      {t.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    {['ALL', 'INCLUDE', 'EXCLUDE', 'FLAKY'].map((f) => (
                      <button
                        key={f}
                        data-testid={`regression-filter-${f.toLowerCase()}`}
                        onClick={() => setDecisionFilter(f)}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                          decisionFilter === f ? 'bg-td-green text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    data-testid="regression-export-btn"
                    onClick={() => setShowExportDialog(true)}
                    className="text-xs px-2.5 py-1 border border-border rounded hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                  <button
                    data-testid="regression-inject-btn"
                    onClick={() => setShowInjectDialog(true)}
                    className="text-xs px-2.5 py-1 bg-td-green text-white rounded hover:bg-td-dark-green transition-colors"
                  >
                    Inject CI/CD
                  </button>
                </div>
              </div>

              <Tabs.Content value="all">
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
                      {table.getRowModel().rows.map((row, i) => {
                        const rowData = row.original
                        return (
                          <>
                            <tr key={row.id} className={`hover:bg-muted/20 ${i % 2 ? 'bg-muted/10' : ''}`}>
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                              ))}
                            </tr>
                            {expandedRow === rowData.id && (
                              <tr key={`${row.id}-expanded`} className="bg-muted/5">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">LLM Rationale</p>
                                    <p className="text-xs text-foreground">{rowData.rationale}</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Tabs.Content>

              <Tabs.Content value="flaky" className="p-4 space-y-3">
                {r.flaky_tests.map((ft, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex-1">
                      <p className="text-xs font-mono font-medium text-foreground">{ft.name}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">{(ft.flakiness * 100).toFixed(0)}% flakiness rate</p>
                    </div>
                    <SparkLine data={ft.trend} />
                    <button
                      data-testid={`regression-sprint-task-${i}`}
                      onClick={() => toast.success('Sprint task created!')}
                      className="text-xs px-2.5 py-1 border border-border rounded hover:bg-muted transition-colors text-foreground"
                    >
                      Create Sprint Task
                    </button>
                  </div>
                ))}
              </Tabs.Content>

              <Tabs.Content value="coverage" className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Full suite vs optimised suite coverage by code zone</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={[
                    { zone: 'Payments', full: 94, optimised: 91 },
                    { zone: 'Accounts', full: 88, optimised: 85 },
                    { zone: 'Auth', full: 97, optimised: 97 },
                    { zone: 'Transfers', full: 82, optimised: 79 },
                    { zone: 'Reports', full: 71, optimised: 65 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="zone" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[50, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                    <Bar dataKey="full" fill="#C8E6D5" radius={[3, 3, 0, 0]} name="Full Suite" />
                    <Bar dataKey="optimised" fill="#007A33" radius={[3, 3, 0, 0]} name="Optimised" />
                  </BarChart>
                </ResponsiveContainer>
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Executive Summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Executive Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{r.executive_summary}</p>
          </div>

          <FeedbackWidget jobId={currentJobId} moduleType="regression" />
        </div>
      )}

      {/* Export Dialog */}
      <CenteredDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="Export Test Plan"
        description="Choose export format"
        width="360px"
      >
        <div className="grid grid-cols-2 gap-2">
          {['.json', '.csv', '.xml (JTMF)', '.yaml'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => { setShowExportDialog(false); toast.success(`Exported as ${fmt}`) }}
              className="p-3 border border-border rounded-lg text-sm text-foreground hover:border-td-green hover:text-td-green transition-all"
            >
              {fmt}
            </button>
          ))}
        </div>
        <button onClick={() => setShowExportDialog(false)} className="mt-4 w-full py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          Cancel
        </button>
      </CenteredDialog>

      {/* Inject Dialog */}
      <CenteredDialog
        open={showInjectDialog}
        onOpenChange={setShowInjectDialog}
        title="Inject into CI/CD"
        width="400px"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Inject optimised suite ({r.optimized_count} tests) from {r.suite} into your pipeline.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowInjectDialog(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground">Cancel</button>
          <button
            data-testid="regression-inject-confirm-btn"
            onClick={() => { setShowInjectDialog(false); toast.success('Optimised suite injected into CI/CD!') }}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Confirm Injection
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}

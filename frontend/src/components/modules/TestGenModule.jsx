import { useState, useEffect } from 'react'
import { useJobStore, useChatStore, useAppStore } from '@/store'
import { useJobSimulator } from '@/hooks/useJobs'
import StepProgress from '@/components/shared/StepProgress'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import Editor from '@monaco-editor/react'
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper
} from '@tanstack/react-table'
import {
  DEMO_JIRA_STORY, DEMO_TESTGEN_FEATURE, DEMO_TESTGEN_DATA
} from '@/lib/demo-data'
import { RefreshCw, Loader2, FileText } from 'lucide-react'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useLocation } from 'react-router-dom'

const STEPS = ['Fetching Story', 'Checking Coverage', 'RAG Enrichment', 'Generating Scenarios', 'Synthesising Data', 'Validating', 'Ready']
const colHelper = createColumnHelper()

export default function TestGenModule() {
  const [jiraId, setJiraId] = useState('')
  const [story, setStory] = useState(null)
  const [useText, setUseText] = useState(false)
  const [acText, setAcText] = useState('')
  const [domain, setDomain] = useState('Payments')
  const [jtmfSuiteId, setJtmfSuiteId] = useState('')
  const [currentJobId, setCurrentJobId] = useState(null)
  const location = useLocation()
  const [jobDone, setJobDone] = useState(!!location.state?.autoShow)
  const [showJiraDialog, setShowJiraDialog] = useState(false)
  const [fetchingStory, setFetchingStory] = useState(false)

  const { isDark, demoMode } = useAppStore()

  const { jobs } = useJobStore()
  const { simulate } = useJobSimulator()
  const { setLastJobType } = useChatStore()
  const jobData = currentJobId ? jobs[currentJobId] : null
  const isRunning = jobData && !jobData.complete && !jobData.failed

  const handleFetchStory = async () => {
    if (!jiraId) return
    setFetchingStory(true)
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 800))
        setStory(DEMO_JIRA_STORY)
      } else {
        const res = await api.get(`/api/v1/jira/story/${jiraId}`)
        setStory(res.data)
      }
    } catch { toast.error('Jira story not found') }
    finally { setFetchingStory(false) }
  }

  const handleGenerate = () => {
    if (!story && !useText) { toast.error('Fetch a Jira story or paste acceptance criteria'); return }

    setJobDone(false)
    const jobId = simulate(STEPS, {
      type: 'test-gen',
      delay: 700,
      onComplete: () => {
        setJobDone(true)
        setLastJobType('test-gen')
        toast.success('Test scenarios generated!')
      },
    })
    setCurrentJobId(jobId)
  }

  const columns = [
    colHelper.accessor('scenario', { header: 'Scenario', cell: (i) => <span className="font-medium text-foreground text-xs">{i.getValue()}</span> }),
    colHelper.accessor('amount', {
      header: 'Amount (CAD)',
      cell: (i) => <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{i.getValue()}</span>
    }),
    colHelper.accessor('account_type', {
      header: 'Account Type',
      cell: (i) => <span className="text-xs font-mono text-foreground">{i.getValue()}</span>
    }),
    colHelper.accessor('expected_fee', {
      header: 'Expected Fee',
      cell: (i) => <span className={`text-xs font-mono ${i.getValue() === 'N/A' ? 'text-gray-400 italic' : 'text-td-green font-medium'}`}>{i.getValue()}</span>
    }),
    colHelper.accessor('expected_result', {
      header: 'Expected Result',
      cell: (i) => <span className="text-xs text-foreground">{i.getValue()}</span>
    }),
  ]

  const table = useReactTable({ data: DEMO_TESTGEN_DATA, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-4 animate-fade-in" data-testid="testgen-module">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Test Generation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate Gherkin BDD scenarios from Jira acceptance criteria</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full font-medium">JTMF-aware</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-4 py-2 overflow-x-auto">
        <StepProgress steps={STEPS} jobData={jobData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* INPUT */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Input Configuration</h2>

          {/* Toggle */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[{ v: false, l: 'Jira Story' }, { v: true, l: 'Paste Text' }].map(({ v, l }) => (
              <button
                key={String(v)}
                data-testid={`testgen-mode-${v ? 'text' : 'jira'}`}
                onClick={() => setUseText(v)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  useText === v ? 'bg-white dark:bg-[#1A3626] shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {!useText ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Jira Story ID</label>
              <div className="flex gap-2">
                <input
                  data-testid="testgen-jira-id"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="TDB-1482"
                  value={jiraId}
                  onChange={(e) => setJiraId(e.target.value.toUpperCase())}
                />
                <button
                  data-testid="testgen-fetch-story-btn"
                  onClick={handleFetchStory}
                  disabled={!jiraId || fetchingStory}
                  className="px-3 py-2 bg-td-green text-white text-xs font-medium rounded-lg hover:bg-td-dark-green transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {fetchingStory ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fetch Story'}
                </button>
              </div>
              {story && (
                <div className="mt-2 p-3 bg-td-green/10 border border-td-green/20 rounded-lg animate-fade-in">
                  <p className="text-xs font-semibold text-td-green">{story.id}: {story.title}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {story.acceptance_criteria.map((ac, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <span className="text-td-green mt-0.5">•</span> {ac}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Acceptance Criteria</label>
              <textarea
                data-testid="testgen-ac-textarea"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={5}
                placeholder="As a user... I want to... So that..."
                value={acText}
                onChange={(e) => setAcText(e.target.value)}
              />
            </div>
          )}

          {/* Domain */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Domain Tag</label>
            <select
              data-testid="testgen-domain-select"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              {['Payments', 'Accounts', 'Lending', 'Transfers', 'Other'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* JTMF Suite */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">JTMF Suite ID (optional)</label>
            <input
              data-testid="testgen-jtmf-id"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="TDB-PAYMENTS-E2E"
              value={jtmfSuiteId}
              onChange={(e) => setJtmfSuiteId(e.target.value)}
            />
          </div>

          <button
            data-testid="testgen-generate-btn"
            onClick={handleGenerate}
            disabled={isRunning || (!story && !useText)}
            className="w-full py-2.5 bg-td-green text-white text-sm font-semibold rounded-lg hover:bg-td-dark-green transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : 'Generate Tests'}
          </button>
        </div>

        {/* OUTPUT */}
        <div className="space-y-4">
          {!jobDone ? (
            <div className="bg-card border border-border rounded-xl p-5 min-h-[300px] flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 text-td-green animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Generating test scenarios...</p>
                </div>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Configure inputs and click Generate Tests</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Generated Feature File</span>
                  <div className="flex gap-2">
                    <button
                      data-testid="testgen-regen-btn"
                      className="text-xs px-2.5 py-1 border border-border rounded hover:bg-muted transition-colors flex items-center gap-1 text-muted-foreground"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                    <button
                      data-testid="testgen-jira-tasks-btn"
                      onClick={() => setShowJiraDialog(true)}
                      className="text-xs px-2.5 py-1 bg-td-green text-white rounded hover:bg-td-dark-green transition-colors"
                    >
                      Create Jira Sub-tasks
                    </button>
                  </div>
                </div>
                <Editor
                  height="280px"
                  language="gherkin"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={DEMO_TESTGEN_FEATURE}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, wordWrap: 'on' }}
                />
              </div>

              {/* Examples Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Test Data Examples</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="bg-muted/30 border-b border-border">
                          {hg.headers.map((h) => (
                            <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                            <td key={cell.id} className="px-3 py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <FeedbackWidget jobId={currentJobId} moduleType="test-gen" />
            </>
          )}
        </div>
      </div>

      {/* Jira Tasks Dialog */}
      <CenteredDialog
        open={showJiraDialog}
        onOpenChange={setShowJiraDialog}
        title="Create Jira Sub-tasks"
        width="480px"
      >
        <p className="text-sm text-muted-foreground mb-3">The following sub-tasks will be created under {jiraId || 'TDB-1482'}:</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {DEMO_JIRA_STORY.acceptance_criteria.map((ac, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
              <span className="text-xs bg-td-green/10 text-td-green px-1.5 py-0.5 rounded font-mono">{DEMO_JIRA_STORY.id}-{100 + i}</span>
              <span className="text-xs text-foreground">{ac}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowJiraDialog(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground">Cancel</button>
          <button
            data-testid="testgen-jira-confirm-btn"
            onClick={() => { setShowJiraDialog(false); toast.success('Jira sub-tasks created successfully!') }}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Create {DEMO_JIRA_STORY.acceptance_criteria.length} Sub-tasks
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}

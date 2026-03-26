import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useJobStore, useChatStore } from '@/store'
import { useJobSimulator } from '@/hooks/useJobs'
import { useAppStore } from '@/store'
import StepProgress from '@/components/shared/StepProgress'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import Editor, { DiffEditor } from '@monaco-editor/react'
import {
  DEMO_TOSCA_ORIGINAL, DEMO_TOSCA_GENERATED, DEMO_TOSCA_QUALITY
} from '@/lib/demo-data'
import {
  Upload, GitBranch, AlertTriangle, Download, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, RefreshCw, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useLocation } from 'react-router-dom'
import { CenteredDialog } from '@/components/shared/CenteredDialog'

const STEPS = ['Validating', 'Parsing', 'Mapping', 'RAG Enrichment', 'Generating', 'Compiling', 'Ready']

export default function ToscaModule() {
  const [mode, setMode] = useState('upload')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [gitPath, setGitPath] = useState('')
  const [framework, setFramework] = useState('TypeScript')
  const [browser, setBrowser] = useState('Chromium')
  const [baseUrl, setBaseUrl] = useState('')
  const [jiraId, setJiraId] = useState('')
  const [jiraPreview, setJiraPreview] = useState(null)
  const [currentJobId, setCurrentJobId] = useState(null)
  const location = useLocation()
  const [jobDone, setJobDone] = useState(!!location.state?.autoShow)
  const [qualityOpen, setQualityOpen] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [showBranchDialog, setShowBranchDialog] = useState(false)

  const { isDark, demoMode } = useAppStore()
  const { jobs } = useJobStore()
  const { simulate } = useJobSimulator()
  const { setLastJobType } = useChatStore()

  const jobData = currentJobId ? jobs[currentJobId] : null

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/xml': ['.xml', '.tca', '.tsu'] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    onDrop: (files) => setUploadedFile(files[0]),
    onDropRejected: () => toast.error('File too large or unsupported format'),
  })

  const handleRun = () => {
    if (mode === 'upload' && !uploadedFile) { toast.error('Please upload a Tosca file'); return }
    if (mode === 'git' && !gitPath) { toast.error('Please enter a git path'); return }

    setJobDone(false)
    const jobId = simulate(STEPS, {
      type: 'tosca',
      delay: 700,
      onComplete: () => {
        setJobDone(true)
        setLastJobType('tosca')
        toast.success('Tosca conversion complete!')
      },
    })
    setCurrentJobId(jobId)
  }

  const handleRerun = () => {
    setJobDone(false)
    setCurrentJobId(null)
    const jobId = simulate(STEPS, {
      type: 'tosca',
      delay: 700,
      onComplete: () => { setJobDone(true); setLastJobType('tosca'); toast.success('Re-run complete!') },
    })
    setCurrentJobId(jobId)
  }

  useEffect(() => {
    if (location.state?.rerun && demoMode) {
      window.history.replaceState({}, document.title)
      toast.info('Re-running job with demo parameters...')
      setTimeout(() => handleRerun(), 400)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJiraLookup = async () => {
    if (!jiraId) return
    if (demoMode) {
      setJiraPreview({ id: jiraId, title: 'Interac e-Transfer: Add international transfer fee validation' })
      return
    }
    try {
      const res = await api.get(`/api/v1/jira/story/${jiraId}`)
      setJiraPreview(res.data)
    } catch { toast.error('Jira story not found') }
  }

  const isRunning = jobData && !jobData.complete && !jobData.failed
  const canRun = !isRunning && (mode === 'upload' ? !!uploadedFile : !!gitPath)

  return (
    <div className="space-y-4 animate-fade-in" data-testid="tosca-module">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Tosca Conversion</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Convert Tosca TCA/TSU test cases to Playwright TypeScript</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">
          RAG-enhanced
        </span>
      </div>

      {/* Step Progress */}
      <div className="bg-card border border-border rounded-xl px-4 py-2 overflow-x-auto">
        <StepProgress steps={STEPS} jobData={jobData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* INPUT PANEL */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Input Configuration</h2>

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
              {['upload', 'git'].map((m) => (
                <button
                  key={m}
                  data-testid={`tosca-mode-${m}`}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                    mode === m ? 'bg-white dark:bg-[#1A3626] shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'upload' ? <Upload className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                  {m === 'upload' ? 'Upload File' : 'Git Path'}
                </button>
              ))}
            </div>

            {/* Dropzone */}
            {mode === 'upload' && (
              <div>
                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-3 bg-td-green/10 border border-td-green/20 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-td-green flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-destructive">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    data-testid="tosca-file-dropzone"
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragActive ? 'border-td-green bg-td-green/5' : 'border-border hover:border-td-green/50 hover:bg-muted/30'
                    }`}
                  >
                    <input {...getInputProps()} data-testid="tosca-file-input" />
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drop .tca .tsu .xml here</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                  </div>
                )}
              </div>
            )}

            {mode === 'git' && (
              <input
                data-testid="tosca-git-path-input"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="src/test/tosca/TC_PaymentTransfer.tca"
                value={gitPath}
                onChange={(e) => setGitPath(e.target.value)}
              />
            )}

            {/* Framework */}
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Framework</label>
              <div className="flex gap-3">
                {['TypeScript', 'JavaScript'].map((fw) => (
                  <label key={fw} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="framework"
                      value={fw}
                      checked={framework === fw}
                      onChange={() => setFramework(fw)}
                      className="accent-td-green"
                    />
                    <span className="text-sm text-foreground">{fw}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Browser */}
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Browser Target</label>
              <select
                data-testid="tosca-browser-select"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
              >
                {['Chromium', 'Firefox', 'WebKit'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* Base URL */}
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Base URL</label>
              <input
                data-testid="tosca-base-url"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://tdbank.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            {/* Jira ID */}
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Jira Story ID (optional)</label>
              <div className="flex gap-2">
                <input
                  data-testid="tosca-jira-id"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="TD-1234"
                  value={jiraId}
                  onChange={(e) => setJiraId(e.target.value.toUpperCase())}
                />
                <button
                  data-testid="tosca-jira-lookup-btn"
                  onClick={handleJiraLookup}
                  disabled={!jiraId}
                  className="px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Lookup
                </button>
              </div>
              {jiraPreview && (
                <p className="text-xs text-td-green mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {jiraPreview.id}: {jiraPreview.title}
                </p>
              )}
            </div>

            {/* Run Button */}
            <button
              data-testid="tosca-run-btn"
              onClick={handleRun}
              disabled={!canRun}
              className="w-full mt-5 py-2.5 bg-td-green text-white text-sm font-semibold rounded-lg hover:bg-td-dark-green transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : 'Run Conversion'}
            </button>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="space-y-4">
          {!jobDone ? (
            <div className="bg-card border border-border rounded-xl p-5 h-full flex flex-col items-center justify-center text-center min-h-[300px]">
              {isRunning ? (
                <div className="space-y-3">
                  <Loader2 className="w-8 h-8 text-td-green animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Converting your Tosca test case...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <RefreshCw className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Configure inputs and click Run Conversion</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Original (Tosca XML)</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs font-semibold text-td-green">Generated (Playwright TS)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      data-testid="tosca-rerun-btn"
                      onClick={handleRerun}
                      className="text-xs px-3 py-1 border border-border rounded text-muted-foreground hover:text-td-green hover:border-td-green/50 hover:bg-td-green/5 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-run
                    </button>
                    <a
                      data-testid="tosca-download-btn"
                      href={`data:text/typescript;charset=utf-8,${encodeURIComponent(DEMO_TOSCA_GENERATED)}`}
                      download="TC_PaymentTransfer.spec.ts"
                      className="text-xs px-3 py-1 bg-td-green text-white rounded font-medium hover:bg-td-dark-green transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Approve & Download
                    </a>
                    <button
                      data-testid="tosca-commit-btn"
                      onClick={() => setShowBranchDialog(true)}
                      className="text-xs px-3 py-1 border border-border rounded font-medium hover:bg-muted transition-colors flex items-center gap-1"
                    >
                      <GitBranch className="w-3 h-3" /> Commit to Git
                    </button>
                  </div>
                </div>

                {/* Low confidence warning */}
                {DEMO_TOSCA_QUALITY.low_confidence > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {DEMO_TOSCA_QUALITY.low_confidence} low-confidence step(s) detected — review highlighted lines
                    </span>
                  </div>
                )}

                <DiffEditor
                  height="320px"
                  language="xml"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  original={DEMO_TOSCA_ORIGINAL}
                  modified={DEMO_TOSCA_GENERATED}
                  options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12 }}
                />
              </div>

              {/* Quality Report */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  data-testid="tosca-quality-accordion"
                  onClick={() => setQualityOpen((s) => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">Quality Report</span>
                  {qualityOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {qualityOpen && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Total Steps', value: DEMO_TOSCA_QUALITY.total_steps },
                        { label: 'Converted', value: DEMO_TOSCA_QUALITY.converted, positive: true },
                        { label: 'Low Confidence', value: DEMO_TOSCA_QUALITY.low_confidence, warning: true },
                        { label: 'Compilation', value: DEMO_TOSCA_QUALITY.compilation_status, isText: true },
                      ].map(({ label, value, positive, warning, isText }) => (
                        <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                          <p className={`text-lg font-bold ${positive ? 'text-td-green' : warning ? 'text-amber-600' : 'text-foreground'}`}>
                            {value}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    {DEMO_TOSCA_QUALITY.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FeedbackWidget jobId={currentJobId} moduleType="tosca" />
            </>
          )}
        </div>
      </div>

      {/* Branch Dialog */}
      <CenteredDialog
        open={showBranchDialog}
        onOpenChange={setShowBranchDialog}
        title="Commit to Git"
        width="360px"
      >
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Branch Name</label>
        <input
          data-testid="tosca-branch-name-input"
          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="feat/tosca-migration-tc001"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowBranchDialog(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground">Cancel</button>
          <button
            data-testid="tosca-commit-confirm-btn"
            onClick={() => { setShowBranchDialog(false); toast.success(`Committed to branch: ${branchName || 'feat/tosca-migration'}`) }}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Commit
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}

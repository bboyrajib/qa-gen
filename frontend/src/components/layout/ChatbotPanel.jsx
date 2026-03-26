import { useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useChatSSE } from '@/hooks/useSSE'
import { useChatStore, useJobStore } from '@/store'
import { Send, Paperclip, X, MessageSquare, FileText, GitBranch, ChevronDown } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'

const CONTEXT_CHIPS = {
  tosca: ['Explain low-confidence steps', 'How to fix this Playwright locator?', 'What does RAG Enrichment do?'],
  'test-gen': ['Are there missing edge cases?', 'Generate more boundary scenarios'],
  rca: ['Why did this failure occur?', 'Show me the fix suggestion', 'What evidence confirms this?'],
  impact: ['Why are indirect tests included?', 'Explain the blast radius', 'How is risk score calculated?'],
  regression: ['Why was this test excluded?', 'Explain the flakiness score', 'What is the coverage impact?'],
}

export default function ChatbotPanel() {
  const [input, setInput] = useState('')
  const [contextTab, setContextTab] = useState('kb')
  const [repoUrl, setRepoUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const { sendMessage, cleanup } = useChatSSE()
  const { messages, isStreaming, streamingContent, lastJobType } = useChatStore()
  const { activeJobId, jobs } = useJobStore()

  const activeJobData = activeJobId ? jobs[activeJobId] : null
  const chips = CONTEXT_CHIPS[activeJobData?.type] || []

  // Cleanup SSE/intervals on unmount
  useEffect(() => () => cleanup(), [cleanup])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt', '.log'],
      'application/typescript': ['.ts'],
      'text/x-java-source': ['.java'],
      'text/x-python': ['.py'],
      'text/plain;charset=utf-8': ['.feature', '.xml'],
    },
    maxFiles: 1,
    onDrop: (files) => setUploadedFile(files[0]),
  })

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 72) + 'px'
  }

  return (
    <aside
      data-testid="chatbot-panel"
      className="fixed right-0 top-0 bottom-0 w-[380px] z-30 bg-white dark:bg-[#0D1F14] border-l border-border flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-td-green" />
        <span className="font-semibold text-sm text-foreground">QGenie Assistant</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 bg-td-green/10 text-td-green rounded-full font-medium">RAG-powered</span>
      </div>

      {/* Context Tabs */}
      <Tabs.Root value={contextTab} onValueChange={setContextTab}>
        <Tabs.List className="flex border-b border-border bg-muted/30 flex-shrink-0">
          {[
            { value: 'kb', label: 'KB', sub: 'Confluence + Jira' },
            { value: 'file', label: 'File', sub: 'Upload context' },
            { value: 'repo', label: 'Repo', sub: 'Git repository' },
          ].map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              data-testid={`chat-context-tab-${t.value}`}
              className="flex-1 py-2 text-center data-[state=active]:border-b-2 data-[state=active]:border-td-green data-[state=active]:text-td-green text-muted-foreground hover:text-foreground transition-colors"
            >
              <p className="text-xs font-semibold">{t.label}</p>
              <p className="text-[9px] text-muted-foreground">{t.sub}</p>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-shrink-0">
          <Tabs.Content value="kb" className="px-4 py-2">
            <p className="text-xs text-muted-foreground">Connected: Confluence + Jira + JTMF</p>
            <div className="flex gap-1 mt-1">
              {['Confluence', 'Jira', 'JTMF'].map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 bg-td-green/10 text-td-green rounded-full">{s}</span>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="file" className="px-4 py-2">
            {uploadedFile ? (
              <div className="flex items-center gap-2 p-2 bg-td-green/10 rounded-md">
                <FileText className="w-4 h-4 text-td-green" />
                <span className="text-xs text-foreground flex-1 truncate">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                data-testid="chat-file-dropzone"
                className={`border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-td-green bg-td-green/5' : 'border-border hover:border-td-green/50'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-xs text-muted-foreground">Drop .txt .log .ts .java .py .feature</p>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="repo" className="px-4 py-2">
            <div className="flex gap-2">
              <input
                data-testid="chat-repo-url-input"
                className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://github.com/org/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <button
                data-testid="chat-repo-connect-btn"
                className="px-3 py-1.5 text-xs bg-td-green text-white rounded font-medium hover:bg-td-dark-green transition-colors"
              >
                Connect
              </button>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Proactive Chips */}
      {chips.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Suggested</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                data-testid={`chat-chip-${chip.slice(0, 10)}`}
                onClick={() => { setInput(chip); textareaRef.current?.focus() }}
                className="text-[11px] px-2.5 py-1 bg-muted hover:bg-td-green/10 text-muted-foreground hover:text-td-green border border-border hover:border-td-green/30 rounded-full transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Ask me anything about your QA pipeline, test results, or failures.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed animate-fade-in ${
                msg.role === 'user'
                  ? 'bg-td-green text-white rounded-br-sm'
                  : 'bg-card border border-border text-foreground shadow-sm rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {msg.citations.map((c, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-black/10 rounded text-inherit opacity-70">
                      [{c.title}]
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl rounded-bl-sm px-3 py-2 text-xs bg-card border border-border text-foreground shadow-sm">
              {streamingContent ? (
                <p className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-1.5 h-3 bg-td-green ml-0.5 animate-pulse rounded-sm" /></p>
              ) : (
                <div className="flex items-center gap-1 py-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Row */}
      <div className="p-3 border-t border-border flex-shrink-0">
        {isStreaming && (
          <p className="text-[10px] text-muted-foreground text-center mb-1.5">QGenie is thinking...</p>
        )}
        <div className="flex items-end gap-2 bg-input border border-border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={textareaRef}
            data-testid="chat-input"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[20px] max-h-[72px] scrollbar-thin"
            placeholder="Ask a question... (Cmd+Enter to send)"
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <button
              data-testid="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-7 h-7 rounded-lg bg-td-green flex items-center justify-center text-white hover:bg-td-dark-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

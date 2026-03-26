import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

export default function StepProgress({ steps = [], jobData }) {
  const stepStatuses = jobData?.steps || {}

  const getStatus = (step) => stepStatuses[step] || 'pending'

  return (
    <div data-testid="step-progress" className="flex items-start gap-0 overflow-x-auto py-4 px-1">
      {steps.map((step, index) => {
        const status = getStatus(step)
        const isLast = index === steps.length - 1

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1 min-w-[90px]">
              {/* Circle */}
              <div className="relative">
                {status === 'complete' && (
                  <CheckCircle2 className="w-6 h-6 text-td-green" />
                )}
                {status === 'running' && (
                  <div className="relative w-6 h-6">
                    <div className="absolute inset-0 rounded-full bg-td-green/20 animate-pulse-ring" />
                    <div className="w-6 h-6 rounded-full border-2 border-td-green border-t-transparent animate-spin" />
                  </div>
                )}
                {status === 'error' && (
                  <AlertCircle className="w-6 h-6 text-destructive" />
                )}
                {status === 'pending' && (
                  <div className="w-6 h-6 rounded-full border-2 border-border bg-background" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium text-center leading-tight max-w-[80px] ${
                  status === 'complete'
                    ? 'text-td-green'
                    : status === 'running'
                    ? 'text-foreground font-semibold'
                    : status === 'error'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`h-0.5 w-8 mx-1 mt-[-14px] flex-shrink-0 transition-colors duration-300 ${
                  getStatus(steps[index + 1]) !== 'pending' || status === 'complete'
                    ? 'bg-td-green'
                    : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

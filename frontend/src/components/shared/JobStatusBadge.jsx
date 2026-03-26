import { Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  QUEUED: { label: 'Queued', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: null },
  RUNNING: { label: 'Running', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: true },
  COMPLETE: { label: 'Complete', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: null },
  FAILED: { label: 'Failed', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: null },
}

export default function JobStatusBadge({ status, small = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.QUEUED

  return (
    <span
      data-testid={`job-status-badge-${status?.toLowerCase()}`}
      className={`inline-flex items-center gap-1 font-medium rounded-full ${config.classes} ${
        small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
    >
      {config.icon && <Loader2 className={`animate-spin ${small ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />}
      {config.label}
    </span>
  )
}

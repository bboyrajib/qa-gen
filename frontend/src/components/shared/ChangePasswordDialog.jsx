import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { CenteredDialog } from '@/components/shared/CenteredDialog'

/**
 * Reusable change-password dialog.
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (v: boolean) => void — ignored when `forced` is true
 *   forced        boolean — when true the user cannot close without changing
 *   onSubmit      async (currentPassword: string, newPassword: string) => void
 *                 throw an Error to display an inline error message
 */
export default function ChangePasswordDialog({ open, onOpenChange, forced = false, onSubmit }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [showFields, setShowFields] = useState({ current: false, next: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = (v) => {
    if (!forced) onOpenChange?.(v)
  }

  const handleSubmit = async () => {
    setError('')
    if (form.next.length < 8) { setError('New password must be at least 8 characters'); return }
    if (form.next !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await onSubmit(form.current, form.next)
      setForm({ current: '', next: '', confirm: '' })
    } catch (e) {
      setError(e.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CenteredDialog
      open={open}
      onOpenChange={handleClose}
      title={forced ? 'Set Your New Password' : 'Change Password'}
      width="400px"
    >
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-4 h-4 text-td-green flex-shrink-0" />
        {forced ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 flex-1">
            Your account was created with a temporary password. Please set a new one to continue.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Enter your current password, then choose a new one.</p>
        )}
      </div>

      <div className="space-y-3">
        {!forced && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Password</label>
            <div className="relative mt-1">
              <input
                type={showFields.current ? 'text' : 'password'}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                autoFocus
              />
              <button type="button" onClick={() => setShowFields((s) => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {showFields.current ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Password</label>
          <div className="relative mt-1">
            <input
              type={showFields.next ? 'text' : 'password'}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring pr-10"
              value={form.next}
              onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
              autoFocus={forced}
            />
            <button type="button" onClick={() => setShowFields((s) => ({ ...s, next: !s.next }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {showFields.next ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
          <input
            type="password"
            className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {!forced && (
          <button
            onClick={() => handleClose(false)}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || (!forced && !form.current) || !form.next || !form.confirm}
          className="px-4 py-2 text-sm rounded-md bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Change Password'}
        </button>
      </div>
    </CenteredDialog>
  )
}

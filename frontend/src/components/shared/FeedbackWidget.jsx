import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'
import { useAppStore } from '@/store'
import { toast } from 'sonner'

export default function FeedbackWidget({ jobId, moduleType }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [thumbs, setThumbs] = useState(null)
  const [showCorrection, setShowCorrection] = useState(false)
  const [correction, setCorrection] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const demoMode = useAppStore((s) => s.demoMode)

  const handleSubmit = async () => {
    if (demoMode) {
      setSubmitted(true)
      toast.success('Thanks for your feedback!')
      return
    }
    try {
      await api.post('/api/v1/feedback/', {
        job_id: jobId,
        module_type: moduleType,
        rating,
        thumbs,
        correction: correction || null,
      })
      setSubmitted(true)
      toast.success('Thanks for your feedback!')
    } catch {
      toast.error('Failed to submit feedback')
    }
  }

  if (submitted) {
    return (
      <div
        data-testid="feedback-submitted"
        className="flex items-center gap-2 p-3 bg-td-green/10 border border-td-green/20 rounded-lg text-sm text-td-green font-medium"
      >
        <ThumbsUp className="w-4 h-4" />
        Thanks for your feedback!
      </div>
    )
  }

  return (
    <div data-testid="feedback-widget" className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Rate this output
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Star Rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              data-testid={`feedback-star-${star}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Thumbs */}
        <div className="flex gap-2">
          <button
            data-testid="feedback-thumbs-up"
            onClick={() => setThumbs('up')}
            className={`p-1.5 rounded-md border transition-colors ${
              thumbs === 'up'
                ? 'bg-td-green/10 border-td-green text-td-green'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            data-testid="feedback-thumbs-down"
            onClick={() => setThumbs('down')}
            className={`p-1.5 rounded-md border transition-colors ${
              thumbs === 'down'
                ? 'bg-destructive/10 border-destructive text-destructive'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>

        {/* Correction Toggle */}
        <button
          data-testid="feedback-correction-toggle"
          onClick={() => setShowCorrection((s) => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          Suggest correction
          {showCorrection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Correction Textarea */}
      {showCorrection && (
        <div className="mt-3 animate-fade-in">
          <textarea
            data-testid="feedback-correction-input"
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
            placeholder="Describe the correction needed..."
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-end mt-3">
        <button
          data-testid="feedback-submit-btn"
          onClick={handleSubmit}
          disabled={rating === 0 && thumbs === null}
          className="px-4 py-1.5 bg-td-green text-white text-xs font-medium rounded-md hover:bg-td-dark-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  )
}

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * CenteredDialog — Reliable centered overlay using flex centering on the overlay element.
 * Avoids CSS transform traps from positioned ancestor elements.
 *
 * Usage:
 *   <CenteredDialog open={open} onOpenChange={setOpen} title="My Title" width="480px">
 *     {content}
 *   </CenteredDialog>
 */
export function CenteredDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = '480px',
  showClose = true,
  className,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <Dialog.Content
            className={cn(
              'relative w-full bg-white dark:bg-[#1A3626] rounded-xl border border-border shadow-2xl p-6 animate-fade-in',
              className
            )}
            style={{ maxWidth: width }}
            onInteractOutside={(e) => e.preventDefault()}
          >
            {showClose && (
              <Dialog.Close asChild>
                <button
                  className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            )}
            {title && (
              <Dialog.Title className="text-lg font-semibold text-foreground mb-1 pr-8">
                {title}
              </Dialog.Title>
            )}
            {description && (
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                {description}
              </Dialog.Description>
            )}
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Core Modal component with overlay and animations
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      open = false,
      onOpenChange,
      size = 'md',
      closable = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(open)

    React.useEffect(() => {
      setIsVisible(open)
    }, [open])

    React.useEffect(() => {
      if (!closeOnEscape) return

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open) {
          onOpenChange?.(false)
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [open, onOpenChange, closeOnEscape])

    const handleOverlayClick = (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onOpenChange?.(false)
      }
    }

    const handleClose = () => {
      onOpenChange?.(false)
    }

    if (!open) return null

    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4',
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        ref={ref}
        {...props}
      >
        {/* Overlay */}
        <div
          className={cn(
            'fixed inset-0 bg-black/50 transition-opacity',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleOverlayClick}
        />
        
        {/* Modal Content */}
        <div
          className={cn(
            'relative z-50 w-full transform transition-all',
            sizes[size],
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          )}
        >
          <div
            className={cn(
              'relative rounded-lg border bg-background p-6 shadow-lg',
              className
            )}
          >
            {closable && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-6 w-6"
                onClick={handleClose}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
))
ModalHeader.displayName = 'ModalHeader'

const ModalTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
ModalTitle.displayName = 'ModalTitle'

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
ModalDescription.displayName = 'ModalDescription'

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-6', className)} {...props} />
))
ModalContent.displayName = 'ModalContent'

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6', className)}
    {...props}
  />
))
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalFooter, ModalTitle, ModalDescription, ModalContent }

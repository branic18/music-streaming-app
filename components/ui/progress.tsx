/**
 * Core Progress component with variants
 */

import React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  showValue?: boolean
  animated?: boolean
  striped?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 'md',
      variant = 'default',
      showValue = false,
      animated = false,
      striped = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const baseClasses = 'relative w-full overflow-hidden rounded-full bg-secondary'
    
    const sizes = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    }
    
    const variants = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      destructive: 'bg-destructive',
    }

    const progressClasses = cn(
      'h-full w-full flex-1 bg-primary transition-all',
      variants[variant],
      animated && 'animate-pulse',
      striped && 'bg-stripes'
    )

    return (
      <div
        ref={ref}
        className={cn(baseClasses, sizes[size], className)}
        {...props}
      >
        <div
          className={progressClasses}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress }
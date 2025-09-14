/**
 * Core Avatar component with fallback support
 */

import React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'away' | 'busy'
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = 'Avatar',
      fallback,
      size = 'md',
      shape = 'circle',
      status,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false)
    
    const baseClasses = 'relative flex shrink-0 overflow-hidden'
    
    const sizes = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    }
    
    const shapes = {
      circle: 'rounded-full',
      square: 'rounded-md',
    }
    
    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
    }

    const displayFallback = !src || imageError
    const fallbackText = fallback || alt.charAt(0).toUpperCase()

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          sizes[size],
          shapes[shape],
          className
        )}
        {...props}
      >
        {!displayFallback ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium">
            {fallbackText}
          </div>
        )}
        
        {status && (
          <div
            className={cn(
              'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background',
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export { Avatar }
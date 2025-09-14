/**
 * Main application header component
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  user?: {
    name: string
    avatar?: string
    email?: string
  }
  onSearch?: (query: string) => void
  onUserMenuClick?: () => void
  onSettingsClick?: () => void
  searchPlaceholder?: string
  showSearch?: boolean
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  (
    {
      className,
      user,
      onSearch,
      onUserMenuClick,
      onSettingsClick,
      searchPlaceholder = 'Search music...',
      showSearch = true,
      ...props
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('')

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSearch?.(searchQuery)
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    }

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          className
        )}
        {...props}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-primary-foreground"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <span className="text-xl font-bold">MusicApp</span>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="flex-1 max-w-md mx-8">
              <form onSubmit={handleSearchSubmit}>
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full"
                  leftIcon={
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  }
                />
              </form>
            </div>
          )}

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              aria-label="Settings"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Button>

            {user ? (
              <Button
                variant="ghost"
                className="flex items-center space-x-2 px-2"
                onClick={onUserMenuClick}
              >
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                  fallback={user.name}
                />
                <span className="hidden sm:block text-sm font-medium">
                  {user.name}
                </span>
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>
    )
  }
)

Header.displayName = 'Header'

export { Header }

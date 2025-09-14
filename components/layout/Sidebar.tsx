/**
 * Main application sidebar component
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  badge?: string | number
  active?: boolean
  onClick?: () => void
}

export interface SidebarSection {
  id: string
  title?: string
  items: SidebarItem[]
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  sections: SidebarSection[]
  onItemClick?: (item: SidebarItem) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      sections,
      onItemClick,
      collapsed = false,
      onToggleCollapse,
      ...props
    },
    ref
  ) => {
    const handleItemClick = (item: SidebarItem) => {
      onItemClick?.(item)
      item.onClick?.()
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
        {...props}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <h2 className="text-lg font-semibold">Library</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
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
                d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
              />
            </svg>
          </Button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {sections.map((section) => (
            <div key={section.id} className="mb-6">
              {section.title && !collapsed && (
                <h3 className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Button
                    key={item.id}
                    variant={item.active ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      collapsed ? 'px-2' : 'px-3',
                      item.active && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon && (
                      <span className={cn('flex-shrink-0', !collapsed && 'mr-3')}>
                        {item.icon}
                      </span>
                    )}
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" size="sm">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start',
              collapsed ? 'px-2' : 'px-3'
            )}
          >
            {!collapsed && (
              <svg
                className="mr-3 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            )}
            {!collapsed && <span>Create Playlist</span>}
          </Button>
        </div>
      </div>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export { Sidebar }

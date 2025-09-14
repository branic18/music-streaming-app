/**
 * Main application layout component
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Header } from './Header'
import { Sidebar, SidebarSection } from './Sidebar'
import { PlayerBar } from './PlayerBar'
import { Track } from '@/lib/types'

export interface MainLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  sidebarSections?: SidebarSection[]
  onSidebarItemClick?: (item: any) => void
  onSearch?: (query: string) => void
  onUserMenuClick?: () => void
  onSettingsClick?: () => void
  user?: {
    name: string
    avatar?: string
    email?: string
  }
  // Player props
  track?: Track
  isPlaying?: boolean
  currentTime?: number
  duration?: number
  volume?: number
  isShuffled?: boolean
  repeatMode?: 'none' | 'one' | 'all'
  onPlayPause?: () => void
  onPrevious?: () => void
  onNext?: () => void
  onSeek?: (time: number) => void
  onVolumeChange?: (volume: number) => void
  onShuffleToggle?: () => void
  onRepeatToggle?: () => void
  onLikeToggle?: () => void
  onQueueToggle?: () => void
  liked?: boolean
  // Layout options
  showSidebar?: boolean
  showPlayer?: boolean
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

const MainLayout = React.forwardRef<HTMLDivElement, MainLayoutProps>(
  (
    {
      className,
      children,
      sidebarSections = [],
      onSidebarItemClick,
      onSearch,
      onUserMenuClick,
      onSettingsClick,
      user,
      track,
      isPlaying = false,
      currentTime = 0,
      duration = 0,
      volume = 100,
      isShuffled = false,
      repeatMode = 'none',
      onPlayPause,
      onPrevious,
      onNext,
      onSeek,
      onVolumeChange,
      onShuffleToggle,
      onRepeatToggle,
      onLikeToggle,
      onQueueToggle,
      liked = false,
      showSidebar = true,
      showPlayer = true,
      sidebarCollapsed = false,
      onSidebarToggle,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex h-screen flex-col bg-background', className)}
        {...props}
      >
        {/* Header */}
        <Header
          user={user}
          onSearch={onSearch}
          onUserMenuClick={onUserMenuClick}
          onSettingsClick={onSettingsClick}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
            <Sidebar
              sections={sidebarSections}
              onItemClick={onSidebarItemClick}
              collapsed={sidebarCollapsed}
              onToggleCollapse={onSidebarToggle}
            />
          )}

          {/* Main Content */}
          <main
            className={cn(
              'flex-1 overflow-y-auto',
              showPlayer && 'pb-20' // Add padding for player bar
            )}
          >
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Player Bar */}
        {showPlayer && (
          <PlayerBar
            track={track}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isShuffled={isShuffled}
            repeatMode={repeatMode}
            onPlayPause={onPlayPause}
            onPrevious={onPrevious}
            onNext={onNext}
            onSeek={onSeek}
            onVolumeChange={onVolumeChange}
            onShuffleToggle={onShuffleToggle}
            onRepeatToggle={onRepeatToggle}
            onLikeToggle={onLikeToggle}
            onQueueToggle={onQueueToggle}
            liked={liked}
          />
        )}
      </div>
    )
  }
)

MainLayout.displayName = 'MainLayout'

export { MainLayout }

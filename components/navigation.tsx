"use client"
import { Button } from "@/components/ui/button"
import { Home, Search, ListMusic, Quote as Queue, Heart, Download, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  const navigationItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "playlists", label: "Your Library", icon: ListMusic },
    { id: "queue", label: "Queue", icon: Queue },
    { id: "library", label: "Liked Songs", icon: Heart },
    { id: "downloads", label: "Downloads", icon: Download },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <nav className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold spotify-green">Spottify</h1>
        <p className="text-sm text-muted-foreground mt-1">Music for everyone</p>
      </div>

      <div className="flex-1 px-3">
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start mb-1 h-12 text-sidebar-foreground hover:bg-sidebar-accent spotify-hover",
                activeSection === item.id &&
                  "bg-sidebar-accent text-sidebar-accent-foreground spotify-green font-semibold",
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className={cn("mr-3 h-5 w-5", activeSection === item.id && "spotify-green")} />
              {item.label}
            </Button>
          )
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">User</p>
            <p className="text-xs text-muted-foreground">Free plan</p>
          </div>
        </div>
      </div>
    </nav>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Download,
  Pause,
  Play,
  Trash2,
  MoreHorizontal,
  HardDrive,
  Wifi,
  WifiOff,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Music,
  FolderOpen,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"

interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  artwork: string
  explicit?: boolean
  downloadable?: boolean
  lyricsAvailable?: boolean
}

interface DownloadItem {
  id: string
  track: Track
  status: "queued" | "downloading" | "completed" | "failed" | "paused"
  progress: number
  downloadedAt?: Date
  fileSize: number
  quality: "low" | "medium" | "high" | "lossless"
  error?: string
}

interface DownloadsManagerProps {
  downloads: DownloadItem[]
  currentTrack: Track | null
  isPlaying: boolean
  isOnline: boolean
  onTrackSelect: (track: Track) => void
  onPlayPause: () => void
  onStartDownload: (track: Track, quality: string) => void
  onPauseDownload: (downloadId: string) => void
  onResumeDownload: (downloadId: string) => void
  onCancelDownload: (downloadId: string) => void
  onDeleteDownload: (downloadId: string) => void
  onRetryDownload: (downloadId: string) => void
  onClearCompleted: () => void
  onAddToQueue: (tracks: Track[]) => void
}

export function DownloadsManager({
  downloads,
  currentTrack,
  isPlaying,
  isOnline,
  onTrackSelect,
  onPlayPause,
  onStartDownload,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onDeleteDownload,
  onRetryDownload,
  onClearCompleted,
  onAddToQueue,
}: DownloadsManagerProps) {
  const [activeTab, setActiveTab] = useState<"downloading" | "completed">("downloading")
  const [autoDownloadQuality, setAutoDownloadQuality] = useState<"low" | "medium" | "high" | "lossless">("medium")
  const [downloadOnWifiOnly, setDownloadOnWifiOnly] = useState(true)
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState(3)
  const [storageLimit, setStorageLimit] = useState(5) // GB
  const [showSettings, setShowSettings] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case "lossless":
        return "bg-purple-500"
      case "high":
        return "bg-green-500"
      case "medium":
        return "bg-blue-500"
      case "low":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "downloading":
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />
      case "queued":
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const downloadingItems = downloads.filter((item) =>
    ["queued", "downloading", "paused", "failed"].includes(item.status),
  )
  const completedItems = downloads.filter((item) => item.status === "completed")

  const totalStorageUsed = completedItems.reduce((total, item) => total + item.fileSize, 0)
  const storageUsedGB = totalStorageUsed / (1024 * 1024 * 1024)
  const storagePercentage = (storageUsedGB / storageLimit) * 100

  const activeDownloads = downloads.filter((item) => item.status === "downloading").length
  const queuedDownloads = downloads.filter((item) => item.status === "queued").length

  const renderDownloadItem = (item: DownloadItem) => (
    <Card key={item.id} className="p-4">
      <div className="flex items-center gap-4">
        <img
          src={item.track.artwork || "/placeholder.svg"}
          alt={`${item.track.album} cover`}
          className="w-12 h-12 rounded object-cover"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{item.track.title}</h4>
            {item.track.explicit && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                E
              </Badge>
            )}
            <Badge className={`text-xs ${getQualityBadgeColor(item.quality)}`}>{item.quality.toUpperCase()}</Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate mb-2">{item.track.artist}</p>

          {item.status === "downloading" && (
            <div className="space-y-1">
              <Progress value={item.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{item.progress}%</span>
                <span>{formatFileSize(item.fileSize)}</span>
              </div>
            </div>
          )}

          {item.status === "completed" && item.downloadedAt && (
            <p className="text-xs text-muted-foreground">
              Downloaded {formatDate(item.downloadedAt)} • {formatFileSize(item.fileSize)}
            </p>
          )}

          {item.status === "failed" && item.error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {item.error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getStatusIcon(item.status)}

          {item.status === "completed" && (
            <Button variant="ghost" size="sm" onClick={() => onTrackSelect(item.track)} className="h-8 w-8 p-0">
              {currentTrack?.id === item.track.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === "completed" && (
                <>
                  <DropdownMenuItem onClick={() => onTrackSelect(item.track)}>
                    <Play className="mr-2 h-4 w-4" />
                    Play
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToQueue([item.track])}>
                    <Music className="mr-2 h-4 w-4" />
                    Add to queue
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {item.status === "downloading" && (
                <DropdownMenuItem onClick={() => onPauseDownload(item.id)}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}

              {item.status === "paused" && (
                <DropdownMenuItem onClick={() => onResumeDownload(item.id)}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              )}

              {item.status === "failed" && (
                <DropdownMenuItem onClick={() => onRetryDownload(item.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </DropdownMenuItem>
              )}

              {["queued", "downloading", "paused"].includes(item.status) && (
                <DropdownMenuItem onClick={() => onCancelDownload(item.id)} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => onDeleteDownload(item.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )

  const renderDownloadingContent = () => {
    if (downloadingItems.length === 0) {
      return (
        <div className="text-center py-12">
          <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No active downloads</h3>
          <p className="text-muted-foreground">Downloads will appear here when you start downloading tracks.</p>
        </div>
      )
    }

    return <div className="space-y-4">{downloadingItems.map(renderDownloadItem)}</div>
  }

  const renderCompletedContent = () => {
    if (completedItems.length === 0) {
      return (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No downloaded tracks</h3>
          <p className="text-muted-foreground">Completed downloads will appear here.</p>
        </div>
      )
    }

    return <div className="space-y-4">{completedItems.map(renderDownloadItem)}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Downloads</h2>
        <div className="flex items-center gap-2">
          {completedItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Completed
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear completed downloads</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all completed downloads from your device. You can re-download them later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onClearCompleted}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{activeDownloads}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{queuedDownloads}</p>
              <p className="text-sm text-muted-foreground">Queued</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{completedItems.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{storageUsedGB.toFixed(1)}GB</p>
              <p className="text-sm text-muted-foreground">Used</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Storage Usage</h3>
            <span className="text-sm text-muted-foreground">
              {storageUsedGB.toFixed(1)} GB of {storageLimit} GB used
            </span>
          </div>
          <Progress value={storagePercentage} className="h-2" />
          {storagePercentage > 90 && (
            <p className="text-sm text-yellow-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Storage almost full. Consider clearing some downloads.
            </p>
          )}
        </div>
      </Card>

      {/* Network Status */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
          <div>
            <p className="font-medium">{isOnline ? "Connected" : "Offline"}</p>
            <p className="text-sm text-muted-foreground">
              {isOnline
                ? downloadOnWifiOnly
                  ? "Downloads allowed on Wi-Fi only"
                  : "Downloads allowed on all connections"
                : "Downloads paused while offline"}
            </p>
          </div>
        </div>
      </Card>

      {/* Downloads List */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="downloading">Active ({downloadingItems.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="downloading" className="mt-6">
          <ScrollArea className="h-[calc(100vh-600px)]">{renderDownloadingContent()}</ScrollArea>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <ScrollArea className="h-[calc(100vh-600px)]">{renderCompletedContent()}</ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Download Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="quality">Default Quality</Label>
                  <Select value={autoDownloadQuality} onValueChange={(value: any) => setAutoDownloadQuality(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (96 kbps)</SelectItem>
                      <SelectItem value="medium">Medium (160 kbps)</SelectItem>
                      <SelectItem value="high">High (320 kbps)</SelectItem>
                      <SelectItem value="lossless">Lossless (FLAC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wifi-only">Wi-Fi Only</Label>
                    <p className="text-sm text-muted-foreground">Only download on Wi-Fi connections</p>
                  </div>
                  <Switch id="wifi-only" checked={downloadOnWifiOnly} onCheckedChange={setDownloadOnWifiOnly} />
                </div>

                <div>
                  <Label>Max Concurrent Downloads: {maxConcurrentDownloads}</Label>
                  <Slider
                    value={[maxConcurrentDownloads]}
                    max={5}
                    min={1}
                    step={1}
                    onValueChange={([value]) => setMaxConcurrentDownloads(value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Storage Limit: {storageLimit} GB</Label>
                  <Slider
                    value={[storageLimit]}
                    max={50}
                    min={1}
                    step={1}
                    onValueChange={([value]) => setStorageLimit(value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowSettings(false)}>Done</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

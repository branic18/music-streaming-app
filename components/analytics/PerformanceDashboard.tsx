/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and analytics
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Download, 
  RefreshCw, 
  Trash2, 
  Settings,
  BarChart3,
  Cpu,
  Wifi,
  MousePointer,
  Music,
  HardDrive,
  Monitor
} from 'lucide-react'
import { 
  performanceMonitor, 
  MetricType, 
  PerformanceCategory,
  type PerformanceReport,
  type PerformanceMetric 
} from '@/lib/analytics/performance-monitor'

interface PerformanceDashboardProps {
  className?: string
  onReportUpdate?: (report: PerformanceReport) => void
}

export function PerformanceDashboard({ className, onReportUpdate }: PerformanceDashboardProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds

  // Initialize performance monitor
  useEffect(() => {
    const initializeMonitor = async () => {
      try {
        await performanceMonitor.initialize()
        updateReport()
      } catch (error) {
        console.error('Failed to initialize performance monitor:', error)
      }
    }

    initializeMonitor()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      updateReport()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const updateReport = useCallback(() => {
    try {
      const newReport = performanceMonitor.getPerformanceReport()
      setReport(newReport)
      onReportUpdate?.(newReport)
    } catch (error) {
      console.error('Failed to update performance report:', error)
    }
  }, [onReportUpdate])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    updateReport()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleExport = () => {
    try {
      const exported = performanceMonitor.exportMetrics('json')
      const blob = new Blob([exported], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-report-${new Date().toISOString()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export performance data:', error)
    }
  }

  const handleClear = async () => {
    try {
      await performanceMonitor.clearMetrics()
      updateReport()
    } catch (error) {
      console.error('Failed to clear performance data:', error)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getMetricIcon = (category: PerformanceCategory) => {
    switch (category) {
      case PerformanceCategory.AUDIO:
        return <Music className="h-4 w-4" />
      case PerformanceCategory.NETWORK:
        return <Wifi className="h-4 w-4" />
      case PerformanceCategory.STORAGE:
        return <HardDrive className="h-4 w-4" />
      case PerformanceCategory.USER_INTERACTION:
        return <MousePointer className="h-4 w-4" />
      case PerformanceCategory.MEMORY:
        return <Cpu className="h-4 w-4" />
      case PerformanceCategory.RENDERING:
        return <Monitor className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getMetricColor = (category: PerformanceCategory): string => {
    switch (category) {
      case PerformanceCategory.AUDIO:
        return 'bg-blue-500'
      case PerformanceCategory.NETWORK:
        return 'bg-green-500'
      case PerformanceCategory.STORAGE:
        return 'bg-yellow-500'
      case PerformanceCategory.USER_INTERACTION:
        return 'bg-purple-500'
      case PerformanceCategory.MEMORY:
        return 'bg-red-500'
      case PerformanceCategory.RENDERING:
        return 'bg-indigo-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (!report) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading performance data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Dashboard
            </CardTitle>
            <CardDescription>
              Real-time performance metrics and analytics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Session: {report.sessionId.slice(-8)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Session Duration</p>
                      <p className="text-2xl font-bold">{formatDuration(report.duration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Total Metrics</p>
                      <p className="text-2xl font-bold">{report.summary.totalMetrics}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Avg Response Time</p>
                      <p className="text-2xl font-bold">{formatDuration(report.summary.averageResponseTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Memory Usage</p>
                      <p className="text-2xl font-bold">{formatBytes(report.summary.memoryUsage.current)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Categories */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(PerformanceCategory).map(category => {
                  const categoryMetrics = report.metrics.filter(m => m.category === category)
                  const count = categoryMetrics.length
                  
                  if (count === 0) return null

                  return (
                    <Card key={category}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getMetricIcon(category)}
                            <span className="font-medium capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                        {categoryMetrics.length > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Latest</span>
                              <span>{formatDuration(categoryMetrics[0].value)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Metrics</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {report.metrics.slice(-20).reverse().map(metric => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getMetricColor(metric.category)}`} />
                      <div>
                        <p className="font-medium">{metric.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {metric.category} • {metric.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {metric.value.toFixed(2)} {metric.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {metric.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Total Requests</p>
                      <p className="text-2xl font-bold">{report.summary.networkRequests.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Successful</p>
                      <p className="text-2xl font-bold text-green-600">
                        {report.summary.networkRequests.successful}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {report.summary.networkRequests.failed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Network Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Latency</span>
                    <span className="text-sm font-medium">
                      {formatDuration(report.summary.networkRequests.averageLatency)}
                    </span>
                  </div>
                  <Progress 
                    value={(report.summary.networkRequests.successful / Math.max(report.summary.networkRequests.total, 1)) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Success Rate</span>
                    <span>
                      {((report.summary.networkRequests.successful / Math.max(report.summary.networkRequests.total, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Memory Usage</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Current</span>
                        <span>{formatBytes(report.summary.memoryUsage.current)}</span>
                      </div>
                      <Progress 
                        value={(report.summary.memoryUsage.current / report.summary.memoryUsage.peak) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average</span>
                        <span>{formatBytes(report.summary.memoryUsage.average)}</span>
                      </div>
                      <Progress 
                        value={(report.summary.memoryUsage.average / report.summary.memoryUsage.peak) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Peak</span>
                        <span>{formatBytes(report.summary.memoryUsage.peak)}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Audio Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Latency</span>
                      <span className="text-sm font-medium">
                        {formatDuration(report.summary.audioPerformance.averageLatency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Buffer Underruns</span>
                      <span className="text-sm font-medium">
                        {report.summary.audioPerformance.bufferUnderruns}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Crossfade Success</span>
                      <span className="text-sm font-medium">
                        {report.summary.audioPerformance.crossfadeSuccess}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">User Interactions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Interactions</span>
                    <span className="text-sm font-medium">
                      {report.summary.userInteractions.total}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(report.summary.userInteractions.categories).map(([category, count]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

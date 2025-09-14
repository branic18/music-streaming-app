/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home, 
  Copy,
  Download,
  X
} from 'lucide-react'
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/lib/error/error-handler'
import type { AppError } from '@/lib/error/error-handler'

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
  isReporting: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  enableErrorReporting?: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isReporting: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: errorHandler.createError(
        error.message,
        'REACT_ERROR_BOUNDARY',
        ErrorCategory.UI,
        ErrorSeverity.HIGH,
        error,
        {
          component: 'ErrorBoundary',
          action: 'getDerivedStateFromError',
        }
      ),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create app error
    const appError = errorHandler.createError(
      error.message,
      'REACT_ERROR_BOUNDARY',
      ErrorCategory.UI,
      ErrorSeverity.HIGH,
      error,
      {
        component: 'ErrorBoundary',
        action: 'componentDidCatch',
        metadata: {
          componentStack: errorInfo.componentStack,
        },
      }
    )

    // Update state
    this.setState({
      error: appError,
      errorInfo,
    })

    // Handle the error
    errorHandler.handleError(appError, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Call custom error handler
    this.props.onError?.(appError, errorInfo)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleToggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }))
  }

  private handleCopyError = async () => {
    if (!this.state.error) return

    const errorDetails = {
      message: this.state.error.message,
      code: this.state.error.code,
      severity: this.state.error.severity,
      category: this.state.error.category,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: this.state.error.context.timestamp,
      url: this.state.error.context.url,
      userAgent: this.state.error.context.userAgent,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy error details:', error)
    }
  }

  private handleDownloadError = () => {
    if (!this.state.error) return

    const errorDetails = {
      message: this.state.error.message,
      code: this.state.error.code,
      severity: this.state.error.severity,
      category: this.state.error.category,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: this.state.error.context.timestamp,
      url: this.state.error.context.url,
      userAgent: this.state.error.context.userAgent,
    }

    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-${this.state.error.context.timestamp.toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private handleReportError = async () => {
    if (!this.state.error || this.state.isReporting) return

    this.setState({ isReporting: true })

    try {
      // In a real app, you'd send this to your error reporting service
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      // Show success message (you could use a toast notification)
      console.log('Error reported successfully')
    } catch (error) {
      console.error('Failed to report error:', error)
    } finally {
      this.setState({ isReporting: false })
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. We're sorry for the inconvenience.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Summary */}
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">{this.state.error?.message}</div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{this.state.error?.category}</Badge>
                      <Badge 
                        variant={this.state.error?.severity === ErrorSeverity.CRITICAL ? 'destructive' : 'secondary'}
                      >
                        {this.state.error?.severity}
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>

                {this.props.showErrorDetails && (
                  <Button variant="outline" onClick={this.handleToggleDetails} className="flex items-center gap-2">
                    {this.state.showDetails ? <X className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
                    {this.state.showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                )}
              </div>

              {/* Error Details */}
              {this.state.showDetails && this.state.error && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted">
                    <div className="space-y-2">
                      <div>
                        <strong>Error Code:</strong> {this.state.error.code}
                      </div>
                      <div>
                        <strong>Timestamp:</strong> {this.state.error.context.timestamp.toISOString()}
                      </div>
                      <div>
                        <strong>URL:</strong> {this.state.error.context.url}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={this.handleCopyError} className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copy Details
                    </Button>
                    
                    <Button variant="outline" size="sm" onClick={this.handleDownloadError} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>

                    {this.props.enableErrorReporting && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={this.handleReportError}
                        disabled={this.state.isReporting}
                        className="flex items-center gap-2"
                      >
                        <Bug className="h-4 w-4" />
                        {this.state.isReporting ? 'Reporting...' : 'Report Error'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="text-sm text-muted-foreground">
                <p>
                  If this problem persists, please try refreshing the page or contact support.
                  Error details have been logged for our development team.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Partial<AppError['context']>) => {
    errorHandler.handleError(error, context)
  }, [])

  const createError = React.useCallback((
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error,
    context?: Partial<AppError['context']>
  ) => {
    return errorHandler.createError(message, code, category, severity, originalError, context)
  }, [])

  return {
    handleError,
    createError,
  }
}

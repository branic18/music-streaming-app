/**
 * Data validation utilities using Zod schemas
 * Provides comprehensive validation functions for all entities
 */

import { z, ZodError, ZodSchema } from 'zod'
import { schemas } from './schemas'

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: string[]
  errorDetails?: ZodError
}

export interface ValidationOptions {
  strict?: boolean
  allowUnknown?: boolean
  transform?: boolean
  abortEarly?: boolean
}

export class DataValidator {
  private static instance: DataValidator
  private options: ValidationOptions

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strict: false,
      allowUnknown: true,
      transform: true,
      abortEarly: false,
      ...options,
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: ValidationOptions): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator(options)
    }
    return DataValidator.instance
  }

  /**
   * Validate data against a schema
   */
  validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    const validationOptions = { ...this.options, ...options }

    try {
      const result = schema.parse(data)
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          errorDetails: error,
        }
      }
      return {
        success: false,
        errors: ['Unknown validation error'],
      }
    }
  }

  /**
   * Validate data safely (returns null on failure)
   */
  validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): T | null {
    const result = this.validate(schema, data, options)
    return result.success ? result.data! : null
  }

  /**
   * Validate and transform data
   */
  validateAndTransform<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    return this.validate(schema, data, { ...options, transform: true })
  }

  /**
   * Validate multiple items
   */
  validateArray<T>(
    schema: ZodSchema<T>,
    data: unknown[],
    options?: Partial<ValidationOptions>
  ): ValidationResult<T[]> {
    const results: T[] = []
    const errors: string[] = []

    data.forEach((item, index) => {
      const result = this.validate(schema, item, options)
      if (result.success) {
        results.push(result.data!)
      } else {
        errors.push(`Item ${index}: ${result.errors?.join(', ')}`)
      }
    })

    return {
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Validate partial data (allows missing fields)
   */
  validatePartial<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<Partial<T>> {
    const partialSchema = schema.partial()
    return this.validate(partialSchema, data, options)
  }

  /**
   * Validate with custom error messages
   */
  validateWithMessages<T>(
    schema: ZodSchema<T>,
    data: unknown,
    customMessages: Record<string, string>,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    const result = this.validate(schema, data, options)
    
    if (!result.success && result.errors) {
      const customErrors = result.errors.map(error => {
        const field = error.split(':')[0]
        return customMessages[field] || error
      })
      
      return {
        ...result,
        errors: customErrors,
      }
    }
    
    return result
  }

  /**
   * Validate entity-specific data
   */
  validateTrack(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.track, data, options)
  }

  validateAlbum(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.album, data, options)
  }

  validateArtist(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.artist, data, options)
  }

  validatePlaylist(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.playlist, data, options)
  }

  validateQueue(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.queue, data, options)
  }

  validateLibraryItem(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.libraryItem, data, options)
  }

  validateLyrics(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.lyrics, data, options)
  }

  validateDownloadItem(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.downloadItem, data, options)
  }

  validateAudioSettings(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.audioSettings, data, options)
  }

  validateConsentPreferences(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.consentPreferences, data, options)
  }

  validateErrorLog(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.errorLog, data, options)
  }

  validateAppError(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.appError, data, options)
  }

  validatePerformanceMetric(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.performanceMetric, data, options)
  }

  validateSearchQuery(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.searchQuery, data, options)
  }

  validatePlaylistShareToken(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.playlistShareToken, data, options)
  }

  validateApiResponse(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.apiResponse, data, options)
  }

  validatePagination(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.pagination, data, options)
  }

  validatePaginatedResponse(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validate(schemas.paginatedResponse, data, options)
  }

  /**
   * Validate arrays of entities
   */
  validateTracks(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.track, data, options)
  }

  validateAlbums(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.album, data, options)
  }

  validateArtists(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.artist, data, options)
  }

  validatePlaylists(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.playlist, data, options)
  }

  validateLibraryItems(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.libraryItem, data, options)
  }

  validateLyricsArray(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.lyrics, data, options)
  }

  validateDownloadItems(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.downloadItem, data, options)
  }

  validateErrorLogs(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.errorLog, data, options)
  }

  validateAppErrors(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.appError, data, options)
  }

  validatePerformanceMetrics(data: unknown[], options?: Partial<ValidationOptions>): ValidationResult {
    return this.validateArray(schemas.performanceMetric, data, options)
  }

  /**
   * Validate partial entities (for updates)
   */
  validatePartialTrack(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validatePartial(schemas.track, data, options)
  }

  validatePartialAlbum(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validatePartial(schemas.album, data, options)
  }

  validatePartialArtist(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validatePartial(schemas.artist, data, options)
  }

  validatePartialPlaylist(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validatePartial(schemas.playlist, data, options)
  }

  validatePartialAudioSettings(data: unknown, options?: Partial<ValidationOptions>): ValidationResult {
    return this.validatePartial(schemas.audioSettings, data, options)
  }

  /**
   * Validate with custom error messages
   */
  validateTrackWithMessages(
    data: unknown,
    customMessages: Record<string, string>,
    options?: Partial<ValidationOptions>
  ): ValidationResult {
    return this.validateWithMessages(schemas.track, data, customMessages, options)
  }

  validateAlbumWithMessages(
    data: unknown,
    customMessages: Record<string, string>,
    options?: Partial<ValidationOptions>
  ): ValidationResult {
    return this.validateWithMessages(schemas.album, data, customMessages, options)
  }

  validatePlaylistWithMessages(
    data: unknown,
    customMessages: Record<string, string>,
    options?: Partial<ValidationOptions>
  ): ValidationResult {
    return this.validateWithMessages(schemas.playlist, data, customMessages, options)
  }

  /**
   * Validate and sanitize data
   */
  validateAndSanitize<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    // First validate the data
    const validationResult = this.validate(schema, data, options)
    
    if (!validationResult.success) {
      return validationResult
    }

    // Additional sanitization can be added here
    const sanitizedData = this.sanitizeData(validationResult.data!)
    
    return {
      success: true,
      data: sanitizedData,
    }
  }

  /**
   * Sanitize data (remove potentially harmful content)
   */
  private sanitizeData<T>(data: T): T {
    if (typeof data === 'string') {
      // Remove potentially harmful characters
      return data.replace(/[<>\"'&]/g, '') as T
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item)) as T
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value)
      }
      return sanitized as T
    }
    
    return data
  }

  /**
   * Validate data from external sources (more strict)
   */
  validateExternal<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    return this.validate(schema, data, {
      ...options,
      strict: true,
      allowUnknown: false,
      abortEarly: true,
    })
  }

  /**
   * Validate data from internal sources (more lenient)
   */
  validateInternal<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: Partial<ValidationOptions>
  ): ValidationResult<T> {
    return this.validate(schema, data, {
      ...options,
      strict: false,
      allowUnknown: true,
      abortEarly: false,
    })
  }

  /**
   * Get validation schema for an entity
   */
  getSchema(entityType: keyof typeof schemas): ZodSchema {
    return schemas[entityType]
  }

  /**
   * Check if data matches a schema (without validation)
   */
  matchesSchema<T>(schema: ZodSchema<T>, data: unknown): boolean {
    try {
      schema.parse(data)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get schema errors without throwing
   */
  getSchemaErrors<T>(schema: ZodSchema<T>, data: unknown): string[] {
    try {
      schema.parse(data)
      return []
    } catch (error) {
      if (error instanceof ZodError) {
        return error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
      return ['Unknown validation error']
    }
  }

  /**
   * Update validation options
   */
  updateOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current validation options
   */
  getOptions(): ValidationOptions {
    return { ...this.options }
  }
}

// Export singleton instance
export const validator = DataValidator.getInstance()

// Export utility functions
export const validateTrack = (data: unknown) => validator.validateTrack(data)
export const validateAlbum = (data: unknown) => validator.validateAlbum(data)
export const validateArtist = (data: unknown) => validator.validateArtist(data)
export const validatePlaylist = (data: unknown) => validator.validatePlaylist(data)
export const validateQueue = (data: unknown) => validator.validateQueue(data)
export const validateLibraryItem = (data: unknown) => validator.validateLibraryItem(data)
export const validateLyrics = (data: unknown) => validator.validateLyrics(data)
export const validateDownloadItem = (data: unknown) => validator.validateDownloadItem(data)
export const validateAudioSettings = (data: unknown) => validator.validateAudioSettings(data)
export const validateConsentPreferences = (data: unknown) => validator.validateConsentPreferences(data)
export const validateErrorLog = (data: unknown) => validator.validateErrorLog(data)
export const validateAppError = (data: unknown) => validator.validateAppError(data)
export const validatePerformanceMetric = (data: unknown) => validator.validatePerformanceMetric(data)
export const validateSearchQuery = (data: unknown) => validator.validateSearchQuery(data)
export const validatePlaylistShareToken = (data: unknown) => validator.validatePlaylistShareToken(data)
export const validateApiResponse = (data: unknown) => validator.validateApiResponse(data)
export const validatePagination = (data: unknown) => validator.validatePagination(data)
export const validatePaginatedResponse = (data: unknown) => validator.validatePaginatedResponse(data)

// Export array validation functions
export const validateTracks = (data: unknown[]) => validator.validateTracks(data)
export const validateAlbums = (data: unknown[]) => validator.validateAlbums(data)
export const validateArtists = (data: unknown[]) => validator.validateArtists(data)
export const validatePlaylists = (data: unknown[]) => validator.validatePlaylists(data)
export const validateLibraryItems = (data: unknown[]) => validator.validateLibraryItems(data)
export const validateLyricsArray = (data: unknown[]) => validator.validateLyricsArray(data)
export const validateDownloadItems = (data: unknown[]) => validator.validateDownloadItems(data)
export const validateErrorLogs = (data: unknown[]) => validator.validateErrorLogs(data)
export const validateAppErrors = (data: unknown[]) => validator.validateAppErrors(data)
export const validatePerformanceMetrics = (data: unknown[]) => validator.validatePerformanceMetrics(data)

// Export partial validation functions
export const validatePartialTrack = (data: unknown) => validator.validatePartialTrack(data)
export const validatePartialAlbum = (data: unknown) => validator.validatePartialAlbum(data)
export const validatePartialArtist = (data: unknown) => validator.validatePartialArtist(data)
export const validatePartialPlaylist = (data: unknown) => validator.validatePartialPlaylist(data)
export const validatePartialAudioSettings = (data: unknown) => validator.validatePartialAudioSettings(data)

// Export safe validation functions
export const validateTrackSafe = (data: unknown) => validator.validateSafe(schemas.track, data)
export const validateAlbumSafe = (data: unknown) => validator.validateSafe(schemas.album, data)
export const validateArtistSafe = (data: unknown) => validator.validateSafe(schemas.artist, data)
export const validatePlaylistSafe = (data: unknown) => validator.validateSafe(schemas.playlist, data)
export const validateQueueSafe = (data: unknown) => validator.validateSafe(schemas.queue, data)
export const validateLibraryItemSafe = (data: unknown) => validator.validateSafe(schemas.libraryItem, data)
export const validateLyricsSafe = (data: unknown) => validator.validateSafe(schemas.lyrics, data)
export const validateDownloadItemSafe = (data: unknown) => validator.validateSafe(schemas.downloadItem, data)
export const validateAudioSettingsSafe = (data: unknown) => validator.validateSafe(schemas.audioSettings, data)
export const validateConsentPreferencesSafe = (data: unknown) => validator.validateSafe(schemas.consentPreferences, data)

// Export default
export default validator

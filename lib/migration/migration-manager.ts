/**
 * Data migration utilities for handling schema changes
 * Provides versioned migrations for data structure updates
 */

import { errorHandler } from '@/lib/error/error-handler'
import { validator } from '@/lib/validation/validator'

export interface Migration {
  version: number
  name: string
  description: string
  up: (data: any) => any
  down: (data: any) => any
  validate?: (data: any) => boolean
}

export interface MigrationResult {
  success: boolean
  fromVersion: number
  toVersion: number
  migrationsApplied: string[]
  errors: string[]
  data?: any
}

export interface MigrationConfig {
  currentVersion: number
  targetVersion?: number
  validateAfterMigration: boolean
  backupBeforeMigration: boolean
  rollbackOnError: boolean
}

export class MigrationManager {
  private migrations: Map<number, Migration> = new Map()
  private config: MigrationConfig

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      currentVersion: 1,
      validateAfterMigration: true,
      backupBeforeMigration: true,
      rollbackOnError: true,
      ...config,
    }
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration version ${migration.version} already exists`)
    }
    this.migrations.set(migration.version, migration)
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.version - b.version)
  }

  /**
   * Get migration by version
   */
  getMigration(version: number): Migration | undefined {
    return this.migrations.get(version)
  }

  /**
   * Get latest migration version
   */
  getLatestVersion(): number {
    const versions = Array.from(this.migrations.keys())
    return versions.length > 0 ? Math.max(...versions) : 0
  }

  /**
   * Migrate data to target version
   */
  async migrate(
    data: any,
    fromVersion: number,
    targetVersion?: number
  ): Promise<MigrationResult> {
    const toVersion = targetVersion || this.getLatestVersion()
    const result: MigrationResult = {
      success: false,
      fromVersion,
      toVersion,
      migrationsApplied: [],
      errors: [],
    }

    try {
      // Validate input
      if (fromVersion < 0 || toVersion < 0) {
        throw new Error('Version numbers must be non-negative')
      }

      if (fromVersion === toVersion) {
        result.success = true
        result.data = data
        return result
      }

      // Create backup if enabled
      let backup: any = null
      if (this.config.backupBeforeMigration) {
        backup = JSON.parse(JSON.stringify(data))
      }

      let currentData = data
      const migrationsToApply = this.getMigrationsToApply(fromVersion, toVersion)

      // Apply migrations
      for (const migration of migrationsToApply) {
        try {
          // Validate before migration if validator exists
          if (migration.validate && !migration.validate(currentData)) {
            throw new Error(`Pre-migration validation failed for ${migration.name}`)
          }

          // Apply migration
          currentData = migration.up(currentData)

          // Validate after migration if validator exists
          if (migration.validate && !migration.validate(currentData)) {
            throw new Error(`Post-migration validation failed for ${migration.name}`)
          }

          result.migrationsApplied.push(migration.name)
        } catch (error) {
          const err = error as Error
          result.errors.push(`Migration ${migration.name} failed: ${err.message}`)

          if (this.config.rollbackOnError && backup) {
            try {
              currentData = backup
              result.errors.push('Rolled back to backup due to migration failure')
            } catch (rollbackError) {
              result.errors.push(`Rollback failed: ${(rollbackError as Error).message}`)
            }
          }

          if (this.config.rollbackOnError) {
            return result
          }
        }
      }

      // Final validation
      if (this.config.validateAfterMigration) {
        const validation = this.validateMigratedData(currentData, toVersion)
        if (!validation.success) {
          result.errors.push(`Final validation failed: ${validation.errors?.join(', ')}`)
          if (this.config.rollbackOnError && backup) {
            currentData = backup
            result.errors.push('Rolled back to backup due to validation failure')
          }
        }
      }

      result.success = result.errors.length === 0
      result.data = currentData

    } catch (error) {
      const err = error as Error
      result.errors.push(`Migration failed: ${err.message}`)
      errorHandler.handleError(err, {
        component: 'MigrationManager',
        action: 'migrate',
        metadata: { fromVersion, toVersion },
      })
    }

    return result
  }

  /**
   * Rollback data to previous version
   */
  async rollback(
    data: any,
    fromVersion: number,
    targetVersion: number
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion,
      toVersion: targetVersion,
      migrationsApplied: [],
      errors: [],
    }

    try {
      if (fromVersion <= targetVersion) {
        throw new Error('Rollback target version must be less than current version')
      }

      let currentData = data
      const migrationsToRollback = this.getMigrationsToRollback(fromVersion, targetVersion)

      // Apply rollback migrations in reverse order
      for (const migration of migrationsToRollback.reverse()) {
        try {
          currentData = migration.down(currentData)
          result.migrationsApplied.push(`${migration.name} (rollback)`)
        } catch (error) {
          const err = error as Error
          result.errors.push(`Rollback migration ${migration.name} failed: ${err.message}`)
        }
      }

      result.success = result.errors.length === 0
      result.data = currentData

    } catch (error) {
      const err = error as Error
      result.errors.push(`Rollback failed: ${err.message}`)
      errorHandler.handleError(err, {
        component: 'MigrationManager',
        action: 'rollback',
        metadata: { fromVersion, toVersion: targetVersion },
      })
    }

    return result
  }

  /**
   * Get migrations to apply for version range
   */
  private getMigrationsToApply(fromVersion: number, toVersion: number): Migration[] {
    const migrations: Migration[] = []

    if (fromVersion < toVersion) {
      // Forward migration
      for (let version = fromVersion + 1; version <= toVersion; version++) {
        const migration = this.migrations.get(version)
        if (migration) {
          migrations.push(migration)
        }
      }
    } else {
      // Backward migration (rollback)
      for (let version = fromVersion; version > toVersion; version--) {
        const migration = this.migrations.get(version)
        if (migration) {
          migrations.push(migration)
        }
      }
    }

    return migrations
  }

  /**
   * Get migrations to rollback for version range
   */
  private getMigrationsToRollback(fromVersion: number, toVersion: number): Migration[] {
    const migrations: Migration[] = []

    for (let version = fromVersion; version > toVersion; version--) {
      const migration = this.migrations.get(version)
      if (migration) {
        migrations.push(migration)
      }
    }

    return migrations
  }

  /**
   * Validate migrated data
   */
  private validateMigratedData(data: any, version: number): { success: boolean; errors?: string[] } {
    try {
      // Basic validation - check if data is valid JSON structure
      if (typeof data !== 'object' || data === null) {
        return { success: false, errors: ['Data must be an object'] }
      }

      // Version-specific validation can be added here
      // For now, we'll do basic structure validation
      if (version >= 1) {
        // Validate basic structure
        if (!data.hasOwnProperty('version')) {
          return { success: false, errors: ['Data must have version property'] }
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, errors: [(error as Error).message] }
    }
  }

  /**
   * Check if migration is needed
   */
  needsMigration(currentVersion: number, targetVersion?: number): boolean {
    const latestVersion = targetVersion || this.getLatestVersion()
    return currentVersion < latestVersion
  }

  /**
   * Get migration plan
   */
  getMigrationPlan(fromVersion: number, toVersion?: number): {
    fromVersion: number
    toVersion: number
    migrations: Migration[]
    estimatedTime: number
  } {
    const targetVersion = toVersion || this.getLatestVersion()
    const migrations = this.getMigrationsToApply(fromVersion, targetVersion)

    return {
      fromVersion,
      toVersion: targetVersion,
      migrations,
      estimatedTime: migrations.length * 100, // Estimate 100ms per migration
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): MigrationConfig {
    return { ...this.config }
  }

  /**
   * Clear all migrations
   */
  clearMigrations(): void {
    this.migrations.clear()
  }

  /**
   * Export migrations
   */
  exportMigrations(): string {
    const migrations = this.getMigrations()
    return JSON.stringify(migrations, null, 2)
  }

  /**
   * Import migrations
   */
  importMigrations(migrationsJson: string): void {
    try {
      const migrations: Migration[] = JSON.parse(migrationsJson)
      
      // Clear existing migrations
      this.clearMigrations()
      
      // Register imported migrations
      migrations.forEach(migration => {
        this.registerMigration(migration)
      })
    } catch (error) {
      throw new Error(`Failed to import migrations: ${(error as Error).message}`)
    }
  }
}

// Predefined migrations for common data structure changes
export const createTrackMigration = (version: number): Migration => ({
  version,
  name: `track-migration-v${version}`,
  description: `Migrate track data structure to version ${version}`,
  up: (data: any) => {
    if (version === 2) {
      // Example: Convert duration from seconds to milliseconds
      if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks = data.tracks.map((track: any) => ({
          ...track,
          durationMs: track.duration ? track.duration * 1000 : track.durationMs,
        }))
      }
    }
    return data
  },
  down: (data: any) => {
    if (version === 2) {
      // Rollback: Convert duration from milliseconds to seconds
      if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks = data.tracks.map((track: any) => ({
          ...track,
          duration: track.durationMs ? track.durationMs / 1000 : track.duration,
        }))
      }
    }
    return data
  },
  validate: (data: any) => {
    if (version === 2) {
      // Validate that tracks have durationMs property
      if (data.tracks && Array.isArray(data.tracks)) {
        return data.tracks.every((track: any) => 
          typeof track.durationMs === 'number' && track.durationMs > 0
        )
      }
    }
    return true
  },
})

export const createPlaylistMigration = (version: number): Migration => ({
  version,
  name: `playlist-migration-v${version}`,
  description: `Migrate playlist data structure to version ${version}`,
  up: (data: any) => {
    if (version === 2) {
      // Example: Add createdAt and updatedAt timestamps
      if (data.playlists && Array.isArray(data.playlists)) {
        data.playlists = data.playlists.map((playlist: any) => ({
          ...playlist,
          createdAt: playlist.createdAt || new Date().toISOString(),
          updatedAt: playlist.updatedAt || new Date().toISOString(),
        }))
      }
    }
    return data
  },
  down: (data: any) => {
    if (version === 2) {
      // Rollback: Remove timestamps
      if (data.playlists && Array.isArray(data.playlists)) {
        data.playlists = data.playlists.map((playlist: any) => {
          const { createdAt, updatedAt, ...rest } = playlist
          return rest
        })
      }
    }
    return data
  },
  validate: (data: any) => {
    if (version === 2) {
      // Validate that playlists have timestamps
      if (data.playlists && Array.isArray(data.playlists)) {
        return data.playlists.every((playlist: any) => 
          playlist.createdAt && playlist.updatedAt
        )
      }
    }
    return true
  },
})

export const createAudioSettingsMigration = (version: number): Migration => ({
  version,
  name: `audio-settings-migration-v${version}`,
  description: `Migrate audio settings data structure to version ${version}`,
  up: (data: any) => {
    if (version === 2) {
      // Example: Add new audio settings properties
      if (data.audioSettings) {
        data.audioSettings = {
          ...data.audioSettings,
          spatial: data.audioSettings.spatial || {
            enabled: false,
            mode: 'stereo',
            intensity: 0.5,
          },
          advanced: data.audioSettings.advanced || {
            sampleRate: 44100,
            bitDepth: 16,
            bufferSize: 4096,
            latency: 0,
          },
        }
      }
    }
    return data
  },
  down: (data: any) => {
    if (version === 2) {
      // Rollback: Remove new properties
      if (data.audioSettings) {
        const { spatial, advanced, ...rest } = data.audioSettings
        data.audioSettings = rest
      }
    }
    return data
  },
  validate: (data: any) => {
    if (version === 2) {
      // Validate that audio settings have new properties
      if (data.audioSettings) {
        return data.audioSettings.spatial && data.audioSettings.advanced
      }
    }
    return true
  },
})

// Export singleton instance
export const migrationManager = new MigrationManager()

// Register default migrations
migrationManager.registerMigration(createTrackMigration(2))
migrationManager.registerMigration(createPlaylistMigration(2))
migrationManager.registerMigration(createAudioSettingsMigration(2))

export default migrationManager

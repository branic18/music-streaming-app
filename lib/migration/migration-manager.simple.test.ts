/**
 * Simplified unit tests for migration manager
 */

import { MigrationManager, createTrackMigration, createPlaylistMigration, createAudioSettingsMigration } from './migration-manager'

describe('MigrationManager', () => {
  let migrationManager: MigrationManager

  beforeEach(() => {
    migrationManager = new MigrationManager()
  })

  afterEach(() => {
    migrationManager.clearMigrations()
  })

  describe('Migration Registration', () => {
    it('should register migration', () => {
      const migration = createTrackMigration(1)
      migrationManager.registerMigration(migration)

      expect(migrationManager.getMigration(1)).toBeDefined()
      expect(migrationManager.getMigration(1)?.name).toBe('track-migration-v1')
    })

    it('should throw error for duplicate migration version', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createPlaylistMigration(1)

      migrationManager.registerMigration(migration1)

      expect(() => {
        migrationManager.registerMigration(migration2)
      }).toThrow('Migration version 1 already exists')
    })

    it('should get all migrations', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createTrackMigration(2)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)

      const migrations = migrationManager.getMigrations()
      expect(migrations).toHaveLength(2)
      expect(migrations[0].version).toBe(1)
      expect(migrations[1].version).toBe(2)
    })

    it('should get latest version', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createTrackMigration(3)
      const migration3 = createTrackMigration(2)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)
      migrationManager.registerMigration(migration3)

      expect(migrationManager.getLatestVersion()).toBe(3)
    })
  })

  describe('Migration Execution', () => {
    it('should migrate data forward', async () => {
      const migration = createTrackMigration(2)
      migrationManager.registerMigration(migration)

      const data = {
        version: 1,
        tracks: [
          { id: 'track-1', title: 'Track 1', duration: 180 },
          { id: 'track-2', title: 'Track 2', duration: 200 },
        ],
      }

      const result = await migrationManager.migrate(data, 1, 2)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(1)
      expect(result.toVersion).toBe(2)
      expect(result.migrationsApplied).toHaveLength(1)
      expect(result.migrationsApplied[0]).toBe('track-migration-v2')
      expect(result.data.tracks[0].durationMs).toBe(180000)
      expect(result.data.tracks[1].durationMs).toBe(200000)
    })

    it('should migrate data backward (rollback)', async () => {
      const migration = createTrackMigration(2)
      migrationManager.registerMigration(migration)

      const data = {
        version: 2,
        tracks: [
          { id: 'track-1', title: 'Track 1', durationMs: 180000 },
          { id: 'track-2', title: 'Track 2', durationMs: 200000 },
        ],
      }

      const result = await migrationManager.rollback(data, 2, 1)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(2)
      expect(result.toVersion).toBe(1)
      expect(result.migrationsApplied).toHaveLength(1)
      expect(result.migrationsApplied[0]).toBe('track-migration-v2 (rollback)')
      expect(result.data.tracks[0].duration).toBe(180)
      expect(result.data.tracks[1].duration).toBe(200)
    })

    it('should handle migration to same version', async () => {
      const data = { version: 1, tracks: [] }
      const result = await migrationManager.migrate(data, 1, 1)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(1)
      expect(result.toVersion).toBe(1)
      expect(result.migrationsApplied).toHaveLength(0)
      expect(result.data).toBe(data)
    })

    it('should handle migration errors', async () => {
      const faultyMigration = {
        version: 2,
        name: 'faulty-migration',
        description: 'A migration that fails',
        up: () => {
          throw new Error('Migration failed')
        },
        down: () => ({}),
      }

      migrationManager.registerMigration(faultyMigration)

      const data = { version: 1, tracks: [] }
      const result = await migrationManager.migrate(data, 1, 2)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Migration faulty-migration failed')
    })

    it('should handle validation errors', async () => {
      const migrationWithValidation = {
        version: 2,
        name: 'validation-migration',
        description: 'A migration with validation',
        up: (data: any) => ({ ...data, version: 2 }),
        down: (data: any) => ({ ...data, version: 1 }),
        validate: (data: any) => false, // Always fail validation
      }

      migrationManager.registerMigration(migrationWithValidation)

      const data = { version: 1, tracks: [] }
      const result = await migrationManager.migrate(data, 1, 2)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Post-migration validation failed')
    })
  })

  describe('Migration Planning', () => {
    it('should check if migration is needed', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createTrackMigration(2)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)

      expect(migrationManager.needsMigration(1, 2)).toBe(true)
      expect(migrationManager.needsMigration(2, 2)).toBe(false)
      expect(migrationManager.needsMigration(3, 2)).toBe(false)
    })

    it('should get migration plan', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createTrackMigration(2)
      const migration3 = createTrackMigration(3)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)
      migrationManager.registerMigration(migration3)

      const plan = migrationManager.getMigrationPlan(1, 3)

      expect(plan.fromVersion).toBe(1)
      expect(plan.toVersion).toBe(3)
      expect(plan.migrations).toHaveLength(2)
      expect(plan.migrations[0].version).toBe(2)
      expect(plan.migrations[1].version).toBe(3)
      expect(plan.estimatedTime).toBe(200) // 2 migrations * 100ms
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      migrationManager.updateConfig({
        validateAfterMigration: false,
        backupBeforeMigration: false,
      })

      const config = migrationManager.getConfig()
      expect(config.validateAfterMigration).toBe(false)
      expect(config.backupBeforeMigration).toBe(false)
    })

    it('should get current configuration', () => {
      const config = migrationManager.getConfig()
      expect(config.currentVersion).toBe(1)
      expect(config.validateAfterMigration).toBe(true)
      expect(config.backupBeforeMigration).toBe(true)
      expect(config.rollbackOnError).toBe(true)
    })
  })

  describe('Migration Export/Import', () => {
    it('should export migrations', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createPlaylistMigration(2)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)

      const exported = migrationManager.exportMigrations()
      const parsed = JSON.parse(exported)

      expect(parsed).toHaveLength(2)
      expect(parsed[0].version).toBe(1)
      expect(parsed[1].version).toBe(2)
    })

    it('should import migrations', () => {
      const migrations = [
        createTrackMigration(1),
        createPlaylistMigration(2),
      ]

      const exported = JSON.stringify(migrations, null, 2)
      migrationManager.importMigrations(exported)

      expect(migrationManager.getMigrations()).toHaveLength(2)
      expect(migrationManager.getMigration(1)?.name).toBe('track-migration-v1')
      expect(migrationManager.getMigration(2)?.name).toBe('playlist-migration-v2')
    })

    it('should handle import errors', () => {
      expect(() => {
        migrationManager.importMigrations('invalid json')
      }).toThrow('Failed to import migrations')
    })
  })

  describe('Clear Migrations', () => {
    it('should clear all migrations', () => {
      const migration1 = createTrackMigration(1)
      const migration2 = createPlaylistMigration(2)

      migrationManager.registerMigration(migration1)
      migrationManager.registerMigration(migration2)

      expect(migrationManager.getMigrations()).toHaveLength(2)

      migrationManager.clearMigrations()

      expect(migrationManager.getMigrations()).toHaveLength(0)
      expect(migrationManager.getLatestVersion()).toBe(0)
    })
  })
})

describe('Predefined Migrations', () => {
  describe('Track Migration', () => {
    it('should convert duration from seconds to milliseconds', () => {
      const migration = createTrackMigration(2)
      const data = {
        tracks: [
          { id: 'track-1', title: 'Track 1', duration: 180 },
          { id: 'track-2', title: 'Track 2', duration: 200 },
        ],
      }

      const migrated = migration.up(data)

      expect(migrated.tracks[0].durationMs).toBe(180000)
      expect(migrated.tracks[1].durationMs).toBe(200000)
    })

    it('should rollback duration from milliseconds to seconds', () => {
      const migration = createTrackMigration(2)
      const data = {
        tracks: [
          { id: 'track-1', title: 'Track 1', durationMs: 180000 },
          { id: 'track-2', title: 'Track 2', durationMs: 200000 },
        ],
      }

      const rolledBack = migration.down(data)

      expect(rolledBack.tracks[0].duration).toBe(180)
      expect(rolledBack.tracks[1].duration).toBe(200)
    })

    it('should validate migrated track data', () => {
      const migration = createTrackMigration(2)
      const validData = {
        tracks: [
          { id: 'track-1', title: 'Track 1', durationMs: 180000 },
        ],
      }
      const invalidData = {
        tracks: [
          { id: 'track-1', title: 'Track 1', duration: 180 },
        ],
      }

      expect(migration.validate?.(validData)).toBe(true)
      expect(migration.validate?.(invalidData)).toBe(false)
    })
  })

  describe('Playlist Migration', () => {
    it('should add timestamps to playlists', () => {
      const migration = createPlaylistMigration(2)
      const data = {
        playlists: [
          { id: 'playlist-1', name: 'Playlist 1' },
          { id: 'playlist-2', name: 'Playlist 2' },
        ],
      }

      const migrated = migration.up(data)

      expect(migrated.playlists[0].createdAt).toBeDefined()
      expect(migrated.playlists[0].updatedAt).toBeDefined()
      expect(migrated.playlists[1].createdAt).toBeDefined()
      expect(migrated.playlists[1].updatedAt).toBeDefined()
    })

    it('should rollback timestamps from playlists', () => {
      const migration = createPlaylistMigration(2)
      const data = {
        playlists: [
          { id: 'playlist-1', name: 'Playlist 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: 'playlist-2', name: 'Playlist 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      }

      const rolledBack = migration.down(data)

      expect(rolledBack.playlists[0].createdAt).toBeUndefined()
      expect(rolledBack.playlists[0].updatedAt).toBeUndefined()
      expect(rolledBack.playlists[1].createdAt).toBeUndefined()
      expect(rolledBack.playlists[1].updatedAt).toBeUndefined()
    })

    it('should validate migrated playlist data', () => {
      const migration = createPlaylistMigration(2)
      const validData = {
        playlists: [
          { id: 'playlist-1', name: 'Playlist 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      }
      const invalidData = {
        playlists: [
          { id: 'playlist-1', name: 'Playlist 1' },
        ],
      }

      expect(migration.validate?.(validData)).toBe(true)
      expect(migration.validate?.(invalidData)).toBe(false)
    })
  })

  describe('Audio Settings Migration', () => {
    it('should add new audio settings properties', () => {
      const migration = createAudioSettingsMigration(2)
      const data = {
        audioSettings: {
          volume: 0.8,
          muted: false,
        },
      }

      const migrated = migration.up(data)

      expect(migrated.audioSettings.spatial).toBeDefined()
      expect(migrated.audioSettings.spatial.enabled).toBe(false)
      expect(migrated.audioSettings.spatial.mode).toBe('stereo')
      expect(migrated.audioSettings.advanced).toBeDefined()
      expect(migrated.audioSettings.advanced.sampleRate).toBe(44100)
    })

    it('should rollback new audio settings properties', () => {
      const migration = createAudioSettingsMigration(2)
      const data = {
        audioSettings: {
          volume: 0.8,
          muted: false,
          spatial: { enabled: false, mode: 'stereo', intensity: 0.5 },
          advanced: { sampleRate: 44100, bitDepth: 16, bufferSize: 4096, latency: 0 },
        },
      }

      const rolledBack = migration.down(data)

      expect(rolledBack.audioSettings.spatial).toBeUndefined()
      expect(rolledBack.audioSettings.advanced).toBeUndefined()
      expect(rolledBack.audioSettings.volume).toBe(0.8)
      expect(rolledBack.audioSettings.muted).toBe(false)
    })

    it('should validate migrated audio settings data', () => {
      const migration = createAudioSettingsMigration(2)
      const validData = {
        audioSettings: {
          volume: 0.8,
          spatial: { enabled: false },
          advanced: { sampleRate: 44100 },
        },
      }
      const invalidData = {
        audioSettings: {
          volume: 0.8,
        },
      }

      expect(migration.validate?.(validData)).toBe(true)
      expect(migration.validate?.(invalidData)).toBe(false)
    })
  })
})

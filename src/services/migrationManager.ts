import {
  MigrationHandler,
  MigrationState,
  TemplateLocalStorage,
  CURRENT_SCHEMA_VERSION,
  StorageError,
  STORAGE_ERROR_CODES
} from '../model/template';
import { StorageManager } from './storageManager';

export class MigrationManager {
  private storageManager: StorageManager;
  private static instance: MigrationManager;

  // Define migrations in order of version
  private migrations: MigrationHandler[] = [
    // Example migration for future schema changes
    // {
    //   version: 2,
    //   description: "Add template categories and improved metadata",
    //   migrate: async (data: any) => {
    //     // Migration logic here
    //     return data;
    //   },
    //   rollback: async (data: any) => {
    //     // Rollback logic here
    //     return data;
    //   }
    // }
  ];

  private constructor() {
    this.storageManager = StorageManager.getInstance();
  }

  static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  async migrateIfNeeded(): Promise<boolean> {
    try {
      console.log('Checking if data migration is needed...');
      
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      // If no data exists, initialize with current schema
      if (!localData) {
        await this.initializeSchema();
        return true;
      }

      const currentVersion = localData.migrationState?.currentVersion || 1;
      const targetVersion = CURRENT_SCHEMA_VERSION;

      console.log(`Current schema version: ${currentVersion}, Target version: ${targetVersion}`);

      if (currentVersion < targetVersion) {
        console.log('Migration needed, starting migration process...');
        await this.runMigrations(currentVersion, targetVersion);
        return true;
      } else if (currentVersion > targetVersion) {
        // This shouldn't happen in normal circumstances
        console.warn(`Current version (${currentVersion}) is higher than target version (${targetVersion})`);
        throw new StorageError(
          STORAGE_ERROR_CODES.LOCAL_READ_FAILED,
          `Schema version mismatch: current=${currentVersion}, target=${targetVersion}`
        );
      }

      console.log('No migration needed');
      return false;
    } catch (error) {
      console.error('Migration check failed:', error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_READ_FAILED,
        'Failed to check migration status',
        error as Error
      );
    }
  }

  async forceMigration(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Forcing migration from version ${fromVersion} to ${toVersion}`);
    await this.runMigrations(fromVersion, toVersion);
  }

  async rollbackToVersion(targetVersion: number): Promise<void> {
    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      if (!localData) {
        throw new StorageError(STORAGE_ERROR_CODES.LOCAL_READ_FAILED, 'No data to rollback');
      }

      const currentVersion = localData.migrationState?.currentVersion || 1;

      if (currentVersion <= targetVersion) {
        console.log(`Already at or below target version ${targetVersion}`);
        return;
      }

      // Find migrations to rollback (in reverse order)
      const rollbackMigrations = this.migrations
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version); // Descending order

      for (const migration of rollbackMigrations) {
        if (!migration.rollback) {
          throw new StorageError(
            STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
            `Migration version ${migration.version} does not support rollback`
          );
        }

        console.log(`Rolling back migration: ${migration.version} - ${migration.description}`);
        
        try {
          const currentData = await this.storageManager.getLocalData<any>(
            'xpensabl.templates.local'
          );

          const rolledBackData = await migration.rollback(currentData);
          
          rolledBackData.migrationState = {
            currentVersion: migration.version - 1,
            lastMigration: Date.now(),
            pendingMigrations: []
          };

          await this.storageManager.setLocalData('xpensabl.templates.local', rolledBackData);
          console.log(`Successfully rolled back to version ${migration.version - 1}`);
        } catch (error) {
          console.error(`Rollback failed for version ${migration.version}:`, error);
          throw new StorageError(
            STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
            `Rollback failed at version ${migration.version}`,
            error as Error
          );
        }
      }

      console.log(`Rollback completed to version ${targetVersion}`);
    } catch (error) {
      console.error('Rollback process failed:', error);
      throw error;
    }
  }

  async validateSchemaVersion(): Promise<boolean> {
    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      if (!localData) {
        return false; // No data, will need initialization
      }

      const version = localData.migrationState?.currentVersion;
      return version === CURRENT_SCHEMA_VERSION;
    } catch (error) {
      console.error('Schema validation failed:', error);
      return false;
    }
  }

  getMigrationHistory(): MigrationHandler[] {
    return [...this.migrations]; // Return copy to prevent modification
  }

  addMigration(migration: MigrationHandler): void {
    // Validate migration
    if (migration.version <= 0) {
      throw new Error('Migration version must be positive');
    }

    if (this.migrations.some(m => m.version === migration.version)) {
      throw new Error(`Migration version ${migration.version} already exists`);
    }

    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version); // Keep sorted by version
    
    console.log(`Added migration for version ${migration.version}: ${migration.description}`);
  }

  private async initializeSchema(): Promise<void> {
    console.log('Initializing schema with current version...');
    
    const initialData: TemplateLocalStorage = {
      templates: {},
      executionQueue: [],
      migrationState: {
        currentVersion: CURRENT_SCHEMA_VERSION,
        lastMigration: Date.now(),
        pendingMigrations: []
      }
    };

    await this.storageManager.setLocalData('xpensabl.templates.local', initialData);
    console.log(`Schema initialized with version ${CURRENT_SCHEMA_VERSION}`);
  }

  private async runMigrations(fromVersion: number, toVersion: number): Promise<void> {
    const applicableMigrations = this.migrations
      .filter(m => m.version > fromVersion && m.version <= toVersion)
      .sort((a, b) => a.version - b.version); // Ascending order

    if (applicableMigrations.length === 0) {
      console.log('No migrations to run');
      return;
    }

    console.log(`Running ${applicableMigrations.length} migrations from version ${fromVersion} to ${toVersion}`);

    // Create backup before starting migrations
    await this.createBackup();

    for (const migration of applicableMigrations) {
      console.log(`Running migration to version ${migration.version}: ${migration.description}`);
      
      try {
        const currentData = await this.storageManager.getLocalData<any>(
          'xpensabl.templates.local'
        );

        // Run the migration
        const migratedData = await migration.migrate(currentData);
        
        // Update migration state
        migratedData.migrationState = {
          currentVersion: migration.version,
          lastMigration: Date.now(),
          pendingMigrations: []
        };

        // Save migrated data
        await this.storageManager.setLocalData('xpensabl.templates.local', migratedData);
        
        console.log(`Migration to version ${migration.version} completed successfully`);
        
        // Small delay between migrations to prevent overwhelming storage
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Migration to version ${migration.version} failed:`, error);
        
        // Attempt to restore backup
        try {
          await this.restoreBackup();
          console.log('Backup restored due to migration failure');
        } catch (restoreError) {
          console.error('Failed to restore backup:', restoreError);
        }
        
        throw new StorageError(
          STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
          `Migration failed at version ${migration.version}: ${error}`,
          error as Error
        );
      }
    }

    // Clean up backup after successful migration
    await this.cleanupBackup();
    console.log(`All migrations completed successfully to version ${toVersion}`);
  }

  private async createBackup(): Promise<void> {
    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      if (localData) {
        const backupData = {
          ...localData,
          backupTimestamp: Date.now()
        };

        await this.storageManager.setLocalData('xpensabl.templates.backup', backupData);
        console.log('Migration backup created');
      }
    } catch (error) {
      console.error('Failed to create migration backup:', error);
      // Don't throw here, as we still want to proceed with migration
    }
  }

  private async restoreBackup(): Promise<void> {
    try {
      const backupData = await this.storageManager.getLocalData<any>(
        'xpensabl.templates.backup'
      );

      if (backupData) {
        // Remove backup metadata before restoring
        delete backupData.backupTimestamp;
        
        await this.storageManager.setLocalData('xpensabl.templates.local', backupData);
        console.log('Migration backup restored');
      } else {
        throw new Error('No backup found');
      }
    } catch (error) {
      console.error('Failed to restore migration backup:', error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
        'Failed to restore migration backup',
        error as Error
      );
    }
  }

  private async cleanupBackup(): Promise<void> {
    try {
      await this.storageManager.removeLocalData('xpensabl.templates.backup');
      console.log('Migration backup cleaned up');
    } catch (error) {
      console.error('Failed to cleanup migration backup:', error);
      // Don't throw here, as it's not critical
    }
  }

  async getDataIntegrityReport(): Promise<{
    isValid: boolean;
    version: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      if (!localData) {
        issues.push('No local storage data found');
        suggestions.push('Initialize storage with current schema');
        return { isValid: false, version: 0, issues, suggestions };
      }

      const version = localData.migrationState?.currentVersion || 1;

      // Check version consistency
      if (version !== CURRENT_SCHEMA_VERSION) {
        issues.push(`Schema version mismatch: ${version} vs ${CURRENT_SCHEMA_VERSION}`);
        suggestions.push('Run migration to update to current schema version');
      }

      // Check template data integrity
      const templateCount = Object.keys(localData.templates || {}).length;
      if (templateCount === 0) {
        suggestions.push('No templates found - consider creating some templates');
      }

      // Check for corrupted templates
      for (const [templateId, template] of Object.entries(localData.templates || {})) {
        if (!template.id || !template.name || !template.expenseData) {
          issues.push(`Template ${templateId} has missing required fields`);
        }
        
        if (template.executionHistory && template.executionHistory.length > 100) {
          suggestions.push(`Template ${templateId} has excessive execution history (${template.executionHistory.length} records)`);
        }
      }

      // Check execution queue
      const queueLength = localData.executionQueue?.length || 0;
      if (queueLength > 50) {
        issues.push(`Execution queue is very large (${queueLength} items)`);
        suggestions.push('Clean up old execution queue items');
      }

      return {
        isValid: issues.length === 0,
        version,
        issues,
        suggestions
      };
    } catch (error) {
      issues.push(`Failed to analyze data integrity: ${error}`);
      return { isValid: false, version: 0, issues, suggestions };
    }
  }
}
import { TemplateManager } from './templateManager';
import { StorageManager } from './storageManager';
import { MigrationManager } from './migrationManager';

/**
 * Initialize the template storage system
 * This should be called when the extension starts up
 */
export async function initializeTemplateStorage(): Promise<void> {
  try {
    console.log('Initializing template storage system...');

    // Get manager instances
    const migrationManager = MigrationManager.getInstance();
    const storageManager = StorageManager.getInstance();
    const templateManager = TemplateManager.getInstance();

    // Run migrations if needed
    console.log('Checking for required migrations...');
    const migrationNeeded = await migrationManager.migrateIfNeeded();
    if (migrationNeeded) {
      console.log('✓ Data migration completed successfully');
    } else {
      console.log('✓ No migration needed');
    }

    // Validate data integrity
    console.log('Validating data integrity...');
    const integrityReport = await migrationManager.getDataIntegrityReport();
    if (integrityReport.isValid) {
      console.log('✓ Data integrity check passed');
    } else {
      console.warn('⚠ Data integrity issues found:', integrityReport.issues);
      console.log('Suggestions:', integrityReport.suggestions);
    }

    // Check storage usage
    console.log('Checking storage usage...');
    const storageUsage = await storageManager.getStorageUsageStats();
    console.log(`Storage usage - Sync: ${storageUsage.sync.percentUsed.toFixed(1)}%, Local: ${storageUsage.local.percentUsed.toFixed(1)}%`);

    if (storageUsage.sync.nearLimit || storageUsage.local.nearLimit) {
      console.warn('⚠ Storage quota is near limit, cleanup may be needed');
    }

    // Clean up old data if preferences allow
    const preferences = await templateManager.getTemplatePreferences();
    if (preferences.autoCleanupDays > 0) {
      console.log(`Running automatic cleanup (${preferences.autoCleanupDays} day retention)...`);
      const cleanedCount = await templateManager.cleanupOldData(preferences.autoCleanupDays);
      if (cleanedCount > 0) {
        console.log(`✓ Cleaned up ${cleanedCount} old records`);
      }
    }

    // Set up storage change listener
    storageManager.onStorageChanged((changes, areaName) => {
      console.log(`Storage changed in ${areaName}:`, Object.keys(changes));
      
      // Handle template sync updates
      if (areaName === 'sync' && 'xpensabl.templates.sync' in changes) {
        console.log('Template sync data updated from another device');
      }
      
      if (areaName === 'local' && 'xpensabl.templates.local' in changes) {
        console.log('Template local data updated');
      }
    });

    console.log('✓ Template storage system initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize template storage system:', error);
    throw error;
  }
}

/**
 * Get template storage system status
 */
export async function getTemplateStorageStatus(): Promise<{
  initialized: boolean;
  version: number;
  templateCount: number;
  storageUsage: {
    sync: { used: number; available: number; percentUsed: number };
    local: { used: number; available: number; percentUsed: number };
  };
  integrityReport: {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  };
}> {
  try {
    const migrationManager = MigrationManager.getInstance();
    const storageManager = StorageManager.getInstance();
    const templateManager = TemplateManager.getInstance();

    const [
      integrityReport,
      storageUsage,
      templates
    ] = await Promise.all([
      migrationManager.getDataIntegrityReport(),
      storageManager.getStorageUsageStats(),
      templateManager.getAllTemplates()
    ]);

    return {
      initialized: integrityReport.version > 0,
      version: integrityReport.version,
      templateCount: templates.length,
      storageUsage: {
        sync: {
          used: storageUsage.sync.used,
          available: storageUsage.sync.available,
          percentUsed: storageUsage.sync.percentUsed
        },
        local: {
          used: storageUsage.local.used,
          available: storageUsage.local.available,
          percentUsed: storageUsage.local.percentUsed
        }
      },
      integrityReport: {
        isValid: integrityReport.isValid,
        issues: integrityReport.issues,
        suggestions: integrityReport.suggestions
      }
    };
  } catch (error) {
    console.error('Failed to get template storage status:', error);
    throw error;
  }
}

/**
 * Emergency cleanup function for storage quota issues
 */
export async function emergencyStorageCleanup(): Promise<{
  success: boolean;
  cleanedRecords: number;
  storageFreed: number;
}> {
  try {
    console.log('Starting emergency storage cleanup...');
    
    const templateManager = TemplateManager.getInstance();
    const storageManager = StorageManager.getInstance();

    // Get initial storage usage
    const initialUsage = await storageManager.getStorageUsageStats();

    // Clean up old execution history (keep only last 30 days)
    const cleanedCount = await templateManager.cleanupOldData(30);

    // Clear storage cache to force refresh
    await storageManager.clearCache();

    // Get final storage usage
    const finalUsage = await storageManager.getStorageUsageStats();

    const storageFreed = (initialUsage.local.used - finalUsage.local.used) + 
                        (initialUsage.sync.used - finalUsage.sync.used);

    console.log(`Emergency cleanup completed: ${cleanedCount} records, ${storageFreed} bytes freed`);

    return {
      success: true,
      cleanedRecords: cleanedCount,
      storageFreed: storageFreed
    };
  } catch (error) {
    console.error('Emergency cleanup failed:', error);
    return {
      success: false,
      cleanedRecords: 0,
      storageFreed: 0
    };
  }
}

/**
 * Export all template data for backup purposes
 */
export async function exportTemplateData(): Promise<{
  templates: any[];
  preferences: any;
  exportTime: number;
  version: number;
}> {
  try {
    const templateManager = TemplateManager.getInstance();
    const migrationManager = MigrationManager.getInstance();

    const [templates, preferences, integrityReport] = await Promise.all([
      templateManager.getAllTemplates(),
      templateManager.getTemplatePreferences(),
      migrationManager.getDataIntegrityReport()
    ]);

    return {
      templates: templates.map(template => ({
        ...template,
        // Remove execution history for smaller export size
        executionHistory: template.executionHistory.slice(-10) // Keep last 10 records
      })),
      preferences,
      exportTime: Date.now(),
      version: integrityReport.version
    };
  } catch (error) {
    console.error('Failed to export template data:', error);
    throw error;
  }
}

/**
 * Test template storage system functionality
 */
export async function testTemplateStorage(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    const templateManager = TemplateManager.getInstance();
    
    // Test 1: Create a test template
    try {
      const testTemplate = await templateManager.createTemplate({
        name: 'Storage Test Template',
        expenseData: {
          merchantAmount: 50,
          merchantCurrency: 'USD',
          policy: 'test',
          merchant: {
            category: 'Test',
            categoryGroup: 'Test',
            description: 'Test Merchant',
            formattedAddress: 'Test Address',
            name: 'Test Merchant',
            online: false,
            perDiem: false,
            timeZone: 'UTC'
          },
          details: {
            description: 'Test expense for storage verification',
            personal: false,
            participants: [],
            customFieldValues: [],
            taxDetails: {
              country: 'US',
              noTax: true,
              reverseCharge: false,
              taxRateDecimal: false
            }
          },
          reportingData: {}
        },
        createdFrom: 'manual'
      });
      results.push(`✓ Created test template: ${testTemplate.id}`);

      // Test 2: Retrieve template
      const retrieved = await templateManager.getTemplate(testTemplate.id);
      if (retrieved) {
        results.push('✓ Successfully retrieved template');
      } else {
        errors.push('✗ Failed to retrieve created template');
      }

      // Test 3: Update template
      const updated = await templateManager.updateTemplate(testTemplate.id, {
        name: 'Updated Storage Test Template'
      });
      if (updated.name === 'Updated Storage Test Template') {
        results.push('✓ Successfully updated template');
      } else {
        errors.push('✗ Template update failed');
      }

      // Test 4: Clean up test template
      await templateManager.deleteTemplate(testTemplate.id);
      results.push('✓ Successfully deleted test template');
    } catch (error) {
      errors.push(`✗ Template operations failed: ${error}`);
    }

    // Test 5: Storage usage check
    try {
      const usage = await templateManager.getStorageUsage();
      results.push(`✓ Storage usage check: sync ${usage.sync.percentUsed.toFixed(1)}%, local ${usage.local.percentUsed.toFixed(1)}%`);
    } catch (error) {
      errors.push(`✗ Storage usage check failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  } catch (error) {
    errors.push(`✗ Storage test failed: ${error}`);
    return { success: false, results, errors };
  }
}
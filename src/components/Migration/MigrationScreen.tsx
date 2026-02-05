import React, { useState, useEffect } from 'react';
import { dataMigrationService, MigrationProgress, MigrationResult } from '../../services/DataMigrationService';

interface MigrationScreenProps {
  onMigrationComplete: () => void;
  onSkipMigration: () => void;
}

export const MigrationScreen: React.FC<MigrationScreenProps> = ({ 
  onMigrationComplete, 
  onSkipMigration 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleMigrate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const migrationResult = await dataMigrationService.migrateToCloud(setProgress);
      setResult(migrationResult);
      
      if (migrationResult.success) {
        dataMigrationService.markMigrationComplete();
        setTimeout(() => {
          onMigrationComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    dataMigrationService.markMigrationComplete();
    onSkipMigration();
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'preparing': return '⚙️';
      case 'voiceNotes': return '🎙️';
      case 'documents': return '📄';
      case 'goals': return '🎯';
      case 'achievements': return '🏆';
      case 'analytics': return '📊';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '📦';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">☁️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Migrate to Cloud</h1>
          <p className="text-gray-600">
            Move your data to the cloud for unlimited storage and cross-device sync
          </p>
        </div>

        {!isLoading && !result && (
          <>
            {/* Benefits */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-800 mb-2">🚀 Cloud Benefits (100% FREE)</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ 1GB storage (vs 10MB local)</li>
                <li>✅ Access from any device</li>
                <li>✅ Automatic backups</li>
                <li>✅ Real-time synchronization</li>
                <li>✅ Never lose data again</li>
              </ul>
            </div>

            {/* Migration Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">📦 What will be migrated?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• All your voice notes and recordings</li>
                <li>• Documents and transcriptions</li>
                <li>• Goals and achievements</li>
                <li>• Recent analytics data</li>
                <li>• App preferences and settings</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleMigrate}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition-colors"
              >
                🚀 Migrate to Cloud (FREE)
              </button>
              
              <button
                onClick={handleSkip}
                className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-3 font-medium hover:bg-gray-200 transition-colors"
              >
                Skip for now (Keep using localStorage)
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your data will be safely backed up locally before migration
            </p>
          </>
        )}

        {/* Migration Progress */}
        {isLoading && progress && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl mb-2">{getStageIcon(progress.stage)}</div>
              <h3 className="font-medium text-gray-900 mb-1">
                {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
              </h3>
              <p className="text-sm text-gray-600">{progress.message}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 text-center">
                {progress.current} of {progress.total} items
              </div>
            </div>

            {/* Cancel option */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Please don't close this window during migration
              </p>
            </div>
          </div>
        )}

        {/* Migration Result */}
        {result && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {result.success ? '🎉' : '⚠️'}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {result.success ? 'Migration Complete!' : 'Migration Issues'}
              </h3>
              <p className="text-gray-600">
                {result.success 
                  ? 'Your data has been successfully migrated to the cloud'
                  : 'Some issues occurred during migration'
                }
              </p>
            </div>

            {/* Migration Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Migration Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Voice Notes:</span>
                  <span className="font-medium">{result.migratedCounts.voiceNotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents:</span>
                  <span className="font-medium">{result.migratedCounts.documents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Goals:</span>
                  <span className="font-medium">{result.migratedCounts.goals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Achievements:</span>
                  <span className="font-medium">{result.migratedCounts.achievements}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Analytics:</span>
                  <span className="font-medium">{result.migratedCounts.analytics}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{(result.duration / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Issues Encountered</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {result.success ? (
              <div className="text-center">
                <div className="text-sm text-green-600 mb-4">
                  ✅ Redirecting to your cloud-powered VoiceVault...
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleMigrate}
                  className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Migration Again
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-3 font-medium hover:bg-gray-200 transition-colors"
                >
                  Continue Without Migration
                </button>
              </div>
            )}

            {/* Details Toggle */}
            <div className="text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Detailed Info */}
            {showDetails && (
              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
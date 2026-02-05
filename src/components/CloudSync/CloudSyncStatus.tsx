import React from 'react';
import { useCloudSync } from './CloudSyncProvider';

export const CloudSyncStatus: React.FC = () => {
  const { syncStatus, lastSyncTime, user, syncData } = useCloudSync();

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'synced': return '✅';
      case 'error': return '❌';
      default: return '☁️';
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Synced';
      case 'error': return 'Sync Error';
      default: return 'Cloud Ready';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-600';
      case 'synced': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={syncData}
        disabled={syncStatus === 'syncing'}
        className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors ${getSyncColor()}`}
        title={`Last sync: ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}`}
      >
        <span className={syncStatus === 'syncing' ? 'animate-spin' : ''}>
          {getSyncIcon()}
        </span>
        <span className="hidden sm:inline">{getSyncText()}</span>
      </button>
      
      {lastSyncTime && (
        <span className="text-xs text-gray-500 hidden md:inline">
          {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
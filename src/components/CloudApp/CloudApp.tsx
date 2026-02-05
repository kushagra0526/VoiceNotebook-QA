import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../../services/AuthService';
import { dataMigrationService } from '../../services/DataMigrationService';
import { CloudSyncProvider } from '../CloudSync/CloudSyncProvider';
import { LoginScreen } from '../Auth/LoginScreen';
import { MigrationScreen } from '../Migration/MigrationScreen';
import { EnhancedApp } from '../EnhancedApp/EnhancedApp';

export const CloudApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
      
      if (user) {
        // Check if migration is needed
        const needsMigration = dataMigrationService.needsMigration();
        setShowMigration(needsMigration);
      }
    });

    return unsubscribe;
  }, []);

  const handleLoginSuccess = () => {
    // User state will be updated by the auth listener
    // Check if migration is needed after login
    const needsMigration = dataMigrationService.needsMigration();
    setShowMigration(needsMigration);
  };

  const handleMigrationComplete = () => {
    setShowMigration(false);
  };

  const handleSkipMigration = () => {
    setShowMigration(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <div className="text-lg font-medium text-gray-700 mb-2">VoiceVault</div>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Show migration screen if needed
  if (showMigration) {
    return (
      <MigrationScreen
        onMigrationComplete={handleMigrationComplete}
        onSkipMigration={handleSkipMigration}
      />
    );
  }

  // Show main app with cloud sync
  return (
    <CloudSyncProvider>
      <EnhancedApp />
    </CloudSyncProvider>
  );
};
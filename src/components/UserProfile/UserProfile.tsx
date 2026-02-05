import React, { useState, useEffect } from 'react';
import { useCloudSync } from '../CloudSync/CloudSyncProvider';
import { authService, UserProfile as UserProfileType } from '../../services/AuthService';
import { cloudDataService } from '../../services/CloudDataService';

export const UserProfile: React.FC = () => {
  const { user, signOut } = useCloudSync();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [storageUsage, setStorageUsage] = useState({ voiceNotes: 0, documents: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [userProfile, usage] = await Promise.all([
        authService.getUserProfile(user.uid),
        cloudDataService.getStorageUsage(user.uid)
      ]);

      setProfile(userProfile);
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
        <button
          onClick={handleSignOut}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4 mb-6">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl text-blue-600">
              {(profile?.displayName || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {profile?.displayName || 'Anonymous User'}
          </h3>
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="text-xs text-gray-500">
            Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Cloud Storage Usage</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Voice Notes</span>
            <span className="text-sm font-medium">{storageUsage.voiceNotes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Documents</span>
            <span className="text-sm font-medium">{storageUsage.documents}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium text-gray-900">Total Items</span>
            <span className="text-sm font-bold text-blue-600">{storageUsage.total}</span>
          </div>
        </div>
        
        {/* Storage Limit Info */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600">✅</span>
            <span className="text-sm font-medium text-green-800">Firebase Free Tier</span>
          </div>
          <div className="text-xs text-green-700">
            <div>• 1GB total storage</div>
            <div>• 50,000 reads per day</div>
            <div>• 20,000 writes per day</div>
            <div>• Unlimited authentication</div>
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{storageUsage.voiceNotes}</div>
          <div className="text-xs text-gray-600">Voice Notes</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{storageUsage.documents}</div>
          <div className="text-xs text-gray-600">Documents</div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-2">
        <button
          onClick={loadUserData}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
        >
          🔄 Refresh Data
        </button>
        
        <button
          onClick={() => window.open('https://console.firebase.google.com', '_blank')}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
        >
          ⚙️ Firebase Console
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-xs text-gray-500">
          Powered by Firebase • 100% Free Forever
        </p>
      </div>
    </div>
  );
};
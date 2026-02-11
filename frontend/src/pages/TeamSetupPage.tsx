/**
 * Team Setup Page - Create or join a team for data sharing via CloudKit
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Building2,
  Share2,
  UserPlus,
  Check,
  AlertCircle,
  Cloud,
  CloudOff,
  Copy,
  Mail,
  MessageSquare,
  RefreshCw,
  Shield,
  Smartphone,
  Link,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { cloudKitService, Company } from '../services/cloudKitService';
import { localDB } from '../utils/localDB';

type SetupStep = 'check' | 'create' | 'join' | 'done';

export function TeamSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState<SetupStep>('check');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // iCloud status
  const [iCloudStatus, setICloudStatus] = useState<'available' | 'noAccount' | 'restricted' | 'unknown'>('unknown');
  const [isCloudKitReady, setIsCloudKitReady] = useState(false);
  
  // Company data
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize CloudKit
      const ready = await cloudKitService.init();
      setIsCloudKitReady(ready);
      
      // Get iCloud status
      const status = await cloudKitService.getAccountStatus();
      setICloudStatus(status);
      
      // Check if already in a company
      const existingCompany = await localDB.getSetting<Company>('company');
      if (existingCompany) {
        setCompany(existingCompany);
        setShareUrl(existingCompany.shareUrl || null);
        setStep('done');
      } else if (ready) {
        setStep('create');
      } else {
        setStep('check');
      }
    } catch (err) {
      console.error('Setup check failed:', err);
      setError('Failed to check iCloud status');
    } finally {
      setIsLoading(false);
    }
  };

  const createCompany = async () => {
    if (!companyName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newCompany = await cloudKitService.createCompany(companyName.trim());
      
      if (newCompany) {
        setCompany(newCompany);
        setShareUrl(newCompany.shareUrl || null);
        setStep('done');
      } else {
        setError('Failed to create team. Please try again.');
      }
    } catch (err) {
      console.error('Create company failed:', err);
      setError('Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaEmail = () => {
    if (!shareUrl || !company) return;
    const subject = encodeURIComponent(`Join ${company.name} on Office Bridge`);
    const body = encodeURIComponent(
      `You've been invited to join ${company.name} on Office Bridge.\n\n` +
      `Click this link on your iPhone or iPad to join:\n${shareUrl}\n\n` +
      `Office Bridge is a construction field management app that helps teams coordinate deliveries, daily reports, and project tasks.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaSMS = () => {
    if (!shareUrl || !company) return;
    const body = encodeURIComponent(
      `Join ${company.name} on Office Bridge: ${shareUrl}`
    );
    window.open(`sms:?body=${body}`);
  };

  const shareNative = async () => {
    if (!shareUrl || !company) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${company.name}`,
          text: `You've been invited to join ${company.name} on Office Bridge`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const doFullSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await cloudKitService.fullSync();
      setSyncResult({ synced: result.synced, errors: result.errors });
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({ synced: 0, errors: 1 });
    } finally {
      setIsSyncing(false);
    }
  };

  // Loading state
  if (isLoading && step === 'check') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Checking iCloud status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-semibold">Team Setup</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-800">Error</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
          </div>
        )}

        {/* Step: Check iCloud */}
        {step === 'check' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              {iCloudStatus === 'available' ? (
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Cloud size={40} className="text-green-600" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CloudOff size={40} className="text-gray-400" />
                </div>
              )}
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {iCloudStatus === 'available' ? 'iCloud Connected' : 'iCloud Required'}
              </h2>
              
              <p className="text-gray-600 max-w-sm mx-auto">
                {iCloudStatus === 'available' 
                  ? 'Your iCloud account is ready for team sync.'
                  : 'Sign in to iCloud in Settings to enable team sync.'}
              </p>
            </div>

            {iCloudStatus !== 'available' && (
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2">How to enable iCloud:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Open <strong>Settings</strong> on your device</li>
                  <li>2. Tap your name at the top</li>
                  <li>3. Tap <strong>iCloud</strong></li>
                  <li>4. Sign in with your Apple ID</li>
                  <li>5. Return to this app</li>
                </ol>
              </div>
            )}

            <button
              onClick={checkSetup}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Check Again
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 text-gray-600"
            >
              Continue Without Team Sync
            </button>
          </div>
        )}

        {/* Step: Create Company */}
        {step === 'create' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Create Your Team</h2>
              <p className="text-gray-600">Set up a shared workspace for your company</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company / Team Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g., ABC Mechanical"
                className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">Secure & Private</strong><br />
                  Data syncs via Apple's iCloud - no third-party servers
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">Team Collaboration</strong><br />
                  Invite team members to share projects & data
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">Works Offline</strong><br />
                  Changes sync automatically when back online
                </div>
              </div>
            </div>

            <button
              onClick={createCompany}
              disabled={!companyName.trim() || isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Create Team
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Done - Show team info and invite options */}
        {step === 'done' && company && (
          <div className="space-y-6">
            {/* Team Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 size={28} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{company.name}</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Cloud size={14} />
                    iCloud Sync Active
                  </div>
                </div>
              </div>
              
              {/* Sync Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">Sync Status</div>
                  {syncResult ? (
                    <div className="text-xs text-gray-500">
                      {syncResult.synced} synced, {syncResult.errors} errors
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Tap to sync now</div>
                  )}
                </div>
                <button
                  onClick={doFullSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    'Sync'
                  )}
                </button>
              </div>
            </div>

            {/* Invite Team Members */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-1">Invite Team Members</h3>
              <p className="text-sm text-gray-500 mb-4">
                Share the link below with your team to give them access
              </p>
              
              {shareUrl ? (
                <>
                  {/* Share Link */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                    <Link size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-600 truncate">{shareUrl}</span>
                    <button
                      onClick={copyShareLink}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  
                  {/* Share Options */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={shareNative}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl"
                    >
                      <Share2 size={20} className="text-blue-600" />
                      <span className="text-xs text-gray-700">Share</span>
                    </button>
                    <button
                      onClick={shareViaEmail}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl"
                    >
                      <Mail size={20} className="text-blue-600" />
                      <span className="text-xs text-gray-700">Email</span>
                    </button>
                    <button
                      onClick={shareViaSMS}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl"
                    >
                      <MessageSquare size={20} className="text-blue-600" />
                      <span className="text-xs text-gray-700">Message</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Share link not available
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Team members open the link on their iPhone/iPad</li>
                <li>• They accept the iCloud sharing invitation</li>
                <li>• All projects, deliveries, and reports sync automatically</li>
                <li>• Everyone sees updates in real-time</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

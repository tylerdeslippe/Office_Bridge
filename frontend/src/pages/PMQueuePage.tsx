/**
 * PM Queue Dashboard - Review draft projects and quote requests
 * Central hub for PM to manage incoming work
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Clock,
  MapPin,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  Zap,
  Check,
  X,
  Filter,
  Building2,
  ShieldX
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';
import { pmQueueApi, quotesApi, projectsApi } from '../utils/api';

interface PMQueueStats {
  draft_projects: number;
  pending_quotes: number;
  in_review_quotes: number;
  total_action_needed: number;
}

interface PMQueueItem {
  item_type: string;
  id: number;
  title: string;
  description?: string;
  submitted_by?: string;
  submitted_at: string;
  urgency?: string;
  status: string;
  address?: string;
}

interface QuoteDetail {
  id: number;
  title: string;
  description: string;
  address?: string;
  customer_name?: string;
  customer_phone?: string;
  photos?: string[];
  scope_notes?: string;
  urgency?: string;
  status: string;
  submitted_by_name?: string;
  quoted_amount?: number;
  quote_notes?: string;
  created_at: string;
}

type FilterType = 'all' | 'draft_project' | 'quote_request';

export function PMQueuePage() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { isPM, user } = useAuthStore();
  
  const [stats, setStats] = useState<PMQueueStats | null>(null);
  const [items, setItems] = useState<PMQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Quote detail modal
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, itemsRes] = await Promise.all([
        pmQueueApi.stats(),
        pmQueueApi.list({ item_type: filter === 'all' ? undefined : filter })
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch PM queue:', err);
      showToast('Failed to load queue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open quote detail
  const openQuoteDetail = async (quoteId: number) => {
    setIsLoadingQuote(true);
    try {
      const response = await quotesApi.get(quoteId);
      setSelectedQuote(response.data);
      setQuoteAmount(response.data.quoted_amount?.toString() || '');
      setQuoteNotes(response.data.quote_notes || '');
    } catch (err) {
      showToast('Failed to load quote details', 'error');
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Update quote status
  const updateQuoteStatus = async (status: string) => {
    if (!selectedQuote) return;
    
    setIsUpdatingQuote(true);
    try {
      await quotesApi.update(selectedQuote.id, {
        status,
        quoted_amount: quoteAmount ? parseFloat(quoteAmount) : undefined,
        quote_notes: quoteNotes || undefined,
      });
      showToast(`Quote ${status === 'quoted' ? 'sent' : 'updated'}!`, 'success');
      setSelectedQuote(null);
      fetchData();
    } catch (err) {
      showToast('Failed to update quote', 'error');
    } finally {
      setIsUpdatingQuote(false);
    }
  };

  // Convert quote to project
  const convertToProject = async () => {
    if (!selectedQuote) return;
    
    setIsUpdatingQuote(true);
    try {
      const response = await quotesApi.convertToProject(selectedQuote.id);
      showToast(`Project ${response.data.project_number} created!`, 'success');
      setSelectedQuote(null);
      navigate(`/projects/${response.data.project_id}`);
    } catch (err) {
      showToast('Failed to convert to project', 'error');
    } finally {
      setIsUpdatingQuote(false);
    }
  };

  // Navigate to draft project
  const openDraftProject = (projectId: number) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'emergency':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><AlertCircle size={10} /> Emergency</span>;
      case 'rush':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1"><Zap size={10} /> Rush</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Check PM access
  if (!isPM()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldX size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            The PM Queue is only available to Project Managers, Superintendents, and Admins.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your current role: <span className="font-medium capitalize">{user?.role?.replace('_', ' ') || 'Unknown'}</span>
          </p>
          <button 
            onClick={() => navigate('/today')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
          >
            Go to Today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">PM Queue</h1>
        <button onClick={fetchData} disabled={isLoading} className="p-2 -mr-2">
          <RefreshCw size={20} className={isLoading ? 'animate-spin text-gray-400' : 'text-gray-600'} />
        </button>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.draft_projects}</div>
            <div className="text-xs text-gray-500">Draft Projects</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending_quotes}</div>
            <div className="text-xs text-gray-500">Pending Quotes</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.in_review_quotes}</div>
            <div className="text-xs text-gray-500">In Review</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            All ({stats?.total_action_needed || 0})
          </button>
          <button
            onClick={() => setFilter('draft_project')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'draft_project' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Drafts ({stats?.draft_projects || 0})
          </button>
          <button
            onClick={() => setFilter('quote_request')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'quote_request' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Quotes ({(stats?.pending_quotes || 0) + (stats?.in_review_quotes || 0)})
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Check size={48} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
            <p className="text-gray-500">No items need your attention right now.</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={`${item.item_type}-${item.id}`}
              onClick={() => {
                if (item.item_type === 'quote_request') {
                  openQuoteDetail(item.id);
                } else {
                  openDraftProject(item.id);
                }
              }}
              className="bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.item_type === 'quote_request' 
                    ? 'bg-amber-100' 
                    : 'bg-blue-100'
                }`}>
                  {item.item_type === 'quote_request' ? (
                    <DollarSign size={20} className="text-amber-600" />
                  ) : (
                    <FileText size={20} className="text-blue-600" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                        {getUrgencyBadge(item.urgency)}
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full ${
                      item.item_type === 'quote_request' 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {item.item_type === 'quote_request' ? 'Quote' : 'Draft'}
                    </span>
                    
                    {item.submitted_by && (
                      <span className="flex items-center gap-1">
                        <User size={12} /> {item.submitted_by}
                      </span>
                    )}
                    
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDate(item.submitted_at)}
                    </span>
                    
                    {item.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} /> {item.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-lg">Quote Request</h3>
                <p className="text-sm text-gray-500">#{selectedQuote.id}</p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-2 text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingQuote ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Title & Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{selectedQuote.title}</h4>
                      {getUrgencyBadge(selectedQuote.urgency)}
                    </div>
                    <p className="text-gray-600">{selectedQuote.description}</p>
                  </div>
                  
                  {/* Photos */}
                  {selectedQuote.photos && selectedQuote.photos.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedQuote.photos.map((photo, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedQuote.address && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Location</label>
                        <p className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin size={14} /> {selectedQuote.address}
                        </p>
                      </div>
                    )}
                    {selectedQuote.customer_name && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Customer</label>
                        <p className="text-sm text-gray-900">{selectedQuote.customer_name}</p>
                        {selectedQuote.customer_phone && (
                          <a href={`tel:${selectedQuote.customer_phone}`} className="text-sm text-blue-600">
                            {selectedQuote.customer_phone}
                          </a>
                        )}
                      </div>
                    )}
                    {selectedQuote.submitted_by_name && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Submitted By</label>
                        <p className="text-sm text-gray-900">{selectedQuote.submitted_by_name}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Submitted</label>
                      <p className="text-sm text-gray-900">{new Date(selectedQuote.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {selectedQuote.scope_notes && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Additional Notes</label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedQuote.scope_notes}</p>
                    </div>
                  )}
                  
                  {/* Quote Input */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Quote</label>
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          value={quoteAmount}
                          onChange={e => setQuoteAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <textarea
                      value={quoteNotes}
                      onChange={e => setQuoteNotes(e.target.value)}
                      placeholder="Notes for customer (scope, terms, exclusions)..."
                      rows={3}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Actions */}
            <div className="p-4 border-t flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => updateQuoteStatus('quoted')}
                  disabled={isUpdatingQuote || !quoteAmount}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingQuote ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Send Quote
                </button>
                <button
                  onClick={convertToProject}
                  disabled={isUpdatingQuote}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Building2 size={18} />
                  Create Project
                </button>
              </div>
              <button
                onClick={() => updateQuoteStatus('declined')}
                disabled={isUpdatingQuote}
                className="w-full py-3 text-red-600 font-medium"
              >
                Decline Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

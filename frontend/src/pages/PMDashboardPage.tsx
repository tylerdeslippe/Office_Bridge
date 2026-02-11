/**
 * PM Dashboard - Central hub for Project Managers
 * Shows all field submissions: Daily Reports, Quotes, POs, Look-Ahead, Draft Projects
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
  Users,
  Calendar,
  ShoppingCart,
  ClipboardList,
  Building2,
  Eye,
  Filter,
  ShieldX,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';
import { pmQueueApi, quotesApi, dailyReportsApi, projectsApi } from '../utils/api';

type TabType = 'all' | 'quotes' | 'daily_reports' | 'projects' | 'purchase_orders';

interface DailyReportSummary {
  id: number;
  project_name: string;
  report_date: string;
  crew_count: number;
  submitted_by: string;
  created_at: string;
  work_completed?: string;
  has_delays: boolean;
}

export function PMDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { isPM, user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data states
  const [quotes, setQuotes] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReportSummary[]>([]);
  const [draftProjects, setDraftProjects] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  
  // Counts for badges
  const [counts, setCounts] = useState({
    quotes: 0,
    daily_reports: 0,
    projects: 0,
    purchase_orders: 0,
  });

  // Selected item for detail view
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  // Check PM access
  if (!isPM()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldX size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            The PM Dashboard is only available to Project Managers, Superintendents, and Admins.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your current role: <span className="font-medium">{user?.role || 'Unknown'}</span>
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

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch quotes
      const quotesRes = await quotesApi.list({ status: 'pending,in_review' });
      const quotesData = quotesRes.data || [];
      setQuotes(quotesData);
      
      // Fetch daily reports (last 7 days)
      const reportsRes = await dailyReportsApi.list({ limit: 20 });
      const reportsData = reportsRes.data || [];
      setDailyReports(reportsData);
      
      // Fetch draft projects
      const projectsRes = await projectsApi.list({ status: 'draft' });
      const projectsData = projectsRes.data || [];
      setDraftProjects(projectsData);
      
      // POs would come from backend - for now mock empty
      setPurchaseOrders([]);
      
      setCounts({
        quotes: quotesData.length,
        daily_reports: reportsData.length,
        projects: projectsData.length,
        purchase_orders: 0,
      });
    } catch (err) {
      console.error('Failed to fetch PM data:', err);
    } finally {
      setIsLoading(false);
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

  const totalItems = counts.quotes + counts.daily_reports + counts.projects + counts.purchase_orders;

  const tabs: { key: TabType; label: string; icon: any; count: number; color: string }[] = [
    { key: 'all', label: 'All', icon: ClipboardList, count: totalItems, color: 'blue' },
    { key: 'quotes', label: 'Quotes', icon: DollarSign, count: counts.quotes, color: 'amber' },
    { key: 'daily_reports', label: 'Dailies', icon: FileText, count: counts.daily_reports, color: 'green' },
    { key: 'projects', label: 'Drafts', icon: Building2, count: counts.projects, color: 'purple' },
    { key: 'purchase_orders', label: 'POs', icon: ShoppingCart, count: counts.purchase_orders, color: 'indigo' },
  ];

  // Filter items based on active tab
  const getFilteredItems = () => {
    const allItems: any[] = [];
    
    if (activeTab === 'all' || activeTab === 'quotes') {
      quotes.forEach(q => allItems.push({ ...q, _type: 'quote' }));
    }
    if (activeTab === 'all' || activeTab === 'daily_reports') {
      dailyReports.forEach(r => allItems.push({ ...r, _type: 'daily_report' }));
    }
    if (activeTab === 'all' || activeTab === 'projects') {
      draftProjects.forEach(p => allItems.push({ ...p, _type: 'draft_project' }));
    }
    if (activeTab === 'all' || activeTab === 'purchase_orders') {
      purchaseOrders.forEach(po => allItems.push({ ...po, _type: 'purchase_order' }));
    }
    
    // Sort by date (most recent first)
    return allItems.sort((a, b) => {
      const dateA = new Date(a.created_at || a.report_date || 0);
      const dateB = new Date(b.created_at || b.report_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const renderItemCard = (item: any) => {
    switch (item._type) {
      case 'quote':
        return (
          <button
            key={`quote-${item.id}`}
            onClick={() => navigate('/pm-queue')} // Go to old PM Queue for now
            className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Quote</span>
                  {getUrgencyBadge(item.urgency)}
                </div>
                <h3 className="font-medium text-gray-900 mt-1">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatDate(item.created_at)}
                  </span>
                  {item.address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {item.address}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </div>
          </button>
        );

      case 'daily_report':
        return (
          <button
            key={`report-${item.id}`}
            onClick={() => setSelectedReport(item)}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Daily Report</span>
                  {item.has_delays && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Has Delays</span>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 mt-1">{item.project_name || 'Project'}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(item.report_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' • '}
                  <span className="text-green-600 font-medium">{item.crew_count} crew</span>
                </p>
                {item.work_completed && (
                  <p className="text-sm text-gray-400 line-clamp-1 mt-1">{item.work_completed}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <User size={12} /> {item.submitted_by || 'Field'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </div>
          </button>
        );

      case 'draft_project':
        return (
          <button
            key={`project-${item.id}`}
            onClick={() => navigate(`/projects/${item.id}/edit`)}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Draft Project</span>
                <h3 className="font-medium text-gray-900 mt-1">{item.name}</h3>
                {item.address && (
                  <p className="text-sm text-gray-500 mt-0.5">{item.address}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </div>
          </button>
        );

      case 'purchase_order':
        return (
          <div
            key={`po-${item.id}`}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Purchase Order</span>
                <h3 className="font-medium text-gray-900 mt-1">PO #{item.po_number}</h3>
                <p className="text-sm text-gray-500">{item.vendor_name}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">PM Dashboard</h1>
        <button onClick={fetchAllData} disabled={isLoading} className="p-2 -mr-2">
          <RefreshCw size={20} className={isLoading ? 'animate-spin text-gray-400' : 'text-gray-600'} />
        </button>
      </header>

      {/* Summary Cards */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <DollarSign size={20} className="mx-auto text-amber-600 mb-1" />
          <div className="text-xl font-bold text-amber-700">{counts.quotes}</div>
          <div className="text-xs text-amber-600">Quotes</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <FileText size={20} className="mx-auto text-green-600 mb-1" />
          <div className="text-xl font-bold text-green-700">{counts.daily_reports}</div>
          <div className="text-xs text-green-600">Dailies</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
          <Building2 size={20} className="mx-auto text-purple-600 mb-1" />
          <div className="text-xl font-bold text-purple-700">{counts.projects}</div>
          <div className="text-xs text-purple-600">Drafts</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
          <ShoppingCart size={20} className="mx-auto text-indigo-600 mb-1" />
          <div className="text-xl font-bold text-indigo-700">{counts.purchase_orders}</div>
          <div className="text-xs text-indigo-600">POs</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? `bg-${tab.color}-600 text-white`
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
              style={activeTab === tab.key ? { backgroundColor: `var(--${tab.color}-600, #2563eb)` } : {}}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : getFilteredItems().length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-700">No items to review</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'all' 
                ? 'Nothing has been submitted yet'
                : `No ${activeTab.replace('_', ' ')} to review`
              }
            </p>
          </div>
        ) : (
          getFilteredItems().map(item => renderItemCard(item))
        )}
      </div>

      {/* Daily Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-lg">Daily Report</h3>
                <p className="text-sm text-gray-500">
                  {new Date(selectedReport.report_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Project */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-xs text-blue-600 font-medium mb-1">PROJECT</div>
                <div className="font-semibold text-blue-900">{selectedReport.project_name}</div>
              </div>
              
              {/* Crew & Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <Users size={24} className="mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-700">{selectedReport.crew_count}</div>
                  <div className="text-xs text-green-600">Crew Members</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <Clock size={24} className="mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-bold text-blue-700">{selectedReport.crew_count * 8}</div>
                  <div className="text-xs text-blue-600">Man-Hours</div>
                </div>
              </div>
              
              {/* Work Completed */}
              {selectedReport.work_completed && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Work Completed</div>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    {selectedReport.work_completed}
                  </div>
                </div>
              )}
              
              {/* Delays */}
              {selectedReport.has_delays && selectedReport.delays_constraints && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertCircle size={18} />
                    Problems/Delays Reported
                  </div>
                  <p className="text-sm text-red-600">{selectedReport.delays_constraints}</p>
                </div>
              )}
              
              {/* Submitted By */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                <span>Submitted by {selectedReport.submitted_by || 'Field'}</span>
                <span>{formatDate(selectedReport.created_at)}</span>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Today Page - Daily Cockpit with Real API Data
 * Shows blockers (RFIs, constraints, late deliveries) and quick tools
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileQuestion,
  Truck,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  Camera,
  ChevronRight,
  AlertCircle,
  Package,
  ShoppingCart,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAppStore, BlockerItem } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';
import { rfisApi, constraintsApi, deliveriesApi, tasksApi } from '../utils/api';

// Blocker card component
function BlockerCard({ blocker, onClick }: { blocker: BlockerItem; onClick?: () => void }) {
  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50',
    warning: 'border-l-amber-500 bg-amber-50',
    info: 'border-l-blue-500 bg-blue-50',
  };

  const typeIcons = {
    rfi: FileQuestion,
    change: AlertTriangle,
    delivery: Truck,
    constraint: Clock,
    task: CheckCircle2,
  };

  const Icon = typeIcons[blocker.type] || AlertCircle;

  return (
    <button 
      onClick={onClick}
      className={`w-full p-3 rounded-lg border-l-4 ${severityStyles[blocker.severity]} text-left`}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className="flex-shrink-0 mt-0.5 text-gray-600" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm">{blocker.title}</div>
          <div className="text-xs text-gray-600 mt-0.5">{blocker.description}</div>
          {blocker.dueDate && (
            <div className="text-xs text-gray-500 mt-1">Due: {blocker.dueDate}</div>
          )}
        </div>
        <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
      </div>
    </button>
  );
}

// Quick tool button
function ToolButton({ 
  icon: Icon, 
  label, 
  to, 
  color = 'bg-gray-100',
}: { 
  icon: any; 
  label: string; 
  to: string;
  color?: string;
}) {
  return (
    <Link to={to} className="block">
      <div className={`${color} rounded-xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform`}>
        <Icon size={28} className="text-gray-700" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
    </Link>
  );
}

export function TodayPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentProject, blockers, setBlockers, setUnacknowledgedTasks } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Fetch blockers when project changes
  useEffect(() => {
    if (!currentProject) {
      setBlockers([]);
      setDeliveries([]);
      return;
    }
    
    const abortController = new AbortController();
    
    const fetchData = async () => {
      if (abortController.signal.aborted) return;
      
      setIsLoading(true);
      const newBlockers: BlockerItem[] = [];

      try {
        // Fetch unanswered RFIs
        const rfisResponse = await rfisApi.list({ 
          project_id: currentProject.id, 
          status: 'open' 
        });
        if (abortController.signal.aborted) return;
        
        const openRfis = Array.isArray(rfisResponse.data) ? rfisResponse.data : [];
        if (openRfis.length > 0) {
          newBlockers.push({
            id: 'rfis',
            type: 'rfi',
            title: `${openRfis.length} RFI${openRfis.length > 1 ? 's' : ''} Unanswered`,
            description: openRfis.slice(0, 3).map((r: any) => r.question?.substring(0, 30)).join(', '),
            severity: 'critical',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.log('No RFIs or error fetching');
      }

      try {
        // Fetch unresolved constraints
        const constraintsResponse = await constraintsApi.list({ 
          project_id: currentProject.id, 
          status: 'open' 
        });
        if (abortController.signal.aborted) return;
        
        const openConstraints = Array.isArray(constraintsResponse.data) ? constraintsResponse.data : [];
        if (openConstraints.length > 0) {
          newBlockers.push({
            id: 'constraints',
            type: 'constraint',
            title: `${openConstraints.length} Constraint${openConstraints.length > 1 ? 's' : ''} Unresolved`,
            description: 'May impact schedule',
            severity: 'warning',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.log('No constraints or error fetching');
      }

      try {
        // Fetch unacknowledged tasks
        const tasksResponse = await tasksApi.list({ 
          project_id: currentProject.id,
          status: 'pending',
          my_tasks: true
        });
        if (abortController.signal.aborted) return;
        
        const pendingTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
        setUnacknowledgedTasks(pendingTasks.length);
        
        if (pendingTasks.length > 0) {
          newBlockers.push({
            id: 'tasks',
            type: 'task',
            title: `${pendingTasks.length} Task${pendingTasks.length > 1 ? 's' : ''} Need Acknowledgment`,
            description: 'Tap to view and acknowledge',
            severity: 'warning',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.log('No tasks or error fetching');
      }

      if (!abortController.signal.aborted) {
        setBlockers(newBlockers);
        setIsLoading(false);
      }
      
      // Fetch deliveries
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await deliveriesApi.list({ 
          project_id: currentProject.id,
          start_date: today,
          limit: 5
        });
        if (!abortController.signal.aborted) {
          setDeliveries(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.log('No deliveries or error fetching');
          setDeliveries([]);
        }
      }
    };
    
    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, [currentProject]);

  // Manual refresh function
  const refreshData = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    const newBlockers: BlockerItem[] = [];

    try {
      const rfisResponse = await rfisApi.list({ 
        project_id: currentProject.id, 
        status: 'open' 
      });
      const openRfis = Array.isArray(rfisResponse.data) ? rfisResponse.data : [];
      if (openRfis.length > 0) {
        newBlockers.push({
          id: 'rfis',
          type: 'rfi',
          title: `${openRfis.length} RFI${openRfis.length > 1 ? 's' : ''} Unanswered`,
          description: openRfis.slice(0, 3).map((r: any) => r.question?.substring(0, 30)).join(', '),
          severity: 'critical',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('No RFIs or error fetching');
    }

    try {
      const constraintsResponse = await constraintsApi.list({ 
        project_id: currentProject.id, 
        status: 'open' 
      });
      const openConstraints = Array.isArray(constraintsResponse.data) ? constraintsResponse.data : [];
      if (openConstraints.length > 0) {
        newBlockers.push({
          id: 'constraints',
          type: 'constraint',
          title: `${openConstraints.length} Constraint${openConstraints.length > 1 ? 's' : ''} Unresolved`,
          description: 'May impact schedule',
          severity: 'warning',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('No constraints or error fetching');
    }

    try {
      const tasksResponse = await tasksApi.list({ 
        project_id: currentProject.id,
        status: 'pending',
        my_tasks: true
      });
      const pendingTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
      setUnacknowledgedTasks(pendingTasks.length);
      
      if (pendingTasks.length > 0) {
        newBlockers.push({
          id: 'tasks',
          type: 'task',
          title: `${pendingTasks.length} Task${pendingTasks.length > 1 ? 's' : ''} Need Acknowledgment`,
          description: 'Tap to view and acknowledge',
          severity: 'warning',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('No tasks or error fetching');
    }

    setBlockers(newBlockers);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await deliveriesApi.list({ 
        project_id: currentProject.id,
        start_date: today,
        limit: 5
      });
      setDeliveries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.log('No deliveries or error fetching');
      setDeliveries([]);
    }
    
    setIsLoading(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="pb-20">
      {/* Greeting */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {greeting()}, {user?.first_name || 'there'}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          {currentProject && (
            <button 
              onClick={refreshData}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* No Project Selected */}
      {!currentProject && (
        <div className="mx-4 p-6 bg-blue-50 rounded-xl text-center">
          <div className="text-blue-600 font-medium mb-2">No Project Selected</div>
          <p className="text-sm text-gray-600 mb-4">
            Tap the project header above to select your active job site.
          </p>
        </div>
      )}

      {currentProject && (
        <>
          {/* RED ZONE: My Blockers */}
          <section className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                My Blockers
              </h2>
              {blockers.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  {blockers.length} items
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : blockers.length === 0 ? (
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                <div className="font-medium text-green-700">All Clear!</div>
                <p className="text-sm text-green-600">No blockers - you're good to build.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockers.map(blocker => (
                  <BlockerCard 
                    key={blocker.id} 
                    blocker={blocker}
                    onClick={() => {
                      if (blocker.type === 'task') navigate('/tasks');
                      else if (blocker.type === 'rfi') navigate('/more');
                      else if (blocker.type === 'constraint') navigate('/constraints');
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* GREEN ZONE: Quick Actions */}
          <section className="px-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={18} className="text-green-500" />
              Quick Actions
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <ToolButton 
                icon={FileText} 
                label="Daily Report" 
                to="/daily-report"
                color="bg-green-100"
              />
              <ToolButton 
                icon={Camera} 
                label="Take Photo" 
                to="/capture/photo"
                color="bg-blue-100"
              />
              <ToolButton 
                icon={ShoppingCart} 
                label="Create PO" 
                to="/po/new"
                color="bg-purple-100"
              />
              <ToolButton 
                icon={Truck} 
                label="Deliveries" 
                to="/deliveries"
                color="bg-amber-100"
              />
              <ToolButton 
                icon={Clock} 
                label="Time Card" 
                to="/timecard"
                color="bg-gray-100"
              />
              <ToolButton 
                icon={Calendar} 
                label="Look-Ahead" 
                to="/look-ahead"
                color="bg-indigo-100"
              />
            </div>
          </section>

          {/* Today's Deliveries */}
          <section className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Today's Deliveries</h2>
              <Link to="/deliveries" className="text-sm text-blue-600">View all</Link>
            </div>
            
            {deliveries.length === 0 ? (
              <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500 text-sm">
                No deliveries scheduled for today
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y">
                {deliveries.map((delivery: any) => (
                  <div key={delivery.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Truck size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{delivery.description || 'Delivery'}</div>
                      <div className="text-xs text-gray-500">
                        {delivery.vendor || 'Unknown vendor'} • {delivery.staging_location || 'TBD'}
                      </div>
                    </div>
                    <button className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                      Confirm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

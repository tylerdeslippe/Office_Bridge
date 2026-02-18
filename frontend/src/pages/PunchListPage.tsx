/**
 * Punch List Page - Deficiency Tracking
 * Create, view, and verify punch items
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Camera,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Search,
  X,
  ChevronDown,
  AlertCircle,
  Loader2,
  Image,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';

// Types
interface PunchItem {
  id: string;
  number: number;
  description: string;
  location: string;
  area: string;
  responsible_party: string;
  status: 'open' | 'in_progress' | 'completed' | 'verified';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  created_by: string;
  photos: string[];
  due_date: string | null;
  completed_at: string | null;
  verified_at: string | null;
  notes: string;
}

// Responsible parties
const RESPONSIBLE_PARTIES = [
  { value: 'self', label: 'Our Crew' },
  { value: 'gc', label: 'GC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'controls', label: 'Controls' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'other', label: 'Other' },
];

// Areas (would come from project)
const DEFAULT_AREAS = [
  'Level 1',
  'Level 2', 
  'Level 3',
  'Roof',
  'Mech Room',
  'Common Areas',
  'Exterior',
];

// Status config
const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', icon: Circle },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

// Mock data
const MOCK_PUNCH_ITEMS: PunchItem[] = [
  {
    id: '1',
    number: 1,
    description: 'Diffuser not level - 1/4" off',
    location: 'Room 204',
    area: 'Level 2',
    responsible_party: 'self',
    status: 'open',
    priority: 'medium',
    created_at: '2024-02-01',
    created_by: 'John Smith',
    photos: [],
    due_date: '2024-02-10',
    completed_at: null,
    verified_at: null,
    notes: '',
  },
  {
    id: '2',
    number: 2,
    description: 'Missing insulation at elbow',
    location: 'Corridor near stair B',
    area: 'Level 2',
    responsible_party: 'insulation',
    status: 'in_progress',
    priority: 'high',
    created_at: '2024-02-02',
    created_by: 'John Smith',
    photos: [],
    due_date: '2024-02-08',
    completed_at: null,
    verified_at: null,
    notes: 'Insulator scheduled for Friday',
  },
  {
    id: '3',
    number: 3,
    description: 'Flex duct kinked at VAV',
    location: 'Room 210',
    area: 'Level 2',
    responsible_party: 'self',
    status: 'completed',
    priority: 'high',
    created_at: '2024-01-28',
    created_by: 'Mike Johnson',
    photos: [],
    due_date: null,
    completed_at: '2024-02-03',
    verified_at: null,
    notes: '',
  },
];

export function PunchListPage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  const { user } = useAuthStore();
  const cameraRef = useRef<HTMLInputElement>(null);
  
  const [punchItems, setPunchItems] = useState<PunchItem[]>(MOCK_PUNCH_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New item form
  const [newItem, setNewItem] = useState({
    description: '',
    location: '',
    area: '',
    responsible_party: 'self',
    priority: 'medium' as 'low' | 'medium' | 'high',
    photos: [] as string[],
    notes: '',
  });

  // Filter items
  const filteredItems = punchItems.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterArea !== 'all' && item.area !== filterArea) return false;
    if (searchQuery && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by status
  const groupedItems = {
    open: filteredItems.filter(i => i.status === 'open'),
    in_progress: filteredItems.filter(i => i.status === 'in_progress'),
    completed: filteredItems.filter(i => i.status === 'completed'),
    verified: filteredItems.filter(i => i.status === 'verified'),
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewItem(prev => ({
            ...prev,
            photos: [...prev.photos, reader.result as string],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleCreateItem = () => {
    if (!newItem.description.trim()) {
      showToast('Description is required', 'error');
      return;
    }

    const item: PunchItem = {
      id: Date.now().toString(),
      number: punchItems.length + 1,
      description: newItem.description,
      location: newItem.location,
      area: newItem.area,
      responsible_party: newItem.responsible_party,
      status: 'open',
      priority: newItem.priority,
      created_at: new Date().toISOString(),
      created_by: `${user?.firstName} ${user?.lastName}`,
      photos: newItem.photos,
      due_date: null,
      completed_at: null,
      verified_at: null,
      notes: newItem.notes,
    };

    setPunchItems(prev => [item, ...prev]);
    setNewItem({
      description: '',
      location: '',
      area: '',
      responsible_party: 'self',
      priority: 'medium',
      photos: [],
      notes: '',
    });
    setShowCreateModal(false);
    showToast('Punch item added', 'success');
  };

  const updateItemStatus = (itemId: string, newStatus: PunchItem['status']) => {
    setPunchItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updates: Partial<PunchItem> = { status: newStatus };
        if (newStatus === 'completed') {
          updates.completed_at = new Date().toISOString();
        }
        if (newStatus === 'verified') {
          updates.verified_at = new Date().toISOString();
        }
        return { ...item, ...updates };
      }
      return item;
    }));
    showToast(`Item marked as ${newStatus.replace('_', ' ')}`, 'success');
  };

  // Stats
  const stats = {
    total: punchItems.length,
    open: punchItems.filter(i => i.status === 'open').length,
    inProgress: punchItems.filter(i => i.status === 'in_progress').length,
    completed: punchItems.filter(i => i.status === 'completed' || i.status === 'verified').length,
  };

  // Create Modal
  const CreateModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateModal(false)}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Punch Item</h2>
          <button onClick={() => setShowCreateModal(false)} className="p-2">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4 space-y-4 pb-safe">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={newItem.description}
              onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What needs to be fixed?"
              rows={2}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={14} className="inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={newItem.location}
              onChange={e => setNewItem(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Room 204, Grid C-5"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => setNewItem(prev => ({ ...prev, area }))}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    newItem.area === area
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Responsible Party */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              Responsible Party
            </label>
            <div className="flex flex-wrap gap-2">
              {RESPONSIBLE_PARTIES.map(party => (
                <button
                  key={party.value}
                  onClick={() => setNewItem(prev => ({ ...prev, responsible_party: party.value }))}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    newItem.responsible_party === party.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {party.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setNewItem(prev => ({ ...prev, priority: p }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium capitalize ${
                    newItem.priority === p
                      ? p === 'high' ? 'bg-red-600 text-white' :
                        p === 'medium' ? 'bg-amber-500 text-white' :
                        'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>
            
            {newItem.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {newItem.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500"
            >
              <Camera size={24} />
              <span>Add Photo</span>
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              multiple
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={newItem.notes}
              onChange={e => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateItem}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Punch Item
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">Punch List</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="p-2 -mr-2 text-blue-600"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <div className="text-xs text-red-600">Open</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            <div className="text-xs text-amber-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-600">Done</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              All
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  filterStatus === key ? config.color : 'bg-gray-100 text-gray-600'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No punch items found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 font-medium"
            >
              Add first item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => {
              const StatusIcon = STATUS_CONFIG[item.status].icon;
              return (
                <div key={item.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <button
                      onClick={() => {
                        const nextStatus: Record<PunchItem['status'], PunchItem['status']> = {
                          open: 'in_progress',
                          in_progress: 'completed',
                          completed: 'verified',
                          verified: 'verified',
                        };
                        updateItemStatus(item.id, nextStatus[item.status]);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        STATUS_CONFIG[item.status].color
                      }`}
                    >
                      <StatusIcon size={18} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs text-gray-400 font-mono">#{item.number}</span>
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          item.priority === 'high' ? 'bg-red-100 text-red-700' :
                          item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {item.location}
                          </span>
                        )}
                        {item.area && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {item.area}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {RESPONSIBLE_PARTIES.find(p => p.value === item.responsible_party)?.label}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus size={24} />
      </button>

      {/* Create Modal */}
      {showCreateModal && <CreateModal />}
    </div>
  );
}

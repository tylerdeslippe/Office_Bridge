/**
 * Deliveries Page - Track incoming material deliveries
 * Supplier info, tracking, ETA, release status, 24hr notifications
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Truck,
  Package,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Bell,
  BellOff,
  Check,
  X,
  Edit2,
  Trash2,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Building2,
  FileText,
  Hash,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';

interface Delivery {
  id: string;
  // Supplier info
  supplierName: string;
  supplierPhone?: string;
  supplierContact?: string;
  // Order info
  poNumber?: string;
  description: string;
  contents: string[];
  // Tracking
  trackingNumber?: string;
  carrier?: string;
  // Dates
  orderDate: string;
  releaseDate?: string;
  estimatedArrival: string;
  actualArrival?: string;
  // Status
  isReleased: boolean;
  isDelivered: boolean;
  // Notifications
  notify24hr: boolean;
  notificationSent?: boolean;
  // Meta
  notes?: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'released' | 'delivered' | 'late';

const CARRIERS = ['FedEx', 'UPS', 'USPS', 'LTL Freight', 'Vendor Truck', 'Will Call', 'Other'];

export function DeliveriesPage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Delivery>>({
    supplierName: '',
    supplierPhone: '',
    supplierContact: '',
    poNumber: '',
    description: '',
    contents: [],
    trackingNumber: '',
    carrier: '',
    orderDate: new Date().toISOString().split('T')[0],
    releaseDate: '',
    estimatedArrival: '',
    isReleased: false,
    isDelivered: false,
    notify24hr: true,
    notes: '',
  });
  const [newContentItem, setNewContentItem] = useState('');

  // Load deliveries
  useEffect(() => {
    if (!currentProject) {
      setDeliveries([]);
      setIsLoading(false);
      return;
    }
    
    // Load from localStorage (in production, from API)
    const saved = localStorage.getItem(`deliveries_${currentProject.id}`);
    if (saved) {
      try {
        setDeliveries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load deliveries');
      }
    }
    setIsLoading(false);
    
    // Check for 24hr notifications
    checkNotifications();
  }, [currentProject]);

  // Save deliveries
  const saveDeliveries = (newDeliveries: Delivery[]) => {
    if (!currentProject) return;
    setDeliveries(newDeliveries);
    localStorage.setItem(`deliveries_${currentProject.id}`, JSON.stringify(newDeliveries));
  };

  // Check for upcoming deliveries needing notification
  const checkNotifications = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    deliveries.forEach(delivery => {
      if (!delivery.notify24hr || delivery.notificationSent || delivery.isDelivered) return;
      
      const eta = new Date(delivery.estimatedArrival);
      if (eta <= tomorrow && eta > now) {
        // Would trigger push notification here
        console.log(`24hr notification for delivery: ${delivery.description}`);
        
        // Mark notification as sent
        const updated = deliveries.map(d => 
          d.id === delivery.id ? { ...d, notificationSent: true } : d
        );
        saveDeliveries(updated);
        
        // Show in-app notification
        showToast(`Delivery arriving tomorrow: ${delivery.description}`, 'info');
      }
    });
  };

  // Filter deliveries
  const getFilteredDeliveries = () => {
    let filtered = [...deliveries];
    
    // Status filter
    const today = new Date().toISOString().split('T')[0];
    switch (filterStatus) {
      case 'pending':
        filtered = filtered.filter(d => !d.isReleased && !d.isDelivered);
        break;
      case 'released':
        filtered = filtered.filter(d => d.isReleased && !d.isDelivered);
        break;
      case 'delivered':
        filtered = filtered.filter(d => d.isDelivered);
        break;
      case 'late':
        filtered = filtered.filter(d => !d.isDelivered && d.estimatedArrival < today);
        break;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.supplierName.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.poNumber?.toLowerCase().includes(query) ||
        d.trackingNumber?.toLowerCase().includes(query) ||
        d.contents.some(c => c.toLowerCase().includes(query))
      );
    }
    
    // Sort by ETA (soonest first)
    filtered.sort((a, b) => new Date(a.estimatedArrival).getTime() - new Date(b.estimatedArrival).getTime());
    
    return filtered;
  };

  // Open modal for new delivery
  const openNewDeliveryModal = () => {
    setEditingDelivery(null);
    setFormData({
      supplierName: '',
      supplierPhone: '',
      supplierContact: '',
      poNumber: '',
      description: '',
      contents: [],
      trackingNumber: '',
      carrier: '',
      orderDate: new Date().toISOString().split('T')[0],
      releaseDate: '',
      estimatedArrival: '',
      isReleased: false,
      isDelivered: false,
      notify24hr: true,
      notes: '',
    });
    setNewContentItem('');
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setFormData({ ...delivery });
    setNewContentItem('');
    setShowModal(true);
  };

  // Add content item
  const addContentItem = () => {
    if (!newContentItem.trim()) return;
    setFormData(prev => ({
      ...prev,
      contents: [...(prev.contents || []), newContentItem.trim()],
    }));
    setNewContentItem('');
  };

  // Remove content item
  const removeContentItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contents: prev.contents?.filter((_, i) => i !== index) || [],
    }));
  };

  // Save delivery
  const handleSave = () => {
    if (!formData.supplierName || !formData.description || !formData.estimatedArrival) {
      showToast('Please fill in required fields', 'error');
      return;
    }
    
    setIsSaving(true);
    
    const delivery: Delivery = {
      id: editingDelivery?.id || Date.now().toString(),
      supplierName: formData.supplierName!,
      supplierPhone: formData.supplierPhone,
      supplierContact: formData.supplierContact,
      poNumber: formData.poNumber,
      description: formData.description!,
      contents: formData.contents || [],
      trackingNumber: formData.trackingNumber,
      carrier: formData.carrier,
      orderDate: formData.orderDate!,
      releaseDate: formData.releaseDate,
      estimatedArrival: formData.estimatedArrival!,
      actualArrival: formData.actualArrival,
      isReleased: formData.isReleased || false,
      isDelivered: formData.isDelivered || false,
      notify24hr: formData.notify24hr ?? true,
      notificationSent: editingDelivery?.notificationSent,
      notes: formData.notes,
      createdAt: editingDelivery?.createdAt || new Date().toISOString(),
    };
    
    let newDeliveries: Delivery[];
    if (editingDelivery) {
      newDeliveries = deliveries.map(d => d.id === delivery.id ? delivery : d);
    } else {
      newDeliveries = [...deliveries, delivery];
    }
    
    saveDeliveries(newDeliveries);
    setShowModal(false);
    setIsSaving(false);
    showToast(editingDelivery ? 'Delivery updated' : 'Delivery added', 'success');
  };

  // Delete delivery
  const handleDelete = (id: string) => {
    if (!confirm('Delete this delivery?')) return;
    const newDeliveries = deliveries.filter(d => d.id !== id);
    saveDeliveries(newDeliveries);
    showToast('Delivery deleted', 'success');
  };

  // Mark as released
  const markReleased = (id: string) => {
    const newDeliveries = deliveries.map(d => 
      d.id === id ? { ...d, isReleased: true, releaseDate: new Date().toISOString().split('T')[0] } : d
    );
    saveDeliveries(newDeliveries);
    showToast('Marked as released', 'success');
  };

  // Mark as delivered
  const markDelivered = (id: string) => {
    const newDeliveries = deliveries.map(d => 
      d.id === id ? { ...d, isDelivered: true, actualArrival: new Date().toISOString().split('T')[0] } : d
    );
    saveDeliveries(newDeliveries);
    showToast('Marked as delivered', 'success');
  };

  // Copy tracking number
  const copyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    showToast('Tracking number copied', 'success');
  };

  // Get status badge
  const getStatusBadge = (delivery: Delivery) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (delivery.isDelivered) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Delivered</span>;
    }
    if (!delivery.isDelivered && delivery.estimatedArrival < today) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">Late</span>;
    }
    if (delivery.isReleased) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">In Transit</span>;
    }
    return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Pending</span>;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if arriving soon (within 24hrs)
  const isArrivingSoon = (delivery: Delivery) => {
    if (delivery.isDelivered) return false;
    const now = new Date();
    const eta = new Date(delivery.estimatedArrival);
    const diff = eta.getTime() - now.getTime();
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  };

  // Stats
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => !d.isReleased && !d.isDelivered).length,
    inTransit: deliveries.filter(d => d.isReleased && !d.isDelivered).length,
    late: deliveries.filter(d => !d.isDelivered && d.estimatedArrival < new Date().toISOString().split('T')[0]).length,
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-4">Please select a project first.</p>
          <button onClick={() => navigate('/today')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-semibold">Deliveries</h1>
          <button onClick={openNewDeliveryModal} className="p-2 -mr-2 text-blue-600">
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-amber-600">Pending</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-600">{stats.inTransit}</div>
            <div className="text-xs text-blue-600">In Transit</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <div className="text-lg font-bold text-red-600">{stats.late}</div>
            <div className="text-xs text-red-600">Late</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search deliveries..."
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'released', 'delivered', 'late'] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : 
               status === 'pending' ? 'Pending' :
               status === 'released' ? 'In Transit' :
               status === 'delivered' ? 'Delivered' : 'Late'}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : getFilteredDeliveries().length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Truck size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-700">No deliveries found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filterStatus !== 'all' ? 'Try a different filter' : 'Add your first delivery'}
            </p>
            <button
              onClick={openNewDeliveryModal}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              Add Delivery
            </button>
          </div>
        ) : (
          getFilteredDeliveries().map(delivery => (
            <div
              key={delivery.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                isArrivingSoon(delivery) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
              }`}
            >
              {/* Arriving Soon Banner */}
              {isArrivingSoon(delivery) && (
                <div className="bg-amber-50 px-4 py-2 flex items-center gap-2 text-amber-700 text-sm">
                  <Bell size={14} />
                  <span className="font-medium">Arriving within 24 hours</span>
                </div>
              )}
              
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(delivery)}
                      {delivery.notify24hr && !delivery.isDelivered && (
                        <Bell size={14} className="text-blue-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-2">{delivery.description}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Building2 size={14} /> {delivery.supplierName}
                    </p>
                  </div>
                  <button
                    onClick={() => openEditModal(delivery)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                
                {/* Contents */}
                {delivery.contents.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Contents:</div>
                    <div className="flex flex-wrap gap-1">
                      {delivery.contents.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {delivery.poNumber && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Hash size={14} className="text-gray-400" />
                      <span>PO: {delivery.poNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    <span>ETA: {formatDate(delivery.estimatedArrival)}</span>
                  </div>
                  {delivery.trackingNumber && (
                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                      <Package size={14} className="text-gray-400" />
                      <span className="truncate">{delivery.carrier}: {delivery.trackingNumber}</span>
                      <button onClick={() => copyTracking(delivery.trackingNumber!)} className="text-blue-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  )}
                  {delivery.releaseDate && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 size={14} />
                      <span>Released: {formatDate(delivery.releaseDate)}</span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  {!delivery.isReleased && (
                    <button
                      onClick={() => markReleased(delivery.id)}
                      className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                    >
                      Mark Released
                    </button>
                  )}
                  {delivery.isReleased && !delivery.isDelivered && (
                    <button
                      onClick={() => markDelivered(delivery.id)}
                      className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
                    >
                      Mark Delivered
                    </button>
                  )}
                  {delivery.supplierPhone && (
                    <a
                      href={`tel:${delivery.supplierPhone}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                      <Phone size={14} /> Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-lg">
                {editingDelivery ? 'Edit Delivery' : 'New Delivery'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Supplier Section */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Building2 size={16} /> Supplier
                </h4>
                <input
                  type="text"
                  value={formData.supplierName || ''}
                  onChange={e => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                  placeholder="Supplier name *"
                  className="w-full p-3 border rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={formData.supplierPhone || ''}
                    onChange={e => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full p-3 border rounded-xl"
                  />
                  <input
                    type="text"
                    value={formData.supplierContact || ''}
                    onChange={e => setFormData(prev => ({ ...prev, supplierContact: e.target.value }))}
                    placeholder="Contact name"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>
              
              {/* Order Section */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Package size={16} /> Order Info
                </h4>
                <input
                  type="text"
                  value={formData.poNumber || ''}
                  onChange={e => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  placeholder="PO Number"
                  className="w-full p-3 border rounded-xl"
                />
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description *"
                  className="w-full p-3 border rounded-xl"
                />
                
                {/* Contents */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contents</label>
                  {(formData.contents || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {formData.contents?.map((item, i) => (
                        <span key={i} className="bg-white border px-2 py-1 rounded text-sm flex items-center gap-1">
                          {item}
                          <button onClick={() => removeContentItem(i)} className="text-gray-400 hover:text-red-500">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newContentItem}
                      onChange={e => setNewContentItem(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addContentItem())}
                      placeholder="Add item..."
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={addContentItem}
                      disabled={!newContentItem.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tracking Section */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Truck size={16} /> Tracking
                </h4>
                <select
                  value={formData.carrier || ''}
                  onChange={e => setFormData(prev => ({ ...prev, carrier: e.target.value }))}
                  className="w-full p-3 border rounded-xl bg-white"
                >
                  <option value="">Select carrier...</option>
                  {CARRIERS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.trackingNumber || ''}
                  onChange={e => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Tracking number"
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              
              {/* Dates Section */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Calendar size={16} /> Dates
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Order Date</label>
                    <input
                      type="date"
                      value={formData.orderDate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Release Date</label>
                    <input
                      type="date"
                      value={formData.releaseDate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, releaseDate: e.target.value, isReleased: !!e.target.value }))}
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estimated Arrival *</label>
                  <input
                    type="date"
                    value={formData.estimatedArrival || ''}
                    onChange={e => setFormData(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>
              
              {/* Status & Notifications */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Bell size={16} /> Status & Notifications
                </h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Order Released</div>
                    <div className="text-xs text-gray-500">Shipment has left supplier</div>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, isReleased: !prev.isReleased }))}
                    className={`w-12 h-7 rounded-full transition-colors ${
                      formData.isReleased ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      formData.isReleased ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">24hr Reminder</div>
                    <div className="text-xs text-gray-500">Notify before arrival</div>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, notify24hr: !prev.notify24hr }))}
                    className={`w-12 h-7 rounded-full transition-colors ${
                      formData.notify24hr ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      formData.notify24hr ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full p-3 border rounded-xl resize-none"
                />
              </div>
              
              {/* Delete Button (edit mode only) */}
              {editingDelivery && (
                <button
                  onClick={() => { handleDelete(editingDelivery.id); setShowModal(false); }}
                  className="w-full py-3 text-red-600 font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Delete Delivery
                </button>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                {editingDelivery ? 'Save Changes' : 'Add Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

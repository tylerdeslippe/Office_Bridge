/**
 * Deliveries Page - Modern Clean Design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Truck,
  Calendar,
  Phone,
  MapPin,
  Check,
  Clock,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import { deliveriesService, Delivery } from '../services/deliveriesService';

export function DeliveriesPage() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'late' | 'delivered'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    description: '',
    supplierName: '',
    supplierPhone: '',
    estimatedArrival: '',
    poNumber: '',
  });

  // Dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bg = isDark ? 'bg-black' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setIsLoading(true);
    const data = await deliveriesService.getAll();
    setDeliveries(data);
    setIsLoading(false);
  };

  const markDelivered = async (delivery: Delivery) => {
    await deliveriesService.update(delivery.id, { 
      isDelivered: true,
      actualArrival: new Date().toISOString(),
    });
    loadDeliveries();
  };

  const addDelivery = async () => {
    if (!newDelivery.description.trim() || !newDelivery.estimatedArrival) return;
    await deliveriesService.create({
      description: newDelivery.description,
      supplierName: newDelivery.supplierName,
      supplierPhone: newDelivery.supplierPhone,
      estimatedArrival: newDelivery.estimatedArrival,
      poNumber: newDelivery.poNumber,
      status: 'scheduled',
      isDelivered: false,
    });
    setNewDelivery({ description: '', supplierName: '', supplierPhone: '', estimatedArrival: '', poNumber: '' });
    setShowAdd(false);
    loadDeliveries();
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'upcoming') return !d.isDelivered && d.estimatedArrival >= today;
    if (filter === 'late') return !d.isDelivered && d.estimatedArrival < today;
    if (filter === 'delivered') return d.isDelivered;
    return true;
  }).sort((a, b) => {
    if (a.isDelivered !== b.isDelivered) return a.isDelivered ? 1 : -1;
    return new Date(a.estimatedArrival).getTime() - new Date(b.estimatedArrival).getTime();
  });

  const stats = {
    total: deliveries.length,
    upcoming: deliveries.filter(d => !d.isDelivered && d.estimatedArrival >= today).length,
    late: deliveries.filter(d => !d.isDelivered && d.estimatedArrival < today).length,
    delivered: deliveries.filter(d => d.isDelivered).length,
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === today) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${bg} px-6 pt-14 pb-4 sticky top-0 z-10`}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex-1">Deliveries</h1>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-blue-500' },
            { label: 'Upcoming', value: stats.upcoming, color: 'bg-green-500' },
            { label: 'Late', value: stats.late, color: 'bg-red-500' },
            { label: 'Done', value: stats.delivered, color: 'bg-gray-500' },
          ].map((stat) => (
            <div key={stat.label} className={`${cardBg} rounded-xl p-3 ${border} border text-center`}>
              <div className={`w-2 h-2 ${stat.color} rounded-full mx-auto mb-1`} />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className={`text-xs ${textMuted}`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto -mx-6 px-6 scrollbar-hide">
          {(['all', 'upcoming', 'late', 'delivered'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
                filter === f 
                  ? 'bg-blue-500 text-white' 
                  : `${cardBg} ${textMuted} ${border} border`
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Deliveries List */}
      <div className="px-6 pb-8 space-y-3">
        {filteredDeliveries.length === 0 ? (
          <div className={`${cardBg} rounded-2xl p-8 ${border} border text-center mt-4`}>
            <Truck size={48} className={`${textMuted} mx-auto mb-4`} />
            <p className="font-medium mb-1">No deliveries</p>
            <p className={`text-sm ${textMuted}`}>Add a delivery to track</p>
          </div>
        ) : (
          filteredDeliveries.map(delivery => {
            const isLate = !delivery.isDelivered && delivery.estimatedArrival < today;
            const isToday = delivery.estimatedArrival === today;
            
            return (
              <div 
                key={delivery.id} 
                className={`${cardBg} rounded-2xl p-4 ${border} border ${delivery.isDelivered ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    delivery.isDelivered ? 'bg-green-500/10' :
                    isLate ? 'bg-red-500/10' :
                    isToday ? 'bg-amber-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    {delivery.isDelivered ? (
                      <Check size={22} className="text-green-500" />
                    ) : isLate ? (
                      <AlertTriangle size={22} className="text-red-500" />
                    ) : (
                      <Truck size={22} className={isToday ? 'text-amber-500' : 'text-blue-500'} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{delivery.description}</div>
                    <div className={`text-sm ${textMuted} mt-1`}>{delivery.supplierName}</div>
                    
                    <div className={`flex items-center gap-4 mt-2 text-xs ${textMuted}`}>
                      <span className={`flex items-center gap-1 ${isLate ? 'text-red-500' : ''}`}>
                        <Calendar size={12} />
                        {formatDate(delivery.estimatedArrival)}
                      </span>
                      {delivery.poNumber && (
                        <span>PO: {delivery.poNumber}</span>
                      )}
                    </div>
                  </div>

                  {!delivery.isDelivered && (
                    <button
                      onClick={() => markDelivered(delivery)}
                      className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium"
                    >
                      Received
                    </button>
                  )}
                </div>

                {delivery.supplierPhone && (
                  <a 
                    href={`tel:${delivery.supplierPhone}`}
                    className={`mt-3 flex items-center gap-2 text-sm ${textMuted}`}
                  >
                    <Phone size={14} />
                    {delivery.supplierPhone}
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Delivery Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className={`${cardBg} ${text} w-full rounded-t-3xl p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Delivery</h2>
              <button onClick={() => setShowAdd(false)} className={textMuted}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-xs ${textMuted} mb-1 block`}>Description *</label>
                <input
                  type="text"
                  value={newDelivery.description}
                  onChange={(e) => setNewDelivery({ ...newDelivery, description: e.target.value })}
                  placeholder="e.g., Ductwork for 3rd floor"
                  className={`w-full px-4 py-4 ${inputBg} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`text-xs ${textMuted} mb-1 block`}>Expected Date *</label>
                <input
                  type="date"
                  value={newDelivery.estimatedArrival}
                  onChange={(e) => setNewDelivery({ ...newDelivery, estimatedArrival: e.target.value })}
                  className={`w-full px-4 py-4 ${inputBg} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`text-xs ${textMuted} mb-1 block`}>Supplier Name</label>
                <input
                  type="text"
                  value={newDelivery.supplierName}
                  onChange={(e) => setNewDelivery({ ...newDelivery, supplierName: e.target.value })}
                  placeholder="e.g., ABC Supply Co."
                  className={`w-full px-4 py-4 ${inputBg} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>Supplier Phone</label>
                  <input
                    type="tel"
                    value={newDelivery.supplierPhone}
                    onChange={(e) => setNewDelivery({ ...newDelivery, supplierPhone: e.target.value })}
                    placeholder="(555) 555-5555"
                    className={`w-full px-4 py-4 ${inputBg} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>PO Number</label>
                  <input
                    type="text"
                    value={newDelivery.poNumber}
                    onChange={(e) => setNewDelivery({ ...newDelivery, poNumber: e.target.value })}
                    placeholder="PO-12345"
                    className={`w-full px-4 py-4 ${inputBg} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              <button
                onClick={addDelivery}
                disabled={!newDelivery.description.trim() || !newDelivery.estimatedArrival}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold disabled:opacity-50 mt-2"
              >
                Add Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

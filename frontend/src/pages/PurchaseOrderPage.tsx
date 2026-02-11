/**
 * Purchase Order Page - Mobile-friendly PO creation
 * Creates PO to send to vendors
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Send,
  Loader2,
  Building2,
  MapPin,
  User,
  Phone,
  Hash,
  Package,
  DollarSign,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';

interface LineItem {
  id: string;
  quantity: string;
  description: string;
  unitCost: string;
}

interface POFormData {
  // Vendor Info
  vendorName: string;
  vendorAddress: string;
  vendorCity: string;
  vendorState: string;
  vendorZip: string;
  vendorPhone: string;
  vendorOrderNumber: string;
  attentionTo: string;
  
  // Job Info (auto-filled from current project)
  poNumber: string;
  jobNumber: string;
  jobName: string;
  
  // Shipping
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  shipVia: string;
  shipmentWanted: string;
  
  // Line Items
  lineItems: LineItem[];
  
  // Tax
  taxRate: string;
  
  // Notes
  specialInstructions: string;
}

// Company info (would come from settings in production)
const COMPANY_INFO = {
  name: 'FAITHFUL AND TRUE, INC.',
  phone: '954-806-1186',
  deliveryPhone: '954-806-0710',
  signatory: 'TYLER DESLIPPE',
};

export function PurchaseOrderPage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState<POFormData>({
    vendorName: '',
    vendorAddress: '',
    vendorCity: '',
    vendorState: 'FL',
    vendorZip: '',
    vendorPhone: '',
    vendorOrderNumber: '',
    attentionTo: '',
    
    poNumber: '',
    jobNumber: currentProject?.number || '',
    jobName: currentProject?.name || '',
    
    shipToAddress: currentProject?.address || '',
    shipToCity: '',
    shipToState: 'FL',
    shipToZip: '',
    shipVia: '',
    shipmentWanted: '',
    
    lineItems: [{ id: '1', quantity: '', description: '', unitCost: '' }],
    
    taxRate: '7',
    
    specialInstructions: '',
  });

  const updateField = <K extends keyof POFormData>(field: K, value: POFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { 
        id: Date.now().toString(), 
        quantity: '', 
        description: '', 
        unitCost: '' 
      }],
    }));
  };

  const removeLineItem = (id: string) => {
    if (formData.lineItems.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id),
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return formData.lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.unitCost) || 0;
      return sum + (qty * cost);
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const rate = parseFloat(formData.taxRate) || 0;
    return subtotal * (rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.vendorName) {
      showToast('Vendor name is required', 'error');
      return;
    }
    if (!formData.poNumber) {
      showToast('PO number is required', 'error');
      return;
    }
    if (formData.lineItems.every(item => !item.description)) {
      showToast('At least one line item is required', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In production, this would send to backend and generate PDF
      // For now, show success and preview
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast('Purchase Order created!', 'success');
      setShowPreview(true);
    } catch (err: any) {
      showToast('Failed to create PO', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview Modal
  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setShowPreview(false)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-semibold">PO Preview</h1>
          <button 
            onClick={() => {
              showToast('PO sent to vendor!', 'success');
              navigate('/today');
            }}
            className="text-blue-600 font-medium flex items-center gap-1"
          >
            <Send size={18} /> Send
          </button>
        </header>
        
        <div className="p-4">
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4 text-sm">
            {/* Header */}
            <div className="text-center border-b pb-3">
              <h2 className="font-bold text-lg">{COMPANY_INFO.name}</h2>
              <p className="text-gray-500">Purchase Order</p>
            </div>
            
            {/* PO Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">PO#:</span> <span className="font-medium">{formData.poNumber}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Job#:</span> <span className="font-medium">{formData.jobNumber}</span></div>
              <div><span className="text-gray-500">Job:</span> <span className="font-medium">{formData.jobName}</span></div>
            </div>
            
            {/* Vendor */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">VENDOR</div>
              <div className="font-medium">{formData.vendorName}</div>
              {formData.vendorAddress && <div className="text-gray-600">{formData.vendorAddress}</div>}
              {formData.attentionTo && <div className="text-gray-600">Attn: {formData.attentionTo}</div>}
            </div>
            
            {/* Ship To */}
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 mb-1">SHIP TO</div>
              <div className="font-medium">{formData.shipToAddress || 'TBD'}</div>
              {formData.shipToCity && (
                <div className="text-gray-600">{formData.shipToCity}, {formData.shipToState} {formData.shipToZip}</div>
              )}
            </div>
            
            {/* Line Items */}
            <div>
              <div className="text-xs text-gray-500 mb-2">ITEMS</div>
              <div className="space-y-2">
                {formData.lineItems.filter(i => i.description).map((item, idx) => (
                  <div key={item.id} className="flex justify-between items-start bg-gray-50 rounded p-2">
                    <div className="flex-1">
                      <span className="text-gray-500 mr-2">{item.quantity}x</span>
                      {item.description}
                    </div>
                    <div className="font-medium">
                      {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax ({formData.taxRate}%)</span>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="text-xs text-gray-500 border-t pt-3">
              <p className="font-medium mb-1">DELIVERY INSTRUCTIONS:</p>
              <p>• Call {COMPANY_INFO.deliveryPhone} 48hrs prior to delivery</p>
              <p>• A.M. delivery only</p>
              <p>• Mark with PO# / Job# / Job Name</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">New Purchase Order</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-4 pb-32">
        {/* PO Number & Job Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Hash size={18} className="text-blue-600" />
            Order Info
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">PO Number *</label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={e => updateField('poNumber', e.target.value)}
                placeholder="e.g., PO-2025-001"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Job #</label>
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={e => updateField('jobNumber', e.target.value)}
                  placeholder="221-25"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date</label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="w-full p-3 border rounded-xl bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Job Name</label>
              <input
                type="text"
                value={formData.jobName}
                onChange={e => updateField('jobName', e.target.value)}
                placeholder="Job name"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-purple-600" />
            Vendor
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vendor Name *</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={e => updateField('vendorName', e.target.value)}
                placeholder="Company name"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.vendorAddress}
                onChange={e => updateField('vendorAddress', e.target.value)}
                placeholder="Street address"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  value={formData.vendorCity}
                  onChange={e => updateField('vendorCity', e.target.value)}
                  placeholder="City"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                value={formData.vendorState}
                onChange={e => updateField('vendorState', e.target.value)}
                placeholder="ST"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={formData.vendorZip}
                onChange={e => updateField('vendorZip', e.target.value)}
                placeholder="ZIP"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.vendorPhone}
                  onChange={e => updateField('vendorPhone', e.target.value)}
                  placeholder="Phone"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Attention</label>
                <input
                  type="text"
                  value={formData.attentionTo}
                  onChange={e => updateField('attentionTo', e.target.value)}
                  placeholder="Salesman"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vendor Order #</label>
              <input
                type="text"
                value={formData.vendorOrderNumber}
                onChange={e => updateField('vendorOrderNumber', e.target.value)}
                placeholder="Their reference number"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-green-600" />
            Ship To
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.shipToAddress}
                onChange={e => updateField('shipToAddress', e.target.value)}
                placeholder="Delivery address"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  value={formData.shipToCity}
                  onChange={e => updateField('shipToCity', e.target.value)}
                  placeholder="City"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                value={formData.shipToState}
                onChange={e => updateField('shipToState', e.target.value)}
                placeholder="ST"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={formData.shipToZip}
                onChange={e => updateField('shipToZip', e.target.value)}
                placeholder="ZIP"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ship Via</label>
                <input
                  type="text"
                  value={formData.shipVia}
                  onChange={e => updateField('shipVia', e.target.value)}
                  placeholder="Carrier"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Needed By</label>
                <input
                  type="date"
                  value={formData.shipmentWanted}
                  onChange={e => updateField('shipmentWanted', e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-amber-600" />
              Items
            </h2>
            <button
              onClick={addLineItem}
              className="text-blue-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.lineItems.map((item, index) => (
              <div key={item.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Item {index + 1}</span>
                  {formData.lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                    placeholder="Description of material"
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Unit Cost</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={e => updateLineItem(item.id, 'unitCost', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full p-3 pl-7 border rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  {item.quantity && item.unitCost && (
                    <div className="text-right text-sm text-gray-600">
                      Line Total: <span className="font-medium">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Totals
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={e => updateField('taxRate', e.target.value)}
                  className="w-16 p-1 border rounded text-center text-sm"
                  step="0.5"
                />
                <span>%</span>
              </div>
              <span className="font-medium">{formatCurrency(calculateTax())}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total</span>
              <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-gray-600" />
            Special Instructions
          </h2>
          <textarea
            value={formData.specialInstructions}
            onChange={e => updateField('specialInstructions', e.target.value)}
            placeholder="Any special delivery or handling instructions..."
            rows={3}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Standard Instructions (read-only) */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h3 className="font-medium text-amber-800 mb-2 text-sm">Standard Delivery Instructions</h3>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Trucker to call {COMPANY_INFO.deliveryPhone} 48 hours prior to delivery</li>
            <li>• Carrier to identify shipment with PO# / Job# / Job Name</li>
            <li>• A.M. delivery only to warehouse</li>
            <li>• Mark container with PO# / Job# / Job Name</li>
            <li>• Enclose unpriced packing slip with each shipment</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating PO...
              </>
            ) : (
              <>
                <Check size={20} />
                Create Purchase Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

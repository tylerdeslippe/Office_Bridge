/**
 * Quick Quote Page - Field staff quick quote capture
 * Photo-first workflow with GPS and minimal info
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Camera,
  MapPin,
  X,
  Check,
  Loader2,
  Image,
  AlertCircle,
  Clock,
  Zap,
  Phone,
  User
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { quotesApi } from '../utils/api';

type Urgency = 'standard' | 'rush' | 'emergency';

interface QuoteFormData {
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  customer_name: string;
  customer_phone: string;
  photos: string[];
  urgency: Urgency;
  scope_notes: string;
}

export function QuickQuotePage() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const [formData, setFormData] = useState<QuoteFormData>({
    title: '',
    description: '',
    address: '',
    latitude: null,
    longitude: null,
    customer_name: '',
    customer_phone: '',
    photos: [],
    urgency: 'standard',
    scope_notes: '',
  });

  const updateField = <K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle photo capture/upload
  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Convert to base64 for now (in production, upload to server)
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, base64]
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // Get GPS location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        updateField('latitude', latitude);
        updateField('longitude', longitude);
        
        // Try to reverse geocode (in production, use a geocoding API)
        updateField('address', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        showToast('Location captured', 'success');
      },
      () => showToast('Could not get location', 'error'),
      { enableHighAccuracy: true }
    );
  };

  // Submit quote request
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showToast('Please describe what needs to be done', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await quotesApi.create({
        title: formData.title,
        description: formData.description,
        address: formData.address,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        customer_name: formData.customer_name || undefined,
        customer_phone: formData.customer_phone || undefined,
        photos: formData.photos.length > 0 ? formData.photos : undefined,
        urgency: formData.urgency,
        scope_notes: formData.scope_notes || undefined,
      });
      
      showToast('Quote request sent to PM!', 'success');
      navigate('/today');
    } catch (err: any) {
      console.error('Failed to submit quote:', err);
      showToast(err.response?.data?.detail || 'Failed to submit quote request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.title.trim() && formData.description.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">Quick Quote Request</h1>
        <div className="w-10" />
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="p-4 pb-32 space-y-4">
        {/* Photo Capture - First! */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Photos <span className="text-gray-400 font-normal">(recommended)</span>
          </label>
          
          {/* Photo grid */}
          {formData.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={handlePhotoCapture}
            className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
          >
            <Camera size={32} />
            <span>{formData.photos.length > 0 ? 'Add more photos' : 'Tap to capture'}</span>
          </button>
        </div>

        {/* Title */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What needs to be quoted? <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">Brief title for the work</p>
          <input
            type="text"
            value={formData.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder="e.g., Replace RTU on roof, Add VAV boxes to suite 400"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">Describe the work needed</p>
          <textarea
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
            placeholder="What do they need done? Any special requirements or access issues?"
            rows={4}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.address}
              onChange={e => updateField('address', e.target.value)}
              placeholder="Address or location"
              className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGetLocation}
              className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200"
            >
              <MapPin size={20} />
            </button>
          </div>
          {formData.latitude && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Check size={12} /> GPS captured
            </p>
          )}
        </div>

        {/* Customer Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Contact <span className="text-gray-400 font-normal">(if known)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.customer_name}
                onChange={e => updateField('customer_name', e.target.value)}
                placeholder="Name"
                className="w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={e => updateField('customer_phone', e.target.value)}
                placeholder="Phone"
                className="w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How urgent?
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateField('urgency', 'standard')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                formData.urgency === 'standard'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <Clock size={20} className={`mx-auto mb-1 ${formData.urgency === 'standard' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="text-sm font-medium">Standard</div>
              <div className="text-xs text-gray-500">1-2 days</div>
            </button>
            
            <button
              onClick={() => updateField('urgency', 'rush')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                formData.urgency === 'rush'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200'
              }`}
            >
              <Zap size={20} className={`mx-auto mb-1 ${formData.urgency === 'rush' ? 'text-amber-600' : 'text-gray-400'}`} />
              <div className="text-sm font-medium">Rush</div>
              <div className="text-xs text-gray-500">Same day</div>
            </button>
            
            <button
              onClick={() => updateField('urgency', 'emergency')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                formData.urgency === 'emergency'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <AlertCircle size={20} className={`mx-auto mb-1 ${formData.urgency === 'emergency' ? 'text-red-600' : 'text-gray-400'}`} />
              <div className="text-sm font-medium">Emergency</div>
              <div className="text-xs text-gray-500">ASAP</div>
            </button>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            value={formData.scope_notes}
            onChange={e => updateField('scope_notes', e.target.value)}
            placeholder="Access issues, special equipment needed, timing constraints..."
            rows={3}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Check size={20} />
              Send to PM for Quote
            </>
          )}
        </button>
        <p className="text-xs text-center text-gray-500 mt-2">
          PM will review and send quote to customer
        </p>
      </div>
    </div>
  );
}

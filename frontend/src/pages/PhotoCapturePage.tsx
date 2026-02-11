/**
 * Photo Capture Page - Camera First Experience
 * Opens camera immediately, then asks for tags after capture
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Camera,
  RotateCcw,
  Check,
  Image,
  Pen,
  Undo,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { photosApi } from '../utils/api';

type CaptureStep = 'camera' | 'preview' | 'tag';

const categories = [
  { value: 'progress', label: 'Progress', color: 'bg-blue-500' },
  { value: 'problem', label: 'Problem', color: 'bg-red-500' },
  { value: 'in-wall', label: 'In-Wall', color: 'bg-purple-500' },
  { value: 'above-ceiling', label: 'Above Ceiling', color: 'bg-indigo-500' },
  { value: 'equipment', label: 'Equipment', color: 'bg-green-500' },
  { value: 'delivery', label: 'Delivery', color: 'bg-amber-500' },
  { value: 'milestone', label: 'Milestone', color: 'bg-pink-500' },
];

const areas = [
  'Level 1 - North',
  'Level 1 - South', 
  'Level 1 - East',
  'Level 1 - West',
  'Level 2 - North',
  'Level 2 - South',
  'Level 3',
  'Roof',
  'Exterior',
  'Mechanical Room',
];

export function PhotoCapturePage() {
  const navigate = useNavigate();
  const { currentProject, currentArea, setLastUsedCostCode, showToast } = useAppStore();
  
  const [step, setStep] = useState<CaptureStep>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('progress');
  const [selectedArea, setSelectedArea] = useState(currentArea || '');
  const [costCode, setCostCode] = useState('');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera on mount
  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please use the gallery option.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      stopCamera();
      setStep('preview');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        stopCamera();
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setStep('camera');
  };

  const proceedToTag = () => {
    setStep('tag');
  };

  const handleSubmit = async () => {
    if (!capturedImage || !currentProject) {
      showToast('No photo to upload', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert base64 to file
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Upload to API
      await photosApi.upload(currentProject.id, file, {
        category: selectedCategory,
        area: selectedArea,
        caption: caption,
        cost_code: costCode || undefined,
      });
      
      if (costCode) {
        setLastUsedCostCode(costCode);
      }
      showToast('Photo uploaded successfully!', 'success');
      navigate('/today');
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      showToast(err.response?.data?.detail || 'Failed to upload photo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="text-center text-white">
          <h2 className="text-lg font-semibold mb-2">No Project Selected</h2>
          <button 
            onClick={() => navigate('/today')}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Camera View
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          <button onClick={() => navigate(-1)} className="text-white p-2">
            <X size={24} />
          </button>
          <span className="text-white font-medium">Take Photo</span>
          <div className="w-10" />
        </div>

        {/* Camera feed */}
        <div className="flex-1 relative">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
              <div>
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-4">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium"
                >
                  Choose from Gallery
                </button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-around">
            {/* Gallery button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Image size={24} className="text-white" />
            </button>

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              disabled={!!cameraError}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black" />
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12" />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Preview View
  if (step === 'preview') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          <button onClick={retake} className="text-white p-2 flex items-center gap-1">
            <RotateCcw size={20} />
            <span>Retake</span>
          </button>
          <span className="text-white font-medium">Preview</span>
          <button onClick={proceedToTag} className="text-white p-2 flex items-center gap-1">
            <span>Next</span>
            <Check size={20} />
          </button>
        </div>

        {/* Image preview */}
        <div className="flex-1 flex items-center justify-center">
          {capturedImage && (
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        {/* Quick annotation hint */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={proceedToTag}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Pen size={20} />
            Add Tags & Submit
          </button>
        </div>
      </div>
    );
  }

  // Tag View
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setStep('preview')} className="p-2 -ml-2">
          <Undo size={24} />
        </button>
        <span className="font-semibold">Tag Photo</span>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Thumbnail */}
        <div className="w-full aspect-video bg-gray-200 rounded-xl overflow-hidden">
          {capturedImage && (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Category selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedCategory === cat.value
                    ? `${cat.color} text-white`
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Area / Location
          </label>
          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select area...</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* Cost Code - Optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost Code <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={costCode}
            onChange={e => setCostCode(e.target.value)}
            placeholder="e.g., 23-0100"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />
          {/* Recent cost codes - HVAC specific */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {['23-0100 Duct', '23-0200 Piping', '23-0500 Equipment', '23-0700 Insulation'].map(code => (
              <button
                key={code}
                onClick={() => setCostCode(code.split(' ')[0])}
                className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Caption / Notes
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Describe what's in this photo..."
            className="w-full p-3 border rounded-xl resize-none h-20 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submit button */}
      <div className="bg-white border-t p-4 safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Uploading...' : 'Save Photo'}
          {!isSubmitting && <Check size={20} />}
        </button>
      </div>
    </div>
  );
}

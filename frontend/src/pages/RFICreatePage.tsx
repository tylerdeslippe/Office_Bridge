/**
 * RFI Create Page - Request for Information
 * Submit questions to architect/engineer from the field
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  FileQuestion,
  Camera,
  Image,
  X,
  MapPin,
  Calendar,
  User,
  Building,
  Send,
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
  FileText,
  Plus,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';

// Drawing references
const DRAWING_TYPES = [
  { value: 'M', label: 'Mechanical' },
  { value: 'A', label: 'Architectural' },
  { value: 'S', label: 'Structural' },
  { value: 'E', label: 'Electrical' },
  { value: 'P', label: 'Plumbing' },
  { value: 'SPEC', label: 'Specification' },
];

// Priority levels
const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

// Route to options
const ROUTE_TO_OPTIONS = [
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'owner', label: 'Owner' },
  { value: 'consultant', label: 'Consultant' },
];

interface RFIFormData {
  subject: string;
  question: string;
  drawing_ref: string;
  drawing_type: string;
  spec_section: string;
  location: string;
  priority: string;
  route_to: string;
  date_needed: string;
  suggested_answer: string;
  cost_impact: boolean;
  schedule_impact: boolean;
  attachments: Array<{ id: string; type: 'photo' | 'file'; preview: string; name: string }>;
}

export function RFICreatePage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState<'question' | 'suggested' | null>(null);
  
  const [formData, setFormData] = useState<RFIFormData>({
    subject: '',
    question: '',
    drawing_ref: '',
    drawing_type: 'M',
    spec_section: '',
    location: '',
    priority: 'medium',
    route_to: 'engineer',
    date_needed: '',
    suggested_answer: '',
    cost_impact: false,
    schedule_impact: false,
    attachments: [],
  });

  const updateField = (field: keyof RFIFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVoiceInput = (field: 'question' | 'suggested') => {
    if (!('webkitSpeechRecognition' in window)) {
      showToast('Voice input not supported', 'error');
      return;
    }
    
    setActiveField(field);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setActiveField(null);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      updateField(field === 'question' ? 'question' : 'suggested_answer', 
        formData[field === 'question' ? 'question' : 'suggested_answer'] + ' ' + transcript);
    };
    
    recognition.start();
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newAttachment = {
            id: Date.now().toString() + Math.random(),
            type: 'photo' as const,
            preview: reader.result as string,
            name: file.name,
          };
          setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, newAttachment],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const newAttachment = {
          id: Date.now().toString() + Math.random(),
          type: 'file' as const,
          preview: '',
          name: file.name,
        };
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment],
        }));
      });
    }
  };

  const removeAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.subject.trim()) {
      showToast('Subject is required', 'error');
      return;
    }
    if (!formData.question.trim()) {
      showToast('Question is required', 'error');
      return;
    }
    if (!currentProject) {
      showToast('Select a project first', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast('RFI submitted successfully!', 'success');
      navigate('/today');
    } catch (err) {
      showToast('Failed to submit RFI', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">New RFI</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-4">
        {/* Project Badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <Building size={20} className="text-blue-600" />
          <div className="flex-1">
            <div className="text-sm text-blue-600">Project</div>
            <div className="font-medium">{currentProject?.name || 'No project selected'}</div>
          </div>
        </div>

        {/* Subject */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject / Title *
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={e => updateField('subject', e.target.value)}
            placeholder="Brief description of the issue"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question / Description *
          </label>
          <div className="relative">
            <textarea
              value={formData.question}
              onChange={e => updateField('question', e.target.value)}
              placeholder="Describe the issue or question in detail..."
              rows={4}
              className="w-full p-3 pr-12 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => handleVoiceInput('question')}
              className={`absolute right-2 top-2 p-2 rounded-lg ${
                isListening && activeField === 'question'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isListening && activeField === 'question' ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>

        {/* Drawing Reference */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Drawing Reference
          </label>
          <div className="flex gap-3">
            <select
              value={formData.drawing_type}
              onChange={e => updateField('drawing_type', e.target.value)}
              className="p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              {DRAWING_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={formData.drawing_ref}
              onChange={e => updateField('drawing_ref', e.target.value)}
              placeholder="e.g., M-201, Detail 4"
              className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Spec Section */}
          <div className="mt-3">
            <input
              type="text"
              value={formData.spec_section}
              onChange={e => updateField('spec_section', e.target.value)}
              placeholder="Spec Section (e.g., 23 31 00)"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin size={16} className="inline mr-1" />
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={e => updateField('location', e.target.value)}
            placeholder="e.g., Level 2, Room 204, Grid B-4"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Priority & Route To */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => updateField('priority', p.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    formData.priority === p.value
                      ? p.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Route To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Route To
            </label>
            <div className="flex flex-wrap gap-2">
              {ROUTE_TO_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => updateField('route_to', r.value)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium ${
                    formData.route_to === r.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Needed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Response Needed By
            </label>
            <input
              type="date"
              value={formData.date_needed}
              onChange={e => updateField('date_needed', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Impact Indicators */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <AlertTriangle size={16} className="inline mr-1" />
            Impact Assessment
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateField('cost_impact', !formData.cost_impact)}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.cost_impact
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="text-2xl mb-1">💰</div>
              <div className={`font-medium text-sm ${
                formData.cost_impact ? 'text-red-700' : 'text-gray-600'
              }`}>
                Cost Impact
              </div>
              <div className={`text-xs ${
                formData.cost_impact ? 'text-red-600' : 'text-gray-400'
              }`}>
                {formData.cost_impact ? 'Yes' : 'Tap if yes'}
              </div>
            </button>

            <button
              onClick={() => updateField('schedule_impact', !formData.schedule_impact)}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.schedule_impact
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="text-2xl mb-1">📅</div>
              <div className={`font-medium text-sm ${
                formData.schedule_impact ? 'text-orange-700' : 'text-gray-600'
              }`}>
                Schedule Impact
              </div>
              <div className={`text-xs ${
                formData.schedule_impact ? 'text-orange-600' : 'text-gray-400'
              }`}>
                {formData.schedule_impact ? 'Yes' : 'Tap if yes'}
              </div>
            </button>
          </div>
        </div>

        {/* Suggested Answer */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Suggested Solution (Optional)
          </label>
          <div className="relative">
            <textarea
              value={formData.suggested_answer}
              onChange={e => updateField('suggested_answer', e.target.value)}
              placeholder="If you have a proposed solution, describe it here..."
              rows={3}
              className="w-full p-3 pr-12 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => handleVoiceInput('suggested')}
              className={`absolute right-2 top-2 p-2 rounded-lg ${
                isListening && activeField === 'suggested'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isListening && activeField === 'suggested' ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Attachments
          </label>
          
          {/* Attachment Preview */}
          {formData.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.attachments.map(att => (
                <div key={att.id} className="relative">
                  {att.type === 'photo' ? (
                    <img 
                      src={att.preview} 
                      alt={att.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2">
                      <FileText size={24} className="text-gray-400" />
                      <span className="text-xs text-gray-500 truncate w-full text-center">
                        {att.name}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500"
            >
              <Camera size={24} />
              <span className="text-sm">Take Photo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500"
            >
              <Image size={24} />
              <span className="text-sm">Upload File</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
            multiple
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
        </div>

        {/* Submitter Info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <User size={18} />
            <span>Submitted by: <strong>{user?.first_name} {user?.last_name}</strong></span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
            <Calendar size={18} />
            <span>Date: <strong>{new Date().toLocaleDateString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.subject || !formData.question}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit RFI
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Suggestions Page - Alpha/Beta feedback collection
 * Users can submit feature requests, bug reports, and general feedback
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Send,
  Lightbulb,
  Bug,
  MessageSquare,
  Check,
  Star,
  ThumbsUp,
  Trash2,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { localDB } from '../utils/localDB';

type FeedbackType = 'feature' | 'bug' | 'general';

interface Suggestion {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  submittedBy: string;
  submittedAt: string;
  status: 'submitted' | 'reviewed' | 'planned' | 'completed';
  votes: number;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Lightbulb; color: string }[] = [
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500 bg-amber-50' },
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500 bg-red-50' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-blue-500 bg-blue-50' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Nice to have', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Important', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export function SuggestionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  
  // Form state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const saved = await localDB.getSetting<Suggestion[]>('suggestions');
      if (saved) {
        setSuggestions(saved);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const saveSuggestions = async (newSuggestions: Suggestion[]) => {
    await localDB.setSetting('suggestions', newSuggestions);
    setSuggestions(newSuggestions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const newSuggestion: Suggestion = {
        id: `sug_${Date.now()}`,
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        priority,
        submittedBy: user?.firstName || 'Anonymous',
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        votes: 0,
      };
      
      const updated = [newSuggestion, ...suggestions];
      await saveSuggestions(updated);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setFeedbackType('feature');
      setSubmitted(true);
      
      // Show success briefly then reset
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = suggestions.filter(s => s.id !== id);
    await saveSuggestions(updated);
  };

  const handleVote = async (id: string) => {
    const updated = suggestions.map(s => 
      s.id === id ? { ...s, votes: s.votes + 1 } : s
    );
    await saveSuggestions(updated);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTypeConfig = (type: FeedbackType) => {
    return FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[0];
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">Your feedback helps us improve Office Bridge.</p>
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
          <h1 className="font-semibold">Suggestions & Feedback</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Alpha Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Star size={20} />
          <div>
            <div className="font-semibold">Alpha Testing</div>
            <div className="text-sm text-white/80">Help shape the future of Office Bridge!</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'submit' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500'
          }`}
        >
          Submit Feedback
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'history' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500'
          }`}
        >
          My Submissions ({suggestions.length})
        </button>
      </div>

      {activeTab === 'submit' ? (
        <div className="p-4 space-y-6">
          {/* Feedback Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of feedback?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFeedbackType(type.value)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      feedbackType === type.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {feedbackType === 'feature' ? 'Feature Title' : feedbackType === 'bug' ? 'Bug Summary' : 'Feedback Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                feedbackType === 'feature' 
                  ? 'e.g., Add photo annotations' 
                  : feedbackType === 'bug'
                  ? 'e.g., App crashes when uploading photos'
                  : 'e.g., Great app but needs...'
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                feedbackType === 'feature'
                  ? 'Describe the feature and how it would help your workflow...'
                  : feedbackType === 'bug'
                  ? 'Steps to reproduce the bug, what you expected vs what happened...'
                  : 'Share your thoughts, ideas, or concerns...'
              }
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How important is this to you?
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value as any)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    priority === opt.value 
                      ? `${opt.color} border-current` 
                      : 'bg-gray-50 text-gray-500 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={20} />
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center">
            Your feedback is stored locally and will be reviewed by our team in future updates.
          </p>
        </div>
      ) : (
        <div className="p-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No submissions yet</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Submit Your First Feedback
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(suggestion => {
                const typeConfig = getTypeConfig(suggestion.type);
                const Icon = typeConfig.icon;
                
                return (
                  <div key={suggestion.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                          <button
                            onClick={() => handleDelete(suggestion.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {suggestion.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{suggestion.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(suggestion.submittedAt)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            PRIORITY_OPTIONS.find(p => p.value === suggestion.priority)?.color
                          }`}>
                            {PRIORITY_OPTIONS.find(p => p.value === suggestion.priority)?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

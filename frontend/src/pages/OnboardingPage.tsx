/**
 * Onboarding Page - First-time setup for local-only mode
 * No server required - creates local profile
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Phone,
  Mail,
  ChevronRight,
  HardHat,
  Briefcase,
  Wrench,
  Shield,
  Check,
} from 'lucide-react';
import { useAuthStore, UserRole } from '../contexts/localAuthStore';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Oversee projects, review reports, manage team',
    icon: Briefcase,
  },
  {
    value: 'superintendent',
    label: 'Superintendent',
    description: 'Run jobsite, manage crews, daily operations',
    icon: HardHat,
  },
  {
    value: 'foreman',
    label: 'Foreman',
    description: 'Lead crew, submit daily reports',
    icon: Wrench,
  },
  {
    value: 'field_worker',
    label: 'Field Worker',
    description: 'Capture photos, log hours, view tasks',
    icon: User,
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { createProfile } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '' as UserRole | '',
    companyName: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && formData.firstName && formData.lastName) {
      setStep(2);
    } else if (step === 2 && formData.role) {
      setStep(3);
    }
  };

  const handleFinish = async () => {
    if (!formData.firstName || !formData.lastName || !formData.role) return;
    
    setIsSubmitting(true);
    try {
      await createProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role: formData.role as UserRole,
        companyName: formData.companyName || undefined,
      });
      navigate('/today');
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col">
      {/* Header */}
      <div className="p-6 text-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Office Bridge</h1>
        <p className="text-blue-100 text-sm mt-1">Field-to-Office Construction Management</p>
      </div>

      {/* Progress */}
      <div className="px-6 mb-4">
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900">Let's get started</h2>
              <p className="text-gray-600 mt-1">Tell us your name</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => updateField('firstName', e.target.value)}
                    placeholder="Tyler"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => updateField('lastName', e.target.value)}
                    placeholder="Smith"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <Building2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => updateField('companyName', e.target.value)}
                    placeholder="ACME Construction"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!formData.firstName || !formData.lastName}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900">What's your role?</h2>
              <p className="text-gray-600 mt-1">This customizes your experience</p>
            </div>

            <div className="space-y-3">
              {ROLE_OPTIONS.map(role => {
                const Icon = role.icon;
                const isSelected = formData.role === role.value;
                
                return (
                  <button
                    key={role.value}
                    onClick={() => updateField('role', role.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{role.label}</div>
                        <div className="text-sm text-gray-500">{role.description}</div>
                      </div>
                      {isSelected && (
                        <Check size={24} className="text-blue-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              disabled={!formData.role}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 3: Contact (Optional) */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900">Contact info</h2>
              <p className="text-gray-600 mt-1">Optional - for document headers</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="tyler@example.com"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mt-6">
              <div className="text-sm text-gray-500 mb-2">Your Profile</div>
              <div className="font-semibold text-gray-900">
                {formData.firstName} {formData.lastName}
              </div>
              <div className="text-sm text-gray-600">
                {ROLE_OPTIONS.find(r => r.value === formData.role)?.label}
                {formData.companyName && ` at ${formData.companyName}`}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
              <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Your data stays on your device.</strong> No account needed. 
                You can export your data anytime from Settings.
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Setting up...'
              ) : (
                <>
                  <Check size={20} />
                  Get Started
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

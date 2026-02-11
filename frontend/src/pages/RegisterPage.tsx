import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { UserRole } from '../utils/types';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'field_worker', label: 'Field Worker' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'project_engineer', label: 'Project Engineer' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'document_controller', label: 'Document Controller' },
  { value: 'service_dispatcher', label: 'Service Dispatcher' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'field_worker' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
        role: formData.role,
      });
      navigate('/');
    } catch {
      // Error handled in store
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blueprint to-blue-900 px-6 pt-12 pb-16">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-blue-200 mb-6"
        >
          <ChevronLeft size={20} />
          Back to Sign In
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Create Account</h1>
            <p className="text-blue-200 text-sm">Join Office Bridge</p>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="bg-white -mt-8 rounded-t-3xl px-6 pt-8 pb-10 min-h-[calc(100vh-180px)]">
        {(error || validationError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
            {error || validationError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="input"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="input"
                placeholder="Smith"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <label className="label">Phone (optional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <label className="label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input pr-12"
                placeholder="Min 6 characters"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="label">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input"
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blueprint font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

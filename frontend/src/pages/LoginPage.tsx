/**
 * Login Page - Supabase Authentication
 * Clean minimal design with dark/light mode
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  ArrowRight,
  User,
} from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';

type AuthMode = 'login' | 'register' | 'forgot';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, resetPassword, isLoading: authLoading } = useAuthStore();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        if (!firstName || !lastName) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        if (!companyCode) {
          setError('Company code is required');
          setIsLoading(false);
          return;
        }

        await register({
          email,
          password,
          firstName,
          lastName,
          companyCode,
        });
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setMessage('Check your email for a password reset link');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const bgColor = isDarkMode ? 'bg-black' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const inputText = isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} overflow-y-auto`}>
      <div className="min-h-screen flex flex-col px-8 py-16 max-w-md mx-auto">
        
        {/* Logo */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-blue-500">Office</span>
              <span className={textColor}>Bridge</span>
            </h1>
          </div>
          
          {/* Tagline */}
          <p className={`text-lg ${textMuted} mb-12 text-center`}>
            {mode === 'login' ? 'Welcome back' : 
             mode === 'register' ? 'Create your account' :
             'Reset your password'}
          </p>
        </div>

        {/* Form */}
        <div className="flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-sm text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={`w-full pl-12 pr-4 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={`w-full px-4 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="relative">
              <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                placeholder="Email"
                required
              />
            </div>

            {mode !== 'forgot' && (
              /* Password */
              <div className="relative">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <>
                {/* Confirm Password */}
                <div className="relative">
                  <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                    placeholder="Confirm password"
                    required
                  />
                </div>

                {/* Company Code */}
                <div className="relative">
                  <Building2 size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    className={`w-full pl-12 pr-4 py-4 ${inputBg} ${inputText} border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase`}
                    placeholder="Company code"
                    required
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const newCode = `CO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    setCompanyCode(newCode);
                  }}
                  className="text-sm text-blue-500 font-medium"
                >
                  + Create new company code
                </button>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
            >
              {isLoading || authLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 
                   mode === 'register' ? 'Create Account' :
                   'Send Reset Link'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-8 text-center">
            {mode === 'forgot' ? (
              <button
                onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                className="text-blue-500 font-semibold"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                <p className={textMuted}>
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </p>
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-blue-500 font-semibold mt-1"
                >
                  {mode === 'login' ? 'Create Account' : 'Sign In'}
                </button>
              </>
            )}
          </div>

          {mode === 'login' && (
            <button 
              onClick={() => { setMode('forgot'); setError(''); }}
              className={`w-full mt-6 text-sm ${textMuted}`}
            >
              Forgot password?
            </button>
          )}
        </div>

        {/* Bottom spacer for scrolling */}
        <div className="h-8" />
      </div>
    </div>
  );
}

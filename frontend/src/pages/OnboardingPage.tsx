/**
 * OnboardingPage - Redirects to Login
 * Legacy route support
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function OnboardingPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
}

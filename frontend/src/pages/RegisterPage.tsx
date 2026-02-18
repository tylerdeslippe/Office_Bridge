/**
 * RegisterPage - Redirects to Login
 * Registration is now handled in LoginPage
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function RegisterPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
}

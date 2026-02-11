import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../contexts/authStore';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  // Derive title from path if not provided
  const derivedTitle = title || getPageTitle(location.pathname);
  
  return (
    <header className="header">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-[60px]">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
          )}
        </div>
        
        {/* Center */}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {derivedTitle}
        </h1>
        
        {/* Right */}
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          {rightAction || (
            <>
              <button className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors relative">
                <Bell size={22} className="text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="p-1 rounded-full bg-blueprint"
              >
                {user?.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt={user.first_name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white m-0.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string): string {
  const routes: Record<string, string> = {
    '/': 'Office Bridge',
    '/projects': 'Projects',
    '/tasks': 'My Tasks',
    '/photos': 'Photos',
    '/more': 'More',
    '/daily-report': 'Daily Report',
    '/rfis': 'RFIs',
    '/changes': 'Changes',
    '/punch': 'Punch List',
    '/deliveries': 'Deliveries',
    '/constraints': 'Constraints',
    '/decisions': 'Decisions',
    '/service': 'Service Calls',
    '/profile': 'Profile',
    '/login': 'Sign In',
    '/register': 'Create Account',
  };
  
  return routes[pathname] || 'Office Bridge';
}

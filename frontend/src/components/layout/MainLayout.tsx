/**
 * Main Layout - Modern Clean Design with Bottom Nav
 */
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  FileText,
  MoreHorizontal,
} from 'lucide-react';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bg = isDark ? 'bg-black' : 'bg-gray-50';
  const navBg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';

  const navItems = [
    { icon: Building2, label: 'Home', path: '/dashboard' },
    { icon: CheckCircle, label: 'Tasks', path: '/tasks' },
    { icon: FileText, label: 'Reports', path: '/daily-report' },
    { icon: MoreHorizontal, label: 'More', path: '/more' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      <main className="pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${navBg} border-t ${border} safe-area-bottom`}>
        <div className="flex justify-around px-4 py-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                  active ? 'text-blue-500' : textMuted
                }`}
              >
                <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

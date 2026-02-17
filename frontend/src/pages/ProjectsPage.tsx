/**
 * Projects Page - Modern Clean Design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Building2,
  MapPin,
  Search,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { projectsService, Project } from '../services/projectsService';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await projectsService.getAll();
    setProjects(data);
    setIsLoading(false);
  };

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.number?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'planning': return 'text-blue-500 bg-blue-500/10';
      case 'draft': return 'text-gray-500 bg-gray-500/10';
      case 'on_hold': return 'text-amber-500 bg-amber-500/10';
      case 'completed': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const statuses = ['all', 'active', 'planning', 'draft', 'completed'];

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${bg} px-6 pt-14 pb-4 sticky top-0 z-10`}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/dashboard')} className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex-1">Projects</h1>
          <button 
            onClick={() => navigate('/projects/new')}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-3 px-4 py-3 ${inputBg} rounded-2xl mb-4`}>
          <Search size={20} className={textMuted} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className={`flex-1 bg-transparent outline-none ${text}`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
                filter === s 
                  ? 'bg-blue-500 text-white' 
                  : `${cardBg} ${textMuted} ${border} border`
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* Projects List */}
      <div className="px-6 pb-8 space-y-3">
        {filteredProjects.length === 0 ? (
          <div className={`${cardBg} rounded-2xl p-8 ${border} border text-center mt-4`}>
            <Building2 size={48} className={`${textMuted} mx-auto mb-4`} />
            <p className="font-medium mb-1">No projects found</p>
            <p className={`text-sm ${textMuted} mb-4`}>
              {search ? 'Try a different search' : 'Create your first project'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/projects/new')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium"
              >
                New Project
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className={`w-full ${cardBg} rounded-2xl p-4 ${border} border flex items-center gap-4 text-left`}
            >
              <div className={`w-14 h-14 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Building2 size={24} className={textMuted} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{project.name}</div>
                <div className={`text-sm ${textMuted} flex items-center gap-2 mt-1`}>
                  {project.number && <span>#{project.number}</span>}
                  {project.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {project.city}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <ChevronRight size={18} className={textMuted} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

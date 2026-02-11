import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { Project, ProjectStatus } from '../utils/types';
import { projectsApi } from '../utils/api';
import { useAppStore } from '../contexts/appStore';

const statusColors: Record<ProjectStatus, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const { setCurrentProject, currentProject } = useAppStore();
  
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const response = await projectsApi.list({
          status: statusFilter || undefined,
          search: search || undefined,
        });
        
        if (abortController.signal.aborted) return;
        
        // FastAPI returns array directly, not { projects: [...] }
        const projectList = Array.isArray(response.data) ? response.data : [];
        setProjects(projectList);
      } catch (error: any) {
        if (abortController.signal.aborted) return;
        console.error('Failed to load projects:', error);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    loadProjects();
    
    return () => {
      abortController.abort();
    };
  }, [statusFilter]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger reload by updating a dependency or calling directly
    setIsLoading(true);
    projectsApi.list({
      status: statusFilter || undefined,
      search: search || undefined,
    }).then(response => {
      const projectList = Array.isArray(response.data) ? response.data : [];
      setProjects(projectList);
    }).catch(error => {
      console.error('Failed to load projects:', error);
    }).finally(() => {
      setIsLoading(false);
    });
  };
  
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };
  
  return (
    <div className="px-4 py-6 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input pl-10"
        />
      </form>
      
      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === ''
              ? 'bg-blueprint text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          All
        </button>
        {(['active', 'planning', 'on_hold', 'completed'] as ProjectStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-blueprint text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>
      
      {/* Projects List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blueprint" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No projects found</p>
          <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={20} />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`card cursor-pointer transition-all ${
                currentProject?.id === project.id
                  ? 'ring-2 ring-blueprint'
                  : 'active:scale-[0.99]'
              }`}
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-xs ${statusColors[project.status]}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                    {currentProject?.id === project.id && (
                      <span className="badge bg-blueprint text-white text-xs">Selected</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                  {project.number && (
                    <p className="text-sm text-gray-500">#{project.number}</p>
                  )}
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 -m-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                {project.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {project.city}, {project.state}
                  </span>
                )}
                {project.target_completion && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(project.target_completion).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              {project.client_name && (
                <p className="text-sm text-gray-500 mt-2">
                  Client: {project.client_name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* FAB */}
      <Link
        to="/projects/new"
        className="fixed bottom-24 right-4 w-14 h-14 bg-blueprint text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}

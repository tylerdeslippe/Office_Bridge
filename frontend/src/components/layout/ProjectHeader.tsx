/**
 * Sticky Project Header - Fetches real projects from API
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, WifiOff, Check, Search, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useAppStore } from '../../contexts/appStore';
import { projectsApi } from '../../utils/api';

interface Project {
  id: number;
  name: string;
  number: string;
  status?: string;
}

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (project: { id: number; name: string; number: string }) => void;
  onCreateNew: () => void;
  currentProjectId: number | null;
}

function ProjectSelectorModal({ isOpen, onClose, onSelect, onCreateNew, currentProjectId }: ProjectSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Fetch when modal opens
  useEffect(() => {
    if (isOpen && !fetchAttempted) {
      setFetchAttempted(true);
      loadProjects();
    }
    if (!isOpen) {
      // Reset when closed
      setFetchAttempted(false);
    }
  }, [isOpen, fetchAttempted]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await projectsApi.list({ limit: 100 });
      const data = response.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="p-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3">
          <h2 className="text-lg font-semibold text-center">Select Project</h2>
        </div>

        {/* Create New Project Button */}
        <div className="px-4 pb-3">
          <button
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            className="w-full p-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium active:bg-blue-700"
          >
            <Plus size={20} />
            Create New Project
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Project list */}
        <div className="overflow-y-auto max-h-[50vh] pb-safe">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-500">Loading projects...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <p className="mt-2 text-red-600">{error}</p>
              <button 
                onClick={loadProjects}
                className="mt-3 text-blue-600 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {projects.length === 0 ? (
                <div>
                  <p className="mb-2">No projects yet.</p>
                  <p className="text-sm">Tap "Create New Project" to get started.</p>
                </div>
              ) : (
                'No projects found'
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                Your Projects
              </div>
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelect(project);
                    onClose();
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left border-b border-gray-100 active:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{project.name}</div>
                    <div className="text-sm text-gray-500">{project.number || 'No number'}</div>
                  </div>
                  {project.id === currentProjectId && (
                    <Check size={20} className="text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Cancel button */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={onClose}
            className="w-full py-3 text-center text-gray-600 font-medium rounded-xl bg-gray-100 active:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectHeader() {
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, isOffline } = useAppStore();
  const [showSelector, setShowSelector] = useState(false);

  const handleCreateNew = () => {
    navigate('/projects/new');
  };

  return (
    <>
      <div className="bg-blue-600 text-white px-4 py-2.5 safe-top sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Project selector - main element */}
          <button 
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <div className="min-w-0 flex-1">
              {currentProject ? (
                <div className="font-semibold truncate">{currentProject.name}</div>
              ) : (
                <div className="font-medium text-blue-200">Tap to select project</div>
              )}
            </div>
            <ChevronDown size={18} className="flex-shrink-0 text-blue-200" />
          </button>

          {/* Offline indicator - only shows when offline */}
          {isOffline && (
            <div className="flex items-center gap-1.5 ml-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">
              <WifiOff size={12} />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      <ProjectSelectorModal
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={setCurrentProject}
        onCreateNew={handleCreateNew}
        currentProjectId={currentProject?.id || null}
      />
    </>
  );
}

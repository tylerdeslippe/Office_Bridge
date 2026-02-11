/**
 * Documents Page - Simplified
 * Whole row tappable (no separate download icon)
 * Offline indicator for downloaded docs
 */
import { useState } from 'react';
import {
  Search,
  FileText,
  Image,
  File,
  ChevronRight,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';

interface Document {
  id: string;
  title: string;
  type: 'drawing' | 'spec' | 'scope' | 'redline' | 'submittal';
  number?: string;
  revision?: string;
  date: string;
  isDownloaded?: boolean;
}

const mockDocuments: Document[] = [
  { id: '1', title: 'E-101 Electrical Site Plan', type: 'drawing', number: 'E-101', revision: 'Rev 3', date: 'Jan 15', isDownloaded: true },
  { id: '2', title: 'E-201 Power Plan Level 1', type: 'drawing', number: 'E-201', revision: 'Rev 2', date: 'Jan 10', isDownloaded: true },
  { id: '3', title: 'E-301 Lighting Plan Level 1', type: 'drawing', number: 'E-301', revision: 'Rev 2', date: 'Jan 10' },
  { id: '4', title: 'Electrical Specifications', type: 'spec', date: 'Dec 20' },
  { id: '5', title: 'Project Scope Sheet', type: 'scope', date: 'Nov 15', isDownloaded: true },
  { id: '6', title: 'RFI-024 Response Markup', type: 'redline', date: 'Jan 28' },
  { id: '7', title: 'Panel Schedule Submittal', type: 'submittal', date: 'Jan 20' },
];

const typeIcons: Record<string, any> = {
  drawing: Image,
  spec: FileText,
  scope: File,
  redline: FileText,
  submittal: FileText,
};

const typeColors: Record<string, string> = {
  drawing: 'bg-blue-100 text-blue-600',
  spec: 'bg-purple-100 text-purple-600',
  scope: 'bg-green-100 text-green-600',
  redline: 'bg-red-100 text-red-600',
  submittal: 'bg-amber-100 text-amber-600',
};

export function DocumentsPage() {
  const { currentProject, showToast } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filteredDocs = mockDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || doc.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenDocument = (doc: Document) => {
    showToast(`Opening ${doc.title}...`, 'info');
    // In real app, open document viewer
  };

  if (!currentProject) {
    return (
      <div className="p-4 pt-8 text-center">
        <p className="text-gray-500">Select a project to view documents</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Documents</h1>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search drawings, specs..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {['all', 'drawing', 'spec', 'scope', 'redline'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="px-4">
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {filteredDocs.map(doc => {
            const Icon = typeIcons[doc.type];
            return (
              <button
                key={doc.id}
                onClick={() => handleOpenDocument(doc)}
                className="w-full p-3 flex items-center gap-3 text-left active:bg-gray-50"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[doc.type]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{doc.title}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {doc.number && <span>{doc.number}</span>}
                    {doc.revision && <span className="text-blue-600">{doc.revision}</span>}
                    <span>{doc.date}</span>
                  </div>
                </div>
                {/* Offline indicator */}
                {doc.isDownloaded ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} />
                    Offline
                  </span>
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </button>
            );
          })}
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-semibold text-gray-900">No documents found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

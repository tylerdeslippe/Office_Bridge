import { useState, useEffect, useRef } from 'react';
import { Camera, Image, Filter, Loader2, X, Upload } from 'lucide-react';
import { Photo } from '../utils/types';
import { photosApi } from '../utils/api';
import { useAppStore } from '../contexts/appStore';
import { format } from 'date-fns';

const categories = [
  { value: '', label: 'All' },
  { value: 'progress', label: 'Progress' },
  { value: 'in-wall', label: 'In-Wall' },
  { value: 'above-ceiling', label: 'Above Ceiling' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'issue', label: 'Issues' },
];

export function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentProject, showToast } = useAppStore();
  
  useEffect(() => {
    if (currentProject) {
      loadPhotos();
    } else {
      setIsLoading(false);
    }
  }, [currentProject, category]);
  
  const loadPhotos = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const response = await photosApi.list({
        project_id: currentProject.id,
        category: category || undefined,
      });
      setPhotos(response.data.photos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject) return;
    
    setIsUploading(true);
    try {
      await photosApi.upload(currentProject.id, file, {
        category: 'progress',
      });
      showToast('Photo uploaded', 'success');
      loadPhotos();
    } catch (error) {
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };
  
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };
  
  if (!currentProject) {
    return (
      <div className="px-4 py-12 text-center">
        <Image size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Select a project to view photos</p>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-6 space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Upload buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCameraCapture}
          disabled={isUploading}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Camera size={20} />
          )}
          Take Photo
        </button>
        <button
          onClick={handleGallerySelect}
          disabled={isUploading}
          className="btn-secondary flex items-center justify-center gap-2 px-6"
        >
          <Upload size={20} />
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.value
                ? 'bg-blueprint text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Photos Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blueprint" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <Image size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No photos yet</p>
          <p className="text-sm text-gray-400">Take a photo to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
            >
              <img
                src={`/uploads/photos/${photo.file_path.split('/').pop()}`}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
              {photo.category && (
                <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded truncate">
                  {photo.category}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="flex items-center justify-between p-4">
            <div className="text-white">
              <p className="font-medium">{selectedPhoto.caption || 'Photo'}</p>
              {selectedPhoto.taken_at && (
                <p className="text-sm text-gray-400">
                  {format(new Date(selectedPhoto.taken_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
            <button className="p-2 text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={`/uploads/photos/${selectedPhoto.file_path.split('/').pop()}`}
              alt={selectedPhoto.caption || 'Photo'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="p-4 text-white">
            {selectedPhoto.location && (
              <p className="text-sm">
                <span className="text-gray-400">Location:</span> {selectedPhoto.location}
              </p>
            )}
            {selectedPhoto.area && (
              <p className="text-sm">
                <span className="text-gray-400">Area:</span> {selectedPhoto.area}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

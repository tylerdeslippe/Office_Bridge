/**
 * Daily Report - HVAC Contractor Optimized
 * PROJECT | DATE | FOREMAN | LEVEL/AREA | CREW | EQUIPMENT | WORK SUMMARY | PROBLEMS | RFI
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Wrench,
  AlertTriangle,
  Camera,
  Check,
  Minus,
  Plus,
  X,
  Save,
  Loader2,
  MapPin,
  Clock,
  Truck,
  FileQuestion,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { dailyReportsApi } from '../utils/api';

interface CrewMember {
  id: string;
  name: string;
  hours: number;
  location: string;
}

interface DailyReportData {
  date: string;
  foreman: string;
  level: string;
  unitSystem: string;
  crewMembers: CrewMember[];
  equipmentUsed: string[];
  customEquipment: string;
  workSummary: string;
  problemsEncountered: string;
  rfiRequired: boolean;
  rfiDescription: string;
  photos: string[];
}

// Common HVAC system abbreviations
const SYSTEM_TYPES = [
  { value: 'SA', label: 'SA', full: 'Supply Air' },
  { value: 'RA', label: 'RA', full: 'Return Air' },
  { value: 'OA', label: 'OA', full: 'Outside Air' },
  { value: 'EXH', label: 'EXH', full: 'Exhaust' },
  { value: 'VAV', label: 'VAV', full: 'VAV Boxes' },
  { value: 'EF', label: 'EF', full: 'Exhaust Fan' },
];

// Common rental equipment
const EQUIPMENT_OPTIONS = [
  'Scissor Lift',
  'Boom Lift',
  'Forklift',
  'Crane',
  'Welding Machine',
  'Duct Lift',
  'Scaffolding',
  'Generator',
];

const TOTAL_STEPS = 5;

export function DailyReportPage() {
  const navigate = useNavigate();
  const { currentProject, dailyReportDraft, saveDailyReportDraft, clearDailyReportDraft, showToast } = useAppStore();
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [data, setData] = useState<DailyReportData>(() => {
    // Default values
    const defaults: DailyReportData = {
      date: new Date().toISOString().split('T')[0],
      foreman: '',
      level: '',
      unitSystem: '',
      crewMembers: [],
      equipmentUsed: [],
      customEquipment: '',
      workSummary: '',
      problemsEncountered: '',
      rfiRequired: false,
      rfiDescription: '',
      photos: [],
    };
    
    // Merge with draft if exists (handles old format drafts)
    if (dailyReportDraft) {
      return { ...defaults, ...dailyReportDraft };
    }
    return defaults;
  });

  // New crew member form
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewHours, setNewCrewHours] = useState('8');
  const [newCrewLocation, setNewCrewLocation] = useState('');

  // Autosave draft
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDailyReportDraft(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, saveDailyReportDraft]);

  const addCrewMember = () => {
    if (!newCrewName.trim()) return;
    
    const newMember: CrewMember = {
      id: Date.now().toString(),
      name: newCrewName.trim(),
      hours: parseFloat(newCrewHours) || 8,
      location: newCrewLocation.trim() || data.level,
    };
    
    setData(prev => ({
      ...prev,
      crewMembers: [...prev.crewMembers, newMember],
    }));
    
    setNewCrewName('');
    setNewCrewHours('8');
    setNewCrewLocation('');
  };

  const removeCrewMember = (id: string) => {
    setData(prev => ({
      ...prev,
      crewMembers: prev.crewMembers.filter(m => m.id !== id),
    }));
  };

  const updateCrewMember = (id: string, field: keyof CrewMember, value: string | number) => {
    setData(prev => ({
      ...prev,
      crewMembers: prev.crewMembers.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  const toggleEquipment = (equipment: string) => {
    setData(prev => ({
      ...prev,
      equipmentUsed: prev.equipmentUsed.includes(equipment)
        ? prev.equipmentUsed.filter(e => e !== equipment)
        : [...prev.equipmentUsed, equipment],
    }));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({
          ...prev,
          photos: [...prev.photos, reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!currentProject) return;
    
    setIsSaving(true);
    try {
      const totalHours = data.crewMembers.reduce((sum, m) => sum + m.hours, 0);
      
      const payload = {
        project_id: currentProject.id,
        report_date: data.date,
        crew_count: data.crewMembers.length,
        crew_details: data.crewMembers.map(m => ({
          name: m.name,
          hours: m.hours,
          location: m.location,
        })),
        work_completed: data.workSummary,
        delays_constraints: data.problemsEncountered || null,
        notes: JSON.stringify({
          foreman: data.foreman,
          level: data.level,
          unitSystem: data.unitSystem,
          equipmentUsed: [...data.equipmentUsed, data.customEquipment].filter(Boolean),
          rfiRequired: data.rfiRequired,
          rfiDescription: data.rfiDescription,
          totalManHours: totalHours,
        }),
      };

      await dailyReportsApi.create(payload);
      clearDailyReportDraft();
      showToast('Daily report submitted!', 'success');
      navigate('/today');
    } catch (err: any) {
      console.error('Failed to submit daily report:', err);
      showToast(err.response?.data?.detail || 'Failed to submit report', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalHours = () => data.crewMembers.reduce((sum, m) => sum + m.hours, 0);

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-4">Please select a project to submit a daily report.</p>
          <button 
            onClick={() => navigate('/today')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="font-semibold">Daily Report</div>
          <div className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Save size={14} />
          <span>Saved</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Step 1: Project Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              Project Info
            </h2>

            {/* Project (read-only) */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <label className="block text-xs text-blue-600 font-medium mb-1">PROJECT</label>
              <div className="font-semibold text-blue-900">{currentProject.name}</div>
              {currentProject.number && (
                <div className="text-sm text-blue-700">#{currentProject.number}</div>
              )}
            </div>

            {/* Date */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">DATE</label>
              <input
                type="date"
                value={data.date}
                onChange={e => setData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Foreman */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">FOREMAN</label>
              <input
                type="text"
                value={data.foreman}
                onChange={e => setData(prev => ({ ...prev, foreman: e.target.value }))}
                placeholder="Foreman name"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Level / Area */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">LEVEL / AREA</label>
              <input
                type="text"
                value={data.level}
                onChange={e => setData(prev => ({ ...prev, level: e.target.value }))}
                placeholder="e.g., Level 2 North, Penthouse"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit & System */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">UNIT & SYSTEM</label>
              <input
                type="text"
                value={data.unitSystem}
                onChange={e => setData(prev => ({ ...prev, unitSystem: e.target.value }))}
                placeholder="e.g., AHU-1, RTU-3"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {SYSTEM_TYPES.map(sys => (
                  <button
                    key={sys.value}
                    onClick={() => {
                      const current = data.unitSystem || '';
                      const hasIt = current.includes(sys.value);
                      if (hasIt) {
                        setData(prev => ({ 
                          ...prev, 
                          unitSystem: current.replace(sys.value, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                        }));
                      } else {
                        setData(prev => ({ 
                          ...prev, 
                          unitSystem: current ? `${current}, ${sys.value}` : sys.value
                        }));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      (data.unitSystem || '').includes(sys.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {sys.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">SA=Supply, RA=Return, OA=Outside, EXH=Exhaust</p>
            </div>
          </div>
        )}

        {/* Step 2: Crew */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Crew
            </h2>

            {/* Add crew member */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Add Crew Member</label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCrewName}
                  onChange={e => setNewCrewName(e.target.value)}
                  placeholder="Name"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours</label>
                    <input
                      type="number"
                      value={newCrewHours}
                      onChange={e => setNewCrewHours(e.target.value)}
                      placeholder="8"
                      step="0.5"
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Location</label>
                    <input
                      type="text"
                      value={newCrewLocation}
                      onChange={e => setNewCrewLocation(e.target.value)}
                      placeholder={data.level || "Location"}
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addCrewMember}
                  disabled={!newCrewName.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={18} /> Add to Crew
                </button>
              </div>
            </div>

            {/* Crew list */}
            {data.crewMembers.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 divide-y">
                {data.crewMembers.map(member => (
                  <div key={member.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {member.hours}h
                          </span>
                          {member.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} /> {member.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeCrewMember(member.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No crew members added yet</p>
              </div>
            )}

            {/* Summary */}
            {data.crewMembers.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{data.crewMembers.length}</div>
                  <div className="text-sm text-gray-600">Crew Members</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{getTotalHours()}</div>
                  <div className="text-sm text-gray-600">Total Man-Hours</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Equipment & Work Summary */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck size={20} className="text-green-600" />
              Equipment & Work
            </h2>

            {/* Equipment Used */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                EQUIPMENT USED <span className="font-normal text-gray-400">(Rental Equipment)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {EQUIPMENT_OPTIONS.map(eq => (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      data.equipmentUsed.includes(eq)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={data.customEquipment}
                onChange={e => setData(prev => ({ ...prev, customEquipment: e.target.value }))}
                placeholder="Other equipment..."
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Work Summary */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SUMMARY OF WORK PERFORMED
              </label>
              <p className="text-xs text-gray-500 mb-2">
                e.g., Installation of ductwork - System AHU-1, VAV boxes, EF's
              </p>
              <textarea
                value={data.workSummary}
                onChange={e => setData(prev => ({ ...prev, workSummary: e.target.value }))}
                placeholder="Describe the work completed today..."
                rows={5}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Problems & RFI */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              Problems & RFI
            </h2>

            {/* Problems Encountered */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PROBLEMS ENCOUNTERED
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Reasons work was slowed (materials, access, other trades, etc.)
              </p>
              <textarea
                value={data.problemsEncountered}
                onChange={e => setData(prev => ({ ...prev, problemsEncountered: e.target.value }))}
                placeholder="Describe any problems or delays..."
                rows={4}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* RFI Required */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileQuestion size={18} className="text-purple-600" />
                  RFI REQUIRED?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setData(prev => ({ ...prev, rfiRequired: false }))}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      !data.rfiRequired ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setData(prev => ({ ...prev, rfiRequired: true }))}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      data.rfiRequired ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {data.rfiRequired && (
                <textarea
                  value={data.rfiDescription}
                  onChange={e => setData(prev => ({ ...prev, rfiDescription: e.target.value }))}
                  placeholder="Describe the RFI needed..."
                  rows={3}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 5: Photos & Submit */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Camera size={20} className="text-purple-600" />
              Photos & Submit
            </h2>

            {/* Photo upload */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">PHOTOS</label>
              
              {data.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {data.photos.map((photo, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden relative bg-gray-100">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
              >
                <Camera size={28} />
                <span>{data.photos.length > 0 ? 'Add more photos' : 'Tap to add photos'}</span>
              </button>
            </div>

            {/* Summary */}
            <div className="bg-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-700">Report Summary</h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Date</div>
                  <div className="font-medium">{data.date}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Foreman</div>
                  <div className="font-medium">{data.foreman || '—'}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Level/Area</div>
                  <div className="font-medium">{data.level || '—'}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">System</div>
                  <div className="font-medium">{data.unitSystem || '—'}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Crew</div>
                  <div className="font-medium">{data.crewMembers.length} people</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Man-Hours</div>
                  <div className="font-medium">{getTotalHours()}h</div>
                </div>
              </div>

              {data.workSummary && (
                <div className="bg-white rounded-lg p-3 text-sm">
                  <div className="text-gray-500 mb-1">Work Summary</div>
                  <div className="text-gray-700">{data.workSummary}</div>
                </div>
              )}

              {data.problemsEncountered && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="text-amber-700 font-medium mb-1">⚠️ Problems Reported</div>
                  <div className="text-amber-800">{data.problemsEncountered}</div>
                </div>
              )}

              {data.rfiRequired && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <div className="text-purple-700 font-medium mb-1">📋 RFI Required</div>
                  <div className="text-purple-800">{data.rfiDescription || 'Details to follow'}</div>
                </div>
              )}
            </div>
          </div>
        )}

            {/* Continue/Submit Button - inside content flow */}
            <div className="mt-6 pb-4">
              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving || !data.foreman || data.crewMembers.length === 0}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Submit Report
                    </>
                  )}
                </button>
              )}
            </div>
      </div>
    </div>
  );
}

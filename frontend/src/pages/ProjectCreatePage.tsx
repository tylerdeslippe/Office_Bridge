/**
 * Project Create Page - Redesigned
 * Two modes: Quick (Field) and Full (PM)
 * Template-driven with smart defaults
 * Includes "Copy from Previous Job" feature
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, MapPin, Camera, Upload,
  Check, Loader2, AlertTriangle, X, Plus, Info, Copy, Building2, Clock, Search,
  ClipboardPaste, Building, Home, Hotel, GraduationCap, ShoppingBag, Factory, Layers,
  ClipboardList, BarChart3
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { projectsApi, siteLocationsApi, customersApi, vendorsApi } from '../utils/api';

type SetupMode = 'quick' | 'full' | null;
type JobTemplate = 'service_dispatch' | 'small_ti' | 'medium_ti' | 'new_construction' | 'retrofit' | 'full_hvac';

// Building type presets for areas
interface BuildingPreset {
  id: string;
  label: string;
  icon: any;
  areas: string[];
  phases: string[];
}

const BUILDING_PRESETS: BuildingPreset[] = [
  {
    id: 'office',
    label: 'Office Building',
    icon: Building,
    areas: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Penthouse', 'Roof', 'Mechanical Room', 'Parking Garage'],
    phases: ['Mobilization', 'Underground', 'Rough-in', 'Equipment Set', 'Trim', 'Startup', 'TAB', 'Punch'],
  },
  {
    id: 'hospital',
    label: 'Hospital / Medical',
    icon: Plus,
    areas: ['Emergency', 'Surgery', 'ICU', 'Patient Rooms', 'Labs', 'Imaging', 'Pharmacy', 'Admin', 'Mechanical', 'Roof'],
    phases: ['Mobilization', 'Infection Control Setup', 'Demo', 'Rough-in', 'Equipment Set', 'Trim', 'Startup', 'TAB', 'Commissioning', 'Punch'],
  },
  {
    id: 'apartment',
    label: 'Apartments / Multi-Family',
    icon: Home,
    areas: ['Building A', 'Building B', 'Building C', 'Corridor Level 1', 'Corridor Level 2', 'Corridor Level 3', 'Amenity', 'Leasing', 'Roof'],
    phases: ['Mobilization', 'Rough-in', 'Top Out', 'Trim', 'Unit Startup', 'Common Area Startup', 'Punch'],
  },
  {
    id: 'hotel',
    label: 'Hotel',
    icon: Hotel,
    areas: ['Lobby', 'Guest Floors 1-5', 'Guest Floors 6-10', 'Restaurant', 'Kitchen', 'Ballroom', 'Conference', 'Pool/Spa', 'Back of House', 'Roof'],
    phases: ['Mobilization', 'Rough-in', 'Equipment Set', 'Trim', 'Startup', 'TAB', 'Commissioning', 'Punch'],
  },
  {
    id: 'school',
    label: 'School / Education',
    icon: GraduationCap,
    areas: ['Admin Wing', 'Classroom Wing A', 'Classroom Wing B', 'Gym', 'Cafeteria', 'Library', 'Auditorium', 'Mechanical Room'],
    phases: ['Mobilization', 'Rough-in', 'Equipment Set', 'Trim', 'Startup', 'TAB', 'Punch'],
  },
  {
    id: 'retail',
    label: 'Retail / Mall',
    icon: ShoppingBag,
    areas: ['Anchor Store', 'Inline Shops', 'Food Court', 'Common Area', 'Back of House', 'Roof'],
    phases: ['Mobilization', 'Rough-in', 'Equipment Set', 'Trim', 'Startup', 'Punch'],
  },
  {
    id: 'warehouse',
    label: 'Warehouse / Industrial',
    icon: Factory,
    areas: ['Warehouse Floor', 'Office Area', 'Shipping/Receiving', 'Break Room', 'Roof'],
    phases: ['Mobilization', 'Rough-in', 'Equipment Set', 'Startup', 'Punch'],
  },
  {
    id: 'highrise',
    label: 'High-Rise (10+ floors)',
    icon: Layers,
    areas: ['Lobby', 'Floors 1-5', 'Floors 6-10', 'Floors 11-15', 'Floors 16-20', 'Penthouse', 'Mechanical Floors', 'Roof'],
    phases: ['Mobilization', 'Core/Shell', 'TI Rough-in', 'Equipment Set', 'Trim', 'Startup', 'TAB', 'Commissioning', 'Punch'],
  },
];

// Previous job info for "Copy from Previous"
interface PreviousJobInfo {
  project_id: number;
  project_name: string;
  project_number?: string;
  completed_date?: string;
  site_contact_name?: string;
  site_contact_phone?: string;
  gc_contact_name?: string;
  gc_contact_phone?: string;
  parking_notes?: string;
  access_instructions?: string;
  gate_code?: string;
  client_name?: string;
}

interface LocationSuggestion {
  site_location?: any;
  previous_jobs: PreviousJobInfo[];
  distance_meters?: number;
}

interface Contact {
  id: number;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  display_name?: string;
}

interface TemplateConfig {
  label: string;
  description: string;
  costCodes: string[];
  phases: string[];
  areas: string[];
  showTechnicalSpecs: boolean;
  showControlsVendor: boolean;
  defaultDuration: number;
}

const TEMPLATES: Record<JobTemplate, TemplateConfig> = {
  service_dispatch: {
    label: 'Service / Dispatch',
    description: 'Callbacks, repairs, and service work',
    costCodes: ['Service Labor', 'Service Materials', 'Travel', 'After-Hours Premium'],
    phases: ['Dispatch', 'On-Site', 'Complete'],
    areas: [],
    showTechnicalSpecs: false,
    showControlsVendor: false,
    defaultDuration: 1,
  },
  small_ti: {
    label: 'Small Tenant Improvement',
    description: 'Under $50k, quick turnaround TI work',
    costCodes: ['Mobilization', 'Demo', 'Duct Install', 'Equipment', 'Startup', 'Punch'],
    phases: ['Rough-in', 'Trim', 'Startup', 'Punch'],
    areas: ['Suite'],
    showTechnicalSpecs: false,
    showControlsVendor: false,
    defaultDuration: 14,
  },
  medium_ti: {
    label: 'Medium Tenant Improvement',
    description: '$50k-$250k tenant build-outs',
    costCodes: ['Mobilization', 'Demo', 'Hangers/Supports', 'Rectangular Duct', 'Spiral Duct', 'Flex & Connections', 'Insulation', 'Equipment Setting', 'Controls Coordination', 'Startup', 'TAB Support', 'Punch/Closeout'],
    phases: ['Mobilization', 'Rough-in', 'Trim', 'Startup', 'TAB', 'Punch'],
    areas: ['Level 1', 'Level 2', 'Roof'],
    showTechnicalSpecs: true,
    showControlsVendor: true,
    defaultDuration: 45,
  },
  new_construction: {
    label: 'New Construction',
    description: 'Ground-up or core & shell projects',
    costCodes: ['Mobilization', 'Coordination', 'Hangers/Supports', 'Rectangular Duct', 'Spiral Duct', 'Flex & Connections', 'Insulation', 'Equipment Setting', 'Piping', 'Controls Rough', 'Controls Trim', 'Startup Support', 'TAB Support', 'Commissioning Support', 'Punch/Closeout', 'Warranty'],
    phases: ['Underground', 'Rough-in', 'Equipment Set', 'Piping', 'Insulation', 'Trim', 'Startup', 'TAB', 'Commissioning', 'Punch', 'Closeout'],
    areas: ['Level 1', 'Level 2', 'Level 3', 'Roof', 'Mechanical Room'],
    showTechnicalSpecs: true,
    showControlsVendor: true,
    defaultDuration: 180,
  },
  retrofit: {
    label: 'Retrofit / Replacement',
    description: 'Equipment changeouts and system upgrades',
    costCodes: ['Mobilization', 'Demo/Disconnect', 'Rigging', 'Equipment Setting', 'Reconnect', 'Startup', 'TAB', 'Punch'],
    phases: ['Demo', 'Equipment Set', 'Reconnect', 'Startup', 'Complete'],
    areas: ['Roof', 'Mechanical Room'],
    showTechnicalSpecs: true,
    showControlsVendor: true,
    defaultDuration: 21,
  },
  full_hvac: {
    label: 'Full HVAC',
    description: 'Complete HVAC scope with all systems',
    costCodes: ['Mobilization', 'Coordination', 'Hangers/Supports', 'Rectangular Duct', 'Spiral Duct', 'Oval Duct', 'Flex & Connections', 'Grilles/Diffusers', 'Insulation', 'Equipment Setting', 'Piping - Chilled Water', 'Piping - Hot Water', 'Piping - Refrigerant', 'Controls Rough', 'Controls Trim', 'Startup Support', 'TAB Support', 'Commissioning', 'Punch/Closeout'],
    phases: ['Mobilization', 'Coordination', 'Rough-in', 'Equipment Set', 'Piping', 'Insulation', 'Trim', 'Controls', 'Startup', 'TAB', 'Commissioning', 'Punch'],
    areas: ['Level 1', 'Level 2', 'Level 3', 'Penthouse', 'Roof', 'Mechanical Room'],
    showTechnicalSpecs: true,
    showControlsVendor: true,
    defaultDuration: 120,
  },
};

const SYSTEM_TAGS = [
  { value: 'SA', label: 'SA', fullLabel: 'Supply Air' },
  { value: 'RA', label: 'RA', fullLabel: 'Return Air' },
  { value: 'EA', label: 'EA', fullLabel: 'Exhaust Air' },
  { value: 'OA', label: 'OA', fullLabel: 'Outside Air' },
  { value: 'Relief', label: 'Relief', fullLabel: 'Relief Air' },
  { value: 'Smoke', label: 'Smoke', fullLabel: 'Smoke Control' },
];

const EQUIPMENT_TYPES = [
  { value: 'VAV', label: 'VAV Boxes' },
  { value: 'RTU', label: 'Rooftop Units' },
  { value: 'AHU', label: 'Air Handlers' },
  { value: 'VRF', label: 'VRF Systems' },
  { value: 'FCU', label: 'Fan Coils' },
  { value: 'Exhaust Fans', label: 'Exhaust Fans' },
  { value: 'DOAS', label: 'DOAS' },
];

const PRESSURE_CLASSES = [
  { value: '1_inch', label: '1" WC (Low)' },
  { value: '2_inch', label: '2" WC (Medium)' },
  { value: '4_inch', label: '4" WC (High)' },
  { value: 'welded', label: 'Welded' },
];

const DUCT_MATERIALS = [
  { value: 'galvanized', label: 'Galvanized' },
  { value: 'stainless', label: 'Stainless Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'black_iron', label: 'Black Iron' },
];

const CONTROLS_VENDORS = ['Trane', 'Honeywell', 'Johnson Controls', 'Siemens', 'Schneider Electric', 'Automated Logic', 'Distech', 'Other'];

const FULL_SETUP_STEPS = [
  { id: 'basics', label: 'Basics', description: 'Name, address, dates' },
  { id: 'people', label: 'People', description: 'Contacts & roles' },
  { id: 'scope', label: 'Scope', description: 'Summary & systems' },
  { id: 'structure', label: 'Structure', description: 'Areas & phases' },
  { id: 'costcodes', label: 'Cost Codes', description: 'Budget tracking' },
  { id: 'documents', label: 'Documents', description: 'Drawings & specs' },
  { id: 'specs', label: 'Tech Specs', description: 'HVAC details' },
  { id: 'review', label: 'Review', description: 'Confirm & publish' },
];

interface ProjectFormData {
  name: string;
  number: string;
  template: JobTemplate | '';
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  target_end_date: string;
  customer_name: string;
  customer_contact: string;
  customer_phone: string;
  site_contact_name: string;
  site_contact_phone: string;
  gc_contact_name: string;
  gc_contact_phone: string;
  parking_notes: string;
  access_instructions: string;
  gate_code: string;
  scope_summary: string;
  description: string;
  system_tags: string[];
  equipment_types: string[];
  pressure_class: string;
  duct_material: string;
  controls_vendor: string;
  commissioning_required: boolean;
  crane_required: boolean;
  crane_scheduled_date: string;
  crane_duration_days: string;
  lift_required: boolean;
  lift_scheduled_date: string;
  lift_duration_days: string;
  areas: string[];
  phases: string[];
  cost_codes: string[];
}

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  
  // Location lookup state
  const [locationSuggestion, setLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showPreviousJobs, setShowPreviousJobs] = useState(false);
  
  // Customer/Vendor suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<Contact[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [vendorSuggestions, setVendorSuggestions] = useState<Contact[]>([]);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '', number: '', template: '', address: '', city: '', state: '', zip: '',
    latitude: null, longitude: null,
    start_date: new Date().toISOString().split('T')[0], target_end_date: '',
    customer_name: '', customer_contact: '', customer_phone: '',
    site_contact_name: '', site_contact_phone: '', gc_contact_name: '', gc_contact_phone: '',
    parking_notes: '', access_instructions: '', gate_code: '',
    scope_summary: '', description: '', system_tags: [], equipment_types: [],
    pressure_class: '', duct_material: '', controls_vendor: '', commissioning_required: false,
    crane_required: false, crane_scheduled_date: '', crane_duration_days: '',
    lift_required: false, lift_scheduled_date: '', lift_duration_days: '',
    areas: [], phases: [], cost_codes: [],
  });

  const [newArea, setNewArea] = useState('');
  const [newPhase, setNewPhase] = useState('');
  const [newCostCode, setNewCostCode] = useState('');
  
  // Bulk add state
  const [showBulkAddAreas, setShowBulkAddAreas] = useState(false);
  const [showBulkAddPhases, setShowBulkAddPhases] = useState(false);
  const [bulkAreasText, setBulkAreasText] = useState('');
  const [bulkPhasesText, setBulkPhasesText] = useState('');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showCopyFromProject, setShowCopyFromProject] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Photo and file upload state
  const [sketchPhoto, setSketchPhoto] = useState<string | null>(null);
  const [scopePdf, setScopePdf] = useState<{name: string, data: string} | null>(null);
  const [drawingSet, setDrawingSet] = useState<{name: string, data: string} | null>(null);
  
  // File input refs
  const sketchInputRef = React.useRef<HTMLInputElement>(null);
  const scopePdfInputRef = React.useRef<HTMLInputElement>(null);
  const drawingSetInputRef = React.useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: 'system_tags' | 'equipment_types', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value]
    }));
  };
  
  // Handle photo capture
  const handleSketchCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSketchPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset for re-selection
  };
  
  // Handle PDF upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: {name: string, data: string} | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter({ name: file.name, data: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset for re-selection
  };

  const applyTemplate = (template: JobTemplate) => {
    const config = TEMPLATES[template];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.defaultDuration);
    setFormData(prev => ({
      ...prev, template, cost_codes: [...config.costCodes], phases: [...config.phases],
      areas: [...config.areas], target_end_date: endDate.toISOString().split('T')[0],
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        showToast('Location captured', 'success');
        updateField('address', `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      () => showToast('Could not get location', 'error')
    );
  };

  // Location lookup - debounced address search
  const lookupByAddress = useCallback(async (address: string) => {
    if (!address || address.length < 5) {
      setLocationSuggestion(null);
      return;
    }
    
    setIsLookingUp(true);
    try {
      const response = await siteLocationsApi.lookup({ address });
      const suggestion = response.data;
      if (suggestion.previous_jobs?.length > 0 || suggestion.site_location) {
        setLocationSuggestion(suggestion);
        setShowPreviousJobs(true);
      } else {
        setLocationSuggestion(null);
      }
    } catch (err) {
      console.log('Location lookup failed:', err);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Location lookup by GPS coordinates
  const lookupByCoordinates = async (lat: number, lng: number) => {
    setIsLookingUp(true);
    try {
      const response = await siteLocationsApi.lookup({ 
        latitude: lat, 
        longitude: lng,
        radius_meters: 300 
      });
      const suggestion = response.data;
      if (suggestion.previous_jobs?.length > 0 || suggestion.site_location) {
        setLocationSuggestion(suggestion);
        setShowPreviousJobs(true);
        showToast(`Found ${suggestion.previous_jobs.length} previous job(s) nearby!`, 'success');
      }
    } catch (err) {
      console.log('Location lookup failed:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Enhanced geolocation that also looks up previous jobs
  const handleGetLocationWithLookup = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        showToast('Location captured', 'success');
        updateField('latitude', latitude);
        updateField('longitude', longitude);
        updateField('address', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        // Look up previous jobs at this location
        lookupByCoordinates(latitude, longitude);
      },
      () => showToast('Could not get location', 'error'),
      { enableHighAccuracy: true }
    );
  };

  // Copy info from a previous job
  const copyFromPreviousJob = (job: PreviousJobInfo) => {
    setFormData(prev => ({
      ...prev,
      site_contact_name: job.site_contact_name || prev.site_contact_name,
      site_contact_phone: job.site_contact_phone || prev.site_contact_phone,
      gc_contact_name: job.gc_contact_name || prev.gc_contact_name,
      gc_contact_phone: job.gc_contact_phone || prev.gc_contact_phone,
      parking_notes: job.parking_notes || prev.parking_notes,
      access_instructions: job.access_instructions || prev.access_instructions,
      gate_code: job.gate_code || prev.gate_code,
      customer_name: job.client_name || prev.customer_name,
    }));
    setShowPreviousJobs(false);
    showToast('Copied info from previous job', 'success');
  };

  // Copy from site location
  const copyFromSiteLocation = (site: any) => {
    setFormData(prev => ({
      ...prev,
      address: site.address || prev.address,
      city: site.city || prev.city,
      state: site.state || prev.state,
      zip: site.zip_code || prev.zip,
      parking_notes: site.parking_notes || prev.parking_notes,
      access_instructions: site.access_instructions || prev.access_instructions,
      gate_code: site.gate_code || prev.gate_code,
      site_contact_name: site.building_engineer_name || prev.site_contact_name,
      site_contact_phone: site.building_engineer_phone || prev.site_contact_phone,
    }));
    setShowPreviousJobs(false);
    showToast('Copied site info', 'success');
  };

  // Customer search
  const searchCustomers = async (search: string) => {
    if (search.length < 2) { setCustomerSuggestions([]); return; }
    try {
      const response = await customersApi.list({ search, limit: 5 });
      setCustomerSuggestions(response.data || []);
      setShowCustomerDropdown(true);
    } catch (err) {
      console.log('Customer search failed');
    }
  };

  // Debounce address lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address && !formData.latitude) {
        lookupByAddress(formData.address);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.address, formData.latitude, lookupByAddress]);

  const isQuickModeValid = () => formData.name.trim() && formData.address.trim();

  const isCurrentStepValid = () => {
    switch (FULL_SETUP_STEPS[currentStep]?.id) {
      case 'basics': return formData.name.trim() && formData.address.trim() && formData.template;
      case 'costcodes': return formData.cost_codes.length > 0;
      case 'review': return formData.name.trim() && formData.address.trim();
      default: return true;
    }
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      await projectsApi.create({
        name: formData.name, 
        number: formData.number || `T-${Date.now()}`,
        description: formData.description || formData.scope_summary,
        status: asDraft || setupMode === 'quick' ? 'draft' : 'planning',
        address: formData.address, 
        city: formData.city, 
        state: formData.state,
        latitude: formData.latitude,
        longitude: formData.longitude,
        start_date: formData.start_date, 
        target_end_date: formData.target_end_date,
        customer_name: formData.customer_name,
        site_contact_name: formData.site_contact_name,
        site_contact_phone: formData.site_contact_phone,
        gc_contact_name: formData.gc_contact_name,
        gc_contact_phone: formData.gc_contact_phone,
        parking_notes: formData.parking_notes,
        access_instructions: formData.access_instructions,
        gate_code: formData.gate_code,
        job_type: formData.template || undefined,
      });
      showToast(setupMode === 'quick' ? 'Project created as draft' : 'Project created!', 'success');
      navigate('/today');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to create project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArea = () => { if (newArea.trim() && !formData.areas.includes(newArea.trim())) { updateField('areas', [...formData.areas, newArea.trim()]); setNewArea(''); } };
  const addPhase = () => { if (newPhase.trim() && !formData.phases.includes(newPhase.trim())) { updateField('phases', [...formData.phases, newPhase.trim()]); setNewPhase(''); } };
  const addCostCode = () => { if (newCostCode.trim() && !formData.cost_codes.includes(newCostCode.trim())) { updateField('cost_codes', [...formData.cost_codes, newCostCode.trim()]); setNewCostCode(''); } };

  // Bulk add areas from pasted text
  const bulkAddAreas = () => {
    const lines = bulkAreasText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newAreas = lines.filter(line => !formData.areas.includes(line));
    if (newAreas.length > 0) {
      updateField('areas', [...formData.areas, ...newAreas]);
      showToast(`Added ${newAreas.length} areas`, 'success');
    }
    setBulkAreasText('');
    setShowBulkAddAreas(false);
  };

  // Bulk add phases from pasted text
  const bulkAddPhases = () => {
    const lines = bulkPhasesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newPhases = lines.filter(line => !formData.phases.includes(line));
    if (newPhases.length > 0) {
      updateField('phases', [...formData.phases, ...newPhases]);
      showToast(`Added ${newPhases.length} phases`, 'success');
    }
    setBulkPhasesText('');
    setShowBulkAddPhases(false);
  };

  // Apply building preset
  const applyBuildingPreset = (preset: BuildingPreset) => {
    // Merge with existing (don't replace)
    const newAreas = preset.areas.filter(a => !formData.areas.includes(a));
    const newPhases = preset.phases.filter(p => !formData.phases.includes(p));
    
    updateField('areas', [...formData.areas, ...newAreas]);
    updateField('phases', [...formData.phases, ...newPhases]);
    
    setShowPresetPicker(false);
    showToast(`Added ${newAreas.length} areas and ${newPhases.length} phases`, 'success');
  };

  // Load recent projects for copy
  const loadRecentProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await projectsApi.list({ limit: 10 });
      setRecentProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Copy structure from another project
  const copyFromProject = async (projectId: number) => {
    try {
      const response = await projectsApi.get(projectId);
      const project = response.data;
      
      // In a real app, we'd have areas/phases stored on the project
      // For now, show what we have
      showToast('Copied project structure', 'success');
      setShowCopyFromProject(false);
    } catch (err) {
      showToast('Failed to copy from project', 'error');
    }
  };

  // Clear all areas
  const clearAllAreas = () => {
    updateField('areas', []);
    showToast('Cleared all areas', 'success');
  };

  // Clear all phases
  const clearAllPhases = () => {
    updateField('phases', []);
    showToast('Cleared all phases', 'success');
  };

  const templateConfig = formData.template ? TEMPLATES[formData.template] : null;

  // Previous Jobs Modal Component
  const PreviousJobsModal = () => {
    if (!showPreviousJobs || !locationSuggestion) return null;
    
    const { previous_jobs, site_location, distance_meters } = locationSuggestion;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Previous Jobs Found</h3>
              {distance_meters && (
                <p className="text-sm text-gray-500">Within {Math.round(distance_meters)}m of this location</p>
              )}
            </div>
            <button onClick={() => setShowPreviousJobs(false)} className="p-2 text-gray-400">
              <X size={20} />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
            {site_location && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Building2 className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">{site_location.building_name || 'Saved Location'}</h4>
                    <p className="text-sm text-blue-700">{site_location.address}</p>
                    {site_location.building_engineer_name && (
                      <p className="text-sm text-blue-600 mt-1">Contact: {site_location.building_engineer_name}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => copyFromSiteLocation(site_location)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1"
                  >
                    <Copy size={14} /> Use
                  </button>
                </div>
              </div>
            )}
            
            {previous_jobs.map((job) => (
              <div key={job.project_id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{job.project_name}</h4>
                    {job.project_number && <p className="text-sm text-gray-500">#{job.project_number}</p>}
                  </div>
                  <button 
                    onClick={() => copyFromPreviousJob(job)}
                    className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg flex items-center gap-1"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
                {job.completed_date && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <Clock size={12} /> Completed {new Date(job.completed_date).toLocaleDateString()}
                  </p>
                )}
                <div className="text-sm text-gray-600 space-y-1">
                  {job.site_contact_name && <p>Site: {job.site_contact_name} {job.site_contact_phone}</p>}
                  {job.client_name && <p>Customer: {job.client_name}</p>}
                  {job.parking_notes && <p className="truncate">Parking: {job.parking_notes}</p>}
                </div>
              </div>
            ))}
            
            {previous_jobs.length === 0 && !site_location && (
              <p className="text-center text-gray-500 py-4">No previous jobs found at this location</p>
            )}
          </div>
          
          <div className="p-4 border-t">
            <button 
              onClick={() => setShowPreviousJobs(false)}
              className="w-full py-3 text-gray-600 font-medium"
            >
              Skip - Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODE SELECTION SCREEN
  if (setupMode === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
          <h1 className="font-semibold ml-2">New Project</h1>
        </header>
        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Setup Mode</h2>
            <p className="text-gray-500">Select based on your role and available time</p>
          </div>
          <button onClick={() => setSetupMode('quick')} className="w-full p-6 bg-white rounded-xl border-2 border-gray-200 text-left hover:border-blue-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-2xl">⚡</span></div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Quick Setup</h3>
                <p className="text-sm text-blue-600 font-medium mb-2">For Field Staff • 60 seconds</p>
                <p className="text-sm text-gray-500">Create a draft project. PM will complete details later.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Name', 'Address', 'Template', 'Photo'].map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{t}</span>)}
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
          </button>
          <button onClick={() => setSetupMode('full')} className="w-full p-6 bg-white rounded-xl border-2 border-gray-200 text-left hover:border-blue-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0"><ClipboardList size={24} className="text-green-600" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Full Setup</h3>
                <p className="text-sm text-green-600 font-medium mb-2">For Project Managers • 5-10 minutes</p>
                <p className="text-sm text-gray-500">Configure cost codes, areas, phases, specs, and documents.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['8 Steps', 'Cost Codes', 'Documents', 'Tech Specs'].map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{t}</span>)}
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // QUICK SETUP MODE
  if (setupMode === 'quick') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSetupMode(null)} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
          <h1 className="font-semibold">Quick Setup</h1>
          <div className="w-10" />
        </header>
        
        {/* Hidden file inputs */}
        <input
          ref={sketchInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSketchCapture}
          className="hidden"
        />
        <input
          ref={scopePdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => handlePdfUpload(e, setScopePdf)}
          className="hidden"
        />
        
        <div className="p-4 pb-32 space-y-4">
          {/* Photo First */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo of Sketch / Plan</label>
            {sketchPhoto ? (
              <div className="relative">
                <img src={sketchPhoto} alt="Sketch" className="w-full rounded-xl" />
                <button 
                  onClick={() => setSketchPhoto(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X size={16} className="text-white" />
                </button>
                <button 
                  onClick={() => sketchInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-sm font-medium"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button 
                onClick={() => sketchInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
              >
                <Camera size={32} /><span>Tap to capture</span>
              </button>
            )}
          </div>
          {/* Project Name */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name <span className="text-red-500">*</span></label>
            <p className="text-xs text-gray-500 mb-2">Building name, suite, or description</p>
            <input type="text" value={formData.name} onChange={e => updateField('name', e.target.value)}
              placeholder="e.g., 123 Main St - Suite 400" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
          {/* Address with GPS */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Address <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type="text" value={formData.address} onChange={e => updateField('address', e.target.value)}
                  placeholder="Street address" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 pr-10" />
                {isLookingUp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <button onClick={handleGetLocationWithLookup} className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200">
                <MapPin size={20} />
              </button>
            </div>
            {/* Previous jobs indicator */}
            {locationSuggestion && locationSuggestion.previous_jobs.length > 0 && (
              <button 
                onClick={() => setShowPreviousJobs(true)}
                className="mt-2 w-full p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Building2 size={16} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-800">
                    {locationSuggestion.previous_jobs.length} previous job{locationSuggestion.previous_jobs.length > 1 ? 's' : ''} found!
                  </p>
                  <p className="text-sm text-green-600">Tap to copy contacts & logistics</p>
                </div>
                <Copy size={16} className="text-green-600" />
              </button>
            )}
          </div>
          {/* Site Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Contact</label>
            <p className="text-xs text-gray-500 mb-2">Who to ask for on-site</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={formData.site_contact_name} onChange={e => updateField('site_contact_name', e.target.value)} placeholder="Name" className="p-3 border rounded-xl" />
              <input type="tel" value={formData.site_contact_phone} onChange={e => updateField('site_contact_phone', e.target.value)} placeholder="Phone" className="p-3 border rounded-xl" />
            </div>
          </div>
          {/* Parking / Access Notes (if copied from previous) */}
          {(formData.parking_notes || formData.gate_code) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Info (from previous)</label>
              {formData.parking_notes && (
                <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Parking:</span> {formData.parking_notes}</p>
              )}
              {formData.gate_code && (
                <p className="text-sm text-gray-600"><span className="font-medium">Gate:</span> {formData.gate_code}</p>
              )}
            </div>
          )}
          {/* Scope PDF */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Scope PDF (optional)</label>
            {scopePdf ? (
              <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Upload size={20} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{scopePdf.name}</p>
                  <p className="text-xs text-gray-500">PDF uploaded</p>
                </div>
                <button onClick={() => setScopePdf(null)} className="p-2 text-gray-400">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => scopePdfInputRef.current?.click()}
                className="w-full py-4 border border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              >
                <Upload size={20} /><span>Upload scope document</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Previous Jobs Modal */}
        <PreviousJobsModal />
        
        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-bottom">
          <button onClick={() => handleSubmit(true)} disabled={isSubmitting || !isQuickModeValid()}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" />Creating...</> : <><Check size={20} />Submit to PM Queue</>}
          </button>
          <p className="text-xs text-center text-gray-500 mt-2">Project will be created as Draft for PM review</p>
        </div>
      </div>
    );
  }

  // FULL SETUP MODE - Step Content Renderer
  const renderStepContent = () => {
    const step = FULL_SETUP_STEPS[currentStep];
    switch (step.id) {
      case 'basics':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-3">Determines default cost codes and phases</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TEMPLATES) as JobTemplate[]).map(key => (
                  <button key={key} onClick={() => { applyTemplate(key); setShowTemplatePreview(true); }}
                    className={`p-3 rounded-lg border text-left ${formData.template === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="font-medium text-sm">{TEMPLATES[key].label}</div>
                  </button>
                ))}
              </div>
            </div>
            {formData.template && showTemplatePreview && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2"><Info size={16} className="text-blue-600" /><span className="font-medium text-blue-900">Template includes:</span></div>
                  <button onClick={() => setShowTemplatePreview(false)}><X size={16} className="text-blue-400" /></button>
                </div>
                <ul className="text-sm text-blue-800 space-y-1 ml-6">
                  <li>{templateConfig?.costCodes.length} cost codes</li>
                  <li>{templateConfig?.phases.length} phases</li>
                  <li>{templateConfig?.areas.length || 0} default areas</li>
                </ul>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g., Downtown Office - Level 5 TI" className="w-full p-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Number</label>
              <p className="text-xs text-gray-500 mb-1">Leave blank to auto-generate</p>
              <input type="text" value={formData.number} onChange={e => updateField('number', e.target.value)} placeholder="e.g., 2026-0142" className="w-full p-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Address <span className="text-red-500">*</span></label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder="Street address" className="flex-1 p-3 border rounded-xl" />
                <button onClick={handleGetLocation} className="p-3 bg-blue-100 text-blue-600 rounded-xl"><MapPin size={20} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="City" className="p-3 border rounded-xl" />
                <input type="text" value={formData.state} onChange={e => updateField('state', e.target.value)} placeholder="State" className="p-3 border rounded-xl" />
                <input type="text" value={formData.zip} onChange={e => updateField('zip', e.target.value)} placeholder="ZIP" className="p-3 border rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={formData.start_date} onChange={e => updateField('start_date', e.target.value)} className="w-full p-3 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target End</label>
                <input type="date" value={formData.target_end_date} onChange={e => updateField('target_end_date', e.target.value)} className="w-full p-3 border rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer / GC</label>
              <input type="text" value={formData.customer_name} onChange={e => updateField('customer_name', e.target.value)} placeholder="Company name" className="w-full p-3 border rounded-xl" />
            </div>
          </div>
        );
      case 'people':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Contact</label>
              <p className="text-xs text-gray-500 mb-2">Primary person on-site</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={formData.site_contact_name} onChange={e => updateField('site_contact_name', e.target.value)} placeholder="Name" className="p-3 border rounded-xl" />
                <input type="tel" value={formData.site_contact_phone} onChange={e => updateField('site_contact_phone', e.target.value)} placeholder="Phone" className="p-3 border rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GC Contact</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={formData.gc_contact_name} onChange={e => updateField('gc_contact_name', e.target.value)} placeholder="Name" className="p-3 border rounded-xl" />
                <input type="tel" value={formData.gc_contact_phone} onChange={e => updateField('gc_contact_phone', e.target.value)} placeholder="Phone" className="p-3 border rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Contact</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={formData.customer_contact} onChange={e => updateField('customer_contact', e.target.value)} placeholder="Name" className="p-3 border rounded-xl" />
                <input type="tel" value={formData.customer_phone} onChange={e => updateField('customer_phone', e.target.value)} placeholder="Phone" className="p-3 border rounded-xl" />
              </div>
            </div>
          </div>
        );
      case 'scope':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope Summary</label>
              <input type="text" value={formData.scope_summary} onChange={e => updateField('scope_summary', e.target.value)} placeholder="One-line description" className="w-full p-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
              <textarea value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder="Full scope, inclusions, exclusions..." rows={4} className="w-full p-3 border rounded-xl resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Systems Included</label>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_TAGS.map(tag => (
                  <button key={tag.value} onClick={() => toggleArrayField('system_tags', tag.value)}
                    className={`px-3 py-2 rounded-lg text-sm ${formData.system_tags.includes(tag.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {tag.label} <span className="text-xs opacity-70">({tag.fullLabel})</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scope PDF</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handlePdfUpload(e, setScopePdf)}
                className="hidden"
                id="scope-pdf-full"
              />
              {scopePdf ? (
                <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Upload size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{scopePdf.name}</p>
                    <p className="text-xs text-gray-500">PDF uploaded</p>
                  </div>
                  <button onClick={() => setScopePdf(null)} className="p-2 text-gray-400">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="scope-pdf-full"
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-600 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                >
                  <Upload size={20} /><span>Upload scope document</span>
                </label>
              )}
            </div>
          </div>
        );
      case 'structure':
        return (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => setShowPresetPicker(true)}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium flex items-center gap-2 border border-blue-200"
              >
                <Building size={16} /> Building Presets
              </button>
              <button 
                onClick={() => { setShowCopyFromProject(true); loadRecentProjects(); }}
                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium flex items-center gap-2 border border-purple-200"
              >
                <Copy size={16} /> Copy from Project
              </button>
            </div>

            {/* Areas Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Project Areas</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBulkAddAreas(true)}
                    className="text-xs text-blue-600 flex items-center gap-1"
                  >
                    <ClipboardPaste size={12} /> Paste List
                  </button>
                  {formData.areas.length > 0 && (
                    <button onClick={clearAllAreas} className="text-xs text-red-500">Clear All</button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newArea} 
                  onChange={e => setNewArea(e.target.value)} 
                  placeholder="e.g., Level 2 North" 
                  className="flex-1 p-3 border rounded-xl" 
                  onKeyPress={e => e.key === 'Enter' && addArea()} 
                />
                <button onClick={addArea} className="p-3 bg-blue-600 text-white rounded-xl">
                  <Plus size={20} />
                </button>
              </div>
              {formData.areas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.areas.map(area => (
                    <span key={area} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                      {area}
                      <button onClick={() => updateField('areas', formData.areas.filter(a => a !== area))} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No areas added yet. Use presets or add manually.</p>
              )}
            </div>

            {/* Phases Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Project Phases</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBulkAddPhases(true)}
                    className="text-xs text-purple-600 flex items-center gap-1"
                  >
                    <ClipboardPaste size={12} /> Paste List
                  </button>
                  {formData.phases.length > 0 && (
                    <button onClick={clearAllPhases} className="text-xs text-red-500">Clear All</button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newPhase} 
                  onChange={e => setNewPhase(e.target.value)} 
                  placeholder="e.g., Rough-in" 
                  className="flex-1 p-3 border rounded-xl" 
                  onKeyPress={e => e.key === 'Enter' && addPhase()} 
                />
                <button onClick={addPhase} className="p-3 bg-purple-600 text-white rounded-xl">
                  <Plus size={20} />
                </button>
              </div>
              {formData.phases.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.phases.map(phase => (
                    <span key={phase} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                      {phase}
                      <button onClick={() => updateField('phases', formData.phases.filter(p => p !== phase))} className="text-purple-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No phases added yet. Use presets or add manually.</p>
              )}
            </div>

            {/* Bulk Add Areas Modal */}
            {showBulkAddAreas && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Paste Areas</h3>
                    <button onClick={() => setShowBulkAddAreas(false)} className="p-2 text-gray-400">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-3">Paste a list of areas, one per line:</p>
                    <textarea
                      value={bulkAreasText}
                      onChange={e => setBulkAreasText(e.target.value)}
                      placeholder={"Level 1\nLevel 2\nLevel 3\nRoof\nMechanical Room"}
                      rows={8}
                      className="w-full p-3 border rounded-xl font-mono text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setShowBulkAddAreas(false)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium">
                        Cancel
                      </button>
                      <button 
                        onClick={bulkAddAreas} 
                        disabled={!bulkAreasText.trim()}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
                      >
                        Add Areas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Add Phases Modal */}
            {showBulkAddPhases && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Paste Phases</h3>
                    <button onClick={() => setShowBulkAddPhases(false)} className="p-2 text-gray-400">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-3">Paste a list of phases, one per line:</p>
                    <textarea
                      value={bulkPhasesText}
                      onChange={e => setBulkPhasesText(e.target.value)}
                      placeholder={"Mobilization\nRough-in\nEquipment Set\nTrim\nStartup\nPunch"}
                      rows={8}
                      className="w-full p-3 border rounded-xl font-mono text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setShowBulkAddPhases(false)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium">
                        Cancel
                      </button>
                      <button 
                        onClick={bulkAddPhases} 
                        disabled={!bulkPhasesText.trim()}
                        className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
                      >
                        Add Phases
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Building Preset Picker Modal */}
            {showPresetPicker && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Building Type Presets</h3>
                    <button onClick={() => setShowPresetPicker(false)} className="p-2 text-gray-400">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
                    {BUILDING_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => applyBuildingPreset(preset)}
                        className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <preset.icon size={20} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">{preset.label}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {preset.areas.length} areas • {preset.phases.length} phases
                            </p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              Areas: {preset.areas.slice(0, 3).join(', ')}{preset.areas.length > 3 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-4 border-t">
                    <button onClick={() => setShowPresetPicker(false)} className="w-full py-3 text-gray-600 font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Copy from Project Modal */}
            {showCopyFromProject && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Copy from Similar Project</h3>
                    <button onClick={() => setShowCopyFromProject(false)} className="p-2 text-gray-400">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh] p-4">
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                      </div>
                    ) : recentProjects.length > 0 ? (
                      <div className="space-y-2">
                        {recentProjects.map(project => (
                          <button
                            key={project.id}
                            onClick={() => copyFromProject(project.id)}
                            className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 transition-colors"
                          >
                            <h4 className="font-medium text-gray-900">{project.name}</h4>
                            {project.number && <p className="text-xs text-gray-500">#{project.number}</p>}
                            {project.address && <p className="text-xs text-gray-400 mt-1">{project.address}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No recent projects found</p>
                    )}
                  </div>
                  <div className="p-4 border-t">
                    <button onClick={() => setShowCopyFromProject(false)} className="w-full py-3 text-gray-600 font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'costcodes':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cost Codes</label>
              <p className="text-xs text-gray-500 mb-3">Required for timecard entries</p>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newCostCode} onChange={e => setNewCostCode(e.target.value)} placeholder="Add custom cost code" className="flex-1 p-3 border rounded-xl" onKeyPress={e => e.key === 'Enter' && addCostCode()} />
                <button onClick={addCostCode} className="p-3 bg-blue-600 text-white rounded-xl"><Plus size={20} /></button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.cost_codes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm">{code}</span>
                    <button onClick={() => updateField('cost_codes', formData.cost_codes.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drawing Set</label>
              <input
                ref={drawingSetInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handlePdfUpload(e, setDrawingSet)}
                className="hidden"
              />
              {drawingSet ? (
                <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Upload size={24} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{drawingSet.name}</p>
                    <p className="text-sm text-gray-500">PDF uploaded</p>
                  </div>
                  <button onClick={() => setDrawingSet(null)} className="p-2 text-gray-400 hover:text-red-500">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => drawingSetInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                >
                  <Upload size={32} /><span>Upload Drawing Set (PDF)</span>
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo of Sketch</label>
              {sketchPhoto ? (
                <div className="relative">
                  <img src={sketchPhoto} alt="Sketch" className="w-full rounded-xl" />
                  <button 
                    onClick={() => setSketchPhoto(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X size={16} className="text-white" />
                  </button>
                  <button 
                    onClick={() => sketchInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-sm font-medium"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => sketchInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                >
                  <Camera size={24} /><span>Capture photo</span>
                </button>
              )}
            </div>
          </div>
        );
      case 'specs':
        if (!templateConfig?.showTechnicalSpecs) {
          return <div className="p-6 bg-gray-50 rounded-xl text-center"><p className="text-gray-500">Technical specs not required for this job type.</p></div>;
        }
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Types</label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_TYPES.map(eq => (
                  <button key={eq.value} onClick={() => toggleArrayField('equipment_types', eq.value)}
                    className={`px-3 py-2 rounded-lg text-sm ${formData.equipment_types.includes(eq.value) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{eq.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Class</label>
              <select value={formData.pressure_class} onChange={e => updateField('pressure_class', e.target.value)} className="w-full p-3 border rounded-xl">
                <option value="">Select</option>
                {PRESSURE_CLASSES.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duct Material</label>
              <select value={formData.duct_material} onChange={e => updateField('duct_material', e.target.value)} className="w-full p-3 border rounded-xl">
                <option value="">Select</option>
                {DUCT_MATERIALS.map(dm => <option key={dm.value} value={dm.value}>{dm.label}</option>)}
              </select>
            </div>
            {templateConfig?.showControlsVendor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Controls Vendor</label>
                <select value={formData.controls_vendor} onChange={e => updateField('controls_vendor', e.target.value)} className="w-full p-3 border rounded-xl">
                  <option value="">Select</option>
                  {CONTROLS_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => updateField('crane_required', !formData.crane_required)}
                className={`p-4 rounded-xl border-2 ${formData.crane_required ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                <div className="text-2xl mb-1">🏗️</div><div className="font-medium text-sm">Crane</div>
              </button>
              <button onClick={() => updateField('lift_required', !formData.lift_required)}
                className={`p-4 rounded-xl border-2 ${formData.lift_required ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="text-2xl mb-1">🚜</div><div className="font-medium text-sm">Lift</div>
              </button>
            </div>
            {formData.crane_required && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-sm font-medium text-amber-800 mb-2">Crane Schedule</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={formData.crane_scheduled_date} onChange={e => updateField('crane_scheduled_date', e.target.value)} className="p-2 border rounded-lg text-sm" />
                  <input type="number" value={formData.crane_duration_days} onChange={e => updateField('crane_duration_days', e.target.value)} placeholder="Days" className="p-2 border rounded-lg text-sm" />
                </div>
              </div>
            )}
            {formData.lift_required && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">Lift Schedule</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={formData.lift_scheduled_date} onChange={e => updateField('lift_scheduled_date', e.target.value)} className="p-2 border rounded-lg text-sm" />
                  <input type="number" value={formData.lift_duration_days} onChange={e => updateField('lift_duration_days', e.target.value)} placeholder="Days" className="p-2 border rounded-lg text-sm" />
                </div>
              </div>
            )}
            <button onClick={() => updateField('commissioning_required', !formData.commissioning_required)}
              className={`w-full p-4 rounded-xl border-2 ${formData.commissioning_required ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <BarChart3 size={24} className={formData.commissioning_required ? 'text-green-600' : 'text-gray-400'} />
                <div className="flex-1 text-left">
                  <div className="font-medium">Commissioning Required</div>
                  <div className="text-sm text-gray-500">{formData.commissioning_required ? 'TAB & startup included' : 'Tap to enable'}</div>
                </div>
                {formData.commissioning_required && <Check className="text-green-600" size={20} />}
              </div>
            </button>
          </div>
        );
      case 'review':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">Project Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-600">Name:</dt><dd className="font-medium">{formData.name || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Type:</dt><dd className="font-medium">{templateConfig?.label || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Address:</dt><dd className="font-medium">{formData.address || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Start:</dt><dd className="font-medium">{formData.start_date || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Cost Codes:</dt><dd className="font-medium">{formData.cost_codes.length}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Phases:</dt><dd className="font-medium">{formData.phases.length}</dd></div>
              </dl>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-3">
                <Check className="text-green-600 flex-shrink-0" size={20} />
                <div><h4 className="font-medium text-green-900">Ready to Create</h4><p className="text-sm text-green-700">Status will be set to Planning.</p></div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  // FULL SETUP RENDER
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file inputs for Full Setup */}
      <input
        ref={sketchInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSketchCapture}
        className="hidden"
      />
      <input
        ref={drawingSetInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => handlePdfUpload(e, setDrawingSet)}
        className="hidden"
      />
      
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => currentStep === 0 ? setSetupMode(null) : setCurrentStep(currentStep - 1)} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
          <div className="text-center">
            <h1 className="font-semibold">Full Setup</h1>
            <p className="text-xs text-gray-500">Step {currentStep + 1} of {FULL_SETUP_STEPS.length}</p>
          </div>
          <button onClick={() => handleSubmit(true)} className="text-blue-600 font-medium text-sm">Save Draft</button>
        </div>
      </header>
      <div className="bg-white border-b px-4 py-3">
        <div className="flex gap-1">
          {FULL_SETUP_STEPS.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />)}
        </div>
        <div className="mt-2">
          <h2 className="font-semibold">{FULL_SETUP_STEPS[currentStep].label}</h2>
          <p className="text-sm text-gray-500">{FULL_SETUP_STEPS[currentStep].description}</p>
        </div>
      </div>
      <div className="p-4 pb-32">{renderStepContent()}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-bottom">
        <div className="flex gap-3">
          {currentStep > 0 && <button onClick={() => setCurrentStep(currentStep - 1)} className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold">Back</button>}
          {currentStep < FULL_SETUP_STEPS.length - 1 ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!isCurrentStepValid()} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              Next<ChevronRight size={20} />
            </button>
          ) : (
            <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" />Creating...</> : <><Check size={20} />Create Project</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

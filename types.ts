
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED'
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string; // Denormalized for easier display
  text: string;
  createdAt: Date;
}

export interface TimeLog {
  id: string;
  userId: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  comment?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'LINK' | 'FILE' | 'IMAGE';
  url: string;
  addedBy: string;
  date: Date;
}

export interface Task {
  id: string;
  name: string;
  duration: number; // in days (Estimated)
  predecessors: string[]; // IDs of tasks that must finish before this one starts
  
  // Manual override
  forcedStartDate?: Date;

  // Calculated fields
  startDate?: Date;
  endDate?: Date;
  isCritical?: boolean;
  slack?: number; // float
  
  // Display
  progress: number; // 0-100
  assignedTo?: string; // User ID
  status: TaskStatus;
  
  // Details
  description?: string; // HTML content
  checklist?: ChecklistItem[];
  comments?: TaskComment[]; 
  
  // New Features
  timeLogs?: TimeLog[];
  timerStartTime?: Date; // If set, a timer is currently running for this task
  attachments?: Attachment[];
  
  // Manufacturing specific
  quantity?: number;
  material?: string;
}

export interface Project {
  id: string;
  name: string;
  startDate: Date;
  managerId?: string; // ID of the Project Manager (Chef de Projet)
  tasks: Task[];
}

// --- PERMISSIONS SYSTEM ---

export type GlobalPermission = 
  | 'VIEW_ALL_PROJECTS'   // Voir tout les projets
  | 'CREATE_PROJECT'      // Créer un projet
  | 'DELETE_PROJECT'      // Supprimer un projet
  | 'MANAGE_SETTINGS'     // Modifier les paramètres
  | 'MANAGE_USERS'        // Rajouter collaborateurs
  | 'MANAGE_ANNOUNCEMENTS'; // Poster des annonces

export type ProjectPermission = 
  | 'VIEW_PROJECT'            // Permission de base pour accéder au projet
  | 'ACCESS_BE'               // Bureau d'études
  | 'ACCESS_METHODS'          // Méthodes
  | 'ACCESS_WORKSHOP'         // Atelier
  | 'ACCESS_QUOTES'           // Devis
  | 'ACCESS_GLOBAL_FOLLOWUP'; // Suivi Global

export interface Role {
  id: string;
  name: string;
  isImmutable?: boolean; // If true, cannot be edited/deleted (e.g. Dev/Admin)
  globalPermissions: GlobalPermission[];
  color: string; // For UI badges
}

export interface User {
  id: string;
  name: string;
  email: string; // Added email to interface
  roleId: string; // Link to Role
  avatar?: string;
  
  // Granular Project Access
  // Key: Project ID, Value: List of permissions for that project
  projectAccess: {
      [projectId: string]: ProjectPermission[];
  };
}

export interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'MAINTENANCE' | 'NEWS';
    date: Date;
    authorName: string;
}

export interface GlobalAppConfig {
    appName: string;
    appSubtitle: string;
    appVersion: string;
    logoUrl?: string; // Base64 string of the uploaded logo
}

export interface GanttConfig {
  dayWidth: number;
  headerHeight: number;
  rowHeight: number;
}

export interface FilterState {
  status: TaskStatus | 'ALL';
  userId: string | 'ALL';
}

export interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'info';
  message: string;
  projectId: string;
  taskId?: string;
  date: Date;
}

// --- INVENTORY TYPES (NEW) ---

export interface InventoryItem {
    id: string;
    reference: string;
    name: string;
    category: 'TOLE' | 'PROFILE' | 'QUINCAILLERIE' | 'CONSOMMABLE';
    quantity: number;
    minQuantity: number; // Threshold for alert
    unit: string; // kg, m2, un, m
    unitPrice: number;
    location?: string; // e.g. "Rack A2"
}

// --- QUOTE SYSTEM TYPES ---

export interface CompanyConfig {
  name: string;
  addressLine1: string;
  addressLine2: string;
  email: string;
  phone: string;
  footerText: string; // SIRET, TVA, etc.
  logoText?: string; // Simple text logo for now
}

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  address: string;
}

export interface Material {
  id: string;
  type: 'ACIER' | 'INOX' | 'ALU' | 'AUTRE';
  name: string; // e.g., "S235 2mm"
  unit: 'kg' | 'm2' | 'unite' | 'm';
  unitPrice: number;
}

export interface AssemblyMethod {
    id: string;
    name: string; // "Soudure TIG", "Boulonnage", "Rivetage"
}

export enum MachineType {
  LASER = 'LASER',
  PLIAGE = 'PLIAGE',
  POINCONNAGE = 'POINCONNAGE',
  SOUDURE = 'SOUDURE',
  ETUDE = 'ETUDE'
}

// New Dynamic Phase Interface
export interface ManufacturingPhase {
    id: string; // e.g. "TRACAGE", "LASER"
    name: string; // "Traçage", "Découpe Laser"
    code: string; // "TRA", "LA"
    defaultRate: number; // €/h
}

export interface HourlyRate {
  machineType: MachineType;
  rate: number; // €/h
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  ARCHIVED = 'ARCHIVED'
}

export interface QuoteItem {
  id: string;
  description: string;
  
  // Costs
  materialId?: string;
  materialQty: number;
  materialCost: number; // Snapshot of cost
  
  laborTime: number; // Hours
  machineType: MachineType | string; // Updated to allow dynamic strings
  laborRate: number; // Snapshot of rate
  
  total: number;
}

export interface Quote {
  id: string; // D-YYYY-MM-XXX
  clientId: string;
  projectId?: string; // Optional link to a project
  date: Date;
  status: QuoteStatus;
  object: string; // Project title
  items: QuoteItem[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

export interface AuditLogEntry {
  id: string;
  quoteId: string;
  action: 'CREATED' | 'UPDATED' | 'VALIDATED' | 'DELETED' | 'EXPORTED';
  details: string;
  timestamp: Date;
  user: string;
}

// --- PRODUCTION / METHODES TYPES ---

export type PartType = 'MANUFACTURED' | 'PURCHASED';

export interface ProductionOperation {
    id: string;
    partId: string;
    order: number;
    machineType: MachineType | string; // Updated to allow dynamic strings
    description: string;
    estimatedTime: number; // Minutes
    status: TaskStatus;
    
    // New Fields for Workshop Management
    deadline?: Date;
    comments?: TaskComment[];
    attachments?: Attachment[];
    timeLogs?: TimeLog[]; // To track who did it and how long it took
    
    // Planning Fields
    startDate?: Date;
    endDate?: Date;
}

export interface ProductionPart {
    id: string;
    parentId?: string | null; // For tree structure
    name: string;
    quantity: number;
    material: string;
    type: PartType;
    assemblyMethodId?: string; // ID from AssemblyMethod
    projectId?: string; // Link to global project
    status: TaskStatus; // Aggregate status
    attachments?: Attachment[]; // New: Docs linked directly to the part
    description?: string; // New: Full HTML description / Cutting instructions
    comments?: TaskComment[]; // New: Comments
}

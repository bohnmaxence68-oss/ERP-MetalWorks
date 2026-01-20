
import { Project, User, Role, TaskStatus, InventoryItem, ProductionPart, Announcement, GlobalAppConfig } from '../types';

const KEYS = {
    PROJECTS: 'erp_projects_v1',
    USERS: 'erp_users_v1',
    ROLES: 'erp_roles_v1',
    INVENTORY: 'erp_inventory_v1',
    PROD_PARTS: 'erp_prod_parts',
    ANNOUNCEMENTS: 'erp_announcements_v1',
    APP_CONFIG: 'erp_app_config_v1'
};

// --- INITIAL DATA FALLBACKS (Used only if storage is empty) ---

const INITIAL_ROLES: Role[] = [
    {
        id: 'dev_role',
        name: 'Super Admin / Direction',
        isImmutable: true,
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        globalPermissions: ['VIEW_ALL_PROJECTS', 'CREATE_PROJECT', 'DELETE_PROJECT', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ANNOUNCEMENTS']
    },
    {
        id: 'chef_atelier',
        name: 'Chef d\'Atelier',
        isImmutable: false,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        // Peut voir tous les projets, en créer, mais pas supprimer ni gérer les users/settings
        globalPermissions: ['VIEW_ALL_PROJECTS', 'CREATE_PROJECT']
    },
    {
        id: 'ouvrier',
        name: 'Ouvrier / Compagnon',
        isImmutable: false,
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        // Accès global limité, droits définis par projet ou "voir tout" pour faciliter l'accès
        globalPermissions: ['VIEW_ALL_PROJECTS'] 
    }
];

const INITIAL_USERS: User[] = [
  { 
      id: '1', 
      name: 'Admin User', 
      email: 'admin@metalworks.com',
      roleId: 'dev_role', 
      avatar: 'AD',
      projectAccess: {} // Super admin has implicit access
  },
  { 
      id: '2', 
      name: 'Marie Chef', 
      email: 'marie@metalworks.com',
      roleId: 'chef_atelier', 
      avatar: 'MC',
      projectAccess: {} // Chef d'atelier sees all via VIEW_ALL_PROJECTS
  },
  { 
      id: '3', 
      name: 'Pierre Ouvrier', 
      email: 'pierre@metalworks.com',
      roleId: 'ouvrier', 
      avatar: 'PM',
      projectAccess: {
          'p1': ['VIEW_PROJECT', 'ACCESS_WORKSHOP'] // Permission spécifique : Atelier uniquement
      } 
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Fabrication Cuve Inox 316L',
    startDate: new Date(),
    managerId: '2',
    tasks: [
      { id: '1', name: 'Étude & Plans', duration: 3, predecessors: [], status: TaskStatus.DONE, progress: 100, assignedTo: '2' },
      { id: '2', name: 'Commande Matière', duration: 5, predecessors: ['1'], status: TaskStatus.IN_PROGRESS, progress: 60, assignedTo: '2', comments: [] },
      { id: '3', name: 'Réception Matière', duration: 1, predecessors: ['2'], status: TaskStatus.TODO, progress: 0, assignedTo: '3' },
      { id: '4', name: 'Découpe Laser', duration: 2, predecessors: ['3'], status: TaskStatus.TODO, progress: 0, assignedTo: '3' },
      { id: '5', name: 'Roulage Viroles', duration: 2, predecessors: ['4'], status: TaskStatus.TODO, progress: 0, assignedTo: '3' },
      { id: '6', name: 'Soudage Longi', duration: 3, predecessors: ['5'], status: TaskStatus.TODO, progress: 0, assignedTo: '1' },
      { id: '7', name: 'Assemblage Fonds', duration: 2, predecessors: ['6'], status: TaskStatus.TODO, progress: 0, assignedTo: '1' },
      { id: '8', name: 'Contrôle Radio', duration: 1, predecessors: ['7'], status: TaskStatus.TODO, progress: 0 },
      { id: '9', name: 'Finitions & Passivation', duration: 2, predecessors: ['8'], status: TaskStatus.TODO, progress: 0 },
    ]
  },
  {
    id: 'p2',
    name: 'Maintenance Tuyauterie Vapeur',
    startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    managerId: '1', 
    tasks: [
        { id: '101', name: 'Inspection Site', duration: 1, predecessors: [], status: TaskStatus.TODO, progress: 0, assignedTo: '1' },
        { id: '102', name: 'Démontage', duration: 2, predecessors: ['101'], status: TaskStatus.TODO, progress: 0, assignedTo: '3' },
        { id: '103', name: 'Remplacement', duration: 3, predecessors: ['102'], status: TaskStatus.TODO, progress: 0 },
    ]
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
    { id: 'inv-1', reference: 'TOL-INOX-304-20', name: 'Tôle Inox 304L - 2mm', category: 'TOLE', quantity: 25, minQuantity: 10, unit: 'm²', unitPrice: 65, location: 'RACK A1' },
    { id: 'inv-2', reference: 'TOL-ACIER-235-50', name: 'Tôle Acier S235 - 5mm', category: 'TOLE', quantity: 4, minQuantity: 5, unit: 'm²', unitPrice: 35, location: 'RACK B3' },
    { id: 'inv-3', reference: 'PROF-UPN-100', name: 'UPN 100 Acier', category: 'PROFILE', quantity: 36, minQuantity: 12, unit: 'm', unitPrice: 18, location: 'PARC EXT' },
    { id: 'inv-4', reference: 'VIS-M12-50', name: 'Vis TH M12x50 Inox A4', category: 'QUINCAILLERIE', quantity: 450, minQuantity: 100, unit: 'un', unitPrice: 0.85, location: 'MAGASIN E4' },
    { id: 'inv-5', reference: 'GAZ-ARGON', name: 'Bouteille Argon (Soudure)', category: 'CONSOMMABLE', quantity: 2, minQuantity: 3, unit: 'un', unitPrice: 120, location: 'ATELIER SOUDURE' },
];

const DEFAULT_APP_CONFIG: GlobalAppConfig = {
    appName: 'MetalWorks',
    appSubtitle: 'ERP Chaudronnerie',
    appVersion: '2.5.0',
    logoUrl: undefined
};

export const PersistenceService = {
    // --- LOADERS ---
    
    loadRoles: (): Role[] => {
        const saved = localStorage.getItem(KEYS.ROLES);
        if (saved) return JSON.parse(saved);
        return INITIAL_ROLES;
    },

    loadUsers: (): User[] => {
        const saved = localStorage.getItem(KEYS.USERS);
        if (saved) return JSON.parse(saved);
        return INITIAL_USERS;
    },

    loadProjects: (): Project[] => {
        const saved = localStorage.getItem(KEYS.PROJECTS);
        if (saved) {
            // Need to revive Date objects
            const projects = JSON.parse(saved);
            return projects.map((p: any) => ({
                ...p,
                startDate: new Date(p.startDate),
                tasks: p.tasks.map((t: any) => ({
                    ...t,
                    forcedStartDate: t.forcedStartDate ? new Date(t.forcedStartDate) : undefined,
                    startDate: t.startDate ? new Date(t.startDate) : undefined,
                    endDate: t.endDate ? new Date(t.endDate) : undefined,
                    comments: t.comments ? t.comments.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) : [],
                    timerStartTime: t.timerStartTime ? new Date(t.timerStartTime) : undefined,
                    timeLogs: t.timeLogs ? t.timeLogs.map((l: any) => ({ ...l, startDate: new Date(l.startDate), endDate: new Date(l.endDate) })) : [],
                    attachments: t.attachments ? t.attachments.map((a: any) => ({ ...a, date: new Date(a.date) })) : []
                }))
            }));
        }
        return INITIAL_PROJECTS;
    },

    loadInventory: (): InventoryItem[] => {
        const saved = localStorage.getItem(KEYS.INVENTORY);
        if (saved) return JSON.parse(saved);
        return INITIAL_INVENTORY;
    },

    loadAnnouncements: (): Announcement[] => {
        const saved = localStorage.getItem(KEYS.ANNOUNCEMENTS);
        if(saved) {
            return JSON.parse(saved).map((a: any) => ({
                ...a,
                date: new Date(a.date)
            }));
        }
        return [
            { id: '1', title: 'Bienvenue sur la V2', message: 'Nouvelle gestion des plannings et interface améliorée.', type: 'INFO', date: new Date(), authorName: 'Admin' }
        ];
    },

    loadAppConfig: (): GlobalAppConfig => {
        const saved = localStorage.getItem(KEYS.APP_CONFIG);
        if (saved) return JSON.parse(saved);
        return DEFAULT_APP_CONFIG;
    },

    // Used by ProductionService
    loadProductionParts: (): ProductionPart[] => {
        const saved = localStorage.getItem(KEYS.PROD_PARTS);
        if (saved) {
            const parts = JSON.parse(saved);
            return parts.map((p: any) => ({
                ...p,
                attachments: p.attachments ? p.attachments.map((a: any) => ({ ...a, date: new Date(a.date) })) : []
            }));
        }
        return []; // Default data is handled in productionService if empty
    },

    // --- SAVERS ---

    saveRoles: (roles: Role[]) => {
        localStorage.setItem(KEYS.ROLES, JSON.stringify(roles));
    },

    saveUsers: (users: User[]) => {
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    },

    saveProjects: (projects: Project[]) => {
        localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    },

    saveInventory: (inventory: InventoryItem[]) => {
        localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
    },

    saveAnnouncements: (announcements: Announcement[]) => {
        localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    },

    saveAppConfig: (config: GlobalAppConfig) => {
        localStorage.setItem(KEYS.APP_CONFIG, JSON.stringify(config));
    },

    // --- UTILS ---
    
    clearAll: () => {
        localStorage.removeItem(KEYS.PROJECTS);
        localStorage.removeItem(KEYS.USERS);
        localStorage.removeItem(KEYS.ROLES);
        localStorage.removeItem(KEYS.INVENTORY);
        localStorage.removeItem(KEYS.PROD_PARTS);
        localStorage.removeItem(KEYS.ANNOUNCEMENTS);
        localStorage.removeItem(KEYS.APP_CONFIG);
        localStorage.removeItem('erp_prod_ops');
        window.location.reload();
    }
};

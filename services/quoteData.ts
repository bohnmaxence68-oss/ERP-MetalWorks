
import { Client, Material, MachineType, HourlyRate, CompanyConfig, AuditLogEntry, ManufacturingPhase, AssemblyMethod } from '../types';

// --- DEFAULTS (Used if localStorage is empty) ---

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
    name: 'METALWORKS',
    addressLine1: 'Zone Industrielle Sud',
    addressLine2: '33000 Bordeaux, France',
    email: 'contact@metalworks.com',
    phone: '05 56 00 00 00',
    footerText: 'MetalWorks SAS au capital de 50 000€ - SIRET 123 456 789 00012 - TVA: FR 12 123 456 789',
    logoText: 'METALWORKS'
};

const DEFAULT_CLIENTS: Client[] = [
  { id: '1', companyName: 'Industrie Locataire SA', contactName: 'Jean Valjean', email: 'j.valjean@indus.com', address: '12 Rue de l\'Usine, 75000 Paris' },
  { id: '2', companyName: 'Bâtiment & Co', contactName: 'Cosette Fauchelevent', email: 'c.fauche@batico.fr', address: '45 Avenue des Architectes, 69000 Lyon' },
];

const DEFAULT_MATERIALS: Material[] = [
  { id: 'm1', type: 'ACIER', name: 'Acier S235 - 1mm', unit: 'm2', unitPrice: 15.50 },
  { id: 'm2', type: 'ACIER', name: 'Acier S235 - 3mm', unit: 'm2', unitPrice: 42.00 },
  { id: 'm3', type: 'ACIER', name: 'Acier S355 - 10mm', unit: 'm2', unitPrice: 135.00 },
  { id: 'm4', type: 'INOX', name: 'Inox 304L - 1.5mm', unit: 'm2', unitPrice: 65.00 },
  { id: 'm5', type: 'INOX', name: 'Inox 316L - 2mm', unit: 'm2', unitPrice: 98.00 },
  { id: 'm6', type: 'ALU', name: 'Alu 5754 - 2mm', unit: 'm2', unitPrice: 38.00 },
  { id: 'm7', type: 'AUTRE', name: 'Vis M8x30 Inox', unit: 'unite', unitPrice: 0.45 },
];

const DEFAULT_ASSEMBLY_METHODS: AssemblyMethod[] = [
    { id: 'SOUDURE', name: 'Soudure (TIG/MIG)' },
    { id: 'BOULON', name: 'Boulonnage' },
    { id: 'RIVET', name: 'Rivetage' },
    { id: 'COLLAGE', name: 'Collage Struct.' },
    { id: 'MECANO', name: 'Mécano-Soudé' },
];

// Initial set of dynamic phases
const DEFAULT_PHASES: ManufacturingPhase[] = [
    { id: 'ETUDE', name: 'Étude / DAO', code: 'ETU', defaultRate: 65.00 },
    { id: 'TRACAGE', name: 'Traçage', code: 'TRA', defaultRate: 50.00 },
    { id: 'LASER', name: 'Découpe Laser', code: 'LA', defaultRate: 120.00 },
    { id: 'POINCONNAGE', name: 'Poinçonnage', code: 'POIN', defaultRate: 95.00 },
    { id: 'CISAILLE', name: 'Cisaillage', code: 'CIS', defaultRate: 60.00 },
    { id: 'PLIAGE', name: 'Pliage', code: 'PLI', defaultRate: 85.00 },
    { id: 'ROULAGE', name: 'Roulage', code: 'ROU', defaultRate: 75.00 },
    { id: 'SOUDURE', name: 'Soudure', code: 'SOUD', defaultRate: 70.00 },
    { id: 'MONTAGE', name: 'Assemblage / Montage', code: 'ASS', defaultRate: 50.00 },
    { id: 'PEINTURE', name: 'Peinture', code: 'PEINT', defaultRate: 90.00 },
    { id: 'EXPEDITION', name: 'Expédition', code: 'EXP', defaultRate: 45.00 },
];

// Legacy support for hourly rates interface
const DEFAULT_HOURLY_RATES: HourlyRate[] = [
  { machineType: MachineType.ETUDE, rate: 65.00 },
  { machineType: MachineType.LASER, rate: 120.00 },
  { machineType: MachineType.PLIAGE, rate: 85.00 },
  { machineType: MachineType.POINCONNAGE, rate: 95.00 },
  { machineType: MachineType.SOUDURE, rate: 70.00 },
];

const DEFAULT_LASER_ABAQUES = {
    'ACIER': {
        1: { speed: 8000, pierceTime: 0.3 },
        3: { speed: 3500, pierceTime: 0.6 },
        10: { speed: 900, pierceTime: 1.5 },
    },
    'INOX': {
        1.5: { speed: 6000, pierceTime: 0.4 },
        2: { speed: 4500, pierceTime: 0.5 },
    },
    'ALU': {
        2: { speed: 5500, pierceTime: 0.4 },
    }
};

// Data structure matching the provided Excel sheet
export interface BendingColumn {
    label: string;
    minWeight: number;
    maxWeight: number;
    load: number;     // Alimenter
    position: number; // Mettre en butée
    bend: number;     // Plier
    release: number;  // Dégager
    evacuate: number; // Evacuer
    stock: number;    // Stocker
}

const DEFAULT_BENDING_ABAQUES: BendingColumn[] = [
    { label: '<5', minWeight: 0, maxWeight: 5, load: 0.45, position: 0.48, bend: 0.2, release: 0.28, evacuate: 0.34, stock: 0.22 },
    { label: '5/20', minWeight: 5, maxWeight: 20, load: 0.68, position: 0.65, bend: 0.2, release: 0.33, evacuate: 0.61, stock: 0.38 },
    { label: '21/30', minWeight: 20, maxWeight: 30, load: 0.79, position: 0.73, bend: 0.2, release: 0.45, evacuate: 0.76, stock: 0.52 },
    { label: '31/40', minWeight: 30, maxWeight: 40, load: 0.94, position: 0.87, bend: 0.2, release: 0.56, evacuate: 0.96, stock: 0.68 },
    { label: '41/50', minWeight: 40, maxWeight: 50, load: 1.19, position: 1.1, bend: 0.2, release: 0.72, evacuate: 1.16, stock: 0.97 },
    { label: '51/70', minWeight: 50, maxWeight: 70, load: 1.48, position: 1.19, bend: 0.2, release: 0.86, evacuate: 1.43, stock: 1.36 },
    { label: '71/90', minWeight: 70, maxWeight: 90, load: 1.72, position: 1.32, bend: 0.2, release: 1.02, evacuate: 1.65, stock: 1.89 },
    { label: '91/100', minWeight: 90, maxWeight: 100, load: 1.89, position: 1.47, bend: 0.2, release: 1.16, evacuate: 1.91, stock: 2.52 },
    { label: '101/120', minWeight: 100, maxWeight: 120, load: 2.12, position: 1.58, bend: 0.2, release: 1.28, evacuate: 2.09, stock: 2.55 },
    { label: '121/150', minWeight: 120, maxWeight: 150, load: 2.32, position: 1.71, bend: 0.2, release: 1.37, evacuate: 2.25, stock: 3.00 },
];

// --- SERVICE ---

export const QuoteDataService = {
    // --- ID Generation ---
    generateNextQuoteId: (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const key = `${year}-${month}`; // Key for grouping counters by month

        // Retrieve counters object
        const storageKey = 'erp_quote_counters';
        const counters = JSON.parse(localStorage.getItem(storageKey) || '{}');

        // Get current sequence for this month, default to 0
        let seq = counters[key] || 0;
        
        // Increment
        seq++;

        // Save back
        counters[key] = seq;
        localStorage.setItem(storageKey, JSON.stringify(counters));

        // Format: D-YYYY-MM-XXX
        const seqStr = seq.toString().padStart(3, '0');
        return `D-${year}-${month}-${seqStr}`;
    },

    // Company Config
    getCompanyConfig: (): CompanyConfig => {
        const saved = localStorage.getItem('erp_company_config');
        return saved ? JSON.parse(saved) : DEFAULT_COMPANY_CONFIG;
    },
    saveCompanyConfig: (config: CompanyConfig) => {
        localStorage.setItem('erp_company_config', JSON.stringify(config));
    },

    // Clients
    getClients: (): Client[] => {
        const saved = localStorage.getItem('erp_clients');
        return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
    },
    saveClients: (clients: Client[]) => {
        localStorage.setItem('erp_clients', JSON.stringify(clients));
    },

    // Materials
    getMaterials: (): Material[] => {
        const saved = localStorage.getItem('erp_materials');
        return saved ? JSON.parse(saved) : DEFAULT_MATERIALS;
    },
    saveMaterials: (materials: Material[]) => {
        localStorage.setItem('erp_materials', JSON.stringify(materials));
    },

    // --- MANUFACTURING PHASES (Dynamic) ---
    getPhases: (): ManufacturingPhase[] => {
        const saved = localStorage.getItem('erp_phases');
        return saved ? JSON.parse(saved) : DEFAULT_PHASES;
    },
    savePhases: (phases: ManufacturingPhase[]) => {
        localStorage.setItem('erp_phases', JSON.stringify(phases));
    },

    // --- ASSEMBLY METHODS ---
    getAssemblyMethods: (): AssemblyMethod[] => {
        const saved = localStorage.getItem('erp_assembly_methods');
        return saved ? JSON.parse(saved) : DEFAULT_ASSEMBLY_METHODS;
    },
    saveAssemblyMethods: (methods: AssemblyMethod[]) => {
        localStorage.setItem('erp_assembly_methods', JSON.stringify(methods));
    },

    // Hourly Rates (Legacy Wrapper - Maps to Phases for compatibility)
    getHourlyRates: (): HourlyRate[] => {
        // We now prefer getting rates from phases, but for backward compat with types, we might keep this
        // Or simply construct it from Phases
        const phases = QuoteDataService.getPhases();
        return phases.map(p => ({
            machineType: p.id as MachineType, // ID acts as key
            rate: p.defaultRate
        }));
    },
    saveHourlyRates: (rates: HourlyRate[]) => {
        // When saving "HourlyRates", we actually update the Phases default rates
        const phases = QuoteDataService.getPhases();
        const updatedPhases = phases.map(p => {
            const matchingRate = rates.find(r => r.machineType === p.id);
            return matchingRate ? { ...p, defaultRate: matchingRate.rate } : p;
        });
        QuoteDataService.savePhases(updatedPhases);
    },

    // Tech Data - Laser
    getLaserAbaques: () => {
        const saved = localStorage.getItem('erp_laser_abaques');
        return saved ? JSON.parse(saved) : DEFAULT_LASER_ABAQUES;
    },
    saveLaserAbaques: (data: any) => {
        localStorage.setItem('erp_laser_abaques', JSON.stringify(data));
    },

    // Tech Data - Bending
    getBendingAbaques: (): BendingColumn[] => {
        const saved = localStorage.getItem('erp_bending_abaques');
        return saved ? JSON.parse(saved) : DEFAULT_BENDING_ABAQUES;
    },
    saveBendingAbaques: (data: BendingColumn[]) => {
        localStorage.setItem('erp_bending_abaques', JSON.stringify(data));
    },

    // --- AUDIT LOGS ---
    getAuditLogs: (): AuditLogEntry[] => {
        const saved = localStorage.getItem('erp_audit_logs');
        if (!saved) return [];
        const logs = JSON.parse(saved);
        // Restore Date objects
        return logs.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
    },
    
    addAuditLog: (quoteId: string, action: AuditLogEntry['action'], details: string) => {
        const entry: AuditLogEntry = {
            id: String(Date.now()),
            quoteId,
            action,
            details,
            timestamp: new Date(),
            user: 'Admin User' // Hardcoded user for this scope
        };
        const logs = QuoteDataService.getAuditLogs();
        logs.unshift(entry); // Add to beginning
        // Limit log size for localStorage safety (e.g. 500 entries)
        const trimmedLogs = logs.slice(0, 500);
        localStorage.setItem('erp_audit_logs', JSON.stringify(trimmedLogs));
    }
};


// --- CALCULATOR FUNCTIONS ---

export const calculateBendingTime = (weightKg: number, numBends: number): number => {
    const abaques = QuoteDataService.getBendingAbaques();
    
    // Find matching column
    const column = abaques.find(c => weightKg > c.minWeight && weightKg <= c.maxWeight) || abaques[abaques.length - 1]; // Default to max if over
    
    if (!column) return 0;

    // Fixed Time (per Part): Load + Evacuate + Stock
    const fixedTimeMinutes = column.load + column.evacuate + column.stock;

    // Variable Time (per Bend): Position + Bend + Release
    const variableTimePerBendMinutes = column.position + column.bend + column.release;

    const totalMinutes = fixedTimeMinutes + (variableTimePerBendMinutes * numBends);
    
    return totalMinutes / 60; // Return Hours
};

export const calculateLaserTime = (materialType: string, thickness: number, perimeterMeters: number, numPiercings: number): number => {
    const abaques = QuoteDataService.getLaserAbaques();
    
    const matData = abaques[materialType] || abaques['ACIER'];
    
    // Simple closest thickness logic
    let thickKey = '1';
    if (matData) {
        const keys = Object.keys(matData);
        if (keys.length > 0) {
            thickKey = keys.reduce((prev, curr) => 
                Math.abs(parseFloat(curr) - thickness) < Math.abs(parseFloat(prev) - thickness) ? curr : prev
            );
        }
    }
    
    const data = matData[parseFloat(thickKey)] || { speed: 1000, pierceTime: 1 };
    
    const cuttingMinutes = (perimeterMeters * 1000) / data.speed;
    const piercingMinutes = (numPiercings * data.pierceTime) / 60;
    
    return (cuttingMinutes + piercingMinutes) / 60; // Return Hours
};

export const calculatePunchingTime = (thickness: number, numHits: number, nibblePerimeterMeters: number, numToolChanges: number): number => {
    // Still hardcoded mock for punching
    const PUNCHING_ABAQUES: any = {
        1: { hitRate: 600, nibblingSpeed: 30 },
        1.5: { hitRate: 550, nibblingSpeed: 25 },
        2: { hitRate: 500, nibblingSpeed: 20 },
        3: { hitRate: 400, nibblingSpeed: 15 },
    };
    
    let thickKey = '1';
    const keys = Object.keys(PUNCHING_ABAQUES);
    if(keys.length > 0) {
         thickKey = keys.reduce((prev, curr) => 
            Math.abs(parseFloat(curr) - thickness) < Math.abs(parseFloat(prev) - thickness) ? curr : prev
        );
    }
    const data = PUNCHING_ABAQUES[parseFloat(thickKey)] || { hitRate: 500, nibblingSpeed: 20 };

    const hittingMinutes = numHits / data.hitRate;
    const nibblingMinutes = nibblePerimeterMeters / data.nibblingSpeed;
    const toolChangeMinutes = (numToolChanges * 4) / 60;

    return (hittingMinutes + nibblingMinutes + toolChangeMinutes) / 60; // Return Hours
};

export const roundCurrency = (amount: number) => {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

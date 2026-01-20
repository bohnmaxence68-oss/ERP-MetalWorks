
import React, { useState, useEffect } from 'react';
import { Save, Settings, Building2, Users, Package, Trash2, Plus, MonitorCog, AlertTriangle, Blocks, Smartphone, RefreshCw } from 'lucide-react';
import { QuoteDataService, BendingColumn } from '../../services/quoteData';
import { HourlyRate, MachineType, Client, Material, CompanyConfig, ManufacturingPhase, AssemblyMethod, GlobalAppConfig } from '../../types';

interface QuoteSettingsProps {
    appConfig?: GlobalAppConfig;
    onUpdateAppConfig?: (config: GlobalAppConfig) => void;
    initialTab?: 'COMPANY' | 'SOFTWARE'; // New prop to control entry point
}

const INPUT_STYLE = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400";
const BTN_STYLE = "flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm";

export const QuoteSettings: React.FC<QuoteSettingsProps> = ({ appConfig, onUpdateAppConfig, initialTab = 'COMPANY' }) => {
    const [activeTab, setActiveTab] = useState<'COMPANY' | 'CLIENTS' | 'MATERIALS' | 'MACHINES' | 'ASSEMBLY' | 'SOFTWARE'>('COMPANY');
    const [isSaved, setIsSaved] = useState(false);

    // Data State
    const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({} as CompanyConfig);
    const [clients, setClients] = useState<Client[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [phases, setPhases] = useState<ManufacturingPhase[]>([]);
    const [assemblyMethods, setAssemblyMethods] = useState<AssemblyMethod[]>([]);
    const [laserAbaques, setLaserAbaques] = useState<any>({});
    const [bendingAbaques, setBendingAbaques] = useState<BendingColumn[]>([]);
    
    // Software Config Local State
    const [localAppConfig, setLocalAppConfig] = useState<GlobalAppConfig>(appConfig || {
        appName: 'MetalWorks',
        appSubtitle: 'ERP Chaudronnerie',
        appVersion: '2.5.0'
    });

    useEffect(() => {
        loadData();
    }, []);

    // Effect to switch tab if initialTab prop changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const loadData = () => {
        setCompanyConfig(QuoteDataService.getCompanyConfig());
        setClients(QuoteDataService.getClients());
        setMaterials(QuoteDataService.getMaterials());
        setPhases(QuoteDataService.getPhases());
        setAssemblyMethods(QuoteDataService.getAssemblyMethods());
        setLaserAbaques(QuoteDataService.getLaserAbaques());
        setBendingAbaques(QuoteDataService.getBendingAbaques());
    };

    const handleSave = () => {
        QuoteDataService.saveCompanyConfig(companyConfig);
        QuoteDataService.saveClients(clients);
        QuoteDataService.saveMaterials(materials);
        QuoteDataService.savePhases(phases);
        QuoteDataService.saveAssemblyMethods(assemblyMethods);
        QuoteDataService.saveLaserAbaques(laserAbaques);
        QuoteDataService.saveBendingAbaques(bendingAbaques);
        
        // Save App Config via callback
        if (onUpdateAppConfig) {
            onUpdateAppConfig(localAppConfig);
        }
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalAppConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- CLIENT HELPERS ---
    const addClient = () => {
        const newClient: Client = {
            id: String(Date.now()),
            companyName: 'Nouveau Client',
            contactName: '',
            email: '',
            address: ''
        };
        setClients([...clients, newClient]);
    };
    const updateClient = (id: string, field: keyof Client, value: string) => {
        setClients(clients.map(c => c.id === id ? { ...c, [field]: value } : c));
    };
    const deleteClient = (id: string) => {
        if (confirm('Supprimer ce client ?')) setClients(clients.filter(c => c.id !== id));
    };

    // --- MATERIAL HELPERS ---
    const addMaterial = () => {
        const newMat: Material = {
            id: String(Date.now()),
            type: 'AUTRE',
            name: '',
            unit: 'unite',
            unitPrice: 0
        };
        setMaterials([...materials, newMat]);
    };
    const updateMaterial = (id: string, field: keyof Material, value: any) => {
        setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
    };
    const deleteMaterial = (id: string) => {
        const mat = materials.find(m => m.id === id);
        if (confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer la matière "${mat?.name || 'Inconnue'}" ?\n\nCette action est irréversible.`)) {
            setMaterials(materials.filter(m => m.id !== id));
        }
    };

    // --- PHASE HELPERS ---
    const addPhase = () => {
        const newPhase: ManufacturingPhase = {
            id: `PHASE_${Date.now()}`,
            name: 'Nouvelle Phase',
            code: 'NEW',
            defaultRate: 50.00
        };
        setPhases([...phases, newPhase]);
    };
    const updatePhase = (id: string, field: keyof ManufacturingPhase, value: any) => {
        setPhases(phases.map(p => p.id === id ? { ...p, [field]: value } : p));
    };
    const deletePhase = (id: string) => {
        if(confirm("Supprimer cette phase de fabrication ? Cela peut impacter les devis existants.")) {
            setPhases(phases.filter(p => p.id !== id));
        }
    };

    // --- ASSEMBLY HELPERS ---
    const addAssemblyMethod = () => {
        const newMethod: AssemblyMethod = {
            id: `ASM_${Date.now()}`,
            name: 'Nouvelle Méthode'
        };
        setAssemblyMethods([...assemblyMethods, newMethod]);
    };
    const updateAssemblyMethod = (id: string, name: string) => {
        setAssemblyMethods(assemblyMethods.map(m => m.id === id ? { ...m, name } : m));
    };
    const deleteAssemblyMethod = (id: string) => {
        setAssemblyMethods(assemblyMethods.filter(m => m.id !== id));
    };

    // --- BENDING HELPER ---
    const updateBendingValue = (index: number, field: keyof BendingColumn, value: number) => {
        const newAbaques = [...bendingAbaques];
        newAbaques[index] = { ...newAbaques[index], [field]: value };
        setBendingAbaques(newAbaques);
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {activeTab === 'SOFTWARE' ? 'Paramètres Logiciel' : 'Paramètres Global'}
                    </h2>
                    <p className="text-slate-500">
                        {activeTab === 'SOFTWARE' ? 'Personnalisation de l\'interface' : 'Configuration technique et commerciale'}
                    </p>
                </div>
                <button 
                    onClick={handleSave}
                    className={`${BTN_STYLE} ${isSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                >
                    {isSaved ? <span className="flex items-center gap-2">Enregistré !</span> : <><Save size={18} /> Tout Enregistrer</>}
                </button>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 space-y-2">
                    <TabButton 
                        active={activeTab === 'SOFTWARE'} 
                        onClick={() => setActiveTab('SOFTWARE')} 
                        icon={<Smartphone size={18} />} 
                        label="Logiciel / App" 
                    />
                    
                    <div className="my-2 border-t border-slate-200"></div>
                    <p className="px-4 text-xs font-bold text-slate-400 uppercase mt-4 mb-2">Métier</p>

                    <TabButton 
                        active={activeTab === 'COMPANY'} 
                        onClick={() => setActiveTab('COMPANY')} 
                        icon={<Building2 size={18} />} 
                        label="Général & Entreprise" 
                    />
                    <TabButton 
                        active={activeTab === 'CLIENTS'} 
                        onClick={() => setActiveTab('CLIENTS')} 
                        icon={<Users size={18} />} 
                        label="Base Clients" 
                    />
                    <TabButton 
                        active={activeTab === 'MATERIALS'} 
                        onClick={() => setActiveTab('MATERIALS')} 
                        icon={<Package size={18} />} 
                        label="Matières & Ressources" 
                    />
                    <TabButton 
                        active={activeTab === 'MACHINES'} 
                        onClick={() => setActiveTab('MACHINES')} 
                        icon={<MonitorCog size={18} />} 
                        label="Machines & Phases" 
                    />
                    <TabButton 
                        active={activeTab === 'ASSEMBLY'} 
                        onClick={() => setActiveTab('ASSEMBLY')} 
                        icon={<Blocks size={18} />} 
                        label="Assemblage" 
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto p-8">
                    
                    {/* --- COMPANY TAB --- */}
                    {activeTab === 'COMPANY' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Informations de l'entreprise (En-tête PDF)</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom (Raison Sociale)</label>
                                    <input className={INPUT_STYLE} value={companyConfig.name || ''} onChange={e => setCompanyConfig({...companyConfig, name: e.target.value})} placeholder="Ex: MetalWorks SAS" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Texte du Logo (Haut Gauche PDF)</label>
                                    <input className={INPUT_STYLE} value={companyConfig.logoText || ''} onChange={e => setCompanyConfig({...companyConfig, logoText: e.target.value})} placeholder="Ex: METALWORKS" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Ligne 1</label>
                                    <input className={INPUT_STYLE} value={companyConfig.addressLine1 || ''} onChange={e => setCompanyConfig({...companyConfig, addressLine1: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Ligne 2 (CP, Ville)</label>
                                    <input className={INPUT_STYLE} value={companyConfig.addressLine2 || ''} onChange={e => setCompanyConfig({...companyConfig, addressLine2: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email de contact</label>
                                    <input className={INPUT_STYLE} value={companyConfig.email || ''} onChange={e => setCompanyConfig({...companyConfig, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                                    <input className={INPUT_STYLE} value={companyConfig.phone || ''} onChange={e => setCompanyConfig({...companyConfig, phone: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pied de page (Mentions Légales, SIRET, TVA...)</label>
                                    <textarea 
                                        className={`${INPUT_STYLE} h-24 resize-none`}
                                        value={companyConfig.footerText || ''} 
                                        onChange={e => setCompanyConfig({...companyConfig, footerText: e.target.value})}
                                        placeholder="SAS au capital de... SIRET..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SOFTWARE TAB --- */}
                    {activeTab === 'SOFTWARE' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Personnalisation du Logiciel</h3>
                            <p className="text-sm text-slate-500 mb-4">Modifiez l'apparence de l'application (Logo, Nom, Version).</p>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'Application</label>
                                    <input className={INPUT_STYLE} value={localAppConfig.appName} onChange={e => setLocalAppConfig({...localAppConfig, appName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sous-titre (ex: ERP Chaudronnerie)</label>
                                    <input className={INPUT_STYLE} value={localAppConfig.appSubtitle} onChange={e => setLocalAppConfig({...localAppConfig, appSubtitle: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
                                    <input className={INPUT_STYLE} value={localAppConfig.appVersion} onChange={e => setLocalAppConfig({...localAppConfig, appVersion: e.target.value})} />
                                </div>
                                
                                <div className="col-span-2 border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo de l'Application</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                                            {localAppConfig.logoUrl ? (
                                                <img src={localAppConfig.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-xs text-slate-400">Aucun</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                            <button 
                                                onClick={() => setLocalAppConfig({...localAppConfig, logoUrl: undefined})}
                                                className="text-xs text-red-600 hover:underline text-left"
                                            >
                                                Réinitialiser le logo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CLIENTS TAB --- */}
                    {activeTab === 'CLIENTS' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-bold text-slate-800">Base Clients</h3>
                                <button onClick={addClient} className={`${BTN_STYLE} text-sm py-1.5`}><Plus size={16} /> Ajouter Client</button>
                            </div>
                            <div className="space-y-4">
                                {clients.map(client => (
                                    <div key={client.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-12 gap-4 items-start">
                                        <div className="col-span-3">
                                            <label className="text-xs font-bold text-slate-400">Société</label>
                                            <input className={`${INPUT_STYLE} text-sm`} value={client.companyName} onChange={e => updateClient(client.id, 'companyName', e.target.value)} />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-xs font-bold text-slate-400">Contact</label>
                                            <input className={`${INPUT_STYLE} text-sm`} value={client.contactName} onChange={e => updateClient(client.id, 'contactName', e.target.value)} />
                                        </div>
                                        <div className="col-span-5 space-y-2">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400">Email</label>
                                                <input className={`${INPUT_STYLE} text-sm`} value={client.email} onChange={e => updateClient(client.id, 'email', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400">Adresse</label>
                                                <input className={`${INPUT_STYLE} text-sm`} value={client.address} onChange={e => updateClient(client.id, 'address', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex justify-end pt-5">
                                            <button onClick={() => deleteClient(client.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                                {clients.length === 0 && <p className="text-center text-slate-400 py-8">Aucun client enregistré.</p>}
                            </div>
                        </div>
                    )}

                    {/* --- MATERIALS TAB --- */}
                    {activeTab === 'MATERIALS' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-bold text-slate-800">Base Articles (Matières & Quincaillerie)</h3>
                                <button onClick={addMaterial} className={`${BTN_STYLE} text-sm py-1.5`}><Plus size={16} /> Ajouter Article</button>
                            </div>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-32">Type</th>
                                        <th className="p-3">Désignation</th>
                                        <th className="p-3 w-28">Unité</th>
                                        <th className="p-3 w-32">Prix Unitaire</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {materials.map(mat => (
                                        <tr key={mat.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="p-2">
                                                <select 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1.5 text-sm"
                                                    value={mat.type}
                                                    onChange={e => updateMaterial(mat.id, 'type', e.target.value)}
                                                >
                                                    <option value="ACIER">Acier</option>
                                                    <option value="INOX">Inox</option>
                                                    <option value="ALU">Alu</option>
                                                    <option value="AUTRE">Autre</option>
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1.5 text-sm placeholder:text-slate-300" 
                                                    value={mat.name} 
                                                    onChange={e => updateMaterial(mat.id, 'name', e.target.value)} 
                                                    placeholder="Nom de la matière..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1.5 text-sm"
                                                    value={mat.unit}
                                                    onChange={e => updateMaterial(mat.id, 'unit', e.target.value)}
                                                >
                                                    <option value="m2">m²</option>
                                                    <option value="kg">kg</option>
                                                    <option value="m">ml</option>
                                                    <option value="unite">Unité</option>
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <div className="relative">
                                                    <input 
                                                        type="number" step="0.01" min="0"
                                                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1.5 pr-6 text-right font-mono" 
                                                        value={mat.unitPrice} 
                                                        onChange={e => updateMaterial(mat.id, 'unitPrice', Number(e.target.value))} 
                                                    />
                                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <button 
                                                    onClick={() => deleteMaterial(mat.id)} 
                                                    className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {materials.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 bg-slate-50/30 italic">
                                                Aucune matière définie. Ajoutez-en une pour commencer.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="bg-blue-50/50 p-3 rounded-b-lg border-t border-blue-100 text-xs text-blue-600 flex items-center gap-2">
                                <AlertTriangle size={14} />
                                Astuce : Cliquez directement sur les textes pour modifier les valeurs.
                            </div>
                        </div>
                    )}

                    {/* --- ASSEMBLY TAB --- */}
                    {activeTab === 'ASSEMBLY' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-bold text-slate-800">Méthodes d'Assemblage</h3>
                                <button onClick={addAssemblyMethod} className={`${BTN_STYLE} text-sm py-1.5`}><Plus size={16} /> Ajouter Méthode</button>
                            </div>
                            <p className="text-sm text-slate-500">Définissez ici les choix d'assemblage disponibles lors de la création d'un ensemble (ex: Soudure, Boulonnage, etc.).</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assemblyMethods.map((method) => (
                                    <div key={method.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center gap-3 group">
                                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-400">
                                            <Blocks size={18} />
                                        </div>
                                        <input 
                                            className="flex-1 bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1 text-sm font-medium text-slate-700"
                                            value={method.name}
                                            onChange={(e) => updateAssemblyMethod(method.id, e.target.value)}
                                            placeholder="Nom de la méthode"
                                        />
                                        <button 
                                            onClick={() => deleteAssemblyMethod(method.id)} 
                                            className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- MACHINES & PHASES TAB --- */}
                    {activeTab === 'MACHINES' && (
                        <div className="space-y-8 animate-in fade-in">
                            {/* PHASES CONFIGURATION */}
                            <div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">Phases de Fabrication & Taux Horaires</h3>
                                    <button onClick={addPhase} className={`${BTN_STYLE} text-sm py-1.5`}><Plus size={16} /> Ajouter Phase</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {phases.map((phase) => (
                                        <div key={phase.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 relative group">
                                            <button 
                                                onClick={() => deletePhase(phase.id)} 
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nom de la phase</label>
                                                    <input 
                                                        className="w-full bg-white px-2 py-1 border border-slate-200 rounded text-sm font-medium focus:border-blue-500 outline-none text-slate-900"
                                                        value={phase.name}
                                                        onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Code (court)</label>
                                                        <input 
                                                            className="w-full bg-white px-2 py-1 border border-slate-200 rounded text-xs font-mono focus:border-blue-500 outline-none uppercase text-slate-900"
                                                            value={phase.code}
                                                            onChange={(e) => updatePhase(phase.id, 'code', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taux (€/h)</label>
                                                        <input 
                                                            type="number" min="0" step="0.5"
                                                            className="w-full bg-white px-2 py-1 border border-slate-200 rounded text-sm text-right focus:border-blue-500 outline-none text-slate-900"
                                                            value={phase.defaultRate}
                                                            onChange={(e) => updatePhase(phase.id, 'defaultRate', Number(e.target.value))}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* BENDING ABACUS TABLE */}
                            <div>
                                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    ABAQUE PLIAGE (Temps en minutes décimales)
                                </h4>
                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800 text-white text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left w-32 sticky left-0 bg-slate-800">Masse (kg)</th>
                                                {bendingAbaques.map((col, idx) => (
                                                    <th key={idx} className="px-2 py-3 text-center min-w-[80px]">{col.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* ELEMENTARY TIMES */}
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Alimenter</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.load} onChange={e => updateBendingValue(idx, 'load', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Mettre en butée</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.position} onChange={e => updateBendingValue(idx, 'position', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Plier</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.bend} onChange={e => updateBendingValue(idx, 'bend', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Dégager</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.release} onChange={e => updateBendingValue(idx, 'release', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Evacuer</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.evacuate} onChange={e => updateBendingValue(idx, 'evacuate', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium bg-slate-50 sticky left-0">Stocker</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-2">
                                                        <input type="number" step="0.01" className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={col.stock} onChange={e => updateBendingValue(idx, 'stock', Number(e.target.value))} />
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* TOTALS (Read Only) */}
                                            <tr className="bg-amber-50 font-bold border-t-2 border-slate-200">
                                                <td className="px-4 py-3 text-amber-800 sticky left-0 bg-amber-50">Temps Fixe (pce)</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-3 text-center text-amber-900">
                                                        {(col.load + col.evacuate + col.stock).toFixed(2)}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className="bg-amber-50 font-bold">
                                                <td className="px-4 py-3 text-amber-800 sticky left-0 bg-amber-50">Temps Variable (pli)</td>
                                                {bendingAbaques.map((col, idx) => (
                                                    <td key={idx} className="px-2 py-3 text-center text-amber-900">
                                                        {(col.position + col.bend + col.release).toFixed(2)}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* LASER ABACUS */}
                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-4">Abaques Laser (Vitesses de coupe)</h4>
                                <p className="text-sm text-slate-500 mb-4">Définissez les vitesses de coupe (mm/min) et temps de perçage (s) par matière et épaisseur.</p>
                                <div className="space-y-6">
                                    {Object.keys(laserAbaques).map((mat) => (
                                        <div key={mat} className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700">
                                                {mat}
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Épaisseur</th>
                                                        <th className="px-4 py-2 text-right">Vitesse (mm/min)</th>
                                                        <th className="px-4 py-2 text-right">Perçage (s)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {Object.keys(laserAbaques[mat]).map((thick) => {
                                                        const data = laserAbaques[mat][thick];
                                                        return (
                                                            <tr key={thick}>
                                                                <td className="px-4 py-2 font-medium">{thick} mm</td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <input 
                                                                        type="number" 
                                                                        value={data.speed} 
                                                                        onChange={(e) => {
                                                                            const newVal = { ...laserAbaques };
                                                                            newVal[mat][thick].speed = Number(e.target.value);
                                                                            setLaserAbaques({...newVal});
                                                                        }}
                                                                        className="w-24 text-right border border-slate-200 rounded px-1"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <input 
                                                                        type="number" step="0.1"
                                                                        value={data.pierceTime} 
                                                                        onChange={(e) => {
                                                                            const newVal = { ...laserAbaques };
                                                                            newVal[mat][thick].pierceTime = Number(e.target.value);
                                                                            setLaserAbaques({...newVal});
                                                                        }}
                                                                        className="w-20 text-right border border-slate-200 rounded px-1"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            active 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-600 hover:bg-white hover:text-blue-600'
        }`}
    >
        {icon}
        {label}
    </button>
);


import React, { useState, useEffect } from 'react';
import { QuoteBuilder } from './QuoteBuilder';
import { Quote, QuoteStatus, Project, AuditLogEntry } from '../../types';
import { Plus, Search, ChevronRight, Settings, LayoutGrid, FileText, Download, History, X } from 'lucide-react';
import { QuoteDataService } from '../../services/quoteData';
import { QuoteSettings } from './QuoteSettings';

interface QuoteModuleProps {
    projects?: Project[];
    forcedProjectId?: string; // New prop to filter contextually
}

// Mock initial quotes (Ensure mock data has project IDs for testing)
const INITIAL_QUOTES: Quote[] = [
    {
        id: 'D-2023-10-101',
        clientId: '1',
        projectId: 'p1', // Linked to 'p1'
        date: new Date('2023-10-15'),
        status: QuoteStatus.VALIDATED,
        object: 'Garde-corps Inox 304L',
        items: [],
        totalHT: 1250.00,
        totalTVA: 250.00,
        totalTTC: 1500.00
    },
    {
        id: 'D-2023-10-104',
        clientId: '3',
        projectId: 'p2',
        date: new Date('2023-10-20'),
        status: QuoteStatus.DRAFT,
        object: 'Trémie Acier S235',
        items: [],
        totalHT: 450.50,
        totalTVA: 90.10,
        totalTTC: 540.60
    }
];

export const QuoteModule: React.FC<QuoteModuleProps> = ({ projects = [], forcedProjectId }) => {
    const [view, setView] = useState<'LIST' | 'BUILDER' | 'SETTINGS'>('LIST');
    const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
    const [selectedQuote, setSelectedQuote] = useState<Quote | undefined>(undefined);
    const [search, setSearch] = useState('');
    
    // If forcedProjectId is present, default filter to it, else ALL
    const [filterProject, setFilterProject] = useState(forcedProjectId || 'ALL');
    const [clients, setClients] = useState(QuoteDataService.getClients());
    
    // History Panel State
    const [showHistory, setShowHistory] = useState(false);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

    useEffect(() => {
        if (view === 'LIST') {
            setClients(QuoteDataService.getClients());
        }
    }, [view]);

    useEffect(() => {
        if (showHistory) {
            setAuditLogs(QuoteDataService.getAuditLogs());
        }
    }, [showHistory]);

    // Force filter update if prop changes
    useEffect(() => {
        if (forcedProjectId) setFilterProject(forcedProjectId);
    }, [forcedProjectId]);

    const handleCreate = () => {
        setSelectedQuote({
            id: QuoteDataService.generateNextQuoteId(),
            clientId: '',
            projectId: forcedProjectId || '', // Pre-fill project if forced
            date: new Date(),
            status: QuoteStatus.DRAFT,
            object: '',
            items: [],
            totalHT: 0,
            totalTVA: 0,
            totalTTC: 0
        });
        setView('BUILDER');
    };

    const handleEdit = (quote: Quote) => {
        setSelectedQuote(quote);
        setView('BUILDER');
    };

    const handleSaveQuote = (savedQuote: Quote) => {
        const exists = quotes.find(q => q.id === savedQuote.id);
        if (exists) {
            setQuotes(quotes.map(q => q.id === savedQuote.id ? savedQuote : q));
        } else {
            setQuotes([savedQuote, ...quotes]);
            QuoteDataService.addAuditLog(savedQuote.id, 'CREATED', `Création du devis ${savedQuote.id}`);
        }
        setView('LIST');
    };

    const getClientName = (id: string) => clients.find(c => c.id === id)?.companyName || 'Inconnu';
    const getProjectName = (id?: string) => {
        if (!id) return '-';
        return projects.find(p => p.id === id)?.name || 'Projet inconnu';
    };

    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = q.id.toLowerCase().includes(search.toLowerCase()) || 
                              q.object.toLowerCase().includes(search.toLowerCase()) ||
                              getClientName(q.clientId).toLowerCase().includes(search.toLowerCase());
        
        // If forcedProjectId is set, we strictly filter by it
        // Otherwise use the dropdown filter
        const targetProject = forcedProjectId || filterProject;
        const matchesProject = targetProject === 'ALL' || q.projectId === targetProject;

        return matchesSearch && matchesProject;
    });

    const handleExportCSV = () => {
        const headers = ['Numéro', 'Date', 'Client', 'Projet Lié', 'Objet', 'Montant HT', 'Statut'];
        const rows = filteredQuotes.map(q => [
            q.id,
            q.date.toLocaleDateString(),
            `"${getClientName(q.clientId)}"`,
            `"${getProjectName(q.projectId)}"`,
            `"${q.object.replace(/"/g, '""')}"`,
            q.totalHT.toFixed(2),
            q.status
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `devis_export.csv`);
        link.click();
        
        QuoteDataService.addAuditLog('GLOBAL', 'EXPORTED', 'Export CSV devis');
    };

    if (view === 'BUILDER') {
        return <QuoteBuilder initialQuote={selectedQuote} projects={projects} onSave={handleSaveQuote} onBack={() => setView('LIST')} />;
    }

    if (view === 'SETTINGS') {
        return (
            <div className="h-full flex flex-col">
                <button onClick={() => setView('LIST')} className="self-start mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                   <ChevronRight className="w-4 h-4 rotate-180" /> Retour
                </button>
                <QuoteSettings />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    {!forcedProjectId && (
                        <>
                            <h1 className="text-2xl font-bold text-slate-800">Devis & Chiffrage</h1>
                            <p className="text-slate-500">Gestion des offres commerciales</p>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg" title="Historique"><History size={20} /></button>
                    <button onClick={handleExportCSV} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg" title="Export CSV"><Download size={20} /></button>
                    {!forcedProjectId && (
                        <button onClick={() => setView('SETTINGS')} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg" title="Paramètres"><Settings size={20} /></button>
                    )}
                    <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Plus size={20} /> Nouveau Devis</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
                     <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                        <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={search} onChange={(e) => setSearch(e.target.value)}/>
                     </div>
                     {!forcedProjectId && (
                         <div className="flex items-center gap-2">
                             <LayoutGrid className="text-slate-400 w-4 h-4" />
                             <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 cursor-pointer" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                                 <option value="ALL">Tous les projets</option>
                                 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                         </div>
                     )}
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Numéro</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                {!forcedProjectId && <th className="px-6 py-4">Projet Lié</th>}
                                <th className="px-6 py-4">Objet</th>
                                <th className="px-6 py-4 text-right">Montant HT</th>
                                <th className="px-6 py-4 text-center">Statut</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredQuotes.map(quote => (
                                <tr key={quote.id} onClick={() => handleEdit(quote)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-900">{quote.id}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{quote.date.toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">{getClientName(quote.clientId)}</td>
                                    {!forcedProjectId && (
                                        <td className="px-6 py-4 text-slate-600 text-xs">
                                            {quote.projectId ? <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate max-w-[150px]"><LayoutGrid size={12} /> {getProjectName(quote.projectId)}</span> : '-'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-slate-600 text-sm truncate max-w-xs">{quote.object}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-700">{quote.totalHT.toFixed(2)} €</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${quote.status === QuoteStatus.VALIDATED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{quote.status === QuoteStatus.VALIDATED ? 'VALIDÉ' : 'BROUILLON'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-400 group-hover:text-blue-600"><ChevronRight size={20} /></td>
                                </tr>
                            ))}
                            {filteredQuotes.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Aucun devis trouvé.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Panel */}
            {showHistory && (
                <div className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-20 border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-2"><History className="text-slate-500" size={18} /><h3 className="font-bold text-slate-800">Historique</h3></div>
                        <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        <div className="space-y-4">
                            {auditLogs.map(log => (
                                <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{log.action}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-800 font-medium">{log.details}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

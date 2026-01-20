
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileCheck, Printer, Trash2, Plus, LayoutGrid, Calculator, ChevronRight } from 'lucide-react';
import { Quote, QuoteStatus, QuoteItem, MachineType, Project, Client, Material, CompanyConfig } from '../../types';
import { QuoteDataService, roundCurrency } from '../../services/quoteData';
import { Calculators } from './Calculators';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface QuoteBuilderProps {
    initialQuote?: Quote;
    projects: Project[];
    onSave: (quote: Quote) => void;
    onBack: () => void;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ initialQuote, projects, onSave, onBack }) => {
    // Dynamic Data Loading
    const [clients, setClients] = useState<Client[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
    const [hourlyRates, setHourlyRates] = useState(QuoteDataService.getHourlyRates());
    const [showCalculator, setShowCalculator] = useState(false);

    // Initialize Quote State
    const [quote, setQuote] = useState<Quote>(() => {
        if (initialQuote) return initialQuote;
        
        // Generate new ID only if it's a fresh quote
        return {
            id: QuoteDataService.generateNextQuoteId(),
            clientId: '',
            date: new Date(),
            status: QuoteStatus.DRAFT,
            object: '',
            items: [],
            totalHT: 0,
            totalTVA: 0,
            totalTTC: 0,
            projectId: '' // Initialize with empty project
        };
    });

    useEffect(() => {
        setClients(QuoteDataService.getClients());
        setMaterials(QuoteDataService.getMaterials());
        setCompanyConfig(QuoteDataService.getCompanyConfig());
        setHourlyRates(QuoteDataService.getHourlyRates());
    }, []);

    const isLocked = quote.status !== QuoteStatus.DRAFT;

    // Recalculate totals
    useEffect(() => {
        const totalHT = quote.items.reduce((sum, item) => sum + item.total, 0);
        const totalTVA = roundCurrency(totalHT * 0.20);
        const totalTTC = roundCurrency(totalHT + totalTVA);
        
        setQuote(prev => ({ ...prev, totalHT: roundCurrency(totalHT), totalTVA, totalTTC }));
    }, [quote.items]);

    const handleClientChange = (clientId: string) => {
        setQuote({ ...quote, clientId });
    };

    const handleAddItem = () => {
        const newItem: QuoteItem = {
            id: String(Date.now()),
            description: '',
            materialQty: 0,
            materialCost: 0,
            laborTime: 0,
            machineType: MachineType.ETUDE,
            laborRate: hourlyRates.find(r => r.machineType === MachineType.ETUDE)?.rate || 0,
            total: 0
        };
        setQuote({ ...quote, items: [...quote.items, newItem] });
    };

    const handleDeleteItem = (id: string) => {
        if(isLocked) return;
        setQuote({ ...quote, items: quote.items.filter(i => i.id !== id) });
    };

    const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
        if(isLocked) return;
        
        setQuote(prev => {
            const newItems = prev.items.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    if (field === 'machineType') {
                        updated.laborRate = hourlyRates.find(r => r.machineType === value)?.rate || 0;
                    }
                    
                    if (field === 'materialId') {
                        const mat = materials.find(m => m.id === value);
                        if (mat) updated.materialCost = mat.unitPrice;
                    }

                    const matTotal = updated.materialQty * updated.materialCost;
                    const laborTotal = updated.laborTime * updated.laborRate;
                    updated.total = roundCurrency(matTotal + laborTotal);

                    return updated;
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const handleImportCalculation = (machineType: MachineType, hours: number, description: string) => {
        const rate = hourlyRates.find(r => r.machineType === machineType)?.rate || 0;
        const newItem: QuoteItem = {
            id: String(Date.now()),
            description: description,
            materialQty: 0,
            materialCost: 0,
            laborTime: roundCurrency(hours),
            machineType: machineType,
            laborRate: rate,
            total: roundCurrency(hours * rate)
        };
        setQuote(prev => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const handleSave = () => {
        onSave(quote);
        QuoteDataService.addAuditLog(quote.id, 'UPDATED', `Devis ${quote.id} sauvegardé manuellement.`);
        alert("Devis sauvegardé !");
    };

    const handleValidate = () => {
        if (window.confirm("Valider ce devis ? Il ne sera plus modifiable.")) {
            const validatedQuote = { ...quote, status: QuoteStatus.VALIDATED };
            setQuote(validatedQuote);
            onSave(validatedQuote);
            QuoteDataService.addAuditLog(quote.id, 'VALIDATED', `Devis ${quote.id} validé.`);
        }
    };

    const handleGeneratePDF = async () => {
        const element = document.getElementById('quote-pdf-content');
        if(!element) return;

        try {
            // Use html2canvas with higher scale for better resolution
            const canvas = await html2canvas(element, { 
                scale: 3,
                useCORS: true,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${quote.id}_${quote.object.replace(/\s+/g, '_')}.pdf`);
            
            QuoteDataService.addAuditLog(quote.id, 'EXPORTED', `Export PDF généré.`);
        } catch (e) {
            console.error("PDF Gen Error", e);
            alert("Erreur lors de la génération PDF");
        }
    };

    const client = clients.find(c => c.id === quote.clientId);

    return (
        <div className="flex flex-col h-full bg-slate-100">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                        <ArrowLeft size={16} /> Retour
                    </button>
                    <div className="h-6 w-px bg-slate-300"></div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-800">{quote.id}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${quote.status === QuoteStatus.VALIDATED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                            {quote.status === QuoteStatus.VALIDATED ? 'VALIDÉ' : 'BROUILLON'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isLocked && (
                         <button 
                            onClick={() => setShowCalculator(!showCalculator)} 
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all shadow-sm ${showCalculator ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}
                         >
                            <Calculator size={18} /> 
                            Assistant Calcul
                            {showCalculator ? <ChevronRight size={16} /> : null}
                        </button>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md text-sm font-medium">
                        <Save size={16} /> Sauvegarder
                    </button>
                    {quote.status !== QuoteStatus.VALIDATED ? (
                        <button onClick={handleValidate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium shadow-sm">
                            <FileCheck size={16} /> Valider
                        </button>
                    ) : (
                        <button onClick={handleGeneratePDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 text-sm font-medium shadow-sm">
                            <Printer size={16} /> Imprimer PDF
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Main Content (Quote Form) */}
                <div className={`flex-1 overflow-auto p-8 flex justify-center transition-all duration-300 bg-slate-100 ${showCalculator ? 'w-3/5' : 'w-full'}`}>
                    {/* A4 Page Container */}
                    <div id="quote-pdf-content" className="bg-white shadow-lg border border-slate-200 w-[210mm] min-h-[297mm] p-[15mm] flex flex-col relative text-slate-900 transform scale-95 origin-top font-sans">
                        
                        {/* 1. Header with Logo & Company Info */}
                        <div className="flex justify-between mb-12 border-b-2 border-slate-100 pb-6">
                            <div className="w-1/2">
                                {/* Styled Text Logo */}
                                <h1 className="text-3xl font-extrabold text-blue-800 mb-4 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                                    {companyConfig?.logoText || companyConfig?.name || 'ENTREPRISE'}
                                </h1>
                                <div className="text-sm text-slate-500 space-y-1">
                                    <p className="font-medium text-slate-800">{companyConfig?.name}</p>
                                    <p>{companyConfig?.addressLine1}</p>
                                    <p>{companyConfig?.addressLine2}</p>
                                    <p>Tél: {companyConfig?.phone}</p>
                                    <p>Email: {companyConfig?.email}</p>
                                </div>
                            </div>
                            <div className="text-right w-1/2">
                                <h2 className="text-4xl font-light text-slate-300 mb-6 uppercase tracking-widest">Devis</h2>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-end gap-4">
                                        <span className="font-bold text-slate-700">Numéro :</span>
                                        <span className="font-mono text-slate-900">{quote.id}</span>
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <span className="font-bold text-slate-700">Date :</span>
                                        <span>{new Date(quote.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <span className="font-bold text-slate-700">Validité :</span>
                                        <span>30 jours</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Client & Project Info */}
                        <div className="flex justify-between items-start mb-10 gap-8">
                            <div className="flex-1">
                                <div className="mb-6">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Objet</p>
                                    <input 
                                        className="w-full font-semibold text-slate-900 text-lg border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none bg-transparent placeholder:font-normal"
                                        value={quote.object}
                                        onChange={e => !isLocked && setQuote({...quote, object: e.target.value})}
                                        placeholder="Saisir l'objet du devis..."
                                        disabled={isLocked}
                                    />
                                </div>
                                
                                <div className="bg-slate-50 p-3 rounded border border-slate-200 inline-block w-full">
                                     <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                        <LayoutGrid size={12} /> Projet Lié
                                     </p>
                                     <select
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                                        value={quote.projectId || ''}
                                        onChange={e => !isLocked && setQuote({...quote, projectId: e.target.value})}
                                        disabled={isLocked}
                                    >
                                        <option value="">-- Aucun --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="w-2/5">
                                <div className="border rounded-lg p-5 bg-slate-50">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">Client</p>
                                    {isLocked ? (
                                        <div className="text-sm">
                                            <p className="font-bold text-slate-900 text-base mb-1">{client?.companyName}</p>
                                            <p className="text-slate-700 mb-2">{client?.contactName}</p>
                                            <p className="text-slate-500 whitespace-pre-wrap leading-relaxed">{client?.address}</p>
                                        </div>
                                    ) : (
                                        <select 
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none text-sm font-medium mb-3"
                                            value={quote.clientId}
                                            onChange={e => handleClientChange(e.target.value)}
                                        >
                                            <option value="">Sélectionner un client...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                        </select>
                                    )}
                                    {!isLocked && client && (
                                        <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                            <p className="font-medium">{client.contactName}</p>
                                            <p>{client.address}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="flex-1 mb-8">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="py-3 px-3 text-left w-1/3 rounded-tl-lg border-b border-slate-200">Description</th>
                                        <th className="py-3 px-3 text-left border-b border-slate-200">Matière</th>
                                        <th className="py-3 px-3 text-right border-b border-slate-200">Mat. HT</th>
                                        <th className="py-3 px-3 text-center border-b border-slate-200">MO (h)</th>
                                        <th className="py-3 px-3 text-right border-b border-slate-200">Taux</th>
                                        <th className="py-3 px-3 text-right rounded-tr-lg border-b border-slate-200">Total HT</th>
                                        {!isLocked && <th className="py-3 px-3 w-8 border-b border-slate-200"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {quote.items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="p-2 align-top">
                                                <textarea 
                                                    className="w-full bg-transparent outline-none resize-none overflow-hidden text-slate-700" 
                                                    rows={1}
                                                    value={item.description} 
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)} 
                                                    placeholder="Description..."
                                                    disabled={isLocked}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = target.scrollHeight + 'px';
                                                    }}
                                                />
                                            </td>
                                            <td className="p-2 align-top text-xs">
                                                <div className="flex flex-col gap-1.5">
                                                    <select 
                                                        className="bg-transparent outline-none w-full border-b border-transparent hover:border-slate-200 focus:border-blue-400 text-slate-600"
                                                        value={item.materialId || ''}
                                                        onChange={e => updateItem(item.id, 'materialId', e.target.value)}
                                                        disabled={isLocked}
                                                    >
                                                        <option value="">-</option>
                                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unitPrice}€)</option>)}
                                                    </select>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400">Qté:</span>
                                                        <input 
                                                            type="number" min="0" step="0.1"
                                                            className="w-16 border border-slate-200 rounded px-1 bg-white text-right"
                                                            value={item.materialQty}
                                                            onChange={e => updateItem(item.id, 'materialQty', Number(e.target.value))}
                                                            disabled={isLocked}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 align-top text-right text-xs text-slate-500 pt-3">
                                                 {(item.materialQty * item.materialCost).toFixed(2)} €
                                            </td>
                                            <td className="p-2 align-top">
                                                 <div className="flex flex-col gap-1.5">
                                                     <select 
                                                        className="bg-transparent outline-none w-full text-xs border-b border-transparent hover:border-slate-200 focus:border-blue-400 text-center"
                                                        value={item.machineType}
                                                        onChange={e => updateItem(item.id, 'machineType', e.target.value)}
                                                        disabled={isLocked}
                                                     >
                                                         {hourlyRates.map(r => <option key={r.machineType} value={r.machineType}>{r.machineType}</option>)}
                                                     </select>
                                                     <input 
                                                        type="number" min="0" step="0.1"
                                                        className="w-full text-center border border-slate-200 rounded px-1 bg-white"
                                                        value={item.laborTime}
                                                        onChange={e => updateItem(item.id, 'laborTime', Number(e.target.value))}
                                                        disabled={isLocked}
                                                    />
                                                 </div>
                                            </td>
                                            <td className="p-2 align-top text-right text-xs text-slate-500 pt-3">
                                                {item.laborRate} €/h
                                            </td>
                                            <td className="p-2 align-top text-right font-medium text-slate-800 pt-3">
                                                {item.total.toFixed(2)} €
                                            </td>
                                            {!isLocked && (
                                                <td className="p-2 align-top text-center pt-3">
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {!isLocked && (
                                        <tr>
                                            <td colSpan={7} className="p-2 border-t border-slate-100">
                                                <button onClick={handleAddItem} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                                    <Plus size={14} /> Ajouter une ligne
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Footer Totals */}
                        <div className="flex justify-end mt-auto">
                            <div className="w-72 space-y-3 text-right bg-slate-50 p-6 rounded-lg border border-slate-200">
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Total HT</span>
                                    <span>{quote.totalHT.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-slate-500 text-sm">
                                    <span>TVA (20%)</span>
                                    <span>{quote.totalTVA.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 text-xl border-t border-slate-300 pt-3 mt-1">
                                    <span>Total TTC</span>
                                    <span>{quote.totalTTC.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* 5. Legal Footer */}
                        <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                            {companyConfig?.footerText || "Mentions légales..."}
                        </div>
                    </div>
                </div>

                {/* Side Calculator Panel */}
                {showCalculator && (
                    <div className="w-[450px] border-l border-slate-200 bg-white shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                                    <Calculator size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Assistant Méthodes</h3>
                                    <p className="text-xs text-slate-500">Calcul temps machine</p>
                                </div>
                            </div>
                             <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/50">
                            <Calculators onImportResult={handleImportCalculation} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

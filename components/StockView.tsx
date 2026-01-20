
import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { PersistenceService } from '../services/persistenceService';
import { Plus, Search, AlertTriangle, Package, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, X, Save } from 'lucide-react';

export const StockView: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        setItems(PersistenceService.loadInventory());
    }, []);

    const saveItems = (newItems: InventoryItem[]) => {
        setItems(newItems);
        PersistenceService.saveInventory(newItems);
    };

    const handleDelete = (id: string) => {
        if(confirm('Supprimer cet article du stock ?')) {
            saveItems(items.filter(i => i.id !== id));
        }
    };

    const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newItem: InventoryItem = {
            id: editingItem ? editingItem.id : `inv-${Date.now()}`,
            reference: formData.get('reference') as string,
            name: formData.get('name') as string,
            category: formData.get('category') as any,
            quantity: Number(formData.get('quantity')),
            minQuantity: Number(formData.get('minQuantity')),
            unit: formData.get('unit') as string,
            unitPrice: Number(formData.get('unitPrice')),
            location: formData.get('location') as string
        };

        if (editingItem) {
            saveItems(items.map(i => i.id === newItem.id ? newItem : i));
        } else {
            saveItems([...items, newItem]);
        }
        setIsModalOpen(false);
    };

    const openModal = (item?: InventoryItem) => {
        setEditingItem(item || null);
        setIsModalOpen(true);
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.reference.toLowerCase().includes(search.toLowerCase());
        const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
        return matchesSearch && matchesCat;
    });

    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const lowStockCount = items.filter(i => i.quantity <= i.minQuantity).length;

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestion des Stocks</h1>
                    <p className="text-slate-500">Matières premières et consommables</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                        <span className="text-xs text-slate-500 uppercase font-bold">Valeur Totale</span>
                        <span className="font-mono text-lg font-bold text-slate-800">{totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    {lowStockCount > 0 && (
                        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200 shadow-sm flex items-center gap-2 text-red-700">
                            <AlertTriangle size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase">Alertes</span>
                                <span className="font-bold">{lowStockCount} article(s) bas</span>
                            </div>
                        </div>
                    )}
                    <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors">
                        <Plus size={20} /> Nouvel Article
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Rechercher référence, nom..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select 
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="ALL">Toutes catégories</option>
                        <option value="TOLE">Tôles</option>
                        <option value="PROFILE">Profilés</option>
                        <option value="QUINCAILLERIE">Quincaillerie</option>
                        <option value="CONSOMMABLE">Consommables</option>
                    </select>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Référence</th>
                                <th className="px-6 py-4">Désignation</th>
                                <th className="px-6 py-4">Catégorie</th>
                                <th className="px-6 py-4 text-center">Emplacement</th>
                                <th className="px-6 py-4 text-right">Quantité</th>
                                <th className="px-6 py-4 text-right">Valeur</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredItems.map(item => {
                                const isLow = item.quantity <= item.minQuantity;
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4 font-mono text-slate-600">{item.reference}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                            {isLow && (
                                                <div title={`Stock bas (Min: ${item.minQuantity})`}>
                                                    <AlertTriangle size={14} className="text-red-500" />
                                                </div>
                                            )}
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-500">{item.location || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                                {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {(item.quantity * item.unitPrice).toFixed(2)} €
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Aucun article trouvé.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{editingItem ? 'Modifier Article' : 'Nouvel Article'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Référence</label>
                                    <input name="reference" required defaultValue={editingItem?.reference} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="REF-123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catégorie</label>
                                    <select name="category" defaultValue={editingItem?.category || 'TOLE'} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
                                        <option value="TOLE">Tôle</option>
                                        <option value="PROFILE">Profilé</option>
                                        <option value="QUINCAILLERIE">Quincaillerie</option>
                                        <option value="CONSOMMABLE">Consommable</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Désignation</label>
                                <input name="name" required defaultValue={editingItem?.name} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Ex: Tôle Inox 304L - 2mm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantité Actuelle</label>
                                    <input name="quantity" type="number" step="0.01" required defaultValue={editingItem?.quantity} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil Alerte (Min)</label>
                                    <input name="minQuantity" type="number" step="0.01" required defaultValue={editingItem?.minQuantity || 5} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unité</label>
                                    <input name="unit" required defaultValue={editingItem?.unit || 'un'} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="un, kg, m²" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prix Unitaire (€)</label>
                                    <input name="unitPrice" type="number" step="0.01" required defaultValue={editingItem?.unitPrice || 0} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emplacement</label>
                                <input name="location" defaultValue={editingItem?.location} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Ex: RACK A3" />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium flex items-center gap-2"><Save size={18} /> Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

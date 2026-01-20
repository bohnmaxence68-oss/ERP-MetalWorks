
import React, { useState } from 'react';
import { Calculator, FoldVertical, Scissors, Disc, ArrowRight } from 'lucide-react';
import { calculateBendingTime, calculateLaserTime, calculatePunchingTime } from '../../services/quoteData';
import { MachineType } from '../../types';

interface CalculatorsProps {
    onImportResult: (machineType: MachineType, hours: number, description: string) => void;
}

export const Calculators: React.FC<CalculatorsProps> = ({ onImportResult }) => {
    const [activeTab, setActiveTab] = useState<'PLIAGE' | 'LASER' | 'POINCONNAGE'>('PLIAGE');

    // Bending State
    const [bendWeight, setBendWeight] = useState(0);
    const [bendCount, setBendCount] = useState(0);
    const [bendResult, setBendResult] = useState(0);

    // Laser State
    const [laserMat, setLaserMat] = useState('ACIER');
    const [laserThick, setLaserThick] = useState(1);
    const [laserPerim, setLaserPerim] = useState(0); // Meters
    const [laserPierce, setLaserPierce] = useState(0);
    const [laserResult, setLaserResult] = useState(0);

    // Punching State
    const [punchThick, setPunchThick] = useState(1);
    const [punchHits, setPunchHits] = useState(0);
    const [punchNibble, setPunchNibble] = useState(0);
    const [punchTools, setPunchTools] = useState(0);
    const [punchResult, setPunchResult] = useState(0);

    const handleCalculateBending = () => {
        const time = calculateBendingTime(bendWeight, bendCount);
        setBendResult(time);
    };

    const handleCalculateLaser = () => {
        const time = calculateLaserTime(laserMat, laserThick, laserPerim, laserPierce);
        setLaserResult(time);
    };

    const handleCalculatePunching = () => {
        const time = calculatePunchingTime(punchThick, punchHits, punchNibble, punchTools);
        setPunchResult(time);
    };

    const formatTime = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m (${hours.toFixed(3)} h)`;
    };

    return (
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 h-full flex flex-col">
            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-blue-600" />
                Calculatrices Méthodes
            </h4>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('PLIAGE')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'PLIAGE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FoldVertical className="w-4 h-4" /> Pliage
                </button>
                <button 
                    onClick={() => setActiveTab('LASER')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'LASER' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Scissors className="w-4 h-4" /> Découpe Laser
                </button>
                <button 
                    onClick={() => setActiveTab('POINCONNAGE')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'POINCONNAGE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Disc className="w-4 h-4" /> Poinçonnage
                </button>
            </div>

            {/* Bending Content */}
            {activeTab === 'PLIAGE' && (
                <div className="space-y-6 animate-in fade-in flex-1">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Poids de la pièce (kg)</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={bendWeight} onChange={e => setBendWeight(Number(e.target.value))} />
                            <p className="text-xs text-slate-400 mt-1">Impacte le temps de manutention</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nombre de Plis</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={bendCount} onChange={e => setBendCount(Number(e.target.value))} />
                        </div>
                    </div>
                    <button onClick={handleCalculateBending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm">Calculer</button>
                    {bendResult > 0 && (
                        <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-3 border border-blue-100">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-700 font-bold uppercase">Temps Estimé</span>
                                <span className="font-mono text-xl font-bold text-slate-900">{formatTime(bendResult)}</span>
                            </div>
                            <button 
                                onClick={() => onImportResult(MachineType.PLIAGE, bendResult, `Pliage: ${bendWeight}kg, ${bendCount} plis`)}
                                className="w-full flex items-center justify-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Importer ce temps <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Laser Content */}
            {activeTab === 'LASER' && (
                <div className="space-y-6 animate-in fade-in flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Matière</label>
                            <select className="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={laserMat} onChange={e => setLaserMat(e.target.value)}>
                                <option value="ACIER">Acier</option>
                                <option value="INOX">Inox</option>
                                <option value="ALU">Alu</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Épaisseur (mm)</label>
                            <input type="number" min="0" step="0.5" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={laserThick} onChange={e => setLaserThick(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nb Amorçages</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={laserPierce} onChange={e => setLaserPierce(Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Périmètre de Coupe (m)</label>
                            <input type="number" min="0" step="0.1" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={laserPerim} onChange={e => setLaserPerim(Number(e.target.value))} />
                        </div>
                    </div>
                    <button onClick={handleCalculateLaser} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm">Calculer</button>
                    {laserResult > 0 && (
                         <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-3 border border-blue-100">
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-700 font-bold uppercase">Temps Estimé</span>
                                <span className="font-mono text-xl font-bold text-slate-900">{formatTime(laserResult)}</span>
                            </div>
                            <button 
                                onClick={() => onImportResult(MachineType.LASER, laserResult, `Laser: ${laserMat} ${laserThick}mm, P=${laserPerim}m`)}
                                className="w-full flex items-center justify-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Importer ce temps <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

             {/* Punching Content */}
             {activeTab === 'POINCONNAGE' && (
                <div className="space-y-6 animate-in fade-in flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Épaisseur (mm)</label>
                            <input type="number" min="0" step="0.5" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={punchThick} onChange={e => setPunchThick(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nb Frappes</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={punchHits} onChange={e => setPunchHits(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Grignotage (m)</label>
                            <input type="number" min="0" step="0.1" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={punchNibble} onChange={e => setPunchNibble(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Chgmt Outils</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={punchTools} onChange={e => setPunchTools(Number(e.target.value))} />
                        </div>
                    </div>
                    <button onClick={handleCalculatePunching} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm">Calculer</button>
                    {punchResult > 0 && (
                         <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-3 border border-blue-100">
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-700 font-bold uppercase">Temps Estimé</span>
                                <span className="font-mono text-xl font-bold text-slate-900">{formatTime(punchResult)}</span>
                            </div>
                            <button 
                                onClick={() => onImportResult(MachineType.POINCONNAGE, punchResult, `Poinçon: ${punchThick}mm, F=${punchHits}, G=${punchNibble}m`)}
                                className="w-full flex items-center justify-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Importer ce temps <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


import React, { useState } from 'react';
import { Search, Hammer, QrCode, ArrowRight, Clock, Calendar } from 'lucide-react';
import { Project, User } from '../../types';

interface OperatorDashboardProps {
    projects: Project[];
    currentUser: User;
    onSelectProject: (id: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ projects, currentUser, onSelectProject }) => {
    const [search, setSearch] = useState('');

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.id.includes(search)
    );

    return (
        <div className="h-full flex flex-col bg-slate-100">
            {/* Header / Welcome */}
            <div className="bg-slate-900 text-white p-8 pb-16 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Bonjour, {currentUser.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400">Prêt à travailler ? Sélectionnez ou scannez un projet pour commencer.</p>
                </div>
            </div>

            {/* Search Box - Overlapping Header */}
            <div className="max-w-4xl mx-auto w-full px-4 -mt-8 mb-8">
                <div className="bg-white rounded-xl shadow-xl p-4 flex items-center gap-4 border border-slate-200">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Search size={24} />
                    </div>
                    <input 
                        className="flex-1 text-lg outline-none placeholder:text-slate-300"
                        placeholder="Rechercher un projet (Nom, N°...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <button className="p-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" title="Scanner QR Code (Simulation)">
                        <QrCode size={24} />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Hammer className="w-5 h-5" />
                        Projets disponibles
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProjects.map(project => {
                            // Calculate basic progress
                            const totalTasks = project.tasks.length;
                            const doneTasks = project.tasks.filter(t => t.status === 'DONE').length;
                            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                            return (
                                <button 
                                    key={project.id}
                                    onClick={() => onSelectProject(project.id)}
                                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Hammer size={64} className="text-blue-600" />
                                    </div>

                                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {project.startDate.toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {totalTasks} tâches</span>
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <div className="flex-1 mr-6">
                                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                                <span>Avancement</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        
                        {filteredProjects.length === 0 && (
                            <div className="col-span-2 py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                Aucun projet trouvé pour "{search}".
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

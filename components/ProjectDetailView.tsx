
import React, { useState, useEffect, useMemo } from 'react';
import { GanttView } from './Gantt/GanttView';
import { QuoteModule } from './Quotes/QuoteModule';
import { ProductionModule } from './Production/ProductionModule';
import { Project, User, Role, Task, TaskStatus } from '../types';
import { Calendar, FileText, Hammer, LayoutGrid, Lock, Network, HardHat, PenTool, LayoutDashboard } from 'lucide-react';
import { checkProjectPermission } from '../App';
import { ProductionService } from '../services/productionService';

interface ProjectDetailViewProps {
    project: Project;
    users: User[];
    currentUser: User;
    currentRole: Role;
    onProjectUpdate: (p: Project) => void;
    projectsList: Project[]; 
    initialTab?: 'PLANNING' | 'QUOTES' | 'WORKSHOP' | 'METHODS' | 'MANAGER';
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, users, currentUser, currentRole, onProjectUpdate, projectsList, initialTab }) => {
    
    // Check Permissions using new granular keys
    const canView = checkProjectPermission(currentUser, currentRole, project.id, 'VIEW_PROJECT');
    const canAccessBE = checkProjectPermission(currentUser, currentRole, project.id, 'ACCESS_BE');
    const canAccessMethods = checkProjectPermission(currentUser, currentRole, project.id, 'ACCESS_METHODS');
    const canAccessWorkshop = checkProjectPermission(currentUser, currentRole, project.id, 'ACCESS_WORKSHOP');
    const canAccessQuotes = checkProjectPermission(currentUser, currentRole, project.id, 'ACCESS_QUOTES');
    const canAccessManager = checkProjectPermission(currentUser, currentRole, project.id, 'ACCESS_GLOBAL_FOLLOWUP');
    
    // Determine default tab
    const [activeTab, setActiveTab] = useState<'BE' | 'METHODS' | 'WORKSHOP' | 'MANAGER' | 'QUOTES'>(() => {
        if (initialTab === 'PLANNING' && canAccessBE) return 'BE';
        if (initialTab === 'METHODS' && canAccessMethods) return 'METHODS';
        if (initialTab === 'WORKSHOP' && canAccessWorkshop) return 'WORKSHOP';
        if (initialTab === 'MANAGER' && canAccessManager) return 'MANAGER';
        if (initialTab === 'QUOTES' && canAccessQuotes) return 'QUOTES';
        
        // Fallback priority
        if (canAccessBE) return 'BE';
        if (canAccessMethods) return 'METHODS';
        if (canAccessWorkshop) return 'WORKSHOP';
        if (canAccessQuotes) return 'QUOTES';
        if (canAccessManager) return 'MANAGER';
        return 'BE';
    });

    useEffect(() => {
        if (initialTab) {
             if (initialTab === 'PLANNING' && canAccessBE) setActiveTab('BE');
             else if (initialTab === 'METHODS' && canAccessMethods) setActiveTab('METHODS');
             else if (initialTab === 'WORKSHOP' && canAccessWorkshop) setActiveTab('WORKSHOP');
             else if (initialTab === 'MANAGER' && canAccessManager) setActiveTab('MANAGER');
             else if (initialTab === 'QUOTES' && canAccessQuotes) setActiveTab('QUOTES');
        }
    }, [initialTab, canAccessBE, canAccessMethods, canAccessWorkshop, canAccessManager, canAccessQuotes]);

    if (!canView) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Lock size={48} className="mb-4" />
                <h2 className="text-xl font-bold">Accès Refusé</h2>
                <p>Vous n'avez pas les droits pour voir ce projet.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Project Header & Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                        <p className="text-sm text-slate-500">
                            Début: {project.startDate.toLocaleDateString()} • {project.tasks.length} tâches
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-slate-100 overflow-x-auto">
                    {/* Bureau d'Etudes */}
                    {canAccessBE && (
                        <button 
                            onClick={() => setActiveTab('BE')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'BE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <PenTool size={16} /> Bureau d'Études
                        </button>
                    )}

                    {/* Methods */}
                    {canAccessMethods && (
                        <button 
                            onClick={() => setActiveTab('METHODS')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'METHODS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Network size={16} /> Méthodes & Ordonnancement
                        </button>
                    )}

                    {/* Atelier */}
                    {canAccessWorkshop && (
                        <button 
                            onClick={() => setActiveTab('WORKSHOP')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'WORKSHOP' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Hammer size={16} /> Atelier
                        </button>
                    )}

                    {/* Manager Tab */}
                    {canAccessManager && (
                        <button 
                            onClick={() => setActiveTab('MANAGER')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'MANAGER' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <LayoutDashboard size={16} /> Suivi Global
                        </button>
                    )}
                    
                    {/* Quotes */}
                    {canAccessQuotes && (
                        <button 
                            onClick={() => setActiveTab('QUOTES')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'QUOTES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <FileText size={16} /> Devis
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
                {activeTab === 'BE' && canAccessBE && (
                    <div className={`h-full flex flex-col relative`}>
                         <div className="bg-slate-50 border border-slate-200 p-2 mb-2 rounded text-xs text-slate-500 flex justify-center">
                             Planning des tâches d'études (Conception, Prog. TopSolid, Validation).
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <GanttView 
                                project={project} 
                                users={users} 
                                onProjectUpdate={onProjectUpdate} 
                                title="Planning Bureau d'Études"
                                currentUser={currentUser}
                                readOnly={false} 
                                allowExecution={true}
                            />
                         </div>
                    </div>
                )}

                {activeTab === 'WORKSHOP' && canAccessWorkshop && (
                    <div className="h-full bg-white rounded-lg border border-slate-200 p-4 overflow-hidden">
                        <ProductionModule forcedProjectId={project.id} mode="WORKSHOP_ONLY" currentUser={currentUser} />
                    </div>
                )}

                {activeTab === 'METHODS' && canAccessMethods && (
                    <div className="h-full bg-white rounded-lg border border-slate-200 p-4 overflow-hidden">
                        <ProductionModule forcedProjectId={project.id} mode="METHODS_ONLY" currentUser={currentUser} />
                    </div>
                )}

                {activeTab === 'MANAGER' && canAccessManager && (
                    <div className="h-full bg-white rounded-lg border border-slate-200 p-4 overflow-hidden">
                        <ProductionModule forcedProjectId={project.id} mode="MANAGER" currentUser={currentUser} users={users} />
                    </div>
                )}

                {activeTab === 'QUOTES' && canAccessQuotes && (
                    <div className="h-full bg-white rounded-lg border border-slate-200 p-4 overflow-hidden">
                        <QuoteModule projects={projectsList} forcedProjectId={project.id} />
                    </div>
                )}
            </div>
        </div>
    );
};

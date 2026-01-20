import React, { useState } from 'react';
import { Plus, Calendar, Clock, ChevronRight, BarChart3, Search } from 'lucide-react';
import { Project } from '../types';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, date: Date) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onCreateProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDate, setNewProjectDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectDate) {
      onCreateProject(newProjectName, new Date(newProjectDate));
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectDate('');
    }
  };

  const calculateProgress = (project: Project) => {
    if (project.tasks.length === 0) return 0;
    const total = project.tasks.length;
    const completed = project.tasks.filter(t => t.status === 'DONE').length;
    // Simple calc, could be duration weighted
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord</h1>
          <p className="text-slate-500">Vue d'ensemble des projets en cours</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={20} />
          Nouveau Projet
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-blue-100 animate-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">Créer un nouveau projet</h3>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom du projet</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Structure Métallique Hangar B"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newProjectDate}
                onChange={(e) => setNewProjectDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Annuler
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const progress = calculateProgress(project);
          return (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {progress === 100 ? 'Terminé' : 'En cours'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                {project.name}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {project.startDate.toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {project.tasks.length} tâches
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Progression</span>
                  <span className="text-slate-900 font-bold">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
             <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Calendar className="text-slate-400" size={32} />
             </div>
             <h3 className="text-lg font-medium text-slate-900">Aucun projet</h3>
             <p className="text-slate-500 mt-1">Commencez par créer un nouveau projet de production.</p>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, BarChart3, Trash2, Wand2, Loader2, Search, Lock, Crown, Edit, TrendingUp, AlertTriangle, CheckCircle, ListChecks, Megaphone, Info, Zap, PenTool, Hammer } from 'lucide-react';
import { Project, User, FilterState, Task, Role, TaskStatus, Announcement } from '../types';
import { FilterBar } from './FilterBar';
import { generateProjectPlan } from '../services/geminiService';
import { checkGlobalPermission, checkProjectPermission } from '../App';

interface ProjectListProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  currentRole: Role;
  onSelectProject: (id: string, tab?: 'PLANNING' | 'QUOTES' | 'WORKSHOP' | 'METHODS') => void;
  onCreateProject: (name: string, date: Date, managerId?: string, initialTasks?: Task[]) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ 
    projects, users, currentUser, currentRole, onSelectProject, onCreateProject, onUpdateProject, onDeleteProject,
    announcements, onAddAnnouncement, onDeleteAnnouncement
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null); // If set, we are editing
  
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDate, setNewProjectDate] = useState('');
  const [newProjectManagerId, setNewProjectManagerId] = useState('');
  const [description, setDescription] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Announcement State
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementData, setAnnouncementData] = useState({ title: '', message: '', type: 'INFO' as 'INFO' | 'MAINTENANCE' | 'NEWS' });

  // Load initial filters from localStorage or default
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('projectListFilters');
    return saved ? JSON.parse(saved) : { status: 'ALL', userId: 'ALL' };
  });

  // Persist filters when changed
  useEffect(() => {
    localStorage.setItem('projectListFilters', JSON.stringify(filters));
  }, [filters]);

  const openCreateModal = () => {
      setEditingProjectId(null);
      setNewProjectName('');
      setNewProjectDate(new Date().toISOString().split('T')[0]);
      setNewProjectManagerId('');
      setDescription('');
      setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setEditingProjectId(project.id);
      setNewProjectName(project.name);
      setNewProjectDate(new Date(project.startDate).toISOString().split('T')[0]);
      setNewProjectManagerId(project.managerId || '');
      setDescription(''); // Description is for generation only, cleared on edit
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectDate) {
      
      // EDIT MODE
      if (editingProjectId) {
          const originalProject = projects.find(p => p.id === editingProjectId);
          if (originalProject) {
              const updatedProject: Project = {
                  ...originalProject,
                  name: newProjectName,
                  startDate: new Date(newProjectDate),
                  managerId: newProjectManagerId || undefined
              };
              onUpdateProject(updatedProject);
          }
      } 
      // CREATE MODE
      else {
          let initialTasks: Task[] = [];
          
          if (description.trim()) {
            setIsGenerating(true);
            try {
              initialTasks = await generateProjectPlan(description);
            } catch (error) {
              console.error("Failed to generate tasks", error);
            } finally {
              setIsGenerating(false);
            }
          }

          onCreateProject(newProjectName, new Date(newProjectDate), newProjectManagerId || undefined, initialTasks);
      }
      
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDate('');
      setNewProjectManagerId('');
      setDescription('');
      setEditingProjectId(null);
    }
  };

  const calculateProgressDetail = (project: Project) => {
    const conceptKeywords = ['étude', 'plan', 'conception', 'commande', 'réception', 'dessin', 'validation'];
    
    const conceptTasks = project.tasks.filter(t => conceptKeywords.some(kw => t.name.toLowerCase().includes(kw)));
    const fabTasks = project.tasks.filter(t => !conceptKeywords.some(kw => t.name.toLowerCase().includes(kw)));

    const calc = (tasks: Task[]) => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.status === 'DONE').length;
        return Math.round((completed / tasks.length) * 100);
    };

    return {
        concept: calc(conceptTasks),
        fab: calc(fabTasks),
        total: calc(project.tasks)
    };
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.')) {
      onDeleteProject(id);
    }
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
      e.preventDefault();
      onAddAnnouncement({
          id: `ann-${Date.now()}`,
          title: announcementData.title,
          message: announcementData.message,
          type: announcementData.type,
          date: new Date(),
          authorName: currentUser.name
      });
      setIsAnnouncementModalOpen(false);
      setAnnouncementData({ title: '', message: '', type: 'INFO' });
  };

  // Filter Projects based on SEARCH + FILTERS + PERMISSIONS
  const filteredProjects = projects.filter(project => {
    // 1. Permission Check
    const hasViewAll = checkGlobalPermission(currentUser, currentRole, 'VIEW_ALL_PROJECTS');
    const hasProjectView = checkProjectPermission(currentUser, currentRole, project.id, 'VIEW_PROJECT');
    
    if (!hasViewAll && !hasProjectView) {
        return false;
    }

    // 2. Search Filter
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }

    // 3. Status/User Filter
    if (filters.status !== 'ALL') {
      const { total: progress } = calculateProgressDetail(project);
      const hasBlockedTask = project.tasks.some(t => t.status === 'BLOCKED');

      if (filters.status === 'DONE' && progress < 100) return false;
      if (filters.status === 'TODO' && progress > 0) return false;
      if (filters.status === 'IN_PROGRESS' && (progress === 0 || progress === 100)) return false;
      if (filters.status === 'BLOCKED' && !hasBlockedTask) return false;
    }

    if (filters.userId !== 'ALL') {
      const hasAssignedTask = project.tasks.some(t => t.assignedTo === filters.userId);
      const isManager = project.managerId === filters.userId;
      if (!hasAssignedTask && !isManager) return false;
    }

    return true;
  });

  // --- KPI CALCULATIONS ---
  const kpiStats = {
      activeProjects: projects.filter(p => calculateProgressDetail(p).total < 100).length,
      lateTasks: projects.flatMap(p => p.tasks).filter(t => t.status !== TaskStatus.DONE && t.endDate && new Date(t.endDate) < new Date()).length,
      completedMonth: projects.filter(p => calculateProgressDetail(p).total === 100).length // Rough approximation
  };

  // Permissions
  const canCreate = checkGlobalPermission(currentUser, currentRole, 'CREATE_PROJECT');
  const canDelete = checkGlobalPermission(currentUser, currentRole, 'DELETE_PROJECT');
  const canManageAnnouncements = checkGlobalPermission(currentUser, currentRole, 'MANAGE_ANNOUNCEMENTS');

  return (
    <div className="max-w-[1920px] mx-auto py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord</h1>
          <p className="text-slate-500">Vue d'ensemble et pilotage</p>
        </div>
        <div className="flex gap-2">
            {canCreate && (
                <button 
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                >
                <Plus size={20} />
                <span className="hidden sm:inline">Nouveau Projet</span>
                </button>
            )}
        </div>
      </div>

      {/* --- ANNOUNCEMENTS SECTION --- */}
      <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" /> Annonces & Actualités
              </h3>
              {canManageAnnouncements && (
                  <button 
                      onClick={() => setIsAnnouncementModalOpen(true)}
                      className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 font-medium"
                  >
                      + Publier
                  </button>
              )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(ann => (
                  <div key={ann.id} className={`p-5 rounded-xl border relative group shadow-sm ${
                      ann.type === 'MAINTENANCE' ? 'bg-amber-50 border-amber-200' :
                      ann.type === 'NEWS' ? 'bg-emerald-50 border-emerald-200' :
                      'bg-blue-50 border-blue-200'
                  }`}>
                      {canManageAnnouncements && (
                          <button onClick={() => onDeleteAnnouncement(ann.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                          {ann.type === 'MAINTENANCE' ? <AlertTriangle size={18} className="text-amber-600" /> :
                           ann.type === 'NEWS' ? <Zap size={18} className="text-emerald-600" /> :
                           <Info size={18} className="text-blue-600" />}
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              ann.type === 'MAINTENANCE' ? 'bg-amber-200 text-amber-800' :
                              ann.type === 'NEWS' ? 'bg-emerald-200 text-emerald-800' :
                              'bg-blue-200 text-blue-800'
                          }`}>{ann.type}</span>
                          <span className="text-xs text-slate-500 ml-auto font-medium">{ann.date.toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">{ann.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{ann.message}</p>
                      <div className="mt-4 pt-2 border-t border-black/5 text-[10px] text-slate-400 font-medium uppercase tracking-wide">Publié par {ann.authorName}</div>
                  </div>
              ))}
              {announcements.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Aucune annonce récente.
                  </div>
              )}
          </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                  <TrendingUp size={28} />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Projets Actifs</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{kpiStats.activeProjects}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-red-100 text-red-600 rounded-xl">
                  <AlertTriangle size={28} />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tâches en Retard</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{kpiStats.lateTasks}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
                  <CheckCircle size={28} />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Terminés (Total)</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{kpiStats.completedMonth}</p>
              </div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
         {/* Search Bar */}
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <input 
                type="text" 
                placeholder="Rechercher un projet..." 
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <div className="flex-shrink-0">
             <FilterBar users={users} filters={filters} onFilterChange={setFilters} />
         </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-2xl border border-blue-100 animate-in zoom-in-95">
              <h3 className="font-semibold text-slate-800 mb-4">{editingProjectId ? 'Modifier le projet' : 'Créer un nouveau projet'}</h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom du projet</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      placeholder="Ex: Structure Métallique Hangar B"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                        <input 
                          type="date" 
                          required
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                          value={newProjectDate}
                          onChange={(e) => setNewProjectDate(e.target.value)}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chef de Projet</label>
                        <select 
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                          value={newProjectManagerId}
                          onChange={(e) => setNewProjectManagerId(e.target.value)}
                          disabled={isGenerating}
                        >
                            <option value="">-- Aucun --</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                  </div>
                </div>
                
                {/* Only show AI Generation on Creation */}
                {!editingProjectId && (
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                         <Wand2 className="w-4 h-4 text-purple-600" />
                         Description pour génération automatique (Optionnel)
                       </label>
                       <textarea
                         className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm bg-white text-slate-900"
                         placeholder="Décrivez le projet (ex: Fabrication d'une cuve de 5000L en inox 304L avec piquages et trou d'homme) pour générer les tâches automatiquement..."
                         value={description}
                         onChange={(e) => setDescription(e.target.value)}
                         disabled={isGenerating}
                       />
                       <p className="text-xs text-slate-400 mt-1">L'IA générera automatiquement la liste des tâches et les dépendances.</p>
                    </div>
                )}

                <div className="flex gap-2 justify-end mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsModalOpen(false); setEditingProjectId(null); }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    disabled={isGenerating}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isGenerating}
                    className={`px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      editingProjectId ? 'Enregistrer' : 'Créer'
                    )}
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-2xl animate-in zoom-in-95">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Nouvelle Annonce</h3>
                  <form onSubmit={handlePostAnnouncement} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre</label>
                          <input required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" value={announcementData.title} onChange={e => setAnnouncementData({...announcementData, title: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                          <select className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" value={announcementData.type} onChange={e => setAnnouncementData({...announcementData, type: e.target.value as any})}>
                              <option value="INFO">Information</option>
                              <option value="MAINTENANCE">Maintenance</option>
                              <option value="NEWS">Nouveauté</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                          <textarea required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 h-24 resize-none" value={announcementData.message} onChange={e => setAnnouncementData({...announcementData, message: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Publier</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* PROJECT GRID - INCREASED GAP & COLS FOR 2XL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredProjects.map((project) => {
          const progressDetail = calculateProgressDetail(project);
          const manager = users.find(u => u.id === project.managerId);
          // Allow edit if global Permission or if user is manager
          const canEditProject = canCreate || (currentUser.id === project.managerId);

          return (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative flex flex-col h-full"
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {canEditProject && (
                      <button
                        onClick={(e) => openEditModal(e, project)}
                        className="p-2 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier le projet"
                      >
                        <Edit size={16} />
                      </button>
                  )}
                  {canDelete && (
                      <button
                        onClick={(e) => handleDeleteClick(e, project.id)}
                        className="p-2 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer le projet"
                      >
                        <Trash2 size={16} />
                      </button>
                  )}
              </div>

              <div className="flex justify-between items-start mb-5 pr-16">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <BarChart3 size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${progressDetail.total === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                  {progressDetail.total === 100 ? 'Terminé' : 'En cours'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors truncate pr-2">
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

              {/* Manager Display */}
              {manager && (
                  <div className="mb-6 flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                          {manager.avatar}
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Chef de Projet</span>
                          <span className="text-xs font-medium text-slate-700 leading-none">{manager.name}</span>
                      </div>
                      <Crown size={14} className="ml-auto text-amber-400" fill="currentColor" />
                  </div>
              )}

              {/* PROGRESS BARS (DUAL) */}
              <div className="mt-auto space-y-4">
                {/* Conception Bar */}
                <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1.5"><PenTool size={12} /> Conception</span>
                        <span>{progressDetail.concept}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                            style={{ width: `${progressDetail.concept}%` }}
                        ></div>
                    </div>
                </div>
                {/* Fabrication Bar */}
                <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1.5"><Hammer size={12} /> Fabrication</span>
                        <span>{progressDetail.fab}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${progressDetail.fab}%` }}
                        ></div>
                    </div>
                </div>
              </div>

              {/* ACTION BUTTONS (UPDATED) */}
              <div className="mt-6 flex gap-3 pt-5 border-t border-slate-100">
                  <button 
                      onClick={(e) => { e.stopPropagation(); onSelectProject(project.id, 'WORKSHOP'); }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors border border-indigo-100"
                  >
                      <ListChecks size={16} /> Vue Atelier
                  </button>
                  <button 
                      onClick={(e) => { e.stopPropagation(); onSelectProject(project.id, 'PLANNING'); }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow"
                  >
                      <Edit size={16} /> Édition
                  </button>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !isModalOpen && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
             <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
               <Calendar className="text-slate-300" size={40} />
             </div>
             <h3 className="text-xl font-medium text-slate-900">Aucun projet</h3>
             <p className="text-slate-500 mt-2">Commencez par créer un nouveau projet de production.</p>
          </div>
        )}
        
        {projects.length > 0 && filteredProjects.length === 0 && (
            <div className="col-span-full py-16 text-center flex flex-col items-center bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                <Lock className="text-slate-300 mb-3" size={48} />
                <p className="text-slate-600 font-medium text-lg">Accès restreint ou aucun résultat.</p>
                <p className="text-sm text-slate-400">Vous ne voyez que les projets qui vous sont assignés.</p>
            </div>
        )}
      </div>
    </div>
  );
};

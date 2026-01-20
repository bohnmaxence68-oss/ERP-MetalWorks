
import React, { useState, useMemo, useEffect } from 'react';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { ProjectList } from './components/ProjectList';
import { UserManagement } from './components/UserManagement';
import { QuoteSettings } from './components/Quotes/QuoteSettings';
import { ProjectDetailView } from './components/ProjectDetailView';
import { OperatorDashboard } from './components/Workshop/OperatorDashboard';
import { Project, TaskStatus, User, Notification, Task, Role, GlobalPermission, ProjectPermission, Announcement, GlobalAppConfig } from './types';
import { calculateSchedule } from './services/scheduler';
import { Users, FileCog, Cog, Package, Smartphone } from 'lucide-react';
import { PersistenceService } from './services/persistenceService';

// --- PERMISSION HELPERS ---
export const checkGlobalPermission = (user: User, role: Role, permission: GlobalPermission): boolean => {
    if (!user || !role) return false;
    return role.globalPermissions.includes(permission);
};

export const checkProjectPermission = (user: User, role: Role, projectId: string, permission: ProjectPermission): boolean => {
    if (!user || !role) return false;
    
    // Super admin role check (via global permission)
    if (role.globalPermissions.includes('VIEW_ALL_PROJECTS')) return true;

    const access = user.projectAccess[projectId];
    if (!access) return false;
    return access.includes(permission);
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('admin@metalworks.com');
  
  // Initialize State from PersistenceService
  const [projects, setProjects] = useState<Project[]>(() => PersistenceService.loadProjects());
  const [users, setUsers] = useState<User[]>(() => PersistenceService.loadUsers());
  const [roles, setRoles] = useState<Role[]>(() => PersistenceService.loadRoles());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => PersistenceService.loadAnnouncements());
  const [appConfig, setAppConfig] = useState<GlobalAppConfig>(() => PersistenceService.loadAppConfig());
  
  // --- AUTO-SAVE EFFECTS ---
  useEffect(() => { PersistenceService.saveProjects(projects); }, [projects]);
  useEffect(() => { PersistenceService.saveUsers(users); }, [users]);
  useEffect(() => { PersistenceService.saveRoles(roles); }, [roles]);
  useEffect(() => { PersistenceService.saveAnnouncements(announcements); }, [announcements]);
  useEffect(() => { PersistenceService.saveAppConfig(appConfig); }, [appConfig]);


  // Views
  const [currentView, setCurrentView] = useState<'dashboard' | 'project' | 'users' | 'settings' | 'stock'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // Add state for initial tab when navigating to project
  const [projectInitialTab, setProjectInitialTab] = useState<'PLANNING' | 'QUOTES' | 'WORKSHOP' | 'METHODS' | undefined>(undefined);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const currentUser = useMemo(() => users.find(u => u.email === currentUserEmail) || users[0], [users, currentUserEmail]);
  const currentRole = useMemo(() => roles.find(r => r.id === currentUser.roleId) || roles[roles.length - 1], [roles, currentUser]);

  const notifications = useMemo(() => {
      const msgs: Notification[] = [];
      const today = new Date();
      
      projects.forEach(project => {
          const hasAccess = checkGlobalPermission(currentUser, currentRole, 'VIEW_ALL_PROJECTS') || 
                            (currentUser.projectAccess[project.id] && currentUser.projectAccess[project.id].includes('VIEW_PROJECT'));
          
          if (!hasAccess) return;

          const scheduledTasks = calculateSchedule(project.startDate, project.tasks);
          scheduledTasks.forEach(task => {
              if (!task.endDate) return;
              if (task.status !== TaskStatus.DONE && new Date(task.endDate) < today) {
                  msgs.push({
                      id: `overdue-${task.id}`,
                      type: 'alert',
                      message: `Tâche en retard : "${task.name}" (Projet: ${project.name})`,
                      projectId: project.id,
                      taskId: task.id,
                      date: new Date()
                  });
              }
              const diffTime = new Date(task.endDate).getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (task.status !== TaskStatus.DONE && task.isCritical && diffDays >= 0 && diffDays <= 3) {
                  msgs.push({
                      id: `risk-${task.id}`,
                      type: 'warning',
                      message: `Chemin critique imminent : "${task.name}" (${diffDays}j).`,
                      projectId: project.id,
                      taskId: task.id,
                      date: new Date()
                  });
              }
          });
      });
      return msgs;
  }, [projects, currentUser, currentRole]);

  const handleCreateProject = (name: string, date: Date, managerId?: string, initialTasks: Task[] = []) => {
    const newProject: Project = { 
        id: String(Date.now()), 
        name, 
        startDate: date, 
        managerId,
        tasks: initialTasks 
    };
    setProjects([...projects, newProject]);
    
    let updatedUsers = [...users];

    // Auto-grant full rights to the creator if they don't have global view
    if (!currentRole.globalPermissions.includes('VIEW_ALL_PROJECTS')) {
        const userIndex = updatedUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex >= 0) {
            updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                projectAccess: {
                    ...updatedUsers[userIndex].projectAccess,
                    [newProject.id]: ['VIEW_PROJECT', 'ACCESS_BE', 'ACCESS_METHODS', 'ACCESS_WORKSHOP', 'ACCESS_QUOTES', 'ACCESS_GLOBAL_FOLLOWUP']
                }
            };
        }
    }

    if (managerId && managerId !== currentUser.id) {
        const managerIndex = updatedUsers.findIndex(u => u.id === managerId);
        if (managerIndex >= 0) {
             updatedUsers[managerIndex] = {
                ...updatedUsers[managerIndex],
                projectAccess: {
                    ...updatedUsers[managerIndex].projectAccess,
                    [newProject.id]: ['VIEW_PROJECT', 'ACCESS_BE', 'ACCESS_METHODS', 'ACCESS_WORKSHOP', 'ACCESS_QUOTES', 'ACCESS_GLOBAL_FOLLOWUP']
                }
            };
        }
    }

    setUsers(updatedUsers);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    if (selectedProjectId === id) {
        setSelectedProjectId(null);
        setCurrentView('dashboard');
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const navigateToProject = (id: string, tab?: 'PLANNING' | 'QUOTES' | 'WORKSHOP' | 'METHODS') => {
    setSelectedProjectId(id);
    setProjectInitialTab(tab);
    setCurrentView('project');
  };

  const handleNavigation = (view: any) => {
    setCurrentView(view);
    if(view !== 'project') setSelectedProjectId(null);
  };

  const handleAddAnnouncement = (ann: Announcement) => {
      setAnnouncements([ann, ...announcements]);
  };

  const handleDeleteAnnouncement = (id: string) => {
      if(confirm("Supprimer cette annonce ?")) {
          setAnnouncements(announcements.filter(a => a.id !== id));
      }
  };

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} appConfig={appConfig} />;

  const canManageUsers = checkGlobalPermission(currentUser, currentRole, 'MANAGE_USERS');
  const canManageSettings = checkGlobalPermission(currentUser, currentRole, 'MANAGE_SETTINGS');
  const isOperator = currentRole.id === 'ouvrier';

  // --- OPERATOR VIEW LOGIC ---
  if (isOperator && currentView !== 'project') {
      // Default Operator Dashboard
      return (
          <div className="h-screen flex flex-col">
              <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
                  <div className="flex items-center gap-2">
                      {appConfig.logoUrl && <img src={appConfig.logoUrl} className="h-8 w-8 rounded" />}
                      <h1 className="font-bold text-lg text-slate-800">{appConfig.appName} Atelier</h1>
                  </div>
                  <button onClick={() => setIsAuthenticated(false)} className="text-sm text-slate-500 hover:text-red-600 font-medium">Déconnexion</button>
              </header>
              <OperatorDashboard 
                  projects={projects} 
                  currentUser={currentUser} 
                  onSelectProject={navigateToProject} 
              />
          </div>
      );
  }

  // --- STANDARD VIEW LOGIC ---

  return (
    <Layout 
      onLogout={() => setIsAuthenticated(false)}
      currentView={currentView}
      onNavigate={handleNavigation}
      projects={projects}
      currentProjectId={selectedProjectId || undefined}
      onSelectProject={navigateToProject}
      notifications={notifications}
      currentUser={currentUser}
      currentRole={currentRole}
      appConfig={appConfig}
    >
      {/* GLOBAL DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="flex h-full gap-6">
            {/* LEFT: Project List (Main Activity) */}
            {/* UPDATED: Added overflow-y-auto to allow scrolling */}
            <div className="flex-1 overflow-y-auto flex flex-col pr-2">
                <ProjectList 
                  projects={projects}
                  users={users}
                  currentUser={currentUser}
                  currentRole={currentRole}
                  onSelectProject={navigateToProject}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                />
            </div>
            
            {/* RIGHT: Admin Panels */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Cog className="text-slate-500" /> Administration
                    </h3>
                    <div className="space-y-2">
                        {canManageUsers ? (
                            <button 
                                onClick={() => setCurrentView('users')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                            >
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-200">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">Gestion Équipes</p>
                                    <p className="text-xs text-slate-500">{users.length} collaborateurs</p>
                                </div>
                            </button>
                        ) : (
                             <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed">
                                <div className="bg-slate-200 text-slate-400 p-2 rounded-lg">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-500 text-sm">Gestion Équipes</p>
                                    <p className="text-xs text-slate-400">Accès restreint</p>
                                </div>
                            </div>
                        )}
                        
                        {canManageSettings ? (
                            <button 
                                onClick={() => setCurrentView('settings')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group"
                            >
                                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg group-hover:bg-emerald-200">
                                    <FileCog size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">Paramètres Global</p>
                                    <p className="text-xs text-slate-500">Taux, Matières, App</p>
                                </div>
                            </button>
                        ) : (
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed">
                                <div className="bg-slate-200 text-slate-400 p-2 rounded-lg">
                                    <FileCog size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-500 text-sm">Paramètres Global</p>
                                    <p className="text-xs text-slate-400">Accès restreint</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* SINGLE PROJECT CONTEXT VIEW */}
      {currentView === 'project' && activeProject && (
        <ProjectDetailView 
            key={activeProject.id}
            project={activeProject}
            users={users}
            currentUser={currentUser}
            currentRole={currentRole}
            onProjectUpdate={handleUpdateProject}
            projectsList={projects}
            initialTab={projectInitialTab}
        />
      )}

      {/* ADMIN VIEWS */}
      {currentView === 'users' && canManageUsers && (
        <UserManagement 
            users={users} 
            roles={roles}
            projects={projects}
            onUpdateUsers={setUsers} 
            onUpdateRoles={setRoles}
        />
      )}

      {/* SETTINGS VIEW */}
      {currentView === 'settings' && canManageSettings && (
        <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
            <QuoteSettings appConfig={appConfig} onUpdateAppConfig={setAppConfig} initialTab="SOFTWARE" />
        </div>
      )}
    </Layout>
  );
};

export default App;


import React, { useState } from 'react';
import { User as UserIcon, Settings, Plus, Trash2, Mail, Save, X, Shield, Briefcase, Wrench, Lock, CheckSquare, Square, ChevronRight, LayoutGrid, Eye } from 'lucide-react';
import { User, Role, Project, GlobalPermission, ProjectPermission } from '../types';
import { checkProjectPermission } from '../App';

interface UserManagementProps {
  users: User[];
  roles: Role[];
  projects: Project[];
  onUpdateUsers: (users: User[]) => void;
  onUpdateRoles: (roles: Role[]) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, roles, projects, onUpdateUsers, onUpdateRoles }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
  
  // --- USER MODAL STATE ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<Partial<User>>({});
  
  // --- ROLE MODAL STATE ---
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleData, setRoleData] = useState<Partial<Role>>({});

  // --- USER MANAGEMENT LOGIC ---

  const openAddUser = () => {
    setEditingUserId(null);
    setUserData({ name: '', email: '', roleId: roles.find(r => !r.isImmutable)?.id || roles[0].id, projectAccess: {} });
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserData({ ...user });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.name || !userData.email || !userData.roleId) return;

    if (editingUserId) {
        onUpdateUsers(users.map(u => u.id === editingUserId ? { ...u, ...userData } as User : u));
    } else {
        const newUser: User = {
            id: String(Date.now()),
            name: userData.name,
            email: userData.email,
            roleId: userData.roleId,
            avatar: userData.name.substring(0, 2).toUpperCase(),
            projectAccess: userData.projectAccess || {}
        };
        onUpdateUsers([...users, newUser]);
    }
    setIsUserModalOpen(false);
  };

  const toggleProjectPermission = (projectId: string, permission: ProjectPermission) => {
      const currentAccess = userData.projectAccess || {};
      const projectPerms = currentAccess[projectId] || [];
      
      let newProjectPerms;
      if (projectPerms.includes(permission)) {
          newProjectPerms = projectPerms.filter(p => p !== permission);
      } else {
          newProjectPerms = [...projectPerms, permission];
      }

      setUserData({
          ...userData,
          projectAccess: {
              ...currentAccess,
              [projectId]: newProjectPerms
          }
      });
  };

  const handleDeleteUser = (id: string) => {
      if(confirm("Supprimer cet utilisateur ?")) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  // --- ROLE MANAGEMENT LOGIC ---

  const openAddRole = () => {
      setEditingRoleId(null);
      setRoleData({ name: '', color: 'bg-slate-100 text-slate-700 border-slate-200', globalPermissions: [], isImmutable: false });
      setIsRoleModalOpen(true);
  };

  const openEditRole = (role: Role) => {
      setEditingRoleId(role.id);
      setRoleData({ ...role });
      setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
      e.preventDefault();
      if (!roleData.name) return;

      if (editingRoleId) {
          onUpdateRoles(roles.map(r => r.id === editingRoleId ? { ...r, ...roleData } as Role : r));
      } else {
          const newRole: Role = {
              id: `role_${Date.now()}`,
              name: roleData.name,
              color: roleData.color || 'bg-slate-100 text-slate-700 border-slate-200',
              globalPermissions: roleData.globalPermissions || [],
              isImmutable: false
          };
          onUpdateRoles([...roles, newRole]);
      }
      setIsRoleModalOpen(false);
  };

  const toggleGlobalPermission = (perm: GlobalPermission) => {
      const current = roleData.globalPermissions || [];
      if (current.includes(perm)) {
          setRoleData({ ...roleData, globalPermissions: current.filter(p => p !== perm) });
      } else {
          setRoleData({ ...roleData, globalPermissions: [...current, perm] });
      }
  };

  const handleDeleteRole = (id: string) => {
      if(confirm("Supprimer ce rôle ? Les utilisateurs assignés devront être réassignés.")) {
          onUpdateRoles(roles.filter(r => r.id !== id));
      }
  };


  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Inconnu';
  const getRoleColor = (id: string) => roles.find(r => r.id === id)?.color || 'bg-gray-100 text-gray-700';

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administration & Accès</h1>
          <p className="text-slate-500">Gérez vos équipes et leurs permissions</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'USERS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <UserIcon size={18} /> Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab('ROLES')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ROLES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Shield size={18} /> Grades & Permissions
          </button>
      </div>

      {/* --- USERS TAB --- */}
      {activeTab === 'USERS' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-4">
                  <button onClick={openAddUser} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm">
                      <Plus size={18} /> Ajouter Utilisateur
                  </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Utilisateur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Grade</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-md">
                              {user.avatar}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{user.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold border ${getRoleColor(user.roleId)}`}>
                               {getRoleName(user.roleId)}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Settings className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- ROLES TAB --- */}
      {activeTab === 'ROLES' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-4">
                  <button onClick={openAddRole} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm">
                      <Plus size={18} /> Créer un Grade
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map(role => (
                      <div key={role.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-sm font-bold border ${role.color}`}>{role.name}</span>
                                  {role.isImmutable && (
                                    <span title="Rôle système non modifiable">
                                        <Lock size={14} className="text-slate-400" />
                                    </span>
                                  )}
                              </div>
                              {!role.isImmutable && (
                                  <div className="flex gap-2">
                                      <button onClick={() => openEditRole(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Settings size={16} /></button>
                                      <button onClick={() => handleDeleteRole(role.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                  </div>
                              )}
                          </div>
                          
                          <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Permissions Globales</p>
                              {role.globalPermissions.length === 0 ? (
                                  <p className="text-sm text-slate-400 italic">Aucune permission globale (accès restreint aux projets assignés)</p>
                              ) : (
                                  <div className="flex flex-wrap gap-2">
                                      {role.globalPermissions.map(p => (
                                          <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-mono">
                                              {p}
                                          </span>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- USER MODAL --- */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">
                          {editingUserId ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
                      </h3>
                      <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="flex gap-8">
                          {/* Left: Basic Info */}
                          <div className="w-1/3 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom Complet</label>
                                    <input className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} placeholder="Ex: Jean Dupont" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} placeholder="jean@metalworks.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grade / Rôle</label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white" value={userData.roleId} onChange={e => setUserData({...userData, roleId: e.target.value})}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">Le grade définit les permissions globales.</p>
                                </div>
                          </div>

                          {/* Right: Project Permissions */}
                          <div className="flex-1 border-l border-slate-200 pl-8">
                                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><LayoutGrid size={18}/> Permissions par Projet</h4>
                                <p className="text-sm text-slate-500 mb-4">Définissez l'accès module par module. (Le grade "Super Admin" a accès à tout par défaut).</p>
                                
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {projects.map(project => {
                                        const perms = userData.projectAccess?.[project.id] || [];
                                        
                                        return (
                                            <div key={project.id} className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-sm text-slate-800">{project.name}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { key: 'VIEW_PROJECT', label: 'Voir le projet (Base)' },
                                                        { key: 'ACCESS_BE', label: 'Bureau d\'Études' },
                                                        { key: 'ACCESS_METHODS', label: 'Méthodes' },
                                                        { key: 'ACCESS_WORKSHOP', label: 'Atelier' },
                                                        { key: 'ACCESS_QUOTES', label: 'Devis' },
                                                        { key: 'ACCESS_GLOBAL_FOLLOWUP', label: 'Suivi Global' }
                                                    ].map((permOption) => (
                                                        <label key={permOption.key} className="flex items-center gap-2 cursor-pointer select-none group">
                                                            <div 
                                                                onClick={() => toggleProjectPermission(project.id, permOption.key as ProjectPermission)}
                                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${perms.includes(permOption.key as any) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}
                                                            >
                                                                {perms.includes(permOption.key as any) && <CheckSquare size={12} />}
                                                            </div>
                                                            <span className={`text-xs ${perms.includes(permOption.key as any) ? 'text-indigo-700 font-medium' : 'text-slate-500'}`}>{permOption.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Annuler</button>
                      <button onClick={handleSaveUser} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- ROLE MODAL --- */}
      {isRoleModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">{editingRoleId ? 'Modifier Grade' : 'Nouveau Grade'}</h3>
                      <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      {roleData.isImmutable && (
                          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4 border border-amber-200">
                              Ce rôle est un rôle système. Certaines options ne sont pas modifiables.
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du Grade</label>
                          <input 
                            disabled={roleData.isImmutable}
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 ${roleData.isImmutable ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            value={roleData.name} 
                            onChange={e => setRoleData({...roleData, name: e.target.value})} 
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Permissions Globales</label>
                          <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                              {[
                                  { key: 'VIEW_ALL_PROJECTS', label: 'Voir tous les projets' },
                                  { key: 'CREATE_PROJECT', label: 'Créer un projet' },
                                  { key: 'DELETE_PROJECT', label: 'Supprimer un projet' },
                                  { key: 'MANAGE_SETTINGS', label: 'Modifier les paramètres' },
                                  { key: 'MANAGE_USERS', label: 'Rajouter collaborateurs' },
                                  { key: 'MANAGE_ANNOUNCEMENTS', label: 'Poster des annonces' }
                              ].map(perm => (
                                  <label key={perm.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                                      <div 
                                          onClick={() => !roleData.isImmutable && toggleGlobalPermission(perm.key as GlobalPermission)}
                                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${roleData.globalPermissions?.includes(perm.key as any) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'} ${roleData.isImmutable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                          {roleData.globalPermissions?.includes(perm.key as any) && <CheckSquare size={14} />}
                                      </div>
                                      <span className="text-sm text-slate-700">{perm.label}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                   <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Annuler</button>
                      {!roleData.isImmutable && (
                        <button onClick={handleSaveRole} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium">Enregistrer</button>
                      )}
                  </div>
               </div>
          </div>
      )}

    </div>
  );
};

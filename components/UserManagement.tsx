import React, { useState } from 'react';
import { User, Shield, User as UserIcon, Settings, Plus, Trash2, Mail } from 'lucide-react';
import { User as UserType } from '../types';

interface UserManagementProps {
  // In a real app, this would come from a context or API
}

// Mock Initial Data for Users
const INITIAL_USERS: UserType[] = [
  { id: '1', name: 'Jean Dupont', role: 'admin', avatar: 'JD' },
  { id: '2', name: 'Marie Curie', role: 'manager', avatar: 'MC' },
  { id: '3', name: 'Pierre Martin', role: 'worker', avatar: 'PM' },
];

export const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<UserType[]>(INITIAL_USERS);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'worker' as UserType['role'] });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold border border-purple-200">Administrateur</span>;
      case 'manager': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200">Chef de Projet</span>;
      case 'worker': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">Ouvrier</span>;
      default: return null;
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name) {
      const u: UserType = {
        id: String(Date.now()),
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.name.substring(0, 2).toUpperCase()
      };
      setUsers([...users, u]);
      setIsAdding(false);
      setNewUser({ name: '', email: '', role: 'worker' });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Utilisateurs</h1>
          <p className="text-slate-500">Contrôle des accès et des rôles</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
        >
          <Plus size={20} />
          Ajouter Utilisateur
        </button>
      </div>

      {isAdding && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <UserIcon className="w-5 h-5 text-indigo-600" />
             Nouveau Compte
           </h3>
           <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom Complet</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: Thomas Edison"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email (Identifiant)</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="email@metalworks.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rôle</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                    >
                      <option value="worker">Ouvrier</option>
                      <option value="manager">Chef de Projet</option>
                      <option value="admin">Administrateur</option>
                    </select>
                 </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Créer le compte
                </button>
              </div>
           </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.name.toLowerCase().replace(' ', '.')}@metalworks.com
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Actif
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

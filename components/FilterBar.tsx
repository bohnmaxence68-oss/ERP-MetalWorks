import React from 'react';
import { Filter, User as UserIcon } from 'lucide-react';
import { User, TaskStatus, FilterState } from '../types';

interface FilterBarProps {
  users: User[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ users, filters, onFilterChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
        <Filter size={16} />
        Filtres:
      </div>
      
      <select
        className="px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-colors cursor-pointer"
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value as TaskStatus | 'ALL' })}
      >
        <option value="ALL">Tous les statuts</option>
        <option value={TaskStatus.TODO}>À faire</option>
        <option value={TaskStatus.IN_PROGRESS}>En cours</option>
        <option value={TaskStatus.DONE}>Terminé</option>
        <option value={TaskStatus.BLOCKED}>Bloqué</option>
      </select>

      <div className="h-4 w-px bg-slate-300 hidden sm:block" />

      <div className="flex items-center gap-2">
        <UserIcon size={16} className="text-slate-400 hidden sm:block" />
        <select
          className="px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-colors cursor-pointer"
          value={filters.userId}
          onChange={(e) => onFilterChange({ ...filters, userId: e.target.value })}
        >
          <option value="ALL">Tous les utilisateurs</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {(filters.status !== 'ALL' || filters.userId !== 'ALL') && (
        <button
          onClick={() => onFilterChange({ status: 'ALL', userId: 'ALL' })}
          className="ml-auto text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Clock, Link as LinkIcon } from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface TaskModalProps {
  task?: Task;
  allTasks: Task[];
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, allTasks, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(task?.name || '');
  const [duration, setDuration] = useState(task?.duration || 1);
  const [status, setStatus] = useState<TaskStatus>(task?.status || TaskStatus.TODO);
  const [progress, setProgress] = useState(task?.progress || 0);
  const [predecessors, setPredecessors] = useState<string[]>(task?.predecessors || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task?.id || String(Date.now()),
      name,
      duration: Number(duration),
      status,
      progress: Number(progress),
      predecessors,
      isCritical: false, // will be recalculated
      slack: 0
    });
  };

  const availablePredecessors = allTasks.filter(t => t.id !== task?.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom de la tâche</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Découpe Laser"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Durée (jours)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Avancement (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statut</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value={TaskStatus.TODO}>À faire</option>
              <option value={TaskStatus.IN_PROGRESS}>En cours</option>
              <option value={TaskStatus.DONE}>Terminé</option>
              <option value={TaskStatus.BLOCKED}>Bloqué</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <LinkIcon className="w-3 h-3" />
              Prédécesseurs (Dépendances)
            </label>
            <div className="border border-slate-300 rounded-lg max-h-32 overflow-y-auto p-2 bg-slate-50">
               {availablePredecessors.length === 0 ? (
                   <p className="text-xs text-slate-400 italic p-1">Aucune autre tâche disponible.</p>
               ) : (
                   availablePredecessors.map(t => (
                       <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                           <input 
                              type="checkbox"
                              checked={predecessors.includes(t.id)}
                              onChange={(e) => {
                                  if (e.target.checked) {
                                      setPredecessors([...predecessors, t.id]);
                                  } else {
                                      setPredecessors(predecessors.filter(id => id !== t.id));
                                  }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                           />
                           <span className="text-sm text-slate-700 truncate">{t.name}</span>
                       </label>
                   ))
               )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Les tâches sélectionnées doivent être terminées avant que celle-ci ne commence.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {task && onDelete ? (
               <button
                 type="button"
                 onClick={() => onDelete(task.id)}
                 className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
               >
                 <Trash2 className="w-4 h-4" />
                 Supprimer
               </button>
            ) : (
                <div></div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition-all hover:shadow-lg"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

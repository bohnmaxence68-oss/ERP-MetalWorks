
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Link as LinkIcon, User, Diamond, CheckSquare, Plus, Bold, Italic, List } from 'lucide-react';
import { Task, TaskStatus, User as UserType, ChecklistItem, TaskComment, TimeLog, Attachment, Material } from '../types';
import { QuoteDataService } from '../services/quoteData';

interface TaskModalProps {
  task?: Task;
  allTasks: Task[];
  users: UserType[];
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
  currentUser?: UserType; 
  isReadOnly?: boolean;
  allowExecution?: boolean; 
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, allTasks, users, onSave, onDelete, onClose, currentUser, isReadOnly, allowExecution }) => {
  const [name, setName] = useState(task?.name || '');
  const [duration, setDuration] = useState(task?.duration ?? 1);
  const [status, setStatus] = useState<TaskStatus>(task?.status || TaskStatus.TODO);
  const [progress, setProgress] = useState(task?.progress || 0);
  const [predecessors, setPredecessors] = useState<string[]>(task?.predecessors || []);
  const [assignedTo, setAssignedTo] = useState<string>(task?.assignedTo || '');
  
  const [description, setDescription] = useState(task?.description || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  // New fields
  const [quantity, setQuantity] = useState(task?.quantity || 1);
  const [material, setMaterial] = useState(task?.material || '');
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);

  const descriptionRef = useRef<HTMLDivElement>(null);

  const isLocked = isReadOnly && !allowExecution; 
  const isStructureLocked = isReadOnly; 

  useEffect(() => {
      setAvailableMaterials(QuoteDataService.getMaterials());
  }, []);

  // Auto-update status/progress based on checklist
  useEffect(() => {
      if (checklist.length > 0) {
          const completed = checklist.filter(i => i.isCompleted).length;
          const total = checklist.length;
          const newProgress = Math.round((completed / total) * 100);
          
          if (newProgress !== progress) {
              setProgress(newProgress);
              if (newProgress === 100 && status !== TaskStatus.DONE) {
                  setStatus(TaskStatus.DONE);
              } else if (newProgress < 100 && newProgress > 0 && status === TaskStatus.TODO) {
                  setStatus(TaskStatus.IN_PROGRESS);
              } else if (newProgress < 100 && status === TaskStatus.DONE) {
                  setStatus(TaskStatus.IN_PROGRESS);
              }
          }
      }
  }, [checklist, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task?.id || String(Date.now()),
      name,
      duration: Number(duration),
      status,
      progress: Number(progress),
      predecessors,
      assignedTo: assignedTo || undefined,
      isCritical: false, // will be recalculated
      slack: 0,
      description,
      checklist,
      comments: task?.comments,
      timeLogs: task?.timeLogs,
      timerStartTime: task?.timerStartTime,
      attachments: task?.attachments,
      quantity: Number(quantity),
      material
    });
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChecklistItem.trim()) return;
      setChecklist([...checklist, { id: String(Date.now()), text: newChecklistItem, isCompleted: false }]);
      setNewChecklistItem('');
  };

  const toggleChecklistItem = (id: string) => {
      if (isLocked) return;
      setChecklist(checklist.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  };

  const removeChecklistItem = (id: string) => {
      setChecklist(checklist.filter(item => item.id !== id));
  };

  const availablePredecessors = allTasks.filter(t => t.id !== task?.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            {task ? 'Détails de la tâche' : 'Nouvelle tâche'}
            {isStructureLocked && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">Lecture Seule</span>}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-4">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* LEFT COLUMN: Main Info */}
            <div className="w-full md:w-1/3 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom de la tâche</label>
                        <input
                        type="text"
                        required
                        disabled={isStructureLocked}
                        className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 bg-white ${isStructureLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Découpe Laser"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Durée (jours)</span>
                            {Number(duration) === 0 && <span className="text-[10px] text-blue-600 flex items-center gap-1 bg-blue-50 px-1.5 rounded"><Diamond size={10} /> Jalon</span>}
                        </label>
                        <div className="relative">
                            <input
                            type="number"
                            min="0"
                            required
                            disabled={isStructureLocked}
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 ${isStructureLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
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
                            disabled={isLocked || checklist.length > 0} 
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 ${isLocked || checklist.length > 0 ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                            value={progress}
                            onChange={(e) => setProgress(Number(e.target.value))}
                        />
                        {checklist.length > 0 && <p className="text-[10px] text-blue-500 mt-1">Géré par la liste.</p>}
                        </div>
                    </div>

                    {/* NEW FIELDS: QUANTITY & MATERIAL */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantité</label>
                            <input
                                type="number"
                                min="1"
                                disabled={isStructureLocked}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 ${isStructureLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Matière</label>
                            <input
                                list="material-options"
                                disabled={isStructureLocked}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 ${isStructureLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                placeholder="Saisir ou choisir..."
                            />
                            <datalist id="material-options">
                                {availableMaterials.map(m => (
                                    <option key={m.id} value={m.name} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statut</label>
                        <select
                            disabled={isLocked}
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-900 ${isLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
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
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigné à</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <select
                            disabled={isStructureLocked}
                            className={`w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 ${isStructureLocked ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            >
                            <option value="">Non assigné</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                            </select>
                        </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" />
                        Prédécesseurs (Dépendances)
                        </label>
                        <div className={`border border-slate-300 rounded-lg max-h-32 overflow-y-auto p-2 bg-slate-50 ${isStructureLocked ? 'opacity-70 pointer-events-none' : ''}`}>
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
                    </div>
                </form>
            </div>

            {/* RIGHT COLUMN: Details & Checklist */}
            <div className="w-full md:w-2/3 flex flex-col bg-slate-50/50 overflow-hidden">
                <div className="flex border-b border-slate-200 bg-white">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600`}
                    >
                        Description & Check
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="animate-in fade-in">
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description (Zone de texte)</label>
                            <div className={`border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-shadow ${isStructureLocked ? 'opacity-75' : ''}`}>
                                <div 
                                    ref={descriptionRef}
                                    contentEditable={!isStructureLocked}
                                    dangerouslySetInnerHTML={{ __html: description }}
                                    onBlur={(e) => setDescription(e.currentTarget.innerHTML)}
                                    className="p-3 min-h-[120px] text-sm text-slate-700 outline-none prose prose-sm max-w-none"
                                    style={{ minHeight: '120px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2"><CheckSquare size={14}/> Liste de contrôle</span>
                                <span className="text-blue-600 font-bold">{progress}%</span>
                            </label>
                            
                            <div className="space-y-2 mb-3">
                                {checklist.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 group">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isCompleted} 
                                            onChange={() => toggleChecklistItem(item.id)}
                                            disabled={isLocked}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                        />
                                        <span className={`flex-1 text-sm ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.text}</span>
                                        {!isLocked && (
                                            <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {checklist.length === 0 && <p className="text-xs text-slate-400 italic">Aucun élément dans la liste.</p>}
                            </div>

                            {!isLocked && (
                                <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                                    <input 
                                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        placeholder="Ajouter une étape..."
                                        value={newChecklistItem}
                                        onChange={e => setNewChecklistItem(e.target.value)}
                                    />
                                    <button type="submit" className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
                                        <Plus size={18} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            {task && onDelete && !isStructureLocked ? (
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
              {!isLocked && (
                  <button
                    onClick={handleSubmit} 
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition-all hover:shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Task, TaskStatus, User } from '../../types';
import { Clock, User as UserIcon, AlertCircle, CheckCircle2, Circle, AlertOctagon, GripVertical, Paperclip, Timer } from 'lucide-react';

interface TaskBoardViewProps {
  tasks: Task[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  readOnly: boolean;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, users, onTaskClick, onStatusChange, readOnly }) => {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const columns = [
    { id: TaskStatus.TODO, label: 'À Faire', color: 'border-slate-300', bg: 'bg-slate-50' },
    { id: TaskStatus.IN_PROGRESS, label: 'En Cours', color: 'border-blue-400', bg: 'bg-blue-50/50' },
    { id: TaskStatus.BLOCKED, label: 'Bloqué / En Attente', color: 'border-red-400', bg: 'bg-red-50/50' },
    { id: TaskStatus.DONE, label: 'Terminé', color: 'border-emerald-400', bg: 'bg-emerald-50/50' },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status).sort((a, b) => {
        // Sort by start date, then name
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
    });
  };

  const getUser = (userId?: string) => users.find(u => u.id === userId);

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      if (readOnly) {
          e.preventDefault();
          return;
      }
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
      // Optional: Set a custom drag image or style here if needed
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
      if (readOnly) return;
      e.preventDefault(); // Necessary to allow dropping
      if (dragOverColumn !== status) {
          setDragOverColumn(status);
      }
  };

  const handleDragLeave = () => {
      setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
      if (readOnly) return;
      e.preventDefault();
      setDragOverColumn(null);
      
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          const task = tasks.find(t => t.id === taskId);
          // Only update if the status is actually different
          if (task && task.status !== newStatus) {
              onStatusChange(taskId, newStatus);
          }
      }
  };

  return (
    <div className="flex h-full overflow-x-auto p-4 gap-4 bg-slate-100/50">
      {columns.map(col => {
        const colTasks = getTasksByStatus(col.id as TaskStatus);
        const isDragTarget = dragOverColumn === col.id;
        
        return (
          <div 
            key={col.id} 
            className={`flex-shrink-0 w-80 flex flex-col h-full rounded-xl border shadow-sm overflow-hidden transition-colors duration-200 
                ${isDragTarget ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-slate-100 border-slate-200'}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id as TaskStatus)}
          >
            {/* Column Header */}
            <div className={`p-3 border-t-4 ${col.color} bg-white border-b border-slate-200 flex justify-between items-center select-none`}>
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</h3>
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks List */}
            <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isDragTarget ? 'bg-blue-50/50' : col.bg}`}>
              {colTasks.map(task => {
                const assignee = getUser(task.assignedTo);
                const isLate = task.endDate && new Date(task.endDate) < new Date() && task.status !== TaskStatus.DONE;
                const attachmentsCount = task.attachments?.length || 0;
                const timeLogged = task.timeLogs?.reduce((acc, l) => acc + l.durationMinutes, 0) || 0;
                const timerActive = !!task.timerStartTime;

                return (
                  <div 
                    key={task.id}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden ${task.isCritical ? 'ring-1 ring-red-100' : ''}`}
                  >
                    {task.isCritical && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg" title="Tâche Critique" />
                    )}

                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-800 text-sm leading-snug pr-4">{task.name}</h4>
                        {!readOnly && (
                            <div className="text-slate-300 group-hover:text-slate-400 absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={14} />
                            </div>
                        )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 select-none flex-wrap">
                        {task.endDate && (
                            <div className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-bold' : ''}`}>
                                <Clock size={12} />
                                {new Date(task.endDate).toLocaleDateString()}
                            </div>
                        )}
                        {assignee && (
                            <div className="flex items-center gap-1" title={`Assigné à ${assignee.name}`}>
                                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-700">
                                    {assignee.avatar}
                                </div>
                                <span className="truncate max-w-[80px]">{assignee.name}</span>
                            </div>
                        )}
                        {/* Indicators */}
                        {attachmentsCount > 0 && (
                            <div className="flex items-center gap-1 text-slate-400">
                                <Paperclip size={10} /> {attachmentsCount}
                            </div>
                        )}
                        {(timeLogged > 0 || timerActive) && (
                            <div className={`flex items-center gap-1 ${timerActive ? 'text-red-500 font-bold animate-pulse' : 'text-slate-400'}`}>
                                <Timer size={10} /> 
                                {timerActive ? 'En cours' : `${Math.round(timeLogged / 60)}h`}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar & Status Action */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 select-none">
                                <span>Progression</span>
                                <span>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-300 ${task.progress === 100 ? 'bg-emerald-500' : task.isCritical ? 'bg-red-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${task.progress}%` }} 
                                />
                            </div>
                        </div>
                        
                        {!readOnly && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus = task.status === TaskStatus.DONE ? TaskStatus.IN_PROGRESS : TaskStatus.DONE;
                                    onStatusChange(task.id, nextStatus);
                                }}
                                className={`p-1.5 rounded-full transition-colors ${
                                    task.status === TaskStatus.DONE 
                                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                                    : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                title={task.status === TaskStatus.DONE ? "Rouvrir" : "Terminer"}
                            >
                                {task.status === TaskStatus.DONE ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                        )}
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                  <div className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors ${isDragTarget ? 'border-blue-300 bg-blue-50' : 'border-slate-200 opacity-40'}`}>
                      <div className="text-4xl mb-2 text-slate-300">
                          {col.id === TaskStatus.DONE ? '🏁' : '📭'}
                      </div>
                      <p className="text-xs text-slate-500">{isDragTarget ? 'Déposer ici' : 'Aucune tâche'}</p>
                  </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

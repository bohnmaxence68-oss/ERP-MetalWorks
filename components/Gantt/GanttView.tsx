import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ZoomIn, ZoomOut, Calendar, Link as LinkIcon, AlertCircle, Wand2, RefreshCw } from 'lucide-react';
import { Task, GanttConfig, Project, TaskStatus } from '../../types';
import { calculateSchedule } from '../../services/scheduler';
import { generateProjectPlan } from '../../services/geminiService';
import { TaskModal } from '../TaskModal';

const CONFIG: GanttConfig = {
  dayWidth: 50,
  headerHeight: 50,
  rowHeight: 48,
};

interface GanttViewProps {
  project: Project;
  onProjectUpdate: (p: Project) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({ project, onProjectUpdate }) => {
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Sync props to state if project changes
  useEffect(() => {
    setTasks(project.tasks);
  }, [project.tasks]);

  // Derived state for display
  const scheduledTasks = useMemo(() => calculateSchedule(project.startDate, tasks), [tasks, project.startDate]);
  
  const projectDuration = useMemo(() => {
    if (scheduledTasks.length === 0) return 0;
    const endTimes = scheduledTasks.map(t => t.endDate ? t.endDate.getTime() : 0);
    const startTimes = scheduledTasks.map(t => t.startDate ? t.startDate.getTime() : 0);
    const maxEnd = Math.max(...endTimes);
    const minStart = Math.min(...startTimes);
    return Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 5; // Buffer
  }, [scheduledTasks]);

  const scaledDayWidth = CONFIG.dayWidth * zoom;

  // Handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));
  
  const handleGeneratePlan = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const newTasks = await generateProjectPlan(aiPrompt);
    setIsGenerating(false);
    setShowAIModal(false);
    if (newTasks.length > 0) {
        const updatedTasks = [...tasks, ...newTasks];
        setTasks(updatedTasks);
        onProjectUpdate({ ...project, tasks: updatedTasks });
    }
  };
  
  const handleSaveTask = (task: Task) => {
      let updatedTasks;
      if (editingTask) {
          updatedTasks = tasks.map(t => t.id === task.id ? task : t);
      } else {
          updatedTasks = [...tasks, task];
      }
      setTasks(updatedTasks);
      onProjectUpdate({ ...project, tasks: updatedTasks });
      setShowTaskModal(false);
      setEditingTask(undefined);
  };

  const handleDeleteTask = (taskId: string) => {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      // Also remove dependencies pointing to this task
      const cleanedTasks = updatedTasks.map(t => ({
          ...t,
          predecessors: t.predecessors.filter(pid => pid !== taskId)
      }));
      setTasks(cleanedTasks);
      onProjectUpdate({ ...project, tasks: cleanedTasks });
      setShowTaskModal(false);
      setEditingTask(undefined);
  };

  const openNewTaskModal = () => {
      setEditingTask(undefined);
      setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
      setEditingTask(task);
      setShowTaskModal(true);
  };

  const getTaskColor = (task: Task) => {
      if (task.status === TaskStatus.DONE) return 'bg-emerald-500 border-emerald-600';
      if (task.isCritical) return 'bg-rose-500 border-rose-600';
      return 'bg-blue-500 border-blue-600';
  };

  // Render Time Scale
  const renderTimeScale = () => {
    const days = [];
    const totalDays = Math.max(30, projectDuration); // Min 30 days
    
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(project.startDate);
        date.setDate(date.getDate() + i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        days.push(
            <div 
                key={i} 
                className={`flex-shrink-0 border-r border-slate-200 text-xs flex flex-col items-center justify-end pb-1 select-none ${isWeekend ? 'bg-slate-50' : 'bg-white'}`}
                style={{ width: scaledDayWidth, height: CONFIG.headerHeight }}
            >
                <span className="text-slate-400 font-medium">{date.getDate()}</span>
                <span className="text-slate-300 text-[10px]">{date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
            </div>
        );
    }
    return days;
  };

  // Render Dependencies (SVG Lines)
  const renderDependencies = () => {
    return scheduledTasks.map(task => {
        if (!task.predecessors || !task.startDate) return null;
        
        return task.predecessors.map(predId => {
            const pred = scheduledTasks.find(t => t.id === predId);
            if (!pred || !pred.endDate) return null;

            const startX = (new Date(pred.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24) * scaledDayWidth;
            const endX = (new Date(task.startDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24) * scaledDayWidth;
            
            const startY = scheduledTasks.indexOf(pred) * CONFIG.rowHeight + (CONFIG.rowHeight / 2);
            const endY = scheduledTasks.indexOf(task) * CONFIG.rowHeight + (CONFIG.rowHeight / 2);

            // Path logic: Simple S-curve or L-shape
            const deltaX = endX - startX;
            const controlPoint1X = startX + (deltaX / 2); // 20px after start
            const controlPoint2X = endX - (deltaX / 2); // 20px before end
            
            const isCriticalLink = task.isCritical && pred.isCritical;

            return (
                <path
                    key={`${pred.id}-${task.id}`}
                    d={`M ${startX} ${startY} C ${controlPoint1X} ${startY}, ${controlPoint2X} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke={isCriticalLink ? '#f43f5e' : '#cbd5e1'}
                    strokeWidth={isCriticalLink ? 2 : 1.5}
                    markerEnd={isCriticalLink ? "url(#arrowhead-critical)" : "url(#arrowhead)"}
                    className="transition-all duration-300"
                />
            );
        });
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {project.name}
            </h2>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-rose-50 px-2 py-1 rounded text-rose-600 border border-rose-100">
                Chemin Critique Actif
            </span>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
            >
                <Wand2 className="w-4 h-4" />
                Assistant Planification
            </button>
            <button 
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                onClick={openNewTaskModal}
            >
                <Plus className="w-4 h-4" />
                Ajouter Tâche
            </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Task List */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider" style={{ height: CONFIG.headerHeight }}>
                <div className="flex-1 px-4 flex items-center border-r border-slate-200">Nom</div>
                <div className="w-16 flex items-center justify-center border-r border-slate-200">Durée</div>
                <div className="w-20 flex items-center justify-center">Début</div>
            </div>
            {/* List */}
            <div className="overflow-y-hidden hover:overflow-y-auto gantt-scroll flex-1">
                {scheduledTasks.map((task, index) => (
                    <div 
                        key={task.id} 
                        onClick={() => openEditTaskModal(task)}
                        className={`flex border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        style={{ height: CONFIG.rowHeight }}
                    >
                        <div className="flex-1 px-4 flex items-center border-r border-slate-100 truncate text-sm font-medium text-slate-700 gap-2">
                             <div className={`w-2 h-2 rounded-full ${task.isCritical ? 'bg-rose-500' : 'bg-blue-400'}`}></div>
                             {task.name}
                        </div>
                        <div className="w-16 flex items-center justify-center border-r border-slate-100 text-xs text-slate-500">
                            {task.duration}j
                        </div>
                        <div className="w-20 flex items-center justify-center text-xs text-slate-500">
                           {task.startDate ? `J+${Math.floor((task.startDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))}` : '-'}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Side: Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
            {/* Timeline Header */}
            <div 
                className="overflow-hidden bg-slate-50 border-b border-slate-200 flex" 
                style={{ height: CONFIG.headerHeight }}
                ref={(el) => { if(el && scrollContainerRef.current) el.scrollLeft = scrollContainerRef.current.scrollLeft }}
            >
               {renderTimeScale()}
            </div>

            {/* Timeline Body */}
            <div 
                className="flex-1 overflow-auto gantt-scroll relative"
                ref={scrollContainerRef}
                onScroll={(e) => {
                     // Sync header? Would need state or separate ref manipulation
                }}
            >
                {/* SVG Layer for Dependencies */}
                <svg className="absolute top-0 left-0 pointer-events-none z-0" style={{ width: Math.max(projectDuration * scaledDayWidth, 1000), height: scheduledTasks.length * CONFIG.rowHeight }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                        <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
                        </marker>
                    </defs>
                    {renderDependencies()}
                </svg>

                {/* Grid Lines */}
                <div className="absolute top-0 left-0 h-full flex pointer-events-none">
                     {Array.from({ length: Math.max(30, projectDuration) }).map((_, i) => (
                        <div key={i} className="border-r border-slate-100 h-full" style={{ width: scaledDayWidth }}></div>
                     ))}
                </div>

                {/* Task Bars */}
                <div className="relative z-10">
                    {scheduledTasks.map((task, index) => {
                        const startOffset = task.startDate ? (task.startDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24) * scaledDayWidth : 0;
                        const width = task.duration * scaledDayWidth;
                        
                        return (
                            <div 
                                key={task.id} 
                                className="relative flex items-center group"
                                style={{ height: CONFIG.rowHeight }}
                                onClick={() => openEditTaskModal(task)}
                            >
                                <div 
                                    className={`absolute rounded h-7 shadow-sm border flex items-center px-2 text-xs text-white font-medium truncate transition-all cursor-pointer hover:brightness-110 ${getTaskColor(task)}`}
                                    style={{ 
                                        left: startOffset, 
                                        width: width,
                                        zIndex: 10
                                    }}
                                    title={`${task.name} (${task.duration} jours) - ${task.isCritical ? 'CRITIQUE' : 'Standard'}`}
                                >
                                    {width > 30 && task.name}
                                </div>
                                
                                {/* Float Visualization (Slack) */}
                                {task.slack && task.slack > 0 && (
                                    <div 
                                        className="absolute h-1 bg-slate-300 pattern-dots opacity-50"
                                        style={{
                                            left: startOffset + width,
                                            width: task.slack * scaledDayWidth,
                                            top: '50%',
                                            marginTop: '-2px'
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="bg-indigo-600 p-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wand2 className="w-6 h-6" />
                        Assistant Planification IA
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1">
                        Décrivez votre projet de chaudronnerie (ex: "Cuve de stockage 50m3 en inox")
                    </p>
                </div>
                <div className="p-6">
                    <textarea 
                        className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-700"
                        placeholder="Ex: Fabrication d'un échangeur thermique tubulaire, incluant l'approvisionnement matière, la découpe laser, le roulage des viroles, le soudage TIG, et les tests hydrauliques..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setShowAIModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleGeneratePlan}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating && <RefreshCw className="w-4 h-4 animate-spin" />}
                            {isGenerating ? "Génération..." : "Générer le Planning"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* Task Modal (Add/Edit) */}
      {showTaskModal && (
          <TaskModal 
              task={editingTask}
              allTasks={tasks}
              onSave={handleSaveTask}
              onDelete={editingTask ? handleDeleteTask : undefined}
              onClose={() => setShowTaskModal(false)}
          />
      )}
    </div>
  );
};

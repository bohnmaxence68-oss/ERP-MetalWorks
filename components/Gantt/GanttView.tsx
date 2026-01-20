
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, ZoomIn, ZoomOut, Calendar, GripVertical, AlertTriangle, Download, LayoutTemplate, ListTodo, Diamond, AlertOctagon, Lock, Unlock, Loader2, LayoutGrid } from 'lucide-react';
import { Task, GanttConfig, Project, TaskStatus, User, FilterState } from '../../types';
import { calculateSchedule } from '../../services/scheduler';
import { TaskModal } from '../TaskModal';
import { FilterBar } from '../FilterBar';
import { CalendarView } from './CalendarView';
import { TaskBoardView } from './TaskBoardView';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CONFIG: GanttConfig = {
  dayWidth: 50,
  headerHeight: 50,
  rowHeight: 48,
};

interface GanttViewProps {
  project: Project;
  users: User[];
  onProjectUpdate?: (p: Project) => void;
  customTasks?: Task[]; // Optional: For Production View
  readOnly?: boolean;   // Optional: For Production View
  allowExecution?: boolean; // Optional: Allow status updates and comments even if readOnly
  title?: string;       // Optional title override
  currentUser?: User;
}

export const GanttView: React.FC<GanttViewProps> = ({ project, users, onProjectUpdate, customTasks, readOnly = false, allowExecution = false, title, currentUser }) => {
  // Use customTasks if provided, otherwise project.tasks
  const sourceTasks = customTasks || project.tasks;
  const [tasks, setTasks] = useState<Task[]>(sourceTasks);
  
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'gantt' | 'calendar' | 'board'>('gantt');
  
  // Refs for Synced Scrolling
  const taskListRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  
  // Warning Toast State
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter State (Persisted)
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('ganttFilters');
    return saved ? JSON.parse(saved) : { status: 'ALL', userId: 'ALL' };
  });

  useEffect(() => {
    localStorage.setItem('ganttFilters', JSON.stringify(filters));
  }, [filters]);

  const [isolateCriticalPath, setIsolateCriticalPath] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // --- Drag & Drop State (Ref-based for stability) ---
  const [draggingTaskRow, setDraggingTaskRow] = useState<number | null>(null);
  
  // UI State for drag feedback (triggers renders)
  const [dragUI, setDragUI] = useState<{
      isDragging: boolean;
      subjectId: string | null;
      type: 'move' | 'resize' | 'dependency' | null;
      currentX: number;
      currentY: number;
      startX: number;
      startY: number;
  }>({
      isDragging: false,
      subjectId: null,
      type: null,
      currentX: 0,
      currentY: 0,
      startX: 0,
      startY: 0
  });

  // Mutable state for event handlers (avoids stale closures)
  const dragRef = useRef({
      isDragging: false,
      subjectId: null as string | null,
      type: null as 'move' | 'resize' | 'dependency' | null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      originalDuration: 0
  });

  // Sync state when props change
  useEffect(() => {
    setTasks(customTasks || project.tasks);
  }, [project.tasks, customTasks]);

  const allScheduledTasks = useMemo(() => calculateSchedule(project.startDate, tasks), [tasks, project.startDate]);

  const projectEndDate = useMemo(() => {
      if (allScheduledTasks.length === 0) return project.startDate;
      const endTimes = allScheduledTasks.map(t => t.endDate ? t.endDate.getTime() : 0);
      return new Date(Math.max(...endTimes));
  }, [allScheduledTasks]);

  const displayedTasks = useMemo(() => {
      return allScheduledTasks.filter(task => {
          if (filters.status !== 'ALL' && task.status !== filters.status) return false;
          if (filters.userId !== 'ALL' && task.assignedTo !== filters.userId) return false;
          if (isolateCriticalPath && !task.isCritical) return false;
          return true;
      });
  }, [allScheduledTasks, filters, isolateCriticalPath]);
  
  const projectDurationDays = useMemo(() => {
    if (allScheduledTasks.length === 0) return 0;
    const endTimes = allScheduledTasks.map(t => t.endDate ? t.endDate.getTime() : 0);
    const startTimes = allScheduledTasks.map(t => t.startDate ? t.startDate.getTime() : 0);
    const maxEnd = Math.max(...endTimes);
    const minStart = Math.min(...startTimes);
    return Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 15; 
  }, [allScheduledTasks]);

  const scaledDayWidth = CONFIG.dayWidth * zoom;

  // --- Scroll Sync Logic ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      // Sync vertical scroll
      if (target === taskListRef.current && timelineRef.current) {
          timelineRef.current.scrollTop = target.scrollTop;
      } else if (target === timelineRef.current && taskListRef.current) {
          taskListRef.current.scrollTop = target.scrollTop;
          // Also sync header horizontal scroll
          if (timelineHeaderRef.current) {
              timelineHeaderRef.current.scrollLeft = target.scrollLeft;
          }
      }
  };

  // --- Actions ---

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    // Give UI a moment to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const ganttContainer = document.getElementById('gantt-export-container');
    if (!ganttContainer) {
        setIsExporting(false);
        return;
    }

    // Save original styles
    const originalOverflow = ganttContainer.style.overflow;
    
    // Also need to handle the internal scroll container
    const scrollContainer = timelineRef.current;
    const listContainer = taskListRef.current;
    
    let originalScrollOverflow = '';
    let originalListOverflow = '';
    
    try {
        // Temporarily expand height/width to show everything for the snapshot
        ganttContainer.style.overflow = 'visible';
        ganttContainer.style.width = 'max-content'; // Allow it to expand horizontally
        
        if (scrollContainer) {
            originalScrollOverflow = scrollContainer.style.overflow;
            scrollContainer.style.overflow = 'visible';
        }
        if (listContainer) {
            originalListOverflow = listContainer.style.overflow;
            listContainer.style.overflow = 'visible';
        }

        const canvas = await html2canvas(ganttContainer, {
            scale: 2, // Retain quality
            useCORS: true,
            logging: false,
            // Capture full scroll dimensions
            windowWidth: ganttContainer.scrollWidth + 100, 
            width: ganttContainer.scrollWidth,
            height: ganttContainer.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Convert px to mm (1px = 0.264583mm approx)
        const imgWidthMm = canvas.width * 0.264583;
        const imgHeightMm = canvas.height * 0.264583;

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [imgWidthMm, imgHeightMm] // Auto-size PDF to fit the chart
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm);
        pdf.save(`${project.name.replace(/[^a-z0-9]/gi, '_')}_Planning.pdf`);

    } catch (err) {
        console.error("PDF Export failed", err);
        alert("Une erreur est survenue lors de l'export PDF.");
    } finally {
        // Restore styles
        ganttContainer.style.overflow = originalOverflow;
        ganttContainer.style.width = '';
        if (scrollContainer) {
             scrollContainer.style.overflow = originalScrollOverflow;
        }
        if (listContainer) {
            listContainer.style.overflow = originalListOverflow;
        }
        setIsExporting(false);
    }
  };

  const checkForCriticalImpact = (newTasks: Task[]) => {
      const newSchedule = calculateSchedule(project.startDate, newTasks);
      const newEndTimes = newSchedule.map(t => t.endDate ? t.endDate.getTime() : 0);
      const newProjectEnd = new Date(Math.max(...newEndTimes));

      if (newProjectEnd.getTime() > projectEndDate.getTime()) {
          const diffTime = newProjectEnd.getTime() - projectEndDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setWarningMsg(`Attention : Cette modification repousse la fin du projet de ${diffDays} jour(s).`);
          setTimeout(() => setWarningMsg(null), 5000);
      } else {
          setWarningMsg(null);
      }
  };

  const handleUpdateTasks = (updatedTasks: Task[]) => {
      // Allow updates if not readOnly OR if execution is allowed
      if ((readOnly && !allowExecution) || !onProjectUpdate) return;
      checkForCriticalImpact(updatedTasks);
      setTasks(updatedTasks);
      onProjectUpdate({ ...project, tasks: updatedTasks });
  };

  const handleSaveTask = (task: Task) => {
      if (readOnly && !allowExecution) return;
      let updatedTasks;
      if (editingTask) {
          updatedTasks = tasks.map(t => t.id === task.id ? task : t);
      } else {
          updatedTasks = [...tasks, task];
      }
      handleUpdateTasks(updatedTasks);
      setShowTaskModal(false);
      setEditingTask(undefined);
  };

  const handleInlineUpdate = (taskId: string, field: Partial<Task>) => {
      if (readOnly && !allowExecution) return;
      
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, ...field } : t);
      
      // If setting to DONE, auto-set progress to 100%
      if (field.status === TaskStatus.DONE) {
          const targetTask = updatedTasks.find(t => t.id === taskId);
          if (targetTask) targetTask.progress = 100;
      }

      handleUpdateTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
      if (readOnly) return; // Delete is strict read-only
      const updatedTasks = tasks.filter(t => t.id !== taskId).map(t => ({
          ...t,
          predecessors: t.predecessors.filter(pid => pid !== taskId)
      }));
      handleUpdateTasks(updatedTasks);
      setShowTaskModal(false);
      setEditingTask(undefined);
  };

  const applyTaskMove = (taskId: string, days: number) => {
      if (readOnly) return;
      const scheduledTask = allScheduledTasks.find(t => t.id === taskId);
      if (scheduledTask && scheduledTask.startDate) {
          const currentStart = scheduledTask.startDate;
          const newDate = new Date(currentStart);
          newDate.setDate(newDate.getDate() + days);
          
          const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, forcedStartDate: newDate } : t);
          handleUpdateTasks(updatedTasks);
      }
  };

  const applyTaskResize = (taskId: string, newDuration: number) => {
      if (readOnly) return;
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, duration: newDuration } : t);
      handleUpdateTasks(updatedTasks);
  };

  // --- Optimized Drag & Drop Handlers ---

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;

      dragRef.current.currentX = e.clientX;
      dragRef.current.currentY = e.clientY;

      setDragUI(prev => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY
      }));
  }, []); 

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);

      const { isDragging, subjectId, type, startX, originalDuration } = dragRef.current;

      if (isDragging && subjectId && type && !readOnly) {
          const deltaX = e.clientX - startX;

          if (type === 'move') {
             const deltaDays = Math.round(deltaX / scaledDayWidth);
             if (deltaDays !== 0) {
                 applyTaskMove(subjectId, deltaDays);
             }
          } else if (type === 'resize') {
               const daysChange = Math.round(deltaX / scaledDayWidth);
               const newDuration = Math.max(0, originalDuration + daysChange);
               if (newDuration !== originalDuration) {
                   applyTaskResize(subjectId, newDuration);
               }
          }
      }

      // Reset
      dragRef.current = {
          isDragging: false,
          subjectId: null,
          type: null,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
          originalDuration: 0
      };

      setDragUI({
          isDragging: false,
          subjectId: null,
          type: null,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0
      });
  }, [handleGlobalMouseMove, scaledDayWidth, tasks, allScheduledTasks, readOnly]); 

  const handleMouseDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize' | 'dependency') => {
      if (e.button !== 0) return;
      if (readOnly) return; // Removed status check, only readOnly prop matters

      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
          isDragging: true,
          subjectId: task.id,
          type,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          originalDuration: task.duration
      };

      setDragUI({
          isDragging: true,
          subjectId: task.id,
          type,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY
      });

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleDependencyDrop = (targetTask: Task) => {
      const { type, subjectId } = dragRef.current;
      
      if (type === 'dependency' && subjectId && subjectId !== targetTask.id && !readOnly) {
           if (!targetTask.predecessors.includes(subjectId)) {
               if (!hasCycle(subjectId, targetTask.id, tasks)) {
                   const updatedTasks = tasks.map(t => 
                       t.id === targetTask.id ? { ...t, predecessors: [...t.predecessors, subjectId] } : t
                   );
                   handleUpdateTasks(updatedTasks);
               } else {
                   alert("Impossible : cela créerait une boucle de dépendance.");
               }
           }
      }
  };

  const hasCycle = (sourceId: string, targetId: string, taskList: Task[]) => {
      const visited = new Set<string>();
      const stack = [sourceId];
      while (stack.length > 0) {
          const current = stack.pop()!;
          if (current === targetId) return true;
          if (!visited.has(current)) {
              visited.add(current);
              const children = taskList.filter(t => t.predecessors.includes(current));
              children.forEach(c => stack.push(c.id));
          }
      }
      return false;
  };

  const handleRowDragStart = (e: React.DragEvent, task: Task) => {
      if (readOnly) return;
      if ((e.target as HTMLElement).tagName.match(/INPUT|SELECT/)) {
          e.preventDefault(); 
          return;
      }
      setDraggingTaskRow(tasks.findIndex(t => t.id === task.id));
      e.dataTransfer.effectAllowed = "move";
  };
  
  const handleRowDrop = (e: React.DragEvent, targetTask: Task) => {
      e.preventDefault();
      if (readOnly || draggingTaskRow === null) return;
      const targetIndex = tasks.findIndex(t => t.id === targetTask.id);
      if (targetIndex === -1 || targetIndex === draggingTaskRow) return;

      const newTasks = [...tasks];
      const [moved] = newTasks.splice(draggingTaskRow, 1);
      newTasks.splice(targetIndex, 0, moved);
      
      handleUpdateTasks(newTasks);
      setDraggingTaskRow(null);
  };

  const getTaskColor = (task: Task) => {
      if (task.status === TaskStatus.DONE) return 'bg-emerald-500 border-emerald-600';
      if (task.isCritical) return 'bg-rose-500 border-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]'; 
      return 'bg-blue-500 border-blue-600';
  };

  const renderTimeScale = () => {
    const days = [];
    const totalDays = Math.max(30, projectDurationDays);
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(project.startDate);
        date.setDate(date.getDate() + i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        days.push(
            <div key={i} className={`flex-shrink-0 border-r border-slate-200 text-xs flex flex-col items-center justify-end pb-1 select-none ${isWeekend ? 'bg-slate-50' : 'bg-white'}`} style={{ width: scaledDayWidth, height: CONFIG.headerHeight }}>
                <span className="text-slate-400 font-medium">{date.getDate()}</span>
                <span className="text-slate-300 text-[10px]">{date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
            </div>
        );
    }
    return days;
  };

  // --- RENDER BOARD VIEW ---
  if (viewMode === 'board') {
      return (
          <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
             <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
                 <div className="flex items-center gap-4">
                     <h2 className="font-semibold text-slate-700">{title || project.name}</h2>
                     <button onClick={() => setViewMode('gantt')} className="text-blue-600 text-sm font-medium">Retour Gantt</button>
                 </div>
                 <FilterBar users={users} filters={filters} onFilterChange={setFilters} />
             </div>
             <div className="flex-1 overflow-hidden">
                 <TaskBoardView 
                    tasks={displayedTasks} 
                    users={users}
                    onTaskClick={(t) => { setEditingTask(t); setShowTaskModal(true); }}
                    onStatusChange={(id, status) => handleInlineUpdate(id, { status })}
                    readOnly={readOnly && !allowExecution}
                 />
             </div>
             {showTaskModal && (
                <TaskModal 
                    task={editingTask} 
                    allTasks={tasks} 
                    users={users} 
                    onSave={handleSaveTask} 
                    onDelete={editingTask ? handleDeleteTask : undefined} 
                    onClose={() => setShowTaskModal(false)} 
                    currentUser={currentUser}
                    isReadOnly={readOnly}
                    allowExecution={allowExecution}
                />
             )}
          </div>
      );
  }

  // --- RENDER CALENDAR VIEW ---
  if (viewMode === 'calendar') {
      return (
          <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
             <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
                 <div className="flex items-center gap-4">
                     <h2 className="font-semibold text-slate-700">{title || project.name}</h2>
                     <button onClick={() => setViewMode('gantt')} className="text-blue-600 text-sm font-medium">Retour Gantt</button>
                 </div>
                 <FilterBar users={users} filters={filters} onFilterChange={setFilters} />
             </div>
             <div className="flex-1 overflow-hidden p-4">
                 <CalendarView tasks={displayedTasks} onTaskClick={(t) => { setEditingTask(t); setShowTaskModal(true); }} />
             </div>
             {showTaskModal && (
                <TaskModal 
                    task={editingTask} 
                    allTasks={tasks} 
                    users={users} 
                    onSave={handleSaveTask} 
                    onDelete={editingTask ? handleDeleteTask : undefined} 
                    onClose={() => setShowTaskModal(false)} 
                    currentUser={currentUser}
                    isReadOnly={readOnly}
                    allowExecution={allowExecution}
                />
             )}
          </div>
      );
  }

  // --- RENDER GANTT VIEW ---
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
      
      {warningMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] bg-amber-50 text-amber-800 px-4 py-3 rounded-lg shadow-lg border border-amber-200 flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium">{warningMsg}</span>
              <button onClick={() => setWarningMsg(null)} className="ml-2 text-amber-500 hover:text-amber-800">×</button>
          </div>
      )}

      {/* Toolbar */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50 no-print z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {title || project.name}
            </h2>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                <button onClick={() => setViewMode('gantt')} className="p-1.5 bg-slate-100 rounded text-blue-600" title="Vue Gantt"><ListTodo className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('calendar')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Vue Calendrier"><LayoutTemplate className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('board')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Vue Tableau"><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setIsolateCriticalPath(!isolateCriticalPath)} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium border transition-colors ${isolateCriticalPath ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                <AlertOctagon className="w-3.5 h-3.5" />
                {isolateCriticalPath ? 'Vue Critique' : 'Chemin Critique'}
            </button>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleDownloadPDF} 
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-200 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                PDF
            </button>
            {!readOnly && (
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm" onClick={() => { setEditingTask(undefined); setShowTaskModal(true); }}>
                    <Plus className="w-4 h-4" /> Ajouter Tâche
                </button>
            )}
        </div>
      </div>
      
      <div className="border-b border-slate-200 px-4 pt-4 bg-slate-50/50 no-print z-10 flex-shrink-0">
         <FilterBar users={users} filters={filters} onFilterChange={setFilters} />
      </div>

      <div className="flex-1 flex overflow-hidden relative" id="gantt-export-container">
        
        {/* --- LEFT: TASK LIST HEADER & CONTENT --- */}
        <div className="w-[28rem] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0" style={{ height: CONFIG.headerHeight }}>
                <div className="w-8 flex items-center justify-center border-r border-slate-200">#</div>
                <div className="flex-1 px-4 flex items-center border-r border-slate-200">Nom</div>
                <div className="w-16 flex items-center justify-center border-r border-slate-200">Durée</div>
                <div className="w-16 flex items-center justify-center border-r border-slate-200" title="Temps Libre (Slack)">Marge</div>
                <div className="w-12 flex items-center justify-center border-r border-slate-200">Qui</div>
            </div>
            
            {/* Scrollable list controlled by the right side scroll or self */}
            <div 
                className="overflow-y-hidden overflow-x-hidden flex-1 no-scrollbar" 
                ref={taskListRef}
                // We intentionally disable scroll here to force using the timeline scroll, but allow wheel events if needed
            >
                {displayedTasks.map((task, index) => {
                    const isLocked = readOnly;
                    return (
                        <div 
                            key={task.id} 
                            onDoubleClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                            draggable={!isLocked}
                            onDragStart={(e) => handleRowDragStart(e, task)}
                            onDrop={(e) => handleRowDrop(e, task)}
                            onDragOver={(e) => e.preventDefault()}
                            className={`flex border-b border-slate-100 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${draggingTaskRow !== null && tasks[draggingTaskRow]?.id === task.id ? 'opacity-50' : ''}`}
                            style={{ height: CONFIG.rowHeight }}
                        >
                            <div className={`w-8 flex items-center justify-center border-r border-slate-100 ${isLocked ? 'cursor-default text-slate-400' : 'cursor-grab text-slate-300 hover:text-slate-500'}`}
                                 title={isLocked ? "Lecture seule" : "Glisser pour réorganiser"}
                            >
                                {isLocked ? <div className="w-1 h-1 rounded-full bg-slate-300" /> : <GripVertical className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 px-2 flex items-center border-r border-slate-100 truncate text-sm font-medium text-slate-700 gap-2">
                                <div className={`w-2 h-2 flex-shrink-0 rounded-full ${task.isCritical ? 'bg-rose-500' : 'bg-blue-400'} ${task.duration === 0 ? 'rotate-45 rounded-none' : ''}`}></div>
                                <input 
                                    value={task.name}
                                    disabled={isLocked}
                                    onChange={(e) => handleInlineUpdate(task.id, { name: e.target.value })}
                                    className={`w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-sm ${isLocked ? 'text-slate-700 cursor-default' : 'text-slate-700'}`}
                                    readOnly={readOnly}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTask(task);
                                        setShowTaskModal(true);
                                    }}
                                />
                            </div>
                            <div className="w-16 flex items-center justify-center border-r border-slate-100">
                                {readOnly ? (
                                    <span className="text-xs text-slate-600">{task.duration} j</span>
                                ) : (
                                    <input 
                                        type="number" min="0"
                                        value={task.duration}
                                        disabled={isLocked}
                                        onChange={(e) => handleInlineUpdate(task.id, { duration: parseInt(e.target.value) || 0 })}
                                        className={`w-12 bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-center text-xs ${isLocked ? 'text-slate-400' : ''}`}
                                    />
                                )}
                            </div>
                            <div className="w-16 flex items-center justify-center border-r border-slate-100 text-xs text-slate-500 font-mono">
                                {(task.slack || 0) > 0 ? `+${Math.round(task.slack || 0)}j` : '-'}
                            </div>
                            <div className="w-12 flex items-center justify-center border-r border-slate-100">
                                <select
                                    value={task.assignedTo || ''}
                                    disabled={isLocked}
                                    onChange={(e) => handleInlineUpdate(task.id, { assignedTo: e.target.value || undefined })}
                                    className={`w-full h-full bg-transparent border-none focus:ring-0 text-[10px] text-center appearance-none cursor-pointer ${isLocked ? 'text-slate-400 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">-</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.avatar}</option>)}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- RIGHT: TIMELINE HEADER & SCROLLABLE AREA --- */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
            
            {/* Timeline Header (Syncs Horizontal Scroll) */}
            <div 
                className="overflow-hidden bg-slate-50 border-b border-slate-200 flex flex-shrink-0" 
                style={{ height: CONFIG.headerHeight }}
                ref={timelineHeaderRef}
            >
               {renderTimeScale()}
            </div>

            {/* Main Scrollable Timeline (Syncs Vertical with List) */}
            <div 
                className="flex-1 overflow-auto gantt-scroll relative select-none" 
                ref={timelineRef}
                onScroll={handleScroll}
            >
                {/* SVG Connections */}
                <svg className="absolute top-0 left-0 pointer-events-none z-0" style={{ width: Math.max(projectDurationDays * scaledDayWidth, 1000), height: displayedTasks.length * CONFIG.rowHeight }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" /></marker>
                        <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" /></marker>
                    </defs>
                    {displayedTasks.map(task => 
                        task.predecessors.map(predId => {
                            const pred = displayedTasks.find(t => t.id === predId);
                            if (!pred?.endDate || !task.startDate) return null;
                            const startX = (pred.endDate.getTime() - project.startDate.getTime()) / (86400000) * scaledDayWidth;
                            const endX = (task.startDate.getTime() - project.startDate.getTime()) / (86400000) * scaledDayWidth;
                            const startY = displayedTasks.indexOf(pred) * CONFIG.rowHeight + (CONFIG.rowHeight / 2);
                            const endY = displayedTasks.indexOf(task) * CONFIG.rowHeight + (CONFIG.rowHeight / 2);
                            const pathStr = `M ${startX} ${startY} C ${startX + 20} ${startY}, ${endX - 20} ${endY}, ${endX} ${endY}`;
                            const isCrit = task.isCritical && pred.isCritical;
                            return <path key={`${pred.id}-${task.id}`} d={pathStr} fill="none" stroke={isCrit ? '#f43f5e' : '#cbd5e1'} strokeWidth={isCrit ? 2 : 1.5} markerEnd={isCrit ? "url(#arrowhead-critical)" : "url(#arrowhead)"} style={{ opacity: isolateCriticalPath && !isCrit ? 0.1 : 1 }} />;
                        })
                    )}
                    {dragUI.type === 'dependency' && (
                        <line x1={dragUI.startX - (timelineRef.current?.getBoundingClientRect().left || 0) + (timelineRef.current?.scrollLeft || 0)} y1={dragUI.startY - (timelineRef.current?.getBoundingClientRect().top || 0) + (timelineRef.current?.scrollTop || 0)} x2={dragUI.currentX - (timelineRef.current?.getBoundingClientRect().left || 0) + (timelineRef.current?.scrollLeft || 0)} y2={dragUI.currentY - (timelineRef.current?.getBoundingClientRect().top || 0) + (timelineRef.current?.scrollTop || 0)} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
                    )}
                </svg>

                {/* Grid */}
                <div className="absolute top-0 left-0 h-full flex pointer-events-none">
                     {Array.from({ length: Math.max(30, projectDurationDays) }).map((_, i) => (
                        <div key={i} className="border-r border-slate-100 h-full" style={{ width: scaledDayWidth }}></div>
                     ))}
                </div>

                {/* Bars */}
                <div className="relative z-10">
                    {displayedTasks.map((task) => {
                        const isLocked = readOnly;
                        const startOffset = task.startDate ? (task.startDate.getTime() - project.startDate.getTime()) / (86400000) * scaledDayWidth : 0;
                        let width = task.duration * scaledDayWidth;
                        let translateX = 0;
                        
                        // Visual updates during drag (from Ref/State)
                        if (dragUI.isDragging && dragUI.subjectId === task.id) {
                            const delta = dragUI.currentX - dragUI.startX;
                            if (dragUI.type === 'move') translateX = delta;
                            if (dragUI.type === 'resize') width = Math.max(0, width + delta);
                        }

                        const isMilestone = task.duration === 0;

                        return (
                            <div key={task.id} className="relative flex items-center group" style={{ height: CONFIG.rowHeight, opacity: isolateCriticalPath && !task.isCritical ? 0.3 : 1 }}>
                                {isMilestone ? (
                                    // Milestone Diamond
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                        onMouseUp={() => handleDependencyDrop(task)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTask(task);
                                            setShowTaskModal(true);
                                        }}
                                        className={`absolute w-6 h-6 rotate-45 border-2 flex items-center justify-center z-20 cursor-pointer shadow-sm transition-all
                                            ${task.isCritical ? 'bg-rose-500 border-rose-600' : 'bg-blue-500 border-blue-600'}
                                            ${isLocked ? 'opacity-50 cursor-default bg-slate-400 border-slate-500' : 'hover:scale-110'}
                                        `}
                                        style={{ 
                                            left: startOffset - 12, // Center on the line
                                            transform: `translateX(${translateX}px)` 
                                        }}
                                        title={`${task.name} (Jalon)`}
                                    >
                                        <div className="w-2 h-2 bg-white/50 -rotate-45 rounded-full"></div>
                                        {/* Connector handle */}
                                        {!isLocked && (
                                            <div onMouseDown={(e) => handleMouseDown(e, task, 'dependency')} className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-transparent hover:bg-blue-200/50 rounded-full cursor-crosshair -rotate-45" />
                                        )}
                                    </div>
                                ) : (
                                    // Standard Task Bar
                                    <div 
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                        onMouseUp={() => handleDependencyDrop(task)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTask(task);
                                            setShowTaskModal(true);
                                        }}
                                        className={`absolute rounded h-7 shadow-sm border text-xs text-white font-medium truncate transition-shadow overflow-hidden
                                            ${getTaskColor(task)} 
                                            ${isLocked ? 'opacity-60 cursor-default' : 'cursor-ew-resize hover:shadow-md'}
                                            ${dragUI.isDragging && dragUI.subjectId === task.id ? 'z-50 ring-2 ring-indigo-500 shadow-xl' : 'z-10'}
                                        `}
                                        style={{ 
                                            left: startOffset,
                                            width: Math.max(width, 4), // Min visible width
                                            transform: `translateX(${translateX}px)` 
                                        }}
                                    >
                                        {/* Progress Bar Overlay */}
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-black/20 transition-all duration-300"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 w-full h-full flex items-center px-2">
                                            {width > 30 && task.name}
                                        </div>
                                        
                                        {!isLocked && (
                                            <>
                                                <div onMouseDown={(e) => handleMouseDown(e, task, 'resize')} className="absolute right-0 top-0 h-full w-2 cursor-e-resize hover:bg-white/30 rounded-r z-20" />
                                                <div onMouseDown={(e) => handleMouseDown(e, task, 'dependency')} className="absolute left-full ml-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-slate-300 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:border-blue-600 cursor-crosshair z-20" />
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Slack (Float) Viz */}
                                {(task.slack || 0) > 0 && dragUI.subjectId !== task.id && !isolateCriticalPath && !isMilestone && (
                                    <div className="absolute h-1 bg-slate-300 pattern-dots opacity-50" style={{ left: startOffset + width, width: (task.slack || 0) * scaledDayWidth, top: '50%', marginTop: '-2px' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
      
      {showTaskModal && (
          <TaskModal 
            task={editingTask} 
            allTasks={tasks} 
            users={users} 
            onSave={handleSaveTask} 
            onDelete={editingTask ? handleDeleteTask : undefined} 
            onClose={() => setShowTaskModal(false)} 
            currentUser={currentUser} 
            isReadOnly={readOnly}
            allowExecution={allowExecution}
          />
      )}
    </div>
  );
};

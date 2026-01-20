import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // 0 = Sunday, 1 = Monday. We want 0 = Monday.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOffset = getFirstDayOfMonth(currentDate);
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTasksForDay = (day: number) => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const dateToCheck = new Date(currentYear, currentMonth, day);
    
    // Normalize time for comparison
    const checkTime = dateToCheck.getTime();
    const checkTimeEnd = checkTime + (24 * 60 * 60 * 1000);

    return tasks.filter(task => {
        if (!task.startDate || !task.endDate) return false;
        
        const start = new Date(task.startDate).setHours(0,0,0,0);
        const end = new Date(task.endDate).setHours(23,59,59,999);
        
        // Task spans this day
        return start <= dateToCheck.getTime() && end >= dateToCheck.getTime();
    });
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.DONE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200';
        case TaskStatus.BLOCKED: return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const renderCells = () => {
    const cells = [];
    
    // Empty cells for offset
    for (let i = 0; i < firstDayOffset; i++) {
        cells.push(<div key={`empty-${i}`} className="h-32 bg-slate-50 border-r border-b border-slate-200"></div>);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayTasks = getTasksForDay(day);
        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

        cells.push(
            <div key={day} className={`h-32 border-r border-b border-slate-200 p-2 overflow-y-auto hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                        {day}
                    </span>
                </div>
                <div className="space-y-1">
                    {dayTasks.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className={`text-[10px] px-1.5 py-1 rounded border truncate cursor-pointer hover:shadow-sm ${getStatusColor(task.status)}`}
                            title={task.name}
                        >
                            {task.name}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    // Fill remaining cells to keep grid tidy (optional)
    const totalCells = cells.length;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
         for (let i = 0; i < remaining; i++) {
             cells.push(<div key={`empty-end-${i}`} className="h-32 bg-slate-50 border-r border-b border-slate-200"></div>);
         }
    }

    return cells;
  };

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
             <div className="flex items-center gap-4">
                 <h2 className="font-semibold text-slate-700 capitalize flex items-center gap-2">
                     <CalendarIcon className="w-5 h-5 text-blue-600" />
                     {monthName}
                 </h2>
                 <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                </div>
             </div>
        </div>
        
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {renderCells()}
            </div>
        </div>
    </div>
  );
};

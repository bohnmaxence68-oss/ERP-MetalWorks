export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED'
}

export interface Task {
  id: string;
  name: string;
  duration: number; // in days
  predecessors: string[]; // IDs of tasks that must finish before this one starts
  
  // Calculated fields
  startDate?: Date;
  endDate?: Date;
  isCritical?: boolean;
  slack?: number; // float
  
  // Display
  progress: number; // 0-100
  assignedTo?: string;
  status: TaskStatus;
}

export interface Project {
  id: string;
  name: string;
  startDate: Date;
  tasks: Task[];
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'worker';
  avatar?: string;
}

export interface GanttConfig {
  dayWidth: number;
  headerHeight: number;
  rowHeight: number;
}

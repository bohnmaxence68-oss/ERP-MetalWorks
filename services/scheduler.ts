import { Task } from '../types';

/**
 * Calculates Early Start, Early Finish, Late Start, Late Finish, Slack, and Critical Path.
 * Assumes dependencies are Finish-to-Start.
 */
export const calculateSchedule = (projectStartDate: Date, tasks: Task[]): Task[] => {
  if (tasks.length === 0) return [];

  // Deep copy to avoid mutating original state directly during calculation
  const calculatedTasks: Task[] = JSON.parse(JSON.stringify(tasks));
  const taskMap = new Map<string, Task>();
  
  // Initialize map and date objects
  calculatedTasks.forEach(t => {
    // Reset calculated fields
    t.startDate = undefined;
    t.endDate = undefined;
    t.isCritical = false;
    t.slack = 0;
    taskMap.set(t.id, t);
  });

  // 1. Forward Pass (Calculate Early Start & Early Finish)
  // We need to process topologically or iteratively. Since cycles are invalid in Gantt, we assume DAG.
  // Simple approach: Iterate until no changes, or topological sort. 
  // For small datasets, a simple multi-pass loop is sufficient and robust against unsorted input.
  
  let changed = true;
  let iterations = 0;
  const maxIterations = tasks.length * 2; // Safety break

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const task of calculatedTasks) {
      let earlyStart = new Date(projectStartDate).getTime();

      // ES = Max(Predecessor EF)
      if (task.predecessors && task.predecessors.length > 0) {
        const predecessorEndTimes = task.predecessors.map(pid => {
          const p = taskMap.get(pid);
          return p && p.endDate ? new Date(p.endDate).getTime() : new Date(projectStartDate).getTime();
        });
        earlyStart = Math.max(...predecessorEndTimes);
      }

      // Adjust for weekends? (Simplified: No weekend logic for this MVP, straight calendar days)
      
      const currentStart = task.startDate ? new Date(task.startDate).getTime() : 0;
      
      // Calculate EF = ES + Duration (days * 24 * 60 * 60 * 1000)
      const durationMs = task.duration * 24 * 60 * 60 * 1000;
      const earlyFinish = earlyStart + durationMs;

      if (currentStart !== earlyStart) {
        task.startDate = new Date(earlyStart);
        task.endDate = new Date(earlyFinish);
        changed = true;
      }
    }
  }

  // 2. Backward Pass (Calculate Late Start & Late Finish)
  // Find project end date
  let projectEndDate = new Date(projectStartDate).getTime();
  calculatedTasks.forEach(t => {
    if (t.endDate && new Date(t.endDate).getTime() > projectEndDate) {
      projectEndDate = new Date(t.endDate).getTime();
    }
  });

  // Set initial Late Finish for tasks with no successors to Project End Date
  // Actually, standard CPM: LF = Min(Successor LS). If no successor, LF = Project End Date.
  
  // To do this efficiently, we can reverse iterate or just do another multi-pass loop.
  // Let's build a successor map first.
  const successorsMap = new Map<string, string[]>();
  calculatedTasks.forEach(t => {
    t.predecessors.forEach(pId => {
      if (!successorsMap.has(pId)) successorsMap.set(pId, []);
      successorsMap.get(pId)?.push(t.id);
    });
  });

  changed = true;
  iterations = 0;

  // Initialize Late Finish to Project End
  calculatedTasks.forEach(t => {
    // Temporary storage for backward pass, we can store in task object if we want, 
    // but for now we just compute slack directly in the loop.
    // Let's assume initially all tasks are critical until proven otherwise (slack calculation).
    // Actually, easier to store LS/LF.
    (t as any)._lateFinish = projectEndDate;
    (t as any)._lateStart = projectEndDate - (t.duration * 24 * 60 * 60 * 1000);
  });

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const task of calculatedTasks) {
      const successors = successorsMap.get(task.id) || [];
      let lateFinish = projectEndDate;

      if (successors.length > 0) {
        const successorStartTimes = successors.map(sid => {
          const s = taskMap.get(sid);
          return s ? (s as any)._lateStart : projectEndDate;
        });
        lateFinish = Math.min(...successorStartTimes);
      }

      const durationMs = task.duration * 24 * 60 * 60 * 1000;
      const lateStart = lateFinish - durationMs;

      if ((task as any)._lateFinish !== lateFinish) {
        (task as any)._lateFinish = lateFinish;
        (task as any)._lateStart = lateStart;
        changed = true;
      }
    }
  }

  // 3. Calculate Float & Critical Path
  calculatedTasks.forEach(task => {
    const es = task.startDate ? new Date(task.startDate).getTime() : 0;
    const ls = (task as any)._lateStart;
    
    // Float = LS - ES
    // Allow for small floating point errors with a threshold (e.g., 1 minute)
    const diff = ls - es;
    const slackDays = diff / (24 * 60 * 60 * 1000);
    
    task.slack = slackDays;
    task.isCritical = slackDays < 0.01; // Effectively 0
  });

  return calculatedTasks;
};

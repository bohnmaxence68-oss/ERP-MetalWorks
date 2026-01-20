import { Task } from '../types';

/**
 * Calculates Early Start, Early Finish, Late Start, Late Finish, Slack, and Critical Path.
 * Assumes dependencies are Finish-to-Start.
 * Respects 'forcedStartDate' as a "Start No Earlier Than" constraint.
 */
export const calculateSchedule = (projectStartDate: Date, tasks: Task[]): Task[] => {
  if (tasks.length === 0) return [];

  // Deep copy to avoid mutating original state directly during calculation
  // We preserve the order of the input array
  const calculatedTasks: Task[] = JSON.parse(JSON.stringify(tasks));
  const taskMap = new Map<string, Task>();
  
  // Initialize map and date objects
  calculatedTasks.forEach(t => {
    // Reset calculated fields but keep forcedStartDate
    t.startDate = undefined;
    t.endDate = undefined;
    t.isCritical = false;
    t.slack = 0;
    
    // Ensure forcedStartDate is a Date object if present
    if (t.forcedStartDate) {
        t.forcedStartDate = new Date(t.forcedStartDate);
    }

    taskMap.set(t.id, t);
  });

  // 1. Forward Pass (Calculate Early Start & Early Finish)
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

      // Apply Constraint: Start No Earlier Than forcedStartDate
      if (task.forcedStartDate) {
          const forcedTime = task.forcedStartDate.getTime();
          if (forcedTime > earlyStart) {
              earlyStart = forcedTime;
          }
      }

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
  let projectEndDate = new Date(projectStartDate).getTime();
  calculatedTasks.forEach(t => {
    if (t.endDate && new Date(t.endDate).getTime() > projectEndDate) {
      projectEndDate = new Date(t.endDate).getTime();
    }
  });

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
    const diff = ls - es;
    const slackDays = diff / (24 * 60 * 60 * 1000);
    
    task.slack = slackDays;
    task.isCritical = slackDays < 0.01; // Effectively 0
  });

  return calculatedTasks;
};

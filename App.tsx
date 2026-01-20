import React, { useState } from 'react';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { GanttView } from './components/Gantt/GanttView';
import { ProjectList } from './components/ProjectList';
import { UserManagement } from './components/UserManagement';
import { Project, TaskStatus } from './types';

// Mock Initial Data
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Fabrication Cuve Inox 316L',
    startDate: new Date(),
    tasks: [
      { id: '1', name: 'Étude & Plans', duration: 3, predecessors: [], status: TaskStatus.DONE, progress: 100 },
      { id: '2', name: 'Commande Matière', duration: 5, predecessors: ['1'], status: TaskStatus.IN_PROGRESS, progress: 60 },
      { id: '3', name: 'Réception Matière', duration: 1, predecessors: ['2'], status: TaskStatus.TODO, progress: 0 },
      { id: '4', name: 'Découpe Laser', duration: 2, predecessors: ['3'], status: TaskStatus.TODO, progress: 0 },
      { id: '5', name: 'Roulage Viroles', duration: 2, predecessors: ['4'], status: TaskStatus.TODO, progress: 0 },
      { id: '6', name: 'Soudage Longi', duration: 3, predecessors: ['5'], status: TaskStatus.TODO, progress: 0 },
      { id: '7', name: 'Assemblage Fonds', duration: 2, predecessors: ['6'], status: TaskStatus.TODO, progress: 0 },
      { id: '8', name: 'Contrôle Radio', duration: 1, predecessors: ['7'], status: TaskStatus.TODO, progress: 0 },
      { id: '9', name: 'Finitions & Passivation', duration: 2, predecessors: ['8'], status: TaskStatus.TODO, progress: 0 },
    ]
  },
  {
    id: 'p2',
    name: 'Maintenance Tuyauterie Vapeur',
    startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    tasks: [
        { id: '101', name: 'Inspection Site', duration: 1, predecessors: [], status: TaskStatus.TODO, progress: 0 },
        { id: '102', name: 'Démontage', duration: 2, predecessors: ['101'], status: TaskStatus.TODO, progress: 0 },
        { id: '103', name: 'Remplacement', duration: 3, predecessors: ['102'], status: TaskStatus.TODO, progress: 0 },
    ]
  }
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [currentView, setCurrentView] = useState<'dashboard' | 'project' | 'users'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const handleCreateProject = (name: string, date: Date) => {
    const newProject: Project = {
      id: String(Date.now()),
      name,
      startDate: date,
      tasks: []
    };
    setProjects([...projects, newProject]);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('project');
  };

  const handleNavigation = (view: 'dashboard' | 'users') => {
    setCurrentView(view);
    // Since view is restricted to 'dashboard' | 'users', we are always leaving 'project' view.
    setSelectedProjectId(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout 
      onLogout={() => setIsAuthenticated(false)}
      currentView={currentView}
      onNavigate={handleNavigation}
      projectName={activeProject?.name}
    >
      {currentView === 'dashboard' && (
        <ProjectList 
          projects={projects}
          onSelectProject={navigateToProject}
          onCreateProject={handleCreateProject}
        />
      )}

      {currentView === 'project' && activeProject && (
        <GanttView 
          project={activeProject} 
          onProjectUpdate={handleUpdateProject}
        />
      )}

      {currentView === 'users' && (
        <UserManagement />
      )}
    </Layout>
  );
};

export default App;
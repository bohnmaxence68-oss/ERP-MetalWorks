import React from 'react';
import { LayoutDashboard, GanttChart, Factory, Users, Settings, LogOut, ChevronLeft, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentView: 'dashboard' | 'project' | 'users';
  onNavigate: (view: 'dashboard' | 'users') => void;
  projectName?: string;
  onBackToDashboard?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onLogout, 
  currentView, 
  onNavigate,
  projectName,
  onBackToDashboard
}) => {
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">MetalWorks</h1>
            <p className="text-xs text-slate-400">ERP Chaudronnerie</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Tableau de bord" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
          />
          <NavItem 
            icon={<GanttChart size={20} />} 
            label="Planning Production" 
            active={currentView === 'project'} 
            // If we are in project view, clicking this does nothing special, stays on project or goes to list? 
            // Usually "Planning" implies the active project or the list. Let's make it go to dashboard for now.
            onClick={() => onNavigate('dashboard')}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Équipes" 
            active={currentView === 'users'} 
            onClick={() => onNavigate('users')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Configuration" 
            onClick={() => {}}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              AD
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">Chef d'atelier</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span className="cursor-pointer hover:text-slate-800" onClick={() => onNavigate('dashboard')}>Production</span>
                {currentView === 'project' && projectName && (
                  <>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    <span className="font-semibold text-slate-800">{projectName}</span>
                  </>
                )}
                {currentView === 'users' && (
                  <>
                     <ChevronLeft className="w-4 h-4 rotate-180" />
                     <span className="font-semibold text-slate-800">Utilisateurs</span>
                  </>
                )}
            </div>
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
            </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden p-6 relative bg-slate-100">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    active 
      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
  }`}>
    {icon}
    {label}
  </button>
);

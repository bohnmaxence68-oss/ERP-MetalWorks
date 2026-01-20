
import React, { useState } from 'react';
import { LayoutDashboard, Factory, LogOut, ChevronLeft, ChevronDown, Bell, Settings, ArrowLeft, Package } from 'lucide-react';
import { Project, Notification, User, Role, GlobalAppConfig } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentView: 'dashboard' | 'project' | 'users' | 'quotes' | 'production' | 'settings' | 'app_settings' | 'stock';
  onNavigate: (view: any) => void;
  projects?: Project[]; 
  currentProjectId?: string; 
  onSelectProject?: (id: string) => void;
  notifications?: Notification[];
  currentUser: User;
  currentRole: Role;
  appConfig: GlobalAppConfig;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onLogout, 
  currentView, 
  onNavigate,
  projects = [],
  currentProjectId,
  onSelectProject,
  notifications = [],
  currentUser,
  currentRole,
  appConfig
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  // If we are inside a specific project context (view is project/gantt, quote or prod with ID)
  const isProjectContext = currentProjectId !== undefined;

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Top Header - Now contains everything */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-30 shrink-0">
            
            {/* LEFT: Logo & Navigation Breadcrumbs */}
            <div className="flex items-center gap-6">
                {/* Logo Area */}
                <div 
                    onClick={() => onNavigate('dashboard')} 
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    {appConfig.logoUrl ? (
                        <img src={appConfig.logoUrl} alt="Logo" className="h-8 w-auto rounded object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                            <Factory className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className="hidden md:block">
                        <h1 className="font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors text-lg">{appConfig.appName}</h1>
                        <p className="text-[10px] text-slate-500 font-medium">{appConfig.appSubtitle}</p>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <span 
                        className="cursor-pointer hover:text-blue-600 hover:underline transition-colors flex items-center gap-1" 
                        onClick={() => onNavigate('dashboard')}
                    >
                        <LayoutDashboard size={14}/> Accueil
                    </span>
                    
                    {isProjectContext && (
                      <>
                        <ChevronLeft className="w-4 h-4 rotate-180 text-slate-300" />
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {projects.find(p => p.id === currentProjectId)?.name}
                        </span>
                      </>
                    )}
                    
                    {currentView === 'users' && (
                      <>
                         <ChevronLeft className="w-4 h-4 rotate-180 text-slate-300" />
                         <span className="font-semibold text-slate-800">Gestion Équipes</span>
                      </>
                    )}

                     {currentView === 'settings' && (
                      <>
                         <ChevronLeft className="w-4 h-4 rotate-180 text-slate-300" />
                         <span className="font-semibold text-slate-800">Paramètres Global</span>
                      </>
                    )}
                </div>
            </div>
            
            {/* RIGHT: Notifications & User Profile */}
            <div className="flex items-center gap-4 relative">
                {/* Notifications */}
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                >
                    <Bell size={20} />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                    )}
                </button>

                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                        <div className="absolute right-20 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">Rien à signaler.</div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.type === 'alert' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                            <div>
                                                <p className="text-sm text-slate-700">{notif.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">{notif.date.toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="h-8 w-px bg-slate-200"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{currentRole.name}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden">
                        {currentUser.avatar ? currentUser.avatar : currentUser.name.substring(0, 2)}
                    </div>
                    <button 
                        onClick={onLogout}
                        className="p-2 ml-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Déconnexion"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-hidden p-6 relative bg-slate-100">
          {children}
        </div>
      </main>
    </div>
  );
};

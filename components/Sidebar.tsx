import React from 'react';
import { FileText, GraduationCap, Heart, LogOut, Users } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => onViewChange(view)}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-[18px] transition-all duration-300 group ${
        currentView === view 
          ? 'bg-ios-blue text-white shadow-lg shadow-blue-500/30' 
          : 'text-gray-500 hover:bg-white hover:text-ios-blue'
      }`}
    >
      <Icon size={20} className={currentView === view ? 'text-white' : 'text-gray-400 group-hover:text-ios-blue'} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#F2F2F7]/80 backdrop-blur-2xl border-r border-white/20 p-6 flex flex-col justify-between z-40">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ios-blue to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                G
            </div>
            <div>
                <h1 className="text-lg font-bold text-ios-text leading-tight">GAMA<br/><span className="text-gray-400 text-sm font-normal">Center OS</span></h1>
            </div>
        </div>

        <nav className="space-y-2">
          <NavItem view="documents" icon={FileText} label="Documentos" />
          <NavItem view="students" icon={Users} label="Alunos" />
          <NavItem view="trainings" icon={GraduationCap} label="Treinamentos" />
          <NavItem view="psicossocial" icon={Heart} label="Psicossocial" />
        </nav>
      </div>

      <button 
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-[18px] transition-colors font-medium"
      >
        <LogOut size={20} />
        <span>Sair</span>
      </button>
    </aside>
  );
};
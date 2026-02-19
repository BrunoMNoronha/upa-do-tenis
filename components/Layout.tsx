
import React, { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
  onLogout: () => void;
  currentUser: string | null; // New Prop to identify the user role
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, useMockData, setUseMockData, onLogout, currentUser }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'orders', label: 'Ordens de Serviço', icon: '📝' },
    { id: 'clients', label: 'Clientes', icon: '👥' },
    { id: 'inventory', label: 'Estoque & Serviços', icon: '👟' },
    { id: 'cashflow', label: 'Fluxo de Caixa', icon: '💰' },
    { id: 'reports', label: 'Relatórios', icon: '📈' },
  ];

  // Conditionally add Admin menu if currentUser is 'admin'
  // With license file, currentUser will typically be 'licensed_user' unless file specifies 'admin'
  if (currentUser === 'admin') {
    menuItems.push({ id: 'admin', label: 'Administração', icon: '🛡️' });
  }

  return (
    <div className="flex h-screen bg-neutral-light overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-primary-dark text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out shadow-2xl z-20`}
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-gray-900/50 h-16">
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
             <h1 className="text-lg font-bold tracking-tight text-primary-light whitespace-nowrap">UPA do Tênis</h1>
          </div>
          
          <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className={`p-1.5 rounded-lg hover:bg-white/10 text-primary-light transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
             aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
                activeTab === item.id 
                ? 'bg-primary-light text-white shadow-lg' 
                : 'text-slate-300 hover:bg-gray-900 hover:text-white'
              }`}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="text-xl flex-shrink-0 relative z-10">{item.icon}</span>
              
              <span className={`font-medium whitespace-nowrap transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-0 hidden' : 'w-auto opacity-100 scale-100'}`}>
                {item.label}
              </span>

              {/* Tooltip on Hover when Collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer: User, Logout, Config */}
        <div className="p-4 bg-gray-900/30 border-t border-gray-900/50 space-y-4">
          
          {/* Mock Data Toggle */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
             {!isCollapsed && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DADOS</span>}
             <button
                onClick={() => setUseMockData(!useMockData)}
                className={`h-5 rounded-full relative transition-colors ${useMockData ? 'bg-accent' : 'bg-slate-600'} ${isCollapsed ? 'w-8' : 'w-9'}`}
                title={useMockData ? "Modo Mock (Fictício)" : "Modo Real"}
             >
                <div 
                  className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${useMockData ? (isCollapsed ? 'left-[18px]' : 'left-[22px]') : 'left-1'}`} 
                ></div>
             </button>
          </div>

          {/* User Profile & Logout */}
          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-3' : 'space-x-3'}`}>
             <div className="w-9 h-9 flex-shrink-0 rounded-full bg-primary-light/20 text-primary-light border border-primary-light/50 flex items-center justify-center font-bold text-xs select-none">
               {currentUser ? currentUser.substring(0, 2).toUpperCase() : 'US'}
             </div>
             
             <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 h-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-medium text-white truncate capitalize">{currentUser === 'licensed_user' ? 'Usuário Licenciado' : (currentUser || 'Usuário')}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser === 'admin' ? 'Administrador' : 'Gerente'}</p>
             </div>

             <button
              onClick={onLogout}
              className={`text-slate-400 hover:text-danger hover:bg-white/5 rounded-lg p-1.5 transition-colors ${isCollapsed ? 'mt-2' : ''}`}
              title="Sair"
              aria-label="Sair"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
               </svg>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

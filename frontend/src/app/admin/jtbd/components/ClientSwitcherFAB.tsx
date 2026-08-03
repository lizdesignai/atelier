"use client";

import React, { useState } from "react";
import { Plus, Flame, User, Building2, Briefcase, Zap, CalendarDays } from "lucide-react";

interface ClientItem {
  id: string;
  name: string;
  type: 'project' | 'subclient';
  avatarUrl?: string | null;
}

interface ClientSwitcherFABProps {
  userRole: string;
  team: any[];
  assignedClients: ClientItem[];
  currentMode: 'urgent' | 'monthly';
  selectedClient: ClientItem | null;
  viewingUserId: string;
  onSelectUrgentView: () => void;
  onSelectClient: (client: ClientItem) => void;
  onSelectTeamMember: (userId: string) => void;
  onOpenAdHocModal: () => void;
}

export default function ClientSwitcherFAB({
  userRole,
  team,
  assignedClients,
  currentMode,
  selectedClient,
  viewingUserId,
  onSelectUrgentView,
  onSelectClient,
  onSelectTeamMember,
  onOpenAdHocModal,
}: ClientSwitcherFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAdminOrManager = userRole === "admin" || userRole === "gestor";

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[9999] flex flex-col-reverse items-end gap-3 group">
      {/* Main Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all transform hover:scale-105 overflow-hidden ${
          currentMode === 'monthly' ? 'bg-[var(--color-atelier-grafite)] p-0.5' : 'bg-[var(--color-atelier-terracota)]'
        }`}
        title={currentMode === 'monthly' ? `Focus Cliente: ${selectedClient?.name}` : "Menu Focus"}
      >
        {currentMode === 'monthly' && selectedClient ? (
          selectedClient.avatarUrl ? (
            <img src={selectedClient.avatarUrl} alt={selectedClient.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-amber-600 text-white flex items-center justify-center font-extrabold text-lg">
              {selectedClient.name.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <Plus size={28} />
        )}
      </button>

      {/* Expandable Menu */}
      <div className={`flex flex-col-reverse items-end gap-3 transition-all duration-300 origin-bottom ${
        isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
      }`}>
        
        {/* DESKTOP-ONLY EXTRA ACTIONS */}
        <div className="hidden md:flex flex-col-reverse items-end gap-3">
          {/* Urgent Mode Switcher */}
          <button
            onClick={() => {
              onSelectUrgentView();
              setIsOpen(false);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-all font-bold text-xs ${
              currentMode === 'urgent' 
                ? 'bg-amber-500 text-white shadow-amber-200'
                : 'bg-white text-gray-700 border border-gray-100 hover:bg-amber-50 hover:text-amber-600'
            }`}
          >
            <Zap size={16} className={currentMode === 'urgent' ? 'animate-pulse text-yellow-200' : ''} />
            <span>⚡ Urgências 24h</span>
          </button>

          {/* Ad-Hoc Priority (Admin / Gestor) */}
          {isAdminOrManager && (
            <button 
              onClick={() => {
                onOpenAdHocModal();
                setIsOpen(false);
              }} 
              className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-red-600 transition-colors font-bold text-xs"
            >
              <span>Atribuir Prioridade</span> <Flame size={16} />
            </button>
          )}

          <div className="w-12 h-[1px] bg-gray-300 mr-2 my-1"></div>

          {/* List of Assigned Clients */}
          {assignedClients.map((client) => {
            const isSelected = currentMode === 'monthly' && selectedClient?.id === client.id;
            return (
              <button
                key={`${client.type}-${client.id}`}
                onClick={() => {
                  onSelectClient(client);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-md transition-all border text-xs font-bold ${
                  isSelected 
                    ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] shadow-lg' 
                    : 'bg-white text-[var(--color-atelier-grafite)] border-gray-100 hover:bg-amber-50 hover:border-amber-200 hover:scale-105'
                }`}
              >
                {client.avatarUrl ? (
                  <img src={client.avatarUrl} alt={client.name} className="w-6 h-6 rounded-full object-cover border border-white/40 shadow-inner shrink-0" />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 shadow-inner ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-800'
                  }`}>
                    {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <span className="truncate max-w-[180px]">{client.name}</span>
              </button>
            );
          })}
        </div>

        {/* TEAM FOCUS NAVIGATOR (MOBILE & DESKTOP GOD MODE) */}
        <div className="flex flex-col-reverse items-end gap-2.5">
          <div className="text-[9px] uppercase font-bold tracking-widest text-gray-500 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-gray-200 shadow-xs mr-1">
            Focus dos Colaboradores
          </div>
          {team.map((user) => (
            <button 
              key={user.id} 
              onClick={() => {
                onSelectTeamMember(user.id);
                setIsOpen(false);
              }} 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-md transition-all border ${
                viewingUserId === user.id 
                  ? 'bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)] shadow-lg scale-105' 
                  : 'bg-white text-[var(--color-atelier-grafite)] border-gray-200 hover:bg-gray-50 hover:scale-105'
              }`}
            >
              <span className="text-xs font-bold flex items-center gap-1">
                {user.nome.split(" ")[0]}
                {user.contract_status === 'paused' && <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1 rounded font-bold">Pausado</span>}
              </span>
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-inner" alt={user.nome} />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shadow-inner"><User size={12}/></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

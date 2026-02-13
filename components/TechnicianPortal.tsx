
import React, { useState, useEffect, useRef } from 'react';
import { Ticket } from '../types';
import { playNewTicketAlert, playAcknowledgeSound, playResolveSound, playDispatchSound, resumeAudioContext } from '../services/audioService';
import { announceCall } from '../services/geminiService';
import { 
  CheckCircle, 
  Clock, 
  Hammer, 
  User, 
  BellRing, 
  ShieldCheck, 
  Wrench, 
  AlertTriangle, 
  Info, 
  Loader2,
  Cpu,
  MapPin,
  CircleDot,
  X,
  ClipboardCheck,
  Zap,
  Target,
  UserCheck,
  Pencil,
  Megaphone
} from 'lucide-react';

interface TechPortalProps {
  tickets: Ticket[];
  onAcknowledge: (id: string, name: string) => void;
  onResolve: (id: string, action: string) => void;
}

const TechnicianPortal: React.FC<TechPortalProps> = ({ tickets, onAcknowledge, onResolve }) => {
  const [tempTechName, setTempTechName] = useState('');
  const [acknowledgingTicketId, setAcknowledgingTicketId] = useState<string | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [currentActionDesc, setCurrentActionDesc] = useState('');
  const [now, setNow] = useState(Date.now());
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const prevTicketIds = useRef<Set<string>>(new Set());
  
  const activeTickets = tickets.filter(t => t.status !== 'RESOLVED');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentPendingIds = tickets
      .filter(t => t.status === 'PENDING')
      .map(t => t.id);
    
    const newArrivals = currentPendingIds.filter(id => !prevTicketIds.current.has(id));
    
    if (newArrivals.length > 0) {
      playNewTicketAlert();
    }

    prevTicketIds.current = new Set(tickets.map(t => t.id));
  }, [tickets]);

  const handleManualRepeat = async (ticket: Ticket) => {
    if (isAnnouncing) return;
    setIsAnnouncing(true);
    try {
      await resumeAudioContext();
      playDispatchSound();
      await announceCall(ticket.station, ticket.model, ticket.ngId, ticket.techType);
    } catch (err) {
      console.error("Manual repeat failed", err);
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleStartAcknowledge = (id: string) => {
    setAcknowledgingTicketId(id);
    setTempTechName('');
  };

  const handleConfirmAcknowledge = () => {
    if (!acknowledgingTicketId || !tempTechName.trim()) return;
    
    playAcknowledgeSound();
    onAcknowledge(acknowledgingTicketId, tempTechName.trim());
    setAcknowledgingTicketId(null);
    setTempTechName('');
  };

  const openResolveModal = (id: string) => {
    setResolvingTicketId(id);
    setCurrentActionDesc('');
  };

  const handleConfirmResolve = () => {
    if (!resolvingTicketId) return;
    if (!currentActionDesc.trim()) {
      alert("Harap tuliskan tindakan perbaikan yang dilakukan.");
      return;
    }
    
    playResolveSound();
    onResolve(resolvingTicketId, currentActionDesc);
    setResolvingTicketId(null);
    setCurrentActionDesc('');
  };

  const getDurationColor = (startTime: number) => {
    const diff = (now - startTime) / 60000;
    if (diff < 5) return 'text-green-500';
    if (diff < 15) return 'text-amber-500';
    return 'text-red-600 animate-pulse';
  };

  const formatElapsed = (startTime: number) => {
    const diff = now - startTime;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentResolvingTicket = tickets.find(t => t.id === resolvingTicketId);
  const currentAcknowledgingTicket = tickets.find(t => t.id === acknowledgingTicketId);

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto px-1">
      <div className="bg-slate-900 px-6 py-5 md:px-10 md:py-6 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
            <BellRing className={activeTickets.length > 0 ? "text-red-500 animate-bounce" : "text-slate-500"} size={22} />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter truncate">Queue System</h3>
            <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Real-time Response Center</p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active</span>
          <span className="text-2xl md:text-4xl font-black tabular-nums text-red-500 leading-none">{activeTickets.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {activeTickets.length === 0 ? (
          <div className="col-span-full py-24 md:py-32 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner px-6 text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 md:mb-8">
              <ShieldCheck size={40} className="text-green-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800">Operational Excellence</h3>
            <p className="text-slate-400 mt-2 font-medium max-w-xs">All systems are currently reporting normal status.</p>
          </div>
        ) : (
          activeTickets.map(ticket => (
            <div 
              key={ticket.id}
              className={`group relative bg-white rounded-[2rem] md:rounded-[3rem] shadow-xl border-2 transition-all duration-500 overflow-hidden ${
                ticket.status === 'PENDING' ? 'border-red-500' : 'border-blue-500'
              }`}
            >
              <div className="flex items-center px-6 py-3 md:px-8 md:py-4 bg-slate-50 border-b border-slate-100 gap-3 md:gap-4">
                <div className="flex-1 flex items-center gap-1.5 md:gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === 'PENDING' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                   <div className={`h-1 flex-1 rounded-full ${ticket.status === 'ACKNOWLEDGED' ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                   <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === 'ACKNOWLEDGED' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                   <div className="h-1 flex-1 rounded-full bg-slate-200"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                </div>
                <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${ticket.status === 'PENDING' ? 'text-red-500' : 'text-blue-500'}`}>
                  {ticket.status === 'PENDING' ? 'Awaiting' : 'In Progress'}
                </div>
              </div>

              <div className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1 w-full overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.status === 'PENDING' ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`}></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Ticket #{ticket.id.toUpperCase()}</span>
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black tracking-tighter leading-tight break-words ${ticket.status === 'PENDING' ? 'text-red-600' : 'text-blue-700'}`}>
                    {ticket.status === 'PENDING' ? 'CRITICAL CALL' : 'REPAIRING'}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 px-2.5 py-1 bg-slate-900 text-white rounded-lg w-fit max-w-full">
                    <Target size={12} className="text-blue-400 shrink-0" />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate">{ticket.techType}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-2">
                  <div className="shrink-0">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Downtime</div>
                    <div className={`text-2xl md:text-3xl font-mono font-black tabular-nums leading-none ${getDurationColor(ticket.createdAt)}`}>
                      {formatElapsed(ticket.createdAt)}
                    </div>
                  </div>
                  {ticket.status === 'PENDING' && (
                    <button 
                      onClick={() => handleManualRepeat(ticket)}
                      disabled={isAnnouncing}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all shrink-0 ${isAnnouncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}
                    >
                      <Megaphone size={10} className={isAnnouncing ? 'animate-pulse' : ''} />
                      {isAnnouncing ? 'Calling...' : 'Repeat'}
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 md:px-8 space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                      <MapPin size={12} className="shrink-0" />
                      <span className="text-[8px] font-black uppercase tracking-widest truncate">Line/Station</span>
                    </div>
                    <div className="text-lg font-black text-slate-800 break-words leading-tight">{ticket.station}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                      <Cpu size={12} className="shrink-0" />
                      <span className="text-[8px] font-black uppercase tracking-widest truncate">Model</span>
                    </div>
                    <div className="text-lg font-black text-slate-800 break-words leading-tight">{ticket.model}</div>
                  </div>
                </div>

                <div className={`p-5 rounded-[1.5rem] md:rounded-[2rem] border-2 shadow-inner transition-all overflow-hidden ${
                  ticket.status === 'PENDING' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CircleDot size={12} className={ticket.status === 'PENDING' ? 'text-red-400' : 'text-blue-400'} />
                    <span className={`text-[8px] font-black uppercase tracking-widest truncate ${ticket.status === 'PENDING' ? 'text-red-400' : 'text-blue-400'}`}>NG Signature</span>
                  </div>
                  <div className={`text-xl md:text-2xl font-black italic tracking-tight break-words leading-tight ${ticket.status === 'PENDING' ? 'text-red-900' : 'text-blue-900'}`}>
                    "{ticket.ngId}"
                  </div>
                </div>

                {ticket.status === 'ACKNOWLEDGED' && (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-100 text-blue-800 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-200 overflow-hidden">
                    <User size={12} className="shrink-0" /> <span className="truncate">Active: {ticket.technicianName}</span>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 pt-4 md:pt-6">
                {ticket.status === 'PENDING' ? (
                  <button 
                    onClick={() => handleStartAcknowledge(ticket.id)}
                    className="w-full py-5 md:py-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 md:gap-4 shadow-xl shadow-red-200 transition-all active:scale-[0.98]"
                  >
                    <Hammer size={20} />
                    START RESPONSE
                  </button>
                ) : (
                  <button 
                    onClick={() => openResolveModal(ticket.id)}
                    className="w-full py-5 md:py-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 md:gap-4 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    <CheckCircle size={20} />
                    RESOLVE ISSUE
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALS tetap menggunakan padding yang aman agar konten tidak mepet layar */}
      {acknowledgingTicketId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAcknowledgingTicketId(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 md:p-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Technician Identification</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enter name to begin repair tracking</p>
              </div>
            </div>
            <input 
              autoFocus
              type="text"
              placeholder="Full Name..."
              value={tempTechName}
              onChange={(e) => setTempTechName(e.target.value)}
              className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 font-bold text-lg"
            />
            <button 
              onClick={handleConfirmAcknowledge}
              disabled={!tempTechName.trim()}
              className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-lg disabled:opacity-50"
            >
              Confirm Response
            </button>
          </div>
        </div>
      )}

      {resolvingTicketId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setResolvingTicketId(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 md:p-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Final Resolution</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document corrective actions taken</p>
              </div>
            </div>
            <textarea 
              autoFocus
              placeholder="Describe the fix..."
              value={currentActionDesc}
              onChange={(e) => setCurrentActionDesc(e.target.value)}
              className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 font-bold h-32 resize-none"
            />
            <button 
              onClick={handleConfirmResolve}
              disabled={!currentActionDesc.trim()}
              className="w-full py-5 bg-green-600 text-white rounded-[1.5rem] font-black text-lg shadow-lg disabled:opacity-50"
            >
              Mark as Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianPortal;

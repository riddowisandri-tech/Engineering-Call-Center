
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ticket } from './types';
import OperatorPortal from './components/OperatorPortal';
import TechnicianPortal from './components/TechnicianPortal';
import Dashboard from './components/Dashboard';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { 
  MessageSquareText, 
  Wrench, 
  ArrowLeft,
  Database,
  Globe,
  Clock,
  Activity,
  Smartphone as PhoneIcon,
  Wrench as ToolIcon,
  Monitor as ScreenIcon,
  LayoutDashboard,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { FCT_MODELS as INITIAL_MODELS, NG_REASONS as INITIAL_NG, FCT_LINES as INITIAL_LINES, TECH_TYPES as INITIAL_TECH } from './constants';

const SiixLogo = ({ className = "w-20 h-10", dark = false }: { className?: string, dark?: boolean }) => (
  <svg viewBox="0 0 120 70" className={className} xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="42" className={`${dark ? 'fill-slate-900' : 'fill-white'} font-bold text-[36px]`} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-2px' }}>s</text>
    <circle cx="41" cy="14" r="5" fill="#1d5fb1" />
    <rect x="37.5" y="22" width="7" height="20" fill={dark ? '#1d5fb1' : '#fff'} />
    <rect x="54.5" y="14" width="7" height="20" fill={dark ? '#f39200' : '#fff'} />
    <circle cx="58" cy="42" r="5" fill="#f39200" />
    <text x="70" y="42" className={`${dark ? 'fill-slate-900' : 'fill-white'} font-bold text-[36px]`} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-2px' }}>x</text>
    <text x="45" y="62" className="fill-slate-500 font-serif italic font-bold text-[8px]">We care.</text>
  </svg>
);

/**
 * GlowCard Component
 * Implements mouse tracking radial glow for the main landing page buttons.
 */
const GlowCard = ({ 
  children, 
  onClick, 
  accentColor = "rgba(59, 130, 246, 0.2)" 
}: { 
  children: React.ReactNode, 
  onClick: () => void,
  accentColor?: string
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onClick={onClick}
      className="group industrial-card p-10 rounded-[3rem] text-left flex flex-col min-h-[420px] transition-all duration-500 hover:bg-slate-900/60 relative overflow-hidden cursor-pointer"
    >
      {/* Dynamic Glow Layer */}
      <div 
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${accentColor}, transparent 40%)`
        }}
      />
      <div className="relative z-10 flex flex-col flex-1 h-full">
        {children}
      </div>
    </div>
  );
};

type AppMode = 'select' | 'operator' | 'technician' | 'dashboard';

const App: React.FC = () => {
  const getInitialMode = (): AppMode => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as AppMode;
    return (['operator', 'technician', 'dashboard'].includes(mode)) ? mode : 'select';
  };

  const [mode, setMode] = useState<AppMode>(getInitialMode());
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  const [models, setModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('andon-models');
    return saved ? JSON.parse(saved) : INITIAL_MODELS;
  });
  const [lines, setLines] = useState<string[]>(() => {
    const saved = localStorage.getItem('andon-lines');
    return saved ? JSON.parse(saved) : INITIAL_LINES;
  });
  const [reasons, setReasons] = useState<string[]>(() => {
    const saved = localStorage.getItem('andon-reasons');
    return saved ? JSON.parse(saved) : INITIAL_NG;
  });
  const [techTypes, setTechTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('andon-tech-types');
    return saved ? JSON.parse(saved) : INITIAL_TECH;
  });

  useEffect(() => {
    localStorage.setItem('andon-models', JSON.stringify(models));
  }, [models]);
  useEffect(() => {
    localStorage.setItem('andon-lines', JSON.stringify(lines));
  }, [lines]);
  useEffect(() => {
    localStorage.setItem('andon-reasons', JSON.stringify(reasons));
  }, [reasons]);
  useEffect(() => {
    localStorage.setItem('andon-tech-types', JSON.stringify(techTypes));
  }, [techTypes]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB'));
    };
    const timer = setInterval(updateClock, 1000);
    updateClock();
    
    const fetchTickets = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(50);
        
        if (error) console.error("Cloud Fetch Error:", error);
        if (data) setTickets(data as Ticket[]);
      } else {
        const saved = localStorage.getItem('andon-tickets');
        if (saved) setTickets(JSON.parse(saved));
      }
    };

    fetchTickets();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let subscription: any = null;
    if (isSupabaseConfigured && supabase) {
      subscription = supabase
        .channel('public:tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new as Ticket, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Ticket) : t));
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
          }
        })
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (subscription) supabase?.removeChannel(subscription);
    };
  }, []);

  const activeCount = useMemo(() => tickets.filter(t => t.status !== 'RESOLVED').length, [tickets]);

  const handleTicketCreate = async (newTicket: Ticket) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('tickets').insert([newTicket]);
      if (error) {
        const updated = [newTicket, ...tickets];
        setTickets(updated);
        localStorage.setItem('andon-tickets', JSON.stringify(updated));
      }
    } else {
      const updated = [newTicket, ...tickets];
      setTickets(updated);
      localStorage.setItem('andon-tickets', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    const body = document.querySelector('body');
    if (body) {
      if (mode === 'select') {
        body.className = 'theme-dark';
      } else {
        body.className = 'theme-light';
      }
    }
  }, [mode]);

  if (mode === 'select') {
    return (
      <div className="min-h-screen text-white flex flex-col p-6 md:p-12 lg:p-20 relative overflow-y-auto">
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col flex-1">
          <header className="flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 gap-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                <SiixLogo className="w-24 h-12 md:w-40 md:h-20" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-4">
                  ENGINEERING <span className="text-blue-500">CALL CENTER</span>
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    Engineering Systems v5.5
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="industrial-card rounded-2xl px-8 py-4 border-l-4 border-l-blue-500 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                   <Clock size={12} className="text-blue-400" />
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Local Time</span>
                </div>
                <div className="text-2xl font-black mono tabular-nums">{currentTime}</div>
              </div>
              <div className="industrial-card rounded-2xl px-8 py-4 border-l-4 border-l-red-500 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                   <ShieldAlert size={12} className="text-red-400" />
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Call</span>
                </div>
                <div className="text-2xl font-black mono text-red-500">{activeCount} ACT</div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <GlowCard onClick={() => setMode('operator')} accentColor="rgba(220, 38, 38, 0.2)">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-red-600 transition-all duration-300">
                <PhoneIcon size={28} className="text-red-500 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">
                  Ticket<br/><span className="text-red-600">Terminal</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mb-8 group-hover:text-slate-200 transition-colors">
                  Dispatch technician alerts with voice synthesis. Optimized for mobile use.
                </p>
              </div>
              <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                Enter Console <ChevronRight size={14} />
              </div>
            </GlowCard>

            <GlowCard onClick={() => setMode('technician')} accentColor="rgba(37, 99, 235, 0.2)">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-blue-600 transition-all duration-300">
                <ToolIcon size={28} className="text-blue-500 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">
                  Technician<br/><span className="text-blue-600">Console</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mb-8 group-hover:text-slate-200 transition-colors">
                  Real-time ticket response system for Engineering Dept.
                </p>
              </div>
              <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                Access Panel <ChevronRight size={14} />
              </div>
            </GlowCard>

            <GlowCard onClick={() => setMode('dashboard')} accentColor="rgba(16, 185, 129, 0.2)">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-emerald-600 transition-all duration-300">
                <ScreenIcon size={28} className="text-emerald-500 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">
                  ECC<br/><span className="text-emerald-500">Dashboard</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mb-8 group-hover:text-slate-200 transition-colors">
                  Centralized audio broadcast and real-time production downtime metrics.
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                View Insights <ChevronRight size={14} />
              </div>
            </GlowCard>
          </div>

          <footer className="mt-auto py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-12 text-slate-400">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  <Database size={12} /> Sync Engine
                </div>
                <span className={`text-xs font-black tracking-widest uppercase ${isSupabaseConfigured ? 'text-blue-500' : 'text-slate-500'}`}>
                  {isSupabaseConfigured ? 'Cloud Authorized' : 'Local Sandbox'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  <Globe size={12} /> Server
                </div>
                <span className="text-xs font-black tracking-widest uppercase">SIIX-BATAM-ID</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">SIIX ELECTRONICS INDONESIA • ENG DEPT</span>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isOnline ? 'Network Operational' : 'Connection Lost'}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row min-h-screen bg-white">
      <nav className="w-full md:w-28 bg-slate-900 flex md:flex-col items-center justify-between py-4 md:py-10 px-6 md:px-0 md:sticky md:top-0 md:h-screen z-50 border-r border-slate-200">
        <div className="flex md:flex-col items-center gap-6 md:gap-12">
          <button onClick={() => setMode('select')} className="md:mb-6">
            <SiixLogo className="w-12 h-8 md:w-20 md:h-12" />
          </button>
          <div className="flex md:flex-col gap-3 md:gap-6">
            <button onClick={() => setMode('operator')} className={`p-4 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 ${mode === 'operator' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <MessageSquareText size={22} />
            </button>
            <button onClick={() => setMode('technician')} className={`p-4 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 ${mode === 'technician' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Wrench size={22} />
            </button>
            <button onClick={() => setMode('dashboard')} className={`p-4 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 ${mode === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <LayoutDashboard size={22} />
            </button>
          </div>
        </div>
        <button onClick={() => setMode('select')} className="p-4 rounded-2xl text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={22} />
        </button>
      </nav>
      
      <main className="flex-1 p-6 md:p-12 max-w-[1600px] mx-auto w-full overflow-y-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-slate-900">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 text-slate-900">
              {mode === 'operator' && 'Operator Console'}
              {mode === 'technician' && 'Technical Center'}
              {mode === 'dashboard' && 'ECC Dashboard'}
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
               {mode === 'operator' && 'Call technician ticket'}
               {mode === 'technician' && 'Response & resolve active alerts'}
               {mode === 'dashboard' && 'Industrial production analytics'}
            </p>
          </div>
          <div className="flex items-center gap-6 bg-slate-50 px-8 py-4 rounded-3xl border border-slate-200 shadow-sm w-full md:w-auto">
             <div className="flex items-center gap-3">
                <Clock size={16} className="text-blue-600" />
                <span className="text-lg font-black mono tabular-nums text-slate-900">{currentTime}</span>
             </div>
             <div className="w-px h-8 bg-slate-200"></div>
             <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isOnline ? 'Operational' : 'Disconnect'}</span>
             </div>
          </div>
        </header>
        
        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
          {mode === 'operator' && (
            <OperatorPortal 
              availableModels={models}
              availableLines={lines}
              availableNgReasons={reasons}
              availableTechTypes={techTypes}
              onAddModel={(m) => setModels(prev => [...new Set([...prev, m])])}
              onDeleteModel={(m) => setModels(prev => prev.filter(i => i !== m))}
              onAddLine={(l) => setLines(prev => [...new Set([...prev, l])])}
              onDeleteLine={(l) => setLines(prev => prev.filter(i => i !== l))}
              onAddNgReason={(r) => setReasons(prev => [...new Set([...prev, r])])}
              onDeleteNgReason={(r) => setReasons(prev => prev.filter(i => i !== r))}
              onAddTechType={(t) => setTechTypes(prev => [...new Set([...prev, t])])}
              onDeleteTechType={(t) => setTechTypes(prev => prev.filter(i => i !== t))}
              onTicketCreate={handleTicketCreate} 
            />
          )}
          {mode === 'technician' && (
            <TechnicianPortal 
              tickets={tickets} 
              onAcknowledge={async (id, name) => {
                if (isSupabaseConfigured && supabase) {
                  await supabase.from('tickets').update({ status: 'ACKNOWLEDGED', technicianName: name, acknowledgedAt: Date.now() }).eq('id', id);
                } else {
                  setTickets(prev => prev.map(t => t.id === id ? {...t, status: 'ACKNOWLEDGED', technicianName: name, acknowledgedAt: Date.now()} : t));
                }
              }}
              onResolve={async (id, action) => {
                if (isSupabaseConfigured && supabase) {
                  await supabase.from('tickets').update({ status: 'RESOLVED', actionTaken: action, resolvedAt: Date.now() }).eq('id', id);
                } else {
                  setTickets(prev => prev.map(t => t.id === id ? {...t, status: 'RESOLVED', actionTaken: action, resolvedAt: Date.now()} : t));
                }
              }}
            />
          )}
          {mode === 'dashboard' && (
            <Dashboard tickets={tickets} />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;


import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Ticket } from '../types';
import { announceCall } from '../services/geminiService';
import { playDispatchSound, resumeAudioContext } from '../services/audioService';
import { TECH_TYPES } from '../constants';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Zap, 
  Search,
  Volume2,
  VolumeX,
  Activity,
  History,
  User,
  Radio,
  Clock,
  UserCheck,
  TrendingUp,
  Megaphone,
  Layers as LayersIcon,
  AlertOctagon
} from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
}

const COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ tickets }) => {
  const [now, setNow] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAudioSynced, setIsAudioSynced] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const announcedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAudioSynced || isAnnouncing) return;

    const pendingToAnnounce = tickets
      .filter(t => t.status === 'PENDING' && !announcedIdsRef.current.has(t.id))
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));

    if (pendingToAnnounce.length > 0) {
      const nextTicket = pendingToAnnounce[0];
      
      const triggerAnnouncement = async () => {
        setIsAnnouncing(true);
        announcedIdsRef.current.add(nextTicket.id);
        
        try {
          playDispatchSound();
          await announceCall(nextTicket.station, nextTicket.model, nextTicket.ngId, nextTicket.techType);
        } catch (err) {
          console.error("Announcement failed on dashboard device", err);
        } finally {
          setIsAnnouncing(false);
        }
      };

      triggerAnnouncement();
    }
  }, [tickets, isAudioSynced, isAnnouncing]);

  const handleSyncAudio = async () => {
    await resumeAudioContext();
    setIsAudioSynced(true);
    tickets.forEach(t => announcedIdsRef.current.add(t.id));
  };

  const handleManualRepeat = async (ticket: Ticket) => {
    if (!isAudioSynced) {
      alert("Please Sync Audio first!");
      return;
    }
    if (isAnnouncing) return;

    setIsAnnouncing(true);
    try {
      playDispatchSound();
      await announceCall(ticket.station, ticket.model, ticket.ngId, ticket.techType);
    } catch (err) {
      console.error("Manual repeat failed", err);
    } finally {
      setIsAnnouncing(false);
    }
  };

  const stats = useMemo(() => {
    const activeCount = tickets.filter(t => t.status !== 'RESOLVED').length;
    const totalTicketsCount = tickets.length;
    let totalDowntimeMs = 0;

    const hourlyMap: { [key: string]: number } = {};
    const ngCountMap: { [key: string]: number } = {};
    const modelMap: { [key: string]: number } = {};

    tickets.forEach(t => {
      const start = Number(t.createdAt);
      const end = t.resolvedAt ? Number(t.resolvedAt) : now;
      totalDowntimeMs += (end - start);

      // Hourly Trend
      const hour = new Date(t.createdAt).getHours();
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      hourlyMap[hourLabel] = (hourlyMap[hourLabel] || 0) + 1;

      // NG Frequency (Top Defect)
      if (t.ngId) {
        ngCountMap[t.ngId] = (ngCountMap[t.ngId] || 0) + 1;
      }

      // Model Distribution
      if (t.model) {
        modelMap[t.model] = (modelMap[t.model] || 0) + 1;
      }
    });

    // Determine Top Defect
    const sortedNG = Object.entries(ngCountMap).sort((a, b) => b[1] - a[1]);
    const topDefect = sortedNG.length > 0 ? sortedNG[0] : ["NONE", 0];

    const techCategoryStatus = TECH_TYPES.map(type => {
      const relevantTickets = tickets.filter(t => t.techType === type && t.status !== 'RESOLVED');
      const hasPending = relevantTickets.some(t => t.status === 'PENDING');
      const hasAcknowledged = relevantTickets.some(t => t.status === 'ACKNOWLEDGED');
      
      let status: 'OPEN' | 'IN PROCESS' | 'CLOSE' = 'CLOSE';
      if (hasPending) {
        status = 'OPEN';
      } else if (hasAcknowledged) {
        status = 'IN PROCESS';
      }

      return { type, status };
    });

    const hourlyData = Object.entries(hourlyMap)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const modelData = Object.entries(modelMap).map(([name, value]) => ({ name, value }));
    
    return { 
      totalDowntimeMs, 
      activeCount, 
      totalTicketsCount,
      topDefect: { code: topDefect[0], count: topDefect[1] },
      hourlyData, 
      techCategoryStatus, 
      modelData
    };
  }, [tickets, now]);

  const filteredTickets = useMemo(() => {
    return [...tickets].sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).filter(t => 
      !searchTerm || 
      t.station.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ngId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.techType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto text-slate-900 px-2 overflow-x-hidden">
      {/* Header Status Bar */}
      <div className="industrial-card rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between border-t-4 border-t-blue-600 bg-white shadow-2xl gap-6">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto overflow-hidden">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
            <Activity className="text-blue-600" size={28} />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight truncate">Engineering Call Center</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isAudioSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                {isAudioSynced ? 'Broadcast: Online' : 'Manual Audio Sync Required'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center md:justify-end">
           <button 
             onClick={handleSyncAudio}
             className={`px-6 py-4 md:px-10 md:py-5 rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center gap-2 border shadow-xl shrink-0 ${
               isAudioSynced 
               ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
               : 'bg-amber-400 text-slate-900 animate-pulse border-amber-500 hover:bg-amber-500'
             }`}
           >
             {isAudioSynced ? <Volume2 size={16} /> : <VolumeX size={16} />}
             {isAudioSynced ? 'Audio Active' : 'Enable Audio'}
           </button>

           <div className="bg-slate-950 border border-slate-800 px-6 py-4 md:px-10 md:py-5 rounded-[1.5rem] flex flex-col items-center min-w-[120px] shadow-2xl">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 whitespace-nowrap">Active Alerts</span>
             <span className="text-3xl md:text-4xl font-black text-red-500 tabular-nums leading-none">{stats.activeCount}</span>
           </div>
        </div>
      </div>

      {/* KPI Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="industrial-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-lg border-b-8 border-b-blue-600">
           <div className="flex justify-between items-start mb-4">
             <div className="space-y-1 overflow-hidden">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Tickets</span>
               <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter tabular-nums truncate">{stats.totalTicketsCount}</h3>
             </div>
             <div className="p-2 md:p-3 rounded-xl shrink-0 bg-blue-50 text-blue-600">
               <LayersIcon size={20} />
             </div>
           </div>
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Historical Call Records</p>
        </div>

        <div className="industrial-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-lg border-b-8 border-b-amber-600">
           <div className="flex justify-between items-start mb-4">
             <div className="space-y-1 overflow-hidden">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tech Call Status</span>
             </div>
             <div className="p-2 md:p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
               <UserCheck size={20} />
             </div>
           </div>
           <div className="space-y-2">
             {stats.techCategoryStatus.map((tech, i) => (
               <div key={i} className="flex justify-between items-center text-[9px] font-black uppercase gap-2">
                 <span className="text-slate-600 tracking-tighter leading-none break-words flex-1" title={tech.type}>{tech.type}</span>
                 <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                   tech.status === 'OPEN' ? 'bg-red-100 text-red-600 font-black' : 
                   tech.status === 'IN PROCESS' ? 'bg-blue-100 text-blue-600 font-black' : 
                   'bg-slate-100 text-slate-400'
                 }`}>
                   {tech.status}
                 </span>
               </div>
             ))}
           </div>
        </div>

        <div className="industrial-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-lg border-b-8 border-b-red-600">
           <div className="flex justify-between items-start mb-4">
             <div className="space-y-1 overflow-hidden">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Downtime</span>
               <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter tabular-nums truncate">
                 {Math.floor(stats.totalDowntimeMs / 60000)}<span className="text-xl">m</span>
               </h3>
             </div>
             <div className="p-2 md:p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
               <Zap size={20} />
             </div>
           </div>
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Production Impact</p>
        </div>

        <div className="industrial-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-lg border-b-8 border-b-emerald-600">
           <div className="flex justify-between items-start mb-4">
             <div className="space-y-1 overflow-hidden">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Top Defect</span>
               <h3 className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter truncate uppercase italic leading-none mt-1">
                 {stats.topDefect.code}
               </h3>
               <div className="flex items-center gap-1 mt-1">
                 <span className="text-[10px] font-black text-slate-900">{stats.topDefect.count}</span>
                 <span className="text-[8px] font-bold text-slate-400 uppercase">Occurrences</span>
               </div>
             </div>
             <div className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
               <AlertOctagon size={20} />
             </div>
           </div>
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Most Frequent Issue</p>
        </div>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 industrial-card p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] bg-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <TrendingUp className="text-blue-600" size={20} />
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Hourly Alert Trend</h3>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.hourlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontStyle: 'bold', fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontStyle: 'bold', fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="industrial-card p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] bg-white shadow-xl">
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <Radio className="text-slate-400" size={20} />
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Model Affected</h3>
          </div>
          <div className="h-[200px] md:h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.modelData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                  {stats.modelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{tickets.length}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Calls</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
             {stats.modelData.slice(0, 3).map((m, i) => (
               <div key={m.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-black text-slate-700 uppercase truncate pr-4">{m.name}</span>
                  <span className="text-[10px] font-black text-slate-900 shrink-0">{m.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="industrial-card rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-slate-100">
        <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <History className="text-blue-600" size={20} />
            <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Downtime History</h3>
          </div>
          <div className="relative w-full sm:w-64 md:w-80">
            <input 
              type="text" 
              placeholder="SEARCH BY LINE/TECH..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-black text-[10px] text-slate-900 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-50/80">
              <tr>
                <th className="px-8 py-5">Model & Unit ID</th>
                <th className="px-8 py-5">Diagnostic Tag</th>
                <th className="px-8 py-5">Field Person</th>
                <th className="px-8 py-5">Downtime</th>
                <th className="px-8 py-5 text-right">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.map(t => {
                const duration = (t.resolvedAt || now) - Number(t.createdAt);
                
                return (
                  <tr key={t.id} className={`transition-all hover:bg-slate-50/50 ${t.status !== 'RESOLVED' ? 'bg-red-50/10' : ''}`}>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-lg font-black text-slate-900 tracking-tight leading-none truncate">{t.model}</span>
                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest truncate">{t.station}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2.5 py-1 text-white text-[9px] font-black uppercase tracking-tighter rounded shrink-0 ${t.status === 'RESOLVED' ? 'bg-slate-500' : 'bg-red-600'}`}>
                          {t.ngId}
                        </span>
                        {t.status === 'PENDING' && (
                          <button 
                            onClick={() => handleManualRepeat(t)}
                            disabled={isAnnouncing}
                            className={`p-1.5 rounded-full transition-all shrink-0 ${isAnnouncing ? 'text-slate-300' : 'text-blue-600 hover:bg-blue-50'}`}
                          >
                            <Megaphone size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-lg font-black text-slate-900 tracking-tight leading-none truncate">{t.technicianName || '—'}</span>
                        {t.technicianName && (
                          <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest truncate">{t.techType}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                         <Clock size={14} className="text-amber-600 shrink-0" />
                         <span className={`text-2xl font-black tracking-tighter tabular-nums ${t.status === 'RESOLVED' ? 'text-slate-400' : 'text-amber-600'}`}>
                           {formatFullTime(duration)}
                         </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`text-[10px] font-bold block max-w-[220px] ml-auto leading-tight break-words ${t.actionTaken ? 'text-slate-700 italic' : 'text-slate-400 uppercase font-black text-[8px] tracking-widest'}`}>
                         {t.actionTaken || (t.status === 'RESOLVED' ? 'UNRECORDED' : 'IN PROGRESS')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function formatFullTime(ms: number) {
  if (isNaN(ms) || ms < 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  return `${m}m`;
}

export default Dashboard;

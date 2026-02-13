
import React, { useState } from 'react';
import { Ticket } from '../types';
import { playDispatchSound, resumeAudioContext } from '../services/audioService';
import { announceCall } from '../services/geminiService';
import { 
  Send, 
  Activity, 
  Settings, 
  Tag, 
  Pencil, 
  Zap, 
  Hash,
  MapPin,
  PlusCircle,
  VolumeX,
  X,
  UserCheck
} from 'lucide-react';

interface OperatorPortalProps {
  availableModels: string[];
  availableLines: string[];
  availableNgReasons: string[];
  availableTechTypes: string[];
  onAddModel: (model: string) => void;
  onDeleteModel: (model: string) => void;
  onAddLine: (line: string) => void;
  onDeleteLine: (line: string) => void;
  onAddNgReason: (reason: string) => void;
  onDeleteNgReason: (reason: string) => void;
  onAddTechType: (techType: string) => void;
  onDeleteTechType: (techType: string) => void;
  onTicketCreate: (ticket: Ticket) => void;
}

const OperatorPortal: React.FC<OperatorPortalProps> = ({ 
  availableModels, 
  availableLines,
  availableNgReasons,
  availableTechTypes,
  onAddModel,
  onDeleteModel,
  onAddLine,
  onDeleteLine,
  onAddNgReason,
  onDeleteNgReason,
  onAddTechType,
  onDeleteTechType,
  onTicketCreate 
}) => {
  const [model, setModel] = useState('');
  const [line, setLine] = useState('');
  const [ngId, setNgId] = useState('');
  const [techType, setTechType] = useState(availableTechTypes[0] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !line.trim() || !ngId.trim() || !techType.trim()) return;

    setIsSubmitting(true);

    try {
      await resumeAudioContext();
      playDispatchSound();
      await announceCall(line.trim(), model.trim(), ngId.trim(), techType.trim());
    } catch (err) {
      console.error("Audio/Voice execution failed:", err);
    }

    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      model: model.trim(),
      ngId: ngId.trim(),
      station: line.trim(),
      techType: techType.trim(),
      status: 'PENDING',
      createdAt: Date.now(),
    };

    onTicketCreate(newTicket);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setNgId('');
    }, 800);
  };

  const handleAddCurrentModel = () => {
    if (model.trim() && !availableModels.includes(model.trim())) onAddModel(model.trim());
  };

  const handleAddCurrentLine = () => {
    if (line.trim() && !availableLines.includes(line.trim())) onAddLine(line.trim());
  };

  const handleAddCurrentNgReason = () => {
    if (ngId.trim() && !availableNgReasons.includes(ngId.trim())) onAddNgReason(ngId.trim());
  };

  const handleAddCurrentTechType = () => {
    if (techType.trim() && !availableTechTypes.includes(techType.trim())) onAddTechType(techType.trim());
  };

  const ChipList = ({ 
    items, 
    activeValue, 
    onSelect, 
    onDelete 
  }: { 
    items: string[], 
    activeValue: string, 
    onSelect: (v: string) => void,
    onDelete?: (v: string) => void
  }) => (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map(item => (
        <div 
          key={item} 
          className={`flex items-center rounded-xl border transition-all overflow-hidden max-w-full ${
            activeValue === item 
            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
          }`}
        >
          <button 
            type="button" 
            onClick={() => onSelect(item)} 
            className={`px-3 py-2 font-black text-[9px] uppercase tracking-wider text-left break-words max-w-[200px] ${!onDelete ? 'pr-3' : 'pr-1.5'}`}
          >
            {item}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className={`p-2 hover:bg-black/10 transition-colors flex items-center justify-center border-l shrink-0 ${
                activeValue === item ? 'border-blue-500 text-blue-100' : 'border-slate-100 text-slate-300'
              }`}
            >
              <X size={10} strokeWidth={4} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const Waveform = () => (
    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] h-6 px-4 overflow-hidden pointer-events-none">
      {[...Array(60)].map((_, i) => {
        const height = 15 + Math.random() * 85;
        const delay = i * 0.05;
        return (
          <div 
            key={i} 
            className="w-[2px] bg-red-600/40 rounded-t-full waveform-bar" 
            style={{ 
              height: `${height}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${0.8 + Math.random() * 0.7}s`
            }} 
          />
        );
      })}
    </div>
  );

  const isFormValid = model.trim() !== '' && line.trim() !== '' && ngId.trim() !== '' && techType.trim() !== '';
  const isNewModel = model.trim() !== '' && !availableModels.includes(model.trim());
  const isNewLine = line.trim() !== '' && !availableLines.includes(line.trim());
  const isNewNgReason = ngId.trim() !== '' && !availableNgReasons.includes(ngId.trim());
  const isNewTechType = techType.trim() !== '' && !availableTechTypes.includes(techType.trim());

  return (
    <div className="max-w-xl mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Container dengan posisi relative agar Waveform bisa absolute bottom */}
      <div className="bg-[#111827] p-6 md:p-8 pb-0 relative">
        <div className="flex justify-between items-start gap-4 mb-8">
          <div className="flex gap-3 md:gap-4 overflow-hidden">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0">
              <Activity className="text-red-500" size={20} />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm md:text-[17px] font-black text-white tracking-wide uppercase truncate">Engineering Call Ticket</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Operator Console v5.5</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end shrink-0">
            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Signal Status</div>
            <div className="flex gap-[1px] items-center">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1 h-2 rounded-[1px] ${i < 4 ? 'bg-red-600' : 'bg-slate-800'}`}></div>
              ))}
              <VolumeX size={12} className="text-slate-600 ml-1.5" />
            </div>
          </div>
        </div>
        {/* Waveform menempel di garis bawah warna biru */}
        <Waveform />
      </div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8 text-slate-900">
        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserCheck size={12} className="text-red-400" /> 01. Destination Technician
          </label>
          <div className="relative">
            <input 
              type="text"
              placeholder="Select technician type..."
              value={techType}
              onChange={(e) => setTechType(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
            />
            {isNewTechType ? (
              <button onClick={handleAddCurrentTechType} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg shadow-lg">
                <PlusCircle size={16} />
              </button>
            ) : (
              <Pencil className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200" size={16} />
            )}
          </div>
          <ChipList items={availableTechTypes} activeValue={techType} onSelect={setTechType} onDelete={onDeleteTechType} />
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Settings size={12} className="text-red-400" /> 02. Machine Model
          </label>
          <div className="relative">
            <input 
              type="text"
              placeholder="Type model name..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
            />
            {isNewModel ? (
              <button onClick={handleAddCurrentModel} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg shadow-lg">
                <PlusCircle size={16} />
              </button>
            ) : (
              <Pencil className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200" size={16} />
            )}
          </div>
          <ChipList items={availableModels} activeValue={model} onSelect={setModel} onDelete={onDeleteModel} />
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Hash size={12} className="text-red-400" /> 03. Production Line
          </label>
          <div className="relative">
            <input 
              type="text"
              placeholder="e.g. LE-04..."
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
            />
            {isNewLine ? (
              <button onClick={handleAddCurrentLine} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg shadow-lg">
                <PlusCircle size={16} />
              </button>
            ) : (
              <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200" size={16} />
            )}
          </div>
          <ChipList items={availableLines} activeValue={line} onSelect={setLine} onDelete={onDeleteLine} />
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Tag size={12} className="text-red-400" /> 04. NG Tag Signature
          </label>
          <div className="relative">
            <input 
              type="text"
              placeholder="Type error code..."
              value={ngId}
              onChange={(e) => setNgId(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
            />
            {isNewNgReason ? (
              <button onClick={handleAddCurrentNgReason} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg shadow-lg">
                <PlusCircle size={16} />
              </button>
            ) : (
              <Zap className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200" size={16} />
            )}
          </div>
          <ChipList items={availableNgReasons} activeValue={ngId} onSelect={setNgId} onDelete={onDeleteNgReason} />
        </div>

        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`group relative w-full py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-4 transition-all duration-500 overflow-hidden ${
              isSubmitting
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : !isFormValid
                ? 'bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed' 
                : 'bg-red-600 text-white shadow-[0_20px_40px_rgba(220,38,38,0.3)] hover:bg-red-700'
            }`}
          >
            <span className="tracking-[0.1em] uppercase">
              {isSubmitting ? 'Transmitting...' : 'Call Technician'}
            </span>
            {!isSubmitting && <Send size={20} className={isFormValid ? 'translate-x-1 -translate-y-1' : ''} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperatorPortal;

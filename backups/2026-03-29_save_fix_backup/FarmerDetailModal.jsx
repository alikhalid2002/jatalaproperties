import React, { useState, useEffect, memo } from 'react';
import { X, Calendar, DollarSign, Wheat, Scale, Save, Calculator, ImageIcon, Upload, Loader2, ExternalLink } from 'lucide-react';

const FarmerDetailModal = memo(({ farmer, isOpen, onClose, onRecordPayment }) => {
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setFile(null);
    }
  }, [isOpen]);

  if (!isOpen || !farmer) return null;

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onRecordPayment(farmer.id, amount, file);
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error("Payment recording failed:", error);
      setIsSaving(false);
      alert("Could not save payment. Check your Firebase Storage settings.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6 bg-[#0f172a]/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="text-left">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl lg:text-3xl font-black text-white font-urdu">{farmer.nameUr}</h2>
              <span className="text-slate-500 font-black ml-1">•</span>
              <span className="text-lg lg:text-xl font-black text-slate-300 tracking-tighter italic">{farmer.landSize} {farmer.landUnit}</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">{farmer.nameEn} • Land Management</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-700/50 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Real-time Stats */}
          <div className="p-6 lg:p-8 bg-slate-900/10 border-b border-slate-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniStat label="Payable" value={`Rs. ${farmer.totalPayable?.toLocaleString() || 0}`} icon={<Calculator size={14}/>} color="blue" />
                <MiniStat label="Paid" value={`Rs. ${farmer.totalPaid?.toLocaleString() || 0}`} icon={<Save size={14}/>} color="emerald" />
                <MiniStat label="Remaining" value={`Rs. ${farmer.totalRemaining?.toLocaleString() || 0}`} icon={<Calendar size={14}/>} color="orange" />
             </div>
          </div>

          {/* Record New Payment Section */}
          <div className="p-6 lg:p-8 bg-slate-900/30 border-b border-slate-700">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
              <DollarSign size={14} /> Record New Payment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 block mb-2">Received Amount (Rs.)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 block mb-2">Payment Receipt Image</label>
                <div className="relative group/upload">
                   <label className="flex items-center gap-3 w-full bg-slate-800 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 cursor-pointer rounded-2xl py-3 px-6 transition-all group-active/upload:scale-95">
                      <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400">
                         {file ? <ImageIcon size={20} /> : <Upload size={20} />}
                      </div>
                      <div className="text-left leading-none">
                         <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{file ? "Image Ready" : "Choose File"}</p>
                         <p className="text-[10px] text-slate-500 mt-1">{file ? file.name : "PNG, JPEG support"}</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden" 
                      />
                   </label>
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="p-6 lg:p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 italic">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-slate-500 w-1/4">Date</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-slate-500 w-1/4">Amount</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-slate-500">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {farmer.history?.map((entry, idx) => (
                    <tr key={idx} className="group hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 text-[13px] font-bold text-slate-300">{entry.date}</td>
                      <td className="py-4 text-[13px] font-black text-emerald-400">Rs. {entry.amount?.toLocaleString()}</td>
                      <td className="py-4 text-left">
                         {entry.receiptUrl ? (
                            <a 
                               href={entry.receiptUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            >
                               <ImageIcon size={12} /> View Receipt <ExternalLink size={10} />
                            </a>
                         ) : (
                            <span className="text-[10px] font-bold text-slate-600 uppercase italic">No Link</span>
                         )}
                      </td>
                    </tr>
                  ))}
                  {!farmer.history?.length && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">No history records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 lg:p-8 border-t border-slate-700 bg-slate-900/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Record Payment</>}
          </button>
        </div>

      </div>
    </div>
  );
});

const MiniStat = ({ label, value, icon, color }) => (
    <div className={`p-4 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 text-center`}>
        <div className={`flex items-center justify-center gap-2 mb-1.5 text-${color}-400`}>
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-black text-white italic truncate">{value}</p>
    </div>
);

export default FarmerDetailModal;

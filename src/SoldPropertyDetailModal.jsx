import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Save, Loader2, CheckCircle, Clock, Trash2, CreditCard } from 'lucide-react';

const SoldPropertyDetailModal = ({ property, isOpen, onClose, onRecordInstallment, isAdmin }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setMethod('Cash');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    setIsSaving(true);
    try {
      const remainingBefore = Number(property.remainingBalance || 0);
      const newBalance = remainingBefore - Number(amount);
      
      await onRecordInstallment(property.id, {
        amount: Number(amount),
        method,
        date,
        remainingBalanceAfter: Math.max(0, newBalance)
      });
      setIsSaving(false);
      setAmount('');
    } catch (error) {
      console.error("Installment recording failed:", error);
      setIsSaving(false);
      alert("Something went wrong saving the installment.");
    }
  };

  const isPaid = property.status === 'Fully Paid';

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6 bg-[#0f172a]/80 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden no-scrollbar">
      <div className="bg-[#1e293b] border-t lg:border border-slate-700 w-full max-w-4xl lg:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl animate-slide-up lg:animate-zoom-in duration-500 flex flex-col relative h-[90vh] lg:h-auto lg:max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="text-left flex-1 mr-4">
            <h2 className="text-2xl lg:text-3xl font-black text-white italic uppercase tracking-tighter">{property.nameEn || property.nameUr}</h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1 italic">Buyer: {property.buyerName}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
              isPaid 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}>
              {isPaid ? <CheckCircle size={16} /> : <Clock size={16} />}
              <span className="text-[11px] font-black uppercase tracking-widest pt-0.5">{isPaid ? 'Fully Paid' : 'Active Installments'}</span>
            </div>
            
            <button 
              onClick={onClose}
              className="p-3 bg-slate-700/50 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Header Stats */}
          <div className="p-6 lg:p-8 bg-slate-900/10 border-b border-slate-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniStat label="Total Sale Price" value={`Rs. ${Number(property.totalPrice || 0).toLocaleString()}`} color="blue" />
                <MiniStat label="Total Received" value={`Rs. ${Number(property.totalPaid || 0).toLocaleString()}`} color="emerald" />
                <MiniStat label="Remaining Balance" value={`Rs. ${Number(property.remainingBalance || 0).toLocaleString()}`} color="orange" isHighlight={true} />
             </div>
          </div>

          {/* Record Installment Form */}
          {/* Record Installment Form - Admin Only */}
          {!isPaid && isAdmin && (
            <div className="p-6 lg:p-8 bg-slate-900/30 border-b border-slate-700">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                <CreditCard size={14} /> Record New Installment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Payment Method</label>
                    <div className="flex gap-2">
                      {['Cash', 'Bank', 'Cheque'].map((m) => (
                        <button 
                          key={m}
                          onClick={() => setMethod(m)}
                          className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                            method === m ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Rs.</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="pt-6">
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Record Installment</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div className="p-6 lg:p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 italic">Installment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="pb-4 p-2 text-[10px] uppercase tracking-widest font-black text-slate-500">Date</th>
                    <th className="pb-4 p-2 text-[10px] uppercase tracking-widest font-black text-slate-500">Amount</th>
                    <th className="pb-4 p-2 text-[10px] uppercase tracking-widest font-black text-slate-500">Method</th>
                    <th className="pb-4 p-2 text-[10px] uppercase tracking-widest font-black text-slate-500 text-left">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(property.installments || []).map((inst, idx) => (
                    <tr key={inst.id || idx} className="group hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 p-2">
                        <span className="text-[11px] font-bold text-slate-300">{inst.date}</span>
                      </td>
                      <td className="py-4 p-2">
                        <span className="text-[13px] font-black text-emerald-400">Rs. {Number(inst.amount)?.toLocaleString()}</span>
                      </td>
                      <td className="py-4 p-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{inst.method}</span>
                      </td>
                      <td className="py-4 p-2 text-left">
                        <span className="text-[11px] font-black text-slate-400 italic">Rs. {Number(inst.remainingBalanceAfter || 0).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                  {(!property.installments || property.installments.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">No installments recorded yet</td>
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
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};

const MiniStat = ({ label, value, color, isHighlight }) => (
    <div className={`p-4 rounded-2xl transition-all duration-500 ${isHighlight ? 'bg-orange-500/10 border border-orange-500/30 font-black shadow-lg shadow-orange-500/5' : `bg-slate-800/40 border border-slate-700/50`}`}>
        <div className="flex flex-col items-center text-center gap-1.5">
            <h4 className={`text-[13px] font-black uppercase tracking-widest leading-none ${isHighlight ? 'text-orange-400' : 'text-slate-400'}`}>{label}</h4>
            <p className={`text-base lg:text-lg font-black italic mt-1 ${isHighlight ? 'text-orange-400' : 'text-white'}`}>{value}</p>
        </div>
    </div>
);

export default SoldPropertyDetailModal;

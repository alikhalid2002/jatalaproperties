import { useState } from 'react';
import { X, Save, IndianRupee } from 'lucide-react';

const AddEntryModal = ({ isOpen, onClose, onAdd }) => {
  const [type, setType] = useState('revenue');
  const [amount, setAmount] = useState('');
  const [labelUr, setLabelUr] = useState('');
  const [status, setStatus] = useState('received');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAdd(type, { amount, labelUr, status });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-white italic">New Entry</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Entry Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setType('revenue')}
                className={`py-3 rounded-2xl font-bold transition-all ${type === 'revenue' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Revenue
              </button>
              <button 
                type="button"
                onClick={() => setType('expense')}
                className={`py-3 rounded-2xl font-bold transition-all ${type === 'expense' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Expense
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Amount (Rs.)</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-black italic focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Description (Urdu/English)</label>
            <input 
              type="text" 
              value={labelUr}
              onChange={(e) => setLabelUr(e.target.value)}
              placeholder="Enter details..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:border-indigo-500 transition-all outline-none"
              required
            />
          </div>

          {type === 'revenue' && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="received">Received</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;

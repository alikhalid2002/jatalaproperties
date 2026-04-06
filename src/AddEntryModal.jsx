import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus } from 'lucide-react';

const AddEntryModal = ({ isOpen, onClose, onAdd, isAdmin }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState('received');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      await onAdd(type, { amount, label, status, date });
      onClose();
    } catch (error) {
       console.error("Modal Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300 mx-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Record New Expense</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Select Date</label>
            <input 
              type="date" 
              value={date}
              disabled={!isAdmin}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:border-indigo-500 transition-all outline-none cursor-pointer disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Expense Category</label>
            <select 
              disabled={!isAdmin}
              value={label}
              onChange={(e) => {
                const val = e.target.value;
                if (val) setLabel(val);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-black italic focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer mb-2 disabled:opacity-50"
            >
              <option value="">-- SELECT CATEGORY --</option>
              <option value="Travel">Travel / Fuel</option>
              <option value="Utility">Electricity Bill</option>
              <option value="Labor">Labor / Salary</option>
              <option value="Repair">Maintenance</option>
              <option value="Tax">Tax / Fees</option>
              <option value="Other">Misc / Others</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Amount (Rs.)</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                disabled={!isAdmin}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-black italic focus:border-indigo-500 transition-all outline-none disabled:opacity-50"
                required
              />
            </div>
          </div>

          {isAdmin ? (
            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 rounded-2xl text-white font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 text-xs uppercase tracking-widest ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'SAVING...' : 'RECORD EXPENSE'}
            </button>
          ) : (
            <div className="p-4 bg-slate-800/50 rounded-2xl text-center text-rose-400 text-[10px] font-black uppercase tracking-widest">
              Admin Access Required for Writes
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AddEntryModal;

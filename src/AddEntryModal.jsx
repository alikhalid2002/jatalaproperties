import { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';

const AddEntryModal = ({ isOpen, onClose, onAdd }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [labelUr, setLabelUr] = useState('');
  const [status, setStatus] = useState('received');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAdd(type, { amount, labelUr, status, date });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white font-urdu">نیا خرچہ درج کریں</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-[12px] font-black text-slate-400 mb-2 font-urdu">تاریخ منتخب کریں</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:border-indigo-500 transition-all outline-none cursor-pointer font-urdu"
              required
            />
          </div>

          {/* Common Expense Selection */}
          <div>
            <label className="block text-[12px] font-black text-slate-400 mb-2 font-urdu">خرچے کی قسم</label>
            <select 
              onChange={(e) => {
                const val = e.target.value;
                if (val) setLabelUr(val);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer mb-2 font-urdu"
            >
              <option value="">-- منتخب کریں --</option>
              <option value="سفر">سفر</option>
              <option value="بجلی کا بل">بجلی کا بل</option>
              <option value="لیبر / مزدوری">لیبر / مزدوری</option>
              <option value="مرمت">مرمت</option>
              <option value="ٹیکس / سرکاری فیس">ٹیکس / سرکاری فیس</option>
              <option value="دیگر">دیگر</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-black text-slate-400 mb-2 font-urdu">خرچے کی رقم</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-black italic focus:border-indigo-500 transition-all outline-none font-urdu"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 rounded-2xl text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 font-urdu text-lg"
          >
            ریکارڈ محفوظ کریں
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;

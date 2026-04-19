import React, { useState, useMemo, useEffect } from 'react';
import { useSoldProperties } from './useSoldProperties';
import { Home, User, CreditCard, ChevronRight, CheckCircle, Clock, ArrowUpRight, X, Trash2 } from 'lucide-react';
import SoldPropertyDetailModal from './SoldPropertyDetailModal';
import { transliterateToEnglish } from './urduTransliterator';

const SoldProperties = ({ isAdmin, selectedYear }) => {
  const { properties, loading, recordInstallment, addProperty, deleteProperty } = useSoldProperties();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const totalSoldRevenue = useMemo(() => {
    if (!hasMounted) return 0;
    const targetYearStr = String(selectedYear);
    return properties.reduce((sum, prop) => {
      const installments = prop.installments || [];
      const yearSum = installments
        .filter(inst => {
          if (!inst.date) return false;
          return String(new Date(inst.date).getFullYear()) === targetYearStr;
        })
        .reduce((s, i) => s + Number(i.amount || 0), 0);
      return sum + yearSum;
    }, 0);
  }, [properties, selectedYear, hasMounted]);

  if (loading || !hasMounted) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-slate-500">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Loading Sold Properties...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 gap-5 pb-32">
      
      {/* Financial Summary Card - Centered as per instruction */}
      <div className="mb-10 flex justify-center px-2">
        <FinanceCard 
          label={`TOTAL SOLD REVENUE (${selectedYear})`}
          value={totalSoldRevenue}
          icon={<ArrowUpRight size={24} />}
        />
      </div>

      {/* Properties Grid - Minimalist Redesign */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-24">
        {properties.map((prop) => {
          const lifetimePaid = (prop.installments || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
          const totalPrice = Number(prop.totalPrice || 1);
          const progress = Math.min(100, (lifetimePaid / totalPrice) * 100);
          const remaining = totalPrice - lifetimePaid;
          const isPaid = prop.status === 'Fully Paid';

          return (
            <div 
              key={prop.id}
              onClick={() => { setSelectedProperty(prop); setIsModalOpen(true); }}
              className="group bg-[#111827] p-8 rounded-[48px] transition-all duration-300 hover:bg-white/[0.02] active:scale-[0.98] cursor-copy flex flex-col gap-8 shadow-2xl relative overflow-hidden"
            >
               <div className="flex justify-between items-start">
                  <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tight leading-tight pr-4">
                    {prop.nameEn || transliterateToEnglish(prop.nameUr)}
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
                      <User size={10} /> {prop.buyerNameEn || transliterateToEnglish(prop.buyerName)}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isPaid ? 'text-[#10B981] bg-[#10B981]/10' : 'text-indigo-400 bg-indigo-400/10'}`}>
                      {isPaid ? 'Paid' : 'Active'}
                    </span>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex justify-between items-end">
                     <div>
                       <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 tracking-widest text-left">Received</span>
                       <span className="text-2xl font-black text-white italic tracking-tighter">
                         <span className="text-sm opacity-50 mr-1 not-italic">Rs.</span>
                         {lifetimePaid.toLocaleString()}
                       </span>
                     </div>
                     <div className="text-right">
                       <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 tracking-widest">Remaining</span>
                       <span className="text-2xl font-black text-orange-500 italic tracking-tighter">
                         <span className="text-sm opacity-50 mr-1 not-italic">Rs.</span>
                         {remaining.toLocaleString()}
                       </span>
                     </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-[#10B981] transition-all duration-700`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  {/* UI FIX: Perfectly centered Total Value at the bottom */}
                  <div className="flex justify-center pt-2 border-t border-white/5 mt-4">
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                       TOTAL VALUE: <span className="text-[#10B981] font-black italic ml-1">{totalPrice.toLocaleString()}</span>
                     </p>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {selectedProperty && (
        <SoldPropertyDetailModal 
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRecordInstallment={recordInstallment}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

const FinanceCard = ({ label, value, icon }) => (
  <div className="bg-[#111827] p-6 md:p-8 rounded-[32px] transition-all flex flex-col justify-center items-center text-center w-full max-w-lg shadow-2xl">
    <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-full flex items-center justify-center mb-6 text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.1)] border border-white/5">
      {icon}
    </div>
    <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">{label}</span>
    <p className="text-2xl md:text-4xl font-black italic text-white tracking-tighter uppercase">
      <span className="opacity-50 mr-2 not-italic text-lg">Rs.</span>
      {value?.toLocaleString()}
    </p>
  </div>
);

export default SoldProperties;

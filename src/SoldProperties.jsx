import React, { useState } from 'react';
import { useSoldProperties } from './useSoldProperties';
import { Home, User, CreditCard, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import SoldPropertyDetailModal from './SoldPropertyDetailModal';
import { seedSoldProperties } from './seedSoldProperties';
import { transliterateToUrdu } from './urduTransliterator';

const SoldProperties = ({ isAdmin }) => {
  const { properties, loading, recordInstallment, addProperty, deleteProperty } = useSoldProperties();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const filteredProperties = properties;

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-slate-500">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Loading Sold Properties...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32" dir="ltr">
      
      {/* Grid Header or Spacer */}
      <div className="mb-4"></div>

      {/* Properties Grid - Responsive 1/2/3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-24">
        {filteredProperties.map((prop) => {
          const totalPaid = Number(prop.totalPaid || 0);
          const totalPrice = Number(prop.totalPrice || 1);
          const progress = Math.min(100, (totalPaid / totalPrice) * 100);
          const isPaid = prop.status === 'Fully Paid';

          return (
            <div 
              key={prop.id}
              onClick={() => handlePropertyClick(prop)}
              className="bg-slate-800/40 p-4 md:p-6 rounded-[32px] border border-slate-700/50 hover:bg-slate-800/60 transition-all duration-500 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-4 text-center relative overflow-hidden group"
            >
               <div className="space-y-2 text-center w-full">
                  <h3 className="text-xl lg:text-2xl font-black text-white leading-normal lg:leading-relaxed truncate py-1 uppercase tracking-tighter italic">{prop.nameEn || prop.nameUr}</h3>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                     <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                     }`}>
                        {isPaid ? 'Fully Paid' : 'Active Installment'}
                     </span>
                     <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Buyer</span>
                        <span className="text-[13px] font-black text-white leading-tight italic">{prop.buyerName}</span>
                     </div>
                  </div>
               </div>

                <div className="w-full space-y-1.5 pt-2 border-t border-slate-700/30 mt-1 overflow-hidden">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white opacity-95">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span>Received: {totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
                        <span>Remaining: {(totalPrice - totalPaid).toLocaleString()}</span>
                      </div>
                  </div>
                  
                  <div className="h-2 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner group">
                    <div 
                      className={`h-full bg-gradient-to-r ${isPaid ? 'from-emerald-600 to-emerald-400' : 'from-indigo-600 to-indigo-400'} group-hover:opacity-80 transition-all duration-700 rounded-r-sm`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-center">
                     <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                       Total Price: {totalPrice.toLocaleString()}
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

export default SoldProperties;

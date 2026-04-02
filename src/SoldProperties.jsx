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
              className="bg-slate-800/40 p-4 lg:p-6 rounded-[24px] border border-slate-700/50 hover:bg-slate-800 transition-all duration-300 shadow-xl cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 lg:gap-6">
                 <div className="text-right">
                    <h3 className="text-xl lg:text-2xl font-black text-white font-urdu leading-none mb-2">{prop.nameUr}</h3>
                    <div className="flex items-center gap-3">
                       <span className={`px-3 py-1 rounded-lg text-[9px] lg:text-[10px] font-black uppercase tracking-widest border font-urdu ${
                          isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                       }`}>
                          {isPaid ? 'مکمل ادائیگی' : 'قسط جاری'}
                       </span>
                       <span className="text-[10px] lg:text-[11px] font-black text-slate-500 font-urdu">خریدار: {prop.buyerName}</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[12px] font-black text-white leading-none">Rs. {totalPaid.toLocaleString()}</p>
                    <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Paid</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 text-slate-600 rounded-xl group-hover:text-indigo-400 transition-colors">
                    <Home size={18} />
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

import React, { useState } from 'react';
import { useSoldProperties } from './useSoldProperties';
import { Search, Plus, Home, User, CreditCard, ChevronRight, CheckCircle, Clock, Database } from 'lucide-react';
import SoldPropertyDetailModal from './SoldPropertyDetailModal';
import { seedSoldProperties } from './seedSoldProperties';
import { transliterateToUrdu } from './urduTransliterator';

const SoldProperties = ({ isAdmin }) => {
  const { properties, loading, recordInstallment, addProperty, deleteProperty } = useSoldProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProperties = properties.filter(p => 
    (p.nameUr || "").includes(searchTerm) || 
    (p.buyerName || "").includes(searchTerm)
  );

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
      
      {/* Search Bar & Seed Action */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="پراپرٹی یا خریدار کا نام تلاش کریں..."
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              const isEnglish = /[a-zA-Z]/.test(val);
              setSearchTerm(isEnglish ? transliterateToUrdu(val) : val);
            }}
            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl py-4 pl-16 pr-6 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-urdu text-[15px]"
          />
        </div>

        {properties.length === 0 && isAdmin && (
          <button 
            onClick={seedSoldProperties}
            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20 text-xs uppercase tracking-widest"
          >
            <Database size={18} />
            Seed Initial Data
          </button>
        )}
      </div>

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
                 <div className="w-14 h-14 lg:w-16 lg:h-16 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-2xl lg:text-3xl font-black text-indigo-400 font-urdu">{prop.nameUr?.charAt(0)}</span>
                 </div>
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
   {filteredProperties.length === 0 && properties.length > 0 && (
          <div className="col-span-full py-40 text-center opacity-30">
            <Search size={64} className="mx-auto mb-6 text-slate-600" />
            <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-500">No matching properties found</p>
          </div>
        )}

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

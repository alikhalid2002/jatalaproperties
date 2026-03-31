import React, { useState, useEffect } from 'react';
import { useFarmers } from './useFarmers';
import { useFinanceData } from './useFinanceData';
import { seedFarmersData } from './seedFarmers';
import { Search, Database, Calculator, Save, Calendar, Plus, Receipt, CheckCircle, AlertCircle, ArrowUpRight, Map } from 'lucide-react';
import FarmerDetailModal from './FarmerDetailModal';
import AddEntryModal from './AddEntryModal';

const LandAssets = ({ selectedYear, isAdmin }) => {
  const { 
    farmers, 
    loading: farmersLoading, 
    recordPayment, 
    updateFarmerFields,
    updateHistory,
    deleteHistory,
    updateFarmerDocuments,
    bulkRecalculateFarmers
  } = useFarmers();
  const { 
    revenue: revenueVal = 0, 
    pending: pendingVal = 0, 
    expenses: expenseVal = 0,
    totalArea: areaVal = 0 
  } = useFinanceData(selectedYear);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const yearString = `${Number(selectedYear) - 1}/${selectedYear.slice(-2)}`;

  const handleFarmerClick = (farmer) => {
    setSelectedFarmer(farmer);
    setIsModalOpen(true);
  };

  if (farmersLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-slate-500">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Loading Land Assets...</p>
      </div>
    );
  }

  const filteredFarmers = (farmers || []).filter(f => 
    (f?.nameUr || "").includes(searchTerm) || 
    (f?.nameEn || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32" dir="rtl">
      
      {/* Financial Summary Cards - Top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 font-urdu">
        <FinanceCard 
          labelUr={`کل رقبہ`} 
          labelEn={`Total Land`}
          value={`${areaVal.toLocaleString()} Acres`} 
          color="indigo" 
        />
        <FinanceCard 
          labelUr={`کل ادائیگی ${selectedYear}-${Number(selectedYear) - 1}`} 
          labelEn={`Total Paid`}
          value={`Rs. ${revenueVal.toLocaleString()}`} 
          color="emerald" 
        />
        <FinanceCard 
          labelUr={`باقی رقم ${selectedYear}-${Number(selectedYear) - 1}`}
          labelEn={`Outstanding`} 
          value={`Rs. ${pendingVal.toLocaleString()}`} 
          color="orange" 
        />
        <FinanceCard 
          labelUr={`کل اخراجات ${selectedYear}-${Number(selectedYear) - 1}`} 
          labelEn={`Total Expenses`}
          value={`Rs. ${expenseVal.toLocaleString()}`} 
          color="rose" 
        />
      </div>


        {isAdmin && farmers.length === 0 && (
          <div className="flex justify-center mb-12">
            <button 
              onClick={seedFarmersData}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Database size={20} />
              SEED INITIAL DATA
            </button>
          </div>
        )}

      {/* Farmers Grid - Responsive 1/2/3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-20">
        {filteredFarmers.map((farmer) => (
          <div 
            key={farmer.id}
            onClick={() => handleFarmerClick(farmer)}
            className="group bg-slate-800/40 p-10 rounded-[32px] border border-slate-700/50 hover:bg-slate-800/60 transition-all duration-500 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-6 text-center relative overflow-hidden"
          >
            <div className="space-y-4">
              <h3 className="text-2xl lg:text-3xl font-black text-white font-urdu leading-none">{farmer.nameUr}</h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                 <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border font-urdu ${
                    farmer.status === 'Paid' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 border-orange-500/20 text-orange-400'
                 }`}>
                    {farmer.status === 'Paid' ? 'ادا شدہ' : 'بقایا'}
                 </span>
                 <span className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-400 font-urdu">
                    {farmer.landSize} Acres
                 </span>
              </div>
            </div>

            <div className="w-full space-y-2 pt-4 border-t border-slate-700/30 font-urdu mt-2 overflow-hidden">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   <span>وصول: {(Number(farmer.totalPaid) || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                   <span>باقی: {(Number(farmer.totalRemaining) || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="h-2 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner group">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all duration-700 rounded-r-sm"
                  style={{ width: `${Math.min(100, Math.max(0, ((Number(farmer.totalPaid) || 0) / ((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0) || 1)) * 100))}%` }}
                ></div>
              </div>

              <div className="flex justify-center">
                 <p className="text-[9px] font-black text-slate-500 italic opacity-30 uppercase tracking-[0.2em]">
                   کل رقم: {((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0)).toLocaleString()}
                 </p>
              </div>
            </div>
          </div>
        ))}

        {filteredFarmers.length === 0 && farmers.length > 0 && (
          <div className="col-span-full py-40 text-center opacity-30">
            <Search size={64} className="mx-auto mb-6 text-slate-600" />
            <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-500">کوئی کسان نہیں ملا</p>
          </div>
        )}
      </div>

      <FarmerDetailModal 
        farmer={selectedFarmer} 
        isOpen={!!selectedFarmer} 
        onClose={() => setSelectedFarmer(null)}
        onRecordPayment={recordPayment}
        onUpdateFarmer={updateFarmerFields}
        onUpdateHistory={updateHistory}
        onDeleteHistory={deleteHistory}
        onUpdateDocuments={updateFarmerDocuments}
        isAdmin={isAdmin}
      />
    </div>
  );
};

const FinanceCard = ({ labelUr, labelEn, value, color }) => (
  <div className="bg-slate-800/30 p-3 lg:p-5 rounded-[24px] border border-slate-700/40 flex flex-col items-center justify-center text-center group hover:bg-slate-800/60 transition-all duration-500 shadow-xl relative">
    <div className="relative z-10 space-y-2">
      <h4 className={`text-sm lg:text-[15px] font-black font-urdu leading-none text-${color}-400`}>{labelUr}</h4>
      <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">{labelEn}</p>
      <div className="pt-1">
        <span className="text-lg lg:text-xl font-black text-white italic tracking-tighter">
           {typeof value === 'number' ? `Rs. ${value?.toLocaleString()}` : value}
        </span>
      </div>
    </div>
  </div>
);

export default LandAssets;

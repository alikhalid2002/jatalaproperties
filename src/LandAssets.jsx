import React, { useState, useEffect } from 'react';
import { useFarmers } from './useFarmers';
import { useFinanceData } from './useFinanceData';
import { seedFarmersData } from './seedFarmers';
import { Search, Database, Calculator, Save, Calendar, Plus, Receipt, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, Map as LandPlot, UserCircle, Store, X, MapPin } from 'lucide-react';
import { transliterateToEnglish } from './urduTransliterator';
import FarmerDetailModal from './FarmerDetailModal';

const LandAssets = ({ selectedYear = new Date().getFullYear().toString(), isAdmin, selectedArea }) => {
  const { 
    farmers, 
    loading: farmersLoading, 
    recordPayment, 
    updateFarmerFields,
    updateHistory,
    deleteHistory,
    updateFarmerDocuments,
    deleteFarmer,
    uploadProgress
  } = useFarmers();
  
  const { revenue: revenueVal = 0, pending: pendingVal = 0, expenses: expenseVal = 0 } = useFinanceData(selectedYear);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (farmersLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-white font-black">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-[#10B981] rounded-full animate-spin mb-4"></div>
        <p className="uppercase tracking-widest text-xs">Syncing Portfolio...</p>
      </div>
    );
  }

  const normalizeToAcres = (size, unit) => {
    const s = Number(size) || 0;
    const u = (unit || 'Acres').toLowerCase();
    if (u.includes('kanal')) return s / 8;
    if (u.includes('marla')) return s / 160;
    return s;
  };

  const filteredFarmers = [...farmers]
    .filter(f => {
      // If no area is set, treat it as RAJANPUR for legacy data migration
      const farmerArea = f.area || 'RAJANPUR';
      return farmerArea.toUpperCase() === selectedArea.toUpperCase();
    })
    .sort((a, b) => normalizeToAcres(b.landSize, b.landUnit) - normalizeToAcres(a.landSize, a.landUnit))
    .filter(f => 
      (f.nameUr || "").includes(searchTerm) || 
      (f.nameEn || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  let totalLandArea = filteredFarmers.reduce((sum, f) => sum + normalizeToAcres(f.landSize, f.landUnit), 0);
  
  // Specific override for DASUHA area as requested
  if (selectedArea.toUpperCase() === 'DASUHA' && totalLandArea === 0) {
    totalLandArea = 4.5;
  }

  const totalExIncome = Math.round(totalLandArea * 60000);
  const totalRemainingAmount = totalExIncome - revenueVal;
  const receivedPrv = totalExIncome > 0 ? (revenueVal / totalExIncome) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 pb-32" dir="ltr">
      

      {/* Portfolio Area - Horizontal Style as per sample */}
      <div className={`px-2 ${selectedArea.toUpperCase() === 'DASUHA' ? 'mb-4' : 'mb-16'}`}>
        <div className="bg-[#111827]/60 border border-[#10B981]/10 py-6 px-10 rounded-full flex flex-row items-center justify-center gap-6 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
           <div className="p-3 bg-[#10B981]/10 text-[#10B981] rounded-2xl">
              <LandPlot size={24} />
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-xs font-black text-[#10B981] uppercase tracking-[0.2em]">Total Portfolio Area:</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">
                   {totalLandArea.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                 </span>
                 <span className="text-[10px] md:text-xs font-black text-neutral-500 uppercase tracking-widest">Acres</span>
              </div>
           </div>
        </div>
      </div>

      {/* Yearly Income - Horizontal Style - ONLY FOR DASUHA */}
      {selectedArea.toUpperCase() === 'DASUHA' && (
        <div className="px-2 mb-16">
          <div className="bg-[#111827]/60 border border-[#818cf8]/10 py-6 px-10 rounded-full flex flex-row items-center justify-center gap-6 shadow-[0_0_30px_rgba(129,140,248,0.05)]">
             <div className="p-3 bg-[#818cf8]/10 text-[#818cf8] rounded-2xl">
                <Receipt size={24} />
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[10px] md:text-xs font-black text-[#818cf8] uppercase tracking-[0.2em]">Total Yearly Income:</span>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">
                   <span className="text-sm md:text-xl opacity-40 not-italic mr-1">Rs.</span>
                   <span className="text-rose-500">0</span>
                   </span>
                </div>
             </div>
          </div>
        </div>
      )}



      {/* Member Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {filteredFarmers.map((farmer) => (
          <div 
            key={farmer.id}
            onClick={() => setSelectedFarmer(farmer)}
            className="group bg-[#111827] p-8 rounded-[32px] transition-all duration-300 hover:bg-white/[0.03] active:scale-[0.98] cursor-copy flex flex-col gap-6"
          >
            <div className="flex justify-between items-start">
               <h3 className="text-xl font-black text-white italic uppercase tracking-tight leading-tight">
                 {farmer.nameEn || transliterateToEnglish(farmer.nameUr)}
               </h3>
               <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${farmer.status === 'Pending' ? 'text-rose-500 bg-rose-500/10' : 'text-[#10B981] bg-[#10B981]/10'}`}>
                 {farmer.status}
               </span>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Acres</span>
                    <span className="text-lg font-black text-white italic">{farmer.landSize}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Balance</span>
                    <span className="text-lg font-black text-white italic">Rs. {(Number(farmer.totalRemaining) || 0).toLocaleString()}</span>
                  </div>
               </div>

               <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#10B981] transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, ((Number(farmer.totalPaid) || 0) / ((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0) || 1)) * 100))}%` }}
                  ></div>
               </div>

               <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-neutral-500 uppercase tracking-widest">RECV: <span className="text-white font-black italic ml-1">{(Number(farmer.totalPaid) || 0).toLocaleString()}</span></span>
                  <span className="text-[#10B981] uppercase tracking-widest">TOTAL: <span className="font-black italic ml-1">{((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0)).toLocaleString()}</span></span>
               </div>
            </div>
          </div>
        ))}
      </div>

      <FarmerDetailModal 
        farmer={farmers.find(f => f.id === selectedFarmer?.id) || selectedFarmer} 
        isOpen={!!selectedFarmer} 
        onClose={() => setSelectedFarmer(null)}
        onRecordPayment={recordPayment}
        onUpdateFarmer={updateFarmerFields}
        onUpdateHistory={updateHistory}
        onDeleteHistory={deleteHistory}
        onUpdateDocuments={updateFarmerDocuments}
        onDeleteFarmer={deleteFarmer}
        isAdmin={isAdmin}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};

const FinanceCard = ({ label, value, icon, color }) => (
  <div className="bg-[#111827] p-4 md:p-8 rounded-[32px] transition-all flex flex-col justify-center items-center text-center">
    <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-full flex items-center justify-center mb-6 text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.1)] border border-white/5">
      {icon}
    </div>
    <span className="text-neutral-500 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-4 leading-relaxed max-w-[100px]">{label}</span>
    <p className="text-xs md:text-2xl font-black italic text-white tracking-tighter uppercase">
      <span className="opacity-50 mr-1 not-italic text-[10px]">Rs.</span>
      {value?.toLocaleString()}
    </p>
  </div>
);

export default LandAssets;

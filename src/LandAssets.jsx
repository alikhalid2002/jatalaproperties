import React, { useState, useEffect } from 'react';
import { useFarmers } from './useFarmers';
import { useFinanceData } from './useFinanceData';
import { seedFarmersData } from './seedFarmers';
import { Search, Database, Calculator, Save, Calendar, Plus, Receipt, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, Map, UserCircle, Store, X } from 'lucide-react';
import { transliterateToEnglish } from './urduTransliterator';
import FarmerDetailModal from './FarmerDetailModal';

const LandAssets = ({ selectedYear = new Date().getFullYear().toString(), isAdmin }) => {
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
  
  const { revenue: revenueVal = 0, pending: pendingVal = 0 } = useFinanceData(selectedYear);
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
    .sort((a, b) => normalizeToAcres(b.landSize, b.landUnit) - normalizeToAcres(a.landSize, a.landUnit))
    .filter(f => 
      (f.nameUr || "").includes(searchTerm) || 
      (f.nameEn || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalLandArea = farmers.reduce((sum, f) => sum + normalizeToAcres(f.landSize, f.landUnit), 0);
  const totalExIncome = Math.round(totalLandArea * 60000);
  const totalRemainingAmount = totalExIncome - revenueVal;
  const receivedPrv = totalExIncome > 0 ? (revenueVal / totalExIncome) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 pb-32" dir="ltr">
      
      {/* Financial Summary - Minimalist Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-12 px-2">
        <FinanceCard 
          label="EXPECTED REVENUE"
          value={totalExIncome} 
          year={`${parseInt(selectedYear)-1}-${parseInt(selectedYear)}`}
        />
        <FinanceCard 
          label="REMAINING BALANCE"
          value={totalRemainingAmount} 
          year={`${parseInt(selectedYear)-1}-${parseInt(selectedYear)}`}
        />
      </div>

      {/* Comparison Bar - Ultra Thin */}
      <div className="px-4 mb-16">
        <div className="flex justify-between items-center mb-4">
           <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Received Distribution</span>
           <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest italic">{receivedPrv.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
           <div 
             className="h-full bg-[#10B981] transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
             style={{ width: `${receivedPrv}%` }}
           ></div>
        </div>
      </div>

      {/* Portfolio Area - Hero Number */}
      <div className="flex flex-col items-center justify-center mb-16">
        <div className="bg-[#111827] p-10 rounded-[48px] text-center shadow-[0_0_60px_rgba(16,185,129,0.05)]">
           <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.4em] mb-4">Portfolio Area</h4>
           <div className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]">
             {totalLandArea.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
           </div>
           <span className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.3em] mt-4 block">Acres</span>
        </div>
      </div>

      {/* Farmers Grid - Flattened Cards */}
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

const FinanceCard = ({ label, value, year }) => (
  <div className="bg-[#111827] p-8 rounded-[32px] transition-all flex flex-col justify-center items-center text-center shadow-2xl">
    <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">{label}</span>
    <span className="text-neutral-600 text-[8px] font-black uppercase tracking-widest mb-4 italic">{year}</span>
    <p className="text-3xl font-black italic text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
      {value?.toLocaleString()}
    </p>
    <span className="text-[8px] font-black text-[#10B981] uppercase tracking-[0.2em] mt-3 italic">PKR — TOTAL</span>
  </div>
);

export default LandAssets;

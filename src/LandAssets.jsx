import React, { useState, useEffect } from 'react';
import { useFarmers } from './useFarmers';
import { useFinanceData } from './useFinanceData';
import { seedFarmersData } from './seedFarmers';
import { Search, Database, Calculator, Save, Calendar, Plus, Receipt, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, Map, UserCircle, Store } from 'lucide-react';
import { transliterateToEnglish } from './urduTransliterator';
import FarmerDetailModal from './FarmerDetailModal';
import AddEntryModal from './AddEntryModal';

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
    bulkRecalculateFarmers,
    uploadProgress
  } = useFarmers();
  const { revenue: revenueVal = 0, pending: pendingVal = 0, expenses: expenseVal = 0 } = useFinanceData(selectedYear);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBalanceFarmer, setEditingBalanceFarmer] = useState(null);
  const [newBalanceValue, setNewBalanceValue] = useState('');

  const yearString = `${Number(selectedYear) - 1}/${selectedYear.slice(-2)}`;

  const handleFarmerClick = (farmer) => {
    setSelectedFarmer(farmer);
  };

  const handleEditBalance = (e, farmer) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setEditingBalanceFarmer(farmer);
    setNewBalanceValue(farmer.totalRemaining || 0);
  };

  const saveBalanceOverride = async () => {
    if (!editingBalanceFarmer) return;
    
    const confirmed = window.confirm(`Are you sure you want to manually override ${editingBalanceFarmer.nameEn || editingBalanceFarmer.nameUr}'s balance?`);
    if (!confirmed) return;

    try {
      const newVal = Number(newBalanceValue);
      // We also update totalPayable to maintain mathematical consistency: Paid + Remaining = Payable
      const currentPaid = Number(editingBalanceFarmer.totalPaid) || 0;
      const newPayable = currentPaid + newVal;

      await updateFarmerFields(editingBalanceFarmer.id, { 
        totalRemaining: newVal,
        totalPayable: newPayable,
        status: newVal === 0 ? 'Paid' : 'Pending'
      });
      
      setEditingBalanceFarmer(null);
    } catch (err) {
      console.error("Balance update failed:", err);
    }
  };

  if (farmersLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-slate-500">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Loading Land Assets...</p>
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
  const remainingPrv = totalExIncome > 0 ? (totalRemainingAmount / totalExIncome) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32" dir="ltr">
      
      {/* Financial Summary Cards - 3 Column Layout */}
      <div className="grid grid-cols-3 gap-1 md:gap-4 mb-8 px-1 w-full text-center">
        <FinanceCard 
          label="Expected Land Revenue"
          year={`${parseInt(selectedYear)-1}-${parseInt(selectedYear)}`} 
          value={totalExIncome} 
          color="emerald" 
          icon={<ArrowUpRight />}
        />
        <FinanceCard 
          label="Remaining Balance"
          year={`${parseInt(selectedYear)-1}-${parseInt(selectedYear)}`} 
          value={totalRemainingAmount} 
          color="orange" 
          icon={<Clock />}
        />
        <FinanceCard 
          label="Total Expenses"
          year={`${parseInt(selectedYear)-1}-${parseInt(selectedYear)}`} 
          value={expenseVal} 
          color="rose" 
          icon={<ArrowDownRight />}
        />
      </div>

      {/* Progress Comparison Bar: Received vs Remaining */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 md:p-6 mb-12">
        <div className="flex justify-between items-center mb-3">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                Received: Rs. {revenueVal.toLocaleString()} ({receivedPrv.toFixed(1)}%)
              </span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                Balance: Rs. {totalRemainingAmount.toLocaleString()} ({remainingPrv.toFixed(1)}%)
              </span>
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
           </div>
        </div>
        <div className="h-3 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
           <div 
             className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
             style={{ width: `${receivedPrv}%` }}
           ></div>
           <div 
             className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.3)] border-l border-[#0f172a]/30"
             style={{ width: `${remainingPrv}%` }}
           ></div>
        </div>
      </div>

        <div className="flex flex-col items-center gap-6 mb-12">
          {isAdmin && farmers.length === 0 && (
            <button 
              onClick={seedFarmersData}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Database size={20} />
              SEED INITIAL DATA
            </button>
          )}
          
          {farmers.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-lg shadow-emerald-500/5 animate-in slide-in-from-bottom-2 duration-700">
               <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Map size={18} />
               </div>
               <div className="text-left">
                  <h4 className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-0.5 italic">Total Portfolio Area</h4>
                  <p className="text-xl font-black text-white italic tracking-tighter leading-none">
                     {totalLandArea.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[10px] font-black text-slate-500 not-italic ml-1 uppercase">Acres</span>
                  </p>
               </div>
            </div>
          )}
        </div>

      {/* Farmers Grid - Responsive 1/2/3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-20">
        {filteredFarmers.map((farmer) => (
          <div 
            key={farmer.id}
            onClick={() => handleFarmerClick(farmer)}
            className="group bg-slate-800/40 p-4 md:p-6 rounded-[32px] border border-slate-700/50 hover:bg-slate-800/60 transition-all duration-500 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-4 text-center relative overflow-hidden"
          >
            <div className="space-y-1">
              <h3 className="text-lg lg:text-3xl font-black text-white leading-tight lg:leading-relaxed py-1 uppercase tracking-tight lg:tracking-tighter break-words">
                {farmer.nameEn || transliterateToEnglish(farmer.nameUr)}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                 <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                    farmer.status === 'Paid' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 border-orange-500/20 text-orange-400'
                 }`}>
                    {farmer.status === 'Paid' ? 'Paid' : 'Pending'}
                 </span>
                 <span className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-400">
                    {farmer.landSize} Acres
                 </span>
                 <button 
                   onClick={(e) => handleEditBalance(e, farmer)}
                   disabled={!isAdmin}
                   className={`px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-400 flex items-center gap-1.5 transition-all ${isAdmin ? 'hover:border-indigo-500 hover:text-white cursor-pointer group/bal' : ''}`}
                 >
                    <Receipt size={12} className="text-slate-500 group-hover/bal:text-indigo-400" />
                    BAL: {(Number(farmer.totalRemaining) || 0).toLocaleString()}
                    {isAdmin && <Plus size={10} className="text-indigo-500 opacity-0 group-hover/bal:opacity-100 transition-opacity" />}
                 </button>
              </div>
            </div>

            <div className="w-full space-y-1 pt-2 border-t border-slate-700/30 mt-1 overflow-hidden">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-200 opacity-90">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   <span>Recv: {(Number(farmer.totalPaid) || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                   <span>Bal: {(Number(farmer.totalRemaining) || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="h-2 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner group">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all duration-700 rounded-r-sm"
                  style={{ width: `${Math.min(100, Math.max(0, ((Number(farmer.totalPaid) || 0) / ((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0) || 1)) * 100))}%` }}
                ></div>
              </div>

              <div className="flex justify-center items-center gap-2">
                 <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                   Total Value: {((Number(farmer.totalPaid) || 0) + (Number(farmer.totalRemaining) || 0)).toLocaleString()}
                 </p>
              </div>
            </div>
          </div>
        ))}

        {filteredFarmers.length === 0 && farmers.length > 0 && (
          <div className="col-span-full py-40 text-center opacity-30">
            <Search size={64} className="mx-auto mb-6 text-slate-600" />
            <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-500">No members found</p>
          </div>
        )}
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

      {/* Balance Adjust Modal */}
      {editingBalanceFarmer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#0f172a]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-widest text-white">Adjust Balance</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{editingBalanceFarmer.nameEn || editingBalanceFarmer.nameUr}</p>
              </div>
              <button onClick={() => setEditingBalanceFarmer(null)} className="p-2 transition-colors hover:bg-white/5 rounded-xl"><X size={20} /></button>
            </div>

            <div className="space-y-4 pt-2">
               <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2 px-2">New Remaining Balance (Rs.)</label>
                  <div className="flex items-center gap-3 px-2">
                     <Calculator size={18} className="text-indigo-400"/>
                     <input 
                       type="number"
                       autoFocus
                       value={newBalanceValue}
                       onChange={(e) => setNewBalanceValue(e.target.value)}
                       className="bg-transparent border-none outline-none font-black text-white text-xl w-full italic"
                       placeholder="0"
                     />
                  </div>
               </div>
               
               <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                 <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                 <p className="text-[9px] font-bold text-orange-400/80 uppercase leading-relaxed tracking-wider">
                   Manually overriding the balance will update the member's total payable record to match the new sum of paid + remaining amount.
                 </p>
               </div>
            </div>

            <button 
              onClick={saveBalanceOverride}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              Update Balance
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FinanceCard = ({ label, year, value, color, icon }) => (
  <div className="bg-slate-800/40 p-2 md:p-6 rounded-lg md:rounded-[32px] border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col items-center justify-center w-full min-h-[100px] md:min-h-0 relative overflow-hidden group shadow-lg">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 blur-[80px] opacity-10`}></div>
    
    <div className={`mb-2 p-2 md:p-4 bg-${color}-500/10 text-${color}-400 rounded-lg md:rounded-2xl transition-transform group-hover:scale-110 relative z-10`}>
      {React.cloneElement(icon, { size: 18 })}
    </div>

    <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full px-0.5">
      <span className={`text-${color}-400 text-[10px] md:text-[13px] font-black leading-normal block w-full drop-shadow-[0_0_8px_rgba(var(--tw-shadow-color),0.5)] py-0.5 uppercase tracking-tighter`} style={{ '--tw-shadow-color': color === 'emerald' ? '16,185,129' : color === 'indigo' ? '99,102,241' : color === 'orange' ? '249,115,22' : '244,63,94' }}>{label}</span>
      <span className={`text-${color}-400 opacity-80 text-[8px] md:text-xs font-black text-center w-full`}>{year}</span>
      <p className="text-[11px] md:text-2xl font-bold tracking-tighter whitespace-nowrap overflow-hidden text-white mt-1 w-full italic drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">Rs. {value?.toLocaleString()}</p>
    </div>
  </div>
);

export default LandAssets;

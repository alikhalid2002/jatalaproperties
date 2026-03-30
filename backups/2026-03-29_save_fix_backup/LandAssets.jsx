import React, { useState, useEffect } from 'react';
import { useFarmers } from './useFarmers';
import { seedFarmersData } from './seedFarmers';
import { Map, CheckCircle2, AlertCircle, Search, Database } from 'lucide-react';
import FarmerDetailModal from './FarmerDetailModal';

const LandAssets = () => {
  const { farmers, loading, recordPayment } = useFarmers();
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFarmerClick = (farmer) => {
    setSelectedFarmer(farmer);
    setIsModalOpen(true);
  };

  if (loading) {
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
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Search Bar - Centered */}
      <div className="flex justify-center mb-12">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="تلاش کریں... (Search Farmers)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl py-4 pl-16 pr-6 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
          />
        </div>
      </div>

      {farmers.length === 0 && (
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

      {/* Farmers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-20 no-scrollbar overflow-y-auto">
        {filteredFarmers.map((farmer) => (
          <div 
            key={farmer.id}
            onClick={() => handleFarmerClick(farmer)}
            className="bg-slate-800/40 p-8 rounded-[38px] border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500 transition-all duration-500 shadow-xl cursor-pointer group relative overflow-hidden"
          >
            {/* Status Badge */}
            <div className="absolute top-8 right-8">
              <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${
                farmer.status === 'Paid' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              }`}>
                {farmer.status === 'Paid' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span className="text-[10px] font-black uppercase tracking-widest">{farmer.status}</span>
              </div>
            </div>

            <div className="relative z-10 pt-4">
              <div className="space-y-1 mb-8 text-center">
                <h3 className="text-3xl lg:text-4xl font-black text-white group-hover:text-indigo-400 transition-all duration-500 font-urdu">{farmer.nameUr}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{farmer.nameEn}</p>
              </div>


              <div className="flex items-center gap-3 p-5 bg-slate-900/40 rounded-3xl border border-slate-700/30 justify-center group-hover:border-indigo-500/20 transition-colors">
                <Map size={20} className="text-indigo-500" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Area</p>
                  <p className="text-2xl font-black text-white mt-1.5 italic leading-none">
                    {farmer.landSize} <span className="text-[10px] uppercase tracking-tighter opacity-40">{farmer.landUnit}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredFarmers.length === 0 && farmers.length > 0 && (
          <div className="col-span-full py-40 text-center opacity-30">
            <Search size={64} className="mx-auto mb-6 text-slate-600" />
            <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-500">No matching farmers found</p>
          </div>
        )}
      </div>

      <FarmerDetailModal 
        farmer={selectedFarmer} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRecordPayment={recordPayment}
      />

    </div>
  );
};


export default LandAssets;

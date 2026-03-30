import React, { useState } from 'react';
import { 
  Map, Store, Receipt, BarChart3, Settings, 
  UserCircle, ChevronDown, Bell, LayoutDashboard, Search,
  Plus, BadgeCheck
} from 'lucide-react';
import { useFinanceData } from './useFinanceData';
import AddEntryModal from './AddEntryModal';
import LandAssets from './LandAssets';

const App = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountType, setAccountType] = useState('Ali');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats Data from Firebase
  const { revenue: revenueVal, pending: pendingVal, expenses: expenseVal, loading, addEntry } = useFinanceData();
  
  const totalComparison = revenueVal + pendingVal;
  const revenuePercent = totalComparison > 0 ? Math.round((revenueVal / totalComparison) * 100) : 0;
  const pendingPercent = totalComparison > 0 ? Math.round((pendingVal / totalComparison) * 100) : 0;

  const menuItems = [
    { id: 'Dashboard', labelUr: 'ڈیش بورڈ', labelEn: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Land', labelUr: 'زمین', labelEn: 'Land Assets', icon: <Map size={20} /> },
    { id: 'Shops', labelUr: 'دکانیں', labelEn: 'Commercial Shops', icon: <Store size={20} /> },
    { id: 'Expenses', labelUr: 'اخراجات', labelEn: 'Operational Expenses', icon: <Receipt size={20} /> },
    { id: 'Sold', labelUr: 'فروخت شدہ پراپرٹی', labelEn: 'Sold Property', icon: <BadgeCheck size={20} /> },
    { id: 'Reports', labelUr: 'رپورٹس', labelEn: 'Financial Reports', icon: <BarChart3 size={20} /> },
    { id: 'Settings', labelUr: 'ترتیبات', labelEn: 'Settings', icon: <Settings size={20} /> }
  ];

  const years = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden select-none" dir="ltr">
      
      {/* 1. Sidebar - Hidden on Mobile */}
      <aside className="hidden lg:flex w-72 bg-[#0f172a] border-r border-slate-800 flex-col z-20 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-blue-500"></div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto no-scrollbar flex flex-col pt-12 text-left">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full p-4 rounded-2xl transition-all duration-500 group ${
                activeTab === item.id 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.03]' 
                : 'text-white hover:bg-slate-800/60'
              }`}
            >
              <span className={`mr-4 transition-transform duration-500 ${activeTab === item.id ? 'scale-110 text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <div className="leading-tight space-y-2 text-left">
                <div className="font-bold text-[18px] tracking-tight">{item.labelUr}</div>
                <div className={`text-[9px] uppercase tracking-widest font-black ${activeTab === item.id ? 'text-indigo-200' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {item.labelEn}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0f172a] relative">
        
        {/* Header Section */}
        <header className="px-6 lg:px-10 py-4 lg:py-6 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-800 z-10 sticky top-0 shadow-lg">
          
          {/* Left: Year Selector */}
          <div className="flex-1 flex justify-start">
            <div className="relative">
               <button 
                  onClick={() => setShowYearMenu(!showYearMenu)}
                  className="flex items-center gap-3 lg:gap-4 bg-slate-800/40 px-4 lg:px-6 py-2 rounded-2xl border border-slate-700 shadow-sm hover:border-indigo-500 transition-all active:scale-95 group"
               >
                  <div className="text-xl lg:text-2xl font-black text-white tracking-tighter italic leading-none">
                    {selectedYear}
                  </div>
                  <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${showYearMenu ? 'rotate-180' : ''}`} />
               </button>
               {showYearMenu && (
                 <div className="absolute left-0 mt-3 w-40 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-3 backdrop-blur-xl">
                    {years.map(year => (
                      <button 
                        key={year}
                        onClick={() => { setSelectedYear(year); setShowYearMenu(false); }}
                        className="w-full text-left px-6 py-3 text-sm font-black text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        {year}
                      </button>
                    ))}
                 </div>
               )}
            </div>
          </div>

          {/* Center: Brand Title */}
          <div className="flex-1 flex justify-center">
             <h1 className="text-sm lg:text-2xl font-black tracking-[0.2em] lg:tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 uppercase italic whitespace-nowrap">
                Jatala Properties
             </h1>
          </div>

          {/* Right: Controls */}
          <div className="flex-1 flex justify-end items-center gap-2 lg:gap-3">
            <button className="p-2 lg:p-3 text-slate-400 hover:text-white transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0f172a]"></span>
            </button>

            <div className="relative ml-1 lg:ml-2">
              <button 
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 lg:gap-3 p-1 pr-3 lg:pr-5 bg-slate-800/40 hover:bg-slate-800 rounded-full border border-slate-700 transition-all active:scale-95 group"
              >
                <div className="w-8 h-8 lg:w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white border border-indigo-400/20">
                  <UserCircle size={20} />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-[12px] font-black text-white leading-none uppercase tracking-widest">{accountType}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 group-hover:text-indigo-400 ${showAccountMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showAccountMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 backdrop-blur-xl">
                   <button onClick={() => { setAccountType('Ali'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50">
                     <div className="text-left leading-tight text-white">
                       <span className="text-base font-black block">علی</span>
                       <span className="text-[9px] text-slate-400 uppercase tracking-widest">Ali</span>
                     </div>
                     {accountType === 'Ali' && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                   </button>
                   <button onClick={() => { setAccountType('Owais'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50">
                     <div className="text-left leading-tight text-white">
                       <span className="text-base font-black block">اویس</span>
                       <span className="text-[9px] text-slate-400 uppercase tracking-widest">Owais</span>
                     </div>
                     {accountType === 'Owais' && <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>}
                   </button>
                   <button onClick={() => { setAccountType('Salman'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50">
                     <div className="text-left leading-tight text-white">
                       <span className="text-base font-black block">سلمان</span>
                       <span className="text-[9px] text-slate-400 uppercase tracking-widest">Salman</span>
                     </div>
                     {accountType === 'Salman' && <div className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>}
                   </button>
                   <button onClick={() => { setAccountType('Guest'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors">
                     <div className="text-left leading-tight text-white">
                       <span className="text-base font-black block">وزٹر</span>
                       <span className="text-[9px] text-slate-400 uppercase tracking-widest">Guest Mode</span>
                     </div>
                     {accountType === 'Guest' && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                   </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 lg:pb-12 h-full">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-6 lg:p-12 space-y-8 lg:space-y-12">
            
            {activeTab === 'Dashboard' ? (
              <div className="flex-1 flex flex-col justify-center gap-8 lg:gap-12 animate-in fade-in duration-500">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 w-full">
                  <StatCard labelUr="کل آمدنی" labelEn="Total Revenue" value={revenueVal} />
                  <StatCard labelUr="باقی رقم" labelEn="Pending Collection" value={pendingVal} />
                  <StatCard labelUr="کل اخراجات" labelEn="Total Expenses" value={expenseVal} />
                </div>

                {/* Chart Area */}
                <div className="flex-1 flex items-center justify-center p-4 min-h-[300px]">
                  <div className="transform scale-90 sm:scale-100 lg:scale-110 transition-transform">
                    <DonutChart total={totalComparison} revPercent={revenuePercent} pendPercent={pendingPercent} />
                  </div>
                </div>
              </div>
            ) : activeTab === 'Land' ? (
              <LandAssets />
            ) : activeTab === 'Settings' ? (
              <div className="flex flex-col items-center justify-center flex-1 opacity-20 animate-in fade-in duration-500">
                <Settings size={64} className="mb-6 text-indigo-500 animate-spin-slow"/>
                <p className="text-xl font-black uppercase tracking-[0.3em] text-white">System Settings</p>
                <p className="mt-3 font-bold tracking-widest text-slate-500 italic text-center px-4">Global dashboard configuration and account management will be available here.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 opacity-20">
                <Search size={64} className="mb-6 text-slate-500"/>
                <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-500">{activeTab} Details View</p>
                <p className="mt-3 font-bold tracking-widest text-slate-700 italic text-center px-4">This module will be expanded soon based on your custom requirements.</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/40 hover:scale-110 active:scale-95 transition-all z-30 ring-4 ring-indigo-500/20"
        >
          <Plus size={32} className="text-white" />
        </button>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center p-4 z-40 pb-5">
           {menuItems.map((item) => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
             >
               {item.icon}
               <span className="text-[7px] uppercase font-black tracking-tighter">{item.id}</span>
             </button>
           ))}
        </nav>
      </main>
      
      <AddEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addEntry} />
    </div>
  );
};

const StatCard = ({ labelUr, labelEn, value }) => (
  <div className="bg-slate-800/40 p-6 lg:p-8 rounded-[32px] border border-slate-700/50 hover:bg-slate-800 transition-all duration-500 shadow-lg text-center flex flex-col items-center justify-center group">
    <div className="space-y-2 lg:space-y-3">
      <p className="text-white text-[15px] lg:text-[17px] font-black uppercase tracking-wider leading-tight">{labelUr}</p>
      <p className="text-white text-[8px] lg:text-[9px] font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">{labelEn}</p>
    </div>
    <h3 className="text-xl lg:text-2xl font-black text-white mt-4 lg:mt-6 tracking-tighter italic">Rs. {value.toLocaleString()}</h3>
  </div>
);

const DonutChart = ({ total, revPercent, pendPercent }) => (
  <div className="relative w-[300px] lg:w-[340px] h-[300px] lg:h-[340px] flex items-center justify-center group">
    <svg className="w-full h-full drop-shadow-[0_0_30px_rgba(79,70,229,0.15)]" viewBox="0 0 100 100">
      <defs>
        <path id="donutPath" d="M 50,50 m 0,-36 a 36,36 0 1,1 0,72 a 36,36 0 1,1 0,-72" />
        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="36" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="11"></circle>
      <circle 
        cx="50" cy="50" r="36" 
        fill="transparent" 
        stroke="url(#emeraldGrad)" 
        strokeWidth="11" 
        strokeDasharray={`${revPercent * 2.26} 226`} 
        strokeDashoffset="0"
        transform="rotate(-90 50 50)"
        strokeLinecap="round"
        className="transition-all duration-1000 ease-in-out"
      ></circle>
      <circle 
        cx="50" cy="50" r="36" 
        fill="transparent" 
        stroke="#fb923c" 
        strokeWidth="11" 
        strokeDasharray={`${pendPercent * 2.26} 226`} 
        strokeDashoffset={`-${revPercent * 2.26}`}
        transform="rotate(-90 50 50)"
        strokeLinecap="round"
        className="transition-all duration-1000 ease-in-out"
      ></circle>
      <text fill="white" className="text-[2.2px] lg:text-[2.8px] font-black uppercase tracking-widest pointer-events-none drop-shadow-md">
        <textPath href="#donutPath" startOffset={`${revPercent / 2}%`} textAnchor="middle">RECEIVED: {revPercent}%</textPath>
      </text>
      <text fill="white" className="text-[2.2px] lg:text-[2.8px] font-black uppercase tracking-widest pointer-events-none drop-shadow-md">
        <textPath href="#donutPath" startOffset={`${revPercent + (pendPercent / 2)}%`} textAnchor="middle">PENDING: {pendPercent}%</textPath>
      </text>
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <p className="text-2xl lg:text-3xl font-black text-white italic tracking-tighter">Rs. {total.toLocaleString()}</p>
      <div className="flex items-center gap-1.5 mt-4 lg:mt-5">
          <div className="w-6 lg:w-8 h-1 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></div>
          <div className="w-1.5 lg:w-2 h-1 bg-indigo-500/30 rounded-full"></div>
      </div>
    </div>
  </div>
);

export default App;

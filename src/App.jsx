import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  Map, Store, Receipt, BarChart3, Settings, 
  UserCircle, ChevronDown, Bell, LayoutDashboard, Search,
  Plus, Trash2, Loader2, CheckCircle,
  ArrowUpRight, ArrowDownRight, Activity, 
  Shield, User, X, Lock, Calendar, Home
} from 'lucide-react';
import { useFinanceData } from './useFinanceData';
import { useFarmers } from './useFarmers';
import { useReminders } from './useReminders';
import { useGlobalActivity } from './useGlobalActivity';
import AddEntryModal from './AddEntryModal';
import SettingsPage from './SettingsPage';
import SearchResults from './SearchResults';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import PullToRefresh from './PullToRefresh';
import { APP_VERSION } from './firebase';

import { 
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { DashboardSkeleton } from './Skeleton';

import { seedShops } from './seedShops';

const App = () => {
  // 🔄 CACHE BUSTING: Force clear local data if app VERSION changes
  useEffect(() => {
    const lastVer = localStorage.getItem('jatala_app_ver');
    if (lastVer && lastVer !== APP_VERSION) {
      localStorage.removeItem('jatala_farmers_cache');
      localStorage.setItem('jatala_app_ver', APP_VERSION);
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.unregister());
          window.location.reload(true);
        });
      } else {
        window.location.reload(true);
      }
    } else {
      localStorage.setItem('jatala_app_ver', APP_VERSION);
    }
  }, []);

  const [accountType, setAccountType] = useState(() => localStorage.getItem('jatala_auth') || null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => { seedShops(); }, []);

  useEffect(() => {
    if (accountType) localStorage.setItem('jatala_auth', accountType);
    else localStorage.removeItem('jatala_auth');
  }, [accountType]);

  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const isAdmin = accountType === 'admin';
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [authStage, setAuthStage] = useState('selection');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  
  // 🔊 PREMIUM AUDIO FEEDBACK: Subtle click sound for interactions
  useEffect(() => {
    const playClick = () => {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.05);
      } catch (e) { /* Audio context might be blocked */ }
    };

    const handleGlobalClick = (e) => {
      const target = e.target.closest('button, [role="button"], label.cursor-pointer, .cursor-pointer');
      if (target) playClick();
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const handleAdminLogin = (e) => {
    e?.preventDefault();
    if (passwordInput === 'ali321') {
      setAccountType('admin');
      setAuthStage('selection');
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const { 
    revenue: revenueVal = 0, 
    pending: pendingVal = 0, 
    expenses: expenseVal = 0, 
    entries = [], 
    loading: financeLoading, 
    refreshFinance,
    addEntry 
  } = useFinanceData(selectedYear);
  
  const { farmers, loading: farmersLoading, refreshFarmers } = useFarmers();
  const { reminders, activeReminders, markAsRead } = useReminders();
  const [isReminderDrawerOpen, setIsReminderDrawerOpen] = useState(false);
  const { activities, loading: activityLoading } = useGlobalActivity();

  const handleGlobalRefresh = async () => {
    localStorage.removeItem('jatala_farmers_cache');
    if (refreshFinance) refreshFinance();
    if (refreshFarmers) refreshFarmers();
    await new Promise(r => setTimeout(r, 600));
  };

  const loading = financeLoading || activityLoading || farmersLoading;

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, idx) => {
      const monthEntries = entries.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000) : null);
        return d && d.getMonth() === idx;
      });
      const rev = monthEntries.filter(e => e.type === 'revenue' && e.status === 'received').reduce((s, e) => s + Number(e.amount), 0);
      return { name: month, revenue: rev };
    });
  }, [entries]);

  const navHubItems = [
    { id: 'Land', label: 'Land Assets', icon: <Map size={48} />, baseColor: 'emerald', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    { id: 'Shops', label: 'Shops', icon: <Store size={48} />, baseColor: 'cyan', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    { id: 'Expenses', label: 'Expenses', icon: <Receipt size={48} />, baseColor: 'rose', shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
    { id: 'Sold', label: 'Sold', icon: <CheckCircle size={48} />, baseColor: 'amber', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
    { id: 'Reports', label: 'Reports', icon: <BarChart3 size={48} />, baseColor: 'purple', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' },
    { id: 'Settings', label: 'Settings', icon: <Settings size={48} />, baseColor: 'slate', shadow: 'shadow-[0_0_20px_rgba(100,116,139,0.15)]', adminOnly: true }
  ];

  if (!accountType) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 lg:p-10 z-[1000] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="w-full max-w-2xl text-center space-y-12 relative z-10">
          <h1 className="text-5xl lg:text-7xl font-black text-white uppercase">Jatala Properties</h1>
          {authStage === 'selection' ? (
            <div className="grid grid-cols-2 gap-8 max-w-xl mx-auto">
              <button onClick={() => setAuthStage('password')} className="p-10 bg-slate-800/40 rounded-[40px] hover:bg-indigo-600 flex flex-col items-center gap-6"><Shield size={40} /><span className="text-3xl font-black italic uppercase tracking-wide">Admin</span></button>
              <button onClick={() => setAccountType('user')} className="p-10 bg-slate-800/40 rounded-[40px] hover:bg-slate-800 flex flex-col items-center gap-6"><User size={40} /><span className="text-3xl font-black italic uppercase tracking-wide">User</span></button>
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full"><form onSubmit={handleAdminLogin} className="space-y-6"><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password" className="w-full bg-slate-900 border border-slate-700 p-5 rounded-2xl text-white text-center font-black" /><div className="flex gap-4"><button type="submit" className="flex-1 py-5 bg-indigo-600 rounded-2xl font-black">Login</button></div></form></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 lg:h-24 border-b border-white/5 flex items-center justify-between px-4 lg:px-12 bg-[#0f172a]/80 backdrop-blur-xl z-[100] sticky top-0 w-full relative gap-2">
          <div className="flex-shrink-0 flex items-center">
            <div onClick={() => setActiveTab('Dashboard')} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:rotate-6 transition-all duration-300 cursor-pointer">
              <Home size={20} className="text-white" />
            </div>
          </div>
          
          <div className="flex-grow flex justify-center min-w-0">
            <div className="relative w-full flex justify-center">
              <button 
                onClick={() => setShowYearMenu(!showYearMenu)} 
                className="flex items-center gap-1.5 lg:gap-3 px-3 lg:px-6 py-2 lg:py-3 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl hover:bg-white/10 transition-all font-black text-[10px] lg:text-xs tracking-wider lg:tracking-[0.15em] text-white uppercase italic shadow-lg whitespace-nowrap overflow-hidden"
              >
                <Calendar size={window.innerWidth < 768 ? 14 : 18} className="text-indigo-400 shrink-0" />
                <span className="truncate">{selectedYear}</span>
                <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 shrink-0 ${showYearMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showYearMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowYearMenu(false)} />
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-56 bg-slate-900 border border-white/10 rounded-3xl z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in slide-in-from-top-4 duration-300 backdrop-blur-xl">
                    {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map(year => (
                      <button 
                        key={year} 
                        onClick={() => { setSelectedYear(year); setShowYearMenu(false); }} 
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${selectedYear === year ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                        <span className="text-xs font-black uppercase tracking-widest">{year}</span>
                        {selectedYear === year && <CheckCircle size={16} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 flex justify-end items-center gap-2 lg:gap-4">
             {activeTab !== 'Dashboard' && (
               <div className="relative lg:flex hidden mr-4">
                 <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/>
                 <input type="text" placeholder="Search..." className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-14 pr-6 text-sm outline-none focus:border-indigo-500 transition-all text-white" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/>
               </div>
             )}
             
            <button onClick={() => setIsReminderDrawerOpen(true)} className="p-2.5 lg:p-3.5 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl relative hover:bg-white/10 transition-all group">
              <Bell size={20} className="text-white group-hover:rotate-12 transition-transform duration-300"/>
              {activeReminders.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-[#0f172a]" />}
            </button>

             <div className="relative">
               <button onClick={() => setShowAccountMenu(!showAccountMenu)} className="flex items-center gap-1.5 lg:gap-3 p-1 pr-1 lg:pr-5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-all">
                 <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20"><UserCircle size={18} className="text-white"/></div>
                 <span className="text-[10px] font-black uppercase lg:block hidden tracking-widest text-white">{accountType}</span>
               </button>
               {showAccountMenu && <div className="absolute top-14 right-0 w-56 bg-slate-900 border border-slate-800 rounded-2xl z-[100] shadow-2xl p-2 animate-in slide-in-from-top-2">
                 <button onClick={() => {setAccountType(null); setShowAccountMenu(false);}} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all group">
                   <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                   <span className="text-xs font-black uppercase tracking-widest">Switch Account</span>
                 </button>
               </div>}
             </div>
          </div>
        </header>

        <PullToRefresh onRefresh={handleGlobalRefresh}>
          <div className="lg:px-12 px-4 lg:py-12 py-6 overflow-y-auto no-scrollbar pb-32">
            <div className="max-w-[1600px] mx-auto min-h-full">
              {globalSearch ? (
                <SearchResults query={globalSearch} data={{ farmers, shops: [], soldProperties: [] }} onNavigate={tab => { setGlobalSearch(''); setActiveTab(tab); }} />
              ) : activeTab === 'Dashboard' ? (
                loading ? <DashboardSkeleton /> : (
                  <div className="flex flex-col gap-10">
                    <div className="mb-14 pt-6">
                      <h1 className="text-2xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-[0.2em] mb-14 text-white text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] animate-in fade-in duration-700 whitespace-nowrap">Jatala Properties</h1>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto mb-20">
                        <FinanceCard label="Expected Revenue" color="emerald" icon={<ArrowUpRight />} value={revenueVal + pendingVal} />
                        <FinanceCard label="Total Expenses" color="rose" icon={<ArrowDownRight />} value={expenseVal} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
                        {navHubItems.map((item) => {
                          if (item.adminOnly && !isAdmin) return null;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveTab(item.id)}
                              className={`group flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 sm:p-10 lg:p-12 bg-gradient-to-br from-${item.baseColor}-500/30 sm:from-${item.baseColor}-500/20 to-${item.baseColor}-600/5 backdrop-blur-md border border-${item.baseColor}-500/50 sm:border-${item.baseColor}-500/30 ${item.shadow} rounded-2xl sm:rounded-[48px] hover:scale-105 hover:bg-white/10 hover:border-white/30 transition-all duration-500 relative overflow-hidden w-full sm:w-auto`}
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br from-${item.baseColor}-500/10 to-${item.baseColor}-600/20 opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                              <div className="relative z-10 flex flex-row sm:flex-col items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                <div className={`p-3.5 sm:p-8 bg-white/5 rounded-xl sm:rounded-[36px] group-hover:rotate-12 transition-all duration-500 border border-white/10 shadow-inner group-hover:bg-${item.baseColor}-600/20 shrink-0`}>
                                  <div className="w-7 h-7 sm:w-12 sm:h-12 flex items-center justify-center">
                                    {React.cloneElement(item.icon, { size: '100%', className: "text-white" })}
                                  </div>
                                </div>
                                <div className="text-left sm:text-center flex-1 sm:flex-none">
                                  <span className="block text-base sm:text-xl lg:text-2xl font-black uppercase tracking-wider lg:tracking-[0.2em] text-white group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap truncate sm:overflow-visible">{item.label}</span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                  </div>
                )
              ) : activeTab === 'Land' ? (
                <Suspense fallback={<DashboardSkeleton/>}><LandAssets isAdmin={isAdmin} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Shops' ? (
                <Suspense fallback={<DashboardSkeleton/>}><ShopsPage isAdmin={isAdmin} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Sold' ? (
                <Suspense fallback={<DashboardSkeleton/>}><SoldProperties isAdmin={isAdmin} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Expenses' ? (
                <Suspense fallback={<DashboardSkeleton/>}><FinancialReports entries={entries} selectedYear={selectedYear} preFilter="Expense" /></Suspense>
              ) : activeTab === 'Reports' ? (
                <Suspense fallback={<DashboardSkeleton/>}><FinancialReports entries={entries} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Settings' ? (
                isAdmin ? <SettingsPage entries={entries} expandedSection={expandedSection} setExpandedSection={setExpandedSection} /> : <p>Access Denied</p>
              ) : null}
            </div>
          </div>
        </PullToRefresh>

        {isReminderDrawerOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReminderDrawerOpen(false)}/>
            <div className="w-full max-w-md bg-slate-900 border-l border-white/5 h-full p-8 relative flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-widest italic">Notifications</h2>
                <button onClick={() => setIsReminderDrawerOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X/></button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
                {activeReminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                    <Bell size={48}/>
                    <p className="font-black uppercase tracking-widest text-xs">No active alerts</p>
                  </div>
                ) : activeReminders.map(r => (
                  <div key={r.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all">
                    <h4 className="font-black text-indigo-400 mb-1">{r.title}</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed mb-4">{r.description}</p>
                    <button onClick={() => markAsRead(r.id)} className="text-[10px] uppercase font-black text-emerald-400 hover:text-emerald-300 transition-colors">Mark as Read</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};

const FinanceCard = ({ label, color, icon, value }) => (
  <div className="group relative bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 rounded-3xl sm:rounded-[36px] border border-white/5 flex flex-row items-center gap-6 sm:gap-8 transition-all duration-500 hover:bg-white/[0.06] hover:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden">
    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/5 to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-500`} />
    
    <div className={`relative p-5 sm:p-7 bg-${color}-500/10 text-${color}-400 rounded-2xl sm:rounded-3xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0`}>
      {React.cloneElement(icon, { size: 40, className: "shrink-0" })}
    </div>
    
    <div className="relative flex flex-col items-start min-w-0">
      <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-1.5">{label}</span>
      <p className="text-2xl sm:text-4xl font-black italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] truncate w-full">
        <span className="text-sm sm:text-lg mr-1 opacity-50 not-italic">Rs.</span>
        {value.toLocaleString()}
      </p>
    </div>

    {/* Progress Accent Line */}
    <div className={`absolute bottom-0 left-0 w-full h-1 bg-${color}-500/30 group-hover:h-1.5 group-hover:bg-${color}-500/50 transition-all duration-500`} />
    <div className={`absolute bottom-0 left-0 h-1 bg-${color}-500 shadow-[0_0_15px_rgba(var(--color),0.5)] transition-all duration-1000 w-[65%] group-hover:w-[75%]`} />
  </div>
);

export default App;

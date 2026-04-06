import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  Map, Store, Receipt, BarChart3, Settings, 
  UserCircle, ChevronDown, Bell, LayoutDashboard, Search,
  Plus, UserPlus, Trash2, Loader2, Save, CheckCircle,
  ArrowUpRight, ArrowDownRight, Clock, Activity, Search as SearchIcon,
  Shield, User, X, Lock, Calendar, Home, RefreshCw,
  Download, UploadCloud, AlertTriangle, FileJson, Check, Info, Calendar as CalendarIcon, Mail, ChevronRight
} from 'lucide-react';
import { useFinanceData } from './useFinanceData';
import { useFarmers } from './useFarmers';
import { useReminders } from './useReminders';
import { useGlobalActivity } from './useGlobalActivity';
import AddEntryModal from './AddEntryModal';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import PullToRefresh from './PullToRefresh';
import { db, getDataPath, APP_VERSION } from './firebase';
import { collection, addDoc, doc, deleteDoc, onSnapshot, query, orderBy, limit, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, BarChart, Bar, Cell 
} from 'recharts';
import Skeleton, { DashboardSkeleton, CardSkeleton } from './Skeleton';
import { transliterateToUrdu } from './urduTransliterator';

import { seedShops } from './seedShops';

const App = () => {
  // 🔄 CACHE BUSTING: Force clear local data if app VERSION changes
  useEffect(() => {
    const lastVer = localStorage.getItem('jatala_app_ver');
    if (lastVer && lastVer !== APP_VERSION) {
      console.log(`Upgrading to version ${APP_VERSION}. Purging all caches and reloading...`);
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

  useEffect(() => {
    seedShops();
  }, []);

  useEffect(() => {
    if (accountType) {
      localStorage.setItem('jatala_auth', accountType);
    } else {
      localStorage.removeItem('jatala_auth');
    }
  }, [accountType]);

  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const isAdmin = accountType === 'ali';
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [authStage, setAuthStage] = useState('selection'); // selection, password
  const [passwordInput, setPasswordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const handleAdminLogin = (e) => {
    e?.preventDefault();
    if (passwordInput === 'ali321') {
      setAccountType('ali');
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
    addEntry, 
    updateEntry, 
    deleteEntry 
  } = useFinanceData(selectedYear);
  
  const { farmers, loading: farmersLoading, refreshFarmers } = useFarmers();
  const [shops, setShops] = useState([]);
  const [soldProperties, setSoldProperties] = useState([]);

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, getDataPath('shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSold = onSnapshot(collection(db, getDataPath('sold_properties')), (snapshot) => {
      setSoldProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubShops(); unsubSold(); };
  }, []);

  const totalDashboardExpected = useMemo(() => {
    const agEx = farmers.reduce((sum, f) => sum + (Number(f.landSize) || 0) * 60000, 0);
    const shopEx = shops.reduce((sum, s) => sum + (Number(s.rent) || 0) * 12, 0);
    return agEx + shopEx;
  }, [farmers, shops]);

  const { 
    reminders, 
    activeReminders, 
    addReminder, 
    deleteReminder, 
    markAsRead 
  } = useReminders();
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
      const exp = monthEntries.filter(e => ['expense', 'shop_expense'].includes(e.type)).reduce((s, e) => s + Number(e.amount), 0);
      return { name: month, revenue: rev, expense: exp };
    });
  }, [entries]);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Land', label: 'Land Assets', icon: <Map size={20} /> },
    { id: 'Shops', label: 'Commercial Shops', icon: <Store size={20} /> },
    { id: 'Expenses', label: 'Expenses', icon: <Receipt size={20} /> },
    { id: 'Sold', label: 'Sold Properties', icon: <CheckCircle size={20} /> },
    { id: 'Reports', label: 'Financial Reports', icon: <BarChart3 size={20} /> },
    { id: 'Settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  if (!accountType) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 lg:p-10 z-[1000] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="w-full max-w-2xl text-center space-y-12 relative z-10">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-normal drop-shadow-2xl uppercase">Jatala Properties</h1>
            <p className="text-[12px] lg:text-[14px] font-black text-indigo-400 uppercase tracking-[0.5em] italic">Real Estate Management Suite</p>
          </div>
          {authStage === 'selection' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-xl mx-auto animate-login">
              <button 
                onClick={() => { setAuthStage('password'); setPasswordInput(''); setLoginError(false); }}
                className="group p-10 bg-slate-800/40 border border-slate-700/50 rounded-[40px] hover:bg-indigo-600 transition-all duration-500 shadow-2xl hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-6"
              >
                <div className="p-5 bg-indigo-500/10 text-indigo-400 group-hover:bg-white/20 group-hover:text-white rounded-[24px] transition-all">
                  <Shield size={40} strokeWidth={1} />
                </div>
                 <div className="text-center">
                    <span className="text-3xl font-black text-white block group-hover:scale-110 transition-transform uppercase">Ali</span>
                 </div>
              </button>
              <button 
                onClick={() => setAccountType('guest')}
                className="group p-10 bg-slate-800/40 border border-slate-700/50 rounded-[40px] hover:bg-slate-800 transition-all duration-500 shadow-2xl hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-6"
              >
                <div className="p-5 bg-slate-700/50 text-slate-400 group-hover:text-blue-400 rounded-[24px] transition-all">
                  <User size={40} strokeWidth={1} />
                </div>
                 <div className="text-center">
                    <span className="text-3xl font-black text-white block uppercase">Guest</span>
                 </div>
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full animate-login">
              <div className="bg-slate-800/60 backdrop-blur-2xl border border-slate-700/50 p-8 lg:p-12 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Enter Password</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administrative Verification Required</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="password"
                      autoComplete="new-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Security Key..."
                      className={`w-full bg-slate-900/80 border ${loginError ? 'border-rose-500' : 'border-slate-700'} rounded-2xl py-5 px-6 text-white text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-all shadow-inner`}
                    />
                    {loginError && (
                      <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-3 animate-bounce">Incorrect Password • Try Again</p>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => { setAuthStage('selection'); setPasswordInput(''); }}
                      className="flex-1 py-5 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-95 uppercase text-xs tracking-widest"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 uppercase text-xs tracking-widest"
                    >
                      Log In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">Authorized Personnel Only • Secure Session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden select-none" dir="ltr">
      <aside className="hidden lg:flex w-[280px] bg-slate-900 border-l border-slate-800 flex-col py-10 px-6 shrink-0 z-50">
        <div className="flex items-center gap-4 px-4 mb-14 group">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-12 transition-transform duration-500">
             <Home className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-black text-white italic leading-none whitespace-nowrap">Jatala Properties</h1>
        </div>
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group
                ${activeTab === item.id 
                  ? 'bg-gradient-to-l from-indigo-500/10 to-transparent text-indigo-400 border-r-4 border-indigo-500' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            >
              {item.icon}
              <span className="text-[15px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 lg:h-28 border-b border-slate-800 flex items-center justify-between px-6 lg:px-12 bg-[#0f172a]/80 backdrop-blur-xl z-40 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
             <div className="relative lg:flex hidden">
               <button onClick={() => setShowYearMenu(!showYearMenu)} className="flex items-center gap-3 px-5 py-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-[20px]">
                  <Calendar size={16} className="text-indigo-400" />
                  <span className="text-[13px] font-black text-white">{selectedYear}</span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${showYearMenu ? 'rotate-180' : ''}`} />
               </button>
               {showYearMenu && (
                 <div className="absolute left-0 mt-20 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50">
                    {['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((year) => (
                      <button key={year} onClick={() => { setSelectedYear(year); setShowYearMenu(false); }} className="w-full px-5 py-4 text-left font-black text-[13px] hover:bg-slate-800 text-slate-400">{year}</button>
                    ))}
                 </div>
               )}
             </div>
             <div className="relative group max-w-sm w-full lg:flex hidden">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-4 pl-14 pr-6 text-sm text-white"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
             </div>
             <div className="lg:hidden flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Home className="text-white" size={20} />
                </div>
                <h1 className="text-[17px] font-black text-white">Jatala Properties</h1>
             </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={() => setIsReminderDrawerOpen(true)} className="p-2.5 lg:p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl relative">
              <Bell size={20} />
              {activeReminders.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-black">{activeReminders.length}</span>}
            </button>
            <div className="relative ml-1 lg:ml-2">
              <button onClick={() => setShowAccountMenu(!showAccountMenu)} className="flex items-center gap-2 lg:gap-3 p-1 pr-3 lg:pr-5 bg-slate-800/40 rounded-full border border-slate-700">
                <div className="w-8 h-8 lg:w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center"><UserCircle size={20} /></div>
                <span className="text-[13px] font-black hidden lg:block uppercase">{accountType === 'ali' ? 'Ali' : 'Guest'}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
              {showAccountMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50">
                   <button onClick={() => { setAccountType(null); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 font-black text-rose-400 hover:bg-slate-700">Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <PullToRefresh onRefresh={handleGlobalRefresh}>
          <div className="lg:px-12 px-4 lg:py-12 py-6 overflow-y-auto no-scrollbar pb-32">
            <div className="max-w-[1600px] mx-auto min-h-full flex flex-col">
              {globalSearch ? (
                <SearchResults query={globalSearch} data={{ farmers, shops, soldProperties }} onNavigate={(tab) => { setGlobalSearch(''); setActiveTab(tab); }} />
              ) : activeTab === 'Dashboard' ? (
                loading ? <DashboardSkeleton /> : (
                  <div className="flex-1 flex flex-col gap-6 lg:gap-10 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 gap-3 md:gap-6 mb-8 w-full">
                      <FinanceCard label="Expected Revenue" year={selectedYear} value={totalDashboardExpected} color="emerald" icon={<ArrowUpRight />} />
                      <FinanceCard label="Total Expenses" year={selectedYear} value={expenseVal} color="rose" icon={<ArrowDownRight />} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                      <div className="lg:col-span-1 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-6 lg:p-10 flex flex-col gap-10">
                        <h2 className="text-3xl font-black text-white italic text-center uppercase">Overview</h2>
                        <div className="flex-1 min-h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                              <XAxis dataKey="name" hide />
                              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#colorRev)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="lg:col-span-2 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-4 mb-4">
                          <Activity size={24} className="text-indigo-400" />
                          <h3 className="text-xl font-black italic">Recent Activity</h3>
                        </div>
                        <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                          {activities.map(act => (
                            <div key={act.id} className="p-4 bg-slate-900 border border-slate-700/30 rounded-2xl flex justify-between items-center">
                              <div><p className="text-sm font-black">{act.label}</p><p className="text-[10px] text-slate-500 uppercase">{act.date}</p></div>
                              <p className={`text-sm font-black ${act.isRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>{act.isRevenue ? '+' : '-'} {act.amount.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : activeTab === 'Land' ? (
                <Suspense fallback={<DashboardSkeleton />}><LandAssets selectedYear={selectedYear} isAdmin={isAdmin} /></Suspense>
              ) : activeTab === 'Shops' ? (
                <Suspense fallback={<DashboardSkeleton />}><ShopsPage isAdmin={isAdmin} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Expenses' ? (
                <div className="flex-1 p-4"><h2 className="text-2xl font-black mb-8">Expenses Audit</h2>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-700/50"><th className="p-6 text-[11px] uppercase">Date</th><th className="p-6 text-[11px] uppercase">Category</th><th className="p-6 text-[11px] uppercase text-right">Amount</th></tr></thead>
                    <tbody>{entries.filter(e => e.type.includes('expense')).map(e => (
                      <tr key={e.id} className="border-b border-slate-800/30">
                        <td className="p-6 text-sm">{e.date}</td>
                        <td className="p-6"><span className="text-[10px] bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full font-black uppercase">{e.type}</span></td>
                        <td className="p-6 text-right font-black italic">Rs. {Number(e.amount).toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div></div>
              ) : activeTab === 'Sold' ? (
                <Suspense fallback={<DashboardSkeleton />}><SoldProperties isAdmin={isAdmin} /></Suspense>
              ) : activeTab === 'Reports' ? (
                <Suspense fallback={<DashboardSkeleton />}><FinancialReports entries={entries} selectedYear={selectedYear} /></Suspense>
              ) : activeTab === 'Settings' ? (
                isAdmin ? <SettingsPage entries={entries} expandedSection={expandedSection} setExpandedSection={setExpandedSection} /> : <div className="text-center py-40 opacity-20"><Settings size={64} className="mx-auto" /><h2 className="text-3xl font-black mt-4">Access Denied</h2></div>
              ) : null}
            </div>
          </div>
        </PullToRefresh>

        {isAdmin && (
          <button onClick={() => setIsAddEntryModalOpen(true)} className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl z-[60]"><Plus size={32} className="text-white" /></button>
        )}

        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 border-t border-slate-800 flex justify-around items-center p-4 z-50">
           {menuItems.map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'}`}>{item.icon}<span className="text-[9px] font-black uppercase">{item.label}</span></button>
           ))}
        </nav>

        {isReminderDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsReminderDrawerOpen(false)}></div>
            <div className="w-full max-w-md bg-[#0f172a] border-l border-slate-800 h-full relative flex flex-col p-8">
              <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black italic">Notifications</h2><button onClick={() => setIsReminderDrawerOpen(false)}><X size={24}/></button></div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {activeReminders.map(r => (
                  <div key={r.id} className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl">
                    <h3 className="text-lg font-black">{r.title}</h3>
                    <p className="text-sm text-slate-400 mt-2">{r.description}</p>
                    <div className="flex gap-2 mt-4"><button onClick={() => markAsRead(r.id)} className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Mark Read</button></div>
                  </div>
                ))}
                {activeReminders.length === 0 && <p className="text-center opacity-20 py-20 font-black uppercase italic">Clear for today</p>}
              </div>
            </div>
          </div>
        )}
      </main>
      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};

const FinanceCard = ({ label, year, value, color, icon }) => (
  <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 flex flex-col items-center justify-center text-center">
    <div className={`p-4 bg-${color}-500/10 text-${color}-400 rounded-2xl mb-4`}>{icon}</div>
    <span className={`text-${color}-400 text-xs font-black uppercase tracking-widest`}>{label}</span>
    <p className="text-2xl font-black italic mt-1 text-white">Rs. {value?.toLocaleString()}</p>
  </div>
);

const SettingsPage = ({ entries = [], expandedSection, setExpandedSection }) => {
  const { farmers, deleteFarmer, addNewFarmer } = useFarmers();
  const { reminders, addReminder, deleteReminder, markAsRead } = useReminders();
  const [isSaving, setIsSaving] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ nameUr: '', nameEn: '', landSize: '', landUnit: 'Acres' });
  const [shops, setShops] = useState([]);
  const [newShop, setNewShop] = useState({ tenant: '', name: '', rent: '', area: '' });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', description: '', targetDate: '', type: 'Reminder' });

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title || !newReminder.targetDate) return;
    setIsSaving(true);
    try {
      await addReminder({ ...newReminder, targetDate: Timestamp.fromDate(new Date(newReminder.targetDate)) });
      setNewReminder({ title: '', description: '', targetDate: '', type: 'Reminder' });
      alert("Reminder saved!");
    } catch (err) { alert("Error saving reminder"); } finally { setIsSaving(false); }
  };

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, getDataPath('shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubShops();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try { await addNewFarmer(newFarmer); setNewFarmer({ nameUr: '', nameEn: '', landSize: '', landUnit: 'Acres' }); alert("Registered!"); } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try { await addDoc(collection(db, getDataPath('shops')), { ...newShop, rent: Number(newShop.rent), status: 'Pending', createdAt: new Date().toISOString() }); setNewShop({ tenant: '', name: '', rent: '', area: '' }); alert("Shop Registered!"); } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteShop = async (id) => { 
    if (window.confirm('Delete Shop?')) await deleteDoc(doc(db, getDataPath('shops'), id));
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const farmersWS = XLSX.utils.json_to_sheet(farmers.map(f => ({ Name: f.nameEn || f.nameUr, Land: `${f.landSize} ${f.landUnit}`, Status: f.totalRemaining > 0 ? 'Pending' : 'Paid' })));
      XLSX.utils.book_append_sheet(wb, farmersWS, 'Members');
      XLSX.writeFile(wb, `Jatala_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert("Excel Downloaded!");
    } catch (err) { alert("Excel Export Failed"); } finally { setIsExporting(false); }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const backupData = {};
      const collections = ['farmers', 'shops', 'sold_properties', 'revenue', 'expenses'];
      for (const col of collections) {
        const snap = await getDocs(collection(db, getDataPath(col)));
        backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Jatala_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      alert("Backup Finished!");
    } catch (err) { alert("Backup Failed"); } finally { setIsBackingUp(false); }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0]; if (!file || !window.confirm("Overwrite Database?")) return;
    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const batch = writeBatch(db);
        for (const col in data) {
          data[col].forEach(item => { if (item.id) batch.set(doc(db, getDataPath(col), item.id), item, { merge: true }); });
        }
        await batch.commit(); alert("Restored!");
      } catch (err) { alert("Restore Failed"); } finally { setIsRestoring(false); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col gap-8 pb-32 overflow-y-auto no-scrollbar">
      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl overflow-hidden">
        <button onClick={() => setExpandedSection(expandedSection === 'members' ? null : 'members')} className="w-full flex justify-between p-8 font-black uppercase">Member Management <ChevronDown className={expandedSection === 'members' ? 'rotate-180' : ''} /></button>
        {expandedSection === 'members' && <div className="p-8 border-t border-slate-700/50 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <form onSubmit={handleAddMember} className="space-y-4">
             <input value={newFarmer.nameEn} onChange={e => setNewFarmer({...newFarmer, nameEn: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl font-black uppercase text-xs" placeholder="Full Name (English)" />
             <input type="number" value={newFarmer.landSize} onChange={e => setNewFarmer({...newFarmer, landSize: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl font-black text-xs" placeholder="Size" />
             <button className="w-full bg-indigo-600 py-4 rounded-xl font-black">Register Member</button>
           </form>
           <div className="max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-slate-800">
             {farmers.map(f => <div key={f.id} className="py-4 flex justify-between"><div className="font-black text-sm uppercase">{f.nameEn || f.nameUr}</div><button onClick={() => deleteFarmer(f.id)}><Trash2 size={16} className="text-slate-600"/></button></div>)}
           </div>
        </div>}
      </section>

      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl overflow-hidden">
        <button onClick={() => setExpandedSection(expandedSection === 'shops' ? null : 'shops')} className="w-full flex justify-between p-8 font-black uppercase">Commercial Shops <ChevronDown className={expandedSection === 'shops' ? 'rotate-180' : ''} /></button>
        {expandedSection === 'shops' && <div className="p-8 border-t border-slate-700/50">
           <form onSubmit={handleAddShop} className="grid grid-cols-2 gap-4 mb-8">
             <input value={newShop.tenant} onChange={e => setNewShop({...newShop, tenant: e.target.value})} className="bg-slate-900 p-4 rounded-xl font-black text-xs" placeholder="Tenant" />
             <input value={newShop.name} onChange={e => setNewShop({...newShop, name: e.target.value})} className="bg-slate-900 p-4 rounded-xl font-black text-xs" placeholder="ID" />
             <button className="col-span-2 bg-blue-600 py-4 rounded-xl font-black">Add Shop</button>
           </form>
           <div className="divide-y divide-slate-800">{shops.map(s => <div key={s.id} className="py-4 flex justify-between font-black uppercase text-xs"><span>{s.tenant} - {s.name}</span><button onClick={() => handleDeleteShop(s.id)}><Trash2 size={16}/></button></div>)}</div>
        </div>}
      </section>

      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl overflow-hidden">
        <button onClick={() => setIsBackupOpen(!isBackupOpen)} className="w-full flex justify-between p-8 font-black uppercase">System Tools <ChevronDown/></button>
        {isBackupOpen && <div className="p-8 border-t border-slate-700/50 grid grid-cols-3 gap-4">
           <button onClick={handleDownloadExcel} className="p-6 bg-slate-900 rounded-3xl font-black uppercase text-[10px] text-emerald-400 border border-slate-700">Excel Export</button>
           <button onClick={handleBackup} className="p-6 bg-slate-900 rounded-3xl font-black uppercase text-[10px] text-indigo-400 border border-slate-700">Database Backup</button>
           <label className="p-6 bg-slate-900 rounded-3xl font-black uppercase text-[10px] text-orange-400 border border-slate-700 cursor-pointer text-center">Restore Data <input type="file" className="hidden" onChange={handleRestore} /></label>
        </div>}
      </section>
    </div>
  );
};

const SearchResults = ({ query, data, onNavigate }) => {
  const q = query.toLowerCase();
  const fs = data.farmers.filter(f => f.nameEn?.toLowerCase().includes(q) || f.nameUr?.includes(query));
  const ss = data.shops.filter(s => s.tenant?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
  const total = fs.length + ss.length;
  return (
    <div className="flex-1 space-y-8 p-4"><h2 className="text-3xl font-black italic">Search: "{query}" ({total} found)</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {fs.map(f => <SearchCard key={f.id} title={f.nameEn || f.nameUr} sub="Member" type="Farmer" color="indigo" icon={<UserCircle/>} onClick={() => onNavigate('Land')} />)}
      {ss.map(s => <SearchCard key={s.id} title={s.tenant} sub={s.name} type="Shop" color="blue" icon={<Store/>} onClick={() => onNavigate('Shops')} />)}
    </div></div>
  );
};

const SearchCard = ({ title, sub, type, icon, color, onClick }) => (
  <button onClick={onClick} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4 text-left group">
    <div className={`p-4 bg-${color}-500/10 text-${color}-400 rounded-2xl`}>{icon}</div>
    <div><p className={`text-[9px] font-black uppercase text-${color}-500`}>{type}</p><h3 className="font-black text-white">{title}</h3><p className="text-[10px] text-slate-500 uppercase">{sub}</p></div>
  </button>
);

export default App;

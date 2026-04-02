import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  Map, Store, Receipt, BarChart3, Settings, 
  UserCircle, ChevronDown, Bell, LayoutDashboard, Search,
  Plus, UserPlus, Trash2, Loader2, Save, CheckCircle,
  ArrowUpRight, ArrowDownRight, Clock, Activity, Search as SearchIcon,
  Shield, User, X, Lock, Calendar, Home, RefreshCw,
  Download, UploadCloud, AlertTriangle, FileJson
} from 'lucide-react';
import { useFinanceData } from './useFinanceData';
import { useFarmers } from './useFarmers';
import { useGlobalActivity } from './useGlobalActivity';
import AddEntryModal from './AddEntryModal';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import { db, getDataPath, APP_VERSION } from './firebase';
import { collection, addDoc, doc, deleteDoc, onSnapshot, query, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';

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
      
      // 1. Clear Local Storage Cache
      localStorage.removeItem('jatala_farmers_cache');
      localStorage.setItem('jatala_app_ver', APP_VERSION);

      // 2. Clear SW Caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }

      // 3. Unregister SW and Force Reload
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
  const [isAdmin, setIsAdmin] = useState(accountType === 'ali');
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [authStage, setAuthStage] = useState('selection'); // selection, password
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

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

  // Stats Data from Firebase
  const { 
    revenue: revenueVal = 0, 
    pending: pendingVal = 0, 
    expenses: expenseVal = 0, 
    entries = [], 
    loading: financeLoading, 
    addEntry, 
    updateEntry, 
    deleteEntry 
  } = useFinanceData(selectedYear);
  
  const { farmers, loading: farmersLoading } = useFarmers();
  const { activities, loading: activityLoading } = useGlobalActivity();
  
  // Use a local state/hook for shops if needed, or stick to the current implementation
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

  const loading = financeLoading || activityLoading || farmersLoading;

  const totalComparison = revenueVal + pendingVal;
  const revenuePercent = totalComparison > 0 ? Math.round((revenueVal / totalComparison) * 100) : 0;
  const pendingPercent = totalComparison > 0 ? Math.round((pendingVal / totalComparison) * 100) : 0;

  // Prepare chart data (Monthly trend)
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
    { id: 'Dashboard', labelUr: 'ڈیش بورڈ', icon: <LayoutDashboard size={20} /> },
    { id: 'Land', labelUr: 'زرعی زمین', icon: <Map size={20} /> },
    { id: 'Shops', labelUr: 'کمرشل دکانیں', icon: <Store size={20} /> },
    { id: 'Expenses', labelUr: 'اخراجات', icon: <Receipt size={20} /> },
    { id: 'Sold', labelUr: 'فروخت شدہ', icon: <CheckCircle size={20} /> },
    { id: 'Reports', labelUr: 'مالیاتی رپورٹس', icon: <BarChart3 size={20} /> },
    { id: 'Settings', labelUr: 'ترتیبات', icon: <Settings size={20} /> }
  ];

  const years = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  if (!accountType) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 lg:p-10 z-[1000] overflow-hidden">
        {/* Animated Background Orbs */}
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
                    <span className="text-3xl font-black text-white font-urdu block group-hover:scale-110 transition-transform">علی</span>
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
                    <span className="text-3xl font-black text-white font-urdu block">گیسٹ</span>
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
                  <h2 className="text-3xl font-black text-white font-urdu">پاس ورڈ درج کریں</h2>
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
                      placeholder="Password..."
                      className={`w-full bg-slate-900/80 border ${loginError ? 'border-rose-500' : 'border-slate-700'} rounded-2xl py-5 px-6 text-white text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-all shadow-inner`}
                    />
                    {loginError && (
                      <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-3 animate-bounce">Incorrect Password • نامکمل یا غلط پاس ورڈ</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => { setAuthStage('selection'); setPasswordInput(''); }}
                      className="flex-1 py-5 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-95"
                    >
                      بیک
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      لاگ ان
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
      
      {/* ── Desktop Sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex w-[280px] bg-slate-900 border-l border-slate-800 flex-col py-10 px-6 shrink-0 z-50">
        <div className="flex items-center gap-4 px-4 mb-14 group">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-12 transition-transform duration-500">
             <Home className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white italic leading-none whitespace-nowrap">Jatala Properties</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group
                ${activeTab === item.id 
                  ? 'bg-gradient-to-l from-indigo-500/10 to-transparent text-indigo-400 border-r-4 border-indigo-500 shadow-xl shadow-indigo-500/5' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            >
              <div className={`${activeTab === item.id ? 'scale-110' : 'group-hover:translate-x-1'} transition-transform`}>
                {item.icon}
              </div>
              <span className="text-[17px] font-black font-urdu">{item.labelUr}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content Area ───────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-24 lg:h-28 border-b border-slate-800 flex items-center justify-between px-6 lg:px-12 bg-[#0f172a]/80 backdrop-blur-xl z-40 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
             {/* Year Selector Dropdown - Moved to Far Left */}
             <div className="relative lg:flex hidden">
               <button 
                 onClick={() => setShowYearMenu(!showYearMenu)}
                 className="flex items-center gap-3 px-5 py-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-[20px] transition-all group shadow-inner"
               >
                  <Calendar size={16} className="text-indigo-400" />
                  <span className="text-[13px] font-black text-white font-urdu">{selectedYear}</span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showYearMenu ? 'rotate-180' : ''}`} />
               </button>

               {showYearMenu && (
                 <div className="absolute left-0 mt-20 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto no-scrollbar max-h-[300px] z-50 animate-in fade-in slide-in-from-top-3 backdrop-blur-2xl">
                    {['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((year) => (
                      <button 
                        key={year}
                        onClick={() => { setSelectedYear(year); setShowYearMenu(false); }}
                        className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors hover:bg-slate-800 ${selectedYear === year ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-400'}`}
                      >
                         <span className="text-[13px] font-black font-urdu">{year}</span>
                         {selectedYear === year && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>}
                      </button>
                    ))}
                 </div>
               )}
             </div>

             <div className="relative group max-w-sm w-full lg:flex hidden">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="سرچ کریں..." 
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:border-indigo-500 focus:bg-slate-800/60 outline-none transition-all font-urdu"
                  value={globalSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isEnglish = /[a-zA-Z]/.test(val);
                    setGlobalSearch(isEnglish ? transliterateToUrdu(val) : val);
                  }}
                />
             </div>

             {/* Global Add Expense Button - Moved to Top */}
             {isAdmin && (
                <button 
                  onClick={() => setIsAddEntryModalOpen(true)}
                  className="hidden md:flex items-center gap-3 px-5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-rose-600/20 group animate-in slide-in-from-right-4"
                >
                  <Receipt size={18} className="group-hover:rotate-12 transition-transform" />
                  <span className="font-urdu hidden xl:block">خرچہ درج کریں</span>
                </button>
             )}
             {/* Mobile Logo */}
             <div className="lg:hidden flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <Home className="text-white" size={20} />
                </div>
                <h1 className="text-[17px] font-black text-white whitespace-nowrap">Jatala Properties</h1>
             </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 lg:gap-3">
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
                  <p className="text-[13px] font-black text-white leading-none font-urdu">{accountType === 'ali' ? 'ali' : 'guest'}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 group-hover:text-indigo-400 ${showAccountMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showAccountMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 backdrop-blur-xl">
                   <button 
                     onClick={() => { 
                       if (accountType !== 'ali') {
                         setAccountType(null); 
                         setAuthStage('password'); 
                         setPasswordInput('');
                       }
                       setShowAccountMenu(false); 
                     }} 
                     className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50"
                   >
                     <div className="text-left leading-tight text-white">
                       <span className="text-lg font-black block font-urdu">ali</span>
                     </div>
                     {accountType === 'ali' && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                   </button>
                   <button onClick={() => { setAccountType('guest'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors">
                     <div className="text-left leading-tight text-white">
                       <span className="text-lg font-black block font-urdu">guest</span>
                     </div>
                     {accountType === 'guest' && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                   </button>
                   <button onClick={() => { setAccountType(null); setShowAccountMenu(false); }} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-rose-900/20 transition-colors border-t border-slate-700/50">
                     <span className="text-sm font-black text-rose-400">Logout</span>
                   </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar lg:px-12 px-4 lg:py-12 py-6">
          <div className="max-w-[1600px] mx-auto min-h-full flex flex-col">
            {globalSearch ? (
              <SearchResults query={globalSearch} data={{ farmers, shops, soldProperties }} onNavigate={(tab) => { setGlobalSearch(''); setActiveTab(tab); }} />
            ) : activeTab === 'Dashboard' ? (
              loading ? <DashboardSkeleton /> : (
                <div className="flex-1 flex flex-col gap-6 lg:gap-10 animate-in fade-in duration-500 pb-20 lg:pb-0" dir="ltr">
                  {/* Mobile Year Selector */}
                  <div className="lg:hidden flex justify-start -mb-2">
                    <div className="relative">
                      <button 
                        onClick={() => setShowYearMenu(!showYearMenu)}
                        className="flex items-center gap-3 px-5 py-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-[20px] transition-all group shadow-inner"
                      >
                         <Calendar size={16} className="text-indigo-400" />
                         <span className="text-[14px] font-black text-white font-urdu">{selectedYear}</span>
                         <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showYearMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showYearMenu && (
                        <div className="absolute left-0 mt-3 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto no-scrollbar max-h-[300px] z-[60] animate-in fade-in slide-in-from-top-3 backdrop-blur-2xl">
                           {['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((year) => (
                             <button 
                               key={year}
                               onClick={() => { setSelectedYear(year); setShowYearMenu(false); }}
                               className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors hover:bg-slate-800 ${selectedYear === year ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-400'}`}
                             >
                                <span className="text-[13px] font-black font-urdu">{year}</span>
                                {selectedYear === year && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>}
                             </button>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aggregate Summary: 2 Column Layout (Removed Remaining card as requested) */}
                  <div className="grid grid-cols-2 gap-3 md:gap-6 mb-8 font-urdu px-1 w-full text-center">
                    <FinanceCard 
                      labelUr="کل متوقع آمدنی"
                      year={selectedYear} 
                      value={revenueVal + pendingVal} 
                      color="emerald" 
                      icon={<ArrowUpRight />}
                    />
                    <FinanceCard 
                      labelUr="کل اخراجات"
                      year={selectedYear} 
                      value={expenseVal} 
                      color="rose" 
                      icon={<ArrowDownRight />}
                    />
                  </div>
                  
                  {/* Progress Comparison Bar: Received vs Remaining */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 md:p-6 mb-8 font-urdu">
                    <div className="flex justify-between items-center mb-3">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                            وصول شدہ: Rs. {revenueVal.toLocaleString()} ({((revenueVal / (revenueVal + pendingVal || 1)) * 100).toFixed(1)}%)
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                            باقی: Rs. {pendingVal.toLocaleString()} ({((pendingVal / (revenueVal + pendingVal || 1)) * 100).toFixed(1)}%)
                          </span>
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                       </div>
                    </div>
                    <div className="h-3 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                       <div 
                         className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                         style={{ width: `${(revenueVal / (revenueVal + pendingVal || 1)) * 100}%` }}
                       ></div>
                       <div 
                         className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.3)] border-l border-[#0f172a]/30"
                         style={{ width: `${(pendingVal / (revenueVal + pendingVal || 1)) * 100}%` }}
                       ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                    <div className="lg:col-span-1 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-6 lg:p-10 flex flex-col gap-10 shadow-2xl relative overflow-hidden group">
                      <div className="relative z-10 text-center">
                        <h2 className="text-3xl font-black text-white italic font-urdu leading-none">مالیاتی جائزہ</h2>
                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] mt-4 italic font-urdu">ریئل ٹائم مانیٹرنگ</p>
                      </div>
                      
                      <div className="flex-1 min-h-[300px] w-full items-center justify-center flex">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorExp" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                              dy={10}
                            />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', fontWeight: '900' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-8 flex flex-col gap-6">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                          <Activity size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white italic font-urdu">حالیہ سرگرمی</h3>
                          <p className="text-[10px] uppercase font-black text-indigo-400 tracking-[0.2em] mt-1 italic font-urdu">تازہ ترین معلومات</p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar max-h-[400px]">
                        {activities.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 py-20">
                            <Activity size={48} className="text-slate-600" />
                            <p className="text-[12px] font-black uppercase tracking-[0.3em] font-urdu">کوئی نئی سرگرمی نہیں</p>
                          </div>
                        ) : (
                          activities.map((act) => (
                            <div key={act.id} className="group flex items-center justify-between p-4 bg-slate-900/40 border border-slate-700/30 rounded-3xl hover:border-indigo-500/50 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${act.isRevenue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {act.isRevenue ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                </div>
                                <div className="text-left font-urdu">
                                  <p className="text-sm text-white leading-tight">{act.labelUr}</p>
                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">{act.date} • {act.section}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-black italic ${act.isRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {act.isRevenue ? '+' : '-'} {act.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'Land' ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>}>
                <LandAssets selectedYear={selectedYear} isAdmin={accountType === 'ali'} />
              </Suspense>
            ) : activeTab === 'Shops' ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>}>
                <ShopsPage isAdmin={accountType === 'ali'} />
              </Suspense>
            ) : activeTab === 'Expenses' ? (
              <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden">
                <div className="flex justify-between items-center mb-8 px-4">
                  <div className="flex items-center gap-4 lg:gap-6">
                    <div className="p-3 lg:p-4 bg-rose-500/20 text-rose-500 rounded-2xl">
                       <Receipt size={24}/>
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-3xl font-black text-white font-urdu">اخراجات</h2>
                        <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em] mt-2 italic font-urdu">مکمل آڈٹ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-4 lg:px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[12px] font-black text-white font-urdu">
                       کل: Rs. {expenseVal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-800/20 border border-slate-700/50 rounded-[32px] overflow-hidden flex flex-col">
                  <div className="overflow-x-auto overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0f172a] z-10 border-b border-slate-700/50">
                        <tr>
                          <th className="p-6 text-[11px] font-black text-slate-500 font-urdu text-left">تاریخ</th>
                          <th className="p-6 text-[11px] font-black text-slate-500 font-urdu text-center">کیٹیگری</th>
                          <th className="p-6 text-[11px] font-black text-slate-500 font-urdu text-right">رقم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {entries.filter(e => ['expense', 'shop_expense'].includes(e.type)).map((entry) => (
                           <tr key={entry.id} className="group hover:bg-white/5 transition-all">
                              <td className="p-6">
                                <p className="text-white font-black italic text-xs mb-1 uppercase">{entry.date}</p>
                                <p className="text-[9px] font-black text-slate-500 font-urdu">{entry.labelUr}</p>
                              </td>
                              <td className="p-6 text-center">
                                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest">{entry.type}</span>
                              </td>
                              <td className="p-6 text-right">
                                <p className="text-lg font-black italic text-rose-400">Rs. {Number(entry.amount).toLocaleString()}</p>
                              </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'Reports' ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>}>
                <FinancialReports entries={entries} selectedYear={selectedYear} />
              </Suspense>
            ) : activeTab === 'Sold' ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>}>
                <SoldProperties isAdmin={accountType === 'ali'} />
              </Suspense>
            ) : activeTab === 'Settings' ? (
              accountType === 'ali' ? <SettingsPage entries={entries} /> : (
                <div className="flex flex-col items-center justify-center flex-1 opacity-20 py-40">
                  <Settings size={64} className="mb-6 text-slate-500"/>
                  <h2 className="text-3xl font-black text-white font-urdu">رسائی کی اجازت نہیں</h2>
                </div>
              )
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                  <Search size={64} className="mb-6 text-slate-500"/>
                  <h2 className="text-xl font-black font-urdu">{activeTab}</h2>
                </div>
            )}
          </div>
        </div>

        {/* Floating Action Button - Only for Admin */}
        {accountType === 'ali' && (
          <button 
            onClick={() => setIsAddEntryModalOpen(true)}
            className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/40 hover:scale-110 active:scale-95 transition-all z-[60] ring-4 ring-indigo-500/20"
          >
            <Plus size={32} className="text-white" />
          </button>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center p-3 z-50 pb-6">
           {menuItems.map((item) => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               style={{ color: activeTab === item.id ? '#818cf8' : '#ffffff' }}
               className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'scale-105' : 'opacity-80'}`}
             >
               <div>
                 {React.cloneElement(item.icon, { size: activeTab === item.id ? 22 : 20 })}
               </div>
                <span className="text-[9px] font-black font-urdu mt-0.5">{item.labelUr}</span>
             </button>
           ))}
        </nav>
      </main>
      <AddEntryModal 
        isOpen={isAddEntryModalOpen} 
        onClose={() => setIsAddEntryModalOpen(false)} 
        onAdd={addEntry} 
      />
    </div>
  );
};

const FinanceCard = ({ labelUr, year, value, color, icon }) => (
  <div className="bg-slate-800/40 p-2 md:p-6 rounded-lg md:rounded-[32px] border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col items-center justify-center w-full min-h-[100px] md:min-h-0 relative overflow-hidden group shadow-lg">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 blur-[80px] opacity-10`}></div>
    
    <div className={`mb-2 p-2 md:p-4 bg-${color}-500/10 text-${color}-400 rounded-lg md:rounded-2xl transition-transform group-hover:scale-110 relative z-10`}>
      {React.cloneElement(icon, { size: 18 })}
    </div>

    <div className="flex flex-col items-center text-center relative z-10 w-full px-0.5">
      <span className={`text-${color}-400 text-[10px] md:text-sm font-black font-urdu leading-tight whitespace-nowrap overflow-hidden w-full drop-shadow-[0_0_8px_rgba(var(--tw-shadow-color),0.5)]`} style={{ '--tw-shadow-color': color === 'emerald' ? '16,185,129' : color === 'indigo' ? '99,102,241' : '244,63,94' }}>{labelUr}</span>
      <span className={`text-${color}-400 opacity-80 text-[8px] md:text-xs font-black font-urdu`}>{year}</span>
      <p className="text-[11px] md:text-2xl font-bold tracking-tighter whitespace-nowrap overflow-hidden text-white mt-1 w-full italic drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">Rs. {value?.toLocaleString()}</p>
    </div>
  </div>
);

const SettingsPage = ({ entries = [] }) => {
  const { farmers, addNewFarmer, deleteFarmer } = useFarmers();
  const [isSaving, setIsSaving] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ nameUr: '', nameEn: '', landSize: '', landUnit: 'Acres' });
  const [shops, setShops] = useState([]);
  const [newShop, setNewShop] = useState({ tenant: '', name: '', rent: '', area: '' });
  const [expandedSection, setExpandedSection] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, getDataPath('shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubShops();
  }, []);

  const withTimeout = (promise, message = "Operation timed out. Please check your connection.") => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))
    ]);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try { 
      await withTimeout(addNewFarmer(newFarmer)); 
      setNewFarmer({ nameUr: '', nameEn: '', landSize: '', landUnit: 'Acres' }); 
      alert("New member registered!"); 
    } catch (err) { 
      console.error("Add Member Error:", err);
      alert(`Error adding member: ${err.message}`); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try { 
      await withTimeout(addDoc(collection(db, getDataPath('shops')), { 
        ...newShop, 
        rent: Number(newShop.rent), 
        status: 'Pending', 
        createdAt: new Date().toISOString() 
      })); 
      setNewShop({ tenant: '', name: '', rent: '', area: '' }); 
      alert("Shop added to portfolio!"); 
    } catch (err) { 
      console.error("Add Shop Error:", err);
      alert(`Error adding shop: ${err.message}`); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShop = async (id) => { 
    if (!window.confirm('Remove this shop permanently?')) return;
    try {
      await withTimeout(deleteDoc(doc(db, getDataPath('shops'), id)));
      alert("Shop removed.");
    } catch (err) {
      console.error("Delete Shop Error:", err);
      alert(`Error deleting shop: ${err.message}`);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');

      const farmersSheetData = farmers.map((f, i) => ({
        'ID': i + 1,
        'Urdu Name': f.nameUr || '',
        'English Name': f.nameEn || '',
        'Land Size (Acres)': `${f.landSize} ${f.landUnit}`,
        'Total Paid': Number(f.totalPaid || 0),
        'Total Remaining': Number(f.totalRemaining || 0),
        'Payment Status': f.totalRemaining > 0 ? 'Pending' : 'Paid'
      }));

      const shopsSheetData = shops.map((s) => ({
        'Shop No': s.name || '',
        'Tenant Name': s.tenant || '',
        'Monthly Rent': Number(s.rent || 0),
        'Due Date': s.dueDate || 'N/A',
        'Status': s.status || 'Active'
      }));

      const expenseSheetData = entries
        .filter(e => ['expense', 'shop_expense'].includes(e.type))
        .map((e) => ({
          'Date': e.date || '',
          'Category': e.type.toUpperCase(),
          'Description': e.labelUr || e.labelEn || '',
          'Amount': Number(e.amount || 0)
        }));

      const wb = XLSX.utils.book_new();

      const addSheetWithFormatting = (data, sheetName) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const colWidths = Object.keys(data[0] || {}).map(key => {
          const maxLen = Math.max(
            key.toString().length,
            ...data.map(row => (row[key] ? row[key].toString().length : 0))
          );
          return { wch: maxLen + 5 };
        });
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      addSheetWithFormatting(farmersSheetData, 'Farmers');
      addSheetWithFormatting(shopsSheetData, 'Shops');
      addSheetWithFormatting(expenseSheetData, 'Expenses');

      XLSX.writeFile(wb, `Jatala_Properties_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert("Excel Report generated and downloaded successfully!");
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Error generating Excel report: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const collections = ['farmers', 'shops', 'sold_properties', 'revenue', 'expenses', 'shop_transactions'];
      const backupData = {};
      
      for (const colName of collections) {
        const snap = await getDocs(collection(db, getDataPath(colName)));
        backupData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Jatala_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      alert("Backup file generated and downloaded successfully!");
    } catch (err) {
      console.error("Backup Error:", err);
      alert("Backup Failed: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!window.confirm("CRITICAL WARNING: This will merge/overwrite existing database records with the backup data. This action cannot be undone. Are you sure?")) return;
    
    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        let totalCount = 0;
        let batch = writeBatch(db);
        
        for (const colName in data) {
          const items = data[colName];
          for (const item of items) {
            const { id, ...rest } = item;
            if (!id) continue;
            
            const docRef = doc(db, getDataPath(colName), id);
            batch.set(docRef, rest, { merge: true });
            totalCount++;
            
            if (totalCount % 450 === 0) {
              await batch.commit();
              batch = writeBatch(db);
            }
          }
        }
        
        await batch.commit();
        alert("Restoration complete! Database has been synchronized with the backup file.");
      } catch (err) {
        console.error("Restore Error:", err);
        alert("Restore Failed: " + err.message);
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-500 pb-32 no-scrollbar overflow-y-auto">
      
      <section className="bg-slate-800/20 border border-slate-700/50 rounded-[32px] overflow-hidden transition-all duration-500">
        <button 
           onClick={() => setExpandedSection(expandedSection === 'members' ? null : 'members')}
           className="w-full flex justify-between items-center p-8 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl transition-all duration-500 ${expandedSection === 'members' ? 'bg-indigo-600 text-white rotate-12 scale-110 shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>
                <UserPlus size={24}/>
             </div>
             <div>
                 <h2 className="text-2xl font-black text-white italic leading-none font-urdu">ممبر مینجمنٹ</h2>
                 <div className="flex items-center gap-2 mt-2">
                    <div className="w-8 h-[1px] bg-indigo-500/20"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-urdu">نظام کی نگرانی اور ممبرز</p>
                 </div>
              </div>
          </div>
          <ChevronDown className={`text-slate-500 transition-transform duration-500 ${expandedSection === 'members' ? 'rotate-180 text-white' : ''}`} size={24}/>
        </button>

        {expandedSection === 'members' && (
          <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 border-t border-slate-700/50 pt-12">
                <div className="space-y-8">
                  <h3 className="font-black text-[12px] text-indigo-400 opacity-60 ml-4 font-urdu">نیا ممبر رجسٹر کریں</h3>
                  <form onSubmit={handleAddMember} className="space-y-6">
                    <input required value={newFarmer.nameUr} onChange={(e) => {
                       const val = e.target.value;
                       const isEnglish = /[a-zA-Z]/.test(val);
                       setNewFarmer({...newFarmer, nameUr: isEnglish ? transliterateToUrdu(val) : val});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 font-urdu text-xl text-white outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="نام" />
                    <input required value={newFarmer.nameEn} onChange={(e) => setNewFarmer({...newFarmer, nameEn: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 font-black text-white outline-none focus:border-indigo-500 transition-all text-[11px] uppercase tracking-widest" placeholder="NAME" />
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="number" value={newFarmer.landSize} onChange={(e) => setNewFarmer({...newFarmer, landSize: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 font-black text-white outline-none focus:border-indigo-500 font-urdu" placeholder="سائز" />
                      <select value={newFarmer.landUnit} onChange={(e) => setNewFarmer({...newFarmer, landUnit: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-[12px] font-black uppercase text-white outline-none font-urdu"><option>Acres</option><option>Kanals</option><option>Marlas</option></select>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 py-6 rounded-3xl text-white font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all font-urdu text-lg">{isSaving ? <Loader2 className="animate-spin m-auto" /> : "ممبر پورٹ فولیو رجسٹر کریں"}</button>
                  </form>
                </div>
                <div className="flex flex-col max-h-[450px] overflow-hidden bg-slate-900/40 rounded-[24px] border border-slate-700/30">
                  <div className="p-8 border-b border-slate-700/50 flex justify-between items-center text-[11px] font-black text-slate-500 italic font-urdu">فہرست <span>{farmers.length} ممبرز</span></div>
                  <div className="overflow-y-auto no-scrollbar divide-y divide-slate-800/30">
                    {farmers.map(f => (
                      <div key={f.id} className="p-6 flex justify-between items-center group hover:bg-indigo-500/5">
                        <div className="group-hover:translate-x-1 transition-transform">
                           <p className="font-urdu text-white text-lg leading-tight">{f.nameUr}</p>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">{f.nameEn} • {f.landSize} {f.landUnit}</p>
                        </div>
                        <button onClick={() => deleteFarmer(f.id)} className="p-4 bg-rose-500/5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        )}
      </section>

      <section className="bg-slate-800/20 border border-slate-700/50 rounded-[32px] overflow-hidden transition-all duration-500">
        <button 
           onClick={() => setExpandedSection(expandedSection === 'shops' ? null : 'shops')}
           className="w-full flex justify-between items-center p-8 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl transition-all duration-500 ${expandedSection === 'shops' ? 'bg-blue-600 text-white rotate-12 scale-110 shadow-lg shadow-blue-600/20' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>
                <Store size={24}/>
             </div>
             <div>
                 <h2 className="text-2xl font-black text-white italic leading-none font-urdu">کمرشل دکانوں کا کنٹرول</h2>
                 <div className="flex items-center gap-2 mt-2">
                    <div className="w-8 h-[1px] bg-blue-500/20"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-urdu">پورٹ فولیو مینجمنٹ اور یونٹس</p>
                 </div>
              </div>
          </div>
          <ChevronDown className={`text-slate-500 transition-transform duration-500 ${expandedSection === 'shops' ? 'rotate-180 text-white' : ''}`} size={24}/>
        </button>

        {expandedSection === 'shops' && (
          <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 border-t border-slate-700/50 pt-12">
                <div className="space-y-8">
                  <h3 className="font-black text-[12px] text-blue-400 opacity-60 ml-4 font-urdu">کمرشل یونٹ شامل کریں</h3>
                  <form onSubmit={handleAddShop} className="space-y-6">
                    <input required value={newShop.tenant} onChange={(e) => {
                       const val = e.target.value;
                       const isEnglish = /[a-zA-Z]/.test(val);
                       setNewShop({...newShop, tenant: isEnglish ? transliterateToUrdu(val) : val});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 font-urdu text-xl text-white outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="کرایہ دار / کاروبار (نام)" />
                    <div className="grid grid-cols-2 gap-4">
                      <input required value={newShop.name} onChange={(e) => setNewShop({...newShop, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-[12px] font-black text-white outline-none focus:border-blue-500 font-urdu" placeholder="شناخت (دکان نمبر)" />
                      <input required value={newShop.area} onChange={(e) => setNewShop({...newShop, area: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-[12px] font-black text-white outline-none focus:border-blue-500 font-urdu" placeholder="رقبہ (12x15)" />
                    </div>
                    <input required type="number" value={newShop.rent} onChange={(e) => setNewShop({...newShop, rent: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 font-black text-white outline-none focus:border-blue-500 font-urdu" placeholder="ماہانہ کرایہ (روپے)" />
                    <button type="submit" disabled={isSaving} className="w-full bg-blue-600 py-6 rounded-3xl text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all font-urdu text-lg">{isSaving ? <Loader2 className="animate-spin m-auto" /> : "نیا دکان یونٹ رجسٹر کریں"}</button>
                  </form>
                </div>
                <div className="flex flex-col max-h-[450px] overflow-hidden bg-slate-900/40 rounded-[24px] border border-slate-700/30">
                  <div className="p-8 border-b border-slate-700/50 flex justify-between items-center text-[11px] font-black text-slate-500 italic font-urdu">پورٹ فولیو جائزہ <span>{shops.length} یونٹس</span></div>
                  <div className="overflow-y-auto no-scrollbar divide-y divide-slate-800/30">
                    {shops.map(s => (
                      <div key={s.id} className="p-6 flex justify-between items-center group hover:bg-blue-500/5">
                        <div className="group-hover:translate-x-1 transition-transform">
                           <p className="font-urdu text-white text-lg leading-tight">{s.tenant}</p>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic leading-none">{s.name} • {s.area}</p>
                        </div>
                        <button onClick={() => handleDeleteShop(s.id)} className="p-4 bg-rose-500/5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        )}
      </section>
      
      <section className="bg-slate-800/20 border border-slate-700/50 rounded-[32px] overflow-hidden transition-all duration-500 mb-20">
        <button 
           onClick={() => setIsBackupOpen(!isBackupOpen)}
           className="w-full flex justify-between items-center p-8 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl transition-all duration-500 ${isBackupOpen ? 'bg-orange-600 text-white rotate-12 scale-110 shadow-lg shadow-orange-600/20' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>
                <RefreshCw size={24}/>
             </div>
             <div>
                 <h2 className="text-2xl font-black text-white italic leading-none font-urdu">سسٹم کنٹرول اور بیک اپ</h2>
                 <div className="flex items-center gap-2 mt-2">
                    <div className="w-8 h-[1px] bg-orange-500/20"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-urdu">انتظامی ڈیٹا مینجمنٹ</p>
                 </div>
              </div>
          </div>
          <ChevronDown className={`text-slate-500 transition-transform duration-500 ${isBackupOpen ? 'rotate-180 text-white' : ''}`} size={24}/>
        </button>
        
        {isBackupOpen && (
          <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-500 border-t border-slate-700/50 pt-12">
            {/* DUMMY CONSTANT TO FORCE SERVICE WORKER UPDATE - v1.0.7 */}
            <div className="hidden" aria-hidden="true" data-cache-bust="v1.0.7"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-slate-900/60 p-8 rounded-[32px] border border-slate-700/30 flex flex-col items-center justify-center text-center gap-6 group hover:border-emerald-500/30 transition-all">
                  <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-[24px] group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/5">
                     <FileJson size={32} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-white font-urdu">ایکسل رپورٹ</h3>
                     <p className="text-[11px] text-slate-500 mt-2 font-urdu">تمام ممبرز، دکانوں اور اخراجات کی Excel رپورٹ ڈاؤن لوڈ کریں</p>
                  </div>
                  <button 
                    onClick={handleDownloadExcel}
                    disabled={isExporting || isBackingUp || isRestoring}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 py-5 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                  >
                     {isExporting ? (
                       <>
                         <Loader2 className="animate-spin" size={20} />
                         <span className="font-urdu">رپورٹ تیار ہو رہی ہے...</span>
                       </>
                     ) : (
                       <>
                          <Download size={20} />
                          <span className="font-black uppercase tracking-widest text-[11px]">Download Excel Report</span>
                       </>
                     )}
                  </button>
               </div>

               {/* Backup Card */}
               <div className="bg-slate-900/60 p-8 rounded-[32px] border border-slate-700/30 flex flex-col items-center justify-center text-center gap-6 group hover:border-indigo-500/30 transition-all">
                  <div className="p-5 bg-indigo-500/10 text-indigo-400 rounded-[24px] group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                     <Download size={32} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-white font-urdu">ڈیٹا بیک اپ (Export)</h3>
                     <p className="text-[11px] text-slate-500 mt-2 font-urdu">تمام ممبرز، دکانوں اور مالیاتی ڈیٹا کی JSON فائل ڈاؤن لوڈ کریں</p>
                  </div>
                  <button 
                    onClick={handleBackup}
                    disabled={isBackingUp || isRestoring}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 py-5 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                  >
                     {isBackingUp ? (
                       <>
                         <Loader2 className="animate-spin" size={20} />
                         <span className="font-urdu">بیک اپ بن رہا ہے...</span>
                       </>
                     ) : (
                       <>
                         <FileJson size={20} />
                         <span className="font-black uppercase tracking-widest text-[11px]">Download System Backup (JSON)</span>
                       </>
                     )}
                  </button>
               </div>

               {/* Restore Card */}
               <div className="bg-slate-900/60 p-8 rounded-[32px] border border-slate-700/30 flex flex-col items-center justify-center text-center gap-6 group hover:border-orange-500/30 transition-all">
                  <div className="p-5 bg-orange-500/10 text-orange-400 rounded-[24px] group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/5">
                     <UploadCloud size={32} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-white font-urdu">ڈیٹا ری اسٹور (Import)</h3>
                     <p className="text-[11px] text-rose-500/60 mt-2 font-urdu font-black uppercase italic tracking-widest">پچھلے ڈیٹا کو اوور رائٹ کریں (احتیاط برتیں)</p>
                  </div>
                  <label 
                    className={`w-full bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-500 py-5 rounded-2xl font-black cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${isRestoring || isBackingUp ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                     {isRestoring ? (
                       <>
                         <Loader2 className="animate-spin" size={20} />
                         <span className="font-urdu">ڈیٹا ری اسٹور ہو رہا ہے...</span>
                       </>
                     ) : (
                       <>
                         <AlertTriangle size={20} />
                         <span className="font-black uppercase tracking-widest text-[11px]">Restore Data</span>
                       </>
                     )}
                     <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={isRestoring || isBackingUp} />
                  </label>
               </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};


const SearchResults = ({ query, data, onNavigate }) => {
  const q = query.toLowerCase();
  
  const filteredFarmers = data.farmers.filter(f => 
    f.nameUr?.includes(query) || f.nameEn?.toLowerCase().includes(q)
  );
  
  const filteredShops = data.shops.filter(s => 
    s.tenant?.includes(query) || s.name?.toLowerCase().includes(q)
  );

  const filteredSold = data.soldProperties.filter(p => 
    p.nameUr?.includes(query) || p.buyerName?.toLowerCase().includes(q)
  );

  const total = filteredFarmers.length + filteredShops.length + filteredSold.length;

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white italic font-urdu">تلاش کے نتائج: "{query}"</h2>
        <span className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[12px] font-black text-indigo-400 font-urdu">
          {total} نتائج ملے
        </span>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-20">
          <SearchIcon size={64} className="mb-6" />
          <p className="text-2xl font-black font-urdu">کوئی نتیجہ نہیں ملا</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarmers.map(f => (
            <SearchCard key={f.id} title={f.nameUr} sub={f.nameEn} type="Member" icon={<UserCircle />} color="indigo" onClick={() => onNavigate('Land')} />
          ))}
          {filteredShops.map(s => (
            <SearchCard key={s.id} title={s.tenant} sub={s.name} type="Shop" icon={<Store />} color="blue" onClick={() => onNavigate('Shops')} />
          ))}
          {filteredSold.map(p => (
            <SearchCard key={p.id} title={p.nameUr} sub={p.buyerName} type="Sold Property" icon={<CheckCircle />} color="emerald" onClick={() => onNavigate('Sold')} />
          ))}
        </div>
      )}
    </div>
  );
};

const SearchCard = ({ title, sub, type, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 hover:border-indigo-500/50 transition-all text-left flex items-center gap-5 group"
  >
    <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <p className={`text-[9px] font-black uppercase tracking-widest text-${color}-500 mb-1`}>{type}</p>
      <h3 className="text-lg font-black text-white font-urdu leading-tight">{title}</h3>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{sub}</p>
    </div>
  </button>
);

export default App;

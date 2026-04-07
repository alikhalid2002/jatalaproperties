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

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Land', label: 'Land Assets', icon: <Map size={20} /> },
    { id: 'Shops', label: 'Shops', icon: <Store size={20} /> },
    { id: 'Expenses', label: 'Expenses', icon: <Receipt size={20} /> },
    { id: 'Sold', label: 'Sold', icon: <CheckCircle size={20} /> },
    { id: 'Reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    { id: 'Settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  if (!accountType) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 lg:p-10 z-[1000] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="w-full max-w-2xl text-center space-y-12 relative z-10">
          <h1 className="text-5xl lg:text-7xl font-black text-white uppercase">Jatala Properties</h1>
          {authStage === 'selection' ? (
            <div className="grid grid-cols-2 gap-8 max-w-xl mx-auto">
              <button onClick={() => setAuthStage('password')} className="p-10 bg-slate-800/40 rounded-[40px] hover:bg-indigo-600 flex flex-col items-center gap-6"><Shield size={40} /><span className="text-3xl font-black italic uppercase tracking-tighter">Admin</span></button>
              <button onClick={() => setAccountType('user')} className="p-10 bg-slate-800/40 rounded-[40px] hover:bg-slate-800 flex flex-col items-center gap-6"><User size={40} /><span className="text-3xl font-black italic uppercase tracking-tighter">User</span></button>
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
      <aside className="hidden lg:flex w-[280px] bg-slate-900 border-r border-slate-800 flex-col py-12 px-6">
        <h1 className="text-2xl font-black mb-14 px-4 italic tracking-tighter text-left uppercase">Jatala Properties</h1>
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
              }`}
            >
              <div className={activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'}>
                {React.cloneElement(item.icon, { size: 18 })}
              </div>
              <span className="text-[13px] font-black uppercase text-left leading-tight flex-1 tracking-wider">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 lg:h-28 border-b border-slate-800 flex items-center justify-between px-6 lg:px-12 bg-[#0f172a]/80 backdrop-blur-xl z-40 sticky top-0">
          <div className="flex items-center gap-6">
             <button onClick={() => setShowYearMenu(!showYearMenu)} className="flex items-center gap-3 px-5 py-3.5 bg-slate-800/40 rounded-[20px] font-black text-[13px]">{selectedYear} <ChevronDown/></button>
             {showYearMenu && <div className="absolute top-20 bg-slate-900 border border-slate-700 rounded-2xl z-50 overflow-y-auto max-h-60 no-scrollbar">{['2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'].map(y => <button key={y} onClick={() => {setSelectedYear(y); setShowYearMenu(false);}} className="block w-full p-4 font-black hover:bg-slate-800 transition-colors uppercase tracking-widest text-[13px]">{y}</button>)}</div>}
             <div className="relative lg:flex hidden"><Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search..." className="bg-slate-800/40 border border-slate-700/50 rounded-2xl py-4 pl-14 pr-6 text-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsReminderDrawerOpen(true)} className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl relative"><Bell size={20}/>{activeReminders.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-black">{activeReminders.length}</span>}</button>
            <button onClick={() => setShowAccountMenu(!showAccountMenu)} className="flex items-center gap-3 p-1 pr-5 bg-slate-800/40 rounded-full border border-slate-700"><div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center"><UserCircle size={20}/></div><span className="text-[13px] font-black uppercase lg:block hidden">{accountType}</span></button>
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
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                      <FinanceCard label="Expected Revenue" color="emerald" icon={<ArrowUpRight/>} value={revenueVal + pendingVal} />
                      <FinanceCard label="Total Expenses" color="rose" icon={<ArrowDownRight/>} value={expenseVal} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-1 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-10">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3"><BarChart3/> Revenue Analysis</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={chartData}><XAxis dataKey="name" hide /><Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1}/></AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="lg:col-span-2 bg-slate-800/20 border border-slate-700/50 rounded-[32px] p-8">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Activity/> Recent Activity</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">{activities.map(a => <div key={a.id} className="p-4 bg-slate-900/40 rounded-2xl flex justify-between"><div><p className="font-black text-sm">{a.label}</p><p className="text-[10px] text-slate-500 uppercase">{a.date}</p></div><p className={`font-black ${a.isRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>{a.isRevenue?'+':'-'} {a.amount.toLocaleString()}</p></div>)}</div>
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

        {isAdmin && <button onClick={() => setIsAddEntryModalOpen(true)} className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl z-50"><Plus size={32}/></button>}
        
        {isReminderDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end"><div className="absolute inset-0 bg-black/40" onClick={() => setIsReminderDrawerOpen(false)}/>
          <div className="w-full max-w-md bg-slate-900 h-full p-8 relative flex flex-col"><div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black">Notifications</h2><button onClick={() => setIsReminderDrawerOpen(false)}><X/></button></div><div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">{activeReminders.map(r => <div key={r.id} className="p-6 bg-slate-800 rounded-3xl"><h4 className="font-black">{r.title}</h4><p className="text-sm opacity-60 m-2">{r.description}</p><button onClick={() => markAsRead(r.id)} className="text-[10px] uppercase font-black text-emerald-400">Mark Read</button></div>)}</div></div></div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION - FIXED SPACING & ALIGNMENT */}
      <nav className="lg:hidden fixed bottom-1 left-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[32px] p-2 flex items-center justify-between z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {menuItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all duration-300 relative ${
              activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <div className={`transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'scale-100 opacity-70'}`}>
              {React.cloneElement(item.icon, { size: 18 })}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-300 text-center leading-none ${
              activeTab === item.id ? 'opacity-100' : 'opacity-60'
            }`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-full blur-[4px] -translate-y-2 opacity-50"></div>
            )}
          </button>
        ))}
      </nav>

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};

const FinanceCard = ({ label, color, icon, value }) => (
  <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 text-center flex flex-col items-center">
    <div className={`p-4 bg-${color}-500/10 text-${color}-400 rounded-2xl mb-4`}>{icon}</div>
    <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
    <p className="text-2xl font-black italic mt-1">Rs. {value.toLocaleString()}</p>
  </div>
);

export default App;

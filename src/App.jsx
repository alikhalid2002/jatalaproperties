import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  Map as LandPlot, Store, Receipt as ReceiptText, Plus, 
  ChevronRight, ChevronDown, Bell, User, Lock, Eye, EyeOff,
  Home, TrendingUp, TrendingDown, ArrowLeft, 
  CheckCircle, BarChart3, Settings, X, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
import { db, auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// --- COMPONENTS ---
import { DashboardSkeleton } from './Skeleton';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import SettingsPage from './SettingsPage';
import AddEntryModal from './AddEntryModal';

const App = () => {
  // --- Access & Auth ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- View & Filter State ---
  const [view, setView] = useState(() => localStorage.getItem('jatala_view') || 'dashboard');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // --- Data State ---
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Persistence & Auth Sync ---
  useEffect(() => { localStorage.setItem('jatala_view', view); }, [view]);
  useEffect(() => { signInAnonymously(auth).catch(console.error); }, []);

  // --- 1. REAL-TIME CUMULATIVE DATA FETCHING ---
  useEffect(() => {
    // Fetch all transactions for cumulative logic
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- 2. CUMULATIVE YEAR FILTERING LOGIC ---
  const aggregatedStats = useMemo(() => {
    const targetYear = parseInt(selectedYear);
    
    // Revenue: Cumulative sum up to the selected year
    const totalRevenue = transactions
      .filter(t => (t.type === 'Revenue' || t.type === 'revenue' || t.type === 'Rent') && parseInt(t.date?.split('-')[0]) <= targetYear)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // Expenses: Cumulative sum up to the selected year
    const totalExpenses = transactions
      .filter(t => (t.type === 'Expense' || t.type === 'expense') && parseInt(t.date?.split('-')[0]) <= targetYear)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return { totalRevenue, totalExpenses };
  }, [transactions, selectedYear]);

  // --- Auth Handlers ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { setIsAdmin(true); setIsAuthenticated(true); }
    else { setLoginError('Invalid access password'); }
  };

  const handleGuest = () => { setIsAdmin(false); setIsAuthenticated(true); };

  // --- UI Components ---
  const categories = [
    { id: 'Land', title: "Land Assets", icon: <LandPlot size={24} /> },
    { id: 'Shops', title: "Commercial Shops", icon: <Store size={24} /> },
    { id: 'Expenses', title: "Operational Expenses", icon: <ReceiptText size={24} /> },
    { id: 'Sold', title: "Sold Properties", icon: <CheckCircle size={24} /> },
    { id: 'Reports', title: "Financial Reports", icon: <BarChart3 size={24} /> },
    { id: 'Settings', title: "System Settings", icon: <Settings size={24} /> },
  ];

  // --- GATEWAY PRE-LOAD ---
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#06090f] flex flex-col items-center justify-center p-8 selection:bg-indigo-500/30">
        <div className="w-full max-w-sm space-y-12 animate-in fade-in zoom-in-95 duration-700">
           <header className="text-center space-y-6">
             <div className="w-24 h-24 bg-indigo-600 rounded-[40px] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/40 border border-white/10">
                <Home className="text-white" size={44} />
             </div>
             <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-white italic uppercase">Jatala Portal</h1>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.5em]">Inventory System v3.0</p>
             </div>
           </header>
           
           <div className="bg-[#111827] p-10 rounded-[56px] border border-white/[0.03] shadow-2xl space-y-8">
             <form onSubmit={handleLogin} className="space-y-6">
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} placeholder="Enter Admin Password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 p-6 pl-16 rounded-3xl text-sm font-black text-white outline-none focus:border-indigo-600 transition-all uppercase tracking-widest"
                  />
                </div>
                {loginError && <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest">{loginError}</p>}
                <button type="submit" className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Sign in as Admin</button>
             </form>
             <button onClick={handleGuest} className="w-full bg-white/5 text-white/50 p-6 rounded-3xl font-black uppercase tracking-widest hover:text-white transition-all">Access as Guest</button>
           </div>
        </div>
    </div>
  );

  return (
    <div style={{ overflowX: 'hidden' }} className="min-h-screen bg-[#06090f] p-4 sm:p-10 flex flex-col text-white selection:bg-indigo-500/20">
      
      {/* HEADER SECTION */}
      <nav className="flex justify-between items-center mb-12 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-6">
           <button onClick={() => setView('dashboard')} className="w-14 h-14 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-600/30 hover:scale-110 active:scale-90 transition-all">
             {view === 'dashboard' ? <Home size={28} /> : <ArrowLeft size={28} />}
           </button>
           {view !== 'dashboard' && (
             <h2 className="text-3xl font-black uppercase tracking-tighter italic">{view}</h2>
           )}
        </div>

        <div className="flex gap-8 items-center">
            {/* CUMULATIVE YEAR SELECTOR */}
            <div className="relative">
              <button onClick={() => setShowYearMenu(!showYearMenu)} className="flex items-center gap-3 group px-4 py-2 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
                <span className="text-sm font-black tracking-widest italic">{selectedYear}</span>
                <ChevronDown className={`text-white/30 transition-all ${showYearMenu ? 'rotate-180' : ''}`} size={16} />
              </button>
              {showYearMenu && (
                <div className="absolute top-full right-0 mt-4 py-4 w-36 bg-[#111827] border border-white/10 rounded-[32px] shadow-2xl z-50 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200">
                  {['2025', '2026', '2027'].map(year => (
                    <button key={year} onClick={() => { setSelectedYear(year); setShowYearMenu(false); }} className={`w-full py-4 text-xs font-black tracking-widest transition-all ${selectedYear === year ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/30 hover:text-white'}`}>{year}</button>
                  ))}
                </div>
              )}
            </div>
            
            <div onClick={() => { setIsAuthenticated(false); setPassword(''); }} className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border-4 border-[#06090f] shadow-2xl cursor-pointer hover:bg-rose-500/10 transition-all group">
              <User size={26} className="text-white/40 group-hover:text-rose-500 transition-colors" />
            </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto w-full pb-28">
        {view === 'dashboard' ? (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center py-6">
               <h1 className="text-5xl font-black tracking-[0.2em] uppercase italic text-white drop-shadow-2xl">Jatala <span className="text-indigo-500">Properties</span></h1>
               <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.6em] mt-6">Unified Management Hub</p>
            </div>

            {/* DASHBOARD HERO STATS - CUMULATIVE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
              <FinanceCard label="CUMULATIVE REVENUE" value={aggregatedStats.totalRevenue} color="emerald" icon={<ArrowUpRight />} />
              <FinanceCard label="CUMULATIVE EXPENSES" value={aggregatedStats.totalExpenses} color="rose" icon={<ArrowDownRight />} />
            </div>

            {/* CATEGORY LIST - UNIFIED DESIGN */}
            <div className="grid grid-cols-1 gap-4">
               {categories.map(cat => (
                 <button key={cat.id} onClick={() => setView(cat.id)} className="w-full bg-[#111827] hover:bg-white/[0.04] p-10 rounded-[48px] flex justify-between items-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/[0.02] group">
                    <div className="flex items-center gap-8">
                       <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">{cat.icon}</div>
                       <span className="text-xl font-black tracking-[0.2em] uppercase italic whitespace-nowrap">{cat.title}</span>
                    </div>
                    <ChevronRight className="text-white/10 group-hover:text-indigo-400 transition-all group-hover:translate-x-2" size={32} />
                 </button>
               ))}
            </div>
          </div>
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
              {view === 'Land' && <LandAssets isAdmin={isAdmin} selectedYear={selectedYear} />}
              {view === 'Shops' && <ShopsPage isAdmin={isAdmin} selectedYear={selectedYear} />}
              {view === 'Sold' && <SoldProperties key={selectedYear} isAdmin={isAdmin} selectedYear={selectedYear} />}
              {view === 'Expenses' && <FinancialReports selectedYear={selectedYear} preFilter="Expense" />}
              {view === 'Reports' && <FinancialReports selectedYear={selectedYear} />}
              {view === 'Settings' && <SettingsPage selectedYear={selectedYear} isAdmin={isAdmin} />}
            </div>
          </Suspense>
        )}
      </main>

      {/* ADMIN CONTROL: FAB Restricted by role logic */}
      {view === 'dashboard' && isAdmin && (
        <button onClick={() => setShowEntryModal(true)} className="fixed bottom-12 right-12 w-24 h-24 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[40px] shadow-[0_20px_60px_rgba(79,70,229,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 border border-white/20">
          <Plus size={44} strokeWidth={3} />
        </button>
      )}

      <AddEntryModal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} isAdmin={isAdmin} />
    </div>
  );
};

// --- GLOBAL REUSABLE COMPONENTS ---
const FinanceCard = ({ label, value, color, icon }) => (
  <div className="bg-[#111827] p-12 rounded-[64px] flex flex-col items-center justify-center gap-8 border border-white/[0.02] shadow-2xl transition-all hover:bg-white/[0.03] group">
     <div className={`w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-${color}-500 shadow-inner group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 32 })}
     </div>
     <div className="text-center space-y-2">
        <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.5em]">{label}</p>
        <h3 className="text-4xl font-black italic text-white tracking-tighter">
           <span className="text-sm opacity-30 mr-2 not-italic">Rs.</span>
           {value.toLocaleString()}
        </h3>
     </div>
  </div>
);

export default App;

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  Map as LandPlot, Store, Receipt as ReceiptText, Plus, 
  ChevronRight, ChevronDown, Bell, User, Lock, Eye, EyeOff,
  Home, TrendingUp, TrendingDown, ArrowLeft, 
  CheckCircle, BarChart3, Settings, X, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';

// --- FIREBASE & DATA HOOKS ---
import { db, auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useFinanceData } from './useFinanceData';

// --- COMPONENTS ---
import { DashboardSkeleton } from './Skeleton';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import SettingsPage from './SettingsPage';
import AddEntryModal from './AddEntryModal';

const App = () => {
  // --- Auth & Access States ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // --- UI States ---
  const [view, setView] = useState(() => localStorage.getItem('jatala_view') || 'dashboard');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // --- Sync State to LocalStorage ---
  useEffect(() => { localStorage.setItem('jatala_view', view); }, [view]);

  // --- Firebase Guest Initializer ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  // --- Real-time Financial Data Logic ---
  const { 
    revenue = 0, 
    pending = 0, 
    expenses = 0, 
    entries = [], 
    loading: financeLoading,
    addEntry 
  } = useFinanceData(selectedYear);

  // --- Navigation Categories ---
  const categories = [
    { id: 'Land', title: "Land Assets", icon: <LandPlot size={24} />, color: "text-indigo-400" },
    { id: 'Shops', title: "Commercial Shops", icon: <Store size={24} />, color: "text-indigo-400" },
    { id: 'Sold', title: "Sold Properties", icon: <CheckCircle size={24} />, color: "text-indigo-400" },
    { id: 'Expenses', title: "Operational Expenses", icon: <ReceiptText size={24} />, color: "text-indigo-400" },
    { id: 'Reports', title: "Financial Reports", icon: <BarChart3 size={24} />, color: "text-indigo-400" },
    { id: 'Settings', title: "System Settings", icon: <Settings size={24} />, color: "text-indigo-400" },
  ];

  // --- Auth Handlers ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (password === 'ali321') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect administrative password');
    }
  };

  const handleGuestLogin = () => {
    setIsAdmin(false);
    setIsAuthenticated(true);
  };

  // --- 1. DUAL LOGIN GATEWAY ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#06090f] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
        <div className="w-full max-w-md space-y-12 text-center animate-in fade-in zoom-in-95 duration-700">
           <header className="space-y-4">
             <div className="w-20 h-20 bg-indigo-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/30">
               <Home className="text-white" size={40} />
             </div>
             <h1 className="text-3xl font-black tracking-[0.4em] text-white uppercase italic drop-shadow-2xl">JATALA <span className="text-indigo-500">PROPERTIES</span></h1>
             <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.5em] opacity-60">Management Gateway</p>
           </header>

           <div className="bg-[#111827] p-10 rounded-[48px] shadow-2xl space-y-8 border border-white/5">
             {!showAdminLogin ? (
               <div className="space-y-6">
                 <button 
                   onClick={() => setShowAdminLogin(true)}
                   className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
                 >
                   ADMIN
                 </button>
                 <button 
                   onClick={handleGuestLogin}
                   className="w-full bg-white/5 hover:bg-white/10 text-white p-6 rounded-3xl font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                 >
                   Continue as Guest (View Only)
                 </button>
               </div>
             ) : (
               <form onSubmit={handleAdminLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input 
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      placeholder="ENTER PIN"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 p-6 pl-16 rounded-3xl text-sm font-black text-white outline-none focus:border-indigo-600 focus:bg-black/60 transition-all uppercase tracking-widest placeholder:text-neutral-700"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginError && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">{loginError}</p>}
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                    Confirm Access
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAdminLogin(false)}
                    className="w-full text-neutral-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                  >
                    Go Back
                  </button>
               </form>
             )}
           </div>
        </div>
      </div>
    );
  }

  // --- 2. UNIFIED DASHBOARD UI ---
  return (
    <div style={{ overflowX: 'hidden' }} className="min-h-screen bg-[#06090f] p-4 sm:p-8 flex flex-col text-white font-sans selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center mb-10 max-w-4xl mx-auto py-4 w-full">
        <div className="flex items-center gap-6">
          {view === 'dashboard' ? (
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <Home className="text-white" size={24} />
            </div>
          ) : (
            <button 
              onClick={() => setView('dashboard')}
              className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all active:scale-90"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
          )}
          {view !== 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-left-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">{view.replace(/_/g, ' ')}</h2>
                <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-[0.4em] mt-1 opacity-80 italic">Management Database</p>
            </div>
          )}
        </div>

        <div className="flex gap-6 items-center">
             {/* Year Selector */}
             <div className="relative">
               <button 
                 onClick={() => setShowYearMenu(!showYearMenu)}
                 className="flex items-center gap-2 group transition-all active:scale-95"
               >
                 <span className="text-[13px] font-black tracking-[0.2em] text-white italic">{selectedYear}</span>
                 <ChevronDown className={`text-neutral-500 group-hover:text-indigo-400 transition-transform duration-300 ${showYearMenu ? 'rotate-180' : ''}`} size={16} />
               </button>
               {showYearMenu && (
                 <div className="absolute top-full right-0 mt-6 py-4 w-40 bg-[#111827] border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl">
                   {['2025', '2026', '2027', '2028', '2029', '2030'].map(year => (
                     <button
                       key={year}
                       onClick={() => { setSelectedYear(year); setShowYearMenu(false); }}
                       className={`w-full py-4 text-[11px] font-black tracking-[0.3em] uppercase transition-all ${selectedYear === year ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                     >
                       {year}
                     </button>
                   ))}
                 </div>
               )}
             </div>

             <Bell className="text-neutral-500 hover:text-indigo-400 cursor-pointer transition-colors" size={24} />
             <div 
               onClick={() => {
                 setIsAuthenticated(false);
                 setIsAdmin(false);
                 setPassword('');
                 setView('dashboard');
               }}
               className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border-4 border-[#06090f] shadow-2xl cursor-pointer hover:bg-rose-500/10 hover:scale-110 active:scale-90 transition-all overflow-hidden group"
               title="Logout"
             >
               <User size={22} className="text-white group-hover:text-rose-500 transition-colors" />
             </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto w-full pb-24">
        {view === 'dashboard' ? (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <header className="text-center py-10">
              <h1 className="text-4xl font-black tracking-[0.3em] uppercase text-white italic">JATALA <span className="text-indigo-500">PROPERTIES</span></h1>
              <div className="h-1 w-16 bg-indigo-600/40 mx-auto mt-6 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
            </header>

            {/* Financial Summary - 2 Large Unified Cards */}
            <div className="flex flex-col sm:flex-row gap-6 mb-12">
              <FinanceCard 
                label="EXPECTED REVENUE" 
                color="emerald" 
                icon={<ArrowUpRight />} 
                value={revenue + pending} 
              />
              <FinanceCard 
                label="TOTAL EXPENSES" 
                color="rose" 
                icon={<ArrowDownRight />} 
                value={expenses} 
              />
            </div>

            {/* Navigation Menu Rows */}
            <div className="space-y-4">
              {categories.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setView(item.id)} 
                  className={`w-full group bg-[#111827] hover:bg-white/[0.04] p-8 rounded-[40px] flex justify-between items-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl border border-white/[0.02]`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', gap: '20px' }}>
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/[0.1] group-hover:scale-110 group-hover:text-indigo-400 transition-all duration-500">
                      {item.icon}
                    </div>
                    <span style={{ color: '#FFFFFF', fontWeight: '900', fontSize: '15px', letterSpacing: '0.25em', opacity: 1, whiteSpace: 'nowrap' }} className="uppercase italic tracking-widest">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <ChevronRight className="text-neutral-700 group-hover:text-indigo-400 group-hover:translate-x-2 transition-all duration-300" size={24} />
                  </div>
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
              {view === 'Expenses' && <FinancialReports entries={entries} selectedYear={selectedYear} preFilter="Expense" />}
              {view === 'Reports' && <FinancialReports entries={entries} selectedYear={selectedYear} />}
              {view === 'Settings' && <SettingsPage entries={entries} selectedYear={selectedYear} isAdmin={isAdmin} />}
            </div>
          </Suspense>
        )}
      </main>

      {/* Floating Action Button - Restricted to Admin (Dual Login Rule) */}
      {view === 'dashboard' && isAdmin && (
        <button 
          onClick={() => setShowEntryModal(true)}
          className="fixed bottom-12 right-12 w-20 h-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[40px] shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-50 border border-white/20"
        >
          <Plus size={40} strokeWidth={3} />
        </button>
      )}

      {/* Footer Branding */}
      <footer className="w-full flex justify-center py-10 opacity-30 mt-auto">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Premium Management System v2.0</p>
      </footer>

      <AddEntryModal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};

// --- 3. UNIFIED HERO CARDS COMPONENT ---
const FinanceCard = ({ label, icon, value, color }) => (
  <div className="group relative bg-[#111827] p-8 md:p-10 rounded-[48px] flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:bg-white/[0.03] shadow-2xl overflow-hidden min-w-0 flex-1 border border-white/[0.02]">
    <div className={`w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-${color}-500 shadow-[0_0_20px_rgba(0,0,0,0.2)] group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500`}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div className="flex flex-col items-center text-center">
      <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-3 leading-relaxed opacity-80">{label}</span>
      <p style={{ color: '#FFFFFF', fontWeight: '900', fontSize: '28px', fontStyle: 'italic', opacity: 1 }} className="whitespace-nowrap tracking-tight leading-none flex items-center">
        <span className="text-sm mr-2 opacity-50 not-italic font-bold">Rs.</span>
        {value.toLocaleString()}
      </p>
    </div>
  </div>
);

export default App;

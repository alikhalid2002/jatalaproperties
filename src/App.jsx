import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  Map as LandPlot, Store, Receipt as ReceiptText, Plus, 
  ChevronRight, ChevronDown, Bell, User, Lock, Eye, EyeOff,
  Home, TrendingUp, TrendingDown, ArrowLeft, 
  CheckCircle, BarChart3, Settings, X, ArrowUpRight, ArrowDownRight, Calendar,
  Fingerprint, Building2
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
import { seedFarmersData } from './seedFarmers';

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
  const [selectedArea, setSelectedArea] = useState(() => localStorage.getItem('jatala_selected_area') || null);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // --- Sync State to LocalStorage ---
  useEffect(() => { 
    localStorage.setItem('jatala_view', view);
    if (selectedArea) localStorage.setItem('jatala_selected_area', selectedArea);
    else localStorage.removeItem('jatala_selected_area');
  }, [view, selectedArea]);

  // --- Firebase Guest Initializer & Data Restoration ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    seedFarmersData().catch(console.error);
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
    { id: 'Land', title: "Land Assets", icon: <LandPlot size={24} />, color: "text-blue-400" },
    { id: 'Shops', title: "Commercial Shops", icon: <Store size={24} />, color: "text-purple-400" },
    { id: 'Sold', title: "Sold Properties", icon: <CheckCircle size={24} />, color: "text-emerald-400" },
    { id: 'Expenses', title: "Operational Expenses", icon: <ReceiptText size={24} />, color: "text-rose-400" },
    { id: 'Reports', title: "Financial Reports", icon: <BarChart3 size={24} />, color: "text-amber-400" },
    { id: 'Settings', title: "System Settings", icon: <Settings size={24} />, color: "text-slate-400" },
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
      <div className="min-h-screen bg-[#030406] flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-sm space-y-16 text-center animate-in fade-in zoom-in-95 duration-1000">
           {/* Logo Section */}
           <header className="flex flex-col items-center space-y-8">
             <div className="w-24 h-24 bg-[#11141b] rounded-[32px] flex items-center justify-center border border-white/5 shadow-2xl shadow-indigo-500/10 relative group">
               <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
               <Building2 className="text-[#818cf8]" size={42} strokeWidth={1.5} />
             </div>
             <div className="space-y-1">
               <h2 className="text-xl font-light tracking-[0.6em] text-white opacity-90 uppercase">Jatala</h2>
               <h1 className="text-4xl font-black tracking-[0.1em] text-[#818cf8] uppercase drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">Properties</h1>
             </div>
           </header>

           {/* Buttons Section */}
           <div className="space-y-4 w-full px-4">
             {!showAdminLogin ? (
               <>
                 {/* GUEST BUTTON */}
                 <button 
                   onClick={handleGuestLogin}
                   className="w-full group bg-[#0c0f16] border border-white/5 p-2 rounded-[24px] flex items-center transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-xl"
                 >
                   <div className="w-14 h-14 bg-[#11151f] rounded-[20px] flex items-center justify-center border border-white/5 text-emerald-400 group-hover:scale-110 transition-all">
                     <Eye size={24} strokeWidth={1.5} />
                   </div>
                   <span className="flex-1 text-center text-white text-xl font-black italic tracking-widest uppercase ml-[-14px]">Guest</span>
                 </button>

                 {/* ADMIN BUTTON */}
                 <button 
                   onClick={() => setShowAdminLogin(true)}
                   className="w-full group bg-[#0c0f16] border border-white/5 p-2 rounded-[24px] flex items-center transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-xl"
                 >
                   <div className="w-14 h-14 bg-[#11151f] rounded-[20px] flex items-center justify-center border border-white/5 text-neutral-500 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                     <Fingerprint size={24} strokeWidth={1.5} />
                   </div>
                   <span className="flex-1 text-center text-white text-xl font-black italic tracking-widest uppercase ml-[-14px]">Admin</span>
                 </button>
               </>
             ) : (
               <form onSubmit={handleAdminLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-[#818cf8] transition-colors" size={20} />
                    <input 
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      placeholder="ENTER PIN"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0c0f16] border border-white/5 p-6 pl-16 rounded-[24px] text-sm font-black text-white outline-none focus:border-[#818cf8]/50 focus:bg-[#11151f] transition-all uppercase tracking-widest placeholder:text-neutral-700"
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
                  
                  <div className="flex flex-col gap-4">
                    <button type="submit" className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white p-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 transition-all active:scale-95">
                      Authorize Access
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="text-neutral-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                    >
                      Back to Gateway
                    </button>
                  </div>
               </form>
             )}
           </div>
        </div>
      </div>
    );
  }

  // --- 2. UNIFIED DASHBOARD UI ---
  return (
    <div style={{ overflowX: 'hidden' }} className="min-h-screen bg-[#030406] p-4 sm:p-8 flex flex-col text-white font-sans selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center mb-10 max-w-4xl mx-auto py-4 w-full">
        <div className="flex items-center gap-6">
          {view === 'dashboard' ? (
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <Home className="text-white" size={24} />
            </div>
          ) : (
            <button 
              onClick={() => {
                if (view === 'landMembers') setView('landSelection');
                else if (view === 'landSelection') setView('dashboard');
                else setView('dashboard');
              }}
              className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all active:scale-90"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
          )}
          {view !== 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-left-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
                  {view === 'landSelection' ? 'Land Database' : (view === 'landMembers' ? selectedArea : view.replace(/_/g, ' '))}
                </h2>
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
          <div className="max-w-xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
            {/* Logo Heading */}
            <header className="flex flex-col items-center space-y-1 pt-2">
               <div className="flex items-center gap-3">
                 <h2 className="text-lg font-light tracking-[0.5em] text-white opacity-80 uppercase leading-none">Jatala</h2>
                 <h1 className="text-2xl font-black tracking-[0.05em] text-[#818cf8] uppercase drop-shadow-[0_0_10px_rgba(129,140,248,0.2)] leading-none">Properties</h1>
               </div>
               <div className="w-12 h-[1px] bg-indigo-500/10 rounded-full mt-2"></div>
            </header>

            {/* Unified Financial Card */}
            <div className="bg-[#0c0f16] border border-white/5 rounded-[48px] p-10 flex shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none"></div>
               
               {/* Expected Section */}
               <div className="flex-1 flex flex-col items-center space-y-4 border-r border-white/5">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/10 transition-transform group-hover:scale-110">
                    <TrendingUp size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-1">Expected</p>
                    <h3 className="text-2xl font-black italic text-white tracking-tight">
                      <span className="text-xs mr-1 opacity-40 not-italic">Rs.</span>{(revenue + pending).toLocaleString()}
                    </h3>
                  </div>
               </div>

               {/* Expenses Section */}
               <div className="flex-1 flex flex-col items-center space-y-4">
                  <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/10 transition-transform group-hover:scale-110">
                    <TrendingDown size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-1">Expenses</p>
                    <h3 className="text-2xl font-black italic text-white tracking-tight">
                      <span className="text-xs mr-1 opacity-40 not-italic">Rs.</span>{expenses.toLocaleString()}
                    </h3>
                  </div>
               </div>
            </div>

            {/* Navigation Menu List */}
            <div className="space-y-4 px-2">
              {categories.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => {
                    if (item.id === 'Land') {
                      setView('landSelection');
                    } else {
                      setView(item.id);
                    }
                  }} 
                  className="w-full group bg-[#0c0f16] border border-white/5 p-2 rounded-[24px] flex items-center transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-xl min-h-[72px]"
                >
                  <div className={`w-14 h-14 bg-[#11151f] rounded-[20px] flex items-center justify-center border border-white/5 ${item.color} group-hover:scale-110 transition-all ml-1 flex-shrink-0`}>
                    {React.cloneElement(item.icon, { size: 22, strokeWidth: 1.5 })}
                  </div>
                  <span className="flex-1 text-center text-white text-[15px] font-black italic tracking-widest uppercase px-4 leading-tight">
                    {item.title}
                  </span>
                  <div className="mr-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0">
                    <ChevronRight size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
              {view === 'landSelection' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto px-4 py-12">
                   {[
                     { name: 'RAJANPUR' },
                     { name: 'DASUHA' }
                   ].map((area) => (
                     <button
                        key={area.name}
                        onClick={() => {
                          setSelectedArea(area.name);
                          setView('landMembers');
                        }}
                        className="group relative bg-[#0c0f16] border border-white/5 p-12 rounded-[48px] flex flex-col items-center gap-6 transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-2xl"
                     >
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all border border-indigo-500/10">
                           <LandPlot size={32} />
                        </div>
                        <div className="text-center">
                           <h3 className="text-3xl font-black italic tracking-widest text-white uppercase">{area.name}</h3>
                        </div>
                        <div className="absolute top-8 right-8 opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                           <ChevronRight size={24} />
                        </div>
                     </button>
                   ))}
                </div>
              )}
              {view === 'landMembers' && <LandAssets isAdmin={isAdmin} selectedYear={selectedYear} selectedArea={selectedArea} />}
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

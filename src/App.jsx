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
    { id: 'Settings', title: "System Settings", icon: <Settings size={24} />, color: "text-indigo-300" },
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
        <div className="w-full max-w-md bg-[#090d16] border border-slate-800/80 rounded-[32px] shadow-2xl p-8 space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>
          
          {/* Logo Section */}
          <header className="flex flex-col items-center space-y-4 text-center">
            <div className="w-16 h-16 bg-[#11141b] rounded-[22px] flex items-center justify-center border border-white/5 shadow-2xl shadow-indigo-500/10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
              <Building2 className="text-[#818cf8]" size={30} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xs font-light tracking-[0.6em] text-white opacity-90 uppercase leading-none">Jatala</h2>
              <h1 className="text-2xl font-black tracking-[0.1em] text-[#818cf8] uppercase drop-shadow-[0_0_15px_rgba(129,140,248,0.3)] leading-none mt-1">Properties</h1>
            </div>
          </header>

          {/* Buttons Section */}
          <div className="space-y-4">
            {!showAdminLogin ? (
              <>
                {/* GUEST BUTTON */}
                <button 
                  onClick={handleGuestLogin}
                  className="w-full group bg-[#0c0f16] border border-white/5 p-2 rounded-[20px] flex items-center transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-xl cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#11151f] rounded-[16px] flex items-center justify-center border border-white/5 text-emerald-400 group-hover:scale-110 transition-all">
                    <Eye size={20} strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-center text-white text-lg font-black tracking-widest uppercase ml-[-12px]">Guest</span>
                </button>

                {/* ADMIN BUTTON */}
                <button 
                  onClick={() => setShowAdminLogin(true)}
                  className="w-full group bg-[#0c0f16] border border-white/5 p-2 rounded-[20px] flex items-center transition-all hover:bg-[#11151f] hover:border-white/10 active:scale-95 shadow-xl cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#11151f] rounded-[16px] flex items-center justify-center border border-white/5 text-indigo-300 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                    <Fingerprint size={20} strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-center text-white text-lg font-black tracking-widest uppercase ml-[-12px]">Admin</span>
                </button>
              </>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-5 text-center">
                 <div className="relative group">
                   <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#818cf8] transition-colors" size={18} />
                   <input 
                     autoFocus
                     type={showPassword ? "text" : "password"}
                     placeholder="ENTER PIN"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-[#0c0f16] border border-white/5 p-5 pl-14 rounded-[20px] text-xs font-black text-white outline-none focus:border-[#818cf8]/50 focus:bg-[#11151f] transition-all uppercase tracking-widest placeholder:text-slate-500"
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                   >
                     {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                   </button>
                 </div>
                 {loginError && <p className="text-rose-500 text-[9px] font-bold uppercase tracking-widest animate-pulse">{loginError}</p>}
                 
                 <div className="flex flex-col gap-3">
                   <button type="submit" className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white p-5 rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer">
                     Authorize Access
                   </button>
                   <button 
                     type="button"
                     onClick={() => setShowAdminLogin(false)}
                     className="text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors cursor-pointer"
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

  // --- 2. RESPONSIVE DASHBOARD & APP UI ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col">
      
      {/* Dynamic App Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/60 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            {view === 'dashboard' ? (
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/50">
                <Home className="w-5 h-5" />
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (view === 'landMembers') setView('landSelection');
                  else if (view === 'landSelection') setView('dashboard');
                  else setView('dashboard');
                }}
                className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:scale-105 transition-all active:scale-95 cursor-pointer text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-indigo-200/80 font-black leading-tight">
                {view === 'dashboard' ? 'Jatala Properties' : (view === 'landSelection' ? 'Land Database' : (view === 'landMembers' ? selectedArea : view.replace(/_/g, ' ')))}
              </div>
              <div className="relative inline-block mt-1">
                <button 
                  onClick={() => setShowYearMenu(!showYearMenu)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors border border-slate-800 rounded-lg px-2.5 py-0.5 bg-slate-950/50 hover:bg-slate-950/80 cursor-pointer animate-in fade-in"
                >
                  Year {selectedYear}
                  <ChevronDown className={`w-3.5 h-3.5 text-indigo-205 transition-transform ${showYearMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showYearMenu && (
                  <div className="absolute left-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in duration-200">
                    {['2025', '2026', '2027', '2028', '2029', '2030'].map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          setSelectedYear(y);
                          setShowYearMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors block cursor-pointer ${
                          selectedYear === y 
                            ? 'bg-indigo-600/20 text-indigo-400 font-bold' 
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        Year {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-slate-300 hover:text-white transition-all relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-4 ring-slate-950"></span>
            </button>
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                setIsAdmin(false);
                setPassword('');
                setView('dashboard');
              }}
              className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Logout"
            >
              <User className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-8">
            {/* Logo / Brand area - Modernized typography */}
            <div className="text-center py-2">
              <h1 className="text-xl tracking-[0.3em] text-slate-200 font-light inline-block uppercase mr-2">Jatala</h1>
              <span className="text-xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 font-black uppercase">Properties</span>
            </div>

            {/* Expected & Expenses Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 rounded-[32px] border border-slate-800/60 p-6 md:p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-24 -top-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                
                {/* Expected Revenues */}
                <div className="md:border-r md:border-slate-800/80 md:pr-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-200/95">Expected Revenues</span>
                  </div>
                  <div className="text-slate-400 text-xs mb-1.5">Estimated Inflow</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    <span className="text-lg font-normal text-emerald-400/90 mr-1">Rs.</span>
                    {(revenue + pending).toLocaleString()}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-medium self-start">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% YoY
                  </div>
                </div>

                {/* Expenses Block */}
                <div className="md:pl-8 flex flex-col justify-center border-t border-slate-800/40 md:border-t-0 pt-6 md:pt-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-200/95">Total Expenses</span>
                  </div>
                  <div className="text-slate-400 text-xs mb-1.5">Year to Date Outflow</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    <span className="text-lg font-normal text-rose-400/90 mr-1">Rs.</span>
                    {expenses.toLocaleString()}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full font-medium self-start">
                    Active Ledger
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Menu Grid */}
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-indigo-200/80 font-bold px-1">Assets & Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((item) => {
                  let iconBg = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                  if (item.id === 'Shops') iconBg = 'bg-purple-500/10 border-purple-500/20 text-purple-400';
                  if (item.id === 'Sold') iconBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                  if (item.id === 'Expenses') iconBg = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                  if (item.id === 'Reports') iconBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                  if (item.id === 'Settings') iconBg = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300';

                  return (
                    <button 
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'Land') {
                          setView('landSelection');
                        } else {
                          setView(item.id);
                        }
                      }}
                      className="bg-slate-900/60 hover:bg-slate-900/90 active:scale-[0.98] border border-slate-800/60 hover:border-slate-700/80 rounded-2xl p-5 flex items-center justify-between transition-all duration-200 shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-200 ${iconBg}`}>
                          {React.cloneElement(item.icon, { className: "w-5.5 h-5.5" })}
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs tracking-wider uppercase font-bold text-slate-100 group-hover:text-white transition-colors">{item.title}</h3>
                          <p className="text-[10px] text-indigo-200/70 mt-1">
                            {item.id === 'Land' && 'Land Plot Registry'}
                            {item.id === 'Shops' && 'Commercial Locations'}
                            {item.id === 'Sold' && 'Settled Deals'}
                            {item.id === 'Expenses' && `Rs. ${expenses.toLocaleString()} total`}
                            {item.id === 'Reports' && 'Interactive Graphs & Cashflow'}
                            {item.id === 'Settings' && 'Configuration & Seeds'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-300/40 group-hover:text-indigo-200/80 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
              {view === 'landSelection' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
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
                        className="group relative bg-slate-900/60 hover:bg-slate-900/90 active:scale-[0.98] border border-slate-800/60 hover:border-slate-700/80 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all duration-200 shadow-md cursor-pointer"
                     >
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all border border-indigo-500/10">
                           <LandPlot className="w-7 h-7" />
                        </div>
                        <div className="text-center">
                           <h3 className="text-xl font-black tracking-widest text-white uppercase">{area.name}</h3>
                        </div>
                        <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                           <ChevronRight className="w-5 h-5" />
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
 
      {/* Floating Action Button - Restricted to Admin - Fixed to bottom-right of viewport */}
      {view === 'dashboard' && isAdmin && (
        <button 
          onClick={() => setShowEntryModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-950/80 border border-indigo-400/30 transition-all duration-200 z-40 cursor-pointer animate-in fade-in zoom-in"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      )}
 
  
 
      {/* Real AddEntryModal - Keeps 100% of standard entry functionality */}
      <AddEntryModal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};

export default App;

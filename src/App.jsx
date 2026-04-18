import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  Map as LandPlot, Store, Receipt as ReceiptText, Plus, 
  ChevronRight, ChevronDown, Bell, User, 
  Home, TrendingUp, TrendingDown, ArrowLeft, 
  CheckCircle, BarChart3, Settings, X, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// --- FIREBASE & DATA HOOKS ---
import { db, auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useFinanceData } from './useFinanceData';
import { useFarmers } from './useFarmers';
import { useReminders } from './useReminders';
import { useGlobalActivity } from './useGlobalActivity';

// --- COMPONENTS ---
import { DashboardSkeleton } from './Skeleton';
const LandAssets = lazy(() => import('./LandAssets'));
const ShopsPage = lazy(() => import('./ShopsPage'));
const FinancialReports = lazy(() => import('./FinancialReports'));
const SoldProperties = lazy(() => import('./SoldProperties'));
import SettingsPage from './SettingsPage';
import AddEntryModal from './AddEntryModal';

const App = () => {
  // --- States ---
  const [view, setView] = useState(() => localStorage.getItem('jatala_view') || 'dashboard');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  // --- Sync State to LocalStorage ---
  useEffect(() => { localStorage.setItem('jatala_view', view); }, [view]);

  // --- Auth Safety ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  // --- Data Fetching ---
  const { 
    revenue: revenueVal = 0, 
    pending: pendingVal = 0, 
    expenses: expenseVal = 0, 
    entries = [], 
    loading: financeLoading,
    addEntry 
  } = useFinanceData(selectedYear);

  const categories = [
    { id: 'Land', title: "Land Assets", icon: <LandPlot size={22} />, color: "text-blue-400", border: "border-blue-500/20", glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]" },
    { id: 'Shops', title: "Commercial Shops", icon: <Store size={22} />, color: "text-purple-400", border: "border-purple-500/20", glow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]" },
    { id: 'Expenses', title: "Operational Expenses", icon: <ReceiptText size={22} />, color: "text-rose-400", border: "border-rose-500/20", glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]" },
    { id: 'Sold', title: "Sold Properties", icon: <CheckCircle size={22} />, color: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]" },
    { id: 'Reports', title: "Financial Reports", icon: <BarChart3 size={22} />, color: "text-amber-400", border: "border-amber-500/20", glow: "shadow-[0_0_20px_rgba(251,191,36,0.2)]" },
    { id: 'Settings', title: "System Settings", icon: <Settings size={22} />, color: "text-cyan-400", border: "border-cyan-500/20", glow: "shadow-[0_0_20px_rgba(34,211,238,0.2)]" },
  ];

  const FinanceCard = ({ label, color, icon, value }) => (
    <div className="group relative bg-[#111827]/40 backdrop-blur-md p-6 rounded-[32px] border border-white/5 flex flex-row items-center gap-4 transition-all duration-500 hover:bg-white/5 shadow-xl overflow-hidden min-w-0 flex-1">
      <div className={`relative text-${color}-400 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="flex flex-col items-start min-w-0 flex-1">
        <span className="text-[8px] font-black uppercase text-white tracking-[0.2em] mb-1 whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{label}</span>
        <p className="text-sm lg:text-xl font-black italic text-white whitespace-nowrap">
          <span className="text-[10px] mr-1 opacity-50 not-italic">Rs.</span>
          {value.toLocaleString()}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 h-[2px] bg-${color}-500/50 w-[30%] group-hover:w-[50%] transition-all duration-700`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-200 p-4 scroll-container">
      <nav className="flex justify-between items-center mb-8 max-w-4xl mx-auto py-4">
        <div className="flex items-center gap-4">
          {view === 'dashboard' ? (
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Home className="text-white" size={20} />
            </div>
          ) : (
            <button 
              onClick={() => setView('dashboard')}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="text-white" size={20} />
            </button>
          )}
          {view !== 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-white font-black uppercase tracking-widest leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{view.replace(/_/g, ' ')}</h2>
              <p className="text-[7px] text-indigo-500 font-black uppercase tracking-[0.4em] mt-1">Inventory Database</p>
            </div>
          )}
        </div>
        <div className="flex gap-4 items-center">
           <Bell className="text-slate-400 hover:text-white cursor-pointer transition-colors" size={20} />
           <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg cursor-pointer">
             <User size={18} className="text-white" />
           </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto pb-24">
        {view === 'dashboard' ? (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <header className="text-center py-6 mb-8">
              <h1 className="text-2xl font-light tracking-[0.3em] uppercase text-white">JATALA <span className="font-black text-indigo-500">PROPERTIES</span></h1>
              <div className="h-[1px] w-12 bg-indigo-500/30 mx-auto mt-4"></div>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <FinanceCard label="Expected Revenue" color="emerald" icon={<ArrowUpRight />} value={revenueVal + pendingVal} />
              <FinanceCard label="Total Expenses" color="rose" icon={<ArrowDownRight />} value={expenseVal} />
            </div>

            <div className="space-y-3">
              {categories.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setView(item.id)} 
                  className={`w-full group bg-[#111827]/40 hover:bg-white/[0.04] border ${item.border} p-6 rounded-[28px] flex justify-between items-center transition-all duration-300 ${item.glow} hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`${item.color} group-hover:scale-110 transition-transform duration-500`}>{item.icon}</div>
                    <span className="text-white font-black uppercase tracking-[0.2em] text-[10px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{item.title}</span>
                  </div>
                  <ChevronRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={18} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>
            {view === 'Land' && <LandAssets isAdmin={isAdmin} selectedYear={selectedYear} />}
            {view === 'Shops' && <ShopsPage isAdmin={isAdmin} selectedYear={selectedYear} />}
            {view === 'Sold' && <SoldProperties key={selectedYear} isAdmin={isAdmin} selectedYear={selectedYear} />}
            {view === 'Expenses' && <FinancialReports entries={entries} selectedYear={selectedYear} preFilter="Expense" />}
            {view === 'Reports' && <FinancialReports entries={entries} selectedYear={selectedYear} />}
            {view === 'Settings' && <SettingsPage entries={entries} selectedYear={selectedYear} isAdmin={isAdmin} />}
          </Suspense>
        )}
      </main>

      {/* Fab Button */}
      {view === 'dashboard' && (
        <button 
          onClick={() => setShowEntryModal(true)}
          className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] shadow-2xl shadow-indigo-600/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 border border-white/20"
        >
          <Plus size={32} />
        </button>
      )}

      <AddEntryModal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} onAdd={addEntry} isAdmin={isAdmin} />
    </div>
  );
};
export default App;

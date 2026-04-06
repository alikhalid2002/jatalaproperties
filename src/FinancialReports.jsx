import React, { useState, useMemo } from 'react';
import {
  Search, ArrowUpRight, ArrowDownRight, Store, Clock,
  BarChart3, X, SlidersHorizontal, FileText, Download, FileSpreadsheet, FileBox
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { transliterateToUrdu } from './urduTransliterator';

const CATEGORY_MAP = (entry) => {
  if (entry.type === 'shop_expense') return 'Shop Repair';
  if (entry.type === 'revenue') return entry.status === 'received' ? 'Rent Received' : 'Rent Pending';
  if (entry.label?.includes('(')) return entry.label.split('(')[1].replace(')', '');
  const text = (entry.label || entry.note || '');
  if (text.toLowerCase().includes('travel') || text.toLowerCase().includes('fuel')) return 'Travel';
  if (text.toLowerCase().includes('bill')) return 'Utility';
  if (text.toLowerCase().includes('salary')) return 'Salary';
  if (text.toLowerCase().includes('repair') || text.toLowerCase().includes('maintenance')) return 'Maintenance';
  return 'Operational';
};

const TYPE_CONFIG = {
  revenue:      { label: 'Revenue',     color: 'emerald' },
  pending:      { label: 'Pending',     color: 'amber'   },
  expense:      { label: 'Expense',     color: 'rose'    },
  shop_expense: { label: 'Repair',      color: 'orange'  },
};

const BADGE_COLORS = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  amber:   'bg-amber-500/10  border-amber-500/20  text-amber-400',
  rose:    'bg-rose-500/10   border-rose-500/20   text-rose-400',
  orange:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
};

const AMOUNT_COLORS = {
  revenue:      'text-emerald-400',
  pending:      'text-amber-400',
  expense:      'text-rose-400',
  shop_expense: 'text-rose-400',
};

const SummaryCard = ({ label, year, value, sub, icon, color }) => (
    <div className="bg-slate-800/40 p-1 md:p-6 rounded-lg md:rounded-[32px] border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col items-center justify-center w-full min-h-[85px] md:min-h-0 relative overflow-hidden group shadow-lg">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 blur-[80px] opacity-10`}></div>
        <div className="flex flex-col items-center justify-center relative z-10 w-full">
            <div className={`mb-1 p-1 md:p-4 bg-${color}-500/10 text-${color}-400 rounded-md md:rounded-2xl transition-transform group-hover:scale-110`}>
                {React.cloneElement(icon, { size: window.innerWidth < 768 ? 14 : 24 })}
            </div>
            <div className="flex flex-col items-center text-center w-full px-0.5">
              <span className={`text-${color}-400 text-[9px] md:text-sm font-black leading-tight whitespace-nowrap overflow-hidden w-full uppercase tracking-tighter`}>{label}</span>
              <span className={`text-${color}-400 opacity-80 text-[6.5px] md:text-xs font-black`}>{year}</span>
            </div>
        </div>
        <div className="relative z-10 text-center w-full px-0.5">
            <p className="text-[10px] md:text-xl font-bold tracking-tighter whitespace-nowrap overflow-hidden text-white mt-1 w-full italic">Rs. {value?.toLocaleString()}</p>
            <span className="text-slate-500 text-[6.5px] md:text-xs font-black hidden md:block uppercase tracking-widest">{sub}</span>
        </div>
    </div>
);

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.expense;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black border uppercase tracking-widest ${BADGE_COLORS[cfg.color]}`}>
      {cfg.label}
    </span>
  );
}

export default function FinancialReports({ entries = [], selectedYear }) {
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [sortField, setSortField]         = useState('date');
  const [sortDir, setSortDir]             = useState('desc');
  const [showFilters, setShowFilters]     = useState(false);

  const normalised = useMemo(() => entries.map(e => {
    const rowType = (e.type === 'revenue' && e.status !== 'received') ? 'pending' : e.type;
    const date = e.date || (e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000).toISOString().split('T')[0] : '');
    return {
      ...e,
      _type: rowType,
      _date: date,
      _description: e.label || e.note || e.description || e.tenant || '—',
      _asset: e.shopName || e.farmerName || e.target || '—',
      _category: CATEGORY_MAP(e),
    };
  }), [entries]);

  const categories = useMemo(() => ['All', ...new Set(normalised.map(e => e._category))], [normalised]);
  const types = ['All', 'Revenue', 'Pending', 'Expense', 'Shop Repair'];
  const typeMap = { Revenue: 'revenue', Pending: 'pending', Expense: 'expense', 'Shop Repair': 'shop_expense' };

  const filtered = useMemo(() => {
    let rows = normalised;
    if (typeFilter !== 'All') rows = rows.filter(r => r._type === typeMap[typeFilter]);
    if (categoryFilter !== 'All') rows = rows.filter(r => r._category === categoryFilter);
    if (dateFrom) rows = rows.filter(r => r._date >= dateFrom);
    if (dateTo)   rows = rows.filter(r => r._date <= dateTo);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r._description?.toLowerCase().includes(q) ||
        r._asset?.toLowerCase().includes(q) ||
        r._category?.toLowerCase().includes(q) ||
        r._date?.includes(q) ||
        String(r.amount)?.includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const va = sortField === 'amount' ? Number(a.amount) : (a._date || '');
      const vb = sortField === 'amount' ? Number(b.amount) : (b._date || '');
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [normalised, typeFilter, categoryFilter, dateFrom, dateTo, search, sortField, sortDir]);

  const totals = useMemo(() => ({
    revenue:    filtered.filter(r => r._type === 'revenue').reduce((s, r)     => s + Number(r.amount), 0),
    pending:    filtered.filter(r => r._type === 'pending').reduce((s, r)     => s + Number(r.amount), 0),
    expense:    filtered.filter(r => r._type === 'expense').reduce((s, r)     => s + Number(r.amount), 0),
    shopRepair: filtered.filter(r => r._type === 'shop_expense').reduce((s, r) => s + Number(r.amount), 0),
  }), [filtered]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const clearFilters = () => {
    setSearch(''); setTypeFilter('All'); setCategoryFilter('All');
    setDateFrom(''); setDateTo('');
  };

  const hasFilters = !!(search || typeFilter !== 'All' || categoryFilter !== 'All' || dateFrom || dateTo);

  const net = totals.revenue - totals.expense - totals.shopRepair;

  // ── Excel / XLSX download (Modern) ────────────────────────
  const downloadExcel = () => {
    const worksheetData = [
      ["Jatala Properties — Financial Report"],
      [`Fiscal Year: ${selectedYear}-${Number(selectedYear) - 1}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ["FINANCIAL SUMMARY"],
      ["TOTAL REVENUE", `Rs. ${totals.revenue.toLocaleString()}`],
      ["TOTAL PENDING", `Rs. ${totals.pending.toLocaleString()}`],
      ["TOTAL EXPENSES", `Rs. ${totals.expense.toLocaleString()}`],
      ["SHOP REPAIRS", `Rs. ${totals.shopRepair.toLocaleString()}`],
      ["NET BALANCE", `Rs. ${net.toLocaleString()}`],
      [],
      ["TRANSACTION LOG"],
      ["Date", "Type", "Category", "Description", "Asset / Shop", "Amount (Rs.)"]
    ];

    filtered.forEach(r => {
      worksheetData.push([
        r._date || '—',
        (TYPE_CONFIG[r._type] || TYPE_CONFIG.expense).label,
        r._category,
        r.nameEn || r.tenant || r.note || r.description || r._description,
        r._asset && r._asset !== '—' ? r._asset : '—',
        r.amount
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Simple column width styling
    const wscols = [
      {wch: 12}, {wch: 15}, {wch: 15}, {wch: 35}, {wch: 25}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, `Jatala_Report_${selectedYear}_${Number(selectedYear) - 1}.xlsx`);
  };



  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden gap-5">

      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:items-center justify-center gap-6 lg:gap-4 mb-8 text-center">
        
        {/* Row 1: Icon + Title + Year */}
        <div className="flex flex-col items-center gap-3 min-w-0">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl shadow-lg shadow-indigo-500/10 mb-2">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-2xl lg:text-4xl font-black text-white italic leading-none uppercase tracking-tighter">
              Financial Reports
            </h2>
            <p className="text-[10px] lg:text-xs font-black text-indigo-400/60 uppercase tracking-[0.3em] mt-3 italic">
              All Records • {selectedYear}-{Number(selectedYear) - 1}
            </p>
          </div>
        </div>

        {/* Row 2: Search + Actions (Records, Excel, Filter) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 lg:gap-4 w-full lg:w-auto">
          {/* Compact search */}
          <div className="relative w-full max-w-md lg:max-w-[260px]">
            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl py-2.5 pl-9 pr-8 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all text-center uppercase font-black italic tracking-widest"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 shrink-0">
            <span className="px-3 lg:px-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-[9px] lg:text-[10px] font-black text-white italic uppercase tracking-widest">
              {filtered.length} Records
            </span>
            <button
              onClick={downloadExcel}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest border transition-all bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-2xl text-[11px] lg:text-[12px] font-black border transition-all uppercase tracking-widest ${showFilters ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/40'}`}
            >
              <SlidersHorizontal size={13} />
              Filter
              {hasFilters && <span className="w-2 h-2 bg-indigo-400 rounded-full" />}
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards: Strictly single row on mobile */}
      <div className="grid grid-cols-4 gap-1 md:gap-4 mb-10 w-full px-1">
        <SummaryCard 
          label="Total Revenue"    
          year={`${selectedYear}-${Number(selectedYear)-1}`}
          value={totals.revenue}    
          color="emerald" 
          icon={<ArrowUpRight />}   
          sub={`${filtered.filter(r=>r._type==='revenue').length} Received`}
        />
        <SummaryCard 
          label="Pending Dues"    
          year={`${selectedYear}-${Number(selectedYear)-1}`}
          value={totals.pending}    
          color="amber"   
          icon={<Clock />}          
          sub={`${filtered.filter(r=>r._type==='pending').length} Pending`}
        />
        <SummaryCard 
          label="Total Expense"   
          year={`${selectedYear}-${Number(selectedYear)-1}`}
          value={totals.expense}    
          color="rose"    
          icon={<ArrowDownRight />} 
          sub={`${filtered.filter(r=>r._type==='expense').length} Records`}
        />
        <SummaryCard 
          label="Shop Repairs" 
          year={`${selectedYear}-${Number(selectedYear)-1}`}
          value={totals.shopRepair} 
          color="orange"  
          icon={<Store />}         
          sub={`${filtered.filter(r=>r._type==='shop_expense').length} Repair Logs`}
        />
      </div>

      {/* ── Filters panel ─────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-slate-800/20 border border-slate-700/50 rounded-[24px] p-6 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Type */}
            <div>
              <label className="block text-[12px] font-black text-slate-500 mb-2 uppercase tracking-widest">Type</label>
              <div className="flex flex-wrap gap-2">
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/30'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-black text-slate-500 mb-2 uppercase tracking-widest">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none font-bold appearance-none cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[12px] font-black text-slate-500 mb-2 uppercase tracking-widest">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none font-bold cursor-pointer"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[12px] font-black text-slate-500 mb-2 uppercase tracking-widest">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none font-bold cursor-pointer"
              />
            </div>
          </div>

          {/* Active filter tags */}
          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-slate-700/40">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Active:</span>
              {typeFilter !== 'All'     && <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[9px] font-black uppercase">{typeFilter}</span>}
              {categoryFilter !== 'All' && <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-[9px] font-black uppercase">{categoryFilter}</span>}
              {dateFrom  && <span className="px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-[9px] font-black uppercase">From: {dateFrom}</span>}
              {dateTo    && <span className="px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-[9px] font-black uppercase">To: {dateTo}</span>}
              {search    && <span className="px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-[9px] font-black uppercase">"{search}"</span>}
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase hover:bg-rose-500/20 transition-all flex items-center gap-1"
              >
                <X size={10} /> Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="flex-1 bg-slate-800/20 border border-slate-700/50 rounded-[24px] overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto no-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0f172a] z-10">
              <tr className="border-b border-slate-700/50">
                <th
                  onClick={() => toggleSort('date')}
                  className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest cursor-pointer hover:text-white transition-colors whitespace-nowrap select-none italic"
                >
                  Date {sortField === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest italic">Type</th>
                <th className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest italic">Category</th>
                <th className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest italic">Description</th>
                <th className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest italic">Property / Shop</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="p-5 text-[11px] font-black text-white/90 uppercase tracking-widest text-right cursor-pointer hover:text-white transition-colors select-none italic"
                >
                  Amount {sortField === 'amount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <FileText size={48} className="text-slate-500" />
                      <p className="text-lg font-black uppercase tracking-widest text-slate-500">No Records Found</p>
                      <p className="text-sm text-slate-600 font-bold">Try adjusting your filters or date range.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(entry => (
                <tr key={entry.id} className="group hover:bg-slate-700/20 transition-all duration-200">
                  <td className="p-5 whitespace-nowrap">
                    <p className="text-white font-black italic uppercase tracking-widest text-xs">{entry._date || '—'}</p>
                  </td>
                  <td className="p-5">
                    <TypeBadge type={entry._type} />
                  </td>
                  <td className="p-5">
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">{entry._category}</span>
                  </td>
                  <td className="p-5 max-w-[200px]">
                    <p className="text-white font-bold text-[15px] leading-snug truncate italic">{entry._description}</p>
                  </td>
                  <td className="p-5">
                    {entry._asset && entry._asset !== '—'
                      ? <span className="text-[11px] font-black text-white/70 uppercase tracking-widest italic">{entry._asset}</span>
                      : <span className="text-[11px] text-slate-700 font-bold">—</span>
                    }
                  </td>
                  <td className="p-5 text-right whitespace-nowrap">
                    <p className={`text-lg font-black italic ${AMOUNT_COLORS[entry._type]}`}>
                      {['revenue', 'pending'].includes(entry._type) ? '+' : '−'} Rs. {Number(entry.amount).toLocaleString()}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-700/50 px-6 py-4 bg-[#0f172a] flex flex-wrap items-center justify-between gap-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{filtered.length} records</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">In:</span>
                <span className="text-sm font-black italic text-emerald-400">Rs. {(totals.revenue + totals.pending).toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Out:</span>
                <span className="text-sm font-black italic text-rose-400">Rs. {(totals.expense + totals.shopRepair).toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Net:</span>
                <span className={`text-sm font-black italic ${net >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  Rs. {net.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

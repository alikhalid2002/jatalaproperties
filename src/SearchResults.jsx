import React from 'react';
import { UserCircle, Store } from 'lucide-react';

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

export default SearchResults;

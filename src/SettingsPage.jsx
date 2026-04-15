import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, UserPlus, Store, Trash2, Loader2, Bell, AlertTriangle, 
  Info, Check, RefreshCw, FileJson, Download, Calendar as CalendarIcon, Settings 
} from 'lucide-react';
import { useFarmers } from './useFarmers';
import { useReminders } from './useReminders';
import { useSoldProperties } from './useSoldProperties';
import { db, getDataPath } from './firebase';
import { collection, addDoc, doc, deleteDoc, onSnapshot, getDocs, writeBatch, Timestamp, query, where, getFirestore } from 'firebase/firestore';

const SettingsPage = ({ entries = [], setTransactions, selectedYear, isAdmin, expandedSection, setExpandedSection }) => {
  const { farmers, deleteFarmer, addNewFarmer, purgeAllFarmers } = useFarmers();
  const { reminders, addReminder, deleteReminder, markAsRead } = useReminders();
  const { properties: soldProperties, addProperty, deleteProperty, updateProperty } = useSoldProperties();
  const [isSaving, setIsSaving] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ nameUr: '', nameEn: '', landSize: '', landUnit: 'Acres' });
  const [shops, setShops] = useState([]);
  const [newShop, setNewShop] = useState({ tenant: '', name: '', rent: '', area: '' });
  const [newSoldProperty, setNewSoldProperty] = useState({ nameEn: '', buyerName: '', totalPrice: '' });
  const [editingSoldPropertyId, setEditingSoldPropertyId] = useState(null);
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
  
  const handleAddSoldProperty = async (e) => {
    e.preventDefault();
    if (!newSoldProperty.nameEn || !newSoldProperty.buyerName || !newSoldProperty.totalPrice) return;
    setIsSaving(true);
    try { 
      if (editingSoldPropertyId) {
        await updateProperty(editingSoldPropertyId, {
          ...newSoldProperty,
          totalPrice: Number(newSoldProperty.totalPrice)
        });
        setEditingSoldPropertyId(null);
        alert("Property Updated!");
      } else {
        await addProperty({ ...newSoldProperty, totalPrice: Number(newSoldProperty.totalPrice) }); 
        alert("Property Registered!"); 
      }
      setNewSoldProperty({ nameEn: '', buyerName: '', totalPrice: '' }); 
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteShop = async (id) => { 
    if (!window.confirm('Delete this shop permanently?')) return;
    
    // Optimistic UI Update
    const prevShops = [...shops];
    setShops(shops.filter(s => s.id !== id));
    
    try {
      console.log("Attempting to delete shop with ID:", id);
      await deleteDoc(doc(db, getDataPath('shops'), id));
      console.log("Successfully deleted shop:", id);
    } catch (err) {
      console.error("Delete Shop Error:", err);
      alert(`Delete failed: ${err.message}`);
      setShops(prevShops); // Rollback
    }
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
          data[col]?.forEach(item => { if (item.id) batch.set(doc(db, getDataPath(col), item.id), item, { merge: true }); });
        }
        await batch.commit(); alert("Restored!");
      } catch (err) { alert("Restore Failed"); } finally { setIsRestoring(false); }
    };
    reader.readAsText(file);
  };
  
  const handleNukeExpenses = async () => {
    console.log('NUKE BUTTON CLICKED');
    
    // Direct Database Initialization as requested
    const db = getFirestore();
    
    const itemsToNuke = entries.filter(t => 
      (t.type === 'Expense' || t.type === 'expense') && 
      String(t.date).includes('2026')
    );
    
    console.log('Items identified to nuke:', itemsToNuke.length);
    
    if (itemsToNuke.length === 0) {
      alert("No 2026 expenses found in state.");
      return;
    }

    if (!window.confirm("WARNING: Delete all expenses for this year?")) return;

    for (const item of itemsToNuke) {
      try {
        await deleteDoc(doc(db, 'transactions', item.id));
        console.log('Successfully deleted:', item.id);
      } catch (e) {
        console.error('DELETE ERROR:', e.message);
        alert('Firebase Error: ' + e.message);
        return;
      }
    }
    
    alert('UI Purged: ' + itemsToNuke.length + ' expenses removed. Reloading...');
    window.location.reload(); // Emergency UI Reset
  };

  return (
    <div className="flex-1 flex flex-col gap-8 pb-32 overflow-y-auto no-scrollbar">
      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl overflow-hidden">
        <button onClick={() => setExpandedSection(expandedSection === 'members' ? null : 'members')} className="w-full flex justify-between p-8 font-black uppercase">Member Management <ChevronDown className={expandedSection === 'members' ? 'rotate-180' : ''} /></button>
        {expandedSection === 'members' && <div className="p-8 border-t border-slate-700/50 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <form onSubmit={handleAddMember} className="space-y-4">
             <input value={newFarmer.nameEn} onChange={e => setNewFarmer({...newFarmer, nameEn: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl font-black uppercase text-xs" placeholder="Full Name (English)" />
             <div className="flex gap-2">
               <input type="number" step="any" value={newFarmer.landSize} onChange={e => setNewFarmer({...newFarmer, landSize: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 p-4 rounded-xl font-black text-xs" placeholder="Size" />
               <select value={newFarmer.landUnit} onChange={e => setNewFarmer({...newFarmer, landUnit: e.target.value})} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-black text-[10px] uppercase text-slate-400">
                 <option value="Acres">Acres</option>
                 <option value="Kanal">Kanal</option>
               </select>
             </div>
             <button className="w-full bg-indigo-600 py-4 rounded-xl font-black italic uppercase tracking-widest text-xs">Register Member</button>
           </form>
            <div className="max-h-[400px] overflow-y-auto no-scrollbar divide-y divide-slate-800/50">
              {farmers.length > 0 ? (
                farmers.map(f => (
                  <div key={f.id} className="py-2.5 flex justify-between items-center group/item hover:bg-slate-800/10 px-2 -mx-2 rounded-xl transition-colors">
                    <div className="flex flex-col">
                      <div className="font-black text-xs uppercase text-white tracking-wider">{f.nameEn || f.nameUr}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">{f.landSize} {f.landUnit}</div>
                    </div>
                    <button 
                      onClick={() => deleteFarmer(f.id)}
                      className="p-3 bg-slate-900 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-xl transition-all active:scale-90"
                      title="Remove Member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest">
                  No Members Found
                </div>
              )}
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
        <button onClick={() => setExpandedSection(expandedSection === 'sold' ? null : 'sold')} className="w-full flex justify-between p-8 font-black uppercase">Sold Properties <ChevronDown className={expandedSection === 'sold' ? 'rotate-180' : ''} /></button>
        {expandedSection === 'sold' && <div className="p-8 border-t border-slate-700/50">
           <form onSubmit={handleAddSoldProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             <input value={newSoldProperty.nameEn} onChange={e => setNewSoldProperty({...newSoldProperty, nameEn: e.target.value.toUpperCase()})} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-black uppercase text-xs" placeholder="Property Name" />
             <input value={newSoldProperty.buyerName} onChange={e => setNewSoldProperty({...newSoldProperty, buyerName: e.target.value.toUpperCase()})} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-black uppercase text-xs" placeholder="Buyer Name" />
             <input type="number" value={newSoldProperty.totalPrice} onChange={e => setNewSoldProperty({...newSoldProperty, totalPrice: e.target.value})} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-black text-xs" placeholder="Total Price (Rs.)" />
             <div className="flex gap-2 md:col-span-1">
               <button className="flex-1 bg-amber-600 py-4 rounded-xl font-black uppercase text-xs">
                 {editingSoldPropertyId ? 'Update Property' : 'Register Sale'}
               </button>
               {editingSoldPropertyId && (
                 <button type="button" onClick={() => { setEditingSoldPropertyId(null); setNewSoldProperty({ nameEn: '', buyerName: '', totalPrice: '' }); }} className="px-6 bg-slate-700 py-4 rounded-xl font-black uppercase text-xs">Cancel</button>
               )}
             </div>
           </form>
           
           <div className="max-h-[400px] overflow-y-auto no-scrollbar divide-y divide-slate-800/50">
             {soldProperties.length > 0 ? (
               soldProperties.map(p => (
                 <div key={p.id} className="py-2.5 flex justify-between items-center group/item hover:bg-slate-800/10 px-2 -mx-2 rounded-xl transition-colors">
                   <div className="flex flex-col">
                     <div className="font-black text-xs uppercase text-white tracking-wider">{p.nameEn || p.nameUr}</div>
                     <div className="text-[9px] font-bold text-slate-500 uppercase">Buyer: {p.buyerName} | Rs. {Number(p.totalPrice || 0).toLocaleString()}</div>
                   </div>
                   <div className="flex gap-2">
                    <button 
                       onClick={() => {
                         setEditingSoldPropertyId(p.id);
                         setNewSoldProperty({ nameEn: p.nameEn || p.nameUr || '', buyerName: p.buyerName || '', totalPrice: p.totalPrice || '' });
                         setExpandedSection('sold'); // Ensure same section is open
                         window.scrollTo({ top: 0, behavior: 'smooth' });
                       }}
                       className="p-3 bg-slate-900 hover:bg-indigo-500/20 text-slate-600 hover:text-indigo-400 rounded-xl transition-all active:scale-90"
                       title="Edit Property"
                     >
                       <Settings size={16} />
                     </button>
                     <button 
                       onClick={() => { if(window.confirm('Delete this sold property?')) deleteProperty(p.id) }}
                       className="p-3 bg-slate-900 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-xl transition-all active:scale-90"
                       title="Remove Property"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))
             ) : (
               <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest">
                 No Sold Properties Found
               </div>
             )}
           </div>
        </div>}
      </section>

      <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl overflow-hidden">
        <button onClick={() => setIsBackupOpen(!isBackupOpen)} className="w-full flex justify-between p-8 font-black uppercase">System Tools <ChevronDown/></button>
        {isBackupOpen && (
          <div className="p-4 lg:p-8 border-t border-slate-700/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <button 
              onClick={handleDownloadExcel} 
              className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl lg:rounded-[32px] font-black uppercase text-[10px] lg:text-[11px] text-emerald-400 border border-slate-700/50 hover:bg-slate-800 transition-all text-center leading-tight gap-2"
            >
              Excel Export
            </button>
            <button 
              onClick={handleBackup} 
              className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl lg:rounded-[32px] font-black uppercase text-[10px] lg:text-[11px] text-indigo-400 border border-slate-700/50 hover:bg-slate-800 transition-all text-center leading-tight gap-2"
            >
              Database Backup
            </button>
            <label className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl lg:rounded-[32px] font-black uppercase text-[10px] lg:text-[11px] text-orange-400 border border-slate-700/50 hover:bg-slate-800 transition-all cursor-pointer text-center leading-tight gap-2">
              Restore Data 
              <input type="file" className="hidden" onChange={handleRestore} />
            </label>
            <button 
              onClick={() => {
                if (window.confirm("Delete all local data and refresh? This fixes stuck names.")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }} 
              className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl lg:rounded-[32px] font-black uppercase text-[10px] lg:text-[11px] text-slate-400 border border-slate-700/50 hover:bg-slate-800 transition-all text-center leading-tight gap-2"
            >
              Wipe Mobile Cache
            </button>
            <button 
              onClick={handleNukeExpenses}
              className="flex flex-col items-center justify-center p-6 bg-rose-500/10 rounded-2xl lg:rounded-[32px] font-black uppercase text-[10px] lg:text-[11px] text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 transition-all text-center leading-tight gap-2"
            >
              <Trash2 size={13} className="mb-1" />
              NUKE {selectedYear} EXPENSES
            </button>
            <button 
              onClick={purgeAllFarmers}
              className="col-span-full mt-4 flex items-center justify-center p-8 bg-rose-600/20 rounded-2xl lg:rounded-[32px] font-black uppercase text-xs text-rose-500 border-2 border-dashed border-rose-500/50 hover:bg-rose-600 hover:text-white transition-all text-center gap-4 group"
            >
              <Trash2 size={24} className="group-hover:animate-bounce" />
              NUKE ALL MEMBERS (Permanent Delete)
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;

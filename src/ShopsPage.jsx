import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, Receipt, Plus, History, 
  ArrowUpRight, ArrowDownRight, User, 
  Calendar, Wrench, X, CreditCard, Save, 
  CheckCircle, Trash2, Edit3, Clock, Shield, FileText, Upload, ImageIcon, Loader2
} from 'lucide-react';
import { db, storage, getDataPath } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { transliterateToUrdu } from './urduTransliterator';

const FinanceCard = ({ labelUr, year, value, color, icon }) => (
  <div className="bg-slate-800/40 p-2 md:p-6 rounded-lg md:rounded-[32px] border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col items-center justify-center w-full min-h-[100px] md:min-h-0 relative overflow-hidden group shadow-lg">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 blur-[80px] opacity-10`}></div>
    
    <div className={`mb-2 p-2 md:p-4 bg-${color}-500/10 text-${color}-400 rounded-lg md:rounded-2xl transition-transform group-hover:scale-110 relative z-10`}>
      {React.cloneElement(icon, { size: 18 })}
    </div>

    <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full px-0.5">
      <span className={`text-${color}-400 text-[10px] md:text-sm font-black font-urdu leading-tight whitespace-nowrap overflow-hidden w-full drop-shadow-[0_0_8px_rgba(var(--tw-shadow-color),0.5)]`} style={{ '--tw-shadow-color': color === 'emerald' ? '16,185,129' : color === 'indigo' ? '99,102,241' : color === 'orange' ? '249,115,22' : '244,63,94' }}>{labelUr}</span>
      <span className={`text-${color}-400 opacity-80 text-[8px] md:text-xs font-black font-urdu text-center w-full`}>{year}</span>
      <p className="text-[11px] md:text-2xl font-bold tracking-tighter whitespace-nowrap overflow-hidden text-white mt-1 w-full italic drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">Rs. {value?.toLocaleString()}</p>
    </div>
  </div>
);

const ShopsPage = ({ isAdmin, selectedYear }) => {
  const [shops, setShops] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showEntryForm, setShowEntryForm] = useState(null); 
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryType, setEntryType] = useState('Rent');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ tenant: '', area: '', rent: '' });
  const [editingTransId, setEditingTransId] = useState(null);
  const [editTransData, setEditTransData] = useState({ amount: '', date: '', type: 'Rent' });
  const [isUploadingDoc, setIsUploadingDoc] = useState({ idCard: false, agreement: false });
  const [previewImage, setPreviewImage] = useState(null);

  const shopStats = useMemo(() => {
    const activeYear = (selectedYear || new Date().getFullYear()).toString();
    const totalExpected = shops.reduce((sum, shop) => sum + (Number(shop.rent) || 0) * 12, 0);
    
    const rentPaid = transactions.filter(t => {
      if (t.type !== 'Rent') return false;
      let itemYear = null;
      if (t.date) itemYear = t.date.split('-')[0];
      else if (t.createdAt?.seconds) itemYear = new Date(t.createdAt.seconds * 1000).getFullYear().toString();
      return itemYear === activeYear;
    }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalExpenses = transactions.filter(t => {
      if (t.type !== 'Expense') return false;
      let itemYear = null;
      if (t.date) itemYear = t.date.split('-')[0];
      else if (t.createdAt?.seconds) itemYear = new Date(t.createdAt.seconds * 1000).getFullYear().toString();
      return itemYear === activeYear;
    }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      expected: totalExpected,
      remaining: totalExpected - rentPaid,
      expenses: totalExpenses,
      year: activeYear
    };
  }, [shops, transactions, selectedYear]);

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, getDataPath('shops')), (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShops(shopsData);
    });

    const unsubTrans = onSnapshot(collection(db, getDataPath('shop_transactions')), (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(transData);
    });

    return () => {
      unsubShops();
      unsubTrans();
    };
  }, []);

  const withTimeout = (promise, message = "Connection Timeout. Please check your internet or Firebase config.") => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))
    ]);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedShop || !entryAmount) return;

    setIsSaving(true);
    try {
      const amountNum = parseFloat(entryAmount);
      // Determine transaction type: if entryType is Rent/Bank it's 'Rent', else 'Expense'
      const transType = entryType === 'Expense' ? 'Expense' : 'Rent';
      const paymentMethod = entryType === 'Expense' ? 'Cash' : entryType;

      const newTransaction = {
        shopId: selectedShop.id,
        shopName: selectedShop.tenant, // Capturing for global Expenses report
        type: transType,
        method: paymentMethod, // Store specific method for later use
        amount: amountNum,
        note: entryNote || (transType === 'Rent' ? 'کرایہ وصولی' : 'مرمت/خرچہ'),
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };

      await withTimeout(addDoc(collection(db, getDataPath('shop_transactions')), newTransaction));

      if (showEntryForm === 'Rent') {
        await withTimeout(updateDoc(doc(db, getDataPath('shops'), selectedShop.id), { status: 'Paid' }));
      }

      setEntryAmount('');
      setEntryNote('');
      setShowEntryForm(null);
    } catch (error) {
      console.error("Save Transaction Error:", error);
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateShop = async () => {
    if (!selectedShop) return;
    setIsSaving(true);
    try {
      await withTimeout(updateDoc(doc(db, getDataPath('shops'), selectedShop.id), {
        tenant: editData.tenant,
        area: editData.area,
        rent: Number(editData.rent)
      }));
      setIsEditing(false);
    } catch (error) {
      console.error("Update Shop Error:", error);
      alert(`Update failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (transId) => {
    if (!window.confirm("Delete this transaction permanently?")) return;
    try {
      await withTimeout(deleteDoc(doc(db, getDataPath('shop_transactions'), transId)));
    } catch (error) {
      console.error("Delete Transaction Error:", error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const handleUpdateTransaction = async (transId) => {
    try {
      await withTimeout(updateDoc(doc(db, getDataPath('shop_transactions'), transId), {
        amount: Number(editTransData.amount),
        date: editTransData.date,
        type: editTransData.type
      }));
      setEditingTransId(null);
    } catch (error) {
      console.error("Update Transaction Error:", error);
      alert(`Update failed: ${error.message}`);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      setEditData({
        tenant: selectedShop.tenant || '',
        area: selectedShop.area || '',
        rent: selectedShop.rent || ''
      });
      setIsEditing(false);
      setPreviewImage(null);
    }
  }, [selectedShop]);

  const handleDocUpload = async (docType, file) => {
    if (!file || !selectedShop) return;
    setIsUploadingDoc(prev => ({ ...prev, [docType === 'idCardUrl' ? 'idCard' : 'agreement']: true }));
    try {
      const storageRef = ref(storage, `shops/${selectedShop.id}/${docType}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytes(storageRef, file);
      const snapshot = await withTimeout(uploadTask, "Document upload timed out.");
      const url = await getDownloadURL(snapshot.ref);

      const shopRef = doc(db, getDataPath('shops'), selectedShop.id);
      await withTimeout(updateDoc(shopRef, {
          [docType]: url
      }));

      alert(`${docType === 'idCardUrl' ? 'ID Card' : 'Agreement'} uploaded successfully!`);
    } catch (error) {
      console.error("Document Upload Error:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingDoc(prev => ({ ...prev, [docType === 'idCardUrl' ? 'idCard' : 'agreement']: false }));
    }
  };

  const getShopTransactions = (shopId) => {
    return transactions
      .filter(t => t.shopId === shopId)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  };

  const calculateTotalExpenses = (shopId) => {
    return transactions
      .filter(t => t.shopId === shopId && t.type === 'Expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  };

  const calculateAnnualProgress = (shop) => {
    if (!shop) return { paid: 0, total: 0, percent: 0 };
    const currentYear = new Date().getFullYear();
    const annualTotal = (Number(shop.rent) || 0) * 12;
    
    const annualPaid = transactions
      .filter(t => {
        if (t.shopId !== shop.id || t.type !== 'Rent') return false;
        
        // Check date string or createdAt timestamp
        let itemYear = null;
        if (t.date) itemYear = t.date.split('-')[0];
        else if (t.createdAt?.seconds) itemYear = new Date(t.createdAt.seconds * 1000).getFullYear().toString();
        
        return itemYear === currentYear.toString();
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    const percent = annualTotal > 0 ? Math.min(100, (annualPaid / annualTotal) * 100) : 0;
    return { paid: annualPaid, total: annualTotal, percent };
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32" dir="ltr">
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-3 gap-1 md:gap-4 mb-8 font-urdu px-1 w-full text-center">
        <FinanceCard 
          labelUr="دکانوں کی کل متوقع آمدنی"
          year={shopStats.year}
          value={shopStats.expected}
          color="emerald"
          icon={<ArrowUpRight />}
        />
        <FinanceCard 
          labelUr="باقی رقم"
          year={shopStats.year}
          value={shopStats.remaining}
          color="orange"
          icon={<Clock />}
        />
        <FinanceCard 
          labelUr="کل اخراجات"
          year={shopStats.year}
          value={shopStats.expenses}
          color="rose"
          icon={<ArrowDownRight />}
        />
      </div>

      {/* Shops Grid - Responsive 1/2/3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-24">
        {shops.map((shop) => (
          <div 
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className="group bg-slate-800/40 p-4 md:p-6 rounded-[32px] border border-slate-700/50 hover:bg-slate-800/60 transition-all duration-500 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-4 text-center relative overflow-hidden"
          >
            <div className="space-y-2 text-center w-full">
              <h3 className="text-xl lg:text-2xl font-black text-white font-urdu leading-none truncate">{shop.tenant}</h3>
              <div className="flex flex-wrap items-center justify-center gap-2">
                 <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border font-urdu ${
                    shop.status === 'Paid' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                 }`}>
                    {shop.status === 'Paid' ? 'ادا شدہ' : 'بقایا'}
                 </span>
                 <span className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-400 font-urdu">{shop.area}</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 pt-2 border-t border-slate-700/30 font-urdu mt-1 overflow-hidden">
              {(() => {
                const status = calculateAnnualProgress(shop);
                return (
                  <>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white opacity-95">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span>وصول: {(Number(status.paid) || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                        <span>باقی: {((Number(status.total) || 0) - (Number(status.paid) || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full bg-slate-900 border border-slate-700/50 rounded-full overflow-hidden flex shadow-inner group">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all duration-700 rounded-r-sm"
                        style={{ width: `${Number(status.percent) || 0}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-center">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-urdu">
                         کرایہ: {(Number(shop.rent) || 0).toLocaleString()}
                       </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {selectedShop && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-xl z-[100] flex items-end lg:items-center justify-center p-0 lg:p-10 animate-in fade-in duration-500">
          <div className="w-full max-w-4xl bg-[#0f172a] lg:bg-slate-900 border-t lg:border-x border-slate-800 lg:rounded-[32px] rounded-t-[32px] shadow-2xl relative flex flex-col h-[92vh] lg:h-auto lg:max-h-[85vh] overflow-hidden slide-in-from-bottom lg:slide-in-from-top">
            
            {/* Image Preview Overlay */}
            {previewImage && (
              <div 
                className="absolute inset-0 z-[150] bg-[#0f172a]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300"
                onClick={() => setPreviewImage(null)}
              >
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-rose-500 text-white rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
                <img src={previewImage} className="max-w-[90%] max-h-[80%] rounded-2xl object-contain shadow-2xl" />
              </div>
            )}
            
            {/* Header - Centered & Sleek */}
            <div className="p-10 border-b border-slate-800 bg-slate-900/40 relative flex flex-col items-center text-center">
              <div className="absolute top-6 right-6 flex items-center gap-3">
                 {isAdmin && (
                   isEditing ? (
                     <button onClick={handleUpdateShop} disabled={isSaving} className="p-3 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-2xl transition-all">
                       {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                     </button>
                   ) : (
                     <button onClick={() => setIsEditing(true)} className="p-3 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-2xl transition-all">
                       <Edit3 size={20} />
                     </button>
                   )
                 )}
                 <button onClick={() => setSelectedShop(null)} className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all group">
                   <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                 </button>
              </div>
              
              {/* Shop Identity - Always Visible */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-3xl lg:text-4xl font-black text-white font-urdu italic leading-none">{selectedShop.tenant}</h2>
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <p className="text-2xl font-black italic text-slate-300">{selectedShop.area || '12x15'}</p>
              </div>

              {isEditing && (
                <div className="flex flex-col gap-4 w-full max-w-md animate-in slide-in-from-top-4 pb-6 mt-4 border-t border-slate-700/30 pt-10">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Updating Information</p>
                   </div>
                  <input 
                    value={editData.tenant}
                    dir="rtl"
                    onChange={(e) => {
                      const val = e.target.value;
                      const isEnglish = /[a-zA-Z]/.test(val);
                      setEditData({...editData, tenant: isEnglish ? transliterateToUrdu(val) : val});
                    }}
                    className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-8 text-2xl font-urdu text-white text-center leading-[2.5] w-full"
                    placeholder="Type name (e.g. 'ali')"
                  />
                  <div className="flex gap-4">
                    <input 
                      value={editData.area}
                      dir="rtl"
                      onChange={(e) => setEditData({...editData, area: e.target.value})}
                      className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-black text-white text-center flex-1"
                      placeholder="Area (e.g. 10x12)"
                    />
                    <input 
                      type="number"
                      value={editData.rent}
                      dir="ltr"
                      onChange={(e) => setEditData({...editData, rent: e.target.value})}
                      className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-black text-white text-center flex-1"
                      placeholder="Monthly Rent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={`flex-1 overflow-y-auto no-scrollbar p-8 lg:p-12 ${isEditing ? 'space-y-0' : 'space-y-12'}`}>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-[32px] text-center space-y-4 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-center gap-2 text-indigo-400 opacity-60">
                       <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest font-urdu">کل واجبات</span>
                    </div>
                    <p className="text-2xl font-black italic text-white">Rs. {Number(selectedShop.rent || 0).toLocaleString()}</p>
                 </div>
                 <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-[32px] text-center space-y-4 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 opacity-60">
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest font-urdu">کل ادا رقم</span>
                    </div>
                    <p className="text-2xl font-black italic text-white">Rs. {getShopTransactions(selectedShop.id).filter(t => t.type === 'Rent').reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</p>
                 </div>
                 <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-[32px] text-center space-y-4 hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-center gap-2 text-orange-400 opacity-60">
                       <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest font-urdu">بقایا رقم</span>
                    </div>
                    <p className="text-2xl font-black italic text-white">Rs. {Math.max(0, Number(selectedShop.rent || 0) - getShopTransactions(selectedShop.id).filter(t => t.type === 'Rent').reduce((a, b) => a + Number(b.amount), 0)).toLocaleString()}</p>
                 </div>
              </div>


              {/* Document Vault for Shop Tenants */}
              <div className="bg-slate-900 border-y border-slate-800 p-8 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <Shield size={12} className="text-emerald-400/80" />
                   <h4 className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80 italic">Tenant Document Vault</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-3xl group">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 italic">
                          <User size={12}/> ID Copy
                        </p>
                        {selectedShop.idCardUrl && (
                          <button onClick={() => {
                            if (selectedShop.idCardUrl.toLowerCase().includes('.pdf') || selectedShop.idCardUrl.includes('/idCardUrl%2F')) {
                               window.open(selectedShop.idCardUrl, '_blank');
                            } else {
                               setPreviewImage(selectedShop.idCardUrl);
                            }
                          }} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all text-[7px] font-black uppercase tracking-widest">
                             View
                          </button>
                        )}
                      </div>
                      {isAdmin ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 hover:border-indigo-500/50 rounded-2xl p-2 transition-all cursor-pointer bg-slate-950/20 min-h-[70px]">
                           {isUploadingDoc.idCard ? (
                               <Loader2 size={18} className="animate-spin text-indigo-500"/>
                           ) : (
                             <>
                               <Upload size={14} className="text-slate-600 mb-1"/>
                               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Upload (PDF/IMG)</span>
                             </>
                           )}
                           <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocUpload('idCardUrl', e.target.files[0])}/>
                        </label>
                      ) : !selectedShop.idCardUrl && (
                        <div className="flex flex-col items-center justify-center border border-slate-700/30 rounded-2xl p-2 bg-slate-900/20 min-h-[70px] opacity-40">
                           <Shield size={14} className="text-slate-600 mb-1" />
                           <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 italic text-center">No Identity Card<br/>on record</p>
                        </div>
                      )}
                   </div>

                   <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-3xl group">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 italic">
                          <FileText size={12}/> Agreement
                        </p>
                        {selectedShop.agreementUrl && (
                          <button onClick={() => {
                            if (selectedShop.agreementUrl.toLowerCase().includes('.pdf') || selectedShop.agreementUrl.includes('/agreementUrl%2F')) {
                               window.open(selectedShop.agreementUrl, '_blank');
                            } else {
                               setPreviewImage(selectedShop.agreementUrl);
                            }
                          }} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all text-[7px] font-black uppercase tracking-widest">
                             View
                          </button>
                        )}
                      </div>
                      {isAdmin ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 hover:border-indigo-500/50 rounded-2xl p-2 transition-all cursor-pointer bg-slate-950/20 min-h-[70px]">
                          {isUploadingDoc.agreement ? (
                               <Loader2 size={18} className="animate-spin text-indigo-500"/>
                           ) : (
                             <>
                               <Upload size={14} className="text-slate-600 mb-1"/>
                               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Upload Legal</span>
                             </>
                           )}
                           <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocUpload('agreementUrl', e.target.files[0])}/>
                        </label>
                      ) : !selectedShop.agreementUrl && (
                        <div className="flex flex-col items-center justify-center border border-slate-700/30 rounded-2xl p-2 bg-slate-900/20 min-h-[70px] opacity-40">
                           <FileText size={14} className="text-slate-600 mb-1" />
                           <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 italic text-center">No Agreement<br/>on record</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {!isEditing && isAdmin && (
                <>
                  {/* Payment Form Area */}
                  <div className="space-y-8 animate-in fade-in duration-500">
                     <div className="flex items-center gap-3">
                        <CreditCard size={18} className="text-indigo-500"/>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Record New Payment</h4>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <div className="flex gap-4">
                              <button 
                                onClick={() => setEntryType('Rent')}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${entryType === 'Rent' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 grow scale-105' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'}`}
                              >Cash</button>
                              <button 
                                onClick={() => setEntryType('Bank')}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${entryType === 'Bank' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 grow scale-105' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 border border-slate-700/50'}`}
                              >Bank</button>
                              <button 
                                onClick={() => setEntryType('Expense')}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${entryType === 'Expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 grow scale-105' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 border border-slate-700/50'}`}
                              >Expense</button>
                           </div>
                           <div className="relative group">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-500 transition-colors">
                                 <CreditCard size={20}/>
                              </div>
                              <input 
                                type="number" 
                                required 
                                placeholder="Enter amount..."
                                value={entryAmount}
                                onChange={(e) => setEntryAmount(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 p-6 pl-16 rounded-3xl font-black italic text-xl text-white outline-none focus:border-indigo-500 transition-all" 
                              />
                           </div>
                        </div>

                        <div className="relative">
                           <div className="h-full border-2 border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center p-8 bg-slate-900/20 group hover:border-indigo-500/50 transition-all cursor-pointer">
                              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                 <Plus className="text-slate-500 group-hover:text-indigo-500" size={24}/>
                              </div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-white mb-1">Choose File</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">PNG, JPEG support</p>
                           </div>
                        </div>
                     </div>
                  </div>
                </>
              )}

              {/* History List - Always Visible */}
              <div className="space-y-8 pb-10 animate-in fade-in duration-700">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 italic">Payment History</h4>
                 <div className="space-y-4">
                    {getShopTransactions(selectedShop.id).length > 0 ? getShopTransactions(selectedShop.id).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900/30 p-6 rounded-[32px] border border-slate-800/50 hover:bg-slate-900 transition-colors group">
                        <div className="flex items-center gap-6 grow">
                           {editingTransId === item.id ? (
                             <input 
                               type="date"
                               disabled={!isAdmin}
                               onChange={(e) => setEditTransData({...editTransData, date: e.target.value})}
                               className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-transparent border-b border-indigo-500 outline-none cursor-pointer disabled:opacity-50"
                             />
                           ) : (
                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-40">{item.date}</div>
                           )}
                           
                           <div className="grow">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Amount & Receipt</p>
                              {editingTransId === item.id ? (
                                <input 
                                  type="number"
                                  disabled={!isAdmin}
                                  value={editTransData.amount}
                                  onChange={(e) => setEditTransData({...editTransData, amount: e.target.value})}
                                  className="bg-slate-800 border-b border-indigo-500 text-xl font-black italic text-white leading-none outline-none w-32 disabled:opacity-50"
                                />
                              ) : (
                                <p className="text-xl font-black italic text-white leading-none">Rs. {Number(item.amount).toLocaleString()}</p>
                              )}
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Method</p>
                              {editingTransId === item.id ? (
                                <select 
                                  disabled={!isAdmin}
                                  value={editTransData.type}
                                  onChange={(e) => setEditTransData({...editTransData, type: e.target.value})}
                                  className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-slate-800 border-none outline-none appearance-none cursor-pointer disabled:opacity-50"
                                >
                                  <option value="Rent">Cash</option>
                                  <option value="Bank">Bank</option>
                                </select>
                              ) : (
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{item.type === 'Bank' ? 'Bank' : 'Cash'}</p>
                              )}
                           </div>
                           <div className="flex items-center gap-2">
                              {editingTransId === item.id ? (
                                <>
                                  <button 
                                    onClick={() => handleUpdateTransaction(item.id)}
                                    className="p-3 bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                  >
                                    <Save size={14}/>
                                  </button>
                                  <button 
                                    onClick={() => setEditingTransId(null)}
                                    className="p-3 bg-slate-800 text-slate-400 rounded-xl"
                                  >
                                    <X size={14}/>
                                  </button>
                                </>
                              ) : isEditing ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingTransId(item.id);
                                      setEditTransData({ 
                                        amount: item.amount,
                                        date: item.date || new Date().toISOString().split('T')[0],
                                        type: item.type || 'Rent'
                                      });
                                    }}
                                    className="p-3 bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all"
                                  >
                                    <Edit3 size={14}/>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTransaction(item.id)}
                                    className="p-3 bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14}/>
                                  </button>
                                </>
                              ) : null}
                           </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-12 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No History Records Found</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 lg:p-10 border-t border-slate-800 bg-slate-950/50 backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-6">
               <button 
                onClick={() => setSelectedShop(null)}
                className={`py-5 px-8 rounded-3xl border border-slate-700 font-urdu text-[16px] text-slate-400 hover:bg-slate-800 hover:text-white transition-all order-2 ${isAdmin ? 'md:order-1' : ''}`}
              >بند کریں</button>
              {isAdmin && (
                <button 
                  onClick={() => isEditing ? handleUpdateShop() : setIsEditing(true)}
                  className={`py-5 px-8 rounded-3xl border font-urdu text-[16px] transition-all order-3 md:order-2 ${isEditing ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  {isSaving && isEditing ? <Loader2 className="animate-spin" size={18}/> : isEditing ? 'محفوظ کریں' : 'تبدیل کریں'}
                </button>
              )}
              {isAdmin && (
                <button 
                  disabled={isSaving || isEditing}
                  onClick={handleSaveTransaction}
                  className={`py-5 px-8 rounded-3xl font-urdu text-[16px] text-white shadow-xl transition-all flex items-center justify-center gap-3 order-1 md:order-3 ${isEditing ? 'opacity-20 cursor-not-allowed grayscale' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-indigo-600/30 hover:scale-[1.02] active:scale-95'}`}
                >
                  {isSaving && !isEditing ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> کرایہ درج کریں</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopsPage;

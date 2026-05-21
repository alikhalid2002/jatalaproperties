import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, Receipt, Plus, History, 
  ArrowUpRight, ArrowDownRight, User, 
  Calendar, Wrench, X, CreditCard, Save, 
  CheckCircle, Trash2, Edit3, Clock, Shield, FileText, Upload, ImageIcon, Loader2
} from 'lucide-react';
import { db, storage, auth, getDataPath } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { transliterateToEnglish } from './urduTransliterator';

const ShopsPage = ({ isAdmin, selectedYear = new Date().getFullYear().toString() }) => {
  const [shops, setShops] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showEntryForm, setShowEntryForm] = useState(null); 
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryType, setEntryType] = useState('Cash');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ tenant: '', area: '', rent: '' });
  const [editingTransId, setEditingTransId] = useState(null);
  const [editTransData, setEditTransData] = useState({ amount: '', date: '', type: 'Rent' });
  const [isUploadingDoc, setIsUploadingDoc] = useState({ idCard: false, agreement: false });
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ idCard: 0, agreement: 0, receipt: 0 });
  const [entryFile, setEntryFile] = useState(null);

  const shopStats = useMemo(() => {
    const activeYear = (selectedYear || new Date().getFullYear()).toString();
    const totalExpected = shops.reduce((sum, shop) => sum + (Number(shop.rent) || 0) * 12, 0);
    
    const rentPaid = transactions.filter(t => {
      if (t.type !== 'Rent') return false;
      let itemYear = t.date ? t.date.split('-')[0] : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).getFullYear().toString() : null);
      return itemYear === activeYear;
    }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalExpenses = transactions.filter(t => {
      if (t.type !== 'Expense') return false;
      let itemYear = t.date ? t.date.split('-')[0] : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).getFullYear().toString() : null);
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

  const calculateAnnualProgress = (shop) => {
    if (!shop) return { paid: 0, total: 0, percent: 0 };
    const currentActiveYear = (selectedYear || new Date().getFullYear()).toString();
    const annualTotal = (Number(shop.rent) || 0) * 12;
    const annualPaid = transactions
      .filter(t => {
        if (t.shopId !== shop.id || t.type !== 'Rent') return false;
        let itemYear = t.date ? t.date.split('-')[0] : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).getFullYear().toString() : null);
        return itemYear === currentActiveYear;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const percent = annualTotal > 0 ? Math.min(100, (annualPaid / annualTotal) * 100) : 0;
    return { paid: annualPaid, total: annualTotal, percent };
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedShop || !entryAmount) return;
    setIsSaving(true);
    let receiptUrl = null;
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      if (entryFile) {
        await auth.authStateReady();
        const bucketPath = `gs://jatala-properties.firebasestorage.app/shop_receipts/${Date.now()}_${entryFile.name}`;
        const storageRef = ref(storage, bucketPath);
        const uploadTask = uploadBytesResumable(storageRef, entryFile);
        receiptUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress(prev => ({ ...prev, receipt: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) })),
            reject,
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });
      }
      const newTransaction = {
        shopId: selectedShop.id,
        shopName: selectedShop.tenant,
        type: entryType === 'Expense' ? 'Expense' : 'Rent',
        method: entryType === 'Expense' ? 'Cash' : entryType,
        amount: parseFloat(entryAmount),
        note: entryNote || (entryType === 'Expense' ? 'Repair/Expense' : 'Rent Collection'),
        receiptUrl,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, getDataPath('shop_transactions')), newTransaction);
      setEntryAmount(''); setEntryNote(''); setEntryFile(null); setUploadProgress(p => ({...p, receipt: 0})); setShowEntryForm(null);
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleUpdateShop = async () => {
    if (!selectedShop) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, getDataPath('shops'), selectedShop.id), {
        tenant: editData.tenant,
        area: editData.area,
        rent: Number(editData.rent)
      });
      setIsEditing(false);
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm("Delete?")) await deleteDoc(doc(db, getDataPath('shop_transactions'), id));
  };

  const handleDocUpload = async (docType, file) => {
    if (!file || !selectedShop) return;
    const progressKey = docType === 'idCardUrl' ? 'idCard' : 'agreement';
    setIsUploadingDoc(p => ({...p, [progressKey]: true}));
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const bucketPath = `gs://jatala-properties.firebasestorage.app/shops/${selectedShop.id}/${docType}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, bucketPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (s) => setUploadProgress(p => ({...p, [progressKey]: Math.round((s.bytesTransferred / s.totalBytes) * 100)})),
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await updateDoc(doc(db, getDataPath('shops'), selectedShop.id), { [docType]: url });
            resolve();
          }
        );
      });
    } catch (err) { alert(err.message); } finally { setIsUploadingDoc(p => ({...p, [progressKey]: false})); setUploadProgress(p => ({...p, [progressKey]: 0})); }
  };

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 pb-32" dir="ltr">
      
      <div className="mt-8"></div>

      <div className="mt-4"></div>

      {/* Shops Grid - Redesigned to follow Sample Exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {shops.map((shop) => {
          const status = calculateAnnualProgress(shop);
          const balance = status.total - status.paid;
          return (
            <div 
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className="group bg-[#111827] p-8 rounded-[48px] transition-all duration-300 hover:bg-white/[0.02] active:scale-[0.98] cursor-copy flex flex-col gap-8 shadow-2xl"
            >
              <div className="flex justify-between items-start">
                 <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tight leading-tight pr-4">
                   {shop.tenantEn || transliterateToEnglish(shop.tenant)}
                 </h3>
                 <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${status.percent < 100 ? 'text-orange-500 bg-orange-500/10' : 'text-[#10B981] bg-[#10B981]/10'}`}>
                   {status.percent < 100 ? 'Pending' : 'Paid'}
                 </span>
              </div>

              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 tracking-widest">Monthly Rent</span>
                      <span className="text-2xl font-black text-white italic tracking-tighter">{(Number(shop.rent) || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 tracking-widest">Balance</span>
                      <span className="text-2xl font-black text-white italic tracking-tighter">
                         <span className="text-sm opacity-50 mr-1 not-italic">Rs.</span>
                         {(balance).toLocaleString()}
                      </span>
                    </div>
                 </div>

                 <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#10B981] transition-all duration-700"
                      style={{ width: `${status.percent}%` }}
                    ></div>
                 </div>

                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-neutral-500">Recv: <span className="text-white font-black italic ml-1">{(Number(status.paid) || 0).toLocaleString()}</span></span>
                    <span className="text-neutral-500">Total: <span className="text-[#10B981] font-black italic ml-1">{(Number(status.total) || 0).toLocaleString()}</span></span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedShop && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
           {/* Modal Simplified */}
           <div className="w-full max-w-2xl bg-[#0d1117] rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 md:p-12 relative overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] shadow-2xl">
              <button onClick={() => setSelectedShop(null)} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 sm:p-4 text-white hover:text-rose-500 transition-colors"><X size={24}/></button>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white italic uppercase mb-6 sm:mb-8 md:mb-10 tracking-tighter leading-tight pr-10">
                {selectedShop.tenantEn || selectedShop.tenant}
              </h2>
              <div className="overflow-y-auto pr-2 sm:pr-4 space-y-8 md:space-y-12 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white/5 p-5 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[32px] text-center flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2 tracking-widest">Annual Dues</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-black text-white italic tracking-tight">
                      <span className="text-xs sm:text-sm opacity-50 mr-1 not-italic font-normal">Rs.</span>
                      {(calculateAnnualProgress(selectedShop).total).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 p-5 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[32px] text-center border border-[#10B981]/10 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2 tracking-widest">Total Paid</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-black text-[#10B981] italic tracking-tight">
                      <span className="text-xs sm:text-sm opacity-50 mr-1 not-italic font-normal">Rs.</span>
                      {(calculateAnnualProgress(selectedShop).paid).toLocaleString()}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <form onSubmit={handleSaveTransaction} className="space-y-6">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-6"></div>
                    <div className="flex items-center justify-start gap-2 mb-4">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Record New Transaction</span>
                       <CreditCard size={12} className="text-indigo-400" />
                    </div>

                    <div className="bg-slate-800/20 border border-slate-700/30 p-5 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[36px] shadow-2xl relative overflow-hidden group space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                         {/* Left: Image Upload Zone */}
                         <div className="relative group/upload h-full">
                            <label className="flex flex-col items-center justify-center w-full h-40 bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 cursor-pointer rounded-[28px] p-4 transition-all group-active/upload:scale-95">
                               <div className="w-12 h-12 bg-slate-850 rounded-2xl flex items-center justify-center text-slate-500 group-hover/upload:text-indigo-400 transition-colors mb-3 relative overflow-hidden">
                                  {uploadProgress?.receipt > 0 ? (
                                    <div className="flex flex-col items-center">
                                      <Loader2 size={20} className="animate-spin text-indigo-500" />
                                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{uploadProgress.receipt}%</span>
                                    </div>
                                  ) : entryFile ? (
                                    <CheckCircle size={24} className="text-emerald-500" />
                                  ) : (
                                    <Plus size={24} strokeWidth={1.5} />
                                  )}
                               </div>
                               <div className="text-center">
                                  <p className="text-xs font-black text-slate-300">
                                    {uploadProgress?.receipt > 0 ? "Uploading Receipt..." : entryFile ? "Receipt Selected" : "Choose Receipt"}
                                  </p>
                                  <p className="text-[8px] text-slate-500 mt-1.5 uppercase tracking-widest italic">{entryFile ? entryFile.name : "PDF, PNG, JPEG SUPPORT"}</p>
                               </div>
                               <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setEntryFile(e.target.files[0])} />
                            </label>
                         </div>

                         <div className="space-y-4">
                            <div className="flex gap-2">
                               {[
                                 { key: 'Cash', label: 'Rent (Cash)' },
                                 { key: 'Bank', label: 'Rent (Bank)' },
                                 { key: 'Expense', label: 'Expense' }
                               ].map((opt) => (
                                 <button 
                                    type="button"
                                    key={opt.key}
                                    onClick={() => setEntryType(opt.key)}
                                    className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 ${entryType === opt.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                 >
                                   {opt.label}
                                 </button>
                               ))}
                            </div>

                            <div className="relative bg-slate-900/80 border border-slate-700 rounded-[24px] p-1.5 flex items-center shadow-inner group/input focus-within:border-indigo-500/50 transition-all font-sans">
                               <div className="w-10 h-10 flex items-center justify-center text-slate-500">
                                  <CreditCard size={20} />
                               </div>
                               <input 
                                  type="number"
                                  value={entryAmount}
                                  onChange={(e) => setEntryAmount(e.target.value)}
                                  placeholder="Amount (Rs.)..."
                                  className="bg-transparent flex-1 py-3 pl-4 text-left text-lg font-black text-white italic placeholder:text-slate-700 focus:outline-none"
                               />
                            </div>

                            <div className="relative bg-slate-900/80 border border-slate-700 rounded-[24px] p-1.5 flex items-center shadow-inner group/input focus-within:border-indigo-500/50 transition-all font-sans">
                               <input 
                                  type="text"
                                  value={entryNote}
                                  onChange={(e) => setEntryNote(e.target.value)}
                                  placeholder="Optional note..."
                                  className="bg-transparent flex-1 py-2 pl-4 text-xs font-bold text-white placeholder:text-slate-700 focus:outline-none"
                               />
                            </div>
                         </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSaving || !entryAmount}
                        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={14} /> Record Shop Transaction</>}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-6">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Transaction History</p>
                  {transactions.filter(t => t.shopId === selectedShop.id).map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-white/3 p-6 rounded-[28px] border border-white/5">
                       <div>
                         <p className="text-lg font-black text-white italic">Rs. {t.amount.toLocaleString()}</p>
                         <p className="text-[9px] text-neutral-600 font-bold uppercase mt-1">{t.date}</p>
                       </div>
                       <div className="flex items-center gap-3">
                         {t.receiptUrl && (
                           <a 
                             href={t.receiptUrl} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"
                             title="View Receipt"
                           >
                             <ImageIcon size={16}/>
                           </a>
                         )}
                         {isAdmin && (
                           <button onClick={() => handleDeleteTransaction(t.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                             <Trash2 size={16}/>
                           </button>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const FinanceCard = ({ label, value, icon }) => (
  <div className="bg-[#111827] p-4 md:p-8 rounded-[32px] transition-all flex flex-col justify-center items-center text-center">
    <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-full flex items-center justify-center mb-6 text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.1)] border border-white/5">
      {icon}
    </div>
    <span className="text-neutral-500 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-4 leading-relaxed max-w-[100px]">{label}</span>
    <p className="text-sm md:text-2xl font-black italic text-white tracking-tighter uppercase">
      <span className="opacity-50 mr-1 not-italic text-[10px]">Rs.</span>
      {value?.toLocaleString()}
    </p>
  </div>
);

export default ShopsPage;

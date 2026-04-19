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
  const [entryType, setEntryType] = useState('Rent');
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

  const withTimeout = (promise, message = "Connection Timeout") => {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))]);
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
      
      {/* Financial Summary - Minimalist 3-Card Layout */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-12 px-1">
        <FinanceCard 
          label="EXPECTED SHOP REVENUE"
          value={shopStats.expected} 
          icon={<ArrowUpRight size={20} />}
        />
        <FinanceCard 
          label="REMAINING BALANCE"
          value={shopStats.remaining} 
          icon={<Clock size={20} />}
        />
        <FinanceCard 
          label="TOTAL SHOP EXPENSES"
          value={shopStats.expenses} 
          icon={<ArrowDownRight size={20} />}
        />
      </div>

      {/* Spacing adjusted: Banner removed as requested */}
      <div className="mt-4"></div>

      {/* Shops Grid - Flattened Minimalist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {shops.map((shop) => {
          const status = calculateAnnualProgress(shop);
          return (
            <div 
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className="group bg-[#111827] p-8 rounded-[32px] transition-all duration-300 hover:bg-white/[0.03] active:scale-[0.98] cursor-copy flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                 <h3 className="text-xl font-black text-white italic uppercase tracking-tight leading-tight">
                   {shop.tenantEn || transliterateToEnglish(shop.tenant)}
                 </h3>
                 <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${status.percent < 100 ? 'text-rose-500 bg-rose-500/10' : 'text-[#10B981] bg-[#10B981]/10'}`}>
                   {status.percent < 100 ? 'Pending' : 'Paid'}
                 </span>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <div>
                      <span className="text-lg font-black text-white italic">{shop.area}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Monthly Rent</span>
                      <span className="text-lg font-black text-white italic">Rs. {(Number(shop.rent) || 0).toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#10B981] transition-all duration-700"
                      style={{ width: `${status.percent}%` }}
                    ></div>
                 </div>

                 <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-neutral-500 uppercase tracking-widest">RECV: <span className="text-white font-black italic ml-1">{(Number(status.paid) || 0).toLocaleString()}</span></span>
                    <span className="text-[#10B981] uppercase tracking-widest">ANNUAL: <span className="font-black italic ml-1">{(Number(status.total) || 0).toLocaleString()}</span></span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           {/* Modal Simplified */}
           <div className="w-full max-w-2xl bg-[#0d1117] rounded-[40px] p-10 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => setSelectedShop(null)} className="absolute top-6 right-6 p-4 text-white hover:text-rose-500 transition-colors"><X size={24}/></button>
              <h2 className="text-3xl font-black text-white italic uppercase mb-8">{selectedShop.tenantEn || selectedShop.tenant}</h2>
              <div className="overflow-y-auto pr-4 space-y-10 custom-scrollbar">
                {/* Details & Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-6 rounded-3xl text-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Annual Rent</p>
                    <p className="text-2xl font-black text-white italic">Rs. {(calculateAnnualProgress(selectedShop).total).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl text-center">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Total Paid</p>
                    <p className="text-2xl font-black text-[#10B981] italic">Rs. {(calculateAnnualProgress(selectedShop).paid).toLocaleString()}</p>
                  </div>
                </div>
                {/* Simplified History */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Payment History</p>
                  {transactions.filter(t => t.shopId === selectedShop.id).map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                       <div>
                         <p className="text-sm font-black text-white">Rs. {t.amount.toLocaleString()}</p>
                         <p className="text-[9px] text-neutral-500 uppercase">{t.date}</p>
                       </div>
                       {isAdmin && <button onClick={() => handleDeleteTransaction(t.id)} className="text-rose-500/50 hover:text-rose-500"><Trash2 size={16}/></button>}
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

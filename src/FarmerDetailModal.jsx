import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, DollarSign, Map, Scale, Save, Calculator, ImageIcon, Upload, Loader2, ExternalLink, CheckCircle, AlertCircle, FileText, Shield, User, Receipt, CreditCard, Plus, Edit3, Trash2 } from 'lucide-react';
import { transliterateToUrdu } from './urduTransliterator';

const FarmerDetailModal = memo(({ farmer, isOpen, onClose, onRecordPayment, onUpdateFarmer, onUpdateHistory, onDeleteHistory, onUpdateDocuments, onDeleteFarmer, isAdmin }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ nameUr: '', nameEn: '', landSize: '', totalPayable: '', theka: '' });
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState({ idCard: false, agreement: false });

  useEffect(() => {
    if (isOpen && farmer) {
      setAmount('');
      setMethod('Cash');
      setFile(null);
      setIsEditing(false);
      setPreviewImage(null);
      setEditData({
        name: farmer.nameEn || farmer.nameUr || '',
        landSize: farmer.landSize || '',
        totalPayable: farmer.totalPayable || (Number(farmer.totalPaid) + Number(farmer.totalRemaining)) || '',
        theka: farmer.theka || 0
      });
    } else if (!isOpen) {
      // Clear data when closing to prevent leakage to the next farmer opened
      setEditData({ nameUr: '', nameEn: '', landSize: '', totalPayable: '', theka: '' });
      setIsEditing(false);
    }
  }, [isOpen, farmer]);

  if (!isOpen || !farmer) return null;

  const handleDownload = (imgUrl) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `Receipt_${farmer.nameEn}_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onRecordPayment(farmer.id, amount, file, method);
      onClose();
    } catch (error) {
      console.error("Save Payment Error:", error);
      // Note: alert is already handled by the recordPayment hook's timeout/try-catch
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateInfo = async () => {
    setIsSaving(true);
    try {
      await onUpdateFarmer(farmer.id, {
        nameEn: editData.name,
        landSize: editData.landSize,
        totalPayable: Number(editData.totalPayable),
        theka: Number(editData.theka)
      });
      setIsEditing(false);
      setIsSaving(false);
    } catch (error) {
      console.error("Update failed:", error);
      setIsSaving(false);
      alert("Failed to update info.");
    }
  };

  const handleDocUpload = async (docType, file) => {
    if (!file) return;
    setIsUploadingDoc(prev => ({ ...prev, [docType === 'idCardUrl' ? 'idCard' : 'agreement']: true }));
    try {
      await onUpdateDocuments(farmer.id, docType, file);
      alert(`${docType === 'idCardUrl' ? 'ID Card' : 'Agreement'} uploaded successfully!`);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploadingDoc(prev => ({ ...prev, [docType === 'idCardUrl' ? 'idCard' : 'agreement']: false }));
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999] flex items-end lg:items-center justify-center p-0 lg:p-6 bg-[#0f172a]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border-t lg:border border-slate-700 w-full max-w-4xl lg:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl animate-slide-up lg:animate-zoom-in duration-500 flex flex-col relative h-[90vh] lg:h-auto lg:max-h-[85vh]">
        
        {/* Image Preview Popup (Lightbox) */}
        {previewImage && (
          <div 
            className="absolute inset-0 z-[200] bg-[#0f172a]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300"
            onClick={() => setPreviewImage(null)}
          >
            <div className="absolute top-6 right-6 flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(previewImage); }}
                className="p-3 bg-white/10 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-2 group border border-white/10"
              >
                <Upload size={18} className="rotate-180" /> <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">Download Proof</span>
              </button>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-3 bg-white/10 hover:bg-rose-500 text-white rounded-xl transition-all border border-white/10"
              >
                <X size={20} />
              </button>
            </div>
            
            <img 
              src={previewImage} 
              alt="Large Receipt Preview" 
              className="max-w-[90%] max-h-[80%] rounded-2xl object-contain shadow-[0_0_50px_rgba(79,70,229,0.2)] border border-white/5"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="mt-6 text-center text-white/40">
              <p className="text-[9px] items-center flex gap-2 font-black uppercase tracking-[0.2em] justify-center">
                Financial Receipt • {farmer.nameEn}
              </p>
            </div>
          </div>
        ) }

        {/* Header */}
        <div className="p-8 pb-4 flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-3">
             <h2 className="text-2xl lg:text-3xl font-black text-white italic uppercase tracking-tighter text-center leading-none">
               {isEditing ? (
                 <input 
                   value={editData.name}
                   onChange={(e) => setEditData({...editData, name: e.target.value})}
                   disabled={!isAdmin}
                   className="bg-transparent border-b border-indigo-500/50 text-center outline-none px-2 w-48 disabled:opacity-50"
                 />
               ) : (farmer.nameEn || farmer.nameUr)}
             </h2>
             <span className="text-slate-500 font-black">•</span>
             <span className="text-lg lg:text-xl font-black text-slate-300 tracking-tighter italic whitespace-nowrap">
               {isEditing ? (
                 <input 
                   type="number"
                   value={editData.landSize}
                   disabled={!isAdmin}
                   onChange={(e) => {
                     const newSize = e.target.value;
                     const currentTheka = Number(editData.theka) || 0;
                     setEditData(prev => ({
                       ...prev,
                       landSize: newSize,
                       totalPayable: Math.round(Number(newSize) * currentTheka).toString()
                     }));
                   }}
                   className="bg-transparent border-b border-indigo-500/50 text-center outline-none w-20 disabled:opacity-50"
                 />
               ) : farmer.landSize} Acres
             </span>
          </div>
          
          <div className="absolute top-6 right-6 flex items-center gap-3">
             {isAdmin && (
               isEditing ? (
                 <button onClick={handleUpdateInfo} disabled={isSaving} className="p-3 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-2xl transition-all">
                   {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                 </button>
               ) : (
                 <div className="flex gap-2">
                   <button 
                     onClick={async () => {
                       if (window.confirm(`Are you sure you want to delete ${farmer.nameEn || farmer.nameUr}?`)) {
                         await onDeleteFarmer(farmer.id);
                         onClose();
                       }
                     }} 
                     className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all"
                     title="Delete Member"
                   >
                     <Trash2 size={20} />
                   </button>
                   <button onClick={() => setIsEditing(true)} className="p-3 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-2xl transition-all">
                     <Edit3 size={20} />
                   </button>
                 </div>
               )
             )}
             <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl transition-all group">
               <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8">
          {/* Top Financial Stats - 3 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
             <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 text-center group hover:bg-slate-800 transition-all">
                <div className="flex items-center justify-center gap-2 mb-3 text-indigo-400">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                   <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400/80">Annual Dues</span>
                </div>
                {isEditing ? (
                  <input 
                    type="number"
                    value={editData.totalPayable}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setEditData(prev => {
                        const currentSize = Number(prev.landSize) || 0;
                        return {
                          ...prev,
                          totalPayable: newVal,
                          theka: currentSize > 0 ? Math.round(Number(newVal) / currentSize).toString() : prev.theka
                        };
                      });
                    }}
                    className="bg-transparent border-b border-indigo-500/50 text-center outline-none w-full text-white font-black italic text-xl disabled:opacity-50"
                  />
                ) : (
                  <p className="text-2xl font-black text-white italic">Rs. {Number(farmer.totalPayable)?.toLocaleString() || 0}</p>
                )}
             </div>
             <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 text-center group hover:bg-slate-800 transition-all">
                <div className="flex items-center justify-center gap-2 mb-3 text-emerald-400">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[11px] font-black uppercase tracking-widest">Total Paid</span>
                </div>
                <p className="text-2xl font-black text-white italic">Rs. {farmer.totalPaid?.toLocaleString() || 0}</p>
             </div>
             <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 text-center group hover:bg-slate-800 transition-all">
                <div className="flex items-center justify-center gap-2 mb-3 text-orange-400">
                   <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                   <span className="text-[11px] font-black uppercase tracking-widest">Balance Due</span>
                </div>
                <p className="text-2xl font-black text-white italic">Rs. {farmer.totalRemaining?.toLocaleString() || 0}</p>
             </div>
             <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-700/50 text-center group hover:bg-slate-800 transition-all">
                <div className="flex items-center justify-center gap-2 mb-3 text-violet-400">
                   <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></div>
                   <span className="text-[11px] font-black uppercase tracking-widest">Theka Rate</span>
                </div>
                {isEditing ? (
                  <input 
                    type="number"
                    value={editData.theka}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const newTheka = e.target.value;
                      setEditData(prev => {
                        const currentSize = Number(prev.landSize) || 0;
                        return {
                          ...prev,
                          theka: newTheka,
                          totalPayable: Math.round(currentSize * Number(newTheka)).toString()
                        };
                      });
                    }}
                    className="bg-transparent border-b border-violet-500/50 text-center outline-none w-full text-white font-black italic text-xl disabled:opacity-50"
                  />
                ) : (
                  <p className="text-2xl font-black text-white italic">Rs. {Number(farmer.theka)?.toLocaleString() || 0}</p>
                )}
             </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-10"></div>

          {/* Document Vault Section */}
          <div className="mb-10">
            <div className="flex items-center justify-start gap-2 mb-6">
               <span className="text-[11px] font-black text-emerald-400/80 uppercase tracking-widest italic">Documents</span>
               <Shield size={12} className="text-emerald-500" />
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 border border-slate-700/40 p-5 rounded-[28px] relative group transition-all hover:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID</span>
                     </div>
                     {farmer.idCardUrl && (
                        <button onClick={() => setPreviewImage(farmer.idCardUrl)} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase tracking-widest">View</button>
                     )}
                  </div>
                  
                  {isAdmin ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 grow rounded-2xl p-4 min-h-[80px] hover:border-indigo-500/50 transition-all cursor-pointer">
                       {isUploadingDoc.idCard ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : (
                         <>
                           <Upload size={18} className="text-slate-600 group-hover:translate-y--1 transition-transform" />
                           <span className="text-[10px] font-black text-slate-500 mt-2">Upload File</span>
                         </>
                       )}
                       <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocUpload('idCardUrl', e.target.files[0])} />
                    </label>
                  ) : !farmer.idCardUrl && (
                    <div className="flex items-center justify-center h-20 text-slate-600 italic text-[10px] bg-slate-900/20 rounded-2xl border border-slate-700/20">Not Available</div>
                  )}
                </div>
 
                <div className="bg-slate-800/30 border border-slate-700/40 p-5 rounded-[28px] relative group transition-all hover:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agreement</span>
                     </div>
                     {farmer.agreementUrl && (
                        <button onClick={() => window.open(farmer.agreementUrl, '_blank')} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase tracking-widest">View</button>
                     )}
                  </div>
                  
                  {isAdmin ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 grow rounded-2xl p-4 min-h-[80px] hover:border-indigo-500/50 transition-all cursor-pointer">
                       {isUploadingDoc.agreement ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : (
                         <>
                           <Upload size={18} className="text-slate-600 group-hover:translate-y--1 transition-transform" />
                           <span className="text-[10px] font-black text-slate-500 mt-2">Upload Legal</span>
                         </>
                       )}
                       <input type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => handleDocUpload('agreementUrl', e.target.files[0])} />
                    </label>
                  ) : !farmer.agreementUrl && (
                    <div className="flex items-center justify-center h-20 text-slate-600 italic text-[10px] bg-slate-900/20 rounded-2xl border border-slate-700/20">Not Available</div>
                  )}
                </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-10"></div>

          {/* Record New Payment Section - Styled as Shop */}
          {isAdmin && !isEditing && (
            <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center justify-start gap-2 mb-6">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Record New Payment</span>
                  <CreditCard size={12} className="text-indigo-400" />
               </div>

               <div className="bg-slate-800/20 border border-slate-700/30 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                     {/* Left: Image Upload Zone */}
                     <div className="relative group/upload h-full">
                        <label className="flex flex-col items-center justify-center w-full h-44 bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 cursor-pointer rounded-[32px] p-6 transition-all group-active/upload:scale-95">
                           <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors mb-4">
                              {file ? <CheckCircle size={32} className="text-emerald-500" /> : <Plus size={32} strokeWidth={1} />}
                           </div>
                           <div className="text-center">
                              <p className="text-[14px] font-black text-slate-300">Choose Receipt</p>
                              <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest italic">PDF, PNG, JPEG SUPPORT</p>
                           </div>
                           <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                        </label>
                     </div>

                     <div className="space-y-6">
                        <div className="flex gap-3">
                           {['Expense', 'Bank', 'Cash'].map((m) => (
                             <button 
                                key={m}
                                onClick={() => setMethod(m)}
                                className={`flex-1 py-4 px-2 text-[12px] font-black rounded-2xl border transition-all ${
                                  method === m
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30' 
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                             >
                               {m}
                             </button>
                           ))}
                        </div>

                          <div className="relative bg-slate-900/80 border border-slate-700 rounded-[32px] p-2 flex items-center shadow-inner group/input focus-within:border-indigo-500/50 transition-all font-sans">
                           <div className="w-14 h-14 flex items-center justify-center text-slate-600">
                              <CreditCard size={24} />
                           </div>
                           <input 
                              type="number"
                              value={amount}
                              disabled={!isAdmin}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="Enter amount..."
                              className="bg-transparent flex-1 py-5 pl-8 text-left text-2xl font-black text-white italic placeholder:text-slate-700 focus:outline-none disabled:opacity-50"
                           />
                          </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* History Section */}
          <div className="animate-in fade-in duration-700 pb-10">
            <div className="flex items-center justify-start gap-2 mb-8">
               <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Payment Details</span>
            </div>
            
            <div className="space-y-4">
               {farmer.history?.map((entry, idx) => (
                 <HistoryRow 
                   key={idx} 
                   entry={entry} 
                   globalIsEditing={isEditing}
                   setPreviewImage={setPreviewImage}
                   isAdmin={isAdmin}
                   onUpdate={(updated) => onUpdateHistory(farmer.id, idx, updated)}
                   onDelete={() => {
                     if (window.confirm("Are you sure?")) onDeleteHistory(farmer.id, idx);
                   }}
                 />
               ))}
               {!farmer.history?.length && (
                 <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <Receipt size={48} className="text-slate-400" />
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">No History Records</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-700/50 bg-[#1e293b] flex gap-4">
           {!isEditing ? (
             <>
               {isAdmin && (
                 <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-[2] h-14 lg:h-16 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] active:scale-95 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 lg:gap-3 text-[10px] lg:text-lg uppercase tracking-tight lg:tracking-widest px-2"
                 >
                   {isSaving ? <Loader2 className="animate-spin" /> : <><Receipt size={18} className="lg:w-[22px] lg:h-[22px]" /> Record Payment</>}
                 </button>
               )}
               {isAdmin && (
                 <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 h-14 lg:h-16 border border-slate-700 hover:bg-slate-800 text-slate-300 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] lg:text-sm uppercase tracking-widest px-2"
                 >
                   Edit
                 </button>
               )}
               <button 
                onClick={onClose}
                className="flex-1 h-14 lg:h-16 border border-slate-700 hover:bg-slate-800 text-slate-300 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center text-[10px] lg:text-sm uppercase tracking-widest px-2"
               >
                 Close
               </button>
             </>
           ) : (
             <>
               <button 
                onClick={handleUpdateInfo}
                disabled={isSaving}
                className="flex-[2] h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 uppercase tracking-widest"
               >
                 {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={22} /> Save Changes</>}
               </button>
               <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 h-16 bg-slate-800 text-slate-400 font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest"
               >
                 Cancel
               </button>
             </>
           )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

const HistoryRow = ({ entry, onUpdate, onDelete, globalIsEditing, setPreviewImage, isAdmin }) => {
  const [editData, setEditData] = useState({ ...entry });

  // Update local state if the entry props change (e.g. from parent/Firebase)
  useEffect(() => {
    setEditData({ ...entry });
  }, [entry]);

  const handleChange = (field, value) => {
    const updated = { ...editData, [field]: value };
    setEditData(updated);
    onUpdate(updated); // Sync back to the main data store immediately
  };

  return (
    <tr className="group hover:bg-slate-700/20 transition-colors">
      <td className="py-4">
        {globalIsEditing ? (
          <input 
            type="date"
            value={editData.date}
            disabled={!isAdmin}
            onChange={(e) => handleChange('date', e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
        ) : (
          <span className="text-[13px] font-bold text-slate-300">{entry.date}</span>
        )}
      </td>
      <td className="py-4">
        <div className="flex items-center gap-4">
          {globalIsEditing ? (
            <input 
              type="number"
              value={editData.amount}
              disabled={!isAdmin}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500 transition-colors w-24 disabled:opacity-50"
            />
          ) : (
            <span className="text-[13px] font-black text-emerald-400">Rs. {Number(entry.amount)?.toLocaleString()}</span>
          )}

          {/* Receipt Link next to amount */}
          {entry.receiptUrl && (
            <a 
              href={entry.receiptUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
            >
              <ImageIcon size={10} /> View <ExternalLink size={10} />
            </a>
          )}
        </div>
      </td>
      <td className="py-4">
        {globalIsEditing ? (
          <select 
            value={editData.method || 'Cash'}
            disabled={!isAdmin}
            onChange={(e) => handleChange('method', e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer uppercase font-black tracking-widest disabled:opacity-50"
          >
            <option value="Cash">Cash</option>
            <option value="Bank Payment">Bank Payment</option>
          </select>
        ) : (
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
             {entry.method || 'Cash'}
          </div>
        )}
      </td>
      <td className="py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          {entry.receiptUrl ? (
            <button 
              onClick={() => setPreviewImage(entry.receiptUrl)}
              className="relative group/receipt cursor-zoom-in"
            >
              <img 
                src={entry.receiptUrl} 
                alt="Receipt" 
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl object-cover border border-slate-700 group-hover:border-indigo-500 transition-all shadow-lg"
              />
              <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
                <ExternalLink size={12} className="text-white" />
              </div>
            </button>
          ) : (
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-center">
               <ImageIcon size={14} className="text-slate-600 opacity-20" />
            </div>
          )}
          
          {globalIsEditing && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95 ml-1"
              title="Delete Record"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const MiniStat = ({ label, value, icon, color }) => (
    <div className={`p-4 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 text-left`}>
        <div className={`flex items-center justify-center gap-2 mb-1.5 text-${color}-400`}>
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-black text-white italic truncate">{value}</p>
    </div>
);

export default FarmerDetailModal;

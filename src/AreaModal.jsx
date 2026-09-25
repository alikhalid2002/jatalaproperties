import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileText, Image as ImageIcon, Trash2, Download, ExternalLink, 
  MapPin, LandPlot, File, Plus, Save, Lock, Check, Eye, Maximize2, ShieldAlert,
  Paperclip, Edit3, Search, Tag, Calendar, Clock, StickyNote
} from 'lucide-react';
import { useAreaDetails } from './useAreaDetails';

export default function AreaModal({ isOpen, onClose, areaName, isAdmin }) {
  if (!isOpen || !areaName) return null;

  const { 
    data, loading, uploadProgress, 
    updateAreaInfo, addMemo, updateMemo, deleteMemo, 
    uploadFile, deleteFile 
  } = useAreaDetails(areaName);
  
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'info'
  const [previewImage, setPreviewImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, type: 'file'|'memo' }
  const fileInputRef = useRef(null);

  // Form states for Area Info editing
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [locationInput, setLocationInput] = useState(data.location || '');
  const [acresInput, setAcresInput] = useState(data.totalAcres || '');

  // Memo States
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoTag, setMemoTag] = useState('General');
  const [memoSearch, setMemoSearch] = useState('');

  // Keep form synced when data loads
  React.useEffect(() => {
    setLocationInput(data.location || '');
    setAcresInput(data.totalAcres || '');
  }, [data]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    await updateAreaInfo({
      location: locationInput,
      totalAcres: acresInput
    });
    setIsEditingInfo(false);
  };

  const handleSaveMemo = async (e) => {
    e.preventDefault();
    if (!memoTitle.trim() && !memoContent.trim()) return;

    if (editingMemoId) {
      await updateMemo(editingMemoId, {
        title: memoTitle,
        content: memoContent,
        tag: memoTag
      });
    } else {
      await addMemo({
        title: memoTitle,
        content: memoContent,
        tag: memoTag
      });
    }

    // Reset Form
    setMemoTitle('');
    setMemoContent('');
    setMemoTag('General');
    setEditingMemoId(null);
    setShowMemoForm(false);
  };

  const handleEditMemoClick = (memo) => {
    setEditingMemoId(memo.id);
    setMemoTitle(memo.title);
    setMemoContent(memo.content);
    setMemoTag(memo.tag || 'General');
    setShowMemoForm(true);
  };

  const processFiles = async (filesList) => {
    const files = Array.from(filesList || []);
    for (const file of files) {
      await uploadFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const images = (data.documents || []).filter(d => d.type === 'image');
  const docs = (data.documents || []).filter(d => d.type !== 'image');

  const filteredMemos = (data.memos || []).filter(m => 
    m.title?.toLowerCase().includes(memoSearch.toLowerCase()) ||
    m.content?.toLowerCase().includes(memoSearch.toLowerCase()) ||
    m.tag?.toLowerCase().includes(memoSearch.toLowerCase())
  );

  const getTagColor = (tag) => {
    switch (tag?.toLowerCase()) {
      case 'legal': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'financial': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'land notice': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'inspection': return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      default: return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Hidden File Input */}
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden" 
        onChange={handleFileInputChange}
      />

      <div className="w-full max-w-3xl bg-[#090d16] border border-indigo-500/30 rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/50">
              <LandPlot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-widest text-white uppercase">{areaName}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  Area Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Media, Documents & Territory Information</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-[#0c101b] flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 pt-3">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'files'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Paperclip size={15} />
              <span>Documents & Media ({data.documents?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <StickyNote size={15} />
              <span>Area Info & Memos ({data.memos?.length || 0})</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          {activeTab === 'files' && (
            <button
              onClick={triggerFilePicker}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-all active:scale-95 cursor-pointer my-2"
            >
              <Upload size={14} />
              <span>Upload Files</span>
            </button>
          )}

          {activeTab === 'info' && !showMemoForm && (
            <button
              onClick={() => {
                setEditingMemoId(null);
                setMemoTitle('');
                setMemoContent('');
                setMemoTag('General');
                setShowMemoForm(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-all active:scale-95 cursor-pointer my-2"
            >
              <Plus size={14} />
              <span>New Memo</span>
            </button>
          )}
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="w-full bg-slate-900 px-6 py-2.5 border-b border-indigo-500/20 flex items-center gap-3">
            <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{uploadProgress}% Uploading...</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-[#090d16]">
          
          {/* TAB 1: FILES & MEDIA */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              
              {/* Drag & Drop Upload Zone */}
              <div 
                onClick={triggerFilePicker}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group border-2 border-dashed ${
                  isDragging 
                    ? 'border-indigo-400 bg-indigo-500/20 scale-[1.01]' 
                    : 'border-indigo-500/30 hover:border-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10'
                } rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-wider">Click or Drag & Drop Files Here</p>
                  <p className="text-xs text-slate-400 mt-0.5">Supports PNG, JPG, PDF, DOCX, XLSX, TXT, CSV</p>
                </div>
              </div>

              {/* Images Section */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Images ({images.length})</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="group relative bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-lg hover:border-indigo-500/50 transition-all"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-slate-950 relative">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewImage(img.url)}
                              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                              title="Full Screen Preview"
                            >
                              <Maximize2 size={15} />
                            </button>
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              download={img.name}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-all"
                              title="Download"
                            >
                              <Download size={15} />
                            </a>
                          </div>
                        </div>
                        <div className="p-2 bg-slate-900/90 border-t border-white/5 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-200 truncate">{img.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{img.size} • {img.uploadedAt}</p>
                          </div>
                          <button
                            onClick={() => setConfirmDelete({ id: img.id, name: img.name, type: 'file' })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0 ml-2"
                            title="Delete Image"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {docs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Documents ({docs.length})</h3>
                  </div>

                  <div className="space-y-2">
                    {docs.map((docItem) => (
                      <div 
                        key={docItem.id}
                        className="bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 rounded-xl p-3 flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <File size={20} />
                            </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{docItem.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{docItem.size} • Uploaded on {docItem.uploadedAt}</p>
                            </div>
                          </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <ExternalLink size={13} />
                            <span className="hidden sm:inline">Open</span>
                          </a>
                          <button
                            onClick={() => setConfirmDelete({ id: docItem.id, name: docItem.name, type: 'file' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!data.documents || data.documents.length === 0) && (
                <div className="text-center py-10 space-y-3 bg-slate-900/30 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
                    <Paperclip size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No images or documents uploaded yet</p>
                  <button
                    onClick={triggerFilePicker}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5 shadow-lg"
                  >
                    <Plus size={14} />
                    <span>Select & Attach Files</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INFO & MULTIPLE MEMOS */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              
              {/* Territory Quick Specs */}
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                    <LandPlot size={15} />
                    <span>Territory Overview</span>
                  </h3>
                  {!isEditingInfo ? (
                    <button
                      onClick={() => setIsEditingInfo(true)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>Edit Specs</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveInfo}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-all cursor-pointer shadow-md flex items-center gap-1"
                    >
                      <Check size={13} />
                      <span>Save Specs</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <MapPin size={11} className="text-indigo-400" />
                      <span>Location</span>
                    </label>
                    <input 
                      disabled={!isEditingInfo}
                      type="text"
                      placeholder="e.g. Rajanpur District"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 disabled:bg-transparent disabled:border-transparent p-2 rounded-lg text-xs font-bold text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <LandPlot size={11} className="text-indigo-400" />
                      <span>Total Land Acreage</span>
                    </label>
                    <input 
                      disabled={!isEditingInfo}
                      type="text"
                      placeholder="e.g. 150 Acres"
                      value={acresInput}
                      onChange={(e) => setAcresInput(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 disabled:bg-transparent disabled:border-transparent p-2 rounded-lg text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Memo Creation / Edit Modal Form */}
              {showMemoForm && (
                <form onSubmit={handleSaveMemo} className="bg-[#0e1422] border border-indigo-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                      <StickyNote size={15} />
                      <span>{editingMemoId ? 'Edit Memo' : 'Add New Area Memo'}</span>
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowMemoForm(false)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Memo Title</label>
                      <input 
                        required
                        type="text"
                        placeholder="e.g. Wheat Crop Lease Terms & Land Notice"
                        value={memoTitle}
                        onChange={(e) => setMemoTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Tag</label>
                      <select
                        value={memoTag}
                        onChange={(e) => setMemoTag(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="General">General 📌</option>
                        <option value="Legal">Legal ⚖️</option>
                        <option value="Financial">Financial 💰</option>
                        <option value="Land Notice">Land Notice 🚜</option>
                        <option value="Inspection">Inspection 🔍</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Memo Details & Notes</label>
                    <textarea 
                      rows={4}
                      placeholder="Write detailed observations, agreement terms, dates, contacts, or land records..."
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMemoForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase cursor-pointer hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      {editingMemoId ? 'Update Memo' : 'Save Memo'}
                    </button>
                  </div>
                </form>
              )}

              {/* Memos List Controls (Search & Header) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <StickyNote size={17} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">
                      Area Memos ({filteredMemos.length})
                    </h3>
                  </div>

                  {/* Search Bar */}
                  {(data.memos?.length || 0) > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text"
                        placeholder="Search memos..."
                        value={memoSearch}
                        onChange={(e) => setMemoSearch(e.target.value)}
                        className="bg-slate-900 border border-white/10 pl-9 pr-4 py-1.5 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all w-48 sm:w-64"
                      />
                    </div>
                  )}
                </div>

                {/* Memos Cards Grid */}
                {filteredMemos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredMemos.map((memo) => (
                      <div 
                        key={memo.id}
                        className="bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 space-y-3 transition-all group shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getTagColor(memo.tag)}`}>
                                {memo.tag || 'General'}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <Clock size={11} />
                                <span>{memo.date}</span>
                              </span>
                              </div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider pt-1">{memo.title}</h4>
                            </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditMemoClick(memo)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all cursor-pointer"
                              title="Edit Memo"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: memo.id, name: memo.title, type: 'memo' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Delete Memo"
                            >
                              <Trash2 size={15} />
                            </button>
                            </div>
                          </div>

                        {memo.content && (
                          <p className="text-xs text-slate-300 font-normal leading-relaxed whitespace-pre-wrap pt-1 border-t border-white/5">
                            {memo.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  !showMemoForm && (
                    <div className="text-center py-10 space-y-3 bg-slate-900/30 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
                        <StickyNote size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {memoSearch ? 'No memos match your search query' : 'No memos created for this area yet'}
                      </p>
                      <button
                        onClick={() => {
                          setEditingMemoId(null);
                          setMemoTitle('');
                          setMemoContent('');
                          setMemoTag('General');
                          setShowMemoForm(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5 shadow-lg"
                      >
                        <Plus size={14} />
                        <span>Create First Area Memo</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Preview Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Full Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
          />
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#0e1422] border border-rose-500/30 rounded-[24px] shadow-2xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 size={26} />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-widest">Delete {confirmDelete.type === 'memo' ? 'Memo' : 'File'}?</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                  Are you sure you want to delete<br />
                  <span className="text-white font-bold">"{confirmDelete.name}"</span>?<br />
                  <span className="text-rose-400">This cannot be undone.</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmDelete.type === 'file') {
                    await deleteFile(confirmDelete.id);
                  } else {
                    await deleteMemo(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-rose-950/40"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

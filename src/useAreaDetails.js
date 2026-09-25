import { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export function useAreaDetails(areaName) {
  const [data, setData] = useState({
    areaName: areaName || '',
    location: '',
    totalAcres: '',
    notes: '',
    memos: [],
    documents: [],
    customFields: []
  });
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Firestore sync with localStorage fallback
  useEffect(() => {
    if (!areaName) return;

    const storageKey = `jatala_area_details_${areaName}`;
    const savedLocal = localStorage.getItem(storageKey);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        setData(prev => ({ ...prev, ...parsed, memos: parsed.memos || [] }));
      } catch (e) {
        console.error("Failed to parse local area details", e);
      }
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          setData(prev => ({ ...prev, ...remoteData, memos: remoteData.memos || [] }));
          try {
            localStorage.setItem(storageKey, JSON.stringify(remoteData));
          } catch (e) {
            console.warn("LocalStorage quota notice:", e);
          }
        }
        setLoading(false);
      }, (error) => {
        console.warn("Firestore areaDetails listener notice:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore error in useAreaDetails:", err);
      setLoading(false);
    }
  }, [areaName]);

  // Save Info / Location / Acres
  const updateAreaInfo = async (updatedFields) => {
    if (!areaName) return;
    const newData = { ...data, ...updatedFields, areaName };
    setData(newData);
    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage save notice:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, newData, { merge: true });
    } catch (err) {
      console.error("Failed to update area info in Firestore:", err);
    }
  };

  // Add Memo
  const addMemo = async ({ title, content, tag }) => {
    if (!areaName || (!title && !content)) return;

    const newMemo = {
      id: `memo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title || 'Untitled Memo',
      content: content || '',
      tag: tag || 'General',
      date: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updatedMemos = [newMemo, ...(data.memos || [])];
    const newData = { ...data, memos: updatedMemos };

    setData(newData);

    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage memo save notice:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, { memos: updatedMemos }, { merge: true });
    } catch (err) {
      console.error("Failed to save memo to Firestore:", err);
    }
  };

  // Update Existing Memo
  const updateMemo = async (memoId, updatedFields) => {
    if (!areaName || !memoId) return;

    const updatedMemos = (data.memos || []).map(m => {
      if (m.id === memoId) {
        return { 
          ...m, 
          ...updatedFields, 
          updatedAt: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
      }
      return m;
    });

    const newData = { ...data, memos: updatedMemos };
    setData(newData);

    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage memo update notice:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, { memos: updatedMemos }, { merge: true });
    } catch (err) {
      console.error("Failed to update memo in Firestore:", err);
    }
  };

  // Delete Memo
  const deleteMemo = async (memoId) => {
    if (!areaName || !memoId) return;

    const updatedMemos = (data.memos || []).filter(m => m.id !== memoId);
    const newData = { ...data, memos: updatedMemos };

    setData(newData);

    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage memo delete notice:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, { memos: updatedMemos }, { merge: true });
    } catch (err) {
      console.error("Failed to delete memo from Firestore:", err);
    }
  };

  // Safe file reader helper (creates data URL or object URL)
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  // Upload File (Image or Document)
  const uploadFile = async (file) => {
    if (!areaName || !file) return;

    const isImage = file.type.startsWith('image/');
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const fileSizeMB = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';
    const uploadedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    setUploadProgress(15);

    let downloadUrl = '';

    try {
      const storageRef = ref(storage, `area_files/${areaName}/${fileId}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(Math.max(20, progress));
          },
          (error) => {
            console.warn("Firebase Storage unavailable, using local data fallback:", error);
            reject(error);
          },
          async () => {
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    } catch (storageErr) {
      downloadUrl = await readFileAsDataUrl(file);
    }

    setUploadProgress(100);

    const newDoc = {
      id: fileId,
      name: fileName,
      type: isImage ? 'image' : 'document',
      url: downloadUrl,
      size: fileSizeMB,
      uploadedAt
    };

    const updatedDocs = [newDoc, ...(data.documents || [])];
    const newData = { ...data, documents: updatedDocs };

    setData(newData);

    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage quota exceeded:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, { documents: updatedDocs }, { merge: true });
    } catch (err) {
      console.error("Failed to save doc metadata to Firestore:", err);
    }

    setTimeout(() => setUploadProgress(null), 600);
  };

  // Delete Document / File
  const deleteFile = async (docId) => {
    if (!areaName || !docId) return;

    const targetDoc = data.documents?.find(d => d.id === docId);
    const updatedDocs = (data.documents || []).filter(d => d.id !== docId);

    const newData = { ...data, documents: updatedDocs };
    setData(newData);

    try {
      localStorage.setItem(`jatala_area_details_${areaName}`, JSON.stringify(newData));
    } catch (e) {
      console.warn("LocalStorage notice:", e);
    }

    try {
      const docRef = doc(db, 'areaDetails', areaName);
      await setDoc(docRef, { documents: updatedDocs }, { merge: true });

      if (targetDoc?.url && targetDoc.url.includes('firebasestorage')) {
        const fileRef = ref(storage, targetDoc.url);
        deleteObject(fileRef).catch(e => console.warn("Storage delete notice:", e));
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  return {
    data,
    loading,
    uploadProgress,
    updateAreaInfo,
    addMemo,
    updateMemo,
    deleteMemo,
    uploadFile,
    deleteFile
  };
}

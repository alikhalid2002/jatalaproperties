import { useState, useEffect } from 'react';
import { initialFarmers } from './seedFarmers';
import { db, storage } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const compressImage = async (file) => {
  if (!file || !file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            // Only scale down if the image is wider than MAX_WIDTH
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) {
              scaleSize = MAX_WIDTH / img.width;
            }
            
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                const newFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                // If compression made it amazingly larger (rare but possible for tiny images), return original
                resolve(blob.size < file.size ? newFile : file);
            }, 'image/jpeg', 0.6);
        };
    };
  });
};

export const useFarmers = () => {
  // Load initial state from Cache for 'Instant UI'
  const [farmers, setFarmers] = useState(() => {
    try {
      const cached = localStorage.getItem('jatala_farmers_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn("Failed to parse farmers cache:", e);
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    try {
      const q = query(collection(db, 'farmers'), orderBy('nameUr', 'asc'));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const farmersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFarmers(farmersData);
        // Save to cache
        localStorage.setItem('jatala_farmers_cache', JSON.stringify(farmersData));
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error in useFarmers:", error);
        console.log("Falling back to local data due to Firebase error.");
        const fallbackData = initialFarmers.map((f, i) => ({ id: `fallback_${i}`, ...f }));
        setFarmers(fallbackData);
        setLoading(false); 
      });
    } catch (error) {
      console.error("Sync Firebase Initialization Error:", error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

const updateFarmerFields = async (farmerId, fields) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    const farmerRef = doc(db, 'farmers', farmerId);
    
    // Check if landSize is being updated
    if (fields.landSize && Number(fields.landSize) !== Number(farmer.landSize)) {
      const newSize = Number(fields.landSize);
      const oldSize = Number(farmer.landSize) || 1;
      
      // Calculate current total value (Paid + Remaining)
      const currentPayable = Number(farmer.totalPayable) || (Number(farmer.totalPaid) + Number(farmer.totalRemaining));
      
      // Derive rate per unit and calculate new totals
      const ratePerUnit = currentPayable / oldSize;
      const newTotalPayable = Math.round(ratePerUnit * newSize);
      const newTotalRemaining = Math.max(0, newTotalPayable - (Number(farmer.totalPaid) || 0));

      await updateDoc(farmerRef, {
        ...fields,
        totalPayable: newTotalPayable,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
      });
    } else {
      // Basic update (e.g. name change)
      await updateDoc(farmerRef, fields);
    }
  };

  const uploadReceipt = async (file) => {
    if (!file) return null;
    const compressedFile = await compressImage(file);
    const storageRef = ref(storage, `receipts/${Date.now()}_${compressedFile.name}`);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

    try {
      const uploadTask = uploadBytes(storageRef, compressedFile);
      const snapshot = await Promise.race([uploadTask, timeout]);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Storage Error:", error);
      throw error;
    }
  };

  const updateFarmerDocuments = async (farmerId, docType, file) => {
    if (!file) return;
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    try {
      const compressedFile = await compressImage(file);
      const storageRef = ref(storage, `${docType}/${Date.now()}_${compressedFile.name}`);
      const uploadTask = uploadBytes(storageRef, compressedFile);
      const snapshot = await uploadTask;
      const url = await getDownloadURL(snapshot.ref);

      const farmerRef = doc(db, 'farmers', farmerId);
      await updateDoc(farmerRef, {
        [docType]: url // docType will be 'idCardUrl' or 'agreementUrl'
      });

      console.log(`${docType} uploaded successfully:`, url);
      return url;
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      alert(`Failed to upload ${docType}.`);
      throw error;
    }
  };

  const recordPayment = async (farmerId, amount, receiptFile = null, method = 'Cash') => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    const amountNum = Number(amount);
    const newTotalPaid = (Number(farmer.totalPaid) || 0) + amountNum;
    const newTotalRemaining = Math.max(0, (Number(farmer.totalPayable) || 0) - newTotalPaid);

    const newHistoryEntry = {
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      method: method,
      receiptUrl: null // will be updated in background if file exists
    };

    // ⚡ OPTIMISTIC UPDATE: Update local state immediately so UI feels instant
    setFarmers(prev => prev.map(f => f.id === farmerId ? {
      ...f,
      totalPaid: newTotalPaid,
      totalRemaining: newTotalRemaining,
      status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
      history: [newHistoryEntry, ...(f.history || [])]
    } : f));

    // 🔄 BACKGROUND SYNC: Firebase write happens in background — no waiting!
    const farmerRef = doc(db, 'farmers', farmerId);
    
    if (receiptFile) {
      // Handle file upload in background
      uploadReceipt(receiptFile).then(receiptUrl => {
        updateDoc(farmerRef, {
          totalPaid: newTotalPaid,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
          history: [{ ...newHistoryEntry, receiptUrl }, ...(farmer.history || [])]
        }).catch(console.error);
      }).catch(() => {
        // Upload failed, save without receipt
        updateDoc(farmerRef, {
          totalPaid: newTotalPaid,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
          history: [newHistoryEntry, ...(farmer.history || [])]
        }).catch(console.error);
      });
    } else {
      updateDoc(farmerRef, {
        totalPaid: newTotalPaid,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
        history: [newHistoryEntry, ...(farmer.history || [])]
      }).catch(console.error);
    }
  };

  const updateHistory = async (farmerId, historyIndex, updatedEntry) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    const newHistory = [...(farmer.history || [])];
    newHistory[historyIndex] = { ...newHistory[historyIndex], ...updatedEntry };

    // Recalculate totals
    const newTotalPaid = newHistory.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const newTotalRemaining = Math.max(0, (Number(farmer.totalPayable) || 0) - newTotalPaid);

    const farmerRef = doc(db, 'farmers', farmerId);
    await updateDoc(farmerRef, {
      history: newHistory,
      totalPaid: newTotalPaid,
      totalRemaining: newTotalRemaining,
      status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
    });
  };

  const deleteHistory = async (farmerId, historyIndex) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer || !farmer.history) return;
    
    // Create a copy and remove the item at the specific index
    const newHistory = [...farmer.history];
    newHistory.splice(historyIndex, 1);

    // Recalculate totals based on the remaining history
    const newTotalPaid = newHistory.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const newTotalRemaining = Math.max(0, (Number(farmer.totalPayable) || 0) - newTotalPaid);

    try {
      const farmerRef = doc(db, 'farmers', farmerId);
      await updateDoc(farmerRef, {
        history: newHistory,
        totalPaid: newTotalPaid,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
      });
      
      // PERMANENT FIX: Update local state immediately to avoid "phantom" records
      setFarmers(prev => {
        const updated = prev.map(f => f.id === farmerId ? {
          ...f,
          history: newHistory,
          totalPaid: newTotalPaid,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
        } : f);
        localStorage.setItem('jatala_farmers_cache', JSON.stringify(updated));
        return updated;
      });

      console.log("History item deleted and totals updated successfully.");
    } catch (err) {
      console.error("Failed to delete history item:", err);
      alert("Error: Could not delete record from database.");
    }
  };

  const addNewFarmer = async (farmerData) => {
    await addDoc(collection(db, 'farmers'), {
      ...farmerData,
      landSize: Number(farmerData.landSize),
      status: 'Pending',
      totalPaid: 0,
      totalRemaining: 0,
      history: []
    });
  };

  const deleteFarmer = async (farmerId) => {
    if (!window.confirm("Delete this member and all their records?")) return;
    await deleteDoc(doc(db, 'farmers', farmerId));
  };

  return { 
    farmers, 
    loading, 
    updateFarmerFields, 
    recordPayment, 
    updateHistory, 
    deleteHistory, 
    addNewFarmer, 
    deleteFarmer,
    updateFarmerDocuments 
  };
};

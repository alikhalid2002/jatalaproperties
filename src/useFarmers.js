import { useState, useEffect } from 'react';
import { initialFarmers } from './seedFarmers';
import { db, storage, getDataPath } from './firebase';
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

const withTimeout = (promise, message = "Connection Timeout. Please check your internet or Firebase config.") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))
  ]);
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
      const q = query(collection(db, getDataPath('farmers')), orderBy('nameUr', 'asc'));
      
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
    try {
      const farmerRef = doc(db, getDataPath('farmers'), farmerId);
      const farmer = farmers.find(f => f.id === farmerId);
      if (!farmer) throw new Error("Member document not found.");

      // Clone fields to break any shared object references
      const updateData = { ...fields };
      
      // Update targeted document only
      if (updateData.landSize && Number(updateData.landSize) !== Number(farmer.landSize)) {
        const newSize = Number(updateData.landSize);
        const oldSize = Number(farmer.landSize) || 1;
        const currentPayable = Number(farmer.totalPayable) || (Number(farmer.totalPaid) + Number(farmer.totalRemaining));
        const ratePerUnit = currentPayable / oldSize;
        const newTotalPayable = Math.round(ratePerUnit * newSize);
        const newTotalRemaining = Math.max(0, newTotalPayable - (Number(farmer.totalPaid) || 0));

        await withTimeout(updateDoc(farmerRef, {
          ...updateData,
          totalPayable: newTotalPayable,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
        }));
      } else if (updateData.totalPayable !== undefined) {
        const newTotalPayable = Number(updateData.totalPayable);
        const totalPaid = Number(farmer.totalPaid) || 0;
        const newTotalRemaining = Math.max(0, newTotalPayable - totalPaid);
        await withTimeout(updateDoc(farmerRef, {
          ...updateData,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
        }));
      } else {
        await withTimeout(updateDoc(farmerRef, updateData));
      }

      // Force immediate cache purge to prevent stale global state
      localStorage.removeItem('jatala_farmers_cache');
    } catch (error) {
      console.error("Update Farmer Error:", error);
      alert(`Error updating member: ${error.message}`);
      throw error;
    }
  };

  const bulkRecalculateFarmers = async () => {
    try {
      console.log("Starting bulk recalculation...");
      const updates = farmers.map(async (farmer) => {
        const theka = Number(farmer.theka) || 0;
        const acres = Number(farmer.landSize) || 1;
        const newTotalPayable = Math.round(acres * theka);
        
        if (newTotalPayable > 0 && newTotalPayable !== Number(farmer.totalPayable)) {
          const totalPaid = Number(farmer.totalPaid) || 0;
          const newTotalRemaining = Math.max(0, newTotalPayable - totalPaid);
          const farmerRef = doc(db, getDataPath('farmers'), farmer.id);
          
          return updateDoc(farmerRef, {
            totalPayable: newTotalPayable,
            totalRemaining: newTotalRemaining,
            status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updates);
      localStorage.removeItem('jatala_farmers_cache');
      console.log("Bulk recalculation complete.");
      alert("تمام ممبران کا حساب کتاب اپ ڈیٹ کر دیا گیا ہے!"); // Urdu: All members' calculations updated!
    } catch (error) {
      console.error("Bulk Recalculate Error:", error);
      alert(`Bulk update failed: ${error.message}`);
    }
  };

  const uploadReceipt = async (file) => {
    if (!file) return null;
    try {
      const compressedFile = await compressImage(file);
      const storageRef = ref(storage, `receipts/${Date.now()}_${compressedFile.name}`);

      const uploadTask = uploadBytes(storageRef, compressedFile);
      const snapshot = await withTimeout(uploadTask, "Upload timed out. Image might be too large or connection is slow.");
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
      const snapshot = await withTimeout(uploadTask);
      const url = await getDownloadURL(snapshot.ref);

      const farmerRef = doc(db, getDataPath('farmers'), farmerId);
      await withTimeout(updateDoc(farmerRef, {
        [docType]: url // docType will be 'idCardUrl' or 'agreementUrl'
      }));

      console.log(`${docType} uploaded successfully:`, url);
      return url;
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      alert(`Failed to upload ${docType}: ${error.message}`);
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
      receiptUrl: null // will be updated if file exists
    };

    // ⚡ OPTIMISTIC UPDATE: Update local state immediately so UI feels instant
    setFarmers(prev => prev.map(f => f.id === farmerId ? {
      ...f,
      totalPaid: newTotalPaid,
      totalRemaining: newTotalRemaining,
      status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
      history: [newHistoryEntry, ...(f.history || [])]
    } : f));

    // 🔄 SYNC IN BACKGROUND
    const farmerRef = doc(db, getDataPath('farmers'), farmerId);
    
    try {
      if (receiptFile) {
        // Handle file upload
        const receiptUrl = await uploadReceipt(receiptFile);
        await withTimeout(updateDoc(farmerRef, {
          totalPaid: newTotalPaid,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
          history: [{ ...newHistoryEntry, receiptUrl }, ...(farmer.history || [])]
        }));
      } else {
        // No receipt file, skip upload
        await withTimeout(updateDoc(farmerRef, {
          totalPaid: newTotalPaid,
          totalRemaining: newTotalRemaining,
          status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
          history: [newHistoryEntry, ...(farmer.history || [])]
        }));
      }
    } catch (error) {
      console.error("Payment Sync Error:", error);
      alert(`Payment recording failed: ${error.message}. Please refresh.`);
      // Optional: rollback optimistic update here if needed
    }
  };

  const updateHistory = async (farmerId, historyIndex, updatedEntry) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    try {
      const newHistory = [...(farmer.history || [])];
      newHistory[historyIndex] = { ...newHistory[historyIndex], ...updatedEntry };

      // Recalculate totals
      const newTotalPaid = newHistory.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const newTotalRemaining = Math.max(0, (Number(farmer.totalPayable) || 0) - newTotalPaid);

      const farmerRef = doc(db, getDataPath('farmers'), farmerId);
      await withTimeout(updateDoc(farmerRef, {
        history: newHistory,
        totalPaid: newTotalPaid,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
      }));
    } catch (error) {
      console.error("Update History Error:", error);
      alert(`History update failed: ${error.message}`);
    }
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
      const farmerRef = doc(db, getDataPath('farmers'), farmerId);
      await withTimeout(updateDoc(farmerRef, {
        history: newHistory,
        totalPaid: newTotalPaid,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'Paid' : 'Pending'
      }));
      
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
      alert(`Delete failed: ${err.message}`);
    }
  };

  const addNewFarmer = async (farmerData) => {
    try {
      await withTimeout(addDoc(collection(db, getDataPath('farmers')), {
        ...farmerData,
        landSize: Number(farmerData.landSize),
        status: 'Pending',
        totalPaid: 0,
        totalRemaining: 0,
        theka: 0,
        history: []
      }));
    } catch (error) {
       console.error("Add Farmer Error:", error);
       alert(`Registration failed: ${error.message}`);
       throw error;
    }
  };

  const deleteFarmer = async (farmerId) => {
    if (!window.confirm("Delete this member and all their records?")) return;
    try {
      await withTimeout(deleteDoc(doc(db, getDataPath('farmers'), farmerId)));
    } catch (error) {
      console.error("Delete Farmer Error:", error);
      alert(`Delete failed: ${error.message}`);
    }
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

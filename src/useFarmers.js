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
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

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

const withTimeout = (promise, message = "Connection Timeout. Please check your internet or Firebase config.", ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
};

export const useFarmers = () => {
  // Load initial state from Cache for 'Instant UI'
  const [farmers, setFarmers] = useState(() => {
    try {
      const cached = localStorage.getItem('jatala_farmers_cache');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to parse farmers cache:", e);
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({}); // { agreement: 50, idCard: 10 }

  const refreshFarmers = () => {
    localStorage.removeItem('jatala_farmers_cache');
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    let unsubscribe;
    setLoading(true);
    try {
      const q = query(collection(db, getDataPath('farmers')));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const farmersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => (Number(b.landSize) || 0) - (Number(a.landSize) || 0));
        
        setFarmers(farmersData);
        // Save to cache
        localStorage.setItem('jatala_farmers_cache', JSON.stringify(farmersData));
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error in useFarmers:", error);
        setLoading(false); 
      });
    } catch (error) {
      console.error("Sync Firebase Initialization Error:", error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refreshKey]);

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

    const progressKey = docType === 'idCardUrl' ? 'idCard' : 'agreement';
    
    try {
      const bucket = storage.app.options.storageBucket;
      console.log("Using bucket:", bucket);
      
      if (!bucket || bucket.includes('undefined')) {
         alert(`CONFIG MISSING: VITE_FIREBASE_STORAGE_BUCKET is not set. Currently: ${bucket}`);
         return;
      }

      // ⏱️ Step 1: Skip compression for now to isolate the hang
      const compressedFile = file; 
      
      // ⏱️ Step 2: Create reference
      const storageRef = ref(storage, `${docType}/${Date.now()}_${compressedFile.name}`);
      console.log("Ref created:", storageRef.fullPath);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      return new Promise((resolve, reject) => {
        // Set a 30s timeout for INITIAL connection
        const connectionTimeout = setTimeout(() => {
          if (uploadTask.snapshot.bytesTransferred === 0) {
            alert("Connection timed out at 0%. This usually means your network is blocking the upload or the bucket permissions are wrong.");
            reject(new Error("Initial connection timeout"));
          }
        }, 30000);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
            setUploadProgress(prev => ({ ...prev, [progressKey]: Math.round(progress) }));
          }, 
          (error) => {
            clearTimeout(connectionTimeout);
            console.error("Firebase Details:", error);
            setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
            alert(`UPLOADER ERROR\nCode: ${error.code}\nMessage: ${error.message}`);
            reject(error);
          }, 
          async () => {
            clearTimeout(connectionTimeout);
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            const farmerRef = doc(db, getDataPath('farmers'), farmerId);
            
            await updateDoc(farmerRef, { [docType]: url });

            // ⚡ OPTIMISTIC UPDATE
            setFarmers(prev => {
              const updated = prev.map(f => f.id === farmerId ? { ...f, [docType]: url } : f);
              localStorage.setItem('jatala_farmers_cache', JSON.stringify(updated));
              return updated;
            });
            
            setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
            resolve(url);
          }
        );
      });
    } catch (error) {
      console.error(`GLOBAL UPLOAD CATCH:`, error);
      alert(`SYSTEM ERROR: ${error.message}`);
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
    // ⚡ OPTIMISTIC UPDATE: Remove from local state immediately
    let prevData = [];
    setFarmers(prev => {
      prevData = [...prev];
      const updated = prev.filter(f => f.id !== farmerId);
      localStorage.setItem('jatala_farmers_cache', JSON.stringify(updated));
      return updated;
    });

    try {
      if (!farmerId.startsWith('fallback_')) {
        await withTimeout(deleteDoc(doc(db, getDataPath('farmers'), farmerId)));
      }
    } catch (error) {
      console.error("Delete Farmer Error:", error);
      alert(`Delete failed on server: ${error.message}. Please refresh.`);
      setFarmers(prevData); // Rollback on failure
    }
  };

  const purgeAllFarmers = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete EVERY SINGLE MEMBER. There is no undo.")) return;
    try {
      const batch = writeBatch(db);
      const snap = await getDocs(collection(db, getDataPath('farmers')));
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      localStorage.removeItem('jatala_farmers_cache');
      setFarmers([]);
      alert("Database Purged Successfully!");
    } catch (err) { alert("Purge Failed: " + err.message); }
  };

  return { 
    farmers, 
    loading, 
    refreshFarmers,
    updateFarmerFields, 
    recordPayment, 
    updateHistory, 
    deleteHistory, 
    addNewFarmer, 
    deleteFarmer,
    purgeAllFarmers,
    updateFarmerDocuments, 
    uploadProgress
  };
};

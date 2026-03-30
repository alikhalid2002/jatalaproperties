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
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    const farmerRef = doc(db, 'farmers', farmerId);
    await updateDoc(farmerRef, fields);
  };

  const uploadReceipt = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const recordPayment = async (farmerId, amount, receiptFile = null) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return;

    let receiptUrl = null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile);
    }

    const amountNum = Number(amount);
    const newTotalPaid = (Number(farmer.totalPaid) || 0) + amountNum;
    const newTotalRemaining = Math.max(0, (Number(farmer.totalPayable) || 0) - newTotalPaid);

    const newHistoryEntry = {
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      receiptUrl: receiptUrl
    };

    const farmerRef = doc(db, 'farmers', farmerId);
    await updateDoc(farmerRef, {
      totalPaid: newTotalPaid,
      totalRemaining: newTotalRemaining,
      status: newTotalRemaining === 0 ? 'Paid' : 'Pending',
      history: [newHistoryEntry, ...(farmer.history || [])]
    });
  };

  return { farmers, loading, updateFarmerFields, recordPayment };
};

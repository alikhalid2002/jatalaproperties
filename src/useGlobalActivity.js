import { useState, useEffect } from 'react';
import { db, getDataPath } from './firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export const useGlobalActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubFarmers;
    let unsubShops;
    let unsubSold;
    let unsubExpenses;

    const aggregate = () => {
      // This is a complex aggregation from several collections.
      // For simplicity, we'll listen to them and merge in memory.
      // In a real app, you might have a dedicated 'activity' col.
    };

    const listeners = [];

    // 1. Listen to Farmers for history
    const qFarmers = query(collection(db, getDataPath('farmers')));
    const unsubF = onSnapshot(qFarmers, (snap) => {
      const allF = [];
      snap.docs.forEach(doc => {
        const data = doc.data();
        (data.history || []).forEach(h => {
          allF.push({
            id: `f_${doc.id}_${h.date}_${h.amount}`,
            type: 'Farmer Payment',
            label: `Payment from ${data.nameEn || data.nameUr}`,
            amount: Number(h.amount),
            date: h.date,
            method: h.method || 'Cash',
            section: 'Land',
            isRevenue: true
          });
        });
      });
      updateState('farmers', allF);
    });

    // 2. Listen to Shops for rent/repairs
    const qShops = query(collection(db, getDataPath('shop_transactions')), orderBy('createdAt', 'desc'), limit(20));
    const unsubS = onSnapshot(qShops, (snap) => {
      const allS = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type === 'Rent' ? 'Shop Rent' : 'Shop Repair',
          label: data.type === 'Rent' ? `Rent Received - ${data.shopName || 'Shop'}` : `Repair - ${data.shopName || 'Shop'}`,
          amount: Number(data.amount),
          date: data.date || new Date().toISOString().split('T')[0],
          method: data.method || 'Cash',
          section: 'Shops',
          isRevenue: data.type === 'Rent'
        };
      });
      updateState('shops', allS);
    });

    // 3. Listen to Sold Properties
    const qSold = query(collection(db, getDataPath('sold_properties')));
    const unsubP = onSnapshot(qSold, (snap) => {
      const allP = [];
      snap.docs.forEach(doc => {
        const data = doc.data();
        (data.installments || []).forEach(inst => {
          allP.push({
            id: `p_${doc.id}_${inst.id}`,
            type: 'Property Installment',
            label: `Installment - ${data.nameEn || data.nameUr}`,
            amount: Number(inst.amount),
            date: inst.date,
            method: inst.method || 'Cash',
            section: 'Sold',
            isRevenue: true
          });
        });
      });
      updateState('sold', allP);
    });

    // 4. Listen to general expenses
    const qExp = query(collection(db, getDataPath('expenses')), orderBy('createdAt', 'desc'), limit(20));
    const unsubE = onSnapshot(qExp, (snap) => {
      const allE = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'Expense',
          label: data.labelEn || data.labelUr || 'General Expense',
          amount: Number(data.amount),
          date: data.date || new Date().toISOString().split('T')[0],
          section: 'Land',
          isRevenue: false
        };
      });
      updateState('expenses', allE);
    });

    const collectionsCache = { farmers: [], shops: [], sold: [], expenses: [] };
    
    function updateState(key, data) {
      collectionsCache[key] = data;
      const combined = [
        ...collectionsCache.farmers, 
        ...collectionsCache.shops, 
        ...collectionsCache.sold, 
        ...collectionsCache.expenses
      ];
      // Sort by date DESC
      const sorted = combined.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivities(sorted.slice(0, 5)); // User asked for 5
      setLoading(false);
    }

    return () => {
      unsubF();
      unsubS();
      unsubP();
      unsubE();
    };
  }, []);

  return { activities, loading };
};

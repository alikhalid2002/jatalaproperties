import { useState, useEffect } from 'react';
import { db, getDataPath } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';

export const useFinanceData = (selectedYear) => {
    const [revenue, setRevenue] = useState(0);
    const [pending, setPending] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshFinance = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        let unsubRevenue;
        let unsubExpenses;
        let unsubShopExpenses;
        let unsubFarmers;
        let unsubGlobalTransactions;

        setLoading(true);
        try {
            const qRevenue = query(collection(db, getDataPath("revenue")), orderBy("createdAt", "desc"));
            const qExpenses = query(collection(db, getDataPath("expenses")), orderBy("createdAt", "desc"));
            const qShopTrans = query(collection(db, getDataPath("shop_transactions")), orderBy("createdAt", "desc"));
            const qFarmers = query(collection(db, getDataPath("farmers")));
            const qGlobalTrans = query(collection(db, getDataPath("transactions")), orderBy("createdAt", "desc"));

            const getYear = (data) => {
                if (data.date) return data.date.split('-')[0];
                const created = data.createdAt?.toDate ? data.createdAt.toDate() : 
                               (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date());
                return created.getFullYear().toString();
            };

            const syncFinance = (revDocs, expDocs, shopDocs, farmerDocs, globalDocs) => {
                let totalRev = 0;
                let totalPending = 0;
                let totalExp = 0;
                const allEntries = [];

                // 1. Process Revenue Collection
                revDocs.forEach(doc => {
                    const data = doc.data();
                    if (getYear(data) === selectedYear) {
                        if (data.status === 'received') totalRev += Number(data.amount) || 0;
                        else totalPending += Number(data.amount) || 0;
                        allEntries.push({ id: doc.id, type: 'revenue', sourceCollection: 'revenue', ...data });
                    }
                });

                // 2. Process Expenses Collection
                expDocs.forEach(doc => {
                    const data = doc.data();
                    if (getYear(data) === selectedYear) {
                        totalExp += Number(data.amount) || 0;
                        allEntries.push({ id: doc.id, type: 'expense', sourceCollection: 'expenses', ...data });
                    }
                });

                // 3. Process Shop Transactions (Rent & Expenses)
                shopDocs.forEach(doc => {
                    const data = doc.data();
                    if (getYear(data) === selectedYear) {
                        if (data.type === 'Rent') {
                            totalRev += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'revenue', sourceCollection: 'shop_transactions', ...data, label: `Shop Rent (${data.shopName || ''})` });
                        } else {
                            totalExp += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'shop_expense', sourceCollection: 'shop_transactions', ...data });
                        }
                    }
                });

                // 4. Process Farmers (Payments from History)
                farmerDocs.forEach(doc => {
                    const f = doc.data();
                    if (f.history && Array.isArray(f.history)) {
                        f.history.forEach((h, idx) => {
                            if (h.date?.split('-')[0] === selectedYear) {
                                totalRev += Number(h.amount) || 0;
                                allEntries.push({ 
                                    id: `${doc.id}_h_${idx}`, 
                                    type: 'revenue', 
                                    sourceCollection: 'farmers',
                                    isHistory: true,
                                    farmerId: doc.id,
                                    historyIdx: idx,
                                    amount: h.amount, 
                                    date: h.date, 
                                    label: `Payment: ${f.nameEn || f.nameUr}`,
                                    status: 'received'
                                });
                            }
                        });
                    }
                    totalPending += Number(f.totalRemaining) || 0;
                });

                // 5. Process Global Transactions (FAB Entries)
                globalDocs.forEach(doc => {
                    const data = doc.data();
                    if (getYear(data) === selectedYear) {
                        if (data.type === 'income') {
                            totalRev += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'revenue', sourceCollection: 'transactions', ...data, label: `Extra Income: ${data.description || ''}` });
                        } else {
                            totalExp += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'expense', sourceCollection: 'transactions', ...data });
                        }
                    }
                });

                setRevenue(totalRev);
                setExpenses(totalExp);
                setPending(totalPending);
                setEntries(allEntries.sort((a,b) => {
                    const dateA = a.date || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toISOString() : '');
                    const dateB = b.date || (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toISOString() : '');
                    return dateB.localeCompare(dateA);
                }));
                setLoading(false);
            };

            let lastRev = [];
            let lastExp = [];
            let lastShop = [];
            let lastFarmer = [];
            let lastGlobal = [];

            unsubRevenue = onSnapshot(qRevenue, (s) => { lastRev = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer, lastGlobal); });
            unsubExpenses = onSnapshot(qExpenses, (s) => { lastExp = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer, lastGlobal); });
            unsubShopExpenses = onSnapshot(qShopTrans, (s) => { lastShop = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer, lastGlobal); });
            unsubFarmers = onSnapshot(qFarmers, (s) => { lastFarmer = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer, lastGlobal); });
            unsubGlobalTransactions = onSnapshot(qGlobalTrans, (s) => { lastGlobal = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer, lastGlobal); });

        } catch (error) {
            console.error("Finance Sync Error:", error);
            setLoading(false);
        }

        return () => {
            if (unsubRevenue) unsubRevenue();
            if (unsubExpenses) unsubExpenses();
            if (unsubShopExpenses) unsubShopExpenses();
            if (unsubFarmers) unsubFarmers();
            if (unsubGlobalTransactions) unsubGlobalTransactions();
        };
    }, [selectedYear, refreshKey]);

    const withTimeout = (promise, message = "Operation timed out. Please check your internet or Firebase config.") => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))
        ]);
    };

    const addEntry = async (type, data) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        try {
            await withTimeout(addDoc(collection(db, getDataPath(col)), {
                ...data,
                createdAt: serverTimestamp(),
                amount: Number(data.amount)
            }));
        } catch (error) {
            console.error("Add Entry Error:", error);
            alert(`Error: ${error.message}`);
            throw error;
        }
    };

    const updateEntry = async (id, type, data) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        try {
            const docRef = doc(db, getDataPath(col), id);
            await withTimeout(updateDoc(docRef, { ...data, amount: Number(data.amount) }));
        } catch (error) {
            console.error("Update Entry Error:", error);
            alert(`Error: ${error.message}`);
            throw error;
        }
    };

    const deleteEntry = async (id, type) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        try {
            await withTimeout(deleteDoc(doc(db, getDataPath(col), id)));
        } catch (error) {
            console.error("Delete Entry Error:", error);
            alert(`Error: ${error.message}`);
            throw error;
        }
    };

    return { revenue, pending, expenses, entries, loading, refreshFinance, addEntry, updateEntry, deleteEntry, setEntries };
};

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

    useEffect(() => {
        let unsubRevenue;
        let unsubExpenses;
        let unsubShopExpenses;
        let unsubFarmers;

        try {
            const qRevenue = query(collection(db, getDataPath("revenue")), orderBy("createdAt", "desc"));
            const qExpenses = query(collection(db, getDataPath("expenses")), orderBy("createdAt", "desc"));
            const qShopTrans = query(collection(db, getDataPath("shop_transactions")), orderBy("createdAt", "desc"));
            const qFarmers = query(collection(db, getDataPath("farmers")));

            const syncFinance = (revDocs, expDocs, shopDocs, farmerDocs) => {
                let totalRev = 0;
                let totalPending = 0;
                let totalExp = 0;
                const allEntries = [];

                // 1. Process Revenue Collection
                revDocs.forEach(doc => {
                    const data = doc.data();
                    const date = data.createdAt?.toDate() || new Date();
                    if (date.getFullYear().toString() === selectedYear) {
                        if (data.status === 'received') totalRev += Number(data.amount) || 0;
                        else totalPending += Number(data.amount) || 0;
                        allEntries.push({ id: doc.id, type: 'revenue', ...data });
                    }
                });

                // 2. Process Expenses Collection
                expDocs.forEach(doc => {
                    const data = doc.data();
                    const date = data.createdAt?.toDate() || new Date();
                    if (date.getFullYear().toString() === selectedYear) {
                        totalExp += Number(data.amount) || 0;
                        allEntries.push({ id: doc.id, type: 'expense', ...data });
                    }
                });

                // 3. Process Shop Transactions (Rent & Expenses)
                shopDocs.forEach(doc => {
                    const data = doc.data();
                    let itemYear = null;
                    if (data.date) itemYear = data.date.split('-')[0];
                    else if (data.createdAt?.seconds) itemYear = new Date(data.createdAt.seconds * 1000).getFullYear().toString();
                    
                    if (itemYear === selectedYear) {
                        if (data.type === 'Rent') {
                            totalRev += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'revenue', ...data, labelUr: `دکان کرایہ (${data.shopName || ''})` });
                        } else {
                            totalExp += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'shop_expense', ...data });
                        }
                    }
                });

                // 4. Process Farmers (Payments from History)
                farmerDocs.forEach(doc => {
                    const f = doc.data();
                    // Process history for revenue (actual payments)
                    if (f.history && Array.isArray(f.history)) {
                        f.history.forEach((h, idx) => {
                            const hYear = h.date?.split('-')[0];
                            if (hYear === selectedYear) {
                                totalRev += Number(h.amount) || 0;
                                allEntries.push({ 
                                    id: `${doc.id}_h_${idx}`, 
                                    type: 'revenue', 
                                    amount: h.amount, 
                                    date: h.date, 
                                    labelUr: `ادائیگی: ${f.nameUr}`,
                                    status: 'received'
                                });
                            }
                        });
                    }
                    // Process remaining balance for pending (weighted by current state)
                    // Note: This shows current global pending, fitting the dashboard's "Outstanding" intent
                    totalPending += Number(f.totalRemaining) || 0;
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

            unsubRevenue = onSnapshot(qRevenue, (s) => { lastRev = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer); });
            unsubExpenses = onSnapshot(qExpenses, (s) => { lastExp = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer); });
            unsubShopExpenses = onSnapshot(qShopTrans, (s) => { lastShop = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer); });
            unsubFarmers = onSnapshot(qFarmers, (s) => { lastFarmer = s.docs; syncFinance(lastRev, lastExp, lastShop, lastFarmer); });

        } catch (error) {
            console.error("Finance Sync Error:", error);
            setLoading(false);
        }

        return () => {
            if (unsubRevenue) unsubRevenue();
            if (unsubExpenses) unsubExpenses();
            if (unsubShopExpenses) unsubShopExpenses();
            if (unsubFarmers) unsubFarmers();
        };
    }, [selectedYear]);

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

    return { revenue, pending, expenses, entries, loading, addEntry, updateEntry, deleteEntry };
};

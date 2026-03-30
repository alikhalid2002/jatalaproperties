import { useState, useEffect } from 'react';
import { db } from './firebase';
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

        try {
            const qRevenue = query(collection(db, "revenue"), orderBy("createdAt", "desc"));
            const qExpenses = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
            const qShopTrans = query(collection(db, "shop_transactions"), orderBy("createdAt", "desc"));

            unsubRevenue = onSnapshot(qRevenue, (snapshot) => {
                const filteredRev = snapshot.docs.filter(doc => {
                    const date = doc.data().createdAt?.toDate() || new Date();
                    return date.getFullYear().toString() === selectedYear;
                });
                const revEntries = filteredRev.map(doc => ({ id: doc.id, type: 'revenue', ...doc.data() }));
                
                let totalRev = 0;
                let totalPending = 0;
                filteredRev.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'received') totalRev += Number(data.amount) || 0;
                    else totalPending += Number(data.amount) || 0;
                });
                
                setRevenue(totalRev);
                setPending(totalPending);
                setEntries(prev => [...revEntries, ...prev.filter(e => e.type !== 'revenue')].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            });

            // Aggregate both Operational and Shop Expenses
            const syncExpenses = (opExpDocs, shopExpDocs) => {
                let total = 0;
                const allEntries = [];

                opExpDocs.forEach(doc => {
                    const data = doc.data();
                    const date = data.createdAt?.toDate() || new Date();
                    if (date.getFullYear().toString() === selectedYear) {
                        total += Number(data.amount) || 0;
                        allEntries.push({ id: doc.id, type: 'expense', ...data });
                    }
                });

                shopExpDocs.forEach(doc => {
                    const data = doc.data();
                    // Shop expenses use .type === 'Expense'
                    if (data.type === 'Expense') {
                        let itemYear = null;
                        if (data.date) itemYear = data.date.split('-')[0];
                        else if (data.createdAt?.seconds) itemYear = new Date(data.createdAt.seconds * 1000).getFullYear().toString();
                        
                        if (itemYear === selectedYear) {
                            total += Number(data.amount) || 0;
                            allEntries.push({ id: doc.id, type: 'shop_expense', ...data });
                        }
                    }
                });

                setExpenses(total);
                setEntries(prev => [...allEntries, ...prev.filter(e => !['expense', 'shop_expense'].includes(e.type))].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
                setLoading(false);
            };

            // Double listener approach to keep global total synced
            let lastOpDocs = [];
            let lastShopDocs = [];

            unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
                lastOpDocs = snapshot.docs;
                syncExpenses(lastOpDocs, lastShopDocs);
            });

            unsubShopExpenses = onSnapshot(qShopTrans, (snapshot) => {
                lastShopDocs = snapshot.docs;
                syncExpenses(lastOpDocs, lastShopDocs);
            });

        } catch (error) {
            console.error("Finance Sync Error:", error);
            setLoading(false);
        }

        return () => {
            if (unsubRevenue) unsubRevenue();
            if (unsubExpenses) unsubExpenses();
            if (unsubShopExpenses) unsubShopExpenses();
        };
    }, [selectedYear]);

    const addEntry = async (type, data) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        await addDoc(collection(db, col), {
            ...data,
            createdAt: serverTimestamp(),
            amount: Number(data.amount)
        });
    };

    const updateEntry = async (id, type, data) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        const docRef = doc(db, col, id);
        await updateDoc(docRef, { ...data, amount: Number(data.amount) });
    };

    const deleteEntry = async (id, type) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        await deleteDoc(doc(db, col, id));
    };

    return { revenue, pending, expenses, entries, loading, addEntry, updateEntry, deleteEntry };
};

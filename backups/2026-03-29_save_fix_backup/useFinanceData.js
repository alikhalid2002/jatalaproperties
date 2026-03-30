import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';

export const useFinanceData = () => {
    const [revenue, setRevenue] = useState(0);
    const [pending, setPending] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubRevenue;
        let unsubExpenses;

        try {
            const qRevenue = query(collection(db, "revenue"));
            const qExpenses = query(collection(db, "expenses"));

            unsubRevenue = onSnapshot(qRevenue, (snapshot) => {
                let totalRev = 0;
                let totalPending = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'received') {
                        totalRev += Number(data.amount) || 0;
                    } else {
                        totalPending += Number(data.amount) || 0;
                    }
                });
                setRevenue(totalRev);
                setPending(totalPending);
            }, (error) => {
                console.error("Firebase Revenue Auth/Sync Error:", error);
            });

            unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
                let totalExp = 0;
                snapshot.docs.forEach(doc => {
                    totalExp += Number(doc.data().amount) || 0;
                });
                setExpenses(totalExp);
                setLoading(false);
            }, (error) => {
                console.error("Firebase Expenses Auth/Sync Error:", error);
                setLoading(false);
            });
        } catch (error) {
            console.error("Sync Firebase Init Error in useFinanceData:", error);
            setLoading(false);
        }

        return () => {
            if (unsubRevenue) unsubRevenue();
            if (unsubExpenses) unsubExpenses();
        };
    }, []);

    const addEntry = async (type, data) => {
        const col = type === 'expense' ? 'expenses' : 'revenue';
        await addDoc(collection(db, col), {
            ...data,
            createdAt: serverTimestamp(),
            amount: Number(data.amount)
        });
    };

    return { revenue, pending, expenses, loading, addEntry };
};

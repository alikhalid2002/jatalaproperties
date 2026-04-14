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

export const useSoldProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, getDataPath("sold_properties")), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Calculate derived values for UI
                totalPaid: (doc.data().installments || []).reduce((sum, inst) => sum + Number(inst.amount || 0), 0),
                remainingBalance: Number(doc.data().totalPrice || 0) - (doc.data().installments || []).reduce((sum, inst) => sum + Number(inst.amount || 0), 0),
            }));

            // Sync status if balance is zero
            data.forEach(async (prop) => {
                const currentStatus = prop.totalPaid >= Number(prop.totalPrice) ? 'Fully Paid' : 'Ongoing Installments';
                if (prop.status !== currentStatus) {
                    await updateDoc(doc(db, getDataPath("sold_properties"), prop.id), { status: currentStatus });
                }
            });

            setProperties(data);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const addProperty = async (data) => {
        await addDoc(collection(db, getDataPath("sold_properties")), {
            ...data,
            installments: [],
            status: 'Ongoing Installments',
            createdAt: serverTimestamp()
        });
    };

    const recordInstallment = async (propertyId, installment) => {
        const propRef = doc(db, getDataPath("sold_properties"), propertyId);
        const prop = properties.find(p => p.id === propertyId);
        const newInstallments = [...(prop.installments || []), { ...installment, id: Date.now().toString() }];
        
        await updateDoc(propRef, { 
            installments: newInstallments
        });
    };

    const deleteProperty = async (id) => {
        await deleteDoc(doc(db, getDataPath("sold_properties"), id));
    };

    const updateProperty = async (id, data) => {
        await updateDoc(doc(db, getDataPath("sold_properties"), id), data);
    };

    return { properties, loading, addProperty, recordInstallment, deleteProperty, updateProperty };
};

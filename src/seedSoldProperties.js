import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const seedSoldProperties = async () => {
    const properties = [
        {
            nameUr: 'پلاٹ #12 - بلاک بی',
            buyerName: 'محمد احمد',
            totalPrice: 2500000,
            status: 'Ongoing Installments',
            installments: [
                { id: '1', date: '2026-01-10', amount: 500000, method: 'Cash', remainingBalanceAfter: 2000000 },
                { id: '2', date: '2026-02-15', amount: 200000, method: 'Bank', remainingBalanceAfter: 1800000 }
            ]
        },
        {
            nameUr: 'کمرشل شاپ #5 - مین روڈ',
            buyerName: 'عثمان غنی',
            totalPrice: 4500000,
            status: 'Ongoing Installments',
            installments: [
                { id: '3', date: '2026-01-05', amount: 1500000, method: 'Cheque', remainingBalanceAfter: 3000000 }
            ]
        },
        {
            nameUr: 'پلاٹ #45 - سیکٹر ڈی',
            buyerName: 'ارسلان خان',
            totalPrice: 1200000,
            status: 'Fully Paid',
            installments: [
                { id: '4', date: '2026-01-20', amount: 1200000, method: 'Bank', remainingBalanceAfter: 0 }
            ]
        }
    ];

    try {
        for (const prop of properties) {
            await addDoc(collection(db, "sold_properties"), {
                ...prop,
                createdAt: serverTimestamp()
            });
        }
        console.log("Sold properties seeded successfully!");
    } catch (e) {
        console.error("Error seeding sold properties:", e);
    }
};

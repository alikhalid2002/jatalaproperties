import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const initialShops = [
  { name: 'شاپ نمبر 1', tenant: 'عرفان موبائل ہاؤس', rent: 15000, status: 'Paid', area: '12x15' },
  { name: 'شاپ نمبر 2', tenant: 'زبیر جنرل اسٹور', rent: 12000, status: 'Pending', area: '10x12' },
  { name: 'شاپ نمبر 3', tenant: 'عثمان کلاتھ ہاؤس', rent: 20000, status: 'Paid', area: '15x20' },
  { name: 'شاپ نمبر 4', tenant: 'حمزہ آٹو پارٹس', rent: 18000, status: 'Paid', area: '12x18' },
  { name: 'شاپ نمبر 5', tenant: 'طلحہ بیکری', rent: 25000, status: 'Pending', area: '20x25' },
];

export const seedShops = async () => {
  const querySnapshot = await getDocs(collection(db, getDataPath('shops')));
  if (querySnapshot.empty) {
    console.log("Seeding initial shops data...");
    for (const shop of initialShops) {
      await addDoc(collection(db, getDataPath('shops')), shop);
    }
  }
};

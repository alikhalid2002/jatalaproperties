import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const initialShops = [
  { name: 'Shop No. 1', tenant: 'Irfan Mobile House', rent: 15000, status: 'Paid', area: '12x15' },
  { name: 'Shop No. 2', tenant: 'Zubair General Store', rent: 12000, status: 'Pending', area: '10x12' },
  { name: 'Shop No. 3', tenant: 'Usman Cloth House', rent: 20000, status: 'Paid', area: '15x20' },
  { name: 'Shop No. 4', tenant: 'Hamza Auto Parts', rent: 18000, status: 'Paid', area: '12x18' },
  { name: 'Shop No. 5', tenant: 'Talha Bakery', rent: 25000, status: 'Pending', area: '20x25' },
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

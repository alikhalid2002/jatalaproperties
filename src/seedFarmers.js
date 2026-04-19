import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

export const initialFarmers = [
  {
    nameEn: "Rashid",
    nameUr: "راشد",
    landSize: 15,
    landUnit: "Acres",
    totalPayable: 900000,
    totalPaid: 900000,
    totalRemaining: 0,
    status: "Paid",
    history: [
      { date: "2026-01-15", amount: 900000, method: "Cash", note: "Initial Settlement" }
    ]
  }
];

export const seedFarmersData = async () => {
  const farmersCol = collection(db, getDataPath('farmers'));
  
  for (const farmer of initialFarmers) {
    const q = query(farmersCol, where("nameEn", "==", farmer.nameEn));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log(`Restoring missing member: ${farmer.nameEn}`);
      await addDoc(farmersCol, farmer);
    }
  }
};

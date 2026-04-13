import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const initialFarmers = [];

export const seedFarmersData = async () => {
  const farmersCol = collection(db, getDataPath('farmers'));
  const snapshot = await getDocs(farmersCol);
  
  if (snapshot.empty) {
    console.log('Seeding farmers data...');
    for (const farmer of initialFarmers) {
       await addDoc(farmersCol, farmer);
    }
    console.log('Seeding complete!');
  }
};

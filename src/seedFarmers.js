import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const initialFarmers = [
  { nameUr: 'محمد اسلم', nameEn: 'Muhammad Aslam', landSize: 30, landUnit: 'Acres', status: 'Pending', totalPaid: 50000, totalRemaining: 25000, history: [
    { date: '2024-03-22', amount: 50000, balance: 25000 }
  ]},
  { nameUr: 'اسلم خان', nameEn: 'Aslam Khan', landSize: 25, landUnit: 'Acres', status: 'Paid', totalPaid: 125000, totalRemaining: 0, history: [
    { date: '2024-03-15', amount: 50000, balance: 75000 },
    { date: '2024-03-20', amount: 75000, balance: 0 }
  ]},
  { nameUr: 'بشیر احمد', nameEn: 'Bashir Ahmad', landSize: 1.5, landUnit: 'Acres', status: 'Pending', totalPaid: 45000, totalRemaining: 15000, history: [
    { date: '2024-03-10', amount: 45000, balance: 15000 }
  ]},
  { nameUr: 'محمد رمضان', nameEn: 'Mohammad Ramzan', landSize: 40, landUnit: 'Acres', status: 'Paid', totalPaid: 200000, totalRemaining: 0, history: [
    { date: '2024-03-05', amount: 200000, balance: 0 }
  ]},
  { nameUr: 'عبدالستار', nameEn: 'Abdul Sattar', landSize: 8, landUnit: 'Acres', status: 'Pending', totalPaid: 30000, totalRemaining: 40000, history: [
    { date: '2024-03-12', amount: 30000, balance: 40000 }
  ]},
  { nameUr: 'غلام نبی', nameEn: 'Ghulam Nabi', landSize: 1.8, landUnit: 'Acres', status: 'Paid', totalPaid: 65000, totalRemaining: 0, history: [
    { date: '2024-03-18', amount: 65000, balance: 0 }
  ]},
  { nameUr: 'شفیق الرحمن', nameEn: 'Shafiq-ur-Rehman', landSize: 30, landUnit: 'Acres', status: 'Pending', totalPaid: 100000, totalRemaining: 50000, history: [
    { date: '2024-03-22', amount: 100000, balance: 50000 }
  ]},
  { nameUr: 'اللہ دتہ', nameEn: 'Allah Ditta', landSize: 22, landUnit: 'Acres', status: 'Paid', totalPaid: 110000, totalRemaining: 0, history: [
    { date: '2024-03-08', amount: 110000, balance: 0 }
  ]},
  { nameUr: 'نذیر احمد', nameEn: 'Nazir Ahmad', landSize: 10, landUnit: 'Acres', status: 'Pending', totalPaid: 25000, totalRemaining: 25000, history: [
    { date: '2024-03-14', amount: 25000, balance: 25000 }
  ]},
  { nameUr: 'مشتاق علی', nameEn: 'Mushtaq Ali', landSize: 2.2, landUnit: 'Acres', status: 'Paid', totalPaid: 85000, totalRemaining: 0, history: [
    { date: '2024-03-25', amount: 85000, balance: 0 }
  ]},
  { nameUr: 'خادم حسین', nameEn: 'Khadim Hussain', landSize: 35, landUnit: 'Acres', status: 'Pending', totalPaid: 150000, totalRemaining: 25000, history: [
    { date: '2024-03-21', amount: 150000, balance: 25000 }
  ]}
];

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

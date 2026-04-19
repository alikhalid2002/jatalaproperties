
import { db, getDataPath } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const restoreRashid = async () => {
  try {
    const farmersCol = collection(db, getDataPath('farmers'));
    const q = query(farmersCol, where("nameEn", "==", "Rashid"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("Rashid not found. Restoring...");
      await addDoc(farmersCol, {
        nameEn: "Rashid",
        nameUr: "راشد",
        landSize: 15,
        landUnit: "Acres",
        totalPayable: 900000,
        totalPaid: 900000,
        totalRemaining: 0,
        status: "Paid",
        theka: 60000,
        history: [
          { date: "2026-01-15", amount: 900000, method: "Cash", note: "Initial Settlement" }
        ]
      });
      console.log("Rashid restored successfully!");
    } else {
      console.log("Rashid already exists in the database.");
    }
  } catch (error) {
    console.error("Error restoring Rashid:", error);
  }
};

// This script needs to be run in the browser context or via a tool that has access to the app's firebase config.
// Since I can't run it directly against the production DB from here easily without a dev environment, 
// I'll add a temporary "Restore" button to the Settings page for the user to click, or just add him to the seed list and tell them to use the "Add Member" form.
// Actually, I'll just add him via a temporary useEffect in App.jsx.

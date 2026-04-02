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
  orderBy,
  Timestamp,
  where
} from 'firebase/firestore';

export const useReminders = () => {
    const [reminders, setReminders] = useState([]);
    const [activeReminders, setActiveReminders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, getDataPath('reminders')), 
            orderBy('targetDate', 'asc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReminders(list);
            
            // Filter active reminders for today or past that are unread
            const now = new Date();
            now.setHours(23, 59, 59, 999); // End of today
            
            const active = list.filter(r => {
                const target = r.targetDate?.toDate() || new Date();
                return target <= now && !r.isRead;
            });
            setActiveReminders(active);
            setLoading(false);
        });

        return unsub;
    }, []);

    const addReminder = async (reminderData) => {
        try {
            await addDoc(collection(db, getDataPath('reminders')), {
                ...reminderData,
                isRead: false,
                createdAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error("Error adding reminder:", error);
            return { success: false, error };
        }
    };

    const deleteReminder = async (id) => {
        try {
            await deleteDoc(doc(db, getDataPath('reminders'), id));
        } catch (error) {
            console.error("Error deleting reminder:", error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, getDataPath('reminders'), id), {
                isRead: true
            });
        } catch (error) {
            console.error("Error marking reminder as read:", error);
        }
    };

    return {
        reminders,
        activeReminders,
        loading,
        addReminder,
        deleteReminder,
        markAsRead
    };
};

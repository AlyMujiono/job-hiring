// service.ts (Perubahan: Tambah export firestore dan fungsi saveData)
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    addDoc,       // DITAMBAHKAN
    setDoc,       // DITAMBAHKAN
    updateDoc,    // DITAMBAHKAN
    deleteDoc,    // DITAMBAHKAN
    Timestamp     // DITAMBAHKAN
} from "firebase/firestore";
import app from "./init";

// EKSPOR instance firestore agar bisa diimpor dan digunakan di page.tsx
export const firestore = getFirestore(app) 

// Fungsi untuk mengambil semua data
export async function retrieveData(collectionName: string){
    const snapshot = await getDocs(collection(firestore, collectionName));
    const data = snapshot.docs.map((doc) => ({
        id:doc.id,
        ...doc.data(),
    }));

    return data;
}

// Fungsi untuk mengambil data berdasarkan ID
export async function retrieveDataById(collectionName: string, id:string){
    const snapshot = await getDoc(doc(firestore, collectionName, id));
    const data = snapshot.data();
    return data;
}

// FUNGSI BARU: Untuk menyimpan data dengan ID spesifik
export async function saveData(collectionName: string, jobData: any, id?: string): Promise<void> {
    const dataToSave = {
        ...jobData,
        createdAt: Timestamp.fromDate(new Date()), // Gunakan Timestamp Firestore
    };
    try {
        if(id){
            const docRef = doc(firestore, collectionName, id);
            await setDoc(docRef, dataToSave);
        } else {
            await addDoc(collection(firestore, collectionName), dataToSave);
        }
        
    } catch (e) {
        console.error("Gagal menambahkan dokumen ke Firestore dari service.ts: ", e);
        throw new Error("Gagal menyimpan data ke database Firebase.");
    }
}

// FUNGSI BARU: Untuk memperbarui data berdasarkan ID
export async function updateData(collectionName: string, id: string, updateData: any): Promise<void> {
    try {
        const docRef = doc(firestore, collectionName, id);
        await updateDoc(docRef, updateData);
    } catch (e) {
        console.error("Gagal memperbarui dokumen di Firestore dari service.ts: ", e);
        throw new Error("Gagal memperbarui data di database Firebase.");
    }
}

// FUNGSI BARU: Untuk menghapus data berdasarkan ID
export async function deleteData(collectionName: string, id: string): Promise<void> {
    try {
        const docRef = doc(firestore, collectionName, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Gagal menghapus dokumen di Firestore dari service.ts: ", e);
        throw new Error("Gagal menghapus data dari database Firebase.");
    }
}

// Opsional: Anda bisa memindahkan getJobOpenings ke sini juga.

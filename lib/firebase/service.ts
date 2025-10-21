import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from "firebase/firestore";
import app from "./init";

export const firestore = getFirestore(app)

export async function retrieveData(collectionName: string){
    const snapshot = await getDocs(collection(firestore, collectionName));
    const data = snapshot.docs.map((doc) => ({
        id:doc.id,
        ...doc.data(),
    }));

    return data;
}

export async function retrieveDataById(collectionName: string, id:string){
    const snapshot = await getDoc(doc(firestore, collectionName, id));
    const data = snapshot.data();
    return data;
}

export async function saveData(collectionName: string, jobData: any, id?: string): Promise<void> {
    const dataToSave = {
        ...jobData,
        createdAt: Timestamp.fromDate(new Date()),
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

export async function updateData(collectionName: string, id: string, updateData: any): Promise<void> {
    try {
        const docRef = doc(firestore, collectionName, id);
        await updateDoc(docRef, updateData);
    } catch (e) {
        console.error("Gagal memperbarui dokumen di Firestore dari service.ts: ", e);
        throw new Error("Gagal memperbarui data di database Firebase.");
    }
}

export async function deleteData(collectionName: string, id: string): Promise<void> {
    try {
        const docRef = doc(firestore, collectionName, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Gagal menghapus dokumen di Firestore dari service.ts: ", e);
        throw new Error("Gagal menghapus data dari database Firebase.");
    }
}

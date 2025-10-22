'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Bell, Clock, Briefcase, ChevronLeft, LogOut, Check } from 'lucide-react'; 
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/init';
// Import firestore, doc, getDoc, updateDoc
import { firestore } from '../../lib/firebase/service'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const db = firestore;

// ==========================================================
// 1. TIPE DATA & FUNGSIONALITAS FIREBASE
// ==========================================================

interface JobListing {
    id: string;
    jobName: string;
    status: 'Active' | 'Inactive' | 'Draft'; 
}

interface Candidate {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string; 
    domicile: string;
    gender: 'Male' | 'Female';
    linkedinLink: string;
    stage: 'Screening' | 'Interview' | 'Hired' | 'Rejected';
}

interface UserAuth {
    uid: string;
    email: string;
    role: 'admin' | 'user';
}

// FUNGSI UNTUK MENGUPDATE STATUS PEKERJAAN (Memperbaiki TypeError sebelumnya)
async function updateJobStatus(jobId: string, newStatus: 'Active' | 'Inactive' | 'Draft'): Promise<void> {
    if (!db) throw new Error("Database tidak terinisialisasi.");
    
    // Tentukan path koleksi secara terpisah dari ID
    const collectionPath = `artifacts/${appId}/public/data/job_openings`; 
    
    // Pemanggilan doc() yang benar: doc(db, collectionPath, documentId)
    const jobDocRef = doc(db, collectionPath, jobId); 
    
    // Gunakan updateDoc()
    await updateDoc(jobDocRef, { status: newStatus }); 
}

// Data Dummy Kandidat (Sama dengan kode Anda)
const dummyCandidatesList: Candidate[] = [
    { id: 'c1', fullName: 'Aurelie Yukiko', email: 'aurelieyukiko@yahoo.com', phoneNumber: '082120908766', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Female', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c2', fullName: 'Dityo Hendyawan', email: 'dityohendyawan@yaho...', phoneNumber: '081184180678', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Female', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c3', fullName: 'Mira Workman', email: 'miraworkman@yahoo.c...', phoneNumber: '081672007108', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Female', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c4', fullName: 'Paityn Culhane', email: 'paitynculhane@yaho...', phoneNumber: '081521500714', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c5', fullName: 'Emerson Baptista', email: 'emersonbaptista@yah...', phoneNumber: '082167008244', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c6', fullName: 'Indra Zein', email: 'indrazein@yahoo.com', phoneNumber: '081181630568', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c7', fullName: 'Joyce', email: 'joyce@yahoo.com', phoneNumber: '084288771015', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c8', fullName: 'Eriberto', email: 'eriberto@yahoo.com', phoneNumber: '083862419121', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c9', fullName: 'Javon', email: 'javon@yahoo.com', phoneNumber: '083283455502', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c10', fullName: 'Emory', email: 'emory@yahoo.com', phoneNumber: '087188286367', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c11', fullName: 'Ella', email: 'ella@yahoo.com', phoneNumber: '088306913834', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
    { id: 'c12', fullName: 'Sylvan', email: 'sylvan@yahoo.com', phoneNumber: '087752105228', dateOfBirth: '30 January 2001', domicile: 'Jakarta', gender: 'Male', linkedinLink: 'https://www.linkedin.com/in/use...', stage: 'Screening' },
];

const tableHeaders = [
    "NAMA LENGKAP", 
    "EMAIL ADDRESS", 
    "PHONE NUMBERS", 
    "DATE OF BIRTH", 
    "DOMICILE", 
    "GENDER", 
    "LINK LINKEDIN"
];

// Helper untuk kelas Status
const getStatusClasses = (status: JobListing['status']) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-700 border-green-300';
        case 'Inactive': return 'bg-red-100 text-red-700 border-red-300';
        case 'Draft': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
}

// ... (Komponen CandidateRow tetap sama)
const CandidateRow: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
    const formatLink = (link: string) => {
        if (!link) return '';
        if (link.length > 30) {
            return link.substring(0, 27) + '...';
        }
        return link;
    };
    
    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition duration-100">
            <td className="p-3">
                <input type="checkbox" className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
            </td>
            <td className="p-3 text-sm font-medium text-gray-800 whitespace-nowrap">{candidate.fullName}</td>
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{candidate.email}</td>
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{candidate.phoneNumber}</td>
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{candidate.dateOfBirth}</td>
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{candidate.domicile}</td>
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{candidate.gender}</td>
            <td className="p-3 text-sm text-teal-600 whitespace-nowrap hover:underline">
                <a href={candidate.linkedinLink} target="_blank" rel="noopener noreferrer">
                    {formatLink(candidate.linkedinLink)}
                </a>
            </td>
        </tr>
    );
};


// ==========================================================
// 3. HALAMAN MANAGE CANDIDATE
// ==========================================================

const ManageCandidatePage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const jobId = searchParams.get('jobId'); 
    const initialJobName = searchParams.get('jobName') || 'Front End Developer'; 

    const [user, setUser] = useState<UserAuth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // State untuk Job Status dan Name
    const [jobStatus, setJobStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active'); 
    const [jobName, setJobName] = useState(initialJobName); 
    const [candidates, setCandidates] = useState<Candidate[]>(dummyCandidatesList); 
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); 


    // Fetch Job Status & Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Simulasi/Ambil role
                const userDocRef = doc(db, 'users', currentUser.uid); 
                const userDoc = await getDoc(userDocRef);
                const role = userDoc.exists() ? userDoc.data().role : 'admin'; // Asumsi Admin untuk demo halaman ini
                
                const userAuth: UserAuth = { uid: currentUser.uid, email: currentUser.email!, role };
                setUser(userAuth);
                
                // Fetch status pekerjaan hanya jika Admin dan ada jobId
                if (userAuth.role === 'admin' && jobId) {
                    try {
                        const jobDocRef = doc(db, `artifacts/${appId}/public/data/job_openings`, jobId);
                        const jobDoc = await getDoc(jobDocRef);
                        if (jobDoc.exists()) {
                            const data = jobDoc.data();
                            setJobStatus(data.status || 'Active');
                            setJobName(data.jobName || initialJobName);
                        }
                    } catch (e) {
                        console.error("Gagal mengambil detail pekerjaan:", e);
                    }
                }
                
                // REDIRECT JIKA BUKAN ADMIN
                if (userAuth.role !== 'admin') {
                    router.push('/');
                    return;
                }

                setIsLoading(false);
            } else {
                router.push('/login');
            }
        });
        
        return () => unsubscribe();
    }, [router, jobId, initialJobName]);


    // FUNGSI UTAMA UNTUK MENGGANTI STATUS
    const handleToggleStatus = async (newStatus: 'Active' | 'Inactive') => {
        if (!jobId || !user || user.role !== 'admin' || isUpdatingStatus) return;

        setIsUpdatingStatus(true);
        try {
            await updateJobStatus(jobId, newStatus); // Menggunakan fungsi yang telah diperbaiki
            setJobStatus(newStatus); // Update local state on success
            // alert(`Status pekerjaan berhasil diubah menjadi ${newStatus}`);
        } catch (error) {
            console.error("Gagal mengubah status pekerjaan:", error);
            alert("Gagal mengubah status pekerjaan. Lihat console untuk detail.");
        } finally {
            setIsUpdatingStatus(false);
        }
    };
    
    const statusClasses = getStatusClasses(jobStatus);

    if (isLoading || !user || user.role !== 'admin') {
        // ... (Loading Spinner / Redirecting)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
            </div>
        );
    }
    
    const candidatesExist = candidates.length > 0; 
    
    // Tampilan Halaman Penuh Manage Candidate
    return (
        <div className="min-h-screen bg-gray-50">
             {/* Navbar */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end">
                    {/* ... (Navbar content: Bell, Avatar, Logout) */}
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-gray-500 p-2 rounded-full">
                            <Bell className="w-6 h-6" />
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.email}</span>
                            <span className="text-xs text-gray-500">({user.role})</span>
                        </div>
                        <button
                            onClick={() => signOut(auth).then(() => router.push('/login'))}
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Page (Breadcrumb - Sesuai Gambar) */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <button 
                            onClick={() => router.push('/')}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition mr-2"
                            title="Back to Job List"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        Job List 
                        <span className="mx-2 text-gray-400">/</span>
                        <span className="font-bold text-teal-600">Manage Candidate</span>
                    </h1>
                </div>

                {/* Judul Job dan Status Management (BARU) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                        <span>{jobName}</span>
                        {/* Status Badge (Hanya Admin yang melihat di halaman ini) */}
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${statusClasses}`}>
                            {jobStatus}
                        </span>
                    </h2>
                    
                    {/* Tombol Status Management (Hanya untuk Admin) */}
                    {user.role === 'admin' && jobStatus !== 'Draft' && ( 
                        <div className="mt-4 sm:mt-0">
                            {jobStatus === 'Active' ? (
                                <button
                                    onClick={() => handleToggleStatus('Inactive')}
                                    disabled={isUpdatingStatus}
                                    className="text-sm font-medium py-2 px-4 rounded-lg border transition duration-150 text-red-600 border-red-300 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isUpdatingStatus ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <X className="w-4 h-4 mr-1" />
                                    )}
                                    Set Inactive
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleToggleStatus('Active')}
                                    disabled={isUpdatingStatus}
                                    className="text-sm font-medium py-2 px-4 rounded-lg border transition duration-150 text-green-600 border-green-300 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isUpdatingStatus ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-1" />
                                    )}
                                    Set Active
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Content: Candidates List / Empty State */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {candidatesExist ? (
                        // List Kandidat (Sesuai Gambar)
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {/* Checkbox Header */}
                                        <th scope="col" className="p-3 text-left">
                                            <input type="checkbox" className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                        </th>
                                        {/* Kolom Header */}
                                        {tableHeaders.map((header, index) => (
                                            <th
                                                key={index}
                                                scope="col"
                                                className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {candidates.map(candidate => (
                                        <CandidateRow key={candidate.id} candidate={candidate} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        // Empty State (Sesuai Gambar)
                        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl">
                             <div className="relative mb-6">
                                <div className="w-24 h-24 bg-teal-50 border-2 border-teal-200 rounded-lg shadow-xl flex items-center justify-center transform rotate-3">
                                    <Briefcase className="w-10 h-10 text-teal-600" />
                                </div>
                                <div className="absolute -top-4 -right-2 bg-white p-2 rounded-full shadow-lg border border-gray-200 transform rotate-12">
                                    <Clock className="w-6 h-6 text-orange-500" />
                                </div>
                                <div className="absolute -bottom-4 -left-6 bg-white p-3 rounded-full shadow-lg border-2 border-red-300 transform -rotate-12">
                                    <X className="w-6 h-6 text-red-600 transform -rotate-12" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mt-2 mb-1">
                                No candidates found
                            </h3>
                            <p className="text-sm text-gray-500 text-center">
                                There are no candidates currently applying for this job.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ManageCandidatePage;
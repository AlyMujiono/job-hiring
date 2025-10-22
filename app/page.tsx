'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Bell, Briefcase, LogOut, Check } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase/init';
// Mengubah import firestore untuk menyertakan updateDoc, where, dan query
import { firestore, saveData } from '../lib/firebase/service';
import { collection, getDocs, QueryDocumentSnapshot, doc, getDoc, addDoc, where, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const db = firestore;

// ==========================================================
// 1. TIPE DATA & FUNGSIONALITAS FIREBASE
// ==========================================================

interface JobListing {
    id: string;
    jobName: string;
    jobType: string;
    minSalary: string;
    maxSalary: string;
    createdAt: any;
    status: 'Active' | 'Inactive' | 'Draft'; // Status pekerjaan
    description: string;
    numberOfCandidates: string;
    fullNameRequired: 'Mandatory' | 'Optional' | 'Off';
    photoProfileRequired: 'Mandatory' | 'Optional' | 'Off';
    genderRequired: 'Mandatory' | 'Optional' | 'Off';
    domicileRequired: 'Mandatory' | 'Optional' | 'Off';
    emailRequired: 'Mandatory' | 'Optional' | 'Off';
    phoneNumberRequired: 'Mandatory' | 'Optional' | 'Off';
    linkedinLinkRequired: 'Mandatory' | 'Optional' | 'Off';
    dateOfBirthRequired: 'Mandatory' | 'Optional' | 'Off';
}

interface UserAuth {
    uid: string;
    email: string;
    role: 'admin' | 'user';
}

// Fungsi untuk mengambil data pekerjaan (LOGIKA FILTER UTAMA)
async function getJobOpenings(userRole: 'admin' | 'user'): Promise<JobListing[]> {
    if (!db) return [];
    try {
        const jobsCollectionPath = `artifacts/${appId}/public/data/job_openings`;
        // Gunakan CollectionReference sebagai basis
        const jobsCollectionRef = collection(db, jobsCollectionPath);

        // Deklarasikan variabel untuk Query/CollectionReference. Gunakan 'any' 
        // untuk mengatasi TypeScript error saat menampung dua tipe yang berbeda.
        let jobsQuery: any = jobsCollectionRef; 

        // HANYA TAMPILKAN YANG ACTIVE UNTUK USER BIASA
        if (userRole === 'user') {
            // FIX: Gunakan query() dengan CollectionReference sebagai argumen pertama
            // Ini akan mengembalikan Query yang kemudian ditugaskan ke jobsQuery.
            jobsQuery = query(jobsCollectionRef, where('status', '==', 'Active'));
        }
        // ADMIN MENDAPATKAN SEMUA (Active, Inactive, Draft)

        const querySnapshot = await getDocs(jobsQuery); 
        
        const jobListings: JobListing[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot) => { 
            const data = doc.data();
            jobListings.push({
                id: doc.id,
                jobName: data.jobName || 'Unknown Job',
                jobType: data.jobType || 'N/A',
                minSalary: data.minSalary || '0',
                maxSalary: data.maxSalary || '0',
                createdAt: data.createdAt,
                status: data.status || 'Draft',
                description: data.description || '',
                numberOfCandidates: data.numberOfCandidates || '1',
                fullNameRequired: data.fullNameRequired || 'Mandatory',
                photoProfileRequired: data.photoProfileRequired || 'Optional',
                genderRequired: data.genderRequired || 'Mandatory',
                domicileRequired: data.domicileRequired || 'Optional',
                emailRequired: data.emailRequired || 'Mandatory',
                phoneNumberRequired: data.phoneNumberRequired || 'Mandatory',
                linkedinLinkRequired: data.linkedinLinkRequired || 'Optional',
                dateOfBirthRequired: data.dateOfBirthRequired || 'Mandatory',
            } as JobListing);
        });

        // Urutkan berdasarkan tanggal terbaru
        return jobListings.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
        });

    } catch (e) {
        console.error("Gagal mengambil data pekerjaan: ", e);
        return []; 
    }
}


// ... Fungsi lain seperti applyToJob, saveJobOpening (DIPERTAHANKAN)

async function applyToJob(jobId: string, userId: string, applicationData: any): Promise<void> {
    if (!db) throw new Error("Database tidak terinisialisasi.");
    const applicationsCollectionPath = `artifacts/${appId}/public/data/job_applications`;
    const dataToSave = {
        jobId,
        userId,
        ...applicationData,
        appliedAt: new Date(),
        status: 'Applied',
    };
    await addDoc(collection(db, applicationsCollectionPath), dataToSave);
}

async function saveJobOpening(jobData: any): Promise<void> {
    if (!db) throw new Error("Database tidak terinisialisasi.");
    const jobsCollectionPath = `artifacts/${appId}/public/data/job_openings`;
    const dataToSave = {
        ...jobData,
        createdAt: new Date(),
        status: 'Active', 
    };
    await saveData(jobsCollectionPath, dataToSave);
}

// ... LoadingSpinner, getStatusClasses, formatDate, formatSalary (DIPERTAHANKAN)
const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
);

const getStatusClasses = (status: JobListing['status']) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-700';
        case 'Inactive': return 'bg-red-100 text-red-700';
        case 'Draft': return 'bg-yellow-100 text-yellow-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

const formatDate = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return 'N/A';
    }
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const formatSalary = (num: string) => {
    const numberValue = parseInt(num) || 0;
    return numberValue.toLocaleString('id-ID');
}


// KOMPONEN JobCard (DIPERBAIKI: Hapus tombol toggle status)
interface JobCardProps {
    job: JobListing;
    onManageJob: (job: JobListing) => void;
    onApplyJob?: (job: JobListing) => void;
    userRole?: 'admin' | 'user';
}

const JobCard: React.FC<JobCardProps> = ({ job, onManageJob, onApplyJob, userRole }) => {
    const statusClasses = getStatusClasses(job.status);
    const formattedDate = formatDate(job.createdAt);
    const minSalary = `Rp ${formatSalary(job.minSalary)}`;
    const maxSalary = `Rp ${formatSalary(job.maxSalary)}`;

    return (
        <div className="border border-gray-200 bg-white shadow-sm rounded-xl py-4 flex justify-between items-start hover:shadow-md transition duration-150 px-4 cursor-pointer"
            onClick={userRole === 'admin' ? () => onManageJob(job) : onApplyJob ? () => onApplyJob(job) : undefined}
        >
            <div className="space-y-1 w-full">
                <div className="flex items-center space-x-3">
                    {/* Status Badge - TETAP DITAMPILKAN UNTUK ADMIN/USER (tapi user hanya melihat yang Active) */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses}`}>
                        {job.status}
                    </span>
                    {/* Tanggal Mulai */}
                    <span className="text-sm text-gray-500">
                        started on {formattedDate}
                    </span>
                </div>

                {/* Judul Pekerjaan */}
                <h3 className="text-xl font-semibold text-gray-800 pt-1">
                    {job.jobName}
                </h3>

                {/* Rentang Gaji */}
                <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{minSalary} - {maxSalary}</span>
                </p>
            </div>

            {/* Tombol Aksi */}
            {userRole === 'admin' ? (
                // ADMIN ACTIONS
                <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                    {/* Tombol MANAGE JOB */}
                    <button
                        className="self-center bg-teal-500 text-white text-sm font-medium py-1 px-3 rounded-lg hover:bg-teal-600 transition duration-150 shadow-sm"
                        onClick={(e) => { e.stopPropagation(); onManageJob(job); }}
                    >
                        Manage Job
                    </button>
                    {/* Tombol MANAGE STATUS DIHAPUS */}
                </div>
            ) : (
                // USER ACTION
                <button
                    className="self-center bg-blue-50 text-blue-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-blue-100 transition duration-150 shadow-sm border border-blue-200 flex-shrink-0 ml-4"
                    onClick={(e) => { e.stopPropagation(); onApplyJob && onApplyJob(job); }}
                >
                    Apply Now
                </button>
            )}
        </div>
    );
};


// ... JobOpeningModal dan SuccessToast (DIPERTAHANKAN)
interface JobOpeningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onSuccess: () => void; 
}

const initialFormState = {
    jobName: '', 
    jobType: '', 
    minSalary: '', 
    maxSalary: '', 
    location: '', 
    description: ``, 
    numberOfCandidates: '', 
    fullNameRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    photoProfileRequired: 'Optional' as 'Mandatory' | 'Optional' | 'Off',
    genderRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    domicileRequired: 'Optional' as 'Mandatory' | 'Optional' | 'Off',
    emailRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    phoneNumberRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    linkedinLinkRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    dateOfBirthRequired: 'Off' as 'Mandatory' | 'Optional' | 'Off',
};
type FormState = typeof initialFormState;


const JobOpeningModal: React.FC<JobOpeningModalProps> = ({ isOpen, onClose, onSave, onSuccess }) => {
    const [form, setForm] = useState<FormState>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setForm(initialFormState); 
            setSaveError('');
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/[^0-9]/g, '');
        setForm({ ...form, [name]: numericValue });
    };

    const handleRequirementChange = (field: keyof FormState, value: 'Mandatory' | 'Optional' | 'Off') => {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    const RequirementToggle: React.FC<{ field: keyof FormState, label: string }> = useCallback(({ field, label }) => (
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
            <span className="text-sm text-gray-700">{label}</span>
            <div className="flex space-x-2">
                {(['Mandatory', 'Optional', 'Off'] as const).map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => handleRequirementChange(field, option)}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full transition duration-150 w-24 text-center border-2 
                            ${form[field] === option 
                                ? 'bg-white text-teal-600 border-teal-600' 
                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    ), [form]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError('');
        setIsSaving(true);
        try {
            await onSave(form);
            onClose(); 
            onSuccess(); 
        } catch (error) {
            setSaveError("Gagal menyimpan data. Cek koneksi Firebase.");
            console.error("Submission failed:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-hidden transform transition-all duration-300 flex flex-col">
                
                {/* Header Modal */}
                <div className="flex-shrink-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-gray-800">Job Opening</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Form Konten (Scrollable Area) */}
                <form id="job-opening-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    
                    {/* Job Detail Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="jobName">Job Name*</label>
                            <input
                                id="jobName"
                                name="jobName"
                                type="text"
                                value={form.jobName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                                placeholder="Front End Developer"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="jobType">Job Type*</label>
                            <select
                                id="jobType"
                                name="jobType"
                                value={form.jobType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                            >
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Job Description*</label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={8} 
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
                                placeholder="- Develop, test, and maintain responsive, high-performance web applications..."
                            />
                        </div>
                    </div>

                    {/* Job Salary Section */}
                    <div className="space-y-4 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Candidate Needed*</label>
                        
                        <div className="">
                            <input
                                id="numberOfCandidates"
                                name="numberOfCandidates"
                                type="number"
                                value={form.numberOfCandidates}
                                onChange={handleChange}
                                required
                                min="1"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                            />
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-1 pt-2">Job Salary</label>

                        <div className="flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minSalary">Minimum Estimated Salary</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Rp</span>
                                    <input
                                        id="minSalary"
                                        name="minSalary"
                                        type="text"
                                        value={formatSalary(form.minSalary) || ''}
                                        onChange={handleSalaryChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                                        placeholder="7.000.000"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxSalary">Maximum Estimated Salary</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Rp</span>
                                    <input
                                        id="maxSalary"
                                        name="maxSalary"
                                        type="text"
                                        value={formatSalary(form.maxSalary) || ''} 
                                        onChange={handleSalaryChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                                        placeholder="8.000.000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Minimum Profile Information Required Section */}
                    <div className="space-y-1 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1 pb-2">Minimum Profile Information Required</label>
                        <div className="space-y-0">
                            <RequirementToggle label="Full name" field="fullNameRequired" />
                            <RequirementToggle label="Photo Profile" field="photoProfileRequired" />
                            <RequirementToggle label="Gender" field="genderRequired" />
                            <RequirementToggle label="Domicile" field="domicileRequired" />
                            <RequirementToggle label="Email" field="emailRequired" />
                            <RequirementToggle label="Phone number" field="phoneNumberRequired" />
                            <RequirementToggle label="LinkedIn link" field="linkedinLinkRequired" />
                            <RequirementToggle label="Date of birth" field="dateOfBirthRequired" />
                        </div>
                    </div>
                </form>

                {/* Footer / Submit Button */}
                <div className="flex-shrink-0 sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end items-center space-x-4">
                    {saveError && (
                        <p className="text-sm text-red-500 mr-4">{saveError}</p>
                    )}
                    <button
                        type="submit"
                        form="job-opening-form"
                        disabled={isSaving}
                        className={`py-2.5 px-6 rounded-lg font-semibold transition duration-300 shadow-lg text-white flex items-center justify-center
                            ${isSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
                    >
                        {isSaving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                        {isSaving ? 'Saving Job...' : 'Publish Job'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const SuccessToast: React.FC<{ isVisible: boolean, onClose: () => void }> = ({ isVisible, onClose }) => {
    return (
        <div 
            className={`fixed bottom-4 left-4 p-4 bg-white border border-green-200 rounded-lg shadow-xl flex items-center space-x-3 transition-transform duration-500 z-50
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        >
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">
                Job vacancy successfully created
            </p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};


const JobListPage: React.FC = () => {
    const [jobListings, setJobListings] = useState<JobListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<UserAuth | null>(null); 
    const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
    const [isToastVisible, setIsToastVisible] = useState(false); 
    
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Simulasi/ambil data role
                // Gunakan doc dan getDoc dari firebase/firestore untuk mengambil data
                const userDocRef = doc(db, 'users', currentUser.uid); 
                const userDoc = await getDoc(userDocRef);
                const role = userDoc.exists() ? userDoc.data().role : 'user';
                
                setUser({ uid: currentUser.uid, email: currentUser.email!, role });
                setUserRole(role);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // FUNGSI FETCH JOB YANG DIPERBARUI
    const handleJobFetch = useCallback(async (role: 'admin' | 'user') => {
        setIsLoading(true);
        try {
            const jobs = await getJobOpenings(role); // Meneruskan role ke fungsi fetch
            setJobListings(jobs);
        } catch (error) {
            console.error("Gagal mengambil data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userRole) {
            handleJobFetch(userRole);
        }
    }, [handleJobFetch, userRole]);

    const handleToastSuccess = () => {
        setIsToastVisible(true);
        const timer = setTimeout(() => {
            setIsToastVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
    };

    const handleSaveToDatabase = async (data: any) => {
        try {
            await saveJobOpening(data);
            if (userRole) await handleJobFetch(userRole); // Reload data setelah save
        } catch (error) {
            throw error;
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // FUNGSI HANDLE UPDATE STATUS DIHAPUS DARI SINI
    // Pindah ke ManageCandidatePage

    const handleApplyJob = async (job: JobListing) => {
        if (!user) return;
        try {
            await applyToJob(job.id, user.uid, {
                name: user.email, 
                email: user.email,
            });
            alert('Applied successfully!');
        } catch (error) {
            console.error('Apply failed:', error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    const filteredJobs = jobListings.filter(job =>
        job.jobName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // FUNGSI MANAGE JOB (NAVIAGASI)
    const handleManageJob = (job: JobListing) => {
        router.push(`/manage-candidate?jobId=${job.id}&jobName=${job.jobName}`);
    };
    
    return (
        <>
        <div className="min-h-screen bg-gray-50">
            {/* Navbar (DIPERTAHANKAN) */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                        Job List
                    </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-gray-500 p-2 rounded-full">
                            <Bell className="w-6 h-6" />
                        </button>
                        {user && (
                            <div className="flex items-center space-x-2">
                                {/* Avatar */}
                                <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm">
                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.email}</span>
                                <span className="text-xs text-gray-500">({userRole})</span>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Content */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center">
                    
                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="Search by job details"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-8">
                    {/* Job List / Empty State Area */}
                    <div className="flex-1 min-w-0 space-y-6 mb-8 lg:mb-0">
                        
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : jobListings.length === 0 ? (
                            // Empty State
                            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {userRole === 'admin' ? 'No job listings found' : 'No active job vacancies'}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    {userRole === 'admin' 
                                        ? 'Get started by creating a new job opening to recruit candidates.'
                                        : 'Please check back later for new openings.'
                                    }
                                </p>
                                {/* Tombol hanya untuk Admin */}
                                {userRole === 'admin' && (
                                    <button 
                                        onClick={openModal} 
                                        className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 shadow-md"
                                    >
                                        <span className="flex items-center">
                                            <Briefcase className="w-5 h-5 mr-2" />
                                            Create New Job
                                        </span>
                                    </button>
                                )}
                            </div>
                        ) : filteredJobs.length === 0 ? (
                            // Empty State (Filter/Search Result)
                            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results for "{searchTerm}"</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Try adjusting your search term or filters.
                                </p>
                                <button 
                                    onClick={() => setSearchTerm('')} 
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-300 shadow-sm text-sm"
                                >
                                    Clear Search
                                </button>
                            </div>
                        ) : (
                            // Job List
                            <div className="space-y-4">
                                {filteredJobs.map(job => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onManageJob={handleManageJob} 
                                        onApplyJob={handleApplyJob}
                                        userRole={userRole || undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar/Recruitment Card (Hanya untuk Admin) */}
                    {userRole === 'admin' && (
                        <div className="w-full lg:w-96 relative flex-shrink-0">
                            <div className="p-6 rounded-xl bg-gray-800 shadow-xl relative overflow-hidden h-fit sticky top-[80px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700 opacity-30"></div>

                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-white mb-3">Recruit the best candidates</h3>
                                    <p className="text-gray-300 text-sm mb-6">Create jobs, invite, and hire with ease</p>
                                    <button
                                        onClick={openModal}
                                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 w-full shadow-lg"
                                    >
                                        Create a new job
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>

        {/* Komponen Modal Job Opening */}
        <JobOpeningModal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            onSave={handleSaveToDatabase}
            onSuccess={handleToastSuccess} 
        />

        {/* Komponen Toast Sukses */}
        <SuccessToast
            isVisible={isToastVisible}
            onClose={() => setIsToastVisible(false)}
        />
        </>
    );
};

export default JobListPage;
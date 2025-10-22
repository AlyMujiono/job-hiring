'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Bell, Briefcase, LogOut, Check, MapPin } from 'lucide-react'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase/init';
import { firestore, saveData } from '../lib/firebase/service';
import { collection, getDocs, QueryDocumentSnapshot, doc, getDoc, addDoc, where, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// PENTING: Import komponen yang baru dibuat
import { JobDetailUserView, ApplicationFormPage } from '../app/manage-candidate/ApplicationFormPage'; 

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const db = firestore;

// ==========================================================
// 1. TIPE DATA & FUNGSIONALITAS FIREBASE (TIDAK BERUBAH)
// ... (Logika getJobOpenings, applyToJob, saveJobOpening, Tipe Data JobListing, dll.)
// ==========================================================

interface JobListing {
    id: string;
    jobName: string;
    jobType: string;
    minSalary: string;
    maxSalary: string;
    createdAt: any;
    status: 'Active' | 'Inactive' | 'Draft';
    description: string;
    numberOfCandidates: string;
    location: string; 
    companyName: string; 
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

async function getJobOpenings(userRole: 'admin' | 'user'): Promise<JobListing[]> {
    if (!db) return [];
    try {
        const jobsCollectionPath = `artifacts/${appId}/public/data/job_openings`;
        const jobsCollectionRef = collection(db, jobsCollectionPath);

        let jobsQuery: any = jobsCollectionRef;

        if (userRole === 'user') {
            jobsQuery = query(jobsCollectionRef, where('status', '==', 'Active'));
        }

        const querySnapshot = await getDocs(jobsQuery);

        const jobListings: JobListing[] = [];

        querySnapshot.forEach((doc: any) => {
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
                location: data.location || 'Remote', 
                companyName: data.companyName || '', 
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
        location: jobData.location || 'Remote', 
        companyName: jobData.companyName || '', 
    };
    await saveData(jobsCollectionPath, dataToSave);
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
);

const getStatusClasses = (status: JobListing['status']) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-700 border border-green-200';
        case 'Inactive': return 'bg-red-100 text-red-700 border border-red-200';
        case 'Draft': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        default: return 'bg-gray-100 text-gray-700 border border-gray-200';
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


// KOMPONEN JobCard - DIJAGA SEPERTI SEBELUMNYA
interface JobCardProps {
    job: JobListing;
    onManageJob: (job: JobListing) => void;
    onSelectJob: (job: JobListing) => void;
    userRole?: 'admin' | 'user';
    isSelected: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, onManageJob, onSelectJob, userRole, isSelected }) => {
    const minSalary = `Rp ${formatSalary(job.minSalary)}`;
    const maxSalary = `Rp ${formatSalary(job.maxSalary)}`;
    const statusClasses = getStatusClasses(job.status);
    const formattedDate = formatDate(job.createdAt);

    if (userRole === 'admin') {
        return (
            <div className="border border-gray-200 bg-white shadow-sm rounded-xl py-4 flex justify-between items-center hover:shadow-md transition duration-150 px-4 cursor-pointer"
                onClick={() => onManageJob(job)} 
            >
                <div className="space-y-1 w-full">
                    <div className="flex items-center space-x-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses}`}>
                            {job.status}
                        </span>
                        <span className="text-sm text-gray-500">
                            started on {formattedDate}
                        </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 pt-1">
                        {job.jobName}
                    </h3>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">{minSalary} - {maxSalary}</span>
                    </p>
                </div>
                <button
                    className="self-center bg-teal-500 text-white text-sm font-medium py-1 px-3 rounded-lg hover:bg-teal-600 transition duration-150 shadow-sm flex-shrink-0 ml-4"
                    onClick={(e) => { e.stopPropagation(); onManageJob(job); }}
                >
                    Manage Job
                </button>
            </div>
        );
    }

    const userCardClass = isSelected 
        ? 'border-teal-500 bg-teal-50 shadow-lg' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';

    return (
        <div className={`border shadow-sm rounded-xl py-4 transition duration-150 px-4 cursor-pointer ${userCardClass}`}
            onClick={() => onSelectJob(job)}
        >
            <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 ${isSelected ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'} rounded-lg flex items-center justify-center border border-gray-200 mt-0.5`}>
                    <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-800">
                        {job.jobName}
                    </h3>
                    <p className="text-xs text-gray-500">{job.companyName}</p>
                </div>
            </div>
            <div className="pt-2 pl-11 space-y-1">
                <div className="flex items-center text-xs text-gray-600 space-x-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{job.location}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                    Rp {formatSalary(job.minSalary)} - Rp {formatSalary(job.maxSalary)}
                </p>
            </div>
        </div>
    );
};


// JobOpeningModal, SuccessToast (TIDAK BERUBAH)
// ...

const initialFormState = {
    jobName: '', 
    jobType: '', 
    minSalary: '', 
    maxSalary: '', 
    location: '', 
    companyName: '', 
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


const JobOpeningModal: React.FC<any> = ({ isOpen, onClose, onSave, onSuccess }) => {
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
                <div className="flex-shrink-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-gray-800">Job Opening</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form id="job-opening-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="companyName">Company Name*</label>
                            <input id="companyName" name="companyName" type="text" value={form.companyName} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm" placeholder=""/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="jobName">Job Name*</label>
                            <input id="jobName" name="jobName" type="text" value={form.jobName} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm" placeholder=""/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="location">Location*</label>
                            <input id="location" name="location" type="text" value={form.location} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm" placeholder=""/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="jobType">Job Type*</label>
                            <select id="jobType" name="jobType" value={form.jobType} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white text-sm">
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Job Description*</label>
                            <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={8} required className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 resize-none text-sm" placeholder=""/>
                        </div>
                    </div>
                    <div className="space-y-4 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Candidate Needed*</label>
                        <div className="">
                            <input id="numberOfCandidates" name="numberOfCandidates" type="number" value={form.numberOfCandidates} onChange={handleChange} required min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"/>
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 pt-2">Job Salary</label>
                        <div className="flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minSalary">Minimum Estimated Salary</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Rp</span>
                                    <input id="minSalary" name="minSalary" type="text" value={formatSalary(form.minSalary) || ''} onChange={handleSalaryChange} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm" placeholder=""/>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxSalary">Maximum Estimated Salary</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Rp</span>
                                    <input id="maxSalary" name="maxSalary" type="text" value={formatSalary(form.maxSalary) || ''} onChange={handleSalaryChange} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm" placeholder=""/>
                                </div>
                            </div>
                        </div>
                    </div>
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
                <div className="flex-shrink-0 sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end items-center space-x-4">
                    {saveError && (<p className="text-sm text-red-500 mr-4">{saveError}</p>)}
                    <button type="submit" form="job-opening-form" disabled={isSaving} className={`py-2.5 px-6 rounded-lg font-semibold transition duration-300 shadow-lg text-white flex items-center justify-center ${isSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>
                        {isSaving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                        {isSaving ? 'Saving Job...' : 'Publish Job'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const SuccessToast: React.FC<any> = ({ isVisible, onClose }) => {
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
    const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
    
    // --- STATE BARU: Kontrol Tampilan ---
    const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
    // ------------------------------------

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
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

    const handleJobFetch = useCallback(async (role: 'admin' | 'user') => {
        setIsLoading(true);
        try {
            const jobs = await getJobOpenings(role); 
            setJobListings(jobs);
            if (role === 'user' && jobs.length > 0) {
                setSelectedJob(jobs[0]);
            } else if (role === 'user' && jobs.length === 0) {
                 setSelectedJob(null);
            }
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
            if (userRole) await handleJobFetch(userRole); 
        } catch (error) {
            throw error;
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // --- FUNGSI UTAMA PENGHUBUNG INI DIGANTI ---
    const handleApplyJob = (job: JobListing) => {
        setSelectedJob(job); // Pastikan job yang dipilih tersimpan
        setCurrentView('form'); // Ganti tampilan ke formulir
    };

    const handleFormSubmitSuccess = () => {
        // Logika setelah form disubmit (misalnya, tampilkan toast sukses)
        setCurrentView('list'); // Kembali ke tampilan daftar
        // Anda bisa menambahkan toast sukses di sini jika mau
    }

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    const filteredJobs = jobListings.filter(job =>
        job.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleManageJob = (job: JobListing) => {
        router.push(`/manage-candidate?jobId=${job.id}&jobName=${job.jobName}`);
    };

    const handleSelectJob = (job: JobListing) => {
        setSelectedJob(job);
    };

    // ==========================================================
    // RENDER KONDISIONAL
    // ==========================================================

    if (!userRole || isLoading) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <p className="ml-3 text-gray-700">Loading data...</p>
            </div>
        );
    }

    // --- RENDER HALAMAN FORMULIR APLIKASI ---
    if (currentView === 'form' && selectedJob) {
        return (
            <ApplicationFormPage 
                jobTitle={selectedJob.jobName}
                companyName={selectedJob.companyName}
                onBack={() => setCurrentView('list')} // Kembali ke list
                onSuccessSubmit={handleFormSubmitSuccess} // Kembali ke list setelah submit
                // Anda juga dapat meneruskan selectedJob untuk mendapatkan persyaratan form
            />
        );
    }
    
    // --- RENDER HALAMAN UTAMA JOB LIST (DEFAULT) ---
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
                <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className={`relative w-full ${userRole === 'admin' ? 'max-w-lg' : 'max-w-2xl mx-auto lg:mx-0'}`}> 
                        <input
                            type="text"
                            placeholder={userRole === 'admin' ? "Search by job details" : "Search by job name, location, or company..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>

                <div className={`flex flex-col ${userRole === 'admin' ? 'lg:flex-row-reverse lg:space-x-reverse lg:space-x-8' : 'lg:flex-row lg:space-x-8'}`}>
                    
                    {/* Kolom Kanan/Sidebar Area (Admin) atau Detail Job (User) */}
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
                            <button 
                                onClick={openModal} 
                                className="sm:hidden mt-4 w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300 shadow-md"
                            >
                                <span className="flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 mr-2" />
                                    Create New Job
                                </span>
                            </button>
                        </div>
                    )}
                    
                    {userRole === 'user' && (
                        <div className="flex-1 min-w-0 mt-8 lg:mt-0 lg:order-2">
                            {selectedJob ? (
                                // Tombol Apply di JobDetailUserView akan memanggil handleApplyJob
                                <JobDetailUserView job={selectedJob} onApply={handleApplyJob} /> 
                            ) : (
                                <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300 lg:sticky lg:top-[80px]">
                                    <p className="text-lg text-gray-500">Select a job from the list to view the details.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Kolom Kiri/Job List Area */}
                    <div className={`${userRole === 'user' ? 'w-full lg:w-1/3 min-w-[300px] max-w-full lg:sticky lg:top-[80px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto pr-2 lg:order-1' : 'flex-1 min-w-0 lg:order-1'} space-y-4 mb-8 lg:mb-0`}>

                        {isLoading ? (
                            <LoadingSpinner />
                        ) : jobListings.length === 0 || filteredJobs.length === 0 ? (
                            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {jobListings.length === 0 ? (userRole === 'admin' ? 'No job listings found' : 'No active job vacancies') : `No results for "${searchTerm}"`}
                                </h3>
                                {jobListings.length === 0 && userRole === 'admin' && (
                                    <button onClick={openModal} className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 shadow-md">
                                        <span className="flex items-center">
                                            <Briefcase className="w-5 h-5 mr-2" />
                                            Create New Job
                                        </span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {userRole === 'admin' && <h2 className="text-2xl font-bold text-gray-800 mb-4">Job List</h2>}
                                {filteredJobs.map(job => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onManageJob={handleManageJob}
                                        onSelectJob={handleSelectJob}
                                        userRole={userRole || undefined}
                                        isSelected={userRole === 'user' ? job.id === selectedJob?.id : false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>

        <JobOpeningModal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            onSave={handleSaveToDatabase}
            onSuccess={handleToastSuccess} 
        />

        <SuccessToast
            isVisible={isToastVisible}
            onClose={() => setIsToastVisible(false)}
        />
        </>
    );
};

export default JobListPage;
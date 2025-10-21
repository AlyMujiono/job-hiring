'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Bell, Users, Clock, Mail, Phone, Calendar, Globe, User, Image, Heart, Briefcase, ChevronLeft, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase/init';
import { firestore, saveData } from '../lib/firebase/service';
import { collection, getDocs, QueryDocumentSnapshot, doc, getDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const db = firestore;

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
    fullNameRequired: 'Mandatory' | 'Optional' | 'Off';
    photoProfileRequired: 'Mandatory' | 'Optional' | 'Off';
    genderRequired: 'Mandatory' | 'Optional' | 'Off';
    domicileRequired: 'Mandatory' | 'Optional' | 'Off';
    emailRequired: 'Mandatory' | 'Optional' | 'Off';
    phoneNumberRequired: 'Mandatory' | 'Optional' | 'Off';
    linkedinLinkRequired: 'Mandatory' | 'Optional' | 'Off';
    dateOfBirthRequired: 'Mandatory' | 'Optional' | 'Off';
}

interface Candidate {
    id: string;
    name: string;
    stage: 'Screening' | 'Interview' | 'Hired' | 'Rejected';
    appliedDate: string;
    email: string;
    phoneNumber: string;
    linkedin: string;
}

interface User {
    uid: string;
    email: string;
    role: 'admin' | 'user';
}

// Data Dummy Kandidat untuk simulasi
const dummyCandidates: Candidate[] = [
    { id: 'c1', name: 'John Doe', stage: 'Screening', appliedDate: '21 Oct 2025', email: 'john@example.com', phoneNumber: '0812...', linkedin: 'linkedin.com/in/john' },
    { id: 'c2', name: 'Jane Smith', stage: 'Interview', appliedDate: '19 Oct 2025', email: 'jane@example.com', phoneNumber: '0813...', linkedin: 'linkedin.com/in/jane' },
    { id: 'c3', name: 'Budi Santoso', stage: 'Screening', appliedDate: '18 Oct 2025', email: 'budi@example.com', phoneNumber: '0814...', linkedin: 'linkedin.com/in/budi' },
];

// Fungsi untuk apply to job (untuk user)
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
    // Tambahkan createdAt di sini agar sesuai dengan JobListing interface
    const dataToSave = {
        ...jobData,
        createdAt: new Date(),
        status: 'Active', // Default status ketika job baru dibuat
    };
    await saveData(jobsCollectionPath, dataToSave);
}

// Fungsi untuk mengambil data pekerjaan
async function getJobOpenings(): Promise<JobListing[]> {
    if (!db) return [];
    try {
        const jobsCollectionPath = `artifacts/${appId}/public/data/job_openings`;
        const jobsCollectionRef = collection(db, jobsCollectionPath);
        const querySnapshot = await getDocs(jobsCollectionRef); 
        
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

        // Sort di sisi klien (terbaru di atas)
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


const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
);

interface JobCardProps {
    job: JobListing;
    onManageJob: (job: JobListing) => void;
    onApplyJob?: (job: JobListing) => void;
    userRole?: 'admin' | 'user';
}

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
    // Format menjadi DD Mon YYYY (e.g., 21 Oct 2025)
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const formatSalary = (num: string) => {
    const numberValue = parseInt(num) || 0;
    return numberValue.toLocaleString('id-ID');
}

const JobCard: React.FC<JobCardProps> = ({ job, onManageJob, onApplyJob, userRole }) => {
    const statusClasses = getStatusClasses(job.status);
    const formattedDate = formatDate(job.createdAt);
    const minSalary = `Rp ${formatSalary(job.minSalary)}`;
    const maxSalary = `Rp ${formatSalary(job.maxSalary)}`;

    const handleClick = () => {
        if (userRole === 'admin') {
            onManageJob(job);
        } else if (userRole === 'user' && onApplyJob) {
            onApplyJob(job);
        }
    };

    return (
        <div className="border border-gray-200 bg-white shadow-sm rounded-xl py-4 flex justify-between items-center hover:shadow-md transition duration-150 px-4 cursor-pointer"
             onClick={handleClick}
        >
            <div className="space-y-1">
                <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses}`}>
                        {job.status}
                    </span>
                    {/* Tanggal Mulai */}
                    <span className="text-sm text-gray-500">
                        Date: {formattedDate}
                    </span>
                </div>

                {/* Judul Pekerjaan */}
                <h3 className="text-xl font-semibold text-gray-800 pt-1">
                    {job.jobName}
                </h3>

                {/* Rentang Gaji & Tipe */}
                <p className="text-sm text-gray-600">
                    <span className="font-medium text-teal-600">{minSalary} - {maxSalary}</span> / {job.jobType}
                </p>
            </div>

            {/* Tombol berdasarkan role */}
            {userRole === 'admin' ? (
                <button
                    className="self-center bg-teal-50 text-teal-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-teal-100 transition duration-150 shadow-sm border border-teal-200"
                    onClick={(e) => { e.stopPropagation(); onManageJob(job); }}
                >
                    Manage Job
                </button>
            ) : (
                <button
                    className="self-center bg-blue-50 text-blue-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-blue-100 transition duration-150 shadow-sm border border-blue-200"
                    onClick={(e) => { e.stopPropagation(); onApplyJob && onApplyJob(job); }}
                >
                    Apply Now
                </button>
            )}
        </div>
    );
};

interface JobOpeningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

const initialFormState = {
    jobName: '',
    jobType: 'Full-Time',
    minSalary: '',
    maxSalary: '',
    location: 'Remote/Jakarta', // Contoh placeholder
    description: '',
    numberOfCandidates: '1', 
    fullNameRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    photoProfileRequired: 'Optional' as 'Mandatory' | 'Optional' | 'Off',
    genderRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    domicileRequired: 'Optional' as 'Mandatory' | 'Optional' | 'Off',
    emailRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    phoneNumberRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
    linkedinLinkRequired: 'Optional' as 'Mandatory' | 'Optional' | 'Off',
    dateOfBirthRequired: 'Mandatory' as 'Mandatory' | 'Optional' | 'Off',
};
type FormState = typeof initialFormState;

const JobOpeningModal: React.FC<JobOpeningModalProps> = ({ isOpen, onClose, onSave }) => {
    const [form, setForm] = useState<FormState>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setForm(initialFormState); // Reset form saat modal ditutup
            setSaveError('');
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Hanya izinkan angka
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
                        className={`text-xs font-medium px-3 py-1 rounded-full transition duration-150 w-24 text-center
                            ${form[field] === option 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            onClose(); // Tutup modal setelah save berhasil
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto transform transition-all duration-300">
                
                {/* Header Modal */}
                <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-gray-800">Job Opening</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Form Konten */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Job Steering Section */}
                    <div className='space-y-4'>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Job Steering</h3>
                        {/* Job Name */}
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
                                placeholder="e.g., Senior Frontend Developer"
                            />
                        </div>

                        {/* Job Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="jobType">Job Type*</label>
                            <select
                                id="jobType"
                                name="jobType"
                                value={form.jobType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                            >
                                <option value="Full-Time">Full-time</option>
                                <option value="Part-Time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>

                        {/* Job Description (Textarea) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Job Description*</label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={6}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
                                placeholder="- Develop, test, and maintain responsive, high-performance web applications..."
                            />
                        </div>
                    </div>

                    {/* Job Salary Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Job Salary</h3>
                        {/* Number of Candidates */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="numberOfCandidates">Number of Candidate Needed*</label>
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
                        {/* Salary Range */}
                        <div className="flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minSalary">Minimum Estimated Salary (Rp)</label>
                                <input
                                    id="minSalary"
                                    name="minSalary"
                                    type="text"
                                    value={form.minSalary}
                                    onChange={handleSalaryChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    placeholder="7000000"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxSalary">Maximum Estimated Salary (Rp)</label>
                                <input
                                    id="maxSalary"
                                    name="maxSalary"
                                    type="text"
                                    value={form.maxSalary}
                                    onChange={handleSalaryChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    placeholder="8000000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Minimum Profile Information Required Section */}
                    <div className='space-y-1'>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 pt-4">Minimum Profile Information Required</h3>
                        <div className="space-y-0">
                            <RequirementToggle label="Full name" field="fullNameRequired" />
                            <RequirementToggle label="Photo Profile" field="photoProfileRequired" />
                            <RequirementToggle label="Gender" field="genderRequired" />
                            <RequirementToggle label="Domicile" field="domicileRequired" />
                            <RequirementToggle label="Email Address" field="emailRequired" />
                            <RequirementToggle label="Phone Number" field="phoneNumberRequired" />
                            <RequirementToggle label="LinkedIn Link" field="linkedinLinkRequired" />
                            <RequirementToggle label="Date of Birth" field="dateOfBirthRequired" />
                        </div>
                    </div>
                    
                    {saveError && (
                        <p className="text-sm text-red-500 text-center">{saveError}</p>
                    )}

                    {/* Footer / Submit Button */}
                    <div className="pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-3 px-6 rounded-lg font-semibold transition duration-300 shadow-lg flex items-center justify-center space-x-2
                                ${isSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                        >
                            {isSaving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                            {isSaving ? 'Saving Job...' : 'Publish Job Opening'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

interface ManageJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobListing | null;
}

const ManageJobModal: React.FC<ManageJobModalProps> = ({ isOpen, onClose, job }) => {
    if (!isOpen || !job) return null;

    // Placeholder untuk tampilan detail Job dan list kandidat
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto transform transition-all duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <ChevronLeft className="w-6 h-6 mr-2 text-gray-400 cursor-pointer hover:text-gray-600" onClick={onClose} />
                        Manage: {job.jobName}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Content: Job Info + Candidates List */}
                <div className="p-6">
                    <div className="bg-teal-50 p-4 rounded-lg mb-6">
                        <p className="text-sm font-semibold text-teal-700">Candidates Applied: {dummyCandidates.length}</p>
                    </div>
                    {/* Placeholder Table for Candidates */}
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Candidate List</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {dummyCandidates.map(candidate => (
                                    <tr key={candidate.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${candidate.stage === 'Screening' ? 'bg-yellow-100 text-yellow-800' : 
                                                  candidate.stage === 'Interview' ? 'bg-blue-100 text-blue-800' : 
                                                  candidate.stage === 'Hired' ? 'bg-green-100 text-green-800' : 
                                                  'bg-red-100 text-red-800'}`}>
                                                {candidate.stage}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.appliedDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <a href="#" className="text-teal-600 hover:text-teal-900">View Profile</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const JobListPage: React.FC = () => {
    const [jobListings, setJobListings] = useState<JobListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role;
                    setUser({ uid: currentUser.uid, email: currentUser.email!, role });
                    setUserRole(role);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleJobFetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const jobs = await getJobOpenings();
            setJobListings(jobs);
        } catch (error) {
            console.error("Gagal mengambil data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userRole) {
            handleJobFetch();
        }
    }, [handleJobFetch, userRole]);

    const handleSaveToDatabase = async (data: any) => {
        try {
            await saveJobOpening(data);
            await handleJobFetch(); // Reload data setelah save
        } catch (error) {
            throw error;
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleManageJob = (job: JobListing) => {
        setSelectedJob(job);
        setIsManageModalOpen(true);
    };
    const closeManageModal = () => {
        setIsManageModalOpen(false);
        setSelectedJob(null);
    };

    const handleApplyJob = async (job: JobListing) => {
        if (!user) return;
        // Simple apply - in real app, would have a form
        try {
            await applyToJob(job.id, user.uid, {
                name: user.email, // Placeholder
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

    return (
        <>
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold text-teal-600">RecruitPro</div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-gray-500 p-2 rounded-full">
                            <Bell className="w-6 h-6" />
                        </button>
                        <div className="flex items-center space-x-2">
                            {/* Avatar */}
                            <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.email}</span>
                            <span className="text-xs text-gray-500">({userRole})</span>
                        </div>
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
                        Job Listings
                    </h1>
                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="Search for job titles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:space-x-8">
                    {/* Job List / Empty State Area (Variable Width) */}
                    <div className="flex-1 min-w-0 space-y-6 mb-8 lg:mb-0">
                        
                        {/* Job List Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">Your Jobs ({filteredJobs.length} of {jobListings.length})</h2>
                            {/* Filter/Sort Placeholder */}
                            <div className="text-sm text-gray-500">
                                <span className="font-medium">Sort by:</span> Latest
                            </div>
                        </div>

                        {/* Konten Utama: Loading, Job List, atau Empty State */}
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : jobListings.length === 0 ? (
                            // Empty State (No Jobs) - Sesuai dengan desain umum
                            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No job listings found</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Get started by creating a new job opening to recruit candidates.
                                </p>
                                <button 
                                    onClick={openModal} 
                                    className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 shadow-md"
                                >
                                    <span className="flex items-center">
                                        <Briefcase className="w-5 h-5 mr-2" />
                                        Create New Job
                                    </span>
                                </button>
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

                    {/* Sidebar/Recruitment Card (Fixed Width) - Only for admin */}
                    {userRole === 'admin' && (
                        <div className="w-full lg:w-96 relative flex-shrink-0">
                            <div className="p-6 rounded-xl bg-gray-800 shadow-xl relative overflow-hidden h-fit sticky top-[80px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700 opacity-90"></div>

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
        />

        {/* Komponen Modal Manage Job */}
        <ManageJobModal
            isOpen={isManageModalOpen}
            onClose={closeManageModal}
            job={selectedJob}
        />
        </>
    );
};

export default JobListPage;
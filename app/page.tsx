'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Bell, Users, Clock, Mail, Phone, Calendar, Globe, User, Image, Heart, Briefcase, ChevronLeft } from 'lucide-react';
import { Auth, getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth'; 
import app from '../lib/firebase/init'; // Sesuaikan path jika folder Anda bernama 'firebase'
import { firestore, saveData } from '../lib/firebase/service'; // Sesuaikan path
import { collection, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';

// const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id'; 
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const db = firestore; 
const auth: Auth = getAuth(app); 

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
    status: 'Active' | 'Inactive' | 'Draft'; 
    // Field dari modal
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

// Data Dummy Kandidat untuk simulasi
const dummyCandidates: Candidate[] = [
    { id: 'c1', name: 'John Doe', stage: 'Screening', appliedDate: '21 Oct 2025', email: 'john@example.com', phoneNumber: '0812...', linkedin: 'linkedin.com/in/john' },
    { id: 'c2', name: 'Jane Smith', stage: 'Interview', appliedDate: '19 Oct 2025', email: 'jane@example.com', phoneNumber: '0813...', linkedin: 'linkedin.com/in/jane' },
    { id: 'c3', name: 'Budi Santoso', stage: 'Screening', appliedDate: '18 Oct 2025', email: 'budi@example.com', phoneNumber: '0814...', linkedin: 'linkedin.com/in/budi' },
];

// Fungsi untuk otentikasi
const authenticateUser = async () => {
    if (!auth) return;
    try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
            await signInWithCustomToken(auth, token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Authentication failed:", error);
    }
};

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


// ==========================================================
// 2. LOADING SPINNER COMPONENT
// ==========================================================

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
);

// ==========================================================
// 3. KOMPONEN JOB CARD
// ==========================================================

interface JobCardProps {
    job: JobListing;
    onManageJob: (job: JobListing) => void;
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

const JobCard: React.FC<JobCardProps> = ({ job, onManageJob }) => {
    const statusClasses = getStatusClasses(job.status);
    const formattedDate = formatDate(job.createdAt);
    const minSalary = `Rp ${formatSalary(job.minSalary)}`;
    const maxSalary = `Rp ${formatSalary(job.maxSalary)}`;

    return (
        <div className="border border-gray-200 bg-white shadow-sm rounded-xl py-4 flex justify-between items-center hover:shadow-md transition duration-150 px-4 cursor-pointer"
             onClick={() => onManageJob(job)} // Klik card untuk manage job
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

            {/* Tombol Manage Job */}
            <button 
                className="self-center bg-teal-50 text-teal-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-teal-100 transition duration-150 shadow-sm border border-teal-200"
                onClick={(e) => { e.stopPropagation(); onManageJob(job); }}
            >
                Manage Job
            </button>
        </div>
    );
};

// ==========================================================
// 3. KOMPONEN MODAL JOB OPENING
// ==========================================================

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
    location: '', // Tambahkan location jika relevan (tidak terlihat di gambar, tapi umum)
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
            // onClose dipanggil di handler induk
        } catch (error) {
            setSaveError("Gagal menyimpan data. Cek koneksi Firebase.");
            console.error("Submission failed:", error);
            throw error; 
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                            <RequirementToggle label="Email" field="emailRequired" />
                            <RequirementToggle label="Phone number" field="phoneNumberRequired" />
                            <RequirementToggle label="LinkedIn link" field="linkedinLinkRequired" />
                            <RequirementToggle label="Date of birth" field="dateOfBirthRequired" />
                        </div>
                    </div>


                    {/* Error Message */}
                    {saveError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {saveError}</span>
                        </div>
                    )}
                    
                    {/* Footer / Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6 rounded-b-xl">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-6 py-2 text-sm font-semibold text-white rounded-lg transition ${
                                isSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-md'
                            }`}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <div className="flex items-center">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...
                                </div>
                            ) : (
                                'Publish Job'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ==========================================================
// 4. KOMPONEN MANAGE JOB
// ==========================================================

interface ManageJobProps {
    job: JobListing;
    onBack: () => void;
}

// Komponen Kandidat List Item (sesuai tabel di gambar)
const CandidateListItem: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
    const getStageColor = (stage: Candidate['stage']) => {
        switch (stage) {
            case 'Screening': return 'bg-yellow-100 text-yellow-700';
            case 'Interview': return 'bg-blue-100 text-blue-700';
            case 'Hired': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    return (
        <tr className="border-b hover:bg-gray-50 transition duration-100">
            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center space-x-3">
                <User className='w-4 h-4 text-gray-400'/>
                <span>{candidate.name}</span>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageColor(candidate.stage)}`}>
                    {candidate.stage}
                </span>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{candidate.appliedDate}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                <a href={`mailto:${candidate.email}`} className='text-teal-600 hover:text-teal-800'>{candidate.email}</a>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{candidate.phoneNumber}</td>
            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                <a href={candidate.linkedin} target='_blank' rel='noopener noreferrer' className='text-teal-600 hover:text-teal-800'>Link</a>
            </td>
        </tr>
    );
}

// Komponen Manage Job
const ManageJobPage: React.FC<ManageJobProps> = ({ job, onBack }) => {
    const [candidates, setCandidates] = useState<Candidate[]>(dummyCandidates); // Gunakan data dummy
    const [viewMode, setViewMode] = useState<'Candidates' | 'Details'>('Candidates'); // Default lihat kandidat

    // Simulasikan kondisi: Ada kandidat (candidates.length > 0) atau Empty State
    const hasCandidates = candidates.length > 0;

    const CandidateListTable = () => (
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg mt-6">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Candidate Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stage
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Applied Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            LinkedIn
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {candidates.map(candidate => (
                        <CandidateListItem key={candidate.id} candidate={candidate} />
                    ))}
                </tbody>
            </table>
        </div>
    );

    const EmptyCandidateState = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-dashed border-gray-300 mt-6">
            <div className="w-40 h-40 mb-4 opacity-70">
                {/*  */}
                <img src="https://firebasestorage.googleapis.com/v0/b/chat-with-file-82d2f.appspot.com/o/empty-candidate-box.png?alt=media&token=c1a3b8d4-53c6-4d2d-9494-0e3a47b8e5c8" alt="No candidate found illustration" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No candidate found</h3>
            <p className="text-gray-500 text-sm">Please wait for candidates to apply to this job.</p>
        </div>
    );
    
    // Header Manage Job
    return (
        <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
            <header className="flex items-center space-x-4 mb-8">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-2 -ml-2 rounded-full transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Manage Job: <span className='text-teal-600'>{job.jobName}</span></h1>
            </header>

            <div className='flex space-x-4 border-b border-gray-200 mb-6'>
                <button 
                    onClick={() => setViewMode('Candidates')}
                    className={`pb-2 text-sm font-medium transition duration-150 ${viewMode === 'Candidates' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Manage Candidates ({candidates.length})
                </button>
                <button 
                    onClick={() => setViewMode('Details')}
                    className={`pb-2 text-sm font-medium transition duration-150 ${viewMode === 'Details' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Job Details
                </button>
            </div>
            
            {/* Konten Utama Manage Job */}
            <div className="max-w-7xl mx-auto">
                {viewMode === 'Candidates' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className='text-xl font-semibold text-gray-800 mb-4'>Job Candidates</h2>
                        {hasCandidates ? <CandidateListTable /> : <EmptyCandidateState />}
                    </div>
                )}
                {viewMode === 'Details' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
                        <h2 className='text-xl font-semibold text-gray-800'>Job Details & Requirements</h2>
                        <p className='text-gray-600 whitespace-pre-wrap'>{job.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className='flex items-center space-x-2'><Briefcase className='w-4 h-4 text-teal-500'/> <span>Type: {job.jobType}</span></div>
                            <div className='flex items-center space-x-2'><Clock className='w-4 h-4 text-teal-500'/> <span>Status: <span className={`font-semibold ${getStatusClasses(job.status)} px-2 rounded-full`}>{job.status}</span></span></div>
                            <div className='flex items-center space-x-2'><Users className='w-4 h-4 text-teal-500'/> <span>Needed: {job.numberOfCandidates} Candidates</span></div>
                            <div className='flex items-center space-x-2'><Heart className='w-4 h-4 text-teal-500'/> <span>Salary: Rp {formatSalary(job.minSalary)} - Rp {formatSalary(job.maxSalary)}</span></div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-800 pt-4 border-t mt-4">Required Candidate Information</h3>
                        <ul className='grid grid-cols-2 gap-3 text-sm'>
                            {Object.entries(job).filter(([key]) => key.endsWith('Required')).map(([key, value]) => (
                                <li key={key} className='flex justify-between'>
                                    <span className='text-gray-700'>{key.replace('Required', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className={`font-medium ${value === 'Mandatory' ? 'text-red-500' : value === 'Optional' ? 'text-yellow-600' : 'text-gray-400'}`}>{value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================================
// 5. KOMPONEN UTAMA (JobListPage)
// ==========================================================

const UserAvatar: React.FC<{ className?: string }> = ({ className = "w-8 h-8 rounded-full" }) => (
    <div className={`w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-700 text-sm ${className}`}>
        <User className='w-5 h-5'/>
    </div>
);


// Menggunakan export function biasa
export function JobListPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [jobs, setJobs] = useState<JobListing[]>([]); 
    const [showNotification, setShowNotification] = useState(false); 
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [activeJob, setActiveJob] = useState<JobListing | null>(null); // State untuk Manage Job

    // AUTHENTICATION & FETCHING SETUP
    useEffect(() => {
        authenticateUser().then(() => {
            setIsAuthReady(true);
        });
    }, []);

    const fetchJobs = useCallback(async () => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const jobList = await getJobOpenings();
        setJobs(jobList);
        setIsLoading(false);
    }, []);

    // 2. Fetch data setelah Auth siap
    useEffect(() => {
        if (isAuthReady) {
            fetchJobs();
        }
    }, [isAuthReady, fetchJobs]);


    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false); 
    const handleManageJob = (job: JobListing) => setActiveJob(job);
    const handleBackToJobList = () => setActiveJob(null);

    // Fungsi Handler untuk Menyimpan Data (memperbarui UI)
    const handleSaveToDatabase = async (jobData: FormState) => {
        try {
            await saveJobOpening(jobData);
            
            // Setelah sukses menyimpan:
            await fetchJobs(); // Ambil ulang data terbaru
            closeModal(); // Tutup modal
            
            // Tampilkan notifikasi sukses
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000); 

        } catch (error) {
            console.error("Gagal menyimpan data pekerjaan:", error);
            throw error; 
        }
    };
    
    const isEmpty = jobs.length === 0 && !isLoading;

    // Tampilkan Manage Job jika ada activeJob
    if (activeJob) {
        return <ManageJobPage job={activeJob} onBack={handleBackToJobList} />;
    }

    const MainContent = () => {
        if (isLoading) {
            return <LoadingSpinner />;
        }

        if (isEmpty) {
            return (
                <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center border border-dashed border-gray-300 p-8 rounded-xl bg-white shadow-sm">
                    <div className="relative w-full max-w-sm">
                         {/*  */}
                        <img 
                            src="https://firebasestorage.googleapis.com/v0/b/chat-with-file-82d2f.appspot.com/o/empty-state-job-list.png?alt=media&token=8d3b0e1e-2d5f-4d3f-8c3e-3f6e8d2e8b2e" 
                            alt="No job openings illustration"
                            className="w-full h-full object-contain max-h-40"
                        />
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">No job openings available</h2>
                    <p className="text-gray-500 mb-8 max-w-sm">Create a job opening now and start the candidate process.</p>
                </div>
            );
        }
        
        // Merender daftar pekerjaan
        return (
            <div className="space-y-3">
                {jobs.map(job => (
                    <JobCard key={job.id} job={job} onManageJob={handleManageJob} />
                ))}
            </div>
        );
    };

    return (
        <>
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-30 bg-white shadow-sm">
                <h1 className="text-2xl font-bold text-gray-800">Job List</h1>
                <div className="relative"> <UserAvatar /> </div>
            </header>

            {/* Notifikasi Sukses */}
            <div className={`transition-all duration-300 ${showNotification ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} sticky top-[69px] z-20`}>
                <div className="p-4 bg-white border-b border-green-200 shadow-md flex items-center justify-center">
                    <div className='flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg'>
                        <Bell className='w-5 h-5 text-green-600'/>
                        <span className="text-sm font-medium text-green-700">
                            Job vacancy successfully created!
                        </span>
                        <X 
                            className="w-4 h-4 text-green-500 cursor-pointer hover:text-green-700" 
                            onClick={() => setShowNotification(false)}
                        />
                    </div>
                </div>
            </div>

            <main className="px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Job List Section (Flex Grow) */}
                    <div className="lg:w-2/3 flex-shrink-0">
                        
                        {/* Search Bar */}
                        <div className="mb-8 flex items-center border border-gray-300 rounded-lg py-3 px-4 w-full shadow-sm bg-white hover:border-teal-400 transition duration-150">
                            <input
                                type="text"
                                placeholder="Search by job details"
                                className="flex-grow outline-none text-gray-700 placeholder-gray-400 text-base"
                            />
                            <Search className="w-5 h-5 text-teal-500 ml-3 cursor-pointer" />
                        </div>
                        
                        {/* Konten Utama: Job List atau Empty State */}
                        <MainContent />

                    </div>

                    {/* Sidebar/Recruitment Card (Fixed Width) */}
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
                </div>
            </main>
        </div>

        {/* Komponen Modal */}
        <JobOpeningModal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            onSave={handleSaveToDatabase}
        />
        </>
    );
};

export default JobListPage;
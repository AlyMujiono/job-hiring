'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Bell } from 'lucide-react';
import { Auth, getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth'; 
import app from '../lib/firebase/init'; // Sesuaikan path jika folder Anda bernama 'firebase'
import { firestore, saveData } from '../lib/firebase/service'; // Sesuaikan path
import { collection, getDocs, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';

// const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id'; 
// Ganti 'default-app-id' dengan nilai Environment Variable (seperti process.env.NEXT_PUBLIC_APP_ID)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const db = firestore; // GUNAKAN INSTANCE FIRESTORE YANG SUDAH DIINISIALISASI DI service.ts
const auth: Auth = getAuth(app); // Ambil auth menggunakan instance 'app' dari init.ts
interface JobListing {
    id: string;
    jobName: string;
    jobType: string;
    minSalary: string;
    maxSalary: string;
    createdAt: any; 
    status: 'Active' | 'Inactive' | 'Draft'; 
}

// Fungsi untuk otentikasi (Auth tetap, pastikan menggunakan 'auth' yang diambil di atas)
const authenticateUser = async () => {
    // ... (kode otentikasi tetap)
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
    // Gunakan fungsi saveData dari service.ts
    await saveData(jobsCollectionPath, jobData);
}

// Fungsi untuk mengambil data pekerjaan (Gunakan firestore instance)
async function getJobOpenings(): Promise<JobListing[]> {
    if (!db) return [];
    try {
        const jobsCollectionPath = `artifacts/${appId}/public/data/job_openings`;
        const jobsCollectionRef = collection(db, jobsCollectionPath);
        // Hapus import getDocs dan collection jika Anda memindahkan fungsi ini ke service.ts.
        // Jika tetap di sini, pastikan Anda mengimpor 'collection' dan 'getDocs' dari 'firebase/firestore'.
        // KARENA KODE ANDA SUDAH MENGIMPORNYA, KITA BIARKAN INI TETAP DI SINI.
        const querySnapshot = await getDocs(jobsCollectionRef); 
        
        const jobListings: JobListing[] = [];
        // ... (kode pengolahan data tetap)
        querySnapshot.forEach((doc: QueryDocumentSnapshot) => { // Perlu impor tipe QueryDocumentSnapshot
              const data = doc.data();
              jobListings.push({
                  id: doc.id,
                  jobName: data.jobName || 'Unknown Job',
                  jobType: data.jobType || 'N/A',
                  minSalary: data.minSalary || '0',
                  maxSalary: data.maxSalary || '0',
                  createdAt: data.createdAt,
                  status: data.status || 'Draft',
              } as JobListing);
        });

        // Sort di sisi klien 
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
// 2. KOMPONEN JOB CARD
// ==========================================================

interface JobCardProps {
    job: JobListing;
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
    return `started on ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
    const statusClasses = getStatusClasses(job.status);
    const formattedDate = formatDate(job.createdAt);
    
    const formatNumber = (num: string) => {
        const numberValue = parseInt(num) || 0;
        return numberValue.toLocaleString('id-ID');
    }

    const minSalary = `Rp ${formatNumber(job.minSalary)}`;
    const maxSalary = `Rp ${formatNumber(job.maxSalary)}`;

    return (
        <div className="border border-gray-100 bg-white shadow-sm rounded-xl py-4 flex justify-between items-start hover:shadow-md transition duration-150 px-4">
            <div className="space-y-1">
                <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses}`}>
                        {job.status}
                    </span>
                    {/* Tanggal Mulai */}
                    <span className="text-sm text-gray-500">
                        {formattedDate}
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
            <button className="self-center bg-white border border-gray-300 text-teal-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-gray-100 transition duration-150 shadow-sm">
                Manage Job
            </button>
        </div>
    );
};

// ==========================================================
// 3. KOMPONEN MODAL
// ==========================================================

interface JobOpeningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>; 
}

const JobOpeningModal: React.FC<JobOpeningModalProps> = ({ isOpen, onClose, onSave }) => {
    const initialFormState = {
        jobName: '',
        jobType: 'Full-Time',
        minSalary: '',
        maxSalary: '',
        location: '',
        description: '',
        // Tambahkan field yang terlihat di screenshot modal
        numberOfCandidates: '1', 
        fullNameRequired: 'Mandatory',
        photoProfileRequired: 'Optional',
        genderRequired: 'Mandatory',
        domicileRequired: 'Optional',
        emailRequired: 'Mandatory',
        phoneNumberRequired: 'Mandatory',
        linkedinLinkRequired: 'Optional',
        dateOfBirthRequired: 'Mandatory',
    };
    const [form, setForm] = useState(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Hanya izinkan angka
        const numericValue = value.replace(/[^0-9]/g, '');
        setForm({ ...form, [name]: numericValue });
    };

    const handleRequirementChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    const RequirementToggle: React.FC<{ field: keyof typeof initialFormState, label: string }> = ({ field, label }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <div className="flex space-x-2">
                {['Mandatory', 'Optional', 'Off'].map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => handleRequirementChange(field, option)}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition duration-150 
                            ${form[field] === option 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError('');
        setIsSaving(true);
        try {
            await onSave(form);
            setForm(initialFormState); // Reset form setelah sukses
            // onClose dipanggil di handler induk
        } catch (error) {
            setSaveError("Gagal menyimpan data. Cek koneksi Firebase.");
            console.error("Submission failed:", error);
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
                    
                    {/* Job Name & Type */}
                    <div className="space-y-4">
                        <label className="block text-base font-medium text-gray-800" htmlFor="jobName">Job Name*</label>
                        <input
                            id="jobName"
                            name="jobName"
                            type="text"
                            value={form.jobName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                            placeholder="e.g., Senior Frontend Developer"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="block text-base font-medium text-gray-800" htmlFor="jobType">Job Type*</label>
                        <select
                            id="jobType"
                            name="jobType"
                            value={form.jobType}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white"
                        >
                            <option value="Full-Time">Full-time</option>
                            <option value="Part-Time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>

                    {/* Job Description (Textarea) */}
                    <div className="space-y-2">
                        <label className="block text-base font-medium text-gray-800" htmlFor="description">Job Description*</label>
                        <textarea
                            id="description"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={8}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
                            placeholder="- Develop, test, and maintain responsive, high-performance web applications using modern front-end technologies..."
                        />
                    </div>
                    
                    {/* Number of Candidates */}
                    <div className="space-y-2">
                        <label className="block text-base font-medium text-gray-800" htmlFor="numberOfCandidates">Number of Candidate Needed*</label>
                        <input
                            id="numberOfCandidates"
                            name="numberOfCandidates"
                            type="number"
                            value={form.numberOfCandidates}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Salary Range */}
                    <h3 className="text-lg font-semibold text-gray-800 pt-4">Job Salary</h3>
                    <div className="flex space-x-4">
                        <div className="flex-1 space-y-2">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="minSalary">Minimum Estimated Salary (Rp)</label>
                            <input
                                id="minSalary"
                                name="minSalary"
                                type="text"
                                value={form.minSalary.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} // Tampilkan format rupiah
                                onBlur={(e) => setForm({...form, minSalary: e.target.value.replace(/\D/g, '')})}
                                onChange={handleSalaryChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                placeholder="7.000.000"
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="maxSalary">Maximum Estimated Salary (Rp)</label>
                            <input
                                id="maxSalary"
                                name="maxSalary"
                                type="text"
                                value={form.maxSalary.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} // Tampilkan format rupiah
                                onBlur={(e) => setForm({...form, maxSalary: e.target.value.replace(/\D/g, '')})}
                                onChange={handleSalaryChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                placeholder="8.000.000"
                            />
                        </div>
                    </div>

                    {/* Minimum Profile Information Required */}
                    <h3 className="text-lg font-semibold text-gray-800 pt-6">Minimum Profile Information Required</h3>
                    <div className="space-y-3 pt-2 pb-6 border-b border-gray-200">
                        <RequirementToggle label="Full name" field="fullNameRequired" />
                        <RequirementToggle label="Photo Profile" field="photoProfileRequired" />
                        <RequirementToggle label="Gender" field="genderRequired" />
                        <RequirementToggle label="Domicile" field="domicileRequired" />
                        <RequirementToggle label="Email" field="emailRequired" />
                        <RequirementToggle label="Phone number" field="phoneNumberRequired" />
                        <RequirementToggle label="LinkedIn link" field="linkedinLinkRequired" />
                        <RequirementToggle label="Date of birth" field="dateOfBirthRequired" />
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
// 4. HELPER COMPONENTS (DIADAPTASI UNTUK UI)
// ==========================================================
const SearchIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
);
const UserAvatar: React.FC<{ className?: string }> = ({ className = "w-8 h-8 rounded-full" }) => (
  <div className={` flex items-center justify-center font-bold ${className}`}>
    <div className="w-80 h-72 mb-4">
        {/* Menggunakan URL placeholder yang aman (atau SVG/Emoji jika memungkinkan) */}
        <img 
            src="/profile.png" 
            alt="profile"
            className="w-full h-full object-contain"
        />
    </div> 
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-10">
    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-teal-600" />
    <span className="text-gray-600">Loading Jobs...</span>
  </div>
);

// Placeholder yang lebih baik (Mengganti Next.js <Image>)
const EmptyStateIllustration: React.FC = () => (
    <div className="w-80 h-72 mb-4">
        {/* Menggunakan URL placeholder yang aman (atau SVG/Emoji jika memungkinkan) */}
        <img 
            src="/empty-state.png" 
            alt="No job openings illustration"
            className="w-full h-full object-contain"
        />
    </div>
);


// ==========================================================
// 5. KOMPONEN UTAMA (JobListPage)
// ==========================================================

// Menggunakan export function biasa untuk menghindari masalah Next/React di immersive
export function JobListPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobs, setJobs] = useState<JobListing[]>([]); 
  const [showNotification, setShowNotification] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // AUTHENTICATION & FETCHING SETUP
  useEffect(() => {
    // 1. Otentikasi
    authenticateUser().then(() => {
        setIsAuthReady(true);
    });
  }, []);

  // 2. Fetch data setelah Auth siap
  useEffect(() => {
    if (isAuthReady) {
        fetchJobs();
    }
  }, [isAuthReady]);


  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false); 

  // Fungsi untuk mengambil data pekerjaan
  const fetchJobs = async () => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const jobList = await getJobOpenings();
    setJobs(jobList);
    setIsLoading(false);
  };

  // Fungsi Handler untuk Menyimpan Data (memperbarui UI)
  const handleSaveToDatabase = async (jobData: any) => {
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
        // Lempar error agar modal tahu operasi gagal dan dapat menampilkan pesan error kustom
        throw error; 
    }
  };
  
  const isEmpty = jobs.length === 0 && !isLoading;

  const MainContent = () => {
    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center">
                <div className="relative w-full max-w-sm">
                    <EmptyStateIllustration />
                </div>
                
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No job openings available</h2>
                <p className="text-gray-500 mb-8 max-w-sm">Create a job opening now and start the candidate process.</p>

                <button 
                  onClick={openModal} 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300"
                >
                  Create a new job
                </button>
            </div>
        );
    }
    
    // Merender daftar pekerjaan
    return (
        <div className="max-w-3xl space-y-3">
            {jobs.map(job => (
                <JobCard key={job.id} job={job} />
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
          <div className="relative -mr-2"> <UserAvatar /> </div>
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
            
            <div className="flex-grow">
              
              {/* Search Bar */}
              <div className="mb-8 flex items-center border border-gray-300 rounded-lg py-3 px-4 w-full max-w-3xl shadow-sm bg-white hover:border-teal-400 transition duration-150">
                <input
                  type="text"
                  placeholder="Search by job details"
                  className="flex-grow outline-none text-gray-700 placeholder-gray-400 text-base"
                />
                <SearchIcon className="w-5 h-5 text-teal-500 ml-3 cursor-pointer" />
              </div>
              
              {/* Konten Utama: Job List atau Empty State */}
              <MainContent />

            </div>

            {/* Sidebar/Recruitment Card */}
            <div className="w-full lg:w-96 relative">
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
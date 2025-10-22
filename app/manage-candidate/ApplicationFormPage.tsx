'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeft, Camera, ChevronDown, Check, X, Loader2 } from 'lucide-react';

// Data statis untuk Dropdown
const domicileOptions = [
    { value: 'jakarta', label: 'Jakarta' },
    { value: 'bandung', label: 'Bandung' },
    { value: 'surabaya', label: 'Surabaya' },
    { value: 'yogyakarta', label: 'Yogyakarta' },
    { value: 'other', label: 'Lainnya' },
];

const countryCodes = [
    { code: '+62', country: 'ID' }, // Indonesia
    { code: '+1', country: 'US' },  // Amerika Serikat
    { code: '+44', country: 'UK' }, // Inggris
];

// ==========================================================
// KOMPONEN CUSTOM INPUTS (Diambil dari kode sebelumnya)
// ==========================================================

interface FormInputProps {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    className?: string;
}

const FormInput: React.FC<FormInputProps> = ({ id, label, type = 'text', placeholder, value, onChange, required = false, className = '' }) => (
    <div className={`space-y-1 ${className}`}>
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
            {label}{required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-base placeholder-gray-400"
        />
    </div>
);

interface DomicileSelectProps {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    required?: boolean;
}

const DomicileSelect: React.FC<DomicileSelectProps> = ({ id, label, options, value, onChange, required = false }) => (
    <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
            {label}{required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <select
                id={id}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-base appearance-none bg-white cursor-pointer"
            >
                <option value="" disabled>Choose your domicile</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

interface DateInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ id, label, value, onChange, required = false }) => (
    <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
            {label}{required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                type="date"
                id={id}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-base appearance-none bg-white"
                placeholder="Select date of birth"
            />
            <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

interface PhoneInputProps {
    id: string;
    label: string;
    countryCode: string;
    phoneNumber: string;
    onCodeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ id, label, countryCode, phoneNumber, onCodeChange, onNumberChange, required = false }) => (
    <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
            {label}{required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex border border-gray-300 rounded-lg focus-within:ring-1 focus-within:ring-teal-500">
            <div className="relative">
                <select
                    value={countryCode}
                    onChange={onCodeChange}
                    className="px-3 py-2.5 border-r border-gray-300 rounded-l-lg bg-gray-50 text-sm focus:outline-none appearance-none cursor-pointer text-gray-700"
                >
                    {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <input
                type="tel"
                id={id}
                placeholder="81XXXXXXXXXX"
                value={phoneNumber}
                onChange={onNumberChange}
                required={required}
                className="flex-1 w-full px-4 py-2.5 text-base placeholder-gray-400 rounded-r-lg focus:outline-none"
            />
        </div>
        <p className="text-xs text-gray-500 pl-1">Contoh: +62 81XXXXXXXXXX</p>
    </div>
);


// ==========================================================
// KOMPONEN UTAMA FORM APLIKASI
// ==========================================================

interface ApplicationFormPageProps {
    jobTitle: string;
    companyName: string;
    onBack: () => void;
    // Tambahkan prop lain yang diperlukan untuk integrasi data/persyaratan
    onSuccessSubmit: () => void;
}

const ApplicationFormPage: React.FC<ApplicationFormPageProps> = ({ jobTitle, companyName, onBack, onSuccessSubmit }) => {
    
    const [form, setForm] = useState({
        fullName: '',
        dateOfBirth: '',
        gender: '',
        domicile: '',
        countryCode: '+62',
        phoneNumber: '',
        email: '',
        linkedinLink: '',
    });
    const [photoProfile, setPhotoProfile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback((e: React.ChangeEvent<any>) => {
        const { id, value, name, type } = e.target;
        if (type === 'radio') {
            setForm(prev => ({ ...prev, [name]: value }));
        } else {
            setForm(prev => ({ ...prev, [id]: value }));
        }
    }, []);

    const handlePhoneCodeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, countryCode: e.target.value }));
    }, []);

    const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, phoneNumber: e.target.value.replace(/[^0-9]/g, '') }));
    }, []);

    const handlePhotoChange = (file: File | undefined) => {
        setPhotoProfile(file || null);
    };

    const handleTakeAPicture = () => {
        document.getElementById('photoUpload')?.click();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        console.log('Form Data to Submit:', form);

        // Simulasi API call/Firebase submission
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsSubmitting(false);
        onSuccessSubmit(); // Panggil fungsi success dari parent
    };

    const PhotoPlaceholder = (
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-md mx-auto">
            {photoProfile ? (
                <img src={URL.createObjectURL(photoProfile)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-white flex items-center justify-center text-gray-400">
                    <Camera className="w-8 h-8"/>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-start pt-10 pb-20">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
                
                {/* Header Form */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <button 
                                type="button"
                                onClick={onBack} 
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full transition"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-800">
                                Apply {jobTitle} at {companyName}
                            </h1>
                        </div>
                        <div className="text-xs text-gray-600 px-3 py-1 bg-blue-100 border border-blue-200 rounded-lg hidden sm:block">
                            This field required to fill
                        </div>
                    </div>
                    <p className="text-sm font-medium text-red-500">* Required</p>
                </div>

                {/* Body Form */}
                <form id="job-application-form" onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Photo Profile Section */}
                    <div className="space-y-3 pb-3 border-b border-gray-100">
                        <label className="block text-sm font-semibold text-gray-700">Photo Profile</label>
                        <div className="text-center">
                            {PhotoPlaceholder}
                        </div>
                        <div className="text-center">
                            <input
                                type="file"
                                id="photoUpload"
                                accept="image/*"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoChange(e.target.files?.[0])}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={handleTakeAPicture}
                                className="inline-flex items-center text-sm font-semibold text-orange-500 hover:text-orange-600 transition"
                            >
                                <Camera className="w-4 h-4 mr-1" />
                                Take a Picture
                            </button>
                        </div>
                    </div>

                    {/* Input Fields */}
                    <FormInput id="fullName" label="Full name" placeholder="Enter your full name" value={form.fullName} onChange={handleChange} required={true}/>
                    <DateInput id="dateOfBirth" label="Date of Birth" value={form.dateOfBirth} onChange={handleChange} required={true}/>
                    
                    {/* Pronoun (Gender) - Radio Buttons */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Pronoun (gender)*
                        </label>
                        <div className="flex space-x-6">
                            <label className="inline-flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="gender" value="She/her (Female)" checked={form.gender === 'She/her (Female)'} onChange={handleChange} required className="h-5 w-5 text-teal-600 border-gray-300 focus:ring-teal-500"/>
                                <span className="text-base text-gray-700">She/her (Female)</span>
                            </label>
                            <label className="inline-flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="gender" value="He/Him (Male)" checked={form.gender === 'He/Him (Male)'} onChange={handleChange} required className="h-5 w-5 text-teal-600 border-gray-300 focus:ring-teal-500"/>
                                <span className="text-base text-gray-700">He/Him (Male)</span>
                            </label>
                        </div>
                    </div>

                    <DomicileSelect id="domicile" label="Domicile" options={domicileOptions} value={form.domicile} onChange={handleChange} required={true}/>
                    <PhoneInput id="phoneNumber" label="Phone Number" countryCode={form.countryCode} phoneNumber={form.phoneNumber} onCodeChange={handlePhoneCodeChange} onNumberChange={handlePhoneNumberChange} required={true}/>
                    <FormInput id="email" label="Email" type="email" placeholder="Enter your email address" value={form.email} onChange={handleChange} required={true}/>
                    <FormInput id="linkedinLink" label="Link Linkedin" placeholder="https://linkedin.com/in/username" value={form.linkedinLink} onChange={handleChange} required={true} type="url"/>
                </form>

                {/* Footer / Submit Button */}
                <div className="p-6 pt-0">
                    <button
                        type="submit"
                        form="job-application-form"
                        disabled={isSubmitting}
                        className={`w-full py-3.5 rounded-lg font-bold text-lg transition duration-300 shadow-md flex items-center justify-center space-x-2 
                            ${isSubmitting ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <span>Submit</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Buat placeholder untuk JobDetailUserView jika belum ada di tempat lain
interface Job {
    jobName: string;
    companyName: string;
    jobType: string;
    location: string;
    minSalary: string;
    maxSalary: string;
    description: string;
}

interface JobDetailUserViewProps {
    job: Job;
    onApply: (job: any) => void;
}

const JobDetailUserView: React.FC<JobDetailUserViewProps> = ({ job, onApply }) => (
    <div className="p-6 bg-white rounded-xl shadow-lg sticky top-[80px]">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{job.jobName}</h2>
        <p className="text-md font-semibold text-teal-600 mb-4">{job.companyName}</p>
        <div className="flex items-center justify-between">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">{job.jobType}</span>
            <button
                onClick={() => onApply(job)}
                className="px-6 py-2 text-md font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition shadow-md"
            >
                Apply!
            </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">{job.location}</p>
        <p className="text-lg font-bold text-gray-800 mt-2">Rp {job.minSalary} - Rp {job.maxSalary}</p>

        <h3 className="text-xl font-bold text-gray-800 mt-6 mb-2">Job Description</h3>
        <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 pl-4">
            {job.description.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => <li key={index}>{line.trim()}</li>)}
        </ul>
    </div>
);

export { JobDetailUserView, ApplicationFormPage };
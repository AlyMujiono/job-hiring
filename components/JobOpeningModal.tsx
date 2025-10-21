// components/JobOpeningModal.tsx
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

// Tipe data untuk status input profil
type ProfileStatus = 'Mandatory' | 'Optional' | 'Off';

// Tipe data untuk struktur formulir
interface JobFormState {
  jobName: string;
  jobType: string;
  jobDescription: string;
  candidateCount: number;
  minSalary: string;
  maxSalary: string;
  profileRequirements: Record<string, ProfileStatus>;
}

interface JobOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: JobFormState) => Promise<void>; // Fungsi simpan ke Firebase
}

const JobOpeningModal: React.FC<JobOpeningModalProps> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  // Inisialisasi State Formulir (Meniru input dari gambar)
  const [formData, setFormData] = useState<JobFormState>({
    jobName: '',
    jobType: '',
    jobDescription: 
      '',
    candidateCount: 1,
    minSalary: '',
    maxSalary: '',
    profileRequirements: {
      fullName: 'Mandatory',
      photoProfile: 'Mandatory',
      gender: 'Mandatory',
      domicile: 'Mandatory',
      email: 'Mandatory',
      phoneNumber: 'Mandatory',
      linkedinLink: 'Mandatory',
      dateOfBirth: 'Mandatory',
    },
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (field: string, status: ProfileStatus) => {
    setFormData(prev => ({
      ...prev,
      profileRequirements: {
        ...prev.profileRequirements,
        [field]: status,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose(); // Tutup modal setelah berhasil disimpan
    } catch (error) {
      console.error("Failed to save job opening:", error);
      alert("Gagal menyimpan. Cek konsol untuk detail.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper untuk Tombol Mandatory/Optional/Off
  const ProfileToggle: React.FC<{ field: keyof typeof formData.profileRequirements }> = ({ field }) => {
    const status = formData.profileRequirements[field];

    const getButtonClass = (buttonStatus: ProfileStatus) => {
      const base = 'px-3 py-1 text-sm font-medium rounded-md transition duration-150 ';
      if (status === buttonStatus) {
        if (buttonStatus === 'Mandatory') return base + 'bg-blue-500 text-white shadow';
        if (buttonStatus === 'Optional') return base + 'bg-yellow-500 text-white shadow';
        if (buttonStatus === 'Off') return base + 'bg-red-500 text-white shadow';
      }
      return base + 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    };

    return (
      <div className="flex space-x-2">
        {(['Mandatory', 'Optional', 'Off'] as ProfileStatus[]).map(buttonStatus => (
          <button
            key={buttonStatus}
            type="button"
            onClick={() => handleProfileChange(field, buttonStatus)}
            className={getButtonClass(buttonStatus)}
          >
            {buttonStatus}
          </button>
        ))}
      </div>
    );
  };
  
  const profileFields = [
      { id: 'fullName', label: 'Full name' },
      { id: 'photoProfile', label: 'Photo Profile' },
      { id: 'gender', label: 'Gender' },
      { id: 'domicile', label: 'Domicile' },
      { id: 'email', label: 'Email' },
      { id: 'phoneNumber', label: 'Phone number' },
      { id: 'linkedinLink', label: 'Linkedin link' },
      { id: 'dateOfBirth', label: 'Date of birth' },
  ] as const;


  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] mx-4 my-8 bg-white rounded-xl shadow-2xl flex flex-col`}>
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-20">
            <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold text-gray-800">
                    Job Opening
                </h2>
                <button 
                    onClick={onClose} 
                    className="text-gray-400 hover:text-gray-600 transition p-1"
                    aria-label="Close modal"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Modal Body (Scrollable Content) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-grow z-10">
            
            {/* 1. Job Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 required-label">Job Name*</label>
                <input 
                  type="text" 
                  name="jobName"
                  value={formData.jobName}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" 
                  required
                />
            </div>
            
            {/* 2. Job Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 required-label">Job Type*</label>
                <select 
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm appearance-none bg-white"
                  required
                >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                </select>
            </div>
            
            {/* 3. Job Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 required-label">Job Description*</label>
                <textarea 
                    rows={10}
                    name="jobDescription"
                    value={formData.jobDescription}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm resize-none font-mono"
                    required
                />
            </div>

            {/* 4. Number of Candidate Needed */}
            <div>
                <label className="block text-sm font-medium text-gray-700 required-label">Number of Candidate Needed*</label>
                <input 
                  type="number" 
                  name="candidateCount"
                  value={formData.candidateCount}
                  onChange={handleChange}
                  min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" 
                  required
                />
            </div>
            
            {/* 5. Salary Range */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Estimated Salary</label>
                 <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">Rp</span>
                    <input 
                      type="text" 
                      name="minSalary"
                      value={formData.minSalary}
                      onChange={handleChange}
                      placeholder="0" 
                      className="flex-1 block w-full rounded-none rounded-r-md border border-gray-300 p-2 text-sm" 
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Estimated Salary</label>
                 <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">Rp</span>
                    <input 
                      type="text" 
                      name="maxSalary"
                      value={formData.maxSalary}
                      onChange={handleChange}
                      placeholder="0" 
                      className="flex-1 block w-full rounded-none rounded-r-md border border-gray-300 p-2 text-sm" 
                    />
                </div>
              </div>
            </div>

            {/* 6. Profile Requirements */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Minimum Profile Information Required</h3>
              
              <div className="space-y-3">
                {profileFields.map((field) => (
                  <div key={field.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    <ProfileToggle field={field.id} />
                  </div>
                ))}
              </div>
            </div>

        </div>
        
        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-200 flex justify-end space-x-3 bg-white rounded-b-xl sticky bottom-0 z-20">
          <button 
            onClick={onClose} 
            className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className={`bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-600'}`}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobOpeningModal;
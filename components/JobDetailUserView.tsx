import React from 'react';
import { Briefcase, MapPin } from 'lucide-react';

// Re-defining the essential JobListing interface 
interface JobListing {
    id: string;
    jobName: string;
    jobType: string;
    minSalary: string;
    maxSalary: string;
    description: string;
    location: string;
    companyName: string;
}

interface JobDetailUserViewProps {
    job: JobListing;
    onApply: (job: JobListing) => Promise<void>;
}

// Helper function to format salary
const formatSalary = (num: string) => {
    const numberValue = parseInt(num) || 0;
    return numberValue.toLocaleString('id-ID');
}

// Helper function untuk memformat deskripsi ke dalam list/paragraf
const formatDescription = (desc: string) => {
    const items = desc.split(/[\n]|- /).filter(item => item.trim() !== '');

    if (items.length > 1) {
        let listContent = items;
        if (items[0].toLowerCase().includes('responsibilities') || items[0].toLowerCase().includes('requirements')) {
            listContent = items.slice(1);
        }

        return (
            <ul className="list-disc list-inside space-y-2 text-gray-700">
                {listContent.map((item, index) => (
                    <li key={index} className="pl-1 leading-relaxed">{item.trim()}</li>
                ))}
            </ul>
        );
    }

    return <p className="text-gray-700 whitespace-pre-line">{desc}</p>;
};


const JobDetailUserView: React.FC<JobDetailUserViewProps> = ({ job, onApply }) => {
    
    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full lg:sticky lg:top-[80px] lg:h-[calc(100vh-100px)] flex flex-col">
            
            {/* Header Detail Pekerjaan (Fixed Top) */}
            <div className="flex-shrink-0 p-6 border-b border-gray-100 flex justify-between items-start space-x-4">
                <div className="flex items-start space-x-3">
                    {/* Ikon Perusahaan (Simulasi) */}
                    <div className="flex-shrink-0 w-10 h-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center border border-teal-200 mt-0.5">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{job.jobName}</h2>
                        <p className="text-gray-500 font-medium">{job.companyName}</p>
                    </div>
                </div>

                {/* Tombol Apply */}
                <button
                    onClick={() => onApply(job)}
                    className="flex-shrink-0 bg-yellow-500 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition duration-150 shadow-md"
                >
                    Apply!
                </button>
            </div>

            {/* Sub-Header / Metadata Pekerjaan (Fixed Top) */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100 flex items-center space-x-4 text-sm text-gray-600">
                {/* Job Type */}
                <span className="font-medium px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                    {job.jobType}
                </span>
                
                {/* Lokasi */}
                <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{job.location}</span>
                </div>
            </div>

            {/* Rentang Gaji */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100 flex items-center space-x-4 text-sm font-semibold text-gray-800">
                 <p>
                    Rp{formatSalary(job.minSalary)} - Rp{formatSalary(job.maxSalary)}
                </p>
            </div>


            {/* Deskripsi Pekerjaan (Scrollable) */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Job Description</h3>
                <div className="text-base">
                    {formatDescription(job.description)}
                </div>
            </div>
        </div>
    );
};

export default JobDetailUserView;
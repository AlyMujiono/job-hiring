import React from 'react';

interface JobCardProps {
    job: any;
}

const getStatusClasses = (status: any['status']) => {
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
    
    const minSalary = `Rp ${job.minSalary}`;
    const maxSalary = `Rp ${job.maxSalary}`;

    return (
        <div className="border-b border-gray-200 py-4 flex justify-between items-start hover:bg-gray-50 transition duration-150 px-2 -mx-2">
            <div className="space-y-1">
                <div className="flex items-center space-x-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses}`}>
                        {job.status}
                    </span>
                    <span className="text-sm text-gray-500">
                        {formattedDate}
                    </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-800">
                    {job.jobName}
                </h3>

                <p className="text-sm text-gray-600">
                    {minSalary} - {maxSalary}
                </p>
            </div>

            <button className="bg-white border border-gray-300 text-teal-600 text-sm font-medium py-1 px-3 rounded-lg hover:bg-gray-100 transition duration-150">
                Manage Job
            </button>
        </div>
    );
};

export default JobCard;
// WarningBanner - Reusable warning/info banner component
// 
// Example usage:
// <WarningBanner type="warning" icon={Layers}>
//   Go to project settings and select a test setup
// </WarningBanner>

import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

const WarningBanner = ({ 
    children, 
    type = 'warning', 
    icon: CustomIcon,
    className = '' 
}) => {
    const baseClasses = 'flex items-start gap-3 p-4 rounded-lg border mb-4';
    
    const typeClasses = {
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };

    const Icon = CustomIcon || (type === 'warning' ? AlertCircle : Info);

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
                {children}
            </div>
        </div>
    );
};

export default WarningBanner;

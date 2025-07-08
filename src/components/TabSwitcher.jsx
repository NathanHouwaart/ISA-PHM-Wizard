// src/components/TabSwitcher.js
import React from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

const TabSwitcher = ({ selectedTab, onTabChange, tabs }) => {
    return (
        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-300 mb-4 shadow-sm">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === tab.id
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};


export const TabPanel = ({ isActive, children }) => {
    return (
        <div
            className={`transition-opacity overflow-hidden duration-500 ease-in-out ${isActive ? 'opacity-100 max-h-[9999px]' : 'opacity-0 max-h-0'
                }`}
        >
            {children}
        </div>
    );
};


export default TabSwitcher;

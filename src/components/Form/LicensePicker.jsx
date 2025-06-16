import React, { useEffect, useState, useRef } from 'react';
import { getLicenses } from '../../services/api';
import Fuse from 'fuse.js';

function LicensePicker({
    value,
    onChange,
    onBlur,
    placeholder,
    required,
    className
}) {
    const [licenses, setLicenses] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [fuse, setFuse] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false); // State to control suggestions list visibility

    useEffect(() => {
        const loadLicenses = async () => {
            try {
                const response = await getLicenses();
                setLicenses(response);
                
                const fuseInstance = new Fuse(response, {
                    keys: ["name", "licenseId"],
                    threshold: 0.3, // lower = more strict
                });
                setFuse(fuseInstance);
            } catch(err){
                console.error("Failed to fetch license list", err);
            }
        };
        loadLicenses();
    }, []);

    useEffect(() => {
        if (value.length > 0 && fuse) {
            const result = fuse.search(value, { limit: 10 });
            setSuggestions(result.map((r) => r.item));
            setShowSuggestions(result.length > 0); 
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [value, fuse]);

    // Handle clicking on a suggestion
    const handleSelect = (license) => {
        onChange(license.name);     // Updates the form data with the selected license name
        setSuggestions([]);         // Clears suggestions from display
        setShowSuggestions(false);  // Hides the suggestions list
    };

    // Handles when the input gains focus
    const handleInputFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    // Handles when the input loses focus with a slight delay in order to execute functions
    const handleInputBlur = (e) => {
        onBlur(e.target.value);
        setTimeout(() => {
            setShowSuggestions(false);
        }, 100); 
    };

    return (
        // The 'group' class is no longer strictly needed for focus-within logic but can remain for other styling
        <div className="relative group flex-1 w-full mr-6">
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className={`${className} w-full`} // Retaining your original class application
                onFocus={handleInputFocus} // NEW: Handles input focus
                onBlur={(e) => handleInputBlur(e)}   // NEW: Handles input blur with delay
            />

            {/* Conditionally render suggestions based on showSuggestions state */}
            {suggestions.length > 0 && showSuggestions && (
                <ul className="absolute mt-1 ml-6 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-30 overflow-y-auto">
                    {suggestions.map((license) => (
                        <li
                            key={license.licenseId}
                            className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                            onClick={() => handleSelect(license)} // Removed e.stopPropagation(), not needed with this approach
                        >
                            {license.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default LicensePicker;
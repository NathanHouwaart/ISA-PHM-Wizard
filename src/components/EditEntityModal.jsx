import React, { useState, useEffect } from 'react';

/**
 * Generic edit modal for entities (variables, processing protocols, ...)
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSave: (data) => void
 * - initialData: object
 * - fields: [{ name, label, type='text'|'select'|'textarea'|'number', options?: array }]
 * - title: string
 */
const EditEntityModal = ({ isOpen, onClose, onSave, initialData = {}, fields = [], title = 'Edit' }) => {
    const [tempData, setTempData] = useState(initialData || {});

    useEffect(() => {
        setTempData(initialData || {});
    }, [initialData]);

    const handleChange = (name, value) => {
        setTempData(prev => ({ ...prev, [name]: value }));
    };

    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        handleChange(name, type === 'checkbox' ? checked : value);
    };

    const handleSave = () => {
        onSave && onSave(tempData);
        onClose && onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 p-0 rounded-md bg-black/25 flex items-center justify-center z-50 overflow-auto">
            <div style={{ scale: 0.98 }} className="bg-white rounded-lg m-0 shadow-xl p-6 w-full max-w-lg transform transition-transform duration-200 ease-out">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">{title}</h3>
                <p className="text-center text-sm text-gray-600 mb-4">Edit the fields below and press Save Changes.</p>

                <div className="space-y-4">
                    {fields.map((f) => {
                        const value = tempData?.[f.name] ?? '';
                        const key = `field-${f.name}`;
                        if (f.type === 'textarea') {
                            return (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <textarea name={f.name} value={value} onChange={handleInput} rows={f.rows || 3} className="w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                            );
                        }

                        if (f.type === 'select') {
                            return (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <select name={f.name} value={value} onChange={handleInput} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                        {(f.options || []).map(opt => {
                                            if (typeof opt === 'object') return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                                            return <option key={opt} value={opt}>{opt}</option>;
                                        })}
                                    </select>
                                </div>
                            );
                        }

                        // default: text / number / checkbox
                        if (f.type === 'checkbox') {
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <input id={key} name={f.name} type="checkbox" checked={!!value} onChange={handleInput} />
                                    <label htmlFor={key} className="text-sm text-gray-700">{f.label}</label>
                                </div>
                            );
                        }

                        return (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                <input name={f.name} value={value} onChange={handleInput} type={f.type || 'text'} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditEntityModal;

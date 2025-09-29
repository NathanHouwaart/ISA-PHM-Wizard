import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FormField from './Form/FormField';

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

    const handleSave = () => {
        onSave && onSave(tempData);
        onClose && onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        // Use a fixed overlay so the modal is pinned to the viewport.
        // Constrain the inner panel's height and make it scrollable so
        // large content (or tooltips) doesn't push the modal out of view.
        <div className="fixed inset-0 p-0 bg-black/25 flex items-center justify-center z-50" role="dialog" aria-modal="true">
            <div style={{ scale: 0.98 }} className="bg-white rounded-lg m-0 shadow-xl p-6 w-full max-w-lg transform transition-transform duration-200 ease-out max-h-[calc(100vh-4rem)] overflow-auto">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">{title}</h3>
                <p className="text-center text-sm text-gray-600 mb-4">Edit the fields below and press Save Changes.</p>

                <div className="space-y-4">
                    {fields.map((f) => {
                        const value = tempData?.[f.name] ?? '';
                        const key = `field-${f.name}`;

                        // onChange expects a DOM event from FormField inputs
                        const onChange = (e) => {
                            if (!e || !e.target) return;
                            const { name, value: v, type } = e.target;
                            if (type === 'number') {
                                handleChange(name, v === '' ? '' : Number(v));
                            } else {
                                handleChange(name, v);
                            }
                        };


                        return (
                            <div key={key}>
                                <FormField
                                    name={f.name}
                                    label={f.label}
                                    type={f.type || 'text'}
                                    value={value}
                                    onChange={onChange}
                                    required={f.required}
                                    placeholder={f.placeholder}
                                    tags={f.options}
                                    explanation={f.explanation}
                                    example={f.example}
                                />
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

    return createPortal(modalContent, document.body);
};

export default EditEntityModal;

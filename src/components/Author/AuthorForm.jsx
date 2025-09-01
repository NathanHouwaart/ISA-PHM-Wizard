import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

import authorsFormFields from "../../data/AuthorFormFields.json"
import FormField from "../Form/FormField";
import { TagInput } from "../Form/TagInput";
import TooltipButton from "../Widgets/TooltipButton";
import { v4 as uuid } from "uuid";
import { ArbitraryTagInput } from "../Form/ArbitraryTagInput";

export const AuthorForm = ({ item, onSave, onCancel, isEditing = false }) => {

    const [formData, setFormData] = useState({
        id: item?.id || '',
        firstName: item?.firstName || '',
        midInitials: item?.midInitials || '',
        lastName: item?.lastName || '',
        email: item?.email || '',
        phone: item?.phone || '',
        fax: item?.fax || '',
        role: item?.role || '',
        address: item?.address || '',
        orcid: item?.orcid || '',
        affiliations: item?.affiliations || [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.role.trim()) {
            alert('Please fill in all required fields (First Name, Last Name, Email, Role)');
            return;
        }

        const authorData = {
            ...formData,
            id: isEditing && item.id ? item.id : uuid(), // Generate a new ID if not editing
        };

        onSave(authorData);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddAffiliation = (affiliation) => {
        setFormData(prevData => ({
            ...prevData,
            affiliations: [...(prevData.affiliations || []), affiliation]
        }));
    };

    const handleRemoveAffiliation = (affiliationToRemove) => {
        setFormData(prevData => ({
            ...prevData,
            affiliations: prevData.affiliations.filter(affiliation => affiliation !== affiliationToRemove)
        }));
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Edit Author' : 'Add new Author'}
                    </h3>
                    <TooltipButton
                        className="p-2 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={onCancel}
                        tooltipText="Close"
                    >
                        <X className="w-5 h-5" />
                    </TooltipButton>
                </div>
            </div>

            <div className="px-6 space-y-1">
                {/* Group First Name, Mid Initials, Last Name */}
                <div className='pt-2 grid grid-cols-3 gap-x-8'>

                    <FormField
                        name={"firstName"}
                        onChange={handleChange}
                        value={formData.firstName}
                        label="First Name"
                        type='text'
                        placeholder="First Name"
                        required
                    />

                    <FormField
                        name={"midInitials"}
                        onChange={handleChange}
                        value={formData.midInitials}
                        label="Mid Initials"
                        type='text'
                        placeholder="Mid Initials"
                    />

                    <FormField
                        name={"lastName"}
                        onChange={handleChange}
                        value={formData.lastName}
                        label="Last Name"
                        type='text'
                        placeholder="Last Name"
                        required
                    />

                </div>

                {/* Grid for other fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">

                    <FormField
                        name={"email"}
                        onChange={handleChange}
                        value={formData.email}
                        label="Email"
                        type='email'
                        placeholder="Email"
                    />

                    <FormField
                        name={"phone"}
                        onChange={handleChange}
                        value={formData.phone}
                        label="Phone"
                        type='tel'
                        placeholder="Phone"
                    />

                    <FormField
                        name={"fax"}
                        onChange={handleChange}
                        value={formData.fax}
                        label="Fax"
                        type='tel'
                        placeholder="Fax"
                    />

                    <FormField
                        name={"role"}
                        onChange={handleChange}
                        value={formData.role}
                        label="Role"
                        type='text'
                        placeholder="Role"
                    />

                    <FormField
                        name={"address"}
                        onChange={handleChange}
                        value={formData.address}
                        label="Address"
                        type='text'
                        placeholder="Address"
                    />

                    <FormField
                        name={"orcid"}
                        onChange={handleChange}
                        value={formData.orcid}
                        label="ORCID"
                        type='text'
                        placeholder="https://orcid.org/0000-0000-0000-0000"
                    />

                    <div className="py-2">
                        <FormField
                            name="affiliations"
                            label="Affiliations"
                            placeholder="Add an affiliation and press Enter or comma"
                            tags={formData.affiliations}
                            onAddTag={handleAddAffiliation}
                            onRemoveTag={handleRemoveAffiliation}
                            type="tags"
                        />
                    </div>

                </div>

                {/* Action Buttons */}
                <div className="mt-6 sticky bottom-0 bg-white border-t border-gray-200 p-4 pr-0 flex justify-end space-x-3">
                    <TooltipButton
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        tooltipText="Cancel"
                    >
                        <span>Cancel</span>
                    </TooltipButton>
                    <TooltipButton
                        type="button" // Change to "submit" if you want native form submission
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                        tooltipText={isEditing ? 'Update Author' : 'Add Author'}
                    >
                        <Save className="w-4 h-4" />
                        <span>{isEditing ? 'Update Author' : 'Add Author'}</span>
                    </TooltipButton>
                </div>
            </div>
        </div>
    );
};


export default AuthorForm;

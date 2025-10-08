import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

import FormField from "../Form/FormField";
import TooltipButton from "../Widgets/TooltipButton";
import Heading3 from "../Typography/Heading3";
import Paragraph from "../Typography/Paragraph";
import { v4 as uuid } from "uuid";

import { CONTACT_ROLE_OPTIONS } from "../../constants/contactRoles";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { isValidEmail } from '../../utils/validation';

export const ContactForm = ({ item, onSave, onCancel, isEditing = false }) => {
    const { publications, contacts } = useGlobalDataContext();

    const [formData, setFormData] = useState({
        id: item?.id || '',
        firstName: item?.firstName || '',
        midInitials: item?.midInitials || '',
        lastName: item?.lastName || '',
        email: item?.email || '',
        phone: item?.phone || '',
        fax: item?.fax || '',
        roles: item?.roles || [],
        address: item?.address || '',
        orcid: item?.orcid || '',
        affiliations: item?.affiliations || [],
    });
    const [formError, setFormError] = useState('');
    // Track whether the user has interacted with the form. If the form is dirty,
    // avoid overwriting local edits when the global contacts array updates (for
    // example when an email is added via the Publications form's prompt modal).
    const [dirty, setDirty] = useState(false);

    // When the underlying contact (from global contacts) changes and the form
    // has not been edited locally, sync the local form state so updates made
    // elsewhere (e.g. the email added from Publications) are reflected here.
    useEffect(() => {
        if (!item) return;
        const live = contacts?.find(c => c.id === item.id) || item;

        if (!dirty) {
            // If the user hasn't edited the form, fully sync to the live contact
            setFormData({
                id: live?.id || '',
                firstName: live?.firstName || '',
                midInitials: live?.midInitials || '',
                lastName: live?.lastName || '',
                email: live?.email || '',
                phone: live?.phone || '',
                fax: live?.fax || '',
                roles: live?.roles || [],
                address: live?.address || '',
                orcid: live?.orcid || '',
                affiliations: live?.affiliations || [],
            });
            return;
        }

        // If the form is dirty, merge non-empty live values into empty local fields
        setFormData((prev) => {
            if (!prev) return prev;
            const merged = { ...prev };
            if ((!merged.email || merged.email.trim() === '') && live?.email) merged.email = live.email;
            if ((!merged.phone || merged.phone.trim() === '') && live?.phone) merged.phone = live.phone;
            if ((!merged.fax || merged.fax.trim() === '') && live?.fax) merged.fax = live.fax;
            if ((!merged.address || merged.address.trim() === '') && live?.address) merged.address = live.address;
            if ((!merged.orcid || merged.orcid.trim() === '') && live?.orcid) merged.orcid = live.orcid;
            if ((!merged.affiliations || merged.affiliations.length === 0) && (live?.affiliations?.length > 0)) merged.affiliations = live.affiliations;
            if ((!merged.roles || merged.roles.length === 0) && (live?.roles?.length > 0)) merged.roles = live.roles;
            // Do not unset or overwrite other fields the user may have edited
            return merged;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.id, contacts]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setFormError('Please fill in all required fields (First Name, Last Name, Role).');
            return;
        }

        // Validate email format when present (empty is allowed)
        if (formData.email && !isValidEmail(formData.email)) {
            setFormError('Please enter a valid email address.');
            return;
        }

        // Check if this contact is a corresponding author in any publication
        // and the user is trying to remove the email
        if (isEditing && item?.id) {
            const hadEmail = item.email && item.email.trim() !== '';
            const hasEmail = formData.email && formData.email.trim() !== '';
            
            // If contact had email before but doesn't now, check if they're a corresponding author
            if (hadEmail && !hasEmail) {
                const isCorrespondingAuthor = publications.some(
                    pub => pub.correspondingContactId === item.id
                );
                
                if (isCorrespondingAuthor) {
                    setFormError(
                        'Cannot remove email address. This contact is set as a corresponding author in one or more publications. ' +
                        'Please remove them as corresponding author first or provide a different email address.'
                    );
                    return;
                }
            }
        }

        setFormError('');

        const contactData = {
            ...formData,
            id: isEditing && item.id ? item.id : uuid(), // Generate a new ID if not editing
        };

        onSave(contactData);
        // after saving, the form is in sync with the global store
        setDirty(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear any existing form error when the user types
        if (formError) setFormError('');
        setDirty(true);
    };

    const handleAddAffiliation = (affiliation) => {
        setFormData(prevData => ({
            ...prevData,
            affiliations: [...(prevData.affiliations || []), affiliation]
        }));
        setDirty(true);
    };

    const handleRemoveAffiliation = (affiliationToRemove) => {
        setFormData(prevData => ({
            ...prevData,
            affiliations: prevData.affiliations.filter(affiliation => affiliation !== affiliationToRemove)
        }));
        setDirty(true);
    };

    const handleAddRole = (role) => {
        setFormData(prevData => {
            return {
                ...prevData,
                roles: [...(prevData.roles || []), role]
            };
        });
        setDirty(true);
    };

    const handleRemoveRole = (roleToRemove) => {
        setFormData(prevData => {
            return {
                ...prevData,
                roles: prevData.roles.filter(role => role !== roleToRemove)
            };
        });
        setDirty(true);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                    <Heading3 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Edit contact' : 'Add new contact'}
                    </Heading3>
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
                {formError && (
                    <Paragraph className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {formError}
                    </Paragraph>
                )}

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
                </div>

                <div className="pt-3 space-y-3">

                    <FormField
                        name="affiliations"
                        label="Affiliations"
                        placeholder="Add an affiliation and press Enter or comma"
                        value={formData.affiliations}
                        onAddTag={handleAddAffiliation}
                        onRemoveTag={handleRemoveAffiliation}
                        type="tags"
                    />

                    <FormField
                        name="roles"
                        label="Role(s)"
                        type="multi-select"
                        tags={CONTACT_ROLE_OPTIONS}
                        value={formData.roles}
                        onAddTag={handleAddRole}
                        onRemoveTag={handleRemoveRole}
                    />
                
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
                        tooltipText={isEditing ? 'Update contact' : 'Add contact'}
                    >
                        <Save className="w-4 h-4" />
                        <span>{isEditing ? 'Update contact' : 'Add contact'}</span>
                    </TooltipButton>
                </div>
            </div>
        </div>
    );
};


export default ContactForm;

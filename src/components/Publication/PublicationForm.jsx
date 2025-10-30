import { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { Save, Star, X } from "lucide-react";
import { formatContactName } from "../../utils/utils";
import FormField from "../Form/FormField";
import TooltipButton from "../Widgets/TooltipButton";
import Heading3 from "../Typography/Heading3";
import Paragraph from "../Typography/Paragraph";

import { PUBLICATION_STATUS_OPTIONS } from "../../constants/publicationStatuses";

export const PublicationForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const { contacts } = useGlobalDataContext();

  const [formData, setFormData] = useState({
    title: item?.title || '',
    doi: item?.doi || '',
    publicationStatus: item?.publicationStatus || '',
  });

  const [selectedContacts, setSelectedContacts] = useState([]);
  const [correspondingContactId, setCorrespondingContactId] = useState(item?.correspondingContactId || '');
  const [formError, setFormError] = useState('');

  // Initialize selected contacts on mount or when item changes
  // NOTE: Do NOT include 'contacts' in deps - we only want to re-initialize when
  // the item changes, not when global contacts are updated (e.g., when emails are added).
  // Including 'contacts' causes the form to reset and lose unsaved author additions.
  useEffect(() => {
    const initialContacts =
      item?.contactList
        ?.map(id => contacts.find(contact => contact.id === id))
        .filter(Boolean) || [];

    setSelectedContacts(initialContacts);

    // Preserve an explicit correspondingContactId from the item if present.
    // Do not implicitly set the corresponding contact to the first contact
    // — corresponding author must be chosen explicitly by the user.
    if (item?.correspondingContactId) {
      setCorrespondingContactId(item.correspondingContactId);
    } else {
      setCorrespondingContactId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Handle text inputs
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Add contact
  const handleAddContact = useCallback((input) => {
    const contactObj = typeof input === 'object'
      ? input
      : contacts.find(a => formatContactName(a).toLowerCase() === input.toLowerCase());

    if (!contactObj) return;

    setSelectedContacts(prev => {
      if (prev.some(contact => contact.id === contactObj.id)) return prev;

      const nextContacts = [...prev, { ...contactObj }];
      // Do not auto-set the corresponding contact when adding. The user must
      // explicitly choose the corresponding contact via the UI.
      return nextContacts;
    });
  }, [contacts, correspondingContactId]);

  // Remove Contact
  const handleRemoveContact = useCallback((contactToRemove) => {
    setSelectedContacts(prev => {
      const updated = prev.filter(contact => contact.id !== contactToRemove.id);
      if (contactToRemove.id === correspondingContactId) {
        // Clear corresponding contact instead of implicitly assigning another.
        setCorrespondingContactId('');
      }
      return updated;
    });
  }, [correspondingContactId]);

  const handleSetCorrespondingContact = useCallback((contactId) => {
    setCorrespondingContactId(contactId);
  }, []);

  // Contacts are stored as simple objects and corresponding author selection remains explicit.

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Please enter a title.");
      return;
    }
    // Ensure the selected corresponding contact (if any) has an email
    if (correspondingContactId) {
      const corresponding = contacts.find(c => c.id === correspondingContactId);
      if (!corresponding || !corresponding.email || corresponding.email.trim() === '') {
        setFormError('The selected corresponding contact does not have an email address. Please add an email to the contact or choose a different corresponding contact.');
        return;
      }
    }
    if (selectedContacts.length > 0 && !correspondingContactId) {
      setFormError("Please select a corresponding contact.");
      return;
    }
    setFormError('');

    onSave({
      ...formData,
      id: isEditing ? item.id : `pub-${Date.now()}`,
      contactList: selectedContacts.map(a => a.id),
      correspondingContactId: correspondingContactId || null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <Heading3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Publication' : 'Add new Publication'}
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

      <div className="px-6 space-y-2 pt-2">
        {formError && (
          <Paragraph className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {formError}
          </Paragraph>
        )}
        <FormField
          label="Publication Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter Publication Title"
        />

        <div className="flex gap-4 flex-grow">

          <div className="flex-grow">
            <FormField
              label="Digital Object Identifier (DOI)"
              name="doi"
              value={formData.doi}
              onChange={handleChange}
              placeholder="Enter DOI"
            />
          </div>
          <div className="flex-grow">
            <FormField
              label={"Publication Status"}
              name="publicationStatus"
              value={formData.publicationStatus}
              placeholder={"Set publication status"}
              type="select"
              tags={PUBLICATION_STATUS_OPTIONS}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Authors field with drag-reorder and corresponding author selection */}
        <FormField
          type="authors"
          name="contacts"
          label="Authors"
          placeholder="Search and add authors..."
          value={selectedContacts}
          tags={contacts}
          onChange={(e) => {
            const next = Array.isArray(e.target.value) ? e.target.value : [];
            // Determine whether this change added a new author (length increased)
            const addedAnAuthor = next.length > selectedContacts.length;
                    setSelectedContacts(next);
                    // Do not auto-set correspondingContactId here. Corresponding author
                    // must be chosen explicitly by clicking the corresponding control.
          }}
          correspondingAuthorId={correspondingContactId}
          onCorrespondingAuthorChange={setCorrespondingContactId}
          explanation="Drag to reorder authors. Click envelope icon to designate corresponding author. First author indicates primary contribution."
        />

      
        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pr-0 flex justify-end space-x-3">
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
            tooltipText={isEditing ? 'Update Publication' : 'Add Publication'}
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Update Publication' : 'Add Publication'}</span>
          </TooltipButton>
        </div>
      </div>
    </div>
  );
};

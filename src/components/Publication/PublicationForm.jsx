import { useState, useEffect, useCallback } from "react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { Save, X } from "lucide-react";
import { formatContactName } from "../../utils/utils";
import FormField from "../Form/FormField";
import TooltipButton from "../Widgets/TooltipButton";

import { PUBLICATION_STATUS_OPTIONS } from "../../constants/publicationStatuses";

export const PublicationForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const { contacts } = useGlobalDataContext();

  const [formData, setFormData] = useState({
    title: item?.title || '',
    doi: item?.doi || '',
    publicationStatus: item?.publicationStatus || '',
    contactList: item?.contactList || [],
  });

  const [selectedContacts, setSelectedContacts] = useState([]);

  // Initialize selected contacts on mount
  useEffect(() => {
    setSelectedContacts(
      item?.contactList?.map(id => contacts.find(a => a.id === id)) || []
    );
  }, [item, contacts]);

  // Handle text inputs
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Add contact
  const handleAddContact = useCallback((input) => {
    const contactObj = typeof input === 'object' ? input
      : contacts.find(a => formatContactName(a).toLowerCase() === input.toLowerCase());

    if (contactObj && !selectedContacts.some(a => a.id === contactObj.id)) {
      setSelectedContacts(prev => [...prev, contactObj]);
    }
  }, [contacts, selectedContacts]);

  // Remove Contact
  const handleRemoveContact = useCallback((contactToRemove) => {
    setSelectedContacts(prev =>
      prev.filter(contact => contact.id !== contactToRemove.id)
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please enter a title.");
      return;
    }

    onSave({
      ...formData,
      id: isEditing ? item.id : `pub-${Date.now()}`,
      contactList: selectedContacts.map(a => a.id)
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Publication' : 'Add new Publication'}
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

      <div className="px-6 space-y-2 pt-2">
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

        {/* Contact TagInput */}
        <FormField
          type="tags"
          name="contacts"
          label="Contacts"
          placeholder="Type to find and add contacts"
          value={selectedContacts}        // Current selected contacts
          tags={contacts}                 // Available contacts for suggestions
          onAddTag={handleAddContact}
          onRemoveTag={handleRemoveContact}
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

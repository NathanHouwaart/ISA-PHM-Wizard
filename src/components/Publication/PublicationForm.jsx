import { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { ArrowDown, ArrowUp, Save, Star, X } from "lucide-react";
import { formatContactName } from "../../utils/utils";
import FormField from "../Form/FormField";
import TooltipButton from "../Widgets/TooltipButton";
import Heading3 from "../Typography/Heading3";
import Paragraph from "../Typography/Paragraph";

import { PUBLICATION_STATUS_OPTIONS } from "../../constants/publicationStatuses";
import {
  CONTRIBUTION_LEVEL_OPTIONS,
  getContributionLabel,
  getContributionWeight,
} from "../../constants/contributionLevels";

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

  // Initialize selected contacts on mount
  useEffect(() => {
    const contributionMap = item?.contactContributions || {};
    const initialContacts =
      item?.contactList
        ?.map(id => contacts.find(contact => contact.id === id))
        .filter(Boolean)
        .map(contact => ({
          ...contact,
          contributionLevel: contributionMap[contact.id] || 'supporting',
        })) || [];

    setSelectedContacts(initialContacts);

    if (item?.correspondingContactId) {
      setCorrespondingContactId(item.correspondingContactId);
    } else if (initialContacts.length > 0) {
      setCorrespondingContactId(initialContacts[0].id);
    } else {
      setCorrespondingContactId('');
    }
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
    const contactObj = typeof input === 'object'
      ? input
      : contacts.find(a => formatContactName(a).toLowerCase() === input.toLowerCase());

    if (!contactObj) {
      return;
    }

    setSelectedContacts(prev => {
      if (prev.some(contact => contact.id === contactObj.id)) {
        return prev;
      }

      const nextContacts = [...prev, { ...contactObj, contributionLevel: 'supporting' }];
      if (!correspondingContactId) {
        setCorrespondingContactId(contactObj.id);
      }
      return nextContacts;
    });
  }, [contacts, correspondingContactId]);

  // Remove Contact
  const handleRemoveContact = useCallback((contactToRemove) => {
    setSelectedContacts(prev => {
      const updated = prev.filter(contact => contact.id !== contactToRemove.id);
      if (contactToRemove.id === correspondingContactId) {
        setCorrespondingContactId(updated[0]?.id || '');
      }
      return updated;
    });
  }, [correspondingContactId]);

  const handleSetCorrespondingContact = useCallback((contactId) => {
    setCorrespondingContactId(contactId);
  }, []);

  const handleContributionChange = useCallback((contactId, newLevel) => {
    setSelectedContacts(prev =>
      prev.map(contact =>
        contact.id === contactId
          ? { ...contact, contributionLevel: newLevel }
          : contact
      )
    );
  }, []);

  const contributionSummary = useMemo(() => {
    if (!selectedContacts.length) {
      return {
        topContributorIds: [],
        bottomContributorIds: [],
        topLabel: null,
        bottomLabel: null,
      };
    }

    const weights = selectedContacts.map(contact => ({
      id: contact.id,
      weight: getContributionWeight(contact.contributionLevel),
    }));

    const maxWeight = Math.max(...weights.map(entry => entry.weight));
    const minWeight = Math.min(...weights.map(entry => entry.weight));

    return {
      topContributorIds: weights.filter(entry => entry.weight === maxWeight).map(entry => entry.id),
      bottomContributorIds: weights.filter(entry => entry.weight === minWeight).map(entry => entry.id),
      topLabel: selectedContacts.find(contact => getContributionWeight(contact.contributionLevel) === maxWeight)?.contributionLevel || null,
      bottomLabel: selectedContacts.find(contact => getContributionWeight(contact.contributionLevel) === minWeight)?.contributionLevel || null,
    };
  }, [selectedContacts]);

  const renderContactTag = useCallback(
    (contact, { index, removeTag }) => {
      const isCorresponding = contact.id === correspondingContactId;
      const isTopContributor = contributionSummary.topContributorIds.includes(contact.id);
      const isBottomContributor = contributionSummary.bottomContributorIds.includes(contact.id);
      const contributionLabel = getContributionLabel(contact.contributionLevel);

      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${
            isCorresponding
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : isTopContributor
                ? 'bg-green-100 border-green-300 text-green-900'
                : isBottomContributor
                  ? 'bg-rose-100 border-rose-300 text-rose-900'
                  : 'bg-indigo-100 border-indigo-200 text-indigo-800'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSetCorrespondingContact(contact.id);
            }}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
              isCorresponding
                ? 'bg-amber-300 border-amber-500 text-amber-900 hover:bg-amber-400'
                : 'bg-white border-transparent text-amber-600 hover:bg-amber-50 hover:border-amber-200'
            }`}
            aria-pressed={isCorresponding}
            aria-label={
              isCorresponding
                ? `Unset ${formatContactName(contact)} as corresponding author`
                : `Mark ${formatContactName(contact)} as corresponding author`
            }
          >
            <Star className="w-3.5 h-3.5" fill={isCorresponding ? 'currentColor' : 'none'} />
          </button>
          <span className="whitespace-nowrap">
            {index + 1}. {formatContactName(contact)}
          </span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-700">
            {contributionLabel}
          </span>
          {isTopContributor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-900">
              <ArrowUp className="w-3 h-3" />
              Top
            </span>
          )}
          {isBottomContributor && !isTopContributor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-900">
              <ArrowDown className="w-3 h-3" />
              Least
            </span>
          )}
          {isCorresponding && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Corresponding
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeTag();
            }}
            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 hover:bg-indigo-300 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          >
            <span className="sr-only">Remove {formatContactName(contact)}</span>
            <X className="w-3 h-3" />
          </button>
        </span>
      );
    },
    [contributionSummary, correspondingContactId, handleSetCorrespondingContact]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Please enter a title.");
      return;
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
      contactContributions: selectedContacts.reduce((acc, contact) => {
        acc[contact.id] = contact.contributionLevel || 'supporting';
        return acc;
      }, {}),
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
            setSelectedContacts(next);
            // Auto-set first author as corresponding if none set
            if (next.length > 0 && !correspondingContactId) {
              setCorrespondingContactId(next[0].id);
            }
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

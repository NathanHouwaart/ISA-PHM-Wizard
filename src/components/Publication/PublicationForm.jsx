import { useState, useEffect, useCallback } from "react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { Save, X } from "lucide-react";
import { TagInput } from "../Form/TagInput";
import { formatAuthorName } from "../../utils/utils";
import FormField from "../Form/FormField";
import TooltipButton from "../Widgets/TooltipButton";

export const PublicationForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const { authors } = useGlobalDataContext();

  const [formData, setFormData] = useState({
    title: item?.title || '',
    doi: item?.doi || '',
    publicationStatus: item?.publicationStatus || '',
    authorList: item?.authorList || [],
  });

  const [selectedAuthors, setSelectedAuthors] = useState([]);

  // Initialize selected authors on mount
  useEffect(() => {
    setSelectedAuthors(
      item?.authorList?.map(id => authors.find(a => a.id === id)) || []
    );
  }, [item, authors]);

  // Handle text inputs
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Add author
  const handleAddAuthor = useCallback((input) => {
    const authorObj = typeof input === 'object' ? input
      : authors.find(a => formatAuthorName(a).toLowerCase() === input.toLowerCase());

    if (authorObj && !selectedAuthors.some(a => a.id === authorObj.id)) {
      setSelectedAuthors(prev => [...prev, authorObj]);
    }
  }, [authors, selectedAuthors]);

  // Remove author
  const handleRemoveAuthor = useCallback((authorToRemove) => {
    setSelectedAuthors(prev =>
      prev.filter(author => author.id !== authorToRemove.id)
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
      authorList: selectedAuthors.map(a => a.id)
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
              tags={["Under Review", "Revisions Requested", "Revised and Resubmitted", "Accepted", "In Press", "Published", "Rejected", "Withdrawn", "Archived"]}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Authors TagInput */}
        
        {/* <TagInput
          label="Authors"
          tags={selectedAuthors.map(formatAuthorName)}
          onAddTag={handleAddAuthor}
          onRemoveTag={handleRemoveAuthor}
          placeholder="Start typing to find an author"
          availableOptions={authors}
        /> */}
        <FormField
          type="tags"
          name="authors"
          label="Authors"
          placeholder="Type to find and add authors"
          value={selectedAuthors}        // Current selected authors
          tags={authors}             // Available authors for suggestions
          onAddTag={handleAddAuthor}
          onRemoveTag={handleRemoveAuthor}
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

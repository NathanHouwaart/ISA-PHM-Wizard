import { useState, useEffect, useCallback } from "react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { Save, X } from "lucide-react";
import { TagInput } from "../Form/TagInput";
import { formatAuthorName } from "../../utils/utils";
import FormField from "../Form/FormField";

export const PublicationForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const publication = item;
  const { authors } = useGlobalDataContext();

  const [formData, setFormData] = useState({
    title: publication?.title || '',
    doi: publication?.doi || '',
    pubMedId: publication?.pubMedId || '',
  });

  const [selectedAuthors, setSelectedAuthors] = useState([]);

  // Initialize selected authors on mount
  useEffect(() => {
    if (publication?.authorList?.length > 0) {
      const resolvedAuthors = publication.authorList
        .map(id => authors.find(a => a.id === id))
        .filter(Boolean);
      setSelectedAuthors(resolvedAuthors);
    }
  }, [publication, authors]);

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
  const handleRemoveAuthor = useCallback((formattedName) => {
    setSelectedAuthors(prev =>
      prev.filter(author => formatAuthorName(author) !== formattedName)
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
      id: isEditing ? publication.id : `pub-${Date.now()}`,
      authorList: selectedAuthors.map(a => a.id)
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {isEditing ? "Edit Publication" : "Add New Publication"}
        </h3>
        <button onClick={onCancel} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
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
              label="PubMed ID"
              name="pubMedId"
              value={formData.pubMedId}
              onChange={handleChange}
              placeholder="Enter PubMed ID"
            />
          </div>
        </div>

        {/* Authors TagInput */}
        <TagInput
          label="Authors"
          tags={selectedAuthors.map(formatAuthorName)}
          onAddTag={handleAddAuthor}
          onRemoveTag={handleRemoveAuthor}
          placeholder="Start typing to find an author"
          availableOptions={authors}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? "Update Publication" : "Add Publication"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

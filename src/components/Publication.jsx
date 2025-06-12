import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, UserPen, Book } from 'lucide-react';
import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

// Import the publication data with author IDs
import initialPublicationsData from '../data/existingPublications.json';

// Helper to format author objects to display strings
const formatAuthorName = (author) => {
  if (!author) return 'Unknown Author';
  return `${author.firstName} ${author.midInitials ? author.midInitials + ' ' : ''}${author.lastName}`.trim();
};

// Function to parse a full name string into an author object structure
const parseAuthorName = (fullName) => {
  const parts = fullName.split(' ').filter(part => part.trim() !== '');
  let firstName = '';
  let midInitials = '';
  let lastName = '';

  if (parts.length === 1) {
    firstName = parts[0];
  } else if (parts.length === 2) {
    firstName = parts[0];
    lastName = parts[1];
  } else if (parts.length >= 3) {
    firstName = parts[0];
    lastName = parts[parts.length - 1];
    midInitials = parts.slice(1, parts.length - 1).join(' ');
  }

  return {
    id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Temporary ID
    firstName,
    midInitials,
    lastName,
    email: '', role: '', department: '', bio: '', location: '', website: '', joinDate: '', expertise: '', phone: ''
  };
};


// --- TagInput Component (Enhanced with Autocomplete) ---
function TagInput({ label, tags, onAddTag, onRemoveTag, placeholder, required = false, availableOptions, onAddNewOption }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = availableOptions
        .filter(author =>
          formatAuthorName(author).toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(formatAuthorName(author)) // Don't suggest already added tags by their formatted name
        )
        .slice(0, 5); // Limit suggestions for performance/UI
      setSuggestions(filtered);
      setShowSuggestions(true);
      setHighlightedIndex(-1); // Reset highlight when suggestions change
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableOptions, tags]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const selectSuggestion = (suggestion) => {
    onAddTag(suggestion); // Pass the full author object
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (highlightedIndex >= 0) {
        if (highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex]);
        } else if (inputValue.trim() !== '') {
          // This handles the "Add new author" option
          onAddNewOption(inputValue.trim());
          setInputValue('');
          setShowSuggestions(false);
        }
      } else if (inputValue.trim() !== '') {
        // If no suggestion is highlighted, but there's input, try to add it.
        // First, check if it matches an existing author exactly
        const foundAuthor = availableOptions.find(author =>
          formatAuthorName(author).toLowerCase() === inputValue.trim().toLowerCase()
        );
        if (foundAuthor) {
          onAddTag(foundAuthor);
        } else {
          onAddNewOption(inputValue.trim());
        }
        setInputValue('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prevIndex =>
        (prevIndex + 1) % (suggestions.length + (inputValue.trim() !== '' ? 1 : 0))
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prevIndex =>
        (prevIndex - 1 + (suggestions.length + (inputValue.trim() !== '' ? 1 : 0))) %
        (suggestions.length + (inputValue.trim() !== '' ? 1 : 0))
      );
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputBlur = (e) => {
    // Delay hiding suggestions to allow click on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 100);
  };

  const handleAddButtonClick = () => {
    if (inputValue.trim() !== '') {
      const foundAuthor = availableOptions.find(author =>
        formatAuthorName(author).toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (foundAuthor) {
        onAddTag(foundAuthor);
      } else {
        onAddNewOption(inputValue.trim());
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleAddNewOptionClick = () => {
    if (inputValue.trim() !== '') {
      onAddNewOption(inputValue.trim());
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={tag + index}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-2 -mr-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="sr-only">Remove {tag}</span>
              <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleInputBlur}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls="autocomplete-list"
          role="combobox"
          aria-expanded={showSuggestions}
        />
        <button
          type="button"
          onClick={handleAddButtonClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </div>

      {showSuggestions && (suggestions.length > 0 || inputValue.trim() !== '') && (
        <ul
          ref={suggestionsRef}
          id="autocomplete-list"
          role="listbox"
          className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto"
        >
          {suggestions.map((author, index) => (
            <li
              key={author.id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${index === highlightedIndex ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
              onMouseDown={(e) => { // Use onMouseDown to prevent blur from hiding suggestions
                e.preventDefault();
                selectSuggestion(author);
              }}
            >
              {formatAuthorName(author)}
            </li>
          ))}
          {suggestions.length === 0 && inputValue.trim() !== '' && (
            <li
              role="option"
              className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${highlightedIndex === suggestions.length ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNewOptionClick();
              }}
            >
              Add new author: "{inputValue.trim()}" <Plus className="inline-block w-4 h-4 ml-1" />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// --- Publication Card Component ---
export const PublicationCard = ({ publication, onEdit, onRemove, getAuthorDetails }) => {
  const authorNames = publication.authorList
    .map(authorId => getAuthorDetails(authorId))
    .filter(Boolean) // Filter out any undefined authors
    .map(author => formatAuthorName(author));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {/* Display initials from the first two words of the title, if available */}
            {publication.title.split(" ").slice(0, 2).map(word => word[0]).join("")}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{publication.title}</h3>
            {/* Displaying authors in PublicationCard - now looking up full details by ID */}
            <div className='flex flex-wrap items-center space-x-1 mt-2 text-sm text-gray-500'>
              {authorNames.length > 0 && (
                <p className="text-gray-600 text-sm">
                  <UserPen className="inline-block w-4 h-4 mr-1 text-gray-500" />
                  {authorNames.join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <p className='font-bold'>DOI - </p>
                <span>{
                  publication.doi ? (
                    <p className="text-blue-600 text-sm hover:underline">
                      <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer">
                        {publication.doi}
                      </a>
                    </p>) :
                    "not provided"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <p className='font-bold'>PubMedID - </p>
                <span>{
                  publication.doi ? (
                    <p className="text-blue-600 text-sm hover:underline">
                      <a href={`https://pubmed.ncbi.nlm.nih.gov/${publication.pubMedId}/`} target="_blank" rel="noopener noreferrer">
                        {publication.pubMedId}
                      </a>
                    </p>) :
                    "not provided"}
                </span>
              </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(publication) }}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit publication"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(publication.id) }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove publication"
            >
              <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};

// --- PublicationForm Component ---
export const PublicationForm = ({ publication, onSave, onCancel, isEditing = false, allAvailableAuthors, onAddNewGlobalAuthor }) => {
  // State for form fields (authorList will store names for TagInput display)
  const [formData, setFormData] = useState({
    title: publication?.title || '',
    doi: publication?.doi || '',
    pubMedId: publication?.pubMedId || '',
    authorList: [] // This will store formatted names for the TagInput
  });

  // State to hold actual author objects for saving (with IDs and other details)
  const [selectedAuthorObjects, setSelectedAuthorObjects] = useState([]);

  useEffect(() => {
    if (publication && publication.authorList) {
      const initialSelectedAuthors = publication.authorList
        .map(authorId => allAvailableAuthors.find(author => author.id === authorId))
        .filter(Boolean); // Filter out any undefined authors

      setSelectedAuthorObjects(initialSelectedAuthors);
      setFormData(prev => ({
        ...prev,
        authorList: initialSelectedAuthors.map(author => formatAuthorName(author))
      }));
    }
  }, [publication, allAvailableAuthors]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please fill in the Publication Title.');
      return;
    }

    const publicationData = {
      ...formData,
      id: isEditing ? publication.id : `pub-${Date.now()}`,
      authorList: selectedAuthorObjects.map(author => author.id) // Save only author IDs
    };
    onSave(publicationData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddAuthorTag = useCallback((authorToAdd) => {
    let authorObj = null;

    if (typeof authorToAdd === 'object' && authorToAdd.id) {
      authorObj = authorToAdd; // It's already an author object
    } else if (typeof authorToAdd === 'string') {
      // Try to find an existing author by name
      authorObj = allAvailableAuthors.find(author => formatAuthorName(author).toLowerCase() === authorToAdd.toLowerCase());

      if (!authorObj) {
        // If not found, use the global handler to add a new author
        const newAuthorFromGlobal = onAddNewGlobalAuthor(authorToAdd);
        if (newAuthorFromGlobal) {
          authorObj = newAuthorFromGlobal;
        }
      }
    }

    if (authorObj && !selectedAuthorObjects.some(a => a.id === authorObj.id)) {
      setSelectedAuthorObjects(prevObjects => [...prevObjects, authorObj]);
      setFormData(prev => ({
        ...prev,
        authorList: [...prev.authorList, formatAuthorName(authorObj)]
      }));
    } else if (authorObj) {
      // alert(`Author "${formatAuthorName(authorObj)}" is already added.`); // Optional: provide feedback
    }
  }, [selectedAuthorObjects, allAvailableAuthors, onAddNewGlobalAuthor]);

  const handleRemoveAuthorTag = useCallback((fullName) => {
    setSelectedAuthorObjects(prevObjects => prevObjects.filter(author => formatAuthorName(author).trim() !== fullName.trim()));
    setFormData(prev => ({
      ...prev,
      authorList: prev.authorList.filter(name => name !== fullName)
    }));
  }, []);

  const handleAddNewAuthor = useCallback((authorName) => {
    // This function will now call the global handler passed from Contact.jsx
    const newAuthorObj = parseAuthorName(authorName);
    onAddNewGlobalAuthor(newAuthorObj);
    return newAuthorObj;
  }, [onAddNewGlobalAuthor]);


  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Publication' : 'Add New Publication'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Publication Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publication Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter Publication Title"
            required
          />
        </div>

        {/* DOI and PubMed ID */}
        <div className='flex justify-between w-full flex-grow gap-4'>
          <div className='flex-grow'>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Digital Object Identifier (DOI)
            </label>
          <input
            type="text"
            name="doi"
            value={formData.doi}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter DOI"
          />
        </div>
          <div className='flex-grow'>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PubMed ID
            </label>
          <input
            type="text"
            name="pubMedId"
            value={formData.pubMedId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter PubMed ID"
          />
          </div>
        </div>

        <TagInput
          label="Authors"
          tags={formData.authorList}
          onAddTag={handleAddAuthorTag}
          onRemoveTag={handleRemoveAuthorTag}
          placeholder="Add authors (e.g., John Doe, Jane Smith)"
          availableOptions={allAvailableAuthors} // Pass the list of all existing authors
          onAddNewOption={handleAddNewAuthor} // Pass the handler for adding new authors globally
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
            <span>{isEditing ? 'Update Publication' : 'Add Publication'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Publications Page Component ---
const PublicationsPage = forwardRef(({ onHeightChange, authors, onAddAuthor }, ref) => {
  const [publications, setPublications] = useState(initialPublicationsData);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPublication, setEditingPublication] = useState(null);

  const elementToObserveRef = useResizeObserver(onHeightChange);
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  // Helper function to get author details by ID
  const getAuthorDetails = useCallback((authorId) => {
    return authors.find(author => author.id === authorId);
  }, [authors]); // Dependency on authors prop

  const handleAddPublication = (publicationData) => {
    setPublications(prevPublications => [...prevPublications, publicationData]);
    setShowAddForm(false);
  };

  const handleEditPublication = (publicationData) => {
    setPublications(prevPublications =>
      prevPublications.map(publication =>
        publication.id === publicationData.id ? publicationData : publication
      )
    );
    setEditingPublication(null);
  };

  const handleRemovePublication = (publicationId) => {
    if (window.confirm('Are you sure you want to remove this publication?')) {
      setPublications(prevPublications => prevPublications.filter(publication => publication.id !== publicationId));
    }
  };

  const startEditMode = (publication) => {
    setEditingPublication(publication);
    setShowAddForm(false); // Close add form if open
  };

  const handleAddNewGlobalAuthor = useCallback((authorName) => {
    const newAuthorObj = parseAuthorName(authorName);
    onAddAuthor(newAuthorObj); // Call the global add author function
    return newAuthorObj;
  }, [onAddAuthor]);


  return (
    <div ref={combinedRef} className="rounded-md bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Publications</h1>
            <p className="text-gray-600 mt-2">Here you can provide publications related to your experiment.</p>
          </div>
            <button
              onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
            <Plus className="w-5 h-5" />
            <span>Add Publication</span>
            </button>
          </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingPublication) && (
          <div className="mb-8">
            <PublicationForm
              publication={editingPublication}
              onSave={editingPublication ? handleEditPublication : handleAddPublication}
              onCancel={() => { setShowAddForm(false); setEditingPublication(null); }}
              isEditing={!!editingPublication}
              allAvailableAuthors={authors} // Pass the authors prop here
              onAddNewGlobalAuthor={handleAddNewGlobalAuthor} // Pass the function to add authors globally
            />
          </div>
        )}

        {/* Publications Grid */}
        <div className="w-full space-y-5">
          {publications.map(publication => (
            <div key={publication.id}>
              {/* Only render PublicationCard if not in edit mode for this specific publication */}
              {(editingPublication?.id !== publication.id) &&
                <PublicationCard
                  publication={publication}
                  onEdit={startEditMode}
                  onRemove={handleRemovePublication}
                  getAuthorDetails={getAuthorDetails} // Pass the helper function
                />
              }
            </div>
          ))}
        </div>

        {publications.length === 0 && !showAddForm && !editingPublication && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Publications Yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first Publication.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Publication
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PublicationsPage;
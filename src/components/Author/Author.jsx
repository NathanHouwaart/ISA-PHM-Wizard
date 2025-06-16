import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

// Import the existingAuthors.json file directly
import initialAuthorsData from '../../data/existingAuthors.json'; // Adjust the path as needed
import AuthorsFormFields from '../../data/AuthorFormFields.json'

// Author Card Component (No changes needed)
const AuthorCard = ({ author, onEdit, onRemove }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {author.firstName?.[0]}{author.lastName?.[0]}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{author.firstName} {author.midInitials} {author.lastName}</h3>
            <p className="text-gray-600">{author.role}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>{author.email}</span>
              </div>
              {author.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{author.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={(e) => {e.stopPropagation(); onEdit(author)}}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit author"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {e.stopPropagation(); onRemove(author.id)}}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove author"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Author Form Component (No changes needed)
const AuthorForm = ({ author, onSave, onCancel, isEditing = false }) => {

  const initialFormState = AuthorsFormFields.reduce((acc, field) => {
      acc[field.id] = ''; // Initialize each field with an empty string
      return acc;
  }, {});

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
      const newFormData = {};
      AuthorsFormFields.forEach(field => {
          // Use the field.id directly to access the author property.
          // If author is null/undefined or the property doesn't exist, it defaults to ''
          newFormData[field.id] = author?.[field.id] || '';
      });

      console.log("newFormData", newFormData)
      setFormData(newFormData);
  }, [author]); // Re-run this effect whenever the 'author' prop changes


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.role.trim()) {
      alert('Please fill in all required fields (First Name, Last Name, Email, Role)');
      return;
    }

    const authorData = {
      ...formData,
      id: isEditing ? author.id : `author-${Date.now()}`
    };

    onSave(authorData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

    // Define common Tailwind input classes
    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
    const requiredAsterisk = <span className="text-red-500">*</span>;

    // Helper function to render a field based on its type
    const renderField = (field) => {
        const value = formData[field.id] || ''; // Ensure value is never undefined

        switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'url': // Using 'text' type in JSON for Orcid, but 'url' type input is also valid HTML5
            case 'date':
                return (
                    <div className='flex-grow' key={field.id}>
                        <label htmlFor={field.id} className={labelClasses}>
                            {field.label} {field.cardinality === '1' && field.id !== 'id' && requiredAsterisk}
                        </label>
                        <input
                            type={field.type === 'orcid' ? 'url' : field.type} // Explicitly handle 'orcid' as 'url' type input if desired
                            id={field.id}
                            name={field.id}
                            value={value}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder={field.placeholder}
                            required={field.cardinality === '1' && field.id !== 'id'}
                        />
                    </div>
                );
            case 'textarea':
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className={labelClasses}>
                            {field.label} {field.cardinality === '1' && requiredAsterisk}
                        </label>
                        <textarea
                            id={field.id}
                            name={field.id}
                            value={value}
                            onChange={handleChange}
                            rows={3} // Default rows for textarea, can be added to JSON if needed
                            className={inputClasses}
                            placeholder={field.placeholder}
                            required={field.cardinality === '1'}
                        />
                    </div>
                );
            case 'label': // For read-only display fields like 'id'
                return (
                    <div key={field.id} className='flex-grow'>
                        <label className={labelClasses}>
                            {field.label}
                        </label>
                        <p className="px-3 py-2 text-gray-800 bg-gray-50 border border-gray-200 rounded-lg">
                            {value}
                        </p>
                    </div>
                );
            default:
                return null; // Or render a fallback for unsupported types
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                    {isEditing ? 'Edit Author' : 'Add New Author'}
                </h3>
                <button
                    onClick={onCancel}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Dynamically render the 'id' field if it exists and is a 'label' type */}
                {isEditing && AuthorsFormFields.find(field => field.id === 'id' && field.type === 'label') && (
                    <div className='flex justify-between w-full flex-grow gap-4'>
                        {renderField(AuthorsFormFields.find(field => field.id === 'id'))}
                    </div>
                )}


                {/* Group First Name, Mid Initials, Last Name */}
                <div className='flex justify-between w-full flex-grow gap-4'>
                    {AuthorsFormFields.filter(field =>
                        field.id === 'firstName' || field.id === 'midInitials' || field.id === 'lastName'
                    ).map(renderField)}
                </div>

                {/* Grid for other fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AuthorsFormFields.filter(field =>
                        field.id !== 'id' && // Exclude already rendered 'id' field
                        field.id !== 'firstName' &&
                        field.id !== 'midInitials' &&
                        field.id !== 'lastName' &&
                        field.id !== 'expertise' && // Exclude single-line fields
                        field.id !== 'bio' // Exclude textarea fields
                    ).map(renderField)}
                </div>

                {/* Single line fields like Expertise */}
                {AuthorsFormFields.filter(field => field.id === 'expertise').map(renderField)}

                {/* Textarea for Bio */}
                {AuthorsFormFields.filter(field => field.id === 'bio').map(renderField)}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button" // Change to "submit" if you want native form submission
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isEditing ? 'Update Author' : 'Add Author'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
;

// Author Edit View Component (No changes needed)
const AuthorEditView = ({ author, onSave, onCancel }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {author.firstName?.[0]}{author.lastName?.[0]}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{author.firstName} {author.midInitials} {author.lastName}</h3>
            <p className="text-lg text-gray-600">{author.role}</p>
            <p className="text-sm text-gray-500">{author.department}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{author.email}</p>
            </div>
          </div>

          {author.phone && (
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900">{author.phone}</p>
              </div>
            </div>
          )}

          {author.location && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-900">{author.location}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {author.joinDate && (
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Join Date</p>
                <p className="text-gray-900">{new Date(author.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {author.website && (
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  {author.website}
                </a>
              </div>
            </div>
          )}

          {author.expertise && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Expertise</p>
              <div className="flex flex-wrap gap-2">
                {author.expertise.split(',').map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {author.bio && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Bio</p>
          <p className="text-gray-700 leading-relaxed">{author.bio}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onSave(author)} // This will call startEditMode and pass the current author
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Edit2 className="w-4 h-4" />
          <span>Edit Author</span>
        </button>
      </div>
    </div>
  );
};

// Main Authors Page Component
const AuthorsPage = forwardRef(({ onHeightChange, authors, onAddAuthor, onEditAuthor, onRemoveAuthor }, ref) => {
    // authors are now received as a prop from Contact.jsx
    // REMOVE: const [authors, setAuthors] = useState(initialAuthorsData);

    console.log(authors)

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAuthor, setEditingAuthor] = useState(null);
    const [viewingAuthor, setViewingAuthor] = useState(null);

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // These functions now call the props passed from Contact.jsx
    const handleAddAuthor = (authorData) => {
        onAddAuthor(authorData); // Call the prop
        setShowAddForm(false);
    };

    const handleEditAuthor = (authorData) => {
        onEditAuthor(authorData); // Call the prop
        setEditingAuthor(null);
        setViewingAuthor(authorData);
    };

    const handleRemoveAuthor = (authorId) => {
        if (window.confirm('Are you sure you want to remove this author?')) {
            onRemoveAuthor(authorId); // Call the prop
            setViewingAuthor(null);
        }
    };

    const startEditMode = (author) => {
        setViewingAuthor(null);
        setShowAddForm(false); // Close add form if open
        setEditingAuthor(author);
    };

    return (
        <div ref={combinedRef} className="rounded-md bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Project Authors</h1>
                        <p className="text-gray-600 mt-2">Manage all contributors and team members</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingAuthor(null);
                            setViewingAuthor(null);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Author</span>
                    </button>
                </div>

                {/* Stats */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{authors.length}</p>
                                <p className="text-sm text-gray-600">Total Authors</p>
                            </div>
                            <User className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{new Set(authors.map(a => a.department).filter(Boolean)).size}</p>
                                <p className="text-sm text-gray-600">Departments</p>
                            </div>
                            <MapPin className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{new Set(authors.map(a => a.location).filter(Boolean)).size}</p>
                                <p className="text-sm text-gray-600">Locations</p>
                            </div>
                            <Calendar className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </div>

                {/* Add Author Form */}
                {showAddForm && (
                    <div className="mb-8 w-full">
                        <AuthorForm
                            onSave={handleAddAuthor}
                            onCancel={() => setShowAddForm(false)}
                        />
                    </div>
                )}

                {/* Edit Author Form */}
                {editingAuthor && (
                    <div className="mb-8">
                        <AuthorForm
                            author={editingAuthor}
                            onSave={handleEditAuthor}
                            onCancel={() => setEditingAuthor(null)}
                            isEditing={true}
                        />
                    </div>
                )}

                {/* Author Detail View */}
                {viewingAuthor && (
                    <div className="mb-8">
                        <AuthorEditView
                            author={viewingAuthor}
                            onSave={startEditMode}
                            onCancel={() => setViewingAuthor(null)}
                        />
                    </div>
                )}

                {/* Authors Grid */}
                <div className="w-full space-y-5">
                    {authors.map(author => (
                        <div key={author.id} onClick={() => setViewingAuthor(author)} className="cursor-pointer">
                            {/* Only show AuthorCard if not in view/edit mode for this specific author */}
                            {(viewingAuthor?.id !== author.id && editingAuthor?.id !== author.id) &&
                                <AuthorCard
                                    author={author}
                                    onEdit={startEditMode}
                                    onRemove={handleRemoveAuthor}
                                />}
                        </div>
                    ))}
                </div>

                {authors.length === 0 && !showAddForm && !editingAuthor && !viewingAuthor && (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No authors yet</h3>
                        <p className="text-gray-500 mb-6">Get started by adding your first project author.</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Add First Author
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default AuthorsPage;
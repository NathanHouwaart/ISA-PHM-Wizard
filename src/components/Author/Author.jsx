import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

// Author Card Component
const AuthorCard = ({ author, onEdit, onRemove }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {author.firstName[0]}{author.lastName[0]}
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

// Author Form Component (for both adding and editing)
const AuthorForm = ({ author, onSave, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    firstName : author?.firstName || '',
    midInitials : author?.midInitials || '',
    lastName : author?.lastName || '',
    email: author?.email || '',
    role: author?.role || '',
    bio: author?.bio || '',
    location: author?.location || '',
    website: author?.website || '',
    joinDate: author?.joinDate || new Date().toISOString().split('T')[0],
    expertise: author?.expertise || '',
    department: author?.department || '',
    phone: author?.phone || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.role.trim()) {
      alert('Please fill in all required fields (Name, Email, Role)');
      return;
    }
    
    const authorData = {
      ...formData,
      id: author?.id || Date.now()
    };
    
    onSave(authorData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
        <div className='flex justify-between w-full flex-grow gap-4'>
          <div className='flex-grow'>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter First Name"
              required
              />
          </div>
          <div  className='flex-grow'>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mid Initials
            </label>
            <input
              type="text"
              name="midInitials"
              value={formData.midInitials}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter Mid Initials"
              required={false}
              />
          </div>
          <div  className='flex-grow'>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name"
              required
              />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Senior Developer, Project Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Engineering, Design"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., New York, Remote"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
            <input
              type="date"
              name="joinDate"
              value={formData.joinDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expertise</label>
          <input
            type="text"
            name="expertise"
            value={formData.expertise}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., React, Node.js, Python, UI/UX Design"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description about the author..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
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
};

// Author Edit View Component (expanded view with all information)
const AuthorEditView = ({ author, onSave, onCancel }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {author.firstName[0]}{author.lastName[0]}
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
          onClick={() => onSave(author)}
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
const AuthorsPage = forwardRef(({onHeightChange}, ref) => {
  const [authors, setAuthors] = useState([
    {
      id: 1,
      firstName : 'Sarah',
      midInitials: '',
      lastName : 'Johnson',
      email: 'sarah.johnson@example.com',
      role: 'Senior Frontend Developer',
      department: 'Engineering',
      bio: 'Passionate about creating beautiful and functional user interfaces with over 5 years of experience in React and modern web technologies.',
      location: 'San Francisco, CA',
      website: 'https://sarahjohnson.dev',
      joinDate: '2022-03-15',
      expertise: 'React, TypeScript, CSS, UI/UX Design',
      phone: '+1 (555) 123-4567'
    },
    {
      id: 2,
      firstName : 'Michael',
      midInitials: '',
      lastName : 'Chen',
      email: 'michael.chen@example.com',
      role: 'Backend Engineer',
      department: 'Engineering',
      bio: 'Full-stack developer with expertise in Node.js, Python, and cloud architecture. Loves solving complex problems and optimizing performance.',
      location: 'New York, NY',
      joinDate: '2021-08-20',
      expertise: 'Node.js, Python, AWS, Docker, PostgreSQL',
      phone: '+1 (555) 987-6543'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [viewingAuthor, setViewingAuthor] = useState(null);

  const innerRef = useRef(null); // Ref for the actual div we want to measure


  // Replaced the manual useRef and useEffect with the custom hook
  const elementToObserveRef = useResizeObserver(onHeightChange);

  // Combine the forwarded ref with the resize observer's ref
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  useEffect(() => {
    console.log(elementToObserveRef)
  }, [elementToObserveRef]);


  const handleAddAuthor = (authorData) => {
    setAuthors([...authors, authorData]);
    setShowAddForm(false);
  };

  const handleEditAuthor = (authorData) => {
    setAuthors(authors.map(author => 
      author.id === authorData.id ? authorData : author
    ));
    setEditingAuthor(null);
    setViewingAuthor(null);
  };

  const handleRemoveAuthor = (authorId) => {
    if (window.confirm('Are you sure you want to remove this author?')) {
      setAuthors(authors.filter(author => author.id !== authorId));
    }
  };

  const startEditMode = (author) => {
    setViewingAuthor(null);
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
            onClick={() => setShowAddForm(true)}
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
                <p className="text-2xl font-bold text-gray-900">{new Set(authors.map(a => a.department)).size}</p>
                <p className="text-sm text-gray-600">Departments</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{new Set(authors.map(a => a.location)).size}</p>
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
              {(viewingAuthor !== author && editingAuthor !== author) &&
                <AuthorCard
                  author={author}
                  onEdit={(author) => {
                    startEditMode(author)
                  }}
                  onRemove={handleRemoveAuthor}
              />}
             
            </div>
          ))}
        </div>

        {authors.length === 0 && (
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
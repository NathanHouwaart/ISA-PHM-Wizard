import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import { AuthorCard } from './AuthorCard';
import { AuthorForm } from './AuthorForm';
import { AuthorView } from './AuthorView';

// Main Authors Page Component
const AuthorsPage = forwardRef(({ onHeightChange, authors, onAddAuthor, onEditAuthor, onRemoveAuthor }, ref) => {
    // authors are now received as a prop from Contact.jsx
    // REMOVE: const [authors, setAuthors] = useState(initialAuthorsData);

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
                        <AuthorView
                            author={viewingAuthor}
                            onSave={startEditMode}
                            onCancel={() => setViewingAuthor(null)}
                        />
                    </div>
                )}

                {/* Authors Grid */}
                <div className="w-full space-y-2">
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
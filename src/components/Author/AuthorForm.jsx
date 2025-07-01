import React, {useState, useEffect} from "react";
import { X, Save } from "lucide-react";

import authorsFormFields from "../../data/AuthorFormFields.json"
import FormField from "../Form/FormField";

export const AuthorForm = ({ item, onSave, onCancel, isEditing = false }) => {

    const author = item;

  const [formData, setFormData] = useState({});

  useEffect(() => {
      const newFormData = {};
      authorsFormFields.fields.forEach(field => {
          newFormData[field.id] = author?.[field.id] || '';
      });

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

        if(1){
            return <FormField 
                key={field.id}
                name={field.id}
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                explanation={field.explanation}
                example={field.example}
                onChange={handleChange}
                value={value}
                required={field.cardinality === '1' && field.id !== 'id'}
            />;
        }else{

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

            <div className="space-y-3">
                {/* Group First Name, Mid Initials, Last Name */}
                <div className='grid grid-cols-3 gap-x-8'>
                    {authorsFormFields.fields.filter(field =>
                        field.id === 'firstName' || field.id === 'midInitials' || field.id === 'lastName'
                    ).map(renderField)}
                </div>

                {/* Grid for other fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
                    {authorsFormFields.fields.filter(field =>
                        field.id !== 'firstName' &&
                        field.id !== 'midInitials' &&
                        field.id !== 'lastName' &&
                        field.id !== 'id'
                    ).map(renderField)}
                </div>

                {/* Single line fields like Expertise */}
                {authorsFormFields.fields.filter(field => field.id === 'expertise').map(renderField)}

                {/* Textarea for Bio */}
                {authorsFormFields.fields.filter(field => field.id === 'bio').map(renderField)}

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
};


export default AuthorForm;

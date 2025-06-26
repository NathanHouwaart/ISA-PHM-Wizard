import { X, Mail, User, MapPin, Calendar, Edit2 } from "lucide-react";


export const AuthorView = ({ item, onSave, onCancel }) => {
    
    const author = item;
  
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


export default AuthorView;

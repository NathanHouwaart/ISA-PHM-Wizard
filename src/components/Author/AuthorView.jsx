import { X, Mail, User, MapPin, Calendar, Edit2, Smartphone, Printer, Fingerprint, BriefcaseBusiness } from "lucide-react";
import TooltipButton from "../Widgets/TooltipButton";


export const AuthorView = ({ item, onSave, onCancel }) => {

  const author = item;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mx-4 mb-6">
        <div className="mb-4 flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {author.firstName?.[0]}{author.lastName?.[0]}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{author.firstName} {author.midInitials} {author.lastName}</h3>
            <p className="text-lg text-gray-600">{author.role}</p>
            <p className="text-sm text-gray-500">{author.department}</p>
          </div>
        </div>
        <TooltipButton
          className="p-2 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onCancel}
          tooltipText="Close"
        >
          <X className="w-5 h-5" />
        </TooltipButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 mx-6 mb-6">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{author.email}</p>
            </div>
          </div>

          {author.phone && (
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900">{author.phone}</p>
              </div>
            </div>
          )}

          {author.fax && (
            <div className="flex items-center space-x-3">
              <Printer className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Fax</p>
                <p className="text-gray-900">{author.fax}</p>
              </div>
            </div>
          )}

          {author.address && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-900">{author.address}</p>
              </div>
            </div>
          )}

          {author.role && (
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-gray-900">{author.role}</p>
              </div>
            </div>
          )}

          {author.orcid && (
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">ORCID</p>
                <a href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  {author.orcid}
                </a>
              </div>
            </div>
          )}

          {author.affiliations && (
            <div className="flex items-center space-x-3">
              <BriefcaseBusiness className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Affiliation</p>
                  {author.affiliations.join(', ')}
              </div>
            </div>
          )}
      </div>

      <div className="flex justify-end">
        <TooltipButton
          onClick={() => onSave(author)} // This will call startEditMode and pass the current author
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
          tooltipText="Edit Author"
        >
          <Edit2 className="w-4 h-4" />
          <span>Edit Author</span>
        </TooltipButton>
      </div>
    </div>
  );
};


export default AuthorView;

import { ArrowDown, ArrowUp, Edit2, Trash2, UserPen } from "lucide-react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { formatContactName } from "../../utils/utils";
import Heading3 from "../Typography/Heading3";
import Paragraph from "../Typography/Paragraph";
import TooltipButton from "../Widgets/TooltipButton";
// Display contact list and corresponding badge. Contribution priority UI was removed.

export const PublicationCard = ({ item, onEdit, onRemove }) => {

    const publication = item;

    const { contacts } = useGlobalDataContext();

    const correspondingContactId = publication.correspondingContactId || null;
    const contactDetails = publication.contactList
        .map(contactId => {
            const contact = contacts.find(item => item.id === contactId);
            if (!contact) return null;
            return {
                ...contact,
                isCorresponding: correspondingContactId === contactId,
            };
        })
        .filter(Boolean);

    // contribution priority removed: we only display names and corresponding badge

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {/* Display initials from the first two words of the title, if available */}
                        {publication.title.split(" ").slice(0, 2).map(word => word[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                        <Heading3>{publication.title}</Heading3>
                        <div className="mt-1 text-sm text-gray-500 space-y-2">
                            {contactDetails.length > 0 ? (
                                <>
                                    <Paragraph className="flex items-center gap-2 text-gray-600">
                                        <UserPen className="w-4 h-4 text-gray-500" />
                                        <span className="font-semibold text-gray-700">Author contributions</span>
                                    </Paragraph>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {contactDetails.map((contact, index) => (
                                            <div
                                                key={contact.id}
                                                className="w-full flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                            >
                                                <span className="font-semibold truncate">
                                                    {index + 1}. {formatContactName(contact)}
                                                </span>
                                                {contact.isCorresponding && (
                                                    <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                                        Corresponding
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <Paragraph className="text-gray-500 text-sm">No contact listed</Paragraph>
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
                                <p className='font-bold'>Publication Satus - </p>
                                <span>{
                                    publication.publicationStatus ? (
                                        <p>
                                            {publication.publicationStatus}
                                        </p>) :
                                        "not provided"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <div className="flex space-x-2">
                        <TooltipButton
                            className="p-2 bg-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); onEdit(publication) }}
                            tooltipText="Edit publication"
                        >
                            <Edit2 className="w-4 h-4" />
                        </TooltipButton>

                        <TooltipButton
                            className="p-2 bg-transparent text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); onRemove(publication.id) }}
                            tooltipText="Remove publication"
                        >
                            <Trash2 className="w-4 h-4" />
                        </TooltipButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

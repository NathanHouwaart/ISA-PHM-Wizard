import { ArrowDown, ArrowUp, Edit2, Trash2, UserPen, Mail, Link, BookOpen } from "lucide-react";
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
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-50 text-gray-600">
                                            <UserPen className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className='text-xs font-bold text-gray-700'>Author contributions</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                {contactDetails.map((contact, index) => (
                                                    <div
                                                        key={contact.id}
                                                        className="w-full flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                                    >
                                                        <span className="font-semibold truncate">
                                                            {index + 1}. {formatContactName(contact)}
                                                        </span>
                                                        {contact.isCorresponding && (
                                                            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />
                                                                Corresponding
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Paragraph className="text-gray-500 text-sm">No contact listed</Paragraph>
                            )}
                        </div>
                        <div className="mt-3 text-sm text-gray-500 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-50 text-gray-600">
                                    <Link className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className='text-xs font-bold text-gray-700'>DOI</p>
                                    {publication.doi ? (
                                        <a className="text-blue-600 text-sm hover:underline" href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer">
                                            {publication.doi}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-500">not provided</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-50 text-gray-600">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className='text-xs font-bold text-gray-700'>Publication status</p>
                                    {publication.publicationStatus ? (
                                        <p className="text-sm text-gray-700">{publication.publicationStatus}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500">not provided</p>
                                    )}
                                </div>
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

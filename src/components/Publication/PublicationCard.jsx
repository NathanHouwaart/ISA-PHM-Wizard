import { Edit2, Trash2, UserPen } from "lucide-react";
import { useGlobalDataContext } from "../../contexts/GlobalDataContext";
import { formatAuthorName } from "../../utils/utils";
import Heading3 from "../Typography/Heading3";
import TooltipButton from "../Widgets/TooltipButton";

export const PublicationCard = ({ item, onEdit, onRemove }) => {

    const publication = item;

    const { authors } = useGlobalDataContext();

    // Maps Author ID's stored in publication.authorList to actual Author Names
    const authorNames = publication.authorList
        .map(authorId => authors.find(author => author.id === authorId))
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
                        <Heading3>{publication.title}</Heading3>
                        {/* Displaying authors in PublicationCard - now looking up full details by ID */}
                        <div className='flex flex-wrap items-center space-x-1 mt-1 text-sm text-gray-500'>
                            {authorNames.length > 0 ? (
                                <p className="text-gray-600 text-sm">
                                    <UserPen className="inline-block w-4 h-4 mr-1 text-gray-500" />
                                        {authorNames.map((author, index) => {
                                            return <span key={index} style={{ whiteSpace: "pre" }}>{index + 1}. {author}   </span>
                                        })}
                                    {/* {authorNames.join(', ')} */}
                                </p>
                            ) : <p className="text-gray-500 text-sm">No authors listed</p>
                            }
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
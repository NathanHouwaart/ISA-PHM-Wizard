import React from "react";
import { Edit2, Mail, MapPin, Trash2 } from "lucide-react";
import Heading3 from "../Typography/Heading3";
import Paragraph, { CardParagraph } from "../Typography/Paragraph";
import IconToolTipButton from "../Widgets/IconTooltipButton";
import TooltipButton from "../Widgets/TooltipButton";


export const AuthorCard = ({ item, onEdit, onRemove }) => {
    const author = item;
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {author.firstName?.[0]}{author.lastName?.[0]}
          </div>
          <div>
            <Heading3>{author.firstName} {author.midInitials} {author.lastName}</Heading3>
            <CardParagraph>
              {author.roles && author.roles.length > 0 
                ? author.roles.join(', ') 
                : 'No roles assigned'
              }
            </CardParagraph>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>{author.email}</span>
              </div>
              {author.address && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{author.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={(e) => {e.stopPropagation(); onEdit(author)}}
            tooltipText="Edit author"
          >
            <Edit2 className="w-4 h-4" />
          </TooltipButton>

          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={(e) => {e.stopPropagation(); onRemove(author.id)}}
            tooltipText="Remove author"
          >
            <Trash2 className="w-4 h-4" />
          </TooltipButton>
        </div>
      </div>
    </div>
  );
};

export default AuthorCard;
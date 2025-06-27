import { CalendarDays, Edit2, MapPin, Trash2 } from 'lucide-react';
import React from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Shadcn UI Tooltip components


// --- Publication Card Component ---
export const StudyCard = ({ item, onEdit, onRemove }) => {

  const study = item;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex grow-0 items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex flex-none items-center justify-center text-white font-bold text-xl">
            {/* Display initials from the first two words of the title, if available */}
            {study.title.split(" ").slice(0, 2).map(word => word[0]).join("")}
          </div>
          <div>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <h3 className="line-clamp-1 text-xl font-semibold text-gray-900 mr-4">
                    {study.title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p className='max-w-sm'>{study.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  {/* Description area */}
                  <div className="mt-2 mb-3">
                    <p
                      className="min-h-10 text-gray-700 text-sm italic line-clamp-2"
                    >
                      {item.description || "No description available"}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className='max-w-sm'>{item.description || "No description available"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex-row items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <p className='font-bold'>Submission Date - </p>
                <span>{
                  study.submissionDate ? (
                    <p className="flex">
                      <CalendarDays className="w-4 h-4 mr-1 mt-0.25" />
                      <span>{new Date(study.submissionDate).toLocaleDateString()}</span>
                    </p>) :
                    "not provided"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <p className='font-bold'>Publication Date - </p>
                <span>{
                  study.publicationDate ? (
                    <p className="flex">
                      <CalendarDays className="w-4 h-4 mr-1 mt-0.25" />
                      <span>{new Date(study.publicationDate).toLocaleDateString()}</span>
                    </p>) :
                    "not provided"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit publication"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove publication"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


export default StudyCard;
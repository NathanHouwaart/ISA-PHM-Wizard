import { CalendarDays, Edit2, Trash2 } from 'lucide-react';
import React from 'react';

import AvatarInitials from '../Widgets/AvatarInitials';
import TooltipButton from '../Widgets/TooltipButton';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';

/**
 * StudyCard Component
 * 
 * Card component for displaying study information with edit/remove actions.
 * Shows study name, description, dates, and run count with gradient avatar.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.item - The study object
 * @param {string} props.item.name - Study name
 * @param {string} props.item.description - Study description
 * @param {string} [props.item.submissionDate] - ISO date string for submission
 * @param {string} [props.item.publicationDate] - ISO date string for publication
 * @param {number} [props.item.runCount=1] - Number of runs/files
 * @param {() => void} props.onEdit - Handler for edit action
 * @param {() => void} props.onRemove - Handler for remove action
 * @returns {JSX.Element} Study card with actions
 */
const StudyCard = ({ item, onEdit, onRemove }) => {

  const study = item;
  const { experimentType } = useGlobalDataContext();
  const experimentConfig = getExperimentTypeConfig(experimentType);
  const runsLabel = experimentConfig.supportsMultipleRuns ? 'Runs' : 'Files';
  const normalizedRunCount = Number.parseInt(study?.runCount, 10) || 1;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex grow-0 items-center space-x-4">
          <AvatarInitials 
            name={study?.name || 'Study'} 
            size="md"
            gradientFrom="from-blue-500"
            gradientTo="to-purple-600"
          />
          <div>
            <h3 className="line-clamp-1 text-xl font-semibold text-gray-900 mr-4">
              {study.name}
            </h3>
            <div className="mt-2 mb-3">
              <p className="min-h-10 text-gray-700 text-sm italic line-clamp-2">
                {item.description || "No description available"}
              </p>
            </div>
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
              <div className="flex items-center space-x-1">
                <p className='font-bold'>{runsLabel} - </p>
                <span>{normalizedRunCount}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            tooltipText="Edit study"
          >
            <Edit2 className="w-4 h-4" />
          </TooltipButton>
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            tooltipText="Remove study"
          >
            <Trash2 className="w-4 h-4" />
          </TooltipButton>
        </div>
      </div>
    </div>
  );
};


export default StudyCard;

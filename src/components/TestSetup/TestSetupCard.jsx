import React from 'react';
import { Edit2, Trash2, MapPin, Gauge, Settings, MessageCircle } from 'lucide-react';
import TestSetupForm from './TestSetupForm';
import TooltipButton from '../Widgets/TooltipButton';

const TestSetupCard = ({ item, onEdit, onRemove }) => {
  // Create abbreviation from item name
  const getAbbreviation = (name) => {
    const words = name.split(' ');
    if (words.length === 1) {
      // If only one word, take first two letters
      return name.substring(0, 2).toUpperCase();
    } else {
      // If multiple words, take first letter of first two words
      return words
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
  };

  // Get unique measurement types from sensors
  const getMeasurementTypes = (sensors) => {
    if (!sensors || sensors.length === 0) return [];
    const types = [...new Set(sensors.map(sensor => sensor.measurementType))];
    return types;
  };

  const measurementTypes = getMeasurementTypes(item.sensors);
  const characteristicsCount = item.characteristics?.length || 0;

  // Count total comments across all characteristics
  const getTotalComments = (characteristics) => {
    if (!characteristics) return 0;
    return characteristics.reduce((total, char) => {
      return total + (char.comments?.length || 0);
    }, 0);
  };

  const totalComments = getTotalComments(item.characteristics);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {getAbbreviation(item.name)}
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
            <p className="text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {item.location}
            </p>

            {/* Description area */}
            <div className="mt-2 mb-3">
              <p className="text-gray-700 text-sm italic line-clamp-2">
                {item.description || "No description available"}
              </p>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Gauge className="w-4 h-4" />
                <span>{item.number_of_sensors} sensor{item.number_of_sensors !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Settings className="w-4 h-4" />
                <span>{characteristicsCount} characteristic{characteristicsCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{totalComments} comment{totalComments !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {measurementTypes.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                Measures: {measurementTypes.join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <TooltipButton
            tooltipText="Edit item"
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            className="bg-transparent p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </TooltipButton>

          <TooltipButton
            tooltipText="Remove item"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            className="bg-transparent p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </TooltipButton>
          
        </div>
      </div>
    </div>
  );
};

export default TestSetupCard;
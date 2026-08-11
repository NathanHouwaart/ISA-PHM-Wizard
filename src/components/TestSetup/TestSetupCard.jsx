import React, { useState } from 'react';
import { Download, Edit2, Trash2, MapPin, Gauge, Settings, MessageCircle, Layers } from 'lucide-react';
import TooltipButton from '../Widgets/TooltipButton';
import AvatarInitials from '../Widgets/AvatarInitials';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import { createTestSetupArchive, getTestSetupArchiveFileName } from '../../utils/testSetupArchive';

const TestSetupCard = ({ item, onEdit, onRemove, isEditable = true }) => {
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await createTestSetupArchive(item);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getTestSetupArchiveFileName(item);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error?.message || 'The test setup package could not be created.');
    } finally {
      setIsExporting(false);
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
  const measurementProtocolCount = item.measurementProtocols?.length || 0;
  const processingProtocolCount = item.processingProtocols?.length || 0;

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
          <AvatarInitials 
            name={item.name} 
            size="md"
            gradientFrom="from-green-500"
            gradientTo="to-blue-600"
          />
          <div className="flex-1 space-y-2">
            <Heading3 className="text-gray-900">{item.name}</Heading3>
            <Paragraph className="text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {item.location}
            </Paragraph>

            {/* Description area */}
            <div className="mt-2 mb-3">
              <Paragraph className="text-gray-700 text-sm italic line-clamp-2">
                {item.description || "No description available"}
              </Paragraph>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1.5">
                <Gauge className="w-4 h-4" />
                <span>{item.number_of_sensors ?? item.sensors?.length ?? 0} sensor{(item.number_of_sensors ?? item.sensors?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1.5">
                <Settings className="w-4 h-4" />
                <span>{characteristicsCount} characteristic{characteristicsCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1.5">
                <Layers className="w-4 h-4" />
                <span>{measurementProtocolCount} measurement protocol{measurementProtocolCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1.5">
                <Layers className="w-4 h-4" />
                <span>{processingProtocolCount} processing protocol{processingProtocolCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1.5">
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
          {isEditable && (
            <>
              <TooltipButton
                tooltipText="Edit item"
                onClick={(e) => { e.stopPropagation(); onEdit(item) }}
                className="bg-transparent p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </TooltipButton>

              <TooltipButton
                tooltipText="Export test setup"
                onClick={(event) => { event.stopPropagation(); handleExport(); }}
                disabled={isExporting}
                className="bg-transparent p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </TooltipButton>

              <TooltipButton
                tooltipText="Remove item"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                className="bg-transparent p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </TooltipButton>
            </>
          )}
        </div>
      </div>
      <AlertDecisionDialog
        open={Boolean(exportError)}
        tone="danger"
        title="Unable to export test setup"
        message={exportError}
        confirmLabel="OK"
        showCancel={false}
        onConfirm={() => setExportError('')}
        onCancel={() => setExportError('')}
      />
    </div>
  );
};

export default TestSetupCard;

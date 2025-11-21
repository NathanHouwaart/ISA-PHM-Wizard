import React from 'react';
import { Layers } from 'lucide-react';
import FormField from './Form/FormField';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import Heading3 from './Typography/Heading3';
import Paragraph from './Typography/Paragraph';


export function StudyMeasurementMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter }) {

    const { selectedTestSetupId, testSetups } = useGlobalDataContext();
    
    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    return (
        <div className='h-full'>
            {/* Conditional rendering of tab content */}
            {item && selectedTestSetupId ? (
                <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
                    {/* Variable Header, Edit/Remove Buttons */}
                    <div className='mb-4 border-b pb-4'>
                        <div className="flex justify-between items-start ">
                            <Heading3 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                                {item?.displayName || item?.name}
                            </Heading3>

                        </div>
                        <Paragraph className="text-md text-gray-700 mt-2 italic">
                            {item.description || "no description available"}
                        </Paragraph>
                        <Paragraph className="text-sm text-gray-600 mt-1">
                            {item.runCount > 1 ? `Run ${item.runNumber} of ${item.runCount}` : 'Single run'}
                        </Paragraph>
                    </div>
                    {/* Studies Grid - this is where the dynamic inputs are */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedTestSetup?.sensors.map((sensor, index) => {
                            const existingMapping = mappings.find(
                                (m) => {
                                    const mappingStudyRunId = m.studyRunId || m.studyId;
                                    const targetRunId = item?.runId || item?.id;
                                    return mappingStudyRunId === targetRunId && m.sensorId === sensor.id;
                                }
                            );

                            // Fallback if no mapping exists yet
                            const mapping = existingMapping || {
                                sensorId: sensor.id,
                                studyRunId: item?.runId || item?.id,
                                studyId: item?.studyId || item?.id,
                                value: ''
                            };

                            return (
                                <div
                                    key={sensor?.id ?? `sensor-${index}`}
                                    className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                >
                                    <FormField
                                        label={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                        name={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                        value={mapping.value}
                                        commitOnBlur={true}
                                        onChange={(e) => handleInputChange(
                                            0,
                                            {
                                                sensorId: sensor.id,
                                                studyRunId: mapping.studyRunId || (item?.runId || item?.id),
                                                studyId: item?.studyId || item?.id
                                            },
                                            e.target.value
                                        )}
                                        placeholder={"Enter filename"}
                                    />

                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 text-lg">
                    <Layers className="w-16 h-16 mb-4 text-gray-500" />
                    <Heading3 className="text-xl font-semibold text-gray-700">
                        No test setup selected
                    </Heading3>
                    <Paragraph className="text-center mt-1">
                        Go to the project settings (icon with three layers) and select a test setup for your project
                    </Paragraph>
                </div>
            )}
        </div>
    )
}

export default StudyMeasurementMappingCard;

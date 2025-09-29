import { useState, useRef } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

// Hook responsibility: perform the submit/convert API call using data from the
// GlobalDataContext. Keeps isSubmitting and message local to the hook so the
// context remains a pure data store.
export default function useSubmitData() {
  const {
    investigations,
    publications,
    contacts,
    studyVariables,
    processingProtocols,
    studies,
    testSetups,
    selectedTestSetupId,
    studyToStudyVariableMapping,
    studyToSensorMeasurementMapping,
    sensorToProcessingProtocolMapping,
    studyToSensorProcessingMapping,
    studyToAssayMapping,
  } = useGlobalDataContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('Submitting data...');
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const submitData = async () => {
    // create a fresh AbortController for this submit
  const ac = new AbortController();
  // keep the controller in a ref for immediate sync access from cancel()
  controllerRef.current = ac;

    setIsSubmitting(true);
    setMessage('Preparing data...');
    setError(null);

    try {
      const jsonData = {
        identifier: investigations?.investigationIdentifier,
        title: investigations?.investigationTitle,
        description: investigations?.investigationDescription,
        license: investigations?.license,
        submission_date: investigations?.submissionDate,
        public_release_date: investigations?.publicReleaseDate,
        publications: publications,
        authors: contacts,
        study_variables: studyVariables,
        processing_protocols: processingProtocols,
        studies: (studies || []).map((study) => ({
          ...study,
          publications,
          contacts,
          used_setup: (testSetups || []).find((setup) => setup.id === selectedTestSetupId),
          study_to_study_variable_mapping: (studyToStudyVariableMapping || [])
            .filter((mapping) => mapping.studyId === study.id)
            .map((mapping) => {
              const variable = (studyVariables || []).find((v) => v.id === mapping.studyVariableId);
              return {
                studyId: mapping.studyId,
                studyVariableId: mapping.studyVariableId,
                value: mapping.value,
                variableName: variable?.name || 'Unknown Variable',
              };
            }),
          assay_details: ((testSetups || []).find((setup) => setup.id === selectedTestSetupId)?.sensors || []).map((sensor) => {
            const used_sensor = Object.fromEntries(
              Object.entries(sensor).filter(([key]) => !key.startsWith('processingProtocol'))
            );

            const normalizedMappings = (sensorToProcessingProtocolMapping || [])
              .filter((m) => String(m.sourceId) === String(sensor.id) || String(m.sensorId) === String(sensor.id))
              .map((m) => ({
                sourceId: m.sourceId ?? m.sensorId ?? null,
                targetId: m.targetId ?? m.target ?? m.mappingTargetId ?? null,
                value: m.value ?? [],
              }));

            const processing_protocols = normalizedMappings;

            return {
              used_sensor,
              processing_protocols,
              raw_file_name: (studyToSensorMeasurementMapping || []).find((mapping) => mapping.sensorId === sensor.id && mapping.studyId === study.id)?.value || '',
              processed_file_name: (studyToSensorProcessingMapping || []).find((mapping) => mapping.sensorId === sensor.id && mapping.studyId === study.id)?.value || '',
              assay_file_name: (studyToAssayMapping || []).find((mapping) => mapping.sensorId === sensor.id && mapping.studyId === study.id)?.value || '',
            };
          }),
        })),
      };

      setMessage('Uploading to conversion service...');

      const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'input.json');

      const DEFAULT_PROD_API = 'https://dwvmqgeaan.eu-west-1.awsapprunner.com';
      const apiBase = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE)
        ? import.meta.env.VITE_API_BASE
        : (import.meta.env.MODE === 'development' ? 'http://localhost:8000' : DEFAULT_PROD_API);

      const endpoint = `${apiBase.replace(/\/$/, '')}/convert`;

  const response = await fetch(endpoint, { method: 'POST', body: formData, signal: ac.signal });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || 'Conversion failed');
      }

      setMessage('Downloading converted result...');

      const result = await response.json();

      const jsonString = JSON.stringify(result, null, 2);
      const downloadBlob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'isa-phm-out.json';
      a.click();
      URL.revokeObjectURL(url);

      setMessage('Done');
      return result;
    } catch (err) {
      console.error('[useSubmitData] error', err);
      if (err.name === 'AbortError') {
        // cancelled by user
        setMessage('Submission cancelled');
        setError(null);
      } else {
        setError(err);
        setMessage('Error: ' + (err?.message || 'Conversion failed'));
      }
      throw err;
    } finally {
      // small delay so user sees final message briefly
      setTimeout(() => {
        setIsSubmitting(false);
        controllerRef.current = null;
      }, 600);
    }
  };

  const cancel = () => {
    const current = controllerRef.current;
    if (current) {
      setMessage('Cancelling...');
      current.abort();
      // clear immediately to avoid repeated abort attempts
      controllerRef.current = null;
    }
  };

  const retry = async () => {
    // Clear previous error and re-run submit
    setError(null);
    setMessage('Retrying...');
    return submitData();
  };

  const clearError = () => {
    setError(null);
    setMessage('');
  };

  return { submitData, isSubmitting, message, error, setMessage, cancel, retry, clearError };
}

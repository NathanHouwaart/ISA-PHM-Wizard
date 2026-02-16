import { useState, useRef, useMemo } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { expandStudiesIntoRuns } from '../utils/studyRuns';

// Hook responsibility: perform the submit/convert API call using data from the
// GlobalDataContext. Keeps isSubmitting and message local to the hook so the
// context remains a pure data store.
export default function useSubmitData() {
  const {
    investigations,
    publications,
    contacts,
    studyVariables,
    measurementProtocols,
    processingProtocols,
    studies,
    testSetups,
    selectedTestSetupId,
    experimentType,
    studyToStudyVariableMapping,
    sensorToMeasurementProtocolMapping,
    studyToSensorMeasurementMapping,
    sensorToProcessingProtocolMapping,
    studyToSensorProcessingMapping,
  } = useGlobalDataContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('Submitting data...');
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const allStudyRuns = useMemo(() => expandStudiesIntoRuns(studies), [studies]);
  const runsByStudyId = useMemo(() => {
    return allStudyRuns.reduce((acc, run) => {
      if (!run?.studyId) return acc;
      if (!acc[run.studyId]) {
        acc[run.studyId] = [];
      }
      acc[run.studyId].push(run);
      return acc;
    }, {});
  }, [allStudyRuns]);

  const getRunsForStudy = (study) => {
    const runs = runsByStudyId[study.id];
    if (runs && runs.length > 0) {
      return runs;
    }
    return expandStudiesIntoRuns([study]);
  };

  // Helper: normalize protocol mappings for a given sensor id
  const mapProtocolsForSensor = (mappings = [], sensorId) => {
    if (!mappings || mappings.length === 0) return [];
    return (mappings || [])
      .filter((m) => String(m.sourceId) === String(sensorId) || String(m.sensorId) === String(sensorId))
      .map((m) => {
        // Normalize value to array format [specification, unit]
        let normalizedValue = [];
        if (Array.isArray(m.value)) {
          normalizedValue = m.value;
        } else if (typeof m.value === 'object' && m.value !== null) {
          // Convert object format { specification, unit } to array [specification, unit]
          normalizedValue = [m.value.specification ?? '', m.value.unit ?? ''];
        }
        return {
          sourceId: m.sourceId ?? m.sensorId ?? null,
          targetId: m.targetId ?? m.target ?? m.mappingTargetId ?? null,
          value: normalizedValue,
        };
      });
  };

  const resolveRunMapping = (mappings = [], sensorId, run) => {
    if (!Array.isArray(mappings)) return null;
    return mappings.find((mapping) => {
      if (!mapping || mapping.sensorId !== sensorId) return false;
      if (mapping.studyRunId) {
        return mapping.studyRunId === run.runId;
      }
      return mapping.studyId === run.studyId;
    }) || null;
  };

  const generateAssayFileName = (studyIndex = 0, sensorIndex = 0) => {
    const studyCode = String(studyIndex + 1).padStart(2, '0');
    const sensorCode = String(sensorIndex + 1).padStart(2, '0');
    return `a_st${studyCode}_se${sensorCode}`;
  };

  const buildAssayDetails = (studyRuns, sensors, studyIndex) => {
    const safeSensors = Array.isArray(sensors) ? sensors : [];

    return safeSensors.map((sensor, sensorIndex) => {
      const used_sensor = Object.fromEntries(
        Object.entries(sensor).filter(([key]) => !key.startsWith('processingProtocol'))
      );

      const runs = (studyRuns || []).map((run) => {
        const rawMapping = resolveRunMapping(studyToSensorMeasurementMapping, sensor.id, run);
        const processingMapping = resolveRunMapping(studyToSensorProcessingMapping, sensor.id, run);

        return {
          run_number: run.runNumber,
          study_run_id: run.runId,
          study_id: run.studyId,
          raw_file_name: rawMapping?.value || '',
          processed_file_name: processingMapping?.value || '',
        };
      });

      return {
        assay_file_name: generateAssayFileName(studyIndex, sensorIndex),
        used_sensor,
        measurement_protocols: mapProtocolsForSensor(sensorToMeasurementProtocolMapping, sensor.id),
        processing_protocols: mapProtocolsForSensor(sensorToProcessingProtocolMapping, sensor.id),
        runs,
      };
    });
  };

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
        experiment_type: experimentType,
        publications: publications,
        contacts: contacts,
        study_variables: studyVariables,
        measurement_protocols: measurementProtocols,
        processing_protocols: processingProtocols,
        studies: (studies || []).map((study, studyIndex) => {
          const studyRuns = getRunsForStudy(study);
          const totalRuns = Array.isArray(studyRuns) ? studyRuns.length : 0;
          const sensors = (testSetups || []).find((setup) => setup.id === selectedTestSetupId)?.sensors || [];
          return {
            ...study,
            total_runs: totalRuns,
            publications,
            contacts,
            used_setup: (testSetups || []).find((setup) => setup.id === selectedTestSetupId),
            study_to_study_variable_mapping: studyRuns.flatMap((run) => (
              (studyToStudyVariableMapping || [])
                .filter((mapping) => {
                  if (mapping.studyRunId) {
                    return mapping.studyRunId === run.runId;
                  }
                  return mapping.studyId === run.studyId;
                })
                .map((mapping) => {
                  const variable = (studyVariables || []).find((v) => v.id === mapping.studyVariableId);
                  return {
                    studyId: run.studyId,
                    studyRunId: mapping.studyRunId || run.runId,
                    runNumber: run.runNumber,
                    studyVariableId: mapping.studyVariableId,
                    value: mapping.value,
                    variableName: variable?.name || 'Unknown Variable',
                  };
                })
            )),
            assay_details: buildAssayDetails(studyRuns, sensors, studyIndex),
          };
        }),
      };

      setMessage('Uploading to conversion service...');

      console.log('[useSubmitData] submitting', jsonData);

      const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'input.json');

      const DEFAULT_PROD_API = 'https://dwvmqgeaan.eu-west-1.awsapprunner.com';
      const apiBase = (import.meta.env && import.meta.env.VITE_API_BASE)
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

import { useState, useRef, useEffect } from 'react';
import { useProjectData } from '../contexts/GlobalDataContext';
import { buildConversionPayload } from '../utils/conversionPayload';
import { waitForNextPaint } from '../utils/waitForNextPaint';
import { buildDatasheetUploadManifest } from '../utils/datasheetUploadManifest';
import { buildImageUploadManifest } from '../utils/imageUploadManifest';
import { validateMeasurementMetadata } from '../utils/measurementMetadataValidation';
import { getTestSetupReadiness } from '../utils/testSetupReadiness';
import { readSpecificationValidationReport } from '../utils/specificationValidationReport';
import { toArchiveBytes } from '../utils/archiveSecurity';

const DEV_LOGS = Boolean(import.meta.env?.DEV);
const debugLog = (...args) => {
  if (DEV_LOGS) {
    console.log(...args);
  }
};

const sanitizeFileName = (value) => {
  const source = typeof value === 'string' ? value : '';
  return source
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getDatasetDownloadFileName = (projectName, isZip) => {
  const fileBaseName = sanitizeFileName(projectName || 'Project') || 'Project';
  return `${fileBaseName} ISA-PHM Dataset.${isZip ? 'zip' : 'json'}`;
};

// Hook responsibility: perform the submit/convert API call using data from the
// GlobalDataContext. Keeps isSubmitting and message local to the hook so the
// context remains a pure data store.
export default function useSubmitData() {
  const {
    investigation,
    publications,
    contacts,
    studyVariables,
    studies,
    configurations,
    configurationTypes,
    testSetups,
    selectedTestSetupId,
    experimentType,
    studyToStudyVariableMapping,
    studyToSensorMeasurementMapping,
    studyToSensorProcessingMapping,
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
    currentProjectId,
    projects = [],
  } = useProjectData();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('Submitting data...');
  const [error, setError] = useState(null);
  const [specificationReport, setSpecificationReport] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => { setSpecificationReport(null); }, [currentProjectId]);

  const submitData = async () => {
    // create a fresh AbortController for this submit
    const ac = new AbortController();
    // keep the controller in a ref for immediate sync access from cancel()
    controllerRef.current = ac;

    setIsSubmitting(true);
    setMessage('Preparing data...');
    setError(null);
    setSpecificationReport(null);
    await waitForNextPaint();

    try {
      const selectedSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
      const setupIssues = getTestSetupReadiness(selectedSetup);
      if (setupIssues.length) throw new Error(`The selected test setup is incomplete. Complete these items before export:\n${setupIssues.map((issue) => `- ${issue.message}`).join('\n')}`);
      const jsonData = buildConversionPayload({
        investigation,
        publications,
        contacts,
        studyVariables,
        studies,
        configurations,
        configurationTypes,
        testSetups,
        selectedTestSetupId,
        experimentType,
        studyToStudyVariableMapping,
        studyToSensorMeasurementMapping,
        studyToSensorProcessingMapping,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
      });

      const metadataErrors = validateMeasurementMetadata(jsonData);
      if (metadataErrors.length) throw new Error(`Complete measurement metadata before export:\n${metadataErrors.join('\n')}`);

      setMessage('Uploading to conversion service...');

      debugLog('[useSubmitData] submitting', jsonData);

      const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'input.json');
      const { manifest, files } = await buildDatasheetUploadManifest(jsonData);
      formData.append('datasheet_manifest', JSON.stringify(manifest));
      files.forEach(({ attachmentId, file: datasheet }) => {
        formData.append('datasheets', datasheet, `${attachmentId}.pdf`);
      });
      const { manifest: imageManifest, files: imageFiles } = await buildImageUploadManifest(jsonData);
      formData.append('image_manifest', JSON.stringify(imageManifest));
      imageFiles.forEach(({ attachmentId, file: image }) => {
        const extension = image.type === 'image/png' ? 'png' : 'jpg';
        formData.append('images', image, `${attachmentId}.${extension}`);
      });

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

      const contentType = response.headers.get('content-type') || '';
      const isZip = contentType.includes('application/zip');
      const result = isZip ? null : await response.json();
      const downloadBlob = isZip
        ? await response.blob()
        : new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      setSpecificationReport(readSpecificationValidationReport(
        isZip ? await toArchiveBytes(downloadBlob) : new Uint8Array(),
      ));
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      const activeProjectName = projects.find((project) => project?.id === currentProjectId)?.name;
      a.download = getDatasetDownloadFileName(activeProjectName, isZip);
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

  return { submitData, isSubmitting, message, error, specificationReport, setMessage, cancel, retry, clearError };
}

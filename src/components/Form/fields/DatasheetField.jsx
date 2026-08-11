import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import FormFieldShell from '../FormFieldShell';
import TooltipButton from '../../Widgets/TooltipButton';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';
import { getDatasheetFile, saveDatasheetFile } from '../../../utils/datasheetStore';

const MAX_DATASHEET_BYTES = 25 * 1024 * 1024;

const emptyDatasheet = { attachmentId: '', fileName: '', mimeType: '', size: 0, notAvailable: false };

const DatasheetField = ({ label = 'Datasheet', value, onChange, explanation }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const datasheet = { ...emptyDatasheet, ...(value || {}) };

  useEffect(() => {
    let active = true;
    if (!datasheet.attachmentId) return undefined;
    getDatasheetFile(datasheet.attachmentId).then((attachment) => {
      if (active && !attachment) setError('This datasheet is not stored locally. Please attach the PDF again.');
    }).catch(() => {
      if (active) setError('The local datasheet store is unavailable.');
    });
    return () => { active = false; };
  }, [datasheet.attachmentId]);

  const setDatasheet = (next) => onChange?.(next);

  const selectFile = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setError('Only PDF datasheets can be attached.');
      return;
    }
    if (file.size > MAX_DATASHEET_BYTES) {
      setError('Datasheets must be 25 MB or smaller.');
      return;
    }

    try {
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== '%PDF-') {
        setError('This file is not a valid PDF.');
        return;
      }
      const attachmentId = uuid4();
      await saveDatasheetFile({ id: attachmentId, file });
      setDatasheet({ attachmentId, fileName: file.name, mimeType: 'application/pdf', size: file.size, notAvailable: false });
      setError('');
    } catch {
      setError('The datasheet could not be stored locally.');
    }
  };

  const clearFile = async () => {
    setDatasheet(emptyDatasheet);
    setError('');
  };

  const toggleNotAvailable = async (checked) => {
    setDatasheet({ ...emptyDatasheet, notAvailable: checked });
    setError('');
  };

  return (
    <FormFieldShell label={label} fieldType="text" explanation={explanation}>
      <div>
        <div className="flex items-center gap-2">
          <div
            className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-lg', isDragging && 'ring-2 ring-blue-500')}
            onDragEnter={(event) => { event.preventDefault(); if (!datasheet.notAvailable) setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (!datasheet.notAvailable) selectFile(event.dataTransfer.files?.[0]); }}
          >
            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              readOnly
              value={datasheet.notAvailable ? 'N.A.' : datasheet.fileName}
              placeholder={datasheet.notAvailable ? '' : 'Drop a PDF or select a datasheet'}
              onClick={() => !datasheet.notAvailable && inputRef.current?.click()}
              className={cn(BASE_INPUT_CLASSNAME, 'cursor-pointer', datasheet.notAvailable && 'bg-gray-100 text-gray-500')}
            />
          </div>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />
          {!datasheet.notAvailable && <TooltipButton onClick={() => inputRef.current?.click()} tooltipText="Select PDF datasheet" className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"><Upload className="h-4 w-4" /></TooltipButton>}
          {datasheet.fileName && !datasheet.notAvailable && <TooltipButton onClick={clearFile} tooltipText="Remove datasheet" className="p-2 text-rose-600 hover:bg-rose-50 rounded-md"><X className="h-4 w-4" /></TooltipButton>}
          <label className="flex shrink-0 items-center gap-1.5 text-sm text-gray-700"><input type="checkbox" checked={datasheet.notAvailable} onChange={(event) => toggleNotAvailable(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />N.A.</label>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </FormFieldShell>
  );
};

export default DatasheetField;

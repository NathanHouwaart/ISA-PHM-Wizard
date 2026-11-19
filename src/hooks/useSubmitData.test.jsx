import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useSubmitData, { getDatasetDownloadFileName } from './useSubmitData';
import { getProjectArchiveFileName } from '../utils/projectArchive';
import { buildConversionPayload } from '../utils/conversionPayload';

vi.mock('../contexts/GlobalDataContext', () => ({ useProjectData: () => ({ testSetups: [{ id: 'selected', name: 'Incomplete' }], selectedTestSetupId: 'selected' }) }));
vi.mock('../utils/conversionPayload', () => ({ buildConversionPayload: vi.fn() }));
vi.mock('../utils/waitForNextPaint', () => ({ waitForNextPaint: () => Promise.resolve() }));

describe('dataset export readiness', () => {
  it('names converted downloads differently from editable project archives', () => {
    const dataset = getDatasetDownloadFileName('Pump project', true);
    expect(dataset).toBe('Pump project ISA-PHM Dataset.zip');
    expect(dataset).not.toBe(getProjectArchiveFileName({ projectName: 'Pump project' }));
    expect(getDatasetDownloadFileName('Pump project', false)).toBe('Pump project ISA-PHM Dataset.json');
    expect(getDatasetDownloadFileName('<>:', true)).toBe('Project ISA-PHM Dataset.zip');
  });
  it('blocks export when an already-linked test setup becomes incomplete', async () => {
    const { result } = renderHook(() => useSubmitData());
    await act(async () => { await expect(result.current.submitData()).rejects.toThrow(/selected test setup is incomplete/i); });
    expect(result.current.error?.message).toMatch(/selected test setup is incomplete/i);
    expect(buildConversionPayload).not.toHaveBeenCalled();
  });
});

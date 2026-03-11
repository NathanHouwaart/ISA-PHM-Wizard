import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_EXPERIMENT_TYPE_ID } from '../constants/experimentTypes';
import {
  OPERATING_CONDITION_TYPE,
  VARIABLE_TYPE_OPTIONS
} from '../constants/variableTypes';
import useStudies from './useStudies';
import useContacts from './useContacts';
import usePublications from './usePublications';
import useTestSetups from './useTestSetups';
import useVariables, { useFaultSpecifications, useOperatingConditions } from './useVariables';
import useMeasurementProtocols from './useMeasurementProtocols';
import useProcessingProtocols from './useProcessingProtocols';
import useMeasurements from './useMeasurements';

let mockContext;

vi.mock('../contexts/GlobalDataContext', () => ({
  useGlobalDataContext: () => mockContext,
  useProjectData: () => mockContext,
  useProjectActions: () => mockContext,
}));

const createMockContext = () => ({
  studies: [{ id: 'study-1', name: 'Study 1', runCount: 2 }],
  setStudies: vi.fn(),
  contacts: [{ id: 'contact-1', firstName: 'Alice' }],
  setContacts: vi.fn(),
  publications: [{ id: 'pub-1', title: 'Publication 1' }],
  setPublications: vi.fn(),
  testSetups: [{ id: 'setup-1', name: 'Setup 1', version: 1, lastModified: Date.now() }],
  setTestSetups: vi.fn(),
  studyVariables: [
    { id: 'var-fault', name: 'Fault', type: VARIABLE_TYPE_OPTIONS[0] },
    { id: 'var-op', name: 'Speed', type: OPERATING_CONDITION_TYPE },
  ],
  setStudyVariables: vi.fn(),
  measurementProtocols: [{ id: 'mp-1', name: 'Measurement Protocol 1' }],
  setMeasurementProtocols: vi.fn(),
  processingProtocols: [{ id: 'pp-1', name: 'Processing Protocol 1' }],
  setProcessingProtocols: vi.fn(),
  experimentType: DEFAULT_EXPERIMENT_TYPE_ID,
});

const expectCanonicalKeys = (value) => {
  expect(value).toHaveProperty('items');
  expect(value).toHaveProperty('setItems');
  expect(value).toHaveProperty('addItem');
  expect(value).toHaveProperty('updateItem');
  expect(value).toHaveProperty('removeItem');
  expect(value).toHaveProperty('components');
  expect(typeof value.setItems).toBe('function');
  expect(typeof value.addItem).toBe('function');
  expect(typeof value.updateItem).toBe('function');
  expect(typeof value.removeItem).toBe('function');
  expect(value.components).toHaveProperty('card');
  expect(value.components).toHaveProperty('form');
  expect(value.components).toHaveProperty('view');
  expect(value.components).toHaveProperty('mappingCard');
};

const expectNoLegacyKeys = (value) => {
  expect('getCard' in value).toBe(false);
  expect('getForm' in value).toBe(false);
  expect('getView' in value).toBe(false);
  expect('cardComponent' in value).toBe(false);
};

describe('entity hook contract', () => {
  beforeEach(() => {
    mockContext = createMockContext();
  });

  it('useStudies returns canonical contract', () => {
    const { result } = renderHook(() => useStudies());
    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(Array.isArray(result.current.items)).toBe(true);
    expect(typeof result.current.components.card).toBe('function');
    expect(typeof result.current.components.form).toBe('function');
    expect(result.current.components.view).toBe(null);
    expect(typeof result.current.components.mappingCard).toBe('function');
  });

  it('useContacts returns canonical contract', () => {
    const { result } = renderHook(() => useContacts());
    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(typeof result.current.components.card).toBe('function');
    expect(typeof result.current.components.form).toBe('function');
    expect(typeof result.current.components.view).toBe('function');
  });

  it('usePublications returns canonical contract', () => {
    const { result } = renderHook(() => usePublications());
    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(typeof result.current.components.card).toBe('function');
    expect(typeof result.current.components.form).toBe('function');
    expect(result.current.components.view).toBe(null);
  });

  it('useTestSetups returns canonical contract', () => {
    const { result } = renderHook(() => useTestSetups());
    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(typeof result.current.components.card).toBe('function');
    expect(typeof result.current.components.form).toBe('function');
    expect(result.current.components.view).toBe(null);
  });

  it('useVariables returns canonical contract', () => {
    const { result } = renderHook(() => useVariables());
    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(typeof result.current.components.card).toBe('function');
    expect(typeof result.current.components.form).toBe('function');
    expect(result.current.items).toHaveLength(2);
  });

  it('filtered variable hooks override items and form component', () => {
    const base = renderHook(() => useVariables());
    const fault = renderHook(() => useFaultSpecifications());
    const operating = renderHook(() => useOperatingConditions());

    expectCanonicalKeys(fault.result.current);
    expectCanonicalKeys(operating.result.current);
    expectNoLegacyKeys(fault.result.current);
    expectNoLegacyKeys(operating.result.current);

    expect(fault.result.current.items).toHaveLength(1);
    expect(operating.result.current.items).toHaveLength(1);
    expect(fault.result.current.components.form).not.toBe(base.result.current.components.form);
    expect(operating.result.current.components.form).not.toBe(base.result.current.components.form);
  });

  it('mapping protocol hooks return canonical contract', () => {
    const measurement = renderHook(() => useMeasurementProtocols());
    const processing = renderHook(() => useProcessingProtocols());

    expectCanonicalKeys(measurement.result.current);
    expectCanonicalKeys(processing.result.current);
    expectNoLegacyKeys(measurement.result.current);
    expectNoLegacyKeys(processing.result.current);

    expect(measurement.result.current.components.card).toBe(null);
    expect(measurement.result.current.components.form).toBe(null);
    expect(typeof measurement.result.current.components.mappingCard).toBe('function');

    expect(processing.result.current.components.card).toBe(null);
    expect(processing.result.current.components.form).toBe(null);
    expect(typeof processing.result.current.components.mappingCard).toBe('function');
  });

  it('useMeasurements returns canonical contract', () => {
    const { result } = renderHook(() => useMeasurements());

    expectCanonicalKeys(result.current);
    expectNoLegacyKeys(result.current);
    expect(result.current.components.card).toBe(null);
    expect(result.current.components.form).toBe(null);
    expect(typeof result.current.components.mappingCard).toBe('function');
    expect(Array.isArray(result.current.items)).toBe(true);
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import OutputModeSlide from './OutputModeSlide';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import useStudyOutputModeSelection from '../../hooks/useStudyOutputModeSelection';

vi.mock('../../contexts/GlobalDataContext');
vi.mock('../../hooks/useStudyOutputModeSelection');

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('OutputModeSlide', () => {
  const updateStudyOutputMode = vi.fn();
  const updateAllStudyOutputModes = vi.fn();
  const setStudies = vi.fn();

  const studies = [
    { id: 'study-1', name: 'Study 1', runCount: 2, outputMode: 'raw_only' },
    { id: 'study-2', name: 'Study 2', runCount: 1, outputMode: 'processed_only' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useProjectData.mockReturnValue({ studies });
    useProjectActions.mockReturnValue({ setStudies });
    useStudyOutputModeSelection.mockReturnValue({
      selectedOutputModeByStudy: {
        'study-1': 'raw_only',
        'study-2': 'processed_only',
      },
      updateStudyOutputMode,
      updateAllStudyOutputModes,
      handleGridRowDataChange: vi.fn(),
    });
  });

  it('updates focused study when selecting from mobile study selector', () => {
    render(<OutputModeSlide onHeightChange={vi.fn()} />);

    const rawPanel = screen.getByText('Slide 10 - Raw mapping').closest('div');
    expect(within(rawPanel).getByText('Required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Study'), { target: { value: 'study-2' } });

    expect(screen.getByRole('heading', { name: 'Study 2' })).toBeInTheDocument();
    const updatedRawPanel = screen.getByText('Slide 10 - Raw mapping').closest('div');
    expect(within(updatedRawPanel).getByText('Disabled')).toBeInTheDocument();
  });

  it('calls per-study update when a mode card is selected', () => {
    render(<OutputModeSlide onHeightChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Raw \+ processed/i }));

    expect(updateStudyOutputMode).toHaveBeenCalledWith('study-1', 'raw_and_processed');
  });

  it('applies selected bulk mode to all studies', () => {
    render(<OutputModeSlide onHeightChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Bulk output mode'), { target: { value: 'processed_only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all studies' }));

    expect(updateAllStudyOutputModes).toHaveBeenCalledWith('processed_only');
  });
});

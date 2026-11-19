import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TestSetupForm from './TestSetupForm';

vi.mock('../../contexts/GlobalDataContext', () => ({
  useProjectData: () => ({ testSetups: [], configurationTypes: [], currentProjectId: 'project' }),
  useProjectActions: () => ({ setScreenWidth: vi.fn() }),
}));
vi.mock('../Widgets/TableTooltip', () => ({ default: () => null }));

describe('test setup drafts', () => {
  it('saves an incomplete unnamed setup while displaying its readiness checklist', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TestSetupForm onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByText('Test setup name is required.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save Test Setup' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].name).toBe('');
  });
});

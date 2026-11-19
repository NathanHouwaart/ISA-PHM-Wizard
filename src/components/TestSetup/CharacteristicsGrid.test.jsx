import React from 'react';
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import TestSetupForm from './TestSetupForm';
import UnitCellEditor from '../DataGrid/editors/UnitCellEditor';

const captured = vi.hoisted(() => []);
vi.mock('../../contexts/GlobalDataContext', () => ({
  useProjectData: () => ({ testSetups: [], configurationTypes: [], currentProjectId: 'project' }),
  useProjectActions: () => ({ setScreenWidth: vi.fn() }),
}));
vi.mock('./sections/EntityGridTabPanel', () => ({
  default: (props) => { captured.push(props); return null; },
}));

it('configures the component grid unit column with the catalogue editor', () => {
  render(<TestSetupForm onSave={vi.fn()} onCancel={vi.fn()} />);
  const panel = captured.find((item) => item.gridConfig?.title === 'Components');
  const unit = panel.gridConfig.staticColumns.find((column) => column.prop === 'unit');
  expect(unit.editor).toBe(UnitCellEditor);
  expect(unit.unitSelector).toBe(true);
  expect(panel.gridConfig.isCellEditable({ row: { isReplaceable: true }, columnProp: 'unit' })).toBe(false);
});

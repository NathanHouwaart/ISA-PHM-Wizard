import SelectTypePlugin from '@revolist/revogrid-column-select';
import { TextEditor } from '@revolist/revogrid';
import { searchUnits, unitSelection } from '../../../utils/unitCatalogue';
import './UnitCellEditor.css';

const statusOptions = [
  { label: 'Unknown', value: '__unknown__' },
  { label: 'Not applicable', value: '__not_applicable__' },
];
const supportedFrequencyUnits = new Set(['Hz', 'kHz', 'MHz']);
const optionsForQuery = (query = '', frequencyOnly = false, quantity = '', includeStatuses = true, includeClear = false) => [
  ...(includeClear && 'no unit'.includes(query.toLowerCase()) ? [{ label: 'No unit', value: '__clear__' }] : []),
  ...(!frequencyOnly && includeStatuses ? statusOptions.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())) : []),
  ...searchUnits(query, quantity).filter((unit) => !frequencyOnly || supportedFrequencyUnits.has(unit.symbol))
    .map((unit) => ({ label: `${unit.symbol} (${unit.name})`, value: unit.identifier })),
];

// Use the same select editor as the experiment grid, with an adapter that
// stores a unit's identifier together with its visible symbol.
export default class UnitCellEditor {
  constructor(column, save) {
    this.column = column;
    this.save = save;
    this.elementRef = null;
    this.filteredHighlight = null;
    this.frequencyOnly = column.model?.builtinKey === 'sampling_rate' && column.prop.endsWith('_unit');
    this.variableUnit = Boolean(column.column?.unitSelector);
    this.unitColumn = column.prop.endsWith('_unit');
    this.quantity = column.column?.quantityKindIdentifier?.split('/').pop() || '';
    if ((column.model?.builtinKey === 'measured_unit' && column.prop.endsWith('_spec')) || this.unitColumn || this.variableUnit) {
      const plugin = new SelectTypePlugin();
      const config = { ...column, column: { ...column.column, source: optionsForQuery('', this.frequencyOnly, this.quantity, !this.variableUnit && !this.unitColumn, this.variableUnit || this.unitColumn), labelKey: 'label', valueKey: 'value' } };
      this.select = new plugin.editor(config, (value, preventFocus) => {
        const selection = value === '__clear__' ? { value: '', valueIdentifier: '' }
          : value === '__unknown__' ? 'Unknown'
          : value === '__not_applicable__' ? 'Not applicable'
            : unitSelection(value);
        if (selection && !((this.variableUnit || this.unitColumn) && typeof selection === 'string')) save(selection, preventFocus);
      });
    } else {
      this.text = new TextEditor(column, save);
    }
  }

  componentDidRender() {
    if (this.select) this.select.componentDidRender?.();
    else this.text?.componentDidRender?.();
  }

  getValue() { return this.select ? undefined : this.text?.getValue(); }

  beforeDisconnect() { this.text?.beforeDisconnect?.(); }

  beforeAutoSave() { return !this.select; }

  render(h, additionalData) {
    if (this.select) {
      this.select.editCell = this.editCell;
      const createElement = (tag, props, ...children) => h(tag, tag === 'revo-dropdown' ? {
        ...props,
        maxHeight: 240,
        template: (createNode, item) => createNode('span', { class: 'unit-grid-option', title: item.label }, item.label),
        onInput: (event) => {
          event.currentTarget.source = optionsForQuery(event.target.value || '', this.frequencyOnly, this.quantity, !this.variableUnit && !this.unitColumn, this.variableUnit || this.unitColumn);
          this.filteredHighlight = -1;
        },
        onKeyDown: (event) => {
          if (!['ArrowDown', 'ArrowUp'].includes(event.key) || this.filteredHighlight === null) return;
          // Filtering may re-render the list and reset its internal cursor.
          // Control arrow navigation after filtering to avoid skipped entries.
          const lists = [...document.querySelectorAll('.revo-dropdown-list revo-list')];
          const list = lists.findLast((item) => item.closest('.revo-dropdown-list')?.style.display !== 'none');
          if (list) {
            const count = list.querySelectorAll('li').length;
            if (!count) return;
            this.filteredHighlight = event.key === 'ArrowDown'
              ? Math.min(this.filteredHighlight + 1, count - 1)
              : Math.max(this.filteredHighlight - 1, 0);
            if (list.selectedIndex === this.filteredHighlight) list.selectedIndex = -1;
            list.selectedIndex = this.filteredHighlight;
            event.preventDefault();
            event.stopPropagation();
          }
        },
      } : props, ...children);
      return this.select.render(createElement, additionalData);
    }
    this.text.editCell = this.editCell;
    return this.text.render(h, additionalData);
  }
}

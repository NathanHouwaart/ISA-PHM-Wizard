import { describe, expect, it, vi } from 'vitest';
import UnitCellEditor from './UnitCellEditor';

describe('UnitCellEditor', () => {
  it('uses the experiment-grid select editor and preserves the chosen unit identifier', () => {
    const save = vi.fn();
    const editor = new UnitCellEditor({ prop: 'sensor_spec', model: { builtinKey: 'measured_unit' }, column: {} }, save);
    const h = (tag, props, children) => ({ tag, props, children });
    const select = editor.render(h);
    expect(select.tag).toBe('revo-dropdown');
    expect(select.props.maxHeight).toBe(240);
    expect(select.props.template(h, { label: 'Hz (Hertz)' }).props.class).toBe('unit-grid-option');
    expect(select.props.source.some((option) => option.label === 'g (Gram)')).toBe(true);
    const dropdown = {};
    select.props.onInput({ target: { value: 'gram' }, currentTarget: dropdown });
    const ids = dropdown.source.map((option) => option.value);
    expect(ids.indexOf('http://qudt.org/vocab/unit/GM')).toBeLessThan(ids.indexOf('http://qudt.org/vocab/unit/KiloGM'));
    select.props.onChanged({ detail: { val: { value: 'http://qudt.org/vocab/unit/GM' }, originalEvent: { code: 'Tab' } } });
    expect(save).toHaveBeenCalledWith({ value: 'g', valueIdentifier: 'http://qudt.org/vocab/unit/GM' }, true);
  });
  it('passes Tab navigation through for sampling rate', () => {
    const save = vi.fn();
    const editor = new UnitCellEditor({ prop: 'sensor_spec', model: { builtinKey: 'sampling_rate' } }, save);
    const h = (tag, props, children) => ({ tag, props, children });
    const input = editor.render(h);
    const element = { value: '25600', blur: vi.fn() };
    input.props.ref(element);
    input.props.onKeyDown({ key: 'Tab', target: element });
    expect(save).toHaveBeenCalledWith('25600', true);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('uses the same select control for sampling frequency units', () => {
    const save = vi.fn();
    const editor = new UnitCellEditor({ prop: 'sensor_unit', model: { builtinKey: 'sampling_rate' }, column: {} }, save);
    const h = (tag, props, children) => ({ tag, props, children });
    const select = editor.render(h);
    expect(select.tag).toBe('revo-dropdown');
    expect(select.props.source.map((item) => item.label)).toContain('Hz (Hertz)');
    select.props.onChanged({ detail: { val: { value: 'http://qudt.org/vocab/unit/HZ' }, originalEvent: { code: 'Enter' } } });
    expect(save).toHaveBeenCalledWith({ value: 'Hz', valueIdentifier: 'http://qudt.org/vocab/unit/HZ' }, false);
  });
  it('uses catalogue selection for ordinary parameter unit cells', () => {
    const save = vi.fn();
    const editor = new UnitCellEditor({ prop: 'sensor_unit', model: { name: 'Window size' }, column: {} }, save);
    const select = editor.render((tag, props, children) => ({ tag, props, children }));
    expect(select.tag).toBe('revo-dropdown');
    select.props.onChanged({ detail: { val: { value: 'http://qudt.org/vocab/unit/SEC' }, originalEvent: { code: 'Enter' } } });
    expect(save).toHaveBeenCalledWith({ value: 's', valueIdentifier: 'http://qudt.org/vocab/unit/SEC' }, false);
    select.props.onChanged({ detail: { val: { value: '__clear__' }, originalEvent: { code: 'Enter' } } });
    expect(save).toHaveBeenCalledWith({ value: '', valueIdentifier: '' }, false);
  });
  it('uses the catalogue editor for a component grid unit column', () => {
    const save = vi.fn();
    const editor = new UnitCellEditor({ prop: 'unit', model: {}, column: { unitSelector: true } }, save);
    const select = editor.render((tag, props, children) => ({ tag, props, children }));
    expect(select.tag).toBe('revo-dropdown');
    select.props.onChanged({ detail: { val: { value: 'http://qudt.org/vocab/unit/KiloW' }, originalEvent: { code: 'Enter' } } });
    expect(save).toHaveBeenCalledWith({ value: 'kW', valueIdentifier: 'http://qudt.org/vocab/unit/KiloW' }, false);
  });
  it('resets the dropdown selection after filtering instead of swallowing ArrowDown', () => {
    const editor = new UnitCellEditor({ prop: 'sensor_unit', model: { builtinKey: 'sampling_rate' }, column: {} }, vi.fn());
    const h = (tag, props, children) => ({ tag, props, children });
    const select = editor.render(h);
    const dropdown = document.createElement('div');
    dropdown.className = 'revo-dropdown-list';
    const list = document.createElement('revo-list');
    list.selectedIndex = 1;
    list.innerHTML = '<ul><li>Hz</li><li>kHz</li></ul>';
    dropdown.appendChild(list);
    document.body.appendChild(dropdown);
    select.props.onInput({ target: { value: 'Hz' }, currentTarget: {} });
    expect(list.selectedIndex).toBe(1);
    const event = { key: 'ArrowDown', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    select.props.onKeyDown(event);
    expect(list.selectedIndex).toBe(0);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    select.props.onKeyDown(event);
    expect(list.selectedIndex).toBe(1);
    select.props.onKeyDown({ ...event, key: 'ArrowUp' });
    expect(list.selectedIndex).toBe(0);
    dropdown.remove();
  });
});

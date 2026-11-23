"""Update only the two bundled examples' known measurement metadata.

Preserves existing rates and attachments. The diagnostic g channels represent
acceleration in standard gravity; % RH is percentage of relative humidity.
The XJTU acceleration channels use standard gravity as in the curated subset.
This is not a migration for user projects.
"""
import hashlib
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'examples'
UNITS = {
    'nm': ('nm', 'NanoM'), 'g': ('G', 'G'), 'G': ('G', 'G'), 'Pa': ('Pa', 'PA'),
    '\u00b0C': ('\u00b0C', 'DEG_C'), '% RH': ('%', 'PERCENT'), '%': ('%', 'PERCENT'),
    'rad/s': ('rad/s', 'RAD-PER-SEC'),
}

def update(path):
    with ZipFile(path) as archive:
        entries = [(info, archive.read(info.filename)) for info in archive.infolist()]
    data = {info.filename: content for info, content in entries}
    project = json.loads(data['project.json'])
    setup = project['selectedTestSetup']
    protocols = setup['measurementProtocols']
    if len(protocols) != 1:
        raise ValueError(f'{path.name}: expected exactly one protocol')
    protocol = protocols[0]
    parameters = protocol['parameters']
    rate_name = 'Sampling Rate' if path.name.startswith('diagnostics') else 'Sampling Frequency'
    matches = [p for p in parameters if p.get('builtinKey') == 'sampling_rate' or p.get('name') == rate_name]
    if len(matches) != 1:
        raise ValueError(f'{path.name}: expected one existing rate parameter')
    matches[0]['name'] = 'Sampling Rate'
    matches[0]['builtinKey'] = 'sampling_rate'
    rate_id = matches[0]['id']
    unit_params = [p for p in parameters if p.get('builtinKey') == 'measured_unit' or p.get('name') == 'Measured Unit']
    if len(unit_params) > 1:
        raise ValueError(f'{path.name}: duplicate measured-unit parameters')
    if unit_params:
        unit = unit_params[0]
        unit['builtinKey'] = 'measured_unit'
    else:
        unit = {'id': f'{protocol["id"]}::measured_unit', 'name': 'Measured Unit', 'builtinKey': 'measured_unit', 'description': 'Unit of the sensor measurement.', 'unit': ''}
        parameters.insert(1, unit)
    mappings = setup['sensorToMeasurementProtocolMapping']
    for mapping in mappings:
        if mapping.get('targetId') == rate_id:
            rate_unit = mapping.get('value', ['', ''])[1]
            if rate_unit not in ('Hz', 'kHz'):
                raise ValueError(f'Unexpected rate unit {rate_unit!r}')
            mapping['unitIdentifier'] = 'http://qudt.org/vocab/unit/' + ('HZ' if rate_unit == 'Hz' else 'KiloHZ')
        if mapping.get('targetId') == unit['id']:
            value = mapping.get('value', ['', ''])[0]
            if value in ('Not applicable', 'Unknown'):
                mapping.pop('valueIdentifier', None)
            elif value in UNITS:
                symbol, identifier = UNITS[value]
                mapping['value'] = [symbol, '']
                mapping['valueIdentifier'] = 'http://qudt.org/vocab/unit/' + identifier
            else:
                raise ValueError(f'Unexpected diagnostic unit {value!r}')
    if path.name.startswith('xjtu'):
        for sensor in setup['sensors']:
            if not sensor.get('alias', '').startswith('Accel_'):
                raise ValueError(f'Unexpected XJTU sensor {sensor.get("alias")!r}')
            if not any(m.get('sourceId') == sensor['id'] and m.get('targetId') == unit['id'] for m in mappings):
                mappings.append({'sourceId': sensor['id'], 'targetId': unit['id'], 'protocolId': protocol['id'], 'value': ['G', ''], 'valueIdentifier': 'http://qudt.org/vocab/unit/G'})
    project_bytes = json.dumps(project, ensure_ascii=False, indent=2).encode('utf-8')
    manifest = json.loads(data['manifest.json'])
    manifest['project']['size'] = len(project_bytes)
    manifest['project']['sha256'] = hashlib.sha256(project_bytes).hexdigest()
    replacements = {'project.json': project_bytes, 'manifest.json': json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')}
    with NamedTemporaryFile(dir=path.parent, suffix='.zip', delete=False) as temporary:
        temp_path = Path(temporary.name)
    try:
        with ZipFile(temp_path, 'w') as archive:
            for info, content in entries:
                archive.writestr(info, replacements.get(info.filename, content))
        temp_path.replace(path)
    finally:
        temp_path.unlink(missing_ok=True)
    print('Updated', path.name)

if __name__ == '__main__':
    for name in ('diagnostics-example.isa-phm.zip', 'xjtu-sy-bearing-datasets.isa-phm.zip'):
        update(ROOT / name)

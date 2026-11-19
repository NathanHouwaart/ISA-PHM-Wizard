"""Update the shipped example archives, preserving attachment contents.

These mappings are specific to the documented channels in these examples;
this is not a migration for arbitrary user projects.
"""
import hashlib
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'examples'
QUDT = 'http://qudt.org/vocab/quantitykind/'
QUANTITIES = {
    'Acceleration': QUDT + 'Acceleration',
    'Angular Velocity': QUDT + 'AngularVelocity',
    'Force': QUDT + 'Force',
    'Pressure': QUDT + 'Pressure',
    'Temperature': QUDT + 'Temperature',
    'Relative Humidity': QUDT + 'RelativeHumidity',
    'Wavelength': QUDT + 'Wavelength',
    'Quaternion component': 'urn:isa-phm:quantity:quaternion-component',
}


def quantity_for(alias):
    if alias.startswith('FBG Sensor '): return 'Wavelength'
    if 'Accelerometer' in alias or alias.startswith('Accel_'): return 'Acceleration'
    if 'Orientation Sensor' in alias: return 'Quaternion component'
    if 'Rotation Sensor' in alias: return 'Angular Velocity'
    if 'Relative Humidity' in alias: return 'Relative Humidity'
    if 'Pressure' in alias: return 'Pressure'
    if 'Temperature' in alias: return 'Temperature'
    if alias.startswith('Load '): return 'Force'
    raise ValueError(f'Unrecognised example sensor: {alias}')


def update(path):
    with ZipFile(path) as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    data = {info.filename: content for info, content in entries}
    project = json.loads(data['project.json'])
    setup = project['selectedTestSetup']
    types = {item['id']: item for item in setup.get('sensorTypes', [])}
    new_types = {}
    for sensor in setup['sensors']:
        quantity = quantity_for(sensor['alias'])
        sensor['measurementType'] = quantity
        sensor['quantityKindIdentifier'] = QUANTITIES[quantity]
        original_id = sensor.get('sensorTypeId')
        if original_id and original_id in types:
            # A reusable type describes one quantity. Split the old multi-channel
            # enDAQ type by quantity while retaining all existing type metadata.
            key = (original_id, quantity)
            if key not in new_types:
                type_data = dict(types[original_id])
                previous = [k for k in new_types if k[0] == original_id]
                if previous:
                    suffix = quantity.lower().replace(' ', '-')
                    type_data['id'] = f'{original_id}-{suffix}'
                    type_data['name'] = f"{type_data['name']} — {quantity}"
                type_data['measurementType'] = quantity
                type_data['quantityKindIdentifier'] = QUANTITIES[quantity]
                new_types[key] = type_data
            sensor['sensorTypeId'] = new_types[key]['id']
    used_ids = {key[0] for key in new_types}
    setup['sensorTypes'] = [t for t in setup.get('sensorTypes', []) if t['id'] not in used_ids] + list(new_types.values())
    if path.name == 'diagnostics-example.isa-phm.zip':
        protocols = setup['measurementProtocols']
        if len(protocols) != 1:
            raise ValueError('Expected one diagnostic measurement protocol')
        protocol = protocols[0]
        unit_params = [p for p in protocol['parameters'] if p.get('name', '').strip().lower() == 'measured unit']
        if len(unit_params) != 1:
            raise ValueError('Expected one existing measured-unit parameter')
        unit_param = unit_params[0]
        unit_param['builtinKey'] = 'measured_unit'
        unit_param['description'] = 'Unit of the sensor measurement, or Not applicable for dimensionless output.'
        mappings = setup.setdefault('sensorToMeasurementProtocolMapping', [])
        for sensor in setup['sensors']:
            if sensor['measurementType'] != 'Quaternion component':
                continue
            matches = [m for m in mappings if m.get('sourceId') == sensor['id'] and m.get('targetId') == unit_param['id'] and m.get('protocolId') == protocol['id']]
            if len(matches) > 1:
                raise ValueError(f'Duplicate measured-unit mappings for {sensor["alias"]}')
            if matches:
                matches[0]['value'] = ['Not applicable', '']
                matches[0].pop('valueIdentifier', None)
            else:
                mappings.append({'sourceId': sensor['id'], 'targetId': unit_param['id'], 'protocolId': protocol['id'], 'value': ['Not applicable', '']})
    project_bytes = json.dumps(project, ensure_ascii=False, indent=2).encode('utf-8')
    manifest = json.loads(data['manifest.json'])
    manifest['project']['size'] = len(project_bytes)
    manifest['project']['sha256'] = hashlib.sha256(project_bytes).hexdigest()
    replacements = {'project.json': project_bytes, 'manifest.json': json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')}
    with NamedTemporaryFile(dir=path.parent, suffix='.zip', delete=False) as tmp:
        temp_path = Path(tmp.name)
    try:
        with ZipFile(temp_path, 'w') as output:
            for info, content in entries:
                output.writestr(info, replacements.get(info.filename, content))
        temp_path.replace(path)
    finally:
        temp_path.unlink(missing_ok=True)
    print(f'Updated {path.name}: {len(setup["sensors"])} sensors')


if __name__ == '__main__':
    for name in ('diagnostics-example.isa-phm.zip', 'xjtu-sy-bearing-datasets.isa-phm.zip'):
        update(ROOT / name)

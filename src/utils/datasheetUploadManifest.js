import { getDatasheetFile } from './datasheetStore';
import { isReplaceableCharacteristic } from './testSetupCharacteristics';

export const buildDatasheetUploadManifest = async (payload = {}) => {
  const files = [];
  const manifest = [];
  const addAttachment = async (datasheet, owner) => {
    if (!datasheet?.attachmentId || datasheet?.notAvailable) return;
    const storedAttachment = await getDatasheetFile(datasheet.attachmentId);
    if (!storedAttachment?.file) {
      throw new Error(`Datasheet for ${owner.label} is not stored locally. Please attach it again.`);
    }
    manifest.push({
      attachmentId: datasheet.attachmentId,
      originalFileName: datasheet.fileName,
      owner: { kind: owner.kind, id: owner.id },
    });
    files.push({ attachmentId: datasheet.attachmentId, file: storedAttachment.file });
  };

  const characteristics = payload?.test_setup?.characteristics || [];

  for (const characteristic of characteristics) {
    if (isReplaceableCharacteristic(characteristic?.isReplaceable)) continue;
    await addAttachment(characteristic?.datasheet, {
      kind: 'test_setup_characteristic', id: characteristic.id, label: characteristic.category || 'a characteristic'
    });
  }

  for (const sensorType of payload?.test_setup?.sensorTypes || []) {
    await addAttachment(sensorType?.datasheet, {
      kind: 'sensor_type', id: sensorType.id, label: sensorType.name || 'a sensor type'
    });
  }

  for (const componentType of payload?.test_setup?.configurationTypes || []) {
    await addAttachment(componentType?.datasheet, {
      kind: 'component_type', id: componentType.id, label: componentType.name || 'a component type'
    });
  }

  return { manifest, files };
};

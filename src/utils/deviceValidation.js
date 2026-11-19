export function findUnnamedDeviceIndex(devices = []) {
  return devices.findIndex((device) => !String(device?.name || '').trim());
}

export function findDeviceWithoutDatasheetChoice(devices = []) {
  return devices.findIndex((device) => !device?.datasheet?.attachmentId && device?.datasheet?.notAvailable !== true);
}

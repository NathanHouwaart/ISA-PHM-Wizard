export const isReplaceableCharacteristic = (value) => value === true || value === 'true';

export const normalizeCharacteristic = (characteristic = {}) => {
  const isReplaceable = isReplaceableCharacteristic(characteristic.isReplaceable);

  return {
    ...characteristic,
    isReplaceable,
    ...(isReplaceable ? { value: '', unit: '' } : { description: '' })
  };
};

export const setCharacteristicReplaceable = (characteristic = {}, isReplaceable) => (
  normalizeCharacteristic({ ...characteristic, isReplaceable })
);

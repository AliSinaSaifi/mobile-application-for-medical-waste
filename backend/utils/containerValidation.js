const isProduction = () => process.env.NODE_ENV === 'production';

function normalizeQrCode(value) {
  return String(value || '').trim();
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidLatitude(value) {
  const parsed = parseCoordinate(value);
  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
}

function isValidLongitude(value) {
  const parsed = parseCoordinate(value);
  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
}

function hasValidCoordinates(container) {
  return isValidLatitude(container?.lat) && isValidLongitude(container?.lon);
}

function validateContainerPayload(container) {
  const qrCode = normalizeQrCode(container?.qrCode);
  if (!qrCode) return 'qrCode is required';

  const lat = parseCoordinate(container?.lat);
  const lon = parseCoordinate(container?.lon);

  if (lat !== null && !isValidLatitude(lat)) return 'lat must be between -90 and 90';
  if (lon !== null && !isValidLongitude(lon)) return 'lon must be between -180 and 180';

  if (isProduction() && (lat === null || lon === null)) {
    return 'lat and lon are required in production';
  }

  return null;
}

module.exports = {
  hasValidCoordinates,
  isProduction,
  isValidLatitude,
  isValidLongitude,
  normalizeQrCode,
  validateContainerPayload,
};

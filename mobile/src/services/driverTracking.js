import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { API_BASE_URL } from '../config/api';

const TASK_NAME = 'medwaste-driver-location-tracking';
const TRACKING_STATE_KEY = 'mw_tracking_state';
const QUEUE_KEY = 'mw_tracking_queue';
const LAST_POINT_KEY = 'mw_tracking_last_point';
const MIN_DISTANCE_METERS = 10;

let foregroundSubscription = null;
let activeRouteId = null;

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLat = (Number(b.lat) - Number(a.lat)) * Math.PI / 180;
  const dLon = (Number(b.lon) - Number(a.lon)) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isValidPoint(point) {
  return (
    Number.isFinite(Number(point?.lat)) &&
    Number.isFinite(Number(point?.lon)) &&
    Number(point.lat) >= -90 &&
    Number(point.lat) <= 90 &&
    Number(point.lon) >= -180 &&
    Number(point.lon) <= 180
  );
}

async function readJson(key, fallback) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function enqueue(point) {
  const queue = await readJson(QUEUE_KEY, []);
  queue.push(point);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-500)));
}

async function uploadPoint(point) {
  if (!isValidPoint(point)) return true;

  const last = await readJson(LAST_POINT_KEY, null);
  if (last && distanceMeters(last, point) < MIN_DISTANCE_METERS) return true;

  const state = await readJson(TRACKING_STATE_KEY, null);
  if (!state?.routeId || !state?.token) return false;

  const res = await fetch(`${API_BASE_URL}/api/route-history/${state.routeId}/points`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(point),
  });

  if ([200, 201, 409].includes(res.status)) {
    await AsyncStorage.setItem(LAST_POINT_KEY, JSON.stringify(point));
    return true;
  }

  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
    return true;
  }

  return false;
}

export async function flushTrackingQueue() {
  const queue = await readJson(QUEUE_KEY, []);
  if (!queue.length) return;

  const remaining = [];
  for (const point of queue) {
    const ok = await uploadPoint(point);
    if (!ok) remaining.push(point);
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining.slice(-500)));
}

async function handleLocation(location) {
  const point = {
    lat: location.coords.latitude,
    lon: location.coords.longitude,
    speedKph: Number.isFinite(location.coords.speed) && location.coords.speed > 0
      ? location.coords.speed * 3.6
      : null,
    heading: Number.isFinite(location.coords.heading) && location.coords.heading >= 0
      ? location.coords.heading
      : null,
    timestamp: new Date(location.timestamp || Date.now()).toISOString(),
    source: 'mobile',
  };

  const ok = await uploadPoint(point);
  if (!ok) await enqueue(point);
  await flushTrackingQueue();
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  for (const location of data.locations) {
    await handleLocation(location);
  }
});

export async function startDriverTracking({ routeId, token }) {
  const normalizedRouteId = Number(routeId);
  if (!Number.isInteger(normalizedRouteId) || normalizedRouteId <= 0 || !token) return false;
  if (activeRouteId === normalizedRouteId) return true;

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return false;

  await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({
    routeId: normalizedRouteId,
    token,
    startedAt: new Date().toISOString(),
  }));
  activeRouteId = normalizedRouteId;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: MIN_DISTANCE_METERS,
      pausesUpdatesAutomatically: true,
      foregroundService: {
        notificationTitle: 'MedWaste route tracking',
        notificationBody: 'Uploading driver location for the active route.',
      },
      showsBackgroundLocationIndicator: true,
    });
  }

  if (foregroundSubscription) foregroundSubscription.remove();
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: MIN_DISTANCE_METERS,
    },
    (location) => {
      handleLocation(location);
    }
  );

  await flushTrackingQueue();
  return true;
}

export async function stopDriverTracking() {
  activeRouteId = null;

  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);

  await AsyncStorage.multiRemove([TRACKING_STATE_KEY, LAST_POINT_KEY]);
}

export async function restoreDriverTracking() {
  const state = await readJson(TRACKING_STATE_KEY, null);
  if (state?.routeId && state?.token) {
    await startDriverTracking(state);
  }
}

const STORAGE_KEY = 'palette-builder-rooms';

export function saveRooms(rooms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch (error) {
    console.error('Failed to save rooms:', error);
  }
}

export function loadRooms() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load rooms:', error);
    return [];
  }
}

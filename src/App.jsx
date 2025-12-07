import { createSignal, For, Show, onMount, createEffect } from 'solid-js';
import Room from './components/Room';
import ColorPicker from './components/ColorPicker';
import { saveRooms, loadRooms } from './utils/storage';

export default function App() {
  const [rooms, setRooms] = createSignal([]);
  const [showColorPicker, setShowColorPicker] = createSignal(false);
  const [activeRoomId, setActiveRoomId] = createSignal(null);
  const [nextId, setNextId] = createSignal(1);
  const [showShareNotification, setShowShareNotification] = createSignal(false);

  onMount(() => {
    // Check if there's shared data in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');

    if (sharedData) {
      try {
        const decodedData = atob(sharedData);
        const sharedRooms = JSON.parse(decodedData);
        setRooms(sharedRooms);
        const maxId = Math.max(...sharedRooms.map(r => r.id), 0);
        setNextId(maxId + 1);
        return;
      } catch (e) {
        console.error('Failed to load shared data:', e);
      }
    }

    // Load from localStorage if no shared data
    const savedRooms = loadRooms();
    if (savedRooms.length > 0) {
      setRooms(savedRooms);
      const maxId = Math.max(...savedRooms.map(r => r.id), 0);
      setNextId(maxId + 1);
    }
  });

  createEffect(() => {
    saveRooms(rooms());
  });

  const addRoom = () => {
    const newRoom = {
      id: nextId(),
      name: `Room ${nextId()}`,
      x: 50 + (rooms().length * 30),
      y: 50 + (rooms().length * 30),
      width: 300,
      height: 200,
      colors: []
    };
    setRooms([...rooms(), newRoom]);
    setNextId(nextId() + 1);
  };

  const deleteRoom = (id) => {
    setRooms(rooms().filter(r => r.id !== id));
  };

  const updateRoom = (updatedRoom) => {
    setRooms(rooms().map(r => r.id === updatedRoom.id ? updatedRoom : r));
  };

  const openColorPicker = (roomId) => {
    setActiveRoomId(roomId);
    setShowColorPicker(true);
  };

  const addColorToRoom = (color) => {
    const roomId = activeRoomId();
    setRooms(rooms().map(r => {
      if (r.id === roomId) {
        // Check if color already exists in the room
        const colorExists = r.colors.some(c => c.hex_code === color.hex_code);
        if (colorExists) {
          return r;
        }
        return { ...r, colors: [...r.colors, color] };
      }
      return r;
    }));
  };

  const removeColorFromRoom = (roomId, hexCode) => {
    setRooms(rooms().map(r => {
      if (r.id === roomId) {
        return { ...r, colors: r.colors.filter(c => c.hex_code !== hexCode) };
      }
      return r;
    }));
  };

  const shareRooms = () => {
    try {
      const encodedData = btoa(JSON.stringify(rooms()));
      const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShowShareNotification(true);
        setTimeout(() => setShowShareNotification(false), 3000);
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: show the URL in a prompt
        prompt('Copy this URL to share:', shareUrl);
      });
    } catch (e) {
      console.error('Failed to create share URL:', e);
      alert('Failed to create share URL');
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-800">Palette Builder</h1>
          <div class="flex gap-3">
            <button
              onClick={shareRooms}
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={rooms().length === 0}
            >
              Share
            </button>
            <button
              onClick={addRoom}
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
            >
              + New Room
            </button>
          </div>
        </div>
      </header>

      <main class="relative w-full h-[calc(100vh-4rem)] overflow-hidden">
        <For each={rooms()}>
          {(room) => (
            <Room
              {...room}
              onUpdate={updateRoom}
              onDelete={deleteRoom}
              onAddColor={openColorPicker}
              onRemoveColor={removeColorFromRoom}
            />
          )}
        </For>

        {rooms().length === 0 && (
          <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
              <p class="text-xl mb-4">No rooms yet</p>
              <p class="text-sm">Click "New Room" to get started</p>
            </div>
          </div>
        )}
      </main>

      <Show when={showColorPicker()}>
        <ColorPicker
          onSelect={addColorToRoom}
          onClose={() => setShowColorPicker(false)}
        />
      </Show>

      <Show when={showShareNotification()}>
        <div class="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          Link copied to clipboard!
        </div>
      </Show>
    </div>
  );
}

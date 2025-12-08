import { createSignal, For, Show, onMount, createEffect } from 'solid-js';
import Room from './components/Room';
import ColorPicker from './components/ColorPicker';
import Auth from './components/Auth';
import { saveRooms, loadRooms } from './utils/storage';
import { supabase } from './utils/supabase';

export default function App() {
  const [user, setUser] = createSignal(null);
  const [rooms, setRooms] = createSignal([]);
  const [showColorPicker, setShowColorPicker] = createSignal(false);
  const [activeRoomId, setActiveRoomId] = createSignal(null);
  const [nextId, setNextId] = createSignal(1);
  const [showShareNotification, setShowShareNotification] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isGuest, setIsGuest] = createSignal(localStorage.getItem('guestMode') === 'true');
  const [showAuth, setShowAuth] = createSignal(false);

  // Force reload signal for tab visibility
  const [forceReload, setForceReload] = createSignal(0);

  onMount(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // If user is authenticated, clear guest mode
      if (session?.user) {
        localStorage.removeItem('guestMode');
        setIsGuest(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // If user signs in, clear guest mode
      if (session?.user) {
        localStorage.removeItem('guestMode');
        setIsGuest(false);
        setShowAuth(false);
      }
    });

    // Reload data when tab becomes visible (to sync across tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setForceReload(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  // Load rooms when user changes or tab becomes visible
  createEffect(async () => {
    const currentUser = user();
    const guest = isGuest();
    forceReload(); // Track this signal to trigger reload on tab visibility

    // If guest mode, load from localStorage only
    if (guest && !currentUser) {
      setIsLoading(true);
      const savedRooms = loadRooms();
      if (savedRooms.length > 0) {
        setRooms(savedRooms);
        const maxId = Math.max(...savedRooms.map(r => r.id), 0);
        setNextId(maxId + 1);
      } else {
        setRooms([]);
      }
      setIsLoading(false);
      return;
    }

    if (!currentUser) {
      setRooms([]);
      return;
    }

    setIsLoading(true);

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
        setIsLoading(false);
        return;
      } catch (e) {
        console.error('Failed to load shared data:', e);
      }
    }

    // Load from Supabase
    try {
      const { data, error } = await supabase
        .schema('api')
        .from('rooms')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        // The data field contains the entire rooms array
        const roomsData = data.data;

        // Validate and clean the loaded data
        const loadedRooms = Array.isArray(roomsData)
          ? roomsData.filter(room => {
              // Ensure each room is a proper object with required fields
              return room &&
                     typeof room === 'object' &&
                     typeof room.id === 'number' &&
                     typeof room.name === 'string' &&
                     !Array.isArray(room);
            }).map(room => ({
              id: room.id,
              name: room.name,
              x: room.x || 50,
              y: room.y || 50,
              width: room.width || 300,
              height: room.height || 200,
              colors: Array.isArray(room.colors) ? room.colors : []
            }))
          : [];

        setRooms(loadedRooms);
        if (loadedRooms.length > 0) {
          const maxId = Math.max(...loadedRooms.map(r => r.id), 0);
          setNextId(maxId + 1);
        }
      } else {
        // No data in Supabase yet - check localStorage for existing data
        const savedRooms = loadRooms();
        if (savedRooms.length > 0) {
          setRooms(savedRooms);
          const maxId = Math.max(...savedRooms.map(r => r.id), 0);
          setNextId(maxId + 1);
        } else {
          setRooms([]);
        }
      }
    } catch (error) {
      console.error('Failed to load rooms from Supabase:', error);
      // Fallback to localStorage
      const savedRooms = loadRooms();
      if (savedRooms.length > 0) {
        setRooms(savedRooms);
        const maxId = Math.max(...savedRooms.map(r => r.id), 0);
        setNextId(maxId + 1);
      }
    } finally {
      setIsLoading(false);
    }
  });

  // Save rooms (debounced to avoid too many saves)
  let saveTimeout;
  createEffect(() => {
    const currentUser = user();
    const currentRooms = rooms();
    const guest = isGuest();

    // Don't save if currently loading or tab is hidden
    if (isLoading() || document.visibilityState === 'hidden') {
      return;
    }

    // For guests, save to localStorage only
    if (guest && !currentUser) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveRooms(currentRooms);
        console.log('Saved rooms to localStorage:', currentRooms.length, 'rooms');
      }, 1000);
      return;
    }

    // For authenticated users, save to Supabase
    if (!currentUser) {
      return;
    }

    // Debounce saves to avoid saving too frequently
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        // Validate and clean the rooms array
        const cleanRooms = Array.isArray(currentRooms)
          ? currentRooms.filter(room => {
              // Ensure each room is a proper object with required fields
              return room &&
                     typeof room === 'object' &&
                     typeof room.id === 'number' &&
                     typeof room.name === 'string' &&
                     !Array.isArray(room); // Make sure room isn't an array
            }).map(room => ({
              id: room.id,
              name: room.name,
              x: room.x,
              y: room.y,
              width: room.width,
              height: room.height,
              colors: Array.isArray(room.colors) ? room.colors : []
            }))
          : [];

        // Upsert - insert or update in a single operation
        const { error } = await supabase
          .schema('api')
          .from('rooms')
          .upsert({
            user_id: currentUser.id,
            data: cleanRooms
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;

        console.log('Saved rooms to Supabase:', cleanRooms.length, 'rooms');
      } catch (error) {
        console.error('Failed to save rooms to Supabase:', error);
        // Fallback to localStorage
        saveRooms(currentRooms);
      }
    }, 1000); // Wait 1 second after last change before saving
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
        // Ensure colors array exists
        const colors = r.colors || [];
        // Check if color already exists in the room
        const colorExists = colors.some(c => c.hex_code === color.hex_code);
        if (colorExists) {
          return r;
        }
        return { ...r, colors: [...colors, color] };
      }
      return r;
    }));
  };

  const removeColorFromRoom = (roomId, hexCode) => {
    setRooms(rooms().map(r => {
      if (r.id === roomId) {
        const colors = r.colors || [];
        return { ...r, colors: colors.filter(c => c.hex_code !== hexCode) };
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGuestMode = () => {
    setIsGuest(true);
    setShowAuth(false);
  };

  const showSignIn = () => {
    setShowAuth(true);
  };

  return (
    <Show
      when={user() || isGuest()}
      fallback={<Auth onGuestMode={handleGuestMode} />}
    >
      <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-gray-800">Palette Builder</h1>
            <Show when={user()}>
              <span class="text-sm text-gray-600">{user()?.email}</span>
            </Show>
            <Show when={isGuest() && !user()}>
              <span class="text-sm text-gray-600 italic">Guest Mode</span>
            </Show>
          </div>
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
            <Show
              when={user()}
              fallback={
                <button
                  onClick={showSignIn}
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
                >
                  Sign In
                </button>
              }
            >
              <button
                onClick={signOut}
                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
              >
                Sign Out
              </button>
            </Show>
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

      <Show when={showAuth()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="relative">
            <button
              onClick={() => setShowAuth(false)}
              class="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Auth onGuestMode={handleGuestMode} />
          </div>
        </div>
      </Show>
      </div>
    </Show>
  );
}

import { createSignal, onMount, onCleanup, For, createEffect } from 'solid-js';
import interact from 'interactjs';

// Icon components
const ColorPaletteIcon = (props) => (
  <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const ImageIcon = (props) => (
  <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const CloseIcon = (props) => (
  <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Room(props) {
  let roomRef;
  let dragHandleRef;
  let colorGridRef;
  let fileInputRef;
  const [position, setPosition] = createSignal({ x: props.x || 0, y: props.y || 0 });
  const [size, setSize] = createSignal({ width: props.width || 300, height: props.height || 200 });
  const [isEditingName, setIsEditingName] = createSignal(false);
  const [editedName, setEditedName] = createSignal(props.name || 'Room');
  const [localColors, setLocalColors] = createSignal(props.colors || []);
  const [draggedIndex, setDraggedIndex] = createSignal(null);

  createEffect(() => {
    setLocalColors(props.colors || []);
  });

  const swapColors = (fromIndex, toIndex) => {
    const colors = [...localColors()];
    if (fromIndex < 0 || fromIndex >= colors.length || toIndex < 0 || toIndex >= colors.length) {
      return;
    }
    const [removed] = colors.splice(fromIndex, 1);
    colors.splice(toIndex, 0, removed);
    setLocalColors(colors);
    props.onUpdate?.({
      ...props,
      colors: colors
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 200x200 while maintaining aspect ratio
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with quality reduction
        const resizedImageData = canvas.toDataURL('image/jpeg', 0.8);

        const newImage = {
          type: 'image',
          data: resizedImageData,
          name: file.name
        };
        const colors = [...localColors(), newImage];
        setLocalColors(colors);
        props.onUpdate?.({
          ...props,
          colors: colors
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const removeItem = (index) => {
    const colors = localColors().filter((_, i) => i !== index);
    setLocalColors(colors);
    props.onUpdate?.({
      ...props,
      colors: colors
    });
  };

  onMount(() => {
    // Enable room dragging
    const draggable = interact(roomRef)
      .draggable({
        allowFrom: dragHandleRef,
        inertia: true,
        modifiers: [
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: true
          })
        ],
        listeners: {
          move(event) {
            const pos = position();
            const newPos = {
              x: pos.x + event.dx,
              y: pos.y + event.dy
            };
            setPosition(newPos);
          },
          end(event) {
            const pos = position();
            props.onUpdate?.({
              ...props,
              x: pos.x,
              y: pos.y,
              width: size().width,
              height: size().height
            });
          }
        }
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 200, height: 150 }
          })
        ],
        listeners: {
          move(event) {
            const pos = position();
            const newSize = {
              width: event.rect.width,
              height: event.rect.height
            };
            const newPos = {
              x: pos.x + event.deltaRect.left,
              y: pos.y + event.deltaRect.top
            };

            setSize(newSize);
            setPosition(newPos);
          },
          end(event) {
            const pos = position();
            const currentSize = size();
            props.onUpdate?.({
              ...props,
              x: pos.x,
              y: pos.y,
              width: currentSize.width,
              height: currentSize.height
            });
          }
        }
      });

    // Enable color reordering
    interact('.color-tile')
      .draggable({
        inertia: false,
        listeners: {
          start(event) {
            const index = parseInt(event.target.getAttribute('data-index'));
            setDraggedIndex(index);
            event.target.style.zIndex = '1000';
            event.target.style.transform = 'scale(1.1)';
            event.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            event.target.style.transition = 'none';
          },
          move(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          },
          end(event) {
            const target = event.target;
            target.style.transition = 'all 0.2s ease';
            target.style.transform = 'translate(0px, 0px) scale(1)';
            target.style.zIndex = '';
            target.style.boxShadow = '';
            target.setAttribute('data-x', 0);
            target.setAttribute('data-y', 0);

            setTimeout(() => {
              target.style.transition = '';
            }, 200);

            setDraggedIndex(null);
          }
        }
      })
      .dropzone({
        accept: '.color-tile',
        overlap: 0.25,
        ondropactivate(event) {
          event.target.classList.add('drop-active');
        },
        ondragenter(event) {
          event.target.classList.add('drop-target');
        },
        ondragleave(event) {
          event.target.classList.remove('drop-target');
        },
        ondrop(event) {
          event.target.classList.remove('drop-target');
          const draggedIdx = draggedIndex();
          const droppedIdx = parseInt(event.target.getAttribute('data-index'));
          if (draggedIdx !== null && draggedIdx !== droppedIdx) {
            swapColors(draggedIdx, droppedIdx);
          }
        },
        ondropdeactivate(event) {
          event.target.classList.remove('drop-active');
          event.target.classList.remove('drop-target');
        }
      });

    onCleanup(() => {
      draggable.unset();
      interact('.color-tile').unset();
    });
  });

  const handleNameSave = () => {
    setIsEditingName(false);
    props.onUpdate?.({
      ...props,
      name: editedName()
    });
  };

  return (
    <div
      ref={roomRef}
      class="absolute bg-white border-2 border-gray-400 rounded-lg shadow-lg overflow-hidden touch-none"
      style={{
        transform: `translate(${position().x}px, ${position().y}px)`,
        width: `${size().width}px`,
        height: `${size().height}px`,
      }}
    >
      <div
        ref={dragHandleRef}
        class="h-10 bg-gray-200 border-b border-gray-300 flex items-center justify-between px-3 cursor-move select-none"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          {isEditingName() ? (
            <input
              type="text"
              value={editedName()}
              onInput={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') {
                  setEditedName(props.name || 'Room');
                  setIsEditingName(false);
                }
              }}
              class="text-sm font-semibold text-gray-700 bg-white px-2 py-1 rounded border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
              autofocus
            />
          ) : (
            <span
              onClick={() => setIsEditingName(true)}
              class="text-sm font-semibold text-gray-700 cursor-text hover:text-gray-900 truncate"
            >
              {props.name || 'Room'}
            </span>
          )}
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={() => props.onAddColor?.(props.id)}
            class="text-green-600 hover:text-green-800 p-1"
            title="Add color"
          >
            <ColorPaletteIcon size={20} />
          </button>
          <button
            onClick={() => fileInputRef?.click()}
            class="text-blue-600 hover:text-blue-800 p-1"
            title="Add image"
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            class="hidden"
          />
          <button
            onClick={() => props.onDelete?.(props.id)}
            class="text-red-500 hover:text-red-700 p-1"
            title="Delete room"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      </div>
      <div class="h-[calc(100%-2.5rem)] overflow-hidden">
        <div ref={colorGridRef} class="grid grid-cols-2 h-full" style={{ 'grid-auto-rows': '1fr' }}>
          <For each={localColors()}>
            {(item, index) => (
              item ? (
                <div
                  class="color-tile relative overflow-hidden group cursor-move select-none touch-action-none"
                  data-index={index()}
                  style={{
                    'background-color': item.type === 'image' ? '#ffffff' : item.hex_code,
                    'user-select': 'none',
                    '-webkit-user-select': 'none',
                    'touch-action': 'none'
                  }}
                  title={item.type === 'image' ? item.name : `${item.color} - ${item.brand}`}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.data}
                      alt={item.name}
                      class="w-full h-full object-contain pointer-events-none p-4"
                    />
                  ) : null}
                <button
                  onClick={() => removeItem(index())}
                  class="absolute top-1 right-1 bg-white bg-opacity-90 text-red-600 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-opacity-100 z-10"
                >
                  <CloseIcon size={16} />
                </button>
                {item.type !== 'image' && (
                  <div class="absolute bottom-0 left-0 bg-black bg-opacity-70 text-white text-xs p-2 max-w-[90%] pointer-events-none">
                    <div class="truncate font-semibold">{item.color}</div>
                    <div class="text-[10px] text-gray-300 truncate">{item.brand}</div>
                  </div>
                )}
                </div>
              ) : null
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

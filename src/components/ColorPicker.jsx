import { createSignal, For } from 'solid-js';
import { searchColors } from '../utils/colorData';

export default function ColorPicker(props) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal(searchColors(''));

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    setResults(searchColors(value));
  };

  const handleSelect = (color) => {
    props.onSelect?.(color);
    props.onClose?.();
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xl font-bold text-gray-800">Select a Color</h2>
            <button
              onClick={() => props.onClose?.()}
              class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
          </div>
          <input
            type="text"
            value={query()}
            onInput={handleSearch}
            placeholder="Search by color name or hex code..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autofocus
          />
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <For each={results()}>
              {(color) => (
                <button
                  onClick={() => handleSelect(color)}
                  class="flex flex-col border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div
                    class="h-24 w-full"
                    style={{ 'background-color': color.hex_code }}
                  />
                  <div class="p-2 bg-white text-left">
                    <div class="font-semibold text-sm text-gray-800 truncate" title={color.color}>
                      {color.color}
                    </div>
                    <div class="text-xs text-gray-500">{color.brand}</div>
                    <div class="text-xs text-gray-400 font-mono">{color.hex_code}</div>
                  </div>
                </button>
              )}
            </For>
          </div>
          {results().length === 0 && (
            <div class="text-center text-gray-500 py-8">
              No colors found matching "{query()}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

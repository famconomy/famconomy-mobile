
import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '../../types';
import { searchInstacart, addInstacartItem } from '../../api/integrations';
import { toast } from 'react-toastify';

// Duplicating this type from the backend for now.
export interface InstacartProduct {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  thumbnail_url: string;
}

interface InstacartExportViewProps {
  items: ShoppingItem[];
}

export const InstacartExportView: React.FC<InstacartExportViewProps> = ({ items }) => {
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(items[0] || null);
  const [searchResults, setSearchResults] = useState<InstacartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedItem) return;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await searchInstacart(selectedItem.Name);
        setSearchResults(results);
      } catch (err) {
        setError('Failed to search for products.');
        toast.error('Failed to search for products.');
      }
      setIsLoading(false);
    };

    performSearch();
  }, [selectedItem]);

  const handleAddItem = async (product: InstacartProduct) => {
    if (!selectedItem) return;
    try {
      await addInstacartItem(product.id, selectedItem.Quantity);
      toast.success(`Added "${product.name}" to your Instacart cart.`);
      // Maybe mark the item as 'added' in the UI?
    } catch (err) {
      toast.error(`Failed to add "${product.name}" to cart.`);
    }
  };

  return (
    <div className="flex h-[70vh]">
      {/* Shopping List Column */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-700 pr-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Your Shopping List</h2>
        <div className="space-y-2">
          {items.map(item => (
            <button 
              key={item.ShoppingItemID}
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedItem?.ShoppingItemID === item.ShoppingItemID
                  ? 'bg-primary-100 dark:bg-primary-900/50'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}>
              <p className="font-medium">{item.Name}</p>
              <p className="text-sm text-neutral-500">{item.Quantity} {item.Unit}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Instacart Search Results Column */}
      <div className="w-2/3 pl-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Instacart Results for "{selectedItem?.Name}"</h2>
        {isLoading && <p>Searching...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && searchResults.length === 0 && <p>No results found.</p>}
        
        <div className="space-y-3">
          {searchResults.map(product => (
            <div key={product.id} className="flex items-center gap-4 p-2 border rounded-lg">
              <img src={product.thumbnail_url} alt={product.name} className="w-16 h-16 rounded-md" />
              <div className="flex-grow">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-neutral-500">{product.brand} - {product.size}</p>
              </div>
              <button 
                onClick={() => handleAddItem(product)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

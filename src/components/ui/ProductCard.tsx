import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock_quantity: number;
  image_url?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // Determine stock status and styling
  const getStockStatus = () => {
    if (product.stock_quantity <= 0) return { status: 'out', label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (product.stock_quantity <= 5) return { status: 'low', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'in', label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const stockInfo = getStockStatus();

  return (
    <Card className="hover:shadow-lg transition-all duration-200 h-full flex flex-col">
      <div className="flex-1 p-4">
        {product.image_url ? (
          <div className="aspect-square w-full mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="aspect-square w-full mb-3 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-primary-600">${product.price.toFixed(2)}</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockInfo.color}`}>
            {stockInfo.label}
          </span>
        </div>
        
        {product.barcode && (
          <div className="text-xs text-gray-500 mb-2">
            <span className="font-medium">Barcode:</span> {product.barcode}
          </div>
        )}
      </div>
      
      <div className="p-4 pt-0">
        <Button 
          className="w-full"
          onClick={() => onAddToCart(product)}
          disabled={product.stock_quantity <= 0}
          variant={product.stock_quantity <= 0 ? 'secondary' : 'default'}
          size="lg"
        >
          {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </Card>
  );
};
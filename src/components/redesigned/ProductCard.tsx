'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock_quantity: number;
  created_at: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  className?: string;
}

export function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  const getStockStatus = () => {
    if (product.stock_quantity > 10) return "default";
    if (product.stock_quantity > 0) return "secondary";
    return "destructive";
  };

  const getStockText = () => {
    if (product.stock_quantity > 10) return "In Stock";
    if (product.stock_quantity > 0) return "Low Stock";
    return "Out of Stock";
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200 cursor-pointer", className)}>
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-medium text-gray-900 line-clamp-2">
          {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm text-gray-500">Barcode: {product.barcode || 'N/A'}</p>
            <Badge variant={getStockStatus() as any} className="mt-2">
              {getStockText()} ({product.stock_quantity})
            </Badge>
          </div>
          <p className="text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={product.stock_quantity <= 0}
          variant={product.stock_quantity <= 0 ? "secondary" : "default"}
        >
          {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
}
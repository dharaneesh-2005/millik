import { useState } from "react";
import { Product } from "@shared/schema";
import { formatPrice } from "@/lib/cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeleteProductDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedProduct: Product | null;
  onDelete: (product: Product) => Promise<void>;
  onCancelled?: () => void;
}

export function DeleteProductDialog({
  isOpen,
  setIsOpen,
  selectedProduct,
  onDelete,
  onCancelled,
}: DeleteProductDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      setIsDeleting(true);
      setError(null);
      await onDelete(selectedProduct);
      setIsOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setIsOpen(false);
      setError(null);
      if (onCancelled) onCancelled();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {selectedProduct && (
          <div className="py-4">
            <div className="flex items-center space-x-4">
              {selectedProduct.imageUrl && (
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name}
                  className="h-16 w-16 rounded-md object-cover"
                />
              )}
              <div>
                <h3 className="font-medium">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500">ID: {selectedProduct.id}</p>
                <p className="text-sm text-gray-500">
                  Price: {formatPrice(Number(selectedProduct.price))}
                </p>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="text-sm text-red-700">
                    <p>Error: {error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="flex items-center justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
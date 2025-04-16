import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CartItem, Product } from "@shared/schema";

// Extended cart item type with additional fields for optimistic updates
interface ExtendedProduct extends Product {
  displayPrice?: string;
  selectedWeight?: string;
}

interface ExtendedCartItem extends CartItem {
  product?: ExtendedProduct;
  _isOptimistic?: boolean;
  _updating?: boolean;
}

interface CartContextType {
  cartItems: ExtendedCartItem[];
  addToCart: (productId: number, quantity: number, selectedWeight?: string) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<ExtendedCartItem[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize cart
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true);
        const savedSessionId = localStorage.getItem("cartSessionId");
        
        const response = await fetch("/api/cart", {
          headers: {
            "Session-Id": savedSessionId || "",
          },
        });
        
        const data = await response.json();
        setCartItems(data);
        
        // Get session ID from response header
        const responseSessionId = response.headers.get("session-id");
        if (responseSessionId) {
          setSessionId(responseSessionId);
          localStorage.setItem("cartSessionId", responseSessionId);
        }
      } catch (error) {
        console.error("Error fetching cart:", error);
        toast({
          title: "Error",
          description: "Failed to load your cart. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCart();
  }, [toast]);

  // Optimized version - add item to cart with client-side UI update first
  const addToCart = async (productId: number, quantity: number, selectedWeight?: string) => {
    try {
      // Get session ID for cart operations
      const savedSessionId = localStorage.getItem("cartSessionId") || sessionId;
      
      // First create an optimistic update using any existing product data we have
      // Find if we already have this product in state - this avoids the initial API call
      const existingProduct = cartItems.find(item => 
        item.productId === productId && 
        item.product // Make sure the product exists
      )?.product;
      
      // Store product details
      let product: Product | undefined;
      
      // Create a flag to track whether we need to fetch the product details
      let needsProductFetch = !existingProduct;
      
      // If we have the product in the cart already, use that data immediately for faster UI feedback
      if (existingProduct) {
        product = existingProduct;
      } else {
        // Try to use recently fetched products from localStorage cache first 
        // for immediate optimistic updates
        try {
          const cachedProducts = localStorage.getItem('recentProducts');
          if (cachedProducts) {
            const productCache = JSON.parse(cachedProducts);
            const cachedProduct = productCache.find((p: any) => p.id === productId);
            if (cachedProduct) {
              product = cachedProduct;
              needsProductFetch = false; // No need to fetch if we have a valid cache
            }
          }
        } catch (err) {
          console.log('Error reading product cache:', err);
          // Continue with product fetch if cache read fails
        }
      }
      
      // If we still need to fetch the product (no cache, not in cart)
      if (needsProductFetch && !product) {
        // Set loading state to true while we fetch
        setIsLoading(true);
        
        try {
          // Fetch product details
          const productResponse = await fetch(`/api/products/${productId}`);
          if (!productResponse.ok) {
            throw new Error(`Failed to get product details: ${productResponse.status}`);
          }
          
          const fetchedProduct = await productResponse.json();
          product = fetchedProduct;
          
          // Cache the product data for future use
          try {
            const cachedProducts = localStorage.getItem('recentProducts');
            let productCache = cachedProducts ? JSON.parse(cachedProducts) : [];
            
            // Remove this product if it already exists in the cache
            productCache = productCache.filter((p: any) => p.id !== productId);
            
            // Add the product to the beginning of the cache
            productCache.unshift(fetchedProduct);
            
            // Limit cache to 20 products
            if (productCache.length > 20) {
              productCache = productCache.slice(0, 20);
            }
            
            localStorage.setItem('recentProducts', JSON.stringify(productCache));
          } catch (err) {
            console.error('Error caching product data:', err);
            // Continue even if caching fails
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          toast({
            title: "Error",
            description: "Could not retrieve product information.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Safety check - by this point we should have product data
      if (!product) {
        console.error("Error: No product data available");
        toast({
          title: "Error",
          description: "Could not retrieve product information.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Validate quantity against stock
      const maxQuantity = product.stockQuantity || Number.MAX_SAFE_INTEGER;
      let safeQuantity = Math.min(quantity, maxQuantity);
      
      // Check if we already have this product+weight in cart
      const existingCartItem = cartItems.find(item => {
        if (item.productId !== productId) return false;
        
        // Check if weight matches
        let itemWeight;
        try {
          if (item.metaData) {
            const meta = JSON.parse(item.metaData);
            itemWeight = meta.selectedWeight;
          }
        } catch (error) {}
        
        return (itemWeight === selectedWeight) || (!itemWeight && !selectedWeight);
      });
      
      // Adjust quantity if needed based on stock limits
      if (existingCartItem && maxQuantity !== Number.MAX_SAFE_INTEGER) {
        const totalQuantity = existingCartItem.quantity + safeQuantity;
        if (totalQuantity > maxQuantity) {
          const allowedToAdd = Math.max(0, maxQuantity - existingCartItem.quantity);
          if (allowedToAdd <= 0) {
            toast({
              title: "Maximum stock reached",
              description: `You already have the maximum available quantity (${maxQuantity}) in your cart.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          safeQuantity = allowedToAdd;
        }
      }
      
      // Create metadata object
      const metaData = selectedWeight ? { selectedWeight } : undefined;
      
      // Calculate correct price based on weight selection
      let itemPrice = product.price;
      let itemComparePrice = product.comparePrice || "";
      
      if (selectedWeight && product.weightPrices) {
        try {
          const weightPrices = JSON.parse(product.weightPrices);
          if (weightPrices[selectedWeight]) {
            if (typeof weightPrices[selectedWeight] === 'object' && weightPrices[selectedWeight].price) {
              itemPrice = weightPrices[selectedWeight].price;
              itemComparePrice = weightPrices[selectedWeight].comparePrice || "";
            } else if (typeof weightPrices[selectedWeight] === 'string') {
              itemPrice = weightPrices[selectedWeight];
            }
          }
        } catch (e) {
          console.error("Error parsing weight prices:", e);
        }
      }
      
      // OPTIMISTIC UI UPDATE - update client state immediately before API call completes
      // This makes the UI feel much faster
      
      // Create a temporary item for optimistic updates
      const optimisticId = -Date.now(); // Use negative numbers for temp IDs
      
      // Make a copy of the current cart items for the update
      let updatedItems = [...cartItems];
      
      if (existingCartItem) {
        // Update existing item
        updatedItems = updatedItems.map(item => 
          item.id === existingCartItem.id 
            ? { ...item, quantity: item.quantity + safeQuantity } 
            : item
        );
      } else {
        // Add new item with required fields for CartItem compatibility
        const newOptimisticItem: ExtendedCartItem = {
          id: optimisticId, // Temporary ID
          productId,
          quantity: safeQuantity,
          metaData: JSON.stringify(metaData),
          userId: null,
          sessionId: savedSessionId,
          createdAt: new Date(),
          product: {
            ...product,
            price: itemPrice,
            comparePrice: itemComparePrice,
            displayPrice: itemPrice,
            selectedWeight: selectedWeight
          } as ExtendedProduct,
          _isOptimistic: true // Flag to identify this is not yet saved to the server
        };
        
        updatedItems.push(newOptimisticItem);
      }
      
      // Update UI immediately
      setCartItems(updatedItems);
      
      // Show success message right away
      toast({
        title: "Added to cart",
        description: "Item added to your cart",
      });
      
      // Set loading state for the API call
      setIsLoading(true);
      
      // Now make the actual API call in the background
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Session-Id": savedSessionId,
        },
        body: JSON.stringify({
          productId,
          quantity: safeQuantity,
          metaData: JSON.stringify(metaData)
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Get the real item from the response
      const newItem = await response.json();
      
      // Update session ID if needed
      const returnedSessionId = response.headers.get("session-id");
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
        localStorage.setItem("cartSessionId", returnedSessionId);
      }
      
      // Replace the optimistic item with the real one from the server
      if (existingCartItem) {
        // No need to update UI again - server has the correct data now
      } else {
        // Replace the temporary item with the real one
        setCartItems(prevItems => 
          prevItems.map(item => 
            item._isOptimistic && item.productId === productId
              ? { 
                  ...newItem, 
                  product: product ? {
                    ...product,
                    price: itemPrice,
                    comparePrice: itemComparePrice,
                    displayPrice: itemPrice,
                    selectedWeight: selectedWeight
                  } as ExtendedProduct : undefined
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      // Remove optimistic items in case of error
      setCartItems(prevItems => prevItems.filter(item => !item._isOptimistic));
      
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update cart item quantity - optimized with client-side update first
  const updateCartItem = async (itemId: number, quantity: number) => {
    try {
      // Find the item to get its product info for stock validation
      const item = cartItems.find(item => item.id === itemId);
      if (!item || !item.product) {
        throw new Error("Cart item not found");
      }
      
      // Save original quantity for rollback if needed
      const originalQuantity = item.quantity;
      
      // Validate quantity against stock
      const maxQuantity = item.product.stockQuantity || Number.MAX_SAFE_INTEGER;
      let safeQuantity = Math.min(quantity, maxQuantity);
      
      // Update UI immediately
      setCartItems(
        cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity: safeQuantity, _updating: true } : item
        )
      );
      
      // Show success message right away
      toast({
        title: "Cart updated",
        description: "Your cart has been updated",
      });
      
      // Now perform the actual API call
      setIsLoading(true);
      const savedSessionId = localStorage.getItem("cartSessionId") || sessionId;
      
      const response = await fetch(`/api/cart/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Session-Id": savedSessionId,
        },
        body: JSON.stringify({ quantity: safeQuantity }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Remove the updating flag
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, _updating: false } : item
        )
      );
    } catch (error) {
      console.error("Error updating cart item:", error);
      
      // Find the cart item again since we're in the catch block
      const savedItem = cartItems.find(item => item.id === itemId);
      
      // Revert to original quantity if the item still exists
      if (savedItem) {
        const originalQuantity = savedItem.quantity;
        setCartItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId ? { ...item, quantity: originalQuantity, _updating: false } : item
          )
        );
      }
      
      toast({
        title: "Error",
        description: "Failed to update cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from cart - optimized with client-side update first
  const removeFromCart = async (itemId: number) => {
    try {
      // Save the removed item for rollback if needed
      const itemToRemove = cartItems.find(item => item.id === itemId);
      if (!itemToRemove) {
        throw new Error("Cart item not found");
      }
      
      // Update UI immediately
      setCartItems(cartItems.filter(item => item.id !== itemId));
      
      // Show success message right away
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
      
      // Now make the actual API call
      setIsLoading(true);
      const savedSessionId = localStorage.getItem("cartSessionId") || sessionId;
      
      const response = await fetch(`/api/cart/${itemId}`, {
        method: "DELETE",
        headers: {
          "Session-Id": savedSessionId,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Server request successful, no need to update UI again
    } catch (error) {
      console.error("Error removing cart item:", error);
      
      // Restore the removed item in case of error
      const itemToRestore = cartItems.find(item => item.id === itemId);
      if (itemToRestore) {
        setCartItems(prev => [...prev, itemToRestore]);
      }
      
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setIsLoading(true);
      
      const savedSessionId = localStorage.getItem("cartSessionId") || sessionId;
      
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Session-Id": savedSessionId,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Update local state
      setCartItems([]);
      
      toast({
        title: "Cart cleared",
        description: "Your cart has been cleared",
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

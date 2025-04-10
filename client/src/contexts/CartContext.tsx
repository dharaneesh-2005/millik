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

interface CartContextType {
  cartItems: (CartItem & { product?: Product })[];
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
  const [cartItems, setCartItems] = useState<(CartItem & { product?: Product })[]>([]);
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

  // Add item to cart
  const addToCart = async (productId: number, quantity: number, selectedWeight?: string) => {
    try {
      setIsLoading(true);
      
      // First, get product details to check stock
      const productResponse = await fetch(`/api/products/${productId}`);
      if (!productResponse.ok) {
        throw new Error(`Failed to get product details: ${productResponse.status}`);
      }
      
      const product = await productResponse.json();
      
      // Validate quantity against stock
      const maxQuantity = product.stockQuantity || Number.MAX_SAFE_INTEGER;
      let safeQuantity = Math.min(quantity, maxQuantity);
      
      // Check if we already have this product+weight in cart to ensure total doesn't exceed stock
      let existingCartItem = null;
      for (const item of cartItems) {
        if (item.productId === productId) {
          let itemWeight = undefined;
          try {
            if (item.metaData) {
              const meta = JSON.parse(item.metaData);
              itemWeight = meta.selectedWeight;
            }
          } catch (error) {
            console.error("Error parsing metadata:", error);
          }
          
          const sameWeight = (itemWeight === selectedWeight) || 
                            (!itemWeight && !selectedWeight);
          
          if (sameWeight) {
            existingCartItem = item;
            break;
          }
        }
      }
      
      // If total quantity would exceed stock, adjust the quantity being added
      if (existingCartItem && maxQuantity !== Number.MAX_SAFE_INTEGER) {
        const totalQuantity = existingCartItem.quantity + safeQuantity;
        if (totalQuantity > maxQuantity) {
          // Only add what's allowed by stock
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
          // Adjust quantity
          safeQuantity = allowedToAdd;
        }
      }
      
      // Make sure we're sending the sessionId in the headers
      const savedSessionId = localStorage.getItem("cartSessionId") || sessionId;
      
      // Create an object to store additional information including the selected weight
      const metaData = selectedWeight ? { selectedWeight } : undefined;
      
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
      
      const newItem = await response.json();
      
      // If we get a new session ID from the server, save it
      const returnedSessionId = response.headers.get("session-id");
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
        localStorage.setItem("cartSessionId", returnedSessionId);
      }
      
      // Update local cart state - Check for existing cart item with same product and weight
      // We now consider weight as a unique identifier for the same product
      let existingItem = null;
      const updatedItems = [...cartItems];
      
      // First, try to find an existing item with the same product and weight option
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        if (item.productId === productId) {
          // For items with metadata, check if the selected weight matches
          let itemWeight = undefined;
          try {
            if (item.metaData) {
              const meta = JSON.parse(item.metaData);
              itemWeight = meta.selectedWeight;
            }
          } catch (error) {
            console.error("Error parsing metadata:", error);
          }
          
          // Both items have the same weight or both have no weight
          const sameWeight = (itemWeight === selectedWeight) || 
                            (!itemWeight && !selectedWeight);
          
          if (sameWeight) {
            existingItem = item;
            // Update quantity of the existing item
            updatedItems[i] = {
              ...item,
              quantity: item.quantity + safeQuantity
            };
            break;
          }
        }
      }
      
      // If we found and updated an existing item, set the cart state
      if (existingItem) {
        setCartItems(updatedItems);
      } else {
        // This is a new item or the same product with a different weight option        
        // If weight is selected, get the appropriate price from weight prices
        let itemPrice = product.price;
        
        if (selectedWeight && product.weightPrices) {
          try {
            const weightPrices = JSON.parse(product.weightPrices);
            if (weightPrices[selectedWeight] && weightPrices[selectedWeight].price) {
              itemPrice = weightPrices[selectedWeight].price;
              console.log(`Using weight-specific price for ${selectedWeight}: ${itemPrice}`);
            }
          } catch (e) {
            console.error("Error parsing weight prices:", e);
          }
        }
        
        // Add new item with the product and weight-specific price
        setCartItems([...cartItems, { 
          ...newItem, 
          product: {
            ...product,
            displayPrice: itemPrice,
            selectedWeight: selectedWeight
          } 
        }]);
      }
      
      toast({
        title: "Added to cart",
        description: safeQuantity < quantity 
          ? `Added ${safeQuantity} items to cart (limited by available stock)` 
          : "Item has been added to your cart",
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update cart item quantity
  const updateCartItem = async (itemId: number, quantity: number) => {
    try {
      setIsLoading(true);
      
      // Find the item to get its product info for stock validation
      const item = cartItems.find(item => item.id === itemId);
      if (!item || !item.product) {
        throw new Error("Cart item not found");
      }
      
      // Validate quantity against stock
      const maxQuantity = item.product.stockQuantity || Number.MAX_SAFE_INTEGER;
      let safeQuantity = Math.min(quantity, maxQuantity);
      
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
      
      // Update local state
      setCartItems(
        cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity: safeQuantity } : item
        )
      );
      
      toast({
        title: "Cart updated",
        description: "Your cart has been updated",
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      toast({
        title: "Error",
        description: "Failed to update cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId: number) => {
    try {
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
      
      // Update local state
      setCartItems(cartItems.filter((item) => item.id !== itemId));
      
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    } catch (error) {
      console.error("Error removing cart item:", error);
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

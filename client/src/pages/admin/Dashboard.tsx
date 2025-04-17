import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import LogoLoader from "@/components/LogoLoader";
import { DeleteProductDialog } from "@/components/admin/DeleteProductDialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  ShoppingBag, 
  MessageSquare, 
  LayoutDashboard,
  Check,
  X,
  Filter,
  MoreHorizontal,
  Tag,
  Banknote,
  PackageCheck,
  ChevronDown,
  AlertTriangle,
  LogOut,
  ShoppingCart,
  Truck,
  Package,
  Loader2,
  BarChart3,
  SearchX
} from "lucide-react";
import type { Product, Contact, Order, OrderItem, OrderStatus } from "@shared/schema";
import { formatPrice } from "@/lib/cart";

// The admin key - in a real app, this would be retrieved securely (e.g., from auth context)
// Get admin key from environment variable or use fallback for local development
const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || "admin-secret";

// Format a phone number for better readability (e.g., (123) 456-7890)
const formatPhoneNumber = (phoneNumber: string) => {
  // Clean the phone number to only contain digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // For Indian numbers (10 digits)
  if (cleaned.length === 10) {
    return `+91 ${cleaned}`;
  } 
  // If the number already has a country code (more than 10 digits)
  else if (cleaned.length > 10) {
    // For numbers that might already have country code
    // Check if it starts with 91 (India)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    }
    // If it's some other country code
    return `+${cleaned.substring(0, cleaned.length - 10)} ${cleaned.substring(cleaned.length - 10)}`;
  }
  
  // If it doesn't match expected formats, return with +91 prefix if possible
  // or return the original number if too short
  return cleaned.length > 5 ? `+91 ${cleaned}` : phoneNumber;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  // Add a reference to track if initial data has been loaded
  const initialDataLoaded = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>(
    () => sessionStorage.getItem("adminActiveTab") || "products"
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Save the active tab whenever it changes
  useEffect(() => {
    sessionStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);
  
  // Remove the previous authentication check as it's causing issues
  // Instead, check if we need to redirect to login with proper debugging
  useEffect(() => {
    // Use a ref to prevent multiple redirects
    const redirectedRef = sessionStorage.getItem("adminDashboardRedirectCheck");
    
    // If we already checked, don't check again during this session
    if (redirectedRef === "checked") {
      console.log("Already checked admin authentication, skipping check");
      return;
    }
    
    // Check if admin session exists in sessionStorage
    const adminSession = sessionStorage.getItem("adminSessionId");
    const adminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
    
    console.log("Dashboard auth check:", { adminSession, adminAuthenticated });
    
    // If no admin session or not authenticated, redirect to login
    if (!adminSession || !adminAuthenticated) {
      console.log("No admin session found, will redirect to login");
      
      // Add a small delay before redirecting to allow for debugging
      // This prevents immediate redirect loops
      setTimeout(() => {
        console.log("Redirecting to login from dashboard now");
        window.location.href = "/admin/login";
      }, 1000);
    } else {
      console.log("Admin is authenticated, staying on dashboard");
    }
    
    // Mark that we've performed the check
    sessionStorage.setItem("adminDashboardRedirectCheck", "checked");
  }, []);
  
  // Orders state variables - consolidated to avoid duplicate declarations
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSortBy, setOrderSortBy] = useState<string>("date-desc");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isDiagnosticsLoading, setIsDiagnosticsLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  // Add a ref to track if stats data is being loaded
  const isRefreshingStatsData = useRef(false);

  // Modify the useEffect that loads data
  useEffect(() => {
    // If initial data hasn't been loaded yet, load it based on the active tab
    if (!initialDataLoaded.current) {
      // Load data based on active tab
      if (activeTab === "products") {
        fetchProducts();
      } else if (activeTab === "contacts") {
        fetchContacts();
      } else if (activeTab === "orders") {
        fetchOrders();
      } else if (activeTab === "stats") {
        // For the stats tab, load all data
        refreshAllStatsData();
      }
      initialDataLoaded.current = true;
    }
  }, [activeTab]);
  
  // Load data on tab change if not already loaded
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Load data if not already loaded for this tab or if it's the stats tab (which needs all data)
    if (value === "products" && products.length === 0) {
      fetchProducts();
    } else if (value === "contacts" && contacts.length === 0) {
      fetchContacts();
    } else if (value === "orders" && orders.length === 0) {
      fetchOrders();
    } else if (value === "stats") {
      // For stats tab, only refresh data if we're not already refreshing
      // and if some data is missing
      if (!isRefreshingStatsData.current) {
        const needsProducts = products.length === 0;
        const needsContacts = contacts.length === 0;
        const needsOrders = orders.length === 0;
        
        if (needsProducts || needsContacts || needsOrders) {
          console.log("Tab change to stats with missing data, triggering refresh");
          // Let the useEffect handle the actual data loading
          // This avoids duplicate loading
        } else {
          console.log("Tab change to stats, but all data is already loaded");
        }
      } else {
        console.log("Tab change to stats, but refresh is already in progress");
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/admin/contacts", {
        headers: {
          "x-admin-key": ADMIN_KEY,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contact messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      try {
        console.log(`Fetching orders from API (attempt ${retryCount + 1})...`);
        
        // Add cache-busting query parameter to prevent stale data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/admin/orders?_=${timestamp}`, {
          headers: {
            "x-admin-key": ADMIN_KEY,
            "admin-session-id": sessionStorage.getItem("adminSessionId") || '',
            // Add cache control headers
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          },
        });
        
        console.log('Orders API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch orders: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.length} orders successfully`);
        
        // Log first few orders for debugging
        if (data.length > 0) {
          console.log('First 3 orders:', data.slice(0, 3).map((order: Order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
            email: order.email
          })));
        }
        
        setOrders(data);
        return true;
      } catch (error) {
        console.error(`Error fetching orders (attempt ${retryCount + 1}):`, error);
        if (retryCount < maxRetries - 1) {
          retryCount++;
          console.log(`Retrying in ${retryCount * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          return attemptFetch();
        } else {
          toast({
            title: "Error",
            description: "Failed to load orders after multiple attempts. Please refresh the page or try again later.",
            variant: "destructive",
          });
          return false;
        }
      }
    };
    
    try {
      await attemptFetch();
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          "x-admin-key": ADMIN_KEY,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      const data = await response.json();
      setSelectedOrder(data.order);
      setOrderItems(data.orderItems);
      setIsOrderDetailOpen(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: number, status: OrderStatus, e?: React.MouseEvent) => {
    // Prevent default behavior if event is provided (e.g., from a button click in a form)
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    try {
      // Show loading toast
      const loadingToast = toast({
        title: "Updating...",
        description: "Updating order status",
      });
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error("Failed to update order status");
      
      const updatedOrder = await response.json();
      
      // Update orders in state
      setOrders(orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ));
      
      // Also update selectedOrder if it's open in the details modal
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
      
      // Dismiss loading toast and show success
      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });
      
      return updatedOrder; // Return the updated order for any further processing
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Rename these variables to ensure there are no duplicate declarations 
  // with the ones near line 240 of the server version
  const orderStatusFilterVar = orderStatusFilter;
  const setOrderStatusFilterVar = setOrderStatusFilter;
  const orderSearchQueryVar = orderSearchQuery;
  const setOrderSearchQueryVar = setOrderSearchQuery;

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Filter by search query (order number, email, phone)
        const searchLower = orderSearchQueryVar.toLowerCase();
        const matchesSearch = 
          order.orderNumber.toLowerCase().includes(searchLower) ||
          (order.email && order.email.toLowerCase().includes(searchLower)) ||
          (order.phone && order.phone.toLowerCase().includes(searchLower));
        
        // Filter by status
        const matchesStatus = 
          orderStatusFilterVar === "all" || 
          order.status === orderStatusFilterVar;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort orders based on selected sort option
        switch (orderSortBy) {
          case "date-asc":
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          case "date-desc":
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case "amount-asc":
            return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
          case "amount-desc":
            return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
          default:
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
      });
  }, [orders, orderStatusFilterVar, orderSearchQueryVar, orderSortBy]);

  const deleteProduct = async (productId: number) => {
    try {
      // Show loading toast
      toast({
        title: "Deleting...",
        description: "Deleting product, please wait",
      });
      
      console.log(`Attempting to delete product with ID: ${productId}`);
      
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": ADMIN_KEY,
          "Content-Type": "application/json",
          // Add cache control headers
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
      });
      
      // Log the response details for debugging
      console.log(`Delete API response status: ${response.status}`);
      
      // Handle different response status codes
      if (response.status === 204) {
        console.log("Product deleted successfully (204 No Content)");
      } else if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log("Product deleted successfully with data:", data);
      } else {
        // Try to get error details from response
        const errorData = await response.text().catch(() => "Unknown error");
        console.error("Server error response:", errorData);
        throw new Error(`Failed to delete product: ${response.status} ${response.statusText}`);
      }
      
      // Update UI by removing the deleted product
      setProducts(products.filter(product => product.id !== productId));
      
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      
      // Refresh products list after deletion
      fetchProducts();
      
      toast({
        title: "Success",
        description: "Product has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleProductFeatured = async (product: Product, e?: React.MouseEvent) => {
    // Prevent default behavior if event is provided
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();  // Stop event bubbling
    }
    
    try {
      // Show loading toast
      const loadingToast = toast({
        title: "Updating...",
        description: `${product.featured ? "Removing from" : "Adding to"} featured products`,
      });
      
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",  // Changed back to PUT to match server API
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          featured: !product.featured,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to toggle featured status");
      }
      
      const updatedProduct = await response.json();
      
      // Update local state
      setProducts(
        products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      
      toast({
        title: "Success",
        description: `Product ${updatedProduct.featured ? "added to" : "removed from"} featured list`,
      });
      
      return updatedProduct;
    } catch (error) {
      console.error("Error toggling product featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update featured status. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const toggleProductInStock = async (product: Product, e?: React.MouseEvent) => {
    // Prevent default behavior if event is provided
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();  // Stop event bubbling
    }
    
    try {
      // Show loading toast
      const loadingToast = toast({
        title: "Updating...",
        description: `${product.inStock ? "Marking as out of stock" : "Restocking"} product`,
      });
      
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",  // Changed back to PUT to match server API
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          inStock: !product.inStock,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to toggle stock status");
      }
      
      const updatedProduct = await response.json();
      
      // Update local state
      setProducts(
        products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      
      toast({
        title: "Success",
        description: `Product ${updatedProduct.inStock ? "is now in stock" : "is now out of stock"}`,
      });
      
      return updatedProduct;
    } catch (error) {
      console.error("Error toggling product stock status:", error);
      toast({
        title: "Error",
        description: "Failed to update stock status. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const bulkDeleteProducts = async () => {
    try {
      // Execute delete operations in parallel
      await Promise.all(
        selectedProductIds.map(id => 
          fetch(`/api/admin/products/${id}`, {
            method: "DELETE",
            headers: {
              "x-admin-key": ADMIN_KEY,
            },
          })
        )
      );
      
      // Update UI by removing the deleted products
      setProducts(products.filter(product => !selectedProductIds.includes(product.id)));
      
      // Reset selections
      setSelectedProductIds([]);
      setIsBulkDeleteDialogOpen(false);
      
      toast({
        title: "Success",
        description: `${selectedProductIds.length} products have been deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting products:", error);
      toast({
        title: "Error",
        description: "Failed to delete one or more products. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckboxChange = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProductIds([...selectedProductIds, productId]);
    } else {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    }
  };

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      const allProductIds = filteredProducts.map(product => product.id);
      setSelectedProductIds(allProductIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  const bulkSetFeatured = async (featured: boolean) => {
    try {
      // Execute update operations in parallel
      await Promise.all(
        selectedProductIds.map(id => 
          fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": ADMIN_KEY,
            },
            body: JSON.stringify({ featured }),
          })
        )
      );
      
      // Update products in the UI
      setProducts(products.map(p => 
        selectedProductIds.includes(p.id) 
          ? { ...p, featured } 
          : p
      ));
      
      // Reset selections
      setSelectedProductIds([]);
      
      toast({
        title: "Success",
        description: `${selectedProductIds.length} products have been ${featured ? 'featured' : 'unfeatured'}.`,
      });
    } catch (error) {
      console.error("Error updating products:", error);
      toast({
        title: "Error",
        description: "Failed to update products. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filtering and sorting logic
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = searchQuery === "" || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = categoryFilter === "" || categoryFilter === "all" || 
          product.category === categoryFilter;
        
        const matchesFeatured = featuredFilter === "" || featuredFilter === "all" || 
          (featuredFilter === "featured" && product.featured) ||
          (featuredFilter === "not-featured" && !product.featured);
        
        const matchesStock = stockFilter === "" || stockFilter === "all" || 
          (stockFilter === "in-stock" && product.inStock) ||
          (stockFilter === "out-of-stock" && !product.inStock) ||
          (stockFilter === "low-stock" && 
            product.inStock && 
            product.stockQuantity !== null && 
            product.stockQuantity <= 5);
        
        return matchesSearch && matchesCategory && matchesFeatured && matchesStock;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "price-asc":
            return parseFloat(a.price) - parseFloat(b.price);
          case "price-desc":
            return parseFloat(b.price) - parseFloat(a.price);
          case "category":
            return a.category.localeCompare(b.category);
          case "date-asc":
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "date-desc":
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
  }, [products, searchQuery, categoryFilter, featuredFilter, stockFilter, sortBy]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category));
    return Array.from(categorySet);
  }, [products]);

  const runDiagnostics = async () => {
    setIsDiagnosticsLoading(true);
    try {
      console.log('Running order diagnostics...');
      const response = await fetch("/api/admin/diagnostics/orders", {
        headers: {
          "x-admin-key": ADMIN_KEY,
          "admin-session-id": sessionStorage.getItem("adminSessionId") || '',
          // Add cache control headers
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Diagnostics failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Diagnostics failed: ${response.status} ${response.statusText}`);
      }
      
      // Check the content type to help with debugging
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200) + '...');
        throw new Error('Server returned a non-JSON response');
      }
      
      // Safely parse the JSON
      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse diagnostic response:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      setDiagnosticsData(data);
      console.log('Diagnostics results:', data);
      
      setIsDiagnosticsModalOpen(true);
    } catch (error) {
      console.error("Error running diagnostics:", error);
      toast({
        title: "Diagnostics Error",
        description: error instanceof Error ? error.message : "Failed to run diagnostics",
        variant: "destructive",
      });
      // Re-throw the error to be caught by the caller
      throw error;
    } finally {
      setIsDiagnosticsLoading(false);
    }
  };

  const runSimpleDiagnostics = async () => {
    setIsDiagnosticsLoading(true);
    try {
      console.log('Running simple diagnostics...');
      const response = await fetch("/api/admin/diagnostics/simple", {
        headers: {
          "x-admin-key": ADMIN_KEY,
          "admin-session-id": sessionStorage.getItem("adminSessionId") || '',
          "Cache-Control": "no-cache"
        },
      });
      
      if (!response.ok) {
        throw new Error(`Simple diagnostics failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Simple diagnostics results:', data);
      
      // Format the simple data to fit our diagnostics modal
      const formattedData = {
        timestamp: data.timestamp,
        normalApiOrdersCount: data.orders.count,
        normalApiFirstOrder: data.orders.sample?.[0] ? {
          id: data.orders.sample[0].id,
          orderNumber: data.orders.sample[0].number,
          status: data.orders.sample[0].status
        } : null,
        databaseInfo: {
          storageImplementation: data.database.type,
          isPostgreSQLActive: data.database.connectionActive,
          connectionString: 'See server logs'
        },
        rawSqlResults: {
          ordersCount: data.orders.count,
          firstFewOrders: data.orders.sample.map((sample: { id: number, number: string, status: string }) => ({
            id: sample.id,
            order_number: sample.number,
            status: sample.status
          })),
          error: null
        },
        environmentInfo: {
          nodeEnv: 'See server logs',
          databaseUrlDefined: data.database.connectionActive,
          databaseUrlLength: 'See server logs'
        },
        isSimpleResponse: true
      };
      
      setDiagnosticsData(formattedData);
      setIsDiagnosticsModalOpen(true);
    } catch (error) {
      console.error("Error running simple diagnostics:", error);
      toast({
        title: "Simple Diagnostics Error",
        description: error instanceof Error ? error.message : "Failed to run diagnostics",
        variant: "destructive",
      });
    } finally {
      setIsDiagnosticsLoading(false);
    }
  };

  const attemptDiagnostics = async () => {
    try {
      await runDiagnostics();
    } catch (error) {
      console.error("Regular diagnostics failed, trying simple diagnostics:", error);
      try {
        await runSimpleDiagnostics();
      } catch (fallbackError) {
        console.error("Both diagnostics methods failed:", fallbackError);
        toast({
          title: "Diagnostics Failed",
          description: "All diagnostic methods failed. Please check the server logs.",
          variant: "destructive",
        });
      }
    }
  };

  // Modify the effect for the stats tab
  useEffect(() => {
    // If we're on the stats tab, make sure all data is loaded
    if (activeTab === "stats" && !isRefreshingStatsData.current) {
      console.log("Stats tab is active, ensuring all data is loaded");
      
      // Only load data if it's not already loaded
      const needsProducts = products.length === 0;
      const needsContacts = contacts.length === 0;
      const needsOrders = orders.length === 0;
      
      // If any data is missing, load it
      if (needsProducts || needsContacts || needsOrders) {
        console.log("Missing data for stats, loading:", {
          needsProducts,
          needsContacts,
          needsOrders
        });
        
        // Start with a loading state
        setLoading(true);
        isRefreshingStatsData.current = true;
        
        // Create an array of promises for data fetching
        const fetchPromises = [];
        
        // Only fetch what's needed
        if (needsProducts) {
          console.log("Fetching products for stats");
          fetchPromises.push(fetchProducts());
        }
        
        if (needsContacts) {
          console.log("Fetching contacts for stats");
          fetchPromises.push(fetchContacts());
        }
        
        if (needsOrders) {
          console.log("Fetching orders for stats");
          fetchPromises.push(fetchOrders());
        }
        
        // If we have promises to resolve, wait for them
        if (fetchPromises.length > 0) {
          Promise.all(fetchPromises)
            .catch(error => {
              console.error("Error loading data for stats:", error);
              toast({
                title: "Error",
                description: "Failed to load all data for statistics. Some numbers may be incorrect.",
                variant: "destructive",
              });
            })
            .finally(() => {
              setLoading(false);
              isRefreshingStatsData.current = false;
              console.log("Stats data loading complete");
            });
        } else {
          // No data needed to be fetched
          setLoading(false);
          isRefreshingStatsData.current = false;
        }
      } else {
        console.log("All data already loaded for stats");
      }
    }
  }, [activeTab]);

  // Add specific data loading refresh function for stats page with protection
  const refreshAllStatsData = async () => {
    // Prevent multiple refreshes
    if (isRefreshingStatsData.current || loading) {
      console.log("Already refreshing data, ignoring request");
      return;
    }
    
    console.log("Manually refreshing all stats data...");
    isRefreshingStatsData.current = true;
    setLoading(true);
    
    try {
      // Run these in parallel
      await Promise.all([
        fetchProducts(),
        fetchContacts(),
        fetchOrders()
      ]);
      
      toast({
        title: "Data refreshed",
        description: "Statistics have been updated with the latest data.",
      });
    } catch (error) {
      console.error("Error refreshing stats data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh statistics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isRefreshingStatsData.current = false;
      console.log("Manual stats refresh complete");
    }
  };

  // Return JSX with updated TabsList to use our new tab change handler
  return (
    <Layout>
      <motion.div 
        className="container mx-auto py-8 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 mt-16 md:mt-20">
          <motion.h1 
            className="text-3xl font-bold text-green-800"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Admin Dashboard
          </motion.h1>
          <div className="flex space-x-4 mt-4 md:mt-0 z-10">
            <Button variant="outline" asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                sessionStorage.removeItem("adminAuthenticated");
                sessionStorage.removeItem("adminSessionId");
                window.location.href = "/admin/login";
                toast({
                  title: "Logged out successfully",
                  description: "You have been logged out of the admin area",
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 w-full max-w-md mb-8">
              <TabsTrigger value="products" className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Keep all the existing TabsContent components unchanged */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Products Management</CardTitle>
                  <CardDescription>
                    Manage your products, update details, and control visibility.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <LogoLoader />
                    </div>
                  ) : (
                    <>
                      {/* Filters and Search */}
                      <div className="mb-6 space-y-4">
                        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                          <div className="flex-1">
                            <div className="relative">
                              <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  strokeWidth={1.5} 
                                  stroke="currentColor" 
                                  className="w-5 h-5"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" 
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Select 
                              value={categoryFilter} 
                              onValueChange={(value) => setCategoryFilter(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={featuredFilter}
                              onValueChange={(value) => setFeaturedFilter(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Featured" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                <SelectItem value="featured">Featured</SelectItem>
                                <SelectItem value="not-featured">Not Featured</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              value={stockFilter}
                              onValueChange={(value) => setStockFilter(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Stock" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Stock</SelectItem>
                                <SelectItem value="in-stock">In Stock</SelectItem>
                                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                                <SelectItem value="low-stock">Low Stock (≤5)</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              value={sortBy}
                              onValueChange={(value) => setSortBy(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sort By" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                                <SelectItem value="category">Category</SelectItem>
                                <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                                <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedProductIds.length > 0 && (
                          <div className="flex items-center space-x-4 bg-muted p-3 rounded-md">
                            <span className="text-sm font-medium">
                              {selectedProductIds.length} selected
                            </span>
                            <div className="flex-1"></div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => bulkSetFeatured(true)}>
                                  <Tag className="mr-2 h-4 w-4" />
                                  <span>Set Featured</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkSetFeatured(false)}>
                                  <Tag className="mr-2 h-4 w-4" />
                                  <span>Unset Featured</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600" 
                                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete Selected</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* Products Table */}
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No products found with the selected filters.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableCaption>
                              Showing {filteredProducts.length} of {products.length} total products.
                            </TableCaption>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox 
                                    checked={
                                      filteredProducts.length > 0 && 
                                      selectedProductIds.length === filteredProducts.length
                                    }
                                    onCheckedChange={handleSelectAllChange}
                                  />
                                </TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead>Product Information</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={selectedProductIds.includes(product.id)}
                                      onCheckedChange={(checked) => 
                                        handleCheckboxChange(product.id, checked === true)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name} 
                                      className="w-16 h-16 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Category: {product.category}
                                      </div>
                                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                                        {product.shortDescription}
                                      </div>
                                      {product.badge && (
                                        <Badge variant="outline" className="mt-1">
                                          {product.badge}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium">₹{formatPrice(product.price)}</div>
                                      {product.comparePrice && (
                                        <div className="text-sm line-through text-muted-foreground">
                                          ₹{formatPrice(product.comparePrice)}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {product.createdAt ? 
                                        new Date(product.createdAt).toLocaleString('en-US', {
                                          year: 'numeric', 
                                          month: 'short', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }) : 'N/A'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Button 
                                          variant={product.featured ? "default" : "outline"} 
                                          size="sm"
                                          onClick={(e) => toggleProductFeatured(product)}
                                          className="h-8 px-2"
                                        >
                                          {product.featured ? (
                                            <>
                                              <Check className="mr-1 h-3 w-3" />
                                              Featured
                                            </>
                                          ) : (
                                            <>
                                              <X className="mr-1 h-3 w-3" />
                                              Not Featured
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <div className="flex items-center">
                                        <Badge 
                                          variant={product.inStock ? "outline" : "destructive"}
                                          className="h-7"
                                        >
                                          {product.inStock ? (
                                            <span className="flex items-center">
                                              <Check className="mr-1 h-3 w-3" />
                                              In Stock
                                              {product.stockQuantity !== null && (
                                                <span className="ml-1">
                                                  ({product.stockQuantity})
                                                </span>
                                              )}
                                            </span>
                                          ) : (
                                            <span className="flex items-center">
                                              <X className="mr-1 h-3 w-3" />
                                              Out of Stock
                                            </span>
                                          )}
                                        </Badge>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">Actions</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                          <Link href={`/admin/products/${product.id}`}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                          </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => toggleProductFeatured(product)}
                                        >
                                          <Tag className="mr-2 h-4 w-4" />
                                          <span>
                                            {product.featured ? "Remove from Featured" : "Add to Featured"}
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => toggleProductInStock(product)}
                                        >
                                          <PackageCheck className="mr-2 h-4 w-4" />
                                          <span>
                                            {product.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={(e) => {
                                            setSelectedProduct(product);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>Delete</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Orders Management</CardTitle>
                  <CardDescription>
                    View and manage customer orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:items-center md:justify-between">
                      <div className="flex-1">
                        <Input 
                          id="orderSearchQuery"
                          placeholder="Search by order number, email, phone..."
                          value={orderSearchQueryVar}
                          onChange={(e) => setOrderSearchQueryVar(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                        <Select 
                          value={orderStatusFilterVar}
                          onValueChange={(value) => setOrderStatusFilterVar(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={orderSortBy}
                          onValueChange={setOrderSortBy}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date-desc">Date (Newest first)</SelectItem>
                            <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
                            <SelectItem value="amount-asc">Amount (Low to high)</SelectItem>
                            <SelectItem value="amount-desc">Amount (High to low)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          className="h-9"
                          onClick={attemptDiagnostics}
                          disabled={isDiagnosticsLoading}
                        >
                          {isDiagnosticsLoading ? (
                            <>
                              <div className="mr-2 h-4 w-4">
                                <LogoLoader size="small" />
                              </div>
                              Running...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Diagnostics
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center h-40">
                        <p className="text-lg text-muted-foreground">Loading orders...</p>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 space-y-4">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">No orders found</p>
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order Number</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Payment Status</TableHead>
                              <TableHead>Order Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                <TableCell>
                                  {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{order.email}</span>
                                    {order.phone && <span className="text-xs text-muted-foreground">{formatPhoneNumber(order.phone)}</span>}
                                  </div>
                                </TableCell>
                                <TableCell>₹{formatPrice(order.totalAmount)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.paymentStatus === "completed" ? "default" :
                                      order.paymentStatus === "pending" ? "outline" :
                                      "destructive"
                                    }
                                  >
                                    {order.paymentStatus === "completed" ? "Paid" :
                                     order.paymentStatus === "pending" ? "Pending" :
                                     "Failed"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.status === "delivered" || order.status === "completed" ? "default" :
                                      order.status === "shipped" ? "secondary" :
                                      order.status === "processing" ? "outline" :
                                      order.status === "pending" ? "secondary" :
                                      order.status === "cancelled" || order.status === "failed" ? "destructive" :
                                      "outline"
                                    }
                                  >
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => fetchOrderDetails(order.id)}>
                                        View details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "processing")}>
                                        Mark as Processing
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "completed")}>
                                        Mark as Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "cancelled")}>
                                        Cancel Order
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Details Dialog */}
              <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Order Details</DialogTitle>
                    <DialogDescription>
                      {selectedOrder && `Order #${selectedOrder.orderNumber} - ${new Date(selectedOrder.createdAt || Date.now()).toLocaleDateString()}`}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedOrder && (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Customer Information</h3>
                          <div className="p-4 border rounded-md">
                            <p><strong>Email:</strong> {selectedOrder.email}</p>
                            {selectedOrder.phone && <p><strong>Phone:</strong> {formatPhoneNumber(selectedOrder.phone)}</p>}
                          </div>
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Shipping Address</h3>
                          <div className="p-4 border rounded-md">
                            <p>{selectedOrder.shippingAddress}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Order Status</h3>
                        <div className="p-4 border rounded-md">
                          <div className="flex space-x-2 mb-4">
                            <Select
                              value={selectedOrder.status}
                              onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as OrderStatus)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={(e) => updateOrderStatus(selectedOrder.id, selectedOrder.status as OrderStatus)}
                            >
                              Update
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Payment Method</p>
                              <p className="font-medium">{selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : 
                                selectedOrder.paymentMethod === "razorpay" ? "Online Payment (Razorpay)" : 
                                selectedOrder.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Payment Status</p>
                              <Badge
                                variant={
                                  selectedOrder.paymentStatus === "completed" ? "default" :
                                  selectedOrder.paymentStatus === "pending" ? "outline" :
                                  "destructive"
                                }
                              >
                                {selectedOrder.paymentStatus === "completed" ? "Paid" :
                                selectedOrder.paymentStatus === "pending" ? "Pending" :
                                "Failed"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Order Items</h3>
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-center">Quantity</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    {item.weight && (
                                      <div className="text-xs text-muted-foreground">
                                        Weight: {item.weight}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">₹{formatPrice(item.price || "0")}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right">₹{formatPrice(item.subtotal || "0")}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                                <TableCell className="text-right">₹{formatPrice(selectedOrder.subtotalAmount || "0")}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Shipping</TableCell>
                                <TableCell className="text-right">₹{formatPrice(selectedOrder.shippingAmount || "0")}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Tax</TableCell>
                                <TableCell className="text-right">₹{formatPrice(selectedOrder.taxAmount || "0")}</TableCell>
                              </TableRow>
                              {parseFloat(selectedOrder.discountAmount || "0") > 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-right font-medium">Discount</TableCell>
                                  <TableCell className="text-right">-₹{formatPrice(selectedOrder.discountAmount || "0")}</TableCell>
                                </TableRow>
                              )}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                                <TableCell className="text-right font-medium">₹{formatPrice(selectedOrder.totalAmount || "0")}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOrderDetailOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="contacts">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Messages</CardTitle>
                  <CardDescription>
                    View and manage customer inquiries and messages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No contact messages found.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {contacts.map((contact) => (
                        <Card key={contact.id}>
                          <CardHeader>
                            <div className="flex justify-between">
                              <div>
                                <CardTitle>{contact.name}</CardTitle>
                                <CardDescription>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {contact.email}
                                    </div>
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      <a href={`tel:${contact.phone}`} className="hover:text-green-600 transition-colors">
                                        {formatPhoneNumber(contact.phone)}
                                      </a>
                                    </div>
                                  </div>
                                </CardDescription>
                              </div>
                              <div className="text-sm text-gray-500">
                                {contact.createdAt ? 
                                  new Date(contact.createdAt).toLocaleString('en-US', {
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : ''}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-line">{contact.message}</p>
                          </CardContent>
                          <CardFooter className="flex justify-end">
                            <Button variant="outline" asChild>
                              <a href={`mailto:${contact.email}`}>Reply</a>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Store Statistics</CardTitle>
                      <CardDescription>
                        Key metrics and performance indicators for your store
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        // Prevent default behavior
                        e.preventDefault();
                        // Only call if not already refreshing
                        if (!isRefreshingStatsData.current && !loading) {
                          refreshAllStatsData();
                        } else {
                          console.log("Refresh already in progress, ignoring click");
                        }
                      }}
                      disabled={loading || isRefreshingStatsData.current}
                    >
                      {loading || isRefreshingStatsData.current ? (
                        <>
                          <div className="mr-2 h-4 w-4">
                            <LogoLoader size="small" />
                          </div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                          Refresh Data
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription className="flex items-center">
                            <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                            Total Products
                          </CardDescription>
                          <CardTitle className="text-3xl">{products.length}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription className="flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            Featured Products
                          </CardDescription>
                          <CardTitle className="text-3xl">
                            {products.filter(p => p.featured).length}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription className="flex items-center">
                            <PackageCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                            In Stock Products
                          </CardDescription>
                          <CardTitle className="text-3xl">
                            {products.filter(p => p.inStock).length}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription className="flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                            Contact Messages
                          </CardDescription>
                          <CardTitle className="text-3xl">{contacts.length}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Product Categories</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(category => {
                          const count = products.filter(p => p.category === category).length;
                          const percentage = Math.round((count / products.length) * 100);
                          
                          return (
                            <div key={category} className="bg-card rounded-lg p-4 border">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{category}</h4>
                                <Badge variant="outline">{count} products</Badge>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2.5">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">{percentage}% of total products</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Status</CardTitle>
                    <CardDescription>
                      Monitoring product stock levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Out of Stock */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium flex items-center">
                            <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                            Out of Stock
                          </h3>
                          <Badge variant="destructive">
                            {products.filter(p => !p.inStock).length} products
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {products.filter(p => !p.inStock).slice(0, 3).map(product => (
                            <div key={product.id} className="flex items-center justify-between bg-card p-2 rounded-md border">
                              <div className="flex items-center">
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="w-8 h-8 rounded-md mr-2 object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                                  }}
                                />
                                <span className="text-sm truncate max-w-[150px]">{product.name}</span>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={(e) => toggleProductInStock(product)}
                              >
                                Restock
                              </Button>
                            </div>
                          ))}
                          {products.filter(p => !p.inStock).length > 3 && (
                            <Button variant="link" className="text-xs" asChild>
                              <Link href="/admin/products?stock=out-of-stock">
                                View all out of stock products
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Low Stock */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium flex items-center">
                            <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                            Low Stock (≤5)
                          </h3>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {products.filter(p => 
                              p.inStock && 
                              p.stockQuantity !== null && 
                              p.stockQuantity <= 5
                            ).length} products
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {products.filter(p => 
                            p.inStock && 
                            p.stockQuantity !== null && 
                            p.stockQuantity <= 5
                          ).slice(0, 3).map(product => (
                            <div key={product.id} className="flex items-center justify-between bg-card p-2 rounded-md border">
                              <div className="flex items-center">
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="w-8 h-8 rounded-md mr-2 object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                                  }}
                                />
                                <span className="text-sm truncate max-w-[150px]">
                                  {product.name}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({product.stockQuantity} left)
                                  </span>
                                </span>
                              </div>
                              <Link href={`/admin/products/${product.id}`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8"
                                >
                                  Update
                                </Button>
                              </Link>
                            </div>
                          ))}
                          {products.filter(p => 
                            p.inStock && 
                            p.stockQuantity !== null && 
                            p.stockQuantity <= 5
                          ).length > 3 && (
                            <Button variant="link" className="text-xs" asChild>
                              <Link href="/admin/products?stock=low-stock">
                                View all low stock products
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Recently Added */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Recent Products</h3>
                        </div>
                        <div className="space-y-2">
                          {[...products]
                            .sort((a, b) => {
                              if (!a.createdAt && !b.createdAt) return 0;
                              if (!a.createdAt) return 1;
                              if (!b.createdAt) return -1;
                              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            })
                            .slice(0, 3)
                            .map(product => (
                              <div key={product.id} className="flex items-center justify-between bg-card p-2 rounded-md border">
                                <div className="flex items-center">
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="w-8 h-8 rounded-md mr-2 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                                    }}
                                  />
                                  <span className="text-sm truncate max-w-[150px]">{product.name}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {product.createdAt ? 
                                    new Date(product.createdAt).toLocaleString('en-US', {
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : ''}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
      
      {/* Product Deletion Dialog */}
      <DeleteProductDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        selectedProduct={selectedProduct}
        onDelete={async (product) => {
          try {
            await deleteProduct(product.id);
            return Promise.resolve();
          } catch (error) {
            return Promise.reject(error);
          }
        }}
      />
    </Layout>
  );
}

// Custom badge variants
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed":
    case "delivered":
      return "success";
    case "shipped":
      return "default";
    case "processing":
      return "outline";
    case "pending":
      return "secondary";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

// Helper to format payment method display
const getPaymentMethodDisplay = (method: string) => {
  switch (method) {
    case "cod":
      return "Cash on Delivery";
    case "razorpay":
      return "Online Payment (Razorpay)";
    case "bank_transfer":
      return "Bank Transfer";
    default:
      return method;
  }
};
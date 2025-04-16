import { useState, useEffect } from "react";
import { useLocation, useParams, useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  ArrowLeft, 
  Check,
  Loader2, 
  Plus, 
  X, 
  FileImage,
  Star, 
  ShoppingCart,
  Info,
  Settings,
  ImageIcon,
  Weight,
  Utensils, 
  Leaf,
  Save,
  CheckCircle2,
  Edit,
  Trash2,
  ThumbsUp
} from "lucide-react";
import { insertProductSchema, type Product } from "@shared/schema";
import { z } from "zod";

// The admin key - in a real app, this would be retrieved securely
// Get admin key from environment variable or use fallback for local development
const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || "admin-secret";

// Extended schema with validation
const productFormSchema = insertProductSchema.extend({
  // Make optional fields required for the form
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  imageUrl: z.string().url("Please enter a valid image URL"),
  // Add validation to existing fields
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid number"),
  // Add slug field with validation
  slug: z.string().optional(),
  // Add weight prices field
  weightPrices: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// For managing weight-specific prices
interface WeightPriceItem {
  weight: string;
  price: string;
  comparePrice?: string;
}

// For review management, we'll use a local type
interface ReviewItem {
  id: string;
  name: string;
  avatar?: string;
  date: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  sessionId?: string; // Add session ID to track who wrote the review
}

export default function ProductForm() {
  const [_, navigate] = useLocation();
  const [__, params] = useRoute<{ id: string }>("/admin/products/:id");
  const isEditMode = params?.id && params.id !== "new";
  const productId = isEditMode ? parseInt(params?.id || "0") : null;
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  
  // Review management state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editReviewIndex, setEditReviewIndex] = useState<number>(-1);

  // State for managing weight-price combinations
  const [weightPrices, setWeightPrices] = useState<WeightPriceItem[]>([]);
  const [weightPricesSaved, setWeightPricesSaved] = useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      price: "",
      comparePrice: "",
      badge: "",
      category: "organic",
      imageUrl: "",
      imageGallery: [],
      inStock: true,
      stockQuantity: 0,
      featured: false,
      nutritionFacts: "",
      cookingInstructions: "",
      rating: "",
      reviewCount: 0,
      weightOptions: [],
      slug: "",
      reviews: "",
      weightPrices: "",
    },
  });

  // Load reviews when form data changes
  useEffect(() => {
    const reviewsStr = form.watch("reviews");
    if (reviewsStr) {
      try {
        setReviews(JSON.parse(reviewsStr));
      } catch (e) {
        console.error("Error parsing reviews:", e);
        setReviews([]);
      }
    } else {
      setReviews([]);
    }
  }, [form.watch("reviews")]);

  // Update form when reviews change
  useEffect(() => {
    form.setValue("reviews", JSON.stringify(reviews));
  }, [reviews, form]);

  useEffect(() => {
    if (isEditMode && productId) {
      fetchProduct(productId);
    }
  }, [isEditMode, productId]);

  const fetchProduct = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error("Failed to fetch product");
      
      const product = await response.json();
      
      // Parse weight prices if available
      if (product.weightPrices) {
        try {
          const pricesObj = JSON.parse(product.weightPrices);
          
          // Get weight options from product
          const weights = product.weightOptions || [];
          
          // Create weight price items with all the required data
          // This ensures we have exactly one entry for each weight option
          const weightPriceItems = weights.map(weight => {
            // Handle the price based on its structure
            let price = product.price;
            let comparePrice = product.comparePrice || "";
            
            if (pricesObj[weight]) {
              // New structure with price and comparePrice as objects
              if (typeof pricesObj[weight] === 'object' && pricesObj[weight] !== null) {
                // Check if the price is an object or "[object Object]" string (corrupted data)
                if (typeof pricesObj[weight].price === 'object' || 
                    (typeof pricesObj[weight].price === 'string' && pricesObj[weight].price.includes('[object Object]'))) {
                  price = product.price; // Fallback to default product price
                  console.log(`Found corrupted price data for ${weight}, using default price ${price}`);
                } else {
                  price = pricesObj[weight].price || product.price;
                }
                  
                comparePrice = pricesObj[weight].comparePrice || product.comparePrice || "";
                
                console.log(`Parsed weight ${weight} with object structure, price: ${price}, comparePrice: ${comparePrice}`);
              } 
              // Old structure (direct price value)
              else {
                price = String(pricesObj[weight]);
                console.log(`Parsed weight ${weight} with simple structure, price: ${price}`);
              }
            }
            
            return {
              weight,
              price,
              comparePrice
            };
          });
          
          setWeightPrices(weightPriceItems);
          console.log("Loaded weight prices:", weightPriceItems);
        } catch (e) {
          console.error("Error parsing weight prices:", e);
          setWeightPrices([]);
        }
      } else {
        // Create default weight prices based on weight options if they exist
        if (product.weightOptions && product.weightOptions.length > 0) {
          const defaultPrices = product.weightOptions.map(weight => ({
            weight,
            price: product.price,
            comparePrice: product.comparePrice || ""
          }));
          setWeightPrices(defaultPrices);
        } else {
          setWeightPrices([]);
        }
      }
      
      // Map API data to form values
      form.reset({
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription || "",
        price: product.price,
        comparePrice: product.comparePrice || "",
        badge: product.badge || "",
        category: product.category,
        imageUrl: product.imageUrl,
        imageGallery: product.imageGallery || [],
        inStock: product.inStock === true,
        stockQuantity: product.stockQuantity || 0,
        featured: product.featured === true,
        nutritionFacts: product.nutritionFacts || "",
        cookingInstructions: product.cookingInstructions || "",
        rating: product.rating || "",
        reviewCount: product.reviewCount || 0,
        weightOptions: product.weightOptions || [],
        slug: product.slug || "",
        reviews: product.reviews || "[]",
        weightPrices: product.weightPrices || "",
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = () => {
    const newReview: ReviewItem = {
      id: Date.now().toString(),
      name: "",
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      rating: 5,
      comment: "",
      helpfulCount: 0
    };
    setEditingReview(newReview);
    setEditReviewIndex(-1);
  };
  
  const handleEditReview = (review: ReviewItem, index: number) => {
    setEditingReview({ ...review });
    setEditReviewIndex(index);
  };
  
  const handleDeleteReview = (index: number) => {
    const updatedReviews = [...reviews];
    updatedReviews.splice(index, 1);
    setReviews(updatedReviews);
  };
  
  const handleSaveReview = () => {
    if (!editingReview) return;
    
    const updatedReviews = [...reviews];
    if (editReviewIndex >= 0) {
      // Update existing review
      updatedReviews[editReviewIndex] = editingReview;
    } else {
      // Add new review
      updatedReviews.push(editingReview);
    }
    
    setReviews(updatedReviews);
    setEditingReview(null);
    setEditReviewIndex(-1);
  };
  
  const handleCancelEdit = () => {
    setEditingReview(null);
    setEditReviewIndex(-1);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitting(true);
    try {
      // Ensure imageGallery is an array with at least the main image
      if (!data.imageGallery || !data.imageGallery.length) {
        data.imageGallery = [data.imageUrl];
      }
      
      // Generate slug from product name if not editing an existing product
      if (!isEditMode) {
        // Generate a slug from the product name (convert to lowercase, replace spaces with hyphens)
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        data = { ...data, slug };
      }
      
      // Calculate the actual review count based on the reviews array
      let actualReviewCount = 0;
      if (data.reviews) {
        try {
          const reviewsArray = JSON.parse(data.reviews);
          if (Array.isArray(reviewsArray)) {
            actualReviewCount = reviewsArray.length;
          }
        } catch (e) {
          console.error("Error parsing reviews:", e);
        }
      }
      
      // Update the reviewCount to match the actual number of reviews
      data = { ...data, reviewCount: actualReviewCount };
      
      // Always synchronize weight prices with the current form data
      // This ensures removed weights are properly removed from pricing
      if (data.weightOptions && data.weightOptions.length > 0) {
        // Create weight prices object based on current weight options only
        console.log("Synchronizing weight prices with current weight options");
        const pricesObj: Record<string, {price: string, comparePrice?: string}> = {};
        
        data.weightOptions.forEach(option => {
          // Find price for this weight option if it exists in our state
          const weightPrice = weightPrices.find(wp => wp.weight === option);
          if (weightPrice && weightPrice.price) {
            pricesObj[option] = {
              price: weightPrice.price,
              comparePrice: weightPrice.comparePrice
            };
          } else {
            // Use default price if no specific price set
            pricesObj[option] = {
              price: data.price || "0",
              comparePrice: data.comparePrice
            };
          }
        });
        
        // Update form data with synchronized weight prices
        data = { ...data, weightPrices: JSON.stringify(pricesObj) };
        console.log("Updated weight prices for submission:", pricesObj);
      } else {
        // If no weight options, set empty weight prices
        data = { ...data, weightPrices: "{}" };
      }

      const url = isEditMode
        ? `/api/admin/products/${productId}`
        : "/api/admin/products";
      
      const method = isEditMode ? "PUT" : "POST";
      
      console.log("Submitting product data:", data);
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      console.log("Response:", response.status, responseData);
      
      if (!response.ok) {
        let errorMessage = `Failed to ${isEditMode ? "update" : "create"} product`;
        if (responseData && responseData.error) {
          errorMessage += `: ${responseData.error}`;
        } else if (responseData && responseData.message) {
          errorMessage += `: ${responseData.message}`;
        }
        throw new Error(errorMessage);
      }
      
      const savedProduct = responseData;
      
      toast({
        title: "Success",
        description: `Product ${isEditMode ? "updated" : "created"} successfully!`,
      });
      
      // Navigate back to dashboard
      navigate("/admin");
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} product:`, error);
      let errorMessage = `Failed to ${isEditMode ? "update" : "create"} product.`;
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </Layout>
    );
  }

  const categories = [
    { value: "organic", label: "Organic" },
    { value: "mixed", label: "Mixed" },
    { value: "specialty", label: "Specialty" },
    { value: "flour", label: "Flour" },
    { value: "other", label: "Other" },
  ];

  return (
    <Layout>
      <motion.div 
        className="container mx-auto py-8 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <Button variant="ghost" className="mb-4" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-green-800">
            {isEditMode ? "Edit Product" : "Add New Product"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Product Details" : "Enter Product Details"}</CardTitle>
            <CardDescription>
              Fill out the form below to {isEditMode ? "update the" : "create a new"} product.
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information Section */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter product name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug (URL-friendly name)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="product-slug" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave blank to auto-generate from name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹) *</FormLabel>
                            <FormControl>
                              <Input placeholder="199.99" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="comparePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compare-at Price (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="249.99" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Original price for showing discounts
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="badge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Badge</FormLabel>
                            <FormControl>
                              <Input placeholder="New / Sale / Organic" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Special tag to highlight this product
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-4">
                        <FormField
                          control={form.control}
                          name="inStock"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                In Stock
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="featured"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Featured
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Description Section */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Description & Images</h2>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="shortDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Short Description *</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief summary of the product" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detailed description of the product" 
                                className="min-h-32" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Main Image URL *</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="imageGallery"
                        render={({ field }) => {
                          const [newImageUrl, setNewImageUrl] = useState("");
                          
                          const addImageUrl = () => {
                            if (newImageUrl.trim() !== "") {
                              const updatedGallery = [...(field.value || []), newImageUrl.trim()];
                              field.onChange(updatedGallery);
                              setNewImageUrl("");
                            }
                          };
                          
                          const removeImage = (index: number) => {
                            const updatedGallery = [...(field.value || [])];
                            updatedGallery.splice(index, 1);
                            field.onChange(updatedGallery);
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Image Gallery</FormLabel>
                              <div className="space-y-4">
                                <div className="flex space-x-2">
                                  <Input
                                    placeholder="Enter image URL"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button 
                                    type="button"
                                    onClick={addImageUrl}
                                    variant="outline"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Image
                                  </Button>
                                </div>
                                
                                {(field.value || []).length > 0 ? (
                                  <div className="space-y-2 p-4 border rounded-md">
                                    {(field.value || []).map((url, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                          <ImageIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                          <span className="text-sm truncate">{url}</span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeImage(index)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center p-4 border border-dashed rounded-md">
                                    <p className="text-sm text-gray-500">No gallery images added yet</p>
                                  </div>
                                )}
                              </div>
                              <FormDescription>
                                Add multiple images to display in the product gallery
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      
                      <FormField
                        control={form.control}
                        name="stockQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="100"
                                {...field}
                                onChange={e => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : value);
                                }}
                                value={field.value || 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Additional Information Section */}
                  <div className="md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nutritionFacts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nutrition Facts</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Serving Size: 100g&#10;Calories: 340&#10;Protein: 12g&#10;Fat: 3g&#10;Carbohydrates: 70g" 
                                className="min-h-24" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cookingInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cooking Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Instructions for preparing this product" 
                                className="min-h-24" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Reviews Section */}
                  <div className="md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium text-gray-800">Manage Reviews</h3>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleAddReview}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Review
                          </Button>
                        </div>
                        
                        {reviews.length > 0 ? (
                          <div className="space-y-3">
                            {reviews.map((review, index) => (
                              <div key={review.id} className="flex items-start justify-between p-3 bg-white rounded-md border">
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <span className="font-medium text-gray-800 mr-2">{review.name}</span>
                                    <span className="text-sm text-gray-500">{review.date}</span>
                                  </div>
                                  <div className="flex items-center mb-2">
                                    {[...Array(5)].map((_, i) => (
                                      <Star 
                                        key={i} 
                                        className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                                      />
                                    ))}
                                    <span className="ml-2 text-sm text-gray-500">({review.rating}/5)</span>
                                  </div>
                                  <p className="text-gray-600 text-sm">{review.comment}</p>
                                  <div className="mt-1 text-xs text-gray-500">
                                    <ThumbsUp className="h-3 w-3 inline mr-1" /> {review.helpfulCount} people found this helpful
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditReview(review, index)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteReview(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No reviews yet. Add some reviews to show on the product page.
                          </div>
                        )}
                        
                        {editingReview && (
                          <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
                            <h4 className="font-medium text-blue-800 mb-3">
                              {editReviewIndex >= 0 ? "Edit Review" : "Add New Review"}
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="reviewName">Name</Label>
                                <Input 
                                  id="reviewName"
                                  value={editingReview.name}
                                  onChange={(e) => setEditingReview({...editingReview, name: e.target.value})}
                                  placeholder="Customer name"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="reviewRating">Rating</Label>
                                <div className="flex items-center mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setEditingReview({...editingReview, rating: i + 1})}
                                      className="focus:outline-none"
                                    >
                                      <Star 
                                        className={`h-6 w-6 ${i < editingReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                                      />
                                    </button>
                                  ))}
                                  <span className="ml-2 text-sm text-gray-600">
                                    ({editingReview.rating}/5)
                                  </span>
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="reviewComment">Review</Label>
                                <Textarea 
                                  id="reviewComment"
                                  value={editingReview.comment}
                                  onChange={(e) => setEditingReview({...editingReview, comment: e.target.value})}
                                  placeholder="Write a review comment"
                                  className="mt-1"
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end space-x-2 pt-2">
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="button"
                                  onClick={handleSaveReview}
                                >
                                  Save Review
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Weight Prices Section */}
                  <div className="md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Weight-Specific Pricing</h2>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <Label htmlFor="weightOption">Weight Option</Label>
                            <div className="flex mt-1">
                              <Input 
                                id="weightOption" 
                                placeholder="e.g., 250g, 500g, 1kg"
                                className="rounded-r-none"
                                value={form.watch("newWeightOption") || ""}
                                onChange={(e) => form.setValue("newWeightOption", e.target.value)}
                              />
                              <Button 
                                type="button" 
                                className="rounded-l-none"
                                onClick={() => {
                                  const newOption = form.watch("newWeightOption");
                                  if (newOption && newOption.trim()) {
                                    const currentOptions = form.watch("weightOptions") || [];
                                    if (!currentOptions.includes(newOption)) {
                                      form.setValue("weightOptions", [...currentOptions, newOption]);
                                      form.setValue("newWeightOption", "");
                                    } else {
                                      toast({
                                        title: "Weight option already exists",
                                        description: `The weight option "${newOption}" already exists.`,
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Weight Options</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {form.watch("weightOptions")?.map((option: string, index: number) => (
                              <div 
                                key={index}
                                className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-1"
                              >
                                <Weight className="h-4 w-4 mr-2 text-gray-500" />
                                <span>{option}</span>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 ml-1 p-0"
                                  onClick={() => {
                                    const currentOptions = form.watch("weightOptions") || [];
                                    // Get the weight option being removed
                                    const removedOption = currentOptions[index];
                                    
                                    // Remove from form's weightOptions array
                                    form.setValue(
                                      "weightOptions", 
                                      currentOptions.filter((_, i) => i !== index)
                                    );
                                    
                                    // Also remove from the weightPrices state
                                    setWeightPrices(prevPrices => 
                                      prevPrices.filter(wp => wp.weight !== removedOption)
                                    );
                                    
                                    // Reset saved status when changes are made
                                    setWeightPricesSaved(false);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {(!form.watch("weightOptions") || form.watch("weightOptions").length === 0) && (
                              <div className="text-sm text-gray-500 italic">
                                No weight options added yet. Add some above.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Weight prices form */}
                        <div className="mt-6">
                          <Label>Set Prices for Each Weight</Label>
                          {form.watch("weightOptions")?.length > 0 ? (
                            <div className="bg-white p-4 border border-gray-200 rounded-md mt-2">
                              <p className="text-sm text-gray-600 mb-4">
                                Enter the price for each weight option. Leave blank to use the default price.
                              </p>
                              <div className="space-y-3">
                                {form.watch("weightOptions")?.map((option: string, index: number) => {
                                  // Find the price for this weight option if it exists
                                  const weightPrice = weightPrices.find(wp => wp.weight === option);
                                  const defaultComparePrice = form.watch("comparePrice");
                                  
                                  // Use the weight-specific compare price if available, otherwise use the default
                                  const weightComparePrice = weightPrice?.comparePrice || defaultComparePrice;
                                  const hasDiscount = weightComparePrice && weightPrice?.price;
                                  
                                  // Calculate discount percentage if both prices exist
                                  let discountPercentage = 0;
                                  if (hasDiscount && parseFloat(weightComparePrice) > 0 && parseFloat(weightPrice?.price || "0") > 0) {
                                    discountPercentage = Math.round((1 - (parseFloat(weightPrice?.price || "0") / parseFloat(weightComparePrice))) * 100);
                                  }
                                  
                                  return (
                                    <div key={index} className="flex items-center gap-4">
                                      <div className="w-1/4">
                                        <div className="flex items-center">
                                          <Weight className="h-4 w-4 mr-2 text-gray-500" />
                                          <span className="font-medium">{option}</span>
                                        </div>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          {/* Current price input */}
                                          <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                            <Input
                                              placeholder="Price for this weight"
                                              className="pl-8"
                                              value={weightPrice?.price || ""}
                                              onChange={(e) => {
                                                const updatedPrices = [...weightPrices];
                                                const existingIndex = updatedPrices.findIndex(wp => wp.weight === option);
                                                
                                                if (existingIndex >= 0) {
                                                  updatedPrices[existingIndex].price = e.target.value;
                                                } else {
                                                  updatedPrices.push({
                                                    weight: option,
                                                    price: e.target.value
                                                  });
                                                }
                                                
                                                setWeightPrices(updatedPrices);
                                                // Reset saved status when changes are made
                                                setWeightPricesSaved(false);
                                              }}
                                            />
                                          </div>
                                          
                                          {/* Comparison price input */}
                                          <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                            <Input
                                              placeholder="Compare-at price"
                                              className="pl-8"
                                              value={weightPrice?.comparePrice || ""}
                                              onChange={(e) => {
                                                const updatedPrices = [...weightPrices];
                                                const existingIndex = updatedPrices.findIndex(wp => wp.weight === option);
                                                
                                                if (existingIndex >= 0) {
                                                  updatedPrices[existingIndex].comparePrice = e.target.value;
                                                } else {
                                                  updatedPrices.push({
                                                    weight: option,
                                                    price: "",
                                                    comparePrice: e.target.value
                                                  });
                                                }
                                                
                                                setWeightPrices(updatedPrices);
                                                // Reset saved status when changes are made
                                                setWeightPricesSaved(false);
                                              }}
                                            />
                                          </div>
                                          
                                          {/* Discount percentage display */}
                                          {discountPercentage > 0 && (
                                            <div className="flex items-center">
                                              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                                                {discountPercentage}% off
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="p-4 mt-2 border border-green-200 bg-green-50 rounded-md">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-green-700 font-medium mb-2">Save Your Weight Prices</h4>
                                    <p className="text-sm text-green-600 mb-4">
                                      You've set up weight-specific prices. Simply click the 
                                      <span className="font-semibold"> "Save Weight Prices" </span> 
                                      button below to save them directly to the database.
                                    </p>
                                    <p className="text-sm text-green-600 mb-4">
                                      <CheckCircle2 className="inline-block h-4 w-4 mr-1" /> 
                                      No need to click "Update Product" afterward - your changes will be saved immediately!
                                    </p>
                                  </div>
                                  
                                  {weightPricesSaved && (
                                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md flex items-center">
                                      <Check className="h-4 w-4 mr-2" />
                                      <span className="text-sm font-medium">Prices saved to form</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Using a div with onClick instead of a button to avoid form submission issues */}
                                <div className="flex justify-end">
                                  <div
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors 
                                      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none 
                                      disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 
                                      bg-green-700 hover:bg-green-600 text-white cursor-pointer"
                                    onClick={async () => {
                                      // Save weight prices directly to the database via API
                                      if (weightPrices.length > 0 && productId) {
                                        try {
                                          // Convert to object format with both price and comparePrice
                                          const pricesObj: Record<string, {price: string, comparePrice?: string}> = {};
                                          weightPrices.forEach(item => {
                                            // Make sure we never store an object as a string within the price field
                                            const safePrice = typeof item.price === 'object' 
                                              ? form.getValues('price') || '0' // Use default price if price is an object
                                              : String(item.price || '0');
                                              
                                            pricesObj[item.weight] = {
                                              price: safePrice,
                                              comparePrice: item.comparePrice
                                            };
                                            
                                            console.log(`Added weight price for ${item.weight}: price=${safePrice}, comparePrice=${item.comparePrice}`);
                                          });
                                          
                                          // Convert to JSON string for the API
                                          const weightPricesJson = JSON.stringify(pricesObj);
                                          
                                          // Save to form state first (as backup)
                                          form.setValue("weightPrices", weightPricesJson);
                                          
                                          // Set loading state
                                          setSubmitting(true);
                                          
                                          // Save directly to database
                                          const response = await fetch(`/api/admin/products/${productId}/weight-prices`, {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                              "x-admin-key": "admin-secret",
                                            },
                                            body: JSON.stringify({ weightPrices: weightPricesJson }),
                                          });
                                          
                                          if (!response.ok) {
                                            const result = await response.json();
                                            throw new Error(result.message || "Failed to save weight prices");
                                          }
                                          
                                          // Set saved state to true to show visual indicator
                                          setWeightPricesSaved(true);
                                          
                                          // Show success message
                                          toast({
                                            title: "Weight prices saved successfully",
                                            description: "Prices have been saved directly to the database."
                                          });
                                          
                                          console.log("Weight prices saved to database:", pricesObj);
                                        } catch (error) {
                                          console.error("Error saving weight prices:", error);
                                          toast({
                                            title: "Error saving prices",
                                            description: error instanceof Error ? error.message : "Something went wrong while saving prices.",
                                            variant: "destructive"
                                          });
                                        } finally {
                                          setSubmitting(false);
                                        }
                                      }
                                    }}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Weight Prices
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Add weight options above, then click "Update Prices" to set prices for each weight.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button variant="outline" type="button" asChild>
                    <Link href="/admin">Cancel</Link>
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="min-w-[120px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      isEditMode ? "Update Product" : "Create Product"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Contact from "@/pages/Contact";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import AdminDashboard from "@/pages/admin/Dashboard";
import ProductForm from "@/pages/admin/ProductForm";
// Using simplified Admin Login without Google Authenticator
import AdminLogin from "@/pages/admin/AdminLoginNew";
import AuthPage from "@/pages/auth-page";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/hooks/use-auth";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { ProtectedRoute } from "@/lib/protected-route";

function PublicRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/contact" component={Contact} />
        <Route path="/cart" component={Cart} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <AdminAuthProvider>
            <Switch>
              {/* Admin Access through a non-obvious route */}
              <Route path="/millikit-control-panel-secure" component={AdminLogin} />
              
              {/* Protected Admin Routes - now with non-standard paths for additional security */}
              <AdminProtectedRoute path="/management-dashboard">
                <AdminDashboard />
              </AdminProtectedRoute>
              
              <AdminProtectedRoute path="/management-dashboard/products/new">
                <ProductForm />
              </AdminProtectedRoute>
              
              <AdminProtectedRoute path="/management-dashboard/products/:id">
                <ProductForm />
              </AdminProtectedRoute>

              {/* Public Checkout Routes - no protection */}
              <Route path="/checkout" component={Checkout} />
              <Route path="/order-success" component={OrderSuccess} />
              
              {/* Public Routes - must be last to allow other routes to match first */}
              <Route component={PublicRoutes} />
            </Switch>
            <Toaster />
          </AdminAuthProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

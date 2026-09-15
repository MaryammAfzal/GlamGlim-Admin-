"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ExternalLink,
  Edit2,
  Trash2,
  ImagePlus,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";



// Name of the Supabase Storage bucket used for product images.
const PRODUCT_IMAGE_BUCKET = "product-images";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  shortDescription?: string;
  image?: string;
  inventory?: number;
  isPublished?: boolean;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  total: number;
  status: string;
  checkoutMethod: string;
  created_at: string;
  order_items: OrderItem[];
};

const BLANK_PRODUCT = {
  name: "",
  category: "makeup",
  subcategory: "",
  price: 0,
  compareAtPrice: 0,
  shortDescription: "",
  description: "",
  ingredients: "",
  howToUse: "",
  inventory: 10,
  image: "/lipstick_matte.png",
  badge: "",
  isPublished: true,
};

/* =========================================================
   SUBCATEGORY OPTIONS
========================================================= */

const subcategoryOptions = {
  makeup: {
    Face: [
      ["Foundation", "foundation"],
      ["Concealer", "concealer"],
      ["Primer", "primer"],
      ["BB & CC Cream", "bb-cc-cream"],
      ["Powder", "powder"],
      ["Blush", "blush"],
      ["Bronzer", "bronzer"],
      ["Contour", "contour"],
      ["Highlighter", "highlighter"],
      ["Setting Spray", "setting-spray"],
    ],

    Eyes: [
      ["Eyeshadow", "eyeshadow"],
      ["Eyeliner", "eyeliner"],
      ["Mascara", "mascara"],
      ["Eyebrow", "eyebrow"],
      ["False Lashes", "false-lashes"],
      ["Eye Pencil", "eye-pencil"],
    ],

    Lips: [
      ["Lipstick", "lipstick"],
      ["Lip Gloss", "lip-gloss"],
      ["Lip Liner", "lip-liner"],
      ["Lip Tint", "lip-tint"],
      ["Lip Balm", "lip-balm"],
      ["Lip Oil", "lip-oil"],
    ],

    Nails: [
      ["Nail Polish", "nail-polish"],
      ["Nail Tools", "nail-tools"],
    ],

    Tools: [
      ["Makeup Brushes", "brushes"],
      ["Beauty Sponges", "sponges"],
      ["Makeup Bags", "makeup-bags"],
    ],
  },

  skincare: {
    Cleansing: [
      ["Face Wash", "face-wash"],
      ["Cleanser", "cleanser"],
      ["Makeup Remover", "makeup-remover"],
      ["Toner", "toner"],
    ],

    Moisturizing: [
      ["Moisturizers", "moisturizer"],
      ["Face Cream", "face-cream"],
      ["Day Cream", "day-cream"],
      ["Night Cream", "night-cream"],
    ],

    Treatments: [
      ["Serums", "serum"],
      ["Face Oils", "face-oil"],
      ["Eye Care", "eye-care"],
    ],

    Exfoliation: [
      ["Face Scrubs", "face-scrub"],
      ["Lip Scrubs", "lip-scrub"],
      ["Exfoliators", "exfoliator"],
    ],

    Masks: [
      ["Face Masks", "face-mask"],
      ["Sheet Masks", "sheet-mask"],
      ["Eye Masks", "eye-mask"],
    ],

    "Sun Care": [
      ["Sunscreen", "sunscreen"],
      ["SPF Moisturizer", "spf-moisturizer"],
    ],
  },
} as const;

/* =========================================================
   IMAGE UPLOAD
========================================================= */

async function uploadProductImage(file: File): Promise<string | null> {
  const fileExt = file.name.split(".").pop();

  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 40);

  const fileName = `${Date.now()}-${safeName}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Image upload error:", uploadError.message);
    return null;
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/* =========================================================
   ADMIN PORTAL
========================================================= */

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "products" | "orders"
  >("dashboard");
const [authChecking, setAuthChecking] = useState(true);
const [authorized, setAuthorized] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [productForm, setProductForm] = useState({
    ...BLANK_PRODUCT,
  });

  // --- Image upload state (Add modal) ---

  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(
    null
  );
  const [addUploading, setAddUploading] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);

  // --- Image upload state (Edit modal) ---

  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(
    null
  );
  const [editUploading, setEditUploading] = useState(false);

  const editFileInputRef = useRef<HTMLInputElement>(null);

  /* =========================================================
     FETCH PRODUCTS
  ========================================================= */

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products fetch error:", error.message);
      setError(error.message);
    } else if (data) {
      setProducts(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          price: p.price,
          inventory: p.inventory,
          image: p.image,
          isPublished: p.is_published,
          shortDescription: p.short_description,
        }))
      );
    }
  }, []);

  /* =========================================================
     FETCH ORDERS
  ========================================================= */

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders fetch error:", error.message);
      setError(error.message);
    } else if (data) {
      setOrders(
        data.map((o: any) => ({
          id: o.id,
          customerName: o.customer_name,
          phone: o.phone,
          address: o.address,
          city: o.city,
          total: o.total,
          status: o.status,
          checkoutMethod: o.checkout_method,
          created_at: o.created_at,
          order_items: o.order_items || [],
        }))
      );
    }
  }, []);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

useEffect(() => {
  if (!authorized) return;

  setLoading(true);

  Promise.all([fetchProducts(), fetchOrders()]).finally(() =>
    setLoading(false)
  );
}, [authorized, fetchProducts, fetchOrders]);

  /* =========================================================
     IMAGE HANDLERS
  ========================================================= */

  const handleAddImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setAddImageFile(file);
    setAddImagePreview(URL.createObjectURL(file));
  };

  const handleEditImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const resetAddModalState = () => {
    setProductForm({ ...BLANK_PRODUCT });

    setAddImageFile(null);
    setAddImagePreview(null);

    if (addFileInputRef.current) {
      addFileInputRef.current.value = "";
    }
  };

  const resetEditModalState = () => {
    setEditImageFile(null);
    setEditImagePreview(null);

    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  const handleAddProduct = async () => {
    if (!productForm.name.trim()) {
      alert("Please enter a product name.");
      return;
    }

    let imageUrl = productForm.image;

    if (addImageFile) {
      setAddUploading(true);

      const uploadedUrl = await uploadProductImage(addImageFile);

      setAddUploading(false);

      if (!uploadedUrl) {
        alert(
          "Image upload failed. Check that the 'product-images' storage bucket exists and is public."
        );
        return;
      }

      imageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: productForm.name,
          category: productForm.category,
          subcategory: productForm.subcategory,
          price: productForm.price,
          compare_at_price: productForm.compareAtPrice,
          short_description: productForm.shortDescription,
          description: productForm.description,
          ingredients: productForm.ingredients,
          how_to_use: productForm.howToUse,
          inventory: productForm.inventory,
          image: imageUrl,
          badge: productForm.badge,
          is_published: productForm.isPublished,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setProducts((prev) => [
        {
          id: data.id,
          name: data.name,
          category: data.category,
          subcategory: data.subcategory,
          price: data.price,
          inventory: data.inventory,
          image: data.image,
          isPublished: data.is_published,
          shortDescription: data.short_description,
        },
        ...prev,
      ]);

      resetAddModalState();
      setShowAddModal(false);
    } else {
      alert(
        "Error saving product: " +
          (error?.message || "Unknown error. Check Supabase connection.")
      );

      console.error("Add product error:", error);
    }
  };

  /* =========================================================
     UPDATE PRODUCT
  ========================================================= */

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    let imageUrl = selectedProduct.image;

    if (editImageFile) {
      setEditUploading(true);

      const uploadedUrl = await uploadProductImage(editImageFile);

      setEditUploading(false);

      if (!uploadedUrl) {
        alert(
          "Image upload failed. Check that the 'product-images' storage bucket exists and is public."
        );
        return;
      }

      imageUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: selectedProduct.name,
        price: selectedProduct.price,
        inventory: selectedProduct.inventory,
        image: imageUrl,
        subcategory: selectedProduct.subcategory,
      })
      .eq("id", selectedProduct.id);

    if (!error) {
      const updated = {
        ...selectedProduct,
        image: imageUrl,
      };

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id ? updated : p
        )
      );

      resetEditModalState();
      setShowEditModal(false);
    } else {
      alert("Error updating product: " + error.message);
      console.error("Update product error:", error);
    }
  };

  /* =========================================================
     DELETE PRODUCT
  ========================================================= */

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Error deleting product: " + error.message);
      console.error("Delete product error:", error);
    }
  };

  /* =========================================================
     UPDATE ORDER STATUS
  ========================================================= */

  const handleUpdateOrderStatus = async (
    id: string,
    status: string
  ) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status } : o
        )
      );
    }
  };

  /* =========================================================
     METRICS
  ========================================================= */

  const totalRevenue = orders
    .filter((o) =>
      ["Delivered", "Shipped", "Pending"].includes(o.status)
    )
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter(
    (o) => o.status === "Pending"
  ).length;
useEffect(() => {
  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    setAuthorized(true);
    setAuthChecking(false);
  };

  checkAdmin();
}, []);
  /* =========================================================
     RENDER
  ========================================================= */
if (authChecking) {
  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#5B1A1A] font-semibold">
          Checking authorization...
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Please wait
        </p>
      </div>
    </div>
  );
}
if (!authorized) {
  return null;
}
  return (
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col font-sans">

      {/* HEADER */}

      <header className="bg-[#5B1A1A] text-white h-16 flex items-center justify-between px-6 shadow">
        <span className="font-bold text-lg tracking-wide">
          Glam Glim · Admin
        </span>

<div className="flex items-center gap-4">
  <Link
    href="/"
    className="text-sm flex items-center gap-1 opacity-80 hover:opacity-100 transition"
  >
    View Store
    <ExternalLink size={13} />
  </Link>

  <button
    onClick={async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }}
    className="text-sm opacity-80 hover:opacity-100 transition"
  >
    Logout
  </button>
</div>
      </header>

      <div className="flex flex-1">

        {/* SIDEBAR */}

        <aside className="w-52 border-r border-[#E5D9D0] bg-white p-4 space-y-1">
          {(
            [
              {
                id: "dashboard",
                label: "Dashboard",
                icon: LayoutDashboard,
              },
              {
                id: "products",
                label: "Products",
                icon: Package,
              },
              {
                id: "orders",
                label: "Orders",
                icon: ShoppingBag,
              },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === id
                  ? "bg-[#5B1A1A] text-white"
                  : "text-gray-600 hover:bg-[#F5EDE8]"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </aside>

        {/* MAIN CONTENT */}

        <main className="flex-1 p-6 overflow-auto">

          {/* DASHBOARD */}

          {activeTab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">
                Dashboard
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="bg-white rounded-lg border border-[#E5D9D0] p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Total Revenue
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    Rs {totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-[#E5D9D0] p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Total Orders
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    {orders.length}
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-[#E5D9D0] p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Pending Orders
                  </p>

                  <p className="text-2xl font-bold mt-1 text-amber-600">
                    {pendingCount}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* PRODUCTS */}

          {activeTab === "products" && (
            <div>

              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">
                  Products
                </h1>

                <button
                  onClick={() => {
                    resetAddModalState();
                    setShowAddModal(true);
                  }}
                  className="bg-[#5B1A1A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#7A2323] transition"
                >
                  + Add Product
                </button>
              </div>

              {loading ? (
                <p className="text-gray-400 text-sm animate-pulse">
                  Loading products…
                </p>
              ) : products.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No products yet. Add your first product above.
                </p>
              ) : (
                <div className="space-y-2">

                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-[#E5D9D0] rounded-lg px-4 py-3 flex items-center justify-between"
                    >

                      <div className="flex items-center gap-3">

                        <div className="w-12 h-12 rounded-md overflow-hidden bg-[#F5EDE8] border border-[#E5D9D0] shrink-0">

                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImagePlus size={16} />
                            </div>
                          )}

                        </div>

                        <div>
                          <p className="font-semibold">
                            {p.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            Rs {p.price} · {p.category}
                            {p.subcategory
                              ? ` · ${p.subcategory}`
                              : ""}
                          </p>
                        </div>

                      </div>

                      <div className="flex gap-2">

                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            resetEditModalState();
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded hover:bg-gray-100 transition"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteProduct(p.id)
                          }
                          className="p-2 rounded hover:bg-red-50 text-red-500 transition"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>
          )}

          {/* ORDERS */}

          {activeTab === "orders" && (
            <div>

              <h1 className="text-2xl font-bold mb-6">
                Orders
              </h1>

              {loading ? (
                <p className="text-gray-400 text-sm animate-pulse">
                  Loading orders…
                </p>
              ) : orders.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No orders yet.
                </p>
              ) : (
                <div className="space-y-3">

                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white border border-[#E5D9D0] rounded-lg px-4 py-4"
                    >

                      <div className="flex items-center justify-between flex-wrap gap-2">

                        <div>

                          <p className="font-semibold">
                            {o.customerName}
                          </p>

                          <p className="text-sm text-gray-500">
                            {o.phone} · {o.city}
                          </p>

                          <p className="text-sm text-gray-500">
                            Rs {o.total?.toLocaleString()} ·{" "}
                            {o.checkoutMethod}
                          </p>

                        </div>

                        <select
                          value={o.status}
                          onChange={(e) =>
                            handleUpdateOrderStatus(
                              o.id,
                              e.target.value
                            )
                          }
                          className="border border-gray-200 rounded px-3 py-1 text-sm bg-white"
                        >
                          <option>Pending</option>
                          <option>Shipped</option>
                          <option>Delivered</option>
                          <option>Cancelled</option>
                        </select>

                      </div>

                      {(o.order_items || []).length > 0 && (
                        <ul className="mt-3 border-t pt-2 text-xs text-gray-500 space-y-1">

                          {(o.order_items || []).map((item) => (
                            <li key={item.id}>
                              {item.name} × {item.quantity} — Rs{" "}
                              {item.price}
                            </li>
                          ))}

                        </ul>
                      )}

                    </div>
                  ))}

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* =====================================================
          ADD PRODUCT MODAL
      ===================================================== */}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4">
              Add Product
            </h2>

            <div className="space-y-3">

              {/* Image upload */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Product Image
                </label>

                <div
                  onClick={() =>
                    addFileInputRef.current?.click()
                  }
                  className="w-full h-40 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                >

                  {addImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={addImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 text-xs gap-1">
                      <ImagePlus size={22} />
                      <span>
                        Click to upload image
                      </span>
                    </div>
                  )}

                  {addUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2
                        size={20}
                        className="animate-spin text-[#5B1A1A]"
                      />
                    </div>
                  )}

                </div>

                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddImageSelect}
                />
              </div>

              {/* Name */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Name *
                </label>

                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Product name"
                />
              </div>

              {/* Price + Category */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (Rs) *
                  </label>

                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: +e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category *
                  </label>

                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category: e.target.value,
                        subcategory: "",
                      })
                    }
                  >
                    <option value="makeup">
                      Makeup
                    </option>

                    <option value="skincare">
                      Skincare
                    </option>

                    <option value="perfumes">
                      Perfumes
                    </option>

                    <option value="hair_acc">
                      Hair Accessories
                    </option>
                  </select>
                </div>

              </div>

              {/* SUBCATEGORY */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subcategory
                </label>

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={productForm.subcategory}
                  disabled={
                    productForm.category !== "makeup" &&
                    productForm.category !== "skincare"
                  }
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      subcategory: e.target.value,
                    })
                  }
                >

                  <option value="">
                    {productForm.category === "perfumes" ||
                    productForm.category === "hair_acc"
                      ? "No subcategory"
                      : "Select subcategory"}
                  </option>

                  {/* MAKEUP */}

                  {productForm.category === "makeup" &&
                    Object.entries(
                      subcategoryOptions.makeup
                    ).map(([group, items]) => (
                      <optgroup
                        key={group}
                        label={group}
                      >
                        {items.map(
                          ([label, value]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </optgroup>
                    ))}

                  {/* SKINCARE */}

                  {productForm.category === "skincare" &&
                    Object.entries(
                      subcategoryOptions.skincare
                    ).map(([group, items]) => (
                      <optgroup
                        key={group}
                        label={group}
                      >
                        {items.map(
                          ([label, value]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </optgroup>
                    ))}

                </select>
              </div>

              {/* Short Description */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Short Description
                </label>

                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={productForm.shortDescription}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      shortDescription: e.target.value,
                    })
                  }
                  placeholder="One line description"
                />
              </div>

              {/* Inventory */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Inventory
                </label>

                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={productForm.inventory}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      inventory: +e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-5">

              <button
                onClick={() => {
                  resetAddModalState();
                  setShowAddModal(false);
                }}
                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50"
                disabled={addUploading}
              >
                Cancel
              </button>

              <button
                onClick={handleAddProduct}
                disabled={addUploading}
                className="px-4 py-2 text-sm rounded-md bg-[#5B1A1A] text-white hover:bg-[#7A2323] disabled:opacity-60 flex items-center gap-2"
              >

                {addUploading && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {addUploading
                  ? "Uploading…"
                  : "Save Product"}

              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          EDIT PRODUCT MODAL
      ===================================================== */}

      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4">
              Edit Product
            </h2>

            <div className="space-y-3">

              {/* Image upload */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Product Image
                </label>

                <div
                  onClick={() =>
                    editFileInputRef.current?.click()
                  }
                  className="w-full h-40 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                >

                  {editImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : selectedProduct.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 text-xs gap-1">
                      <ImagePlus size={22} />
                      <span>
                        Click to upload image
                      </span>
                    </div>
                  )}

                  {editUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2
                        size={20}
                        className="animate-spin text-[#5B1A1A]"
                      />
                    </div>
                  )}

                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEditImageSelect}
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  Click the image to replace it.
                </p>
              </div>

              {/* Name */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Name
                </label>

                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedProduct.name}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Price + Inventory */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (Rs)
                  </label>

                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={selectedProduct.price}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        price: +e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Inventory
                  </label>

                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={selectedProduct.inventory ?? 0}
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        inventory: +e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              {/* Category */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                  value={selectedProduct.category}
                  disabled
                >
                  <option value="makeup">
                    Makeup
                  </option>

                  <option value="skincare">
                    Skincare
                  </option>

                  <option value="perfumes">
                    Perfumes
                  </option>

                  <option value="hair_acc">
                    Hair Accessories
                  </option>
                </select>
              </div>

              {/* Subcategory */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subcategory
                </label>

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedProduct.subcategory ?? ""}
                  disabled={
                    selectedProduct.category !== "makeup" &&
                    selectedProduct.category !== "skincare"
                  }
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      subcategory: e.target.value,
                    })
                  }
                >

                  <option value="">
                    {selectedProduct.category === "perfumes" ||
                    selectedProduct.category === "hair_acc"
                      ? "No subcategory"
                      : "Select subcategory"}
                  </option>

                  {/* MAKEUP */}

                  {selectedProduct.category === "makeup" &&
                    Object.entries(
                      subcategoryOptions.makeup
                    ).map(([group, items]) => (
                      <optgroup
                        key={group}
                        label={group}
                      >
                        {items.map(
                          ([label, value]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </optgroup>
                    ))}

                  {/* SKINCARE */}

                  {selectedProduct.category === "skincare" &&
                    Object.entries(
                      subcategoryOptions.skincare
                    ).map(([group, items]) => (
                      <optgroup
                        key={group}
                        label={group}
                      >
                        {items.map(
                          ([label, value]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </optgroup>
                    ))}

                </select>
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-5">

              <button
                onClick={() => {
                  resetEditModalState();
                  setShowEditModal(false);
                }}
                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50"
                disabled={editUploading}
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateProduct}
                disabled={editUploading}
                className="px-4 py-2 text-sm rounded-md bg-[#5B1A1A] text-white hover:bg-[#7A2323] disabled:opacity-60 flex items-center gap-2"
              >

                {editUploading && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {editUploading
                  ? "Uploading…"
                  : "Save Changes"}

              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
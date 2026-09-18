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

const PRODUCT_IMAGE_BUCKET = "product-images";

type Product = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  inventory?: number;
  isPublished?: boolean;
};

type VariantGroup = {
  id: string;
  name: string;
  options: string[];
};

type VariantCombination = {
  id?: string;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number;
  inventory: number;
  image?: string;
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
  // ingredients: "",
  // howToUse: "",
  inventory: 10,
  image: "/lipstick_matte.png",
  badge: "",
  isPublished: true,
};

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

  // =========================================================
  // VARIANTS
  // =========================================================

  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<
    VariantCombination[]
  >([]);

  // =========================================================
  // ADD IMAGE
  // =========================================================

  const [addImageFiles, setAddImageFiles] = useState<File[]>([]);
  const [addImagePreviews, setAddImagePreviews] = useState<string[]>([]);
  const [addUploading, setAddUploading] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);

  // =========================================================
  // EDIT IMAGE
  // =========================================================

  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [editUploading, setEditUploading] = useState(false);

  const editFileInputRef = useRef<HTMLInputElement>(null);

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products fetch error:", error.message);
      setError(error.message);
      return;
    }

    if (data) {
      setProducts(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          price: Number(p.price) || 0,
          compareAtPrice: Number(p.compare_at_price) || 0,
          inventory: Number(p.inventory) || 0,
          image: p.image,
          isPublished: p.is_published,
          shortDescription: p.short_description,
              description: p.description,   // ADD THIS

        }))
      );
    }
  }, []);

  // =========================================================
  // FETCH ORDERS
  // =========================================================

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders fetch error:", error.message);
      setError(error.message);
      return;
    }

    if (data) {
      setOrders(
        data.map((o: any) => ({
          id: o.id,
          customerName: o.customer_name,
          phone: o.phone,
          address: o.address,
          city: o.city,
          total: Number(o.total) || 0,
          status: o.status,
          checkoutMethod: o.checkout_method,
          created_at: o.created_at,
          order_items: o.order_items || [],
        }))
      );
    }
  }, []);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    if (!authorized) return;

    setLoading(true);

    Promise.all([fetchProducts(), fetchOrders()]).finally(() =>
      setLoading(false)
    );
  }, [authorized, fetchProducts, fetchOrders]);

  // =========================================================
  // AUTHORIZATION
  // =========================================================

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

  // =========================================================
  // IMAGE HANDLERS
  // =========================================================

    const handleAddImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAddImageFiles((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setAddImagePreviews((prev) => [...prev, ...previews]);
    }
  };


    const handleEditImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEditImageFiles((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setEditImagePreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeAddImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddImageFiles((prev) => prev.filter((_, i) => i !== index));
    setAddImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditImageFiles((prev) => prev.filter((_, i) => i !== index));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingEditImage = (urlToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedProduct && selectedProduct.image) {
      const images = selectedProduct.image.split(',').filter(url => url !== urlToRemove);
      setSelectedProduct({ ...selectedProduct, image: images.join(',') });
    }
  };


  // =========================================================
  // RESET ADD
  // =========================================================

  const resetAddModalState = () => {
    setProductForm({ ...BLANK_PRODUCT });

    setAddImageFiles([]);
    setAddImagePreviews([]);

    setVariantGroups([]);
    setVariantCombinations([]);

    if (addFileInputRef.current) {
      addFileInputRef.current.value = "";
    }
  };

  // =========================================================
  // RESET EDIT IMAGE
  // =========================================================

  const resetEditModalState = () => {
    setEditImageFiles([]);
    setEditImagePreviews([]);

    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  // =========================================================
  // VARIANT GROUPS
  // =========================================================

  const addVariantGroup = () => {
    setVariantGroups((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        options: [""],
      },
    ]);
  };

  const removeVariantGroup = (groupId: string) => {
    setVariantGroups((prev) =>
      prev.filter((group) => group.id !== groupId)
    );

    setVariantCombinations([]);
  };

  const updateVariantGroupName = (
    groupId: string,
    name: string
  ) => {
    setVariantGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, name }
          : group
      )
    );
  };

  const addVariantOption = (groupId: string) => {
    setVariantGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: [...group.options, ""],
            }
          : group
      )
    );
  };

  const removeVariantOption = (
    groupId: string,
    optionIndex: number
  ) => {
    setVariantGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.filter(
                (_, index) => index !== optionIndex
              ),
            }
          : group
      )
    );
  };

  const updateVariantOption = (
    groupId: string,
    optionIndex: number,
    value: string
  ) => {
    setVariantGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option, index) =>
                index === optionIndex ? value : option
              ),
            }
          : group
      )
    );
  };

  // =========================================================
  // VARIANT KEY
  // =========================================================

  const getVariantKey = (
    options: Record<string, string>
  ) => {
    return JSON.stringify(
      Object.keys(options)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = options[key];
            return result;
          },
          {} as Record<string, string>
        )
    );
  };

  // =========================================================
  // GENERATE VARIANTS
  // =========================================================

  const generateVariantCombinations = () => {
    const validGroups = variantGroups
      .map((group) => ({
        ...group,
        name: group.name.trim(),
        options: group.options
          .map((option) => option.trim())
          .filter(Boolean),
      }))
      .filter(
        (group) =>
          group.name.length > 0 &&
          group.options.length > 0
      );

    if (validGroups.length === 0) {
      alert(
        "Please add at least one variant group and option."
      );
      return;
    }

    const names = validGroups.map((group) => group.name);

    if (new Set(names).size !== names.length) {
      alert("Variant group names must be unique.");
      return;
    }

    let combinations: Record<string, string>[] = [{}];

    for (const group of validGroups) {
      const next: Record<string, string>[] = [];

      for (const existing of combinations) {
        for (const option of group.options) {
          next.push({
            ...existing,
            [group.name]: option,
          });
        }
      }

      combinations = next;
    }

    const generated: VariantCombination[] =
      combinations.map((options) => {
        const existing = variantCombinations.find(
          (variant) =>
            getVariantKey(variant.options) ===
            getVariantKey(options)
        );

        if (existing) {
          return existing;
        }

        return {
          options,
          price: Number(productForm.price) || 0,
          compareAtPrice:
            Number(productForm.compareAtPrice) || 0,
          inventory:
            Number(productForm.inventory) || 0,
          image: "",
        };
      });

    setVariantCombinations(generated);
  };

  // =========================================================
  // VARIANT IMAGE UPLOAD
  // =========================================================

  const handleVariantImageUpload = async (
    index: number,
    file: File
  ) => {
    const imageUrl = await uploadProductImage(file);

    if (!imageUrl) {
      alert("Failed to upload variant image.");
      return;
    }

    setVariantCombinations((prev) =>
      prev.map((variant, i) =>
        i === index
          ? {
              ...variant,
              image: imageUrl,
            }
          : variant
      )
    );
  };

  // =========================================================
  // UPDATE VARIANT
  // =========================================================

  const updateVariantCombination = (
    index: number,
    field:
      | "price"
      | "compareAtPrice"
      | "inventory",
    value: number
  ) => {
    setVariantCombinations((prev) =>
      prev.map((variant, i) =>
        i === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      )
    );
  };

  // =========================================================
  // LOAD EDIT PRODUCT + VARIANTS
  // =========================================================

  const handleOpenEditProduct = async (
    product: Product
  ) => {
    setSelectedProduct(product);

    resetEditModalState();

    setVariantGroups([]);
    setVariantCombinations([]);

    setShowEditModal(true);

    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", String(product.id))
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Variant fetch error:", error);
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    const groupsMap = new Map<string, Set<string>>();

    const combinations: VariantCombination[] =
      data.map((variant: any) => {
        const options =
          typeof variant.options === "object" &&
          variant.options !== null
            ? variant.options
            : {};

        Object.entries(options).forEach(
          ([name, value]) => {
            if (!groupsMap.has(name)) {
              groupsMap.set(name, new Set());
            }

            groupsMap
              .get(name)!
              .add(String(value));
          }
        );

        return {
          id: variant.id,
          options,
          price: Number(variant.price) || 0,
          compareAtPrice:
            Number(variant.compare_at_price) || 0,
          inventory:
            Number(variant.inventory) || 0,
          image: variant.image || "",
        };
      });

    const groups: VariantGroup[] = Array.from(
      groupsMap.entries()
    ).map(([name, options]) => ({
      id: crypto.randomUUID(),
      name,
      options: Array.from(options),
    }));

    setVariantGroups(groups);
    setVariantCombinations(combinations);
  };

 // =========================================================
// ADD PRODUCT
// =========================================================

const handleAddProduct = async () => {
  if (!productForm.name.trim()) {
    alert("Please enter a product name.");
    return;
  }

  if (
    productForm.compareAtPrice > 0 &&
    productForm.price > productForm.compareAtPrice
  ) {
    alert(
      "Price After Discount cannot be greater than Actual Price."
    );
    return;
  }

  // IMPORTANT:
  // Capture variants before any async image uploads
  const variantsToSave = [...variantCombinations];
  console.log("========== ADD PRODUCT DEBUG ==========");
console.log("Variant combinations:", variantCombinations);
console.log("Variants to save:", variantsToSave);
console.log("Number of variants:", variantsToSave.length);
console.log("Add image files:", addImageFiles);
console.log("========================================");

  let imageUrl = productForm.image || "";

  // =====================================================
  // UPLOAD PRODUCT IMAGES
  // =====================================================

  if (addImageFiles.length > 0) {
    setAddUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of addImageFiles) {
      const uploadedUrl = await uploadProductImage(file);

      if (uploadedUrl) {
        uploadedUrls.push(uploadedUrl);
      }
    }

    setAddUploading(false);

    if (uploadedUrls.length === 0) {
      alert("Image uploads failed.");
      return;
    }

    // Store multiple images as comma-separated URLs
    imageUrl = uploadedUrls.join(",");
  }

  // =====================================================
  // SAVE MAIN PRODUCT
  // =====================================================

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
        // ingredients: productForm.ingredients,
        // how_to_use: productForm.howToUse,
        inventory: productForm.inventory,
        image: imageUrl,
        badge: productForm.badge,
        is_published: productForm.isPublished,
      },
    ])
    .select()
    .single();
if (error || !data) {
  console.error("Add product error:", {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });

  alert(
    "Error saving product: " +
      (error?.message || error?.details || error?.hint || "Unknown error. Check Supabase connection.")
  );
  return;
}
  // =====================================================
  // SAVE VARIANTS
  // =====================================================

  if (variantsToSave.length > 0) {
    const variantRows = variantsToSave.map((variant) => ({
      product_id: String(data.id),
      options: variant.options,
      price: variant.price,
      compare_at_price: variant.compareAtPrice,
      inventory: variant.inventory,
      image: variant.image || null,
    }));

    console.log("VARIANTS BEING SAVED:", variantRows);

    const { error: variantError } = await supabase
      .from("product_variants")
      .insert(variantRows);

    if (variantError) {
      console.error(
        "Variant save error:",
        variantError
      );
      

      // Roll back product if variants fail
      await supabase
        .from("products")
        .delete()
        .eq("id", data.id);

      alert(
        "Product was not saved because variants could not be saved: " +
          variantError.message
      );

      return;
    }
  }

  // =====================================================
  // UPDATE LOCAL PRODUCT LIST
  // =====================================================

  setProducts((prev) => [
    {
      id: data.id,
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      price: Number(data.price) || 0,
      compareAtPrice:
        Number(data.compare_at_price) || 0,
      inventory: Number(data.inventory) || 0,
      image: data.image,
      isPublished: data.is_published,
      shortDescription:
        data.short_description,
    },
    ...prev,
  ]);

  resetAddModalState();
  setShowAddModal(false);
};
  // =========================================================
  // UPDATE PRODUCT
  // =========================================================

 // =========================================================
// UPDATE PRODUCT
// =========================================================

const handleUpdateProduct = async () => {
  if (!selectedProduct) return;

  if (
    selectedProduct.compareAtPrice &&
    selectedProduct.compareAtPrice > 0 &&
    selectedProduct.price >
      selectedProduct.compareAtPrice
  ) {
    alert(
      "Price After Discount cannot be greater than Actual Price."
    );
    return;
  }

  // IMPORTANT:
  // Capture variants before any async image uploads
  const variantsToSave = [...variantCombinations];

  let imageUrl = selectedProduct.image || "";

  // =====================================================
  // UPLOAD NEW PRODUCT IMAGES
  // =====================================================

  if (editImageFiles.length > 0) {
    setEditUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of editImageFiles) {
      const uploadedUrl = await uploadProductImage(file);

      if (uploadedUrl) {
        uploadedUrls.push(uploadedUrl);
      }
    }

    setEditUploading(false);

    if (uploadedUrls.length === 0) {
      alert("Image uploads failed.");
      return;
    }

    // Keep existing images + add new images
    const existingUrls = imageUrl
      ? imageUrl.split(",").filter(Boolean)
      : [];

    imageUrl = [
      ...existingUrls,
      ...uploadedUrls,
    ].join(",");
  }

  // =====================================================
  // UPDATE MAIN PRODUCT
  // =====================================================

  const { error } = await supabase
    .from("products")
    .update({
      name: selectedProduct.name,
      price: selectedProduct.price,
      compare_at_price:
        selectedProduct.compareAtPrice ?? 0,
      inventory:
        selectedProduct.inventory ?? 0,
      image: imageUrl,
      subcategory:
        selectedProduct.subcategory,
            description: selectedProduct.description ?? "",   // ADD THIS

    })
    .eq("id", selectedProduct.id);

  if (error) {
    alert(
      "Error updating product: " +
        error.message
    );

    console.error(
      "Update product error:",
      error
    );

    return;
  }

  // =====================================================
  // DELETE OLD VARIANTS
  // =====================================================

  const {
    error: deleteVariantError,
  } = await supabase
    .from("product_variants")
    .delete()
    .eq(
      "product_id",
      String(selectedProduct.id)
    );

  if (deleteVariantError) {
    alert(
      "Product updated, but old variants could not be removed: " +
        deleteVariantError.message
    );

    console.error(
      "Delete variants error:",
      deleteVariantError
    );

    return;
  }

  // =====================================================
  // INSERT UPDATED VARIANTS
  // =====================================================

  if (variantsToSave.length > 0) {
    const variantRows = variantsToSave.map(
      (variant) => ({
        product_id: String(
          selectedProduct.id
        ),
        options: variant.options,
        price: variant.price,
        compare_at_price:
          variant.compareAtPrice,
        inventory: variant.inventory,
        image: variant.image || null,
      })
    );

    console.log(
      "VARIANTS BEING SAVED:",
      variantRows
    );

    const {
      error: variantError,
    } = await supabase
      .from("product_variants")
      .insert(variantRows);

    if (variantError) {
      alert(
        "Product updated, but variants could not be saved: " +
          variantError.message
      );

      console.error(
        "Variant update error:",
        variantError
      );

      return;
    }
  }

  // =====================================================
  // UPDATE LOCAL STATE
  // =====================================================

  const updated: Product = {
    ...selectedProduct,
    price: selectedProduct.price,
    compareAtPrice:
      selectedProduct.compareAtPrice ?? 0,
    inventory:
      selectedProduct.inventory ?? 0,
    image: imageUrl,
      description: selectedProduct.description ?? "",   

  };

  setProducts((prev) =>
    prev.map((p) =>
      p.id === selectedProduct.id
        ? updated
        : p
    )
  );

  resetEditModalState();

  setVariantGroups([]);
  setVariantCombinations([]);

  setShowEditModal(false);
};
  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const handleDeleteProduct = async (
    id: string
  ) => {
    if (!confirm("Delete this product?")) {
      return;
    }

    // Delete variants first
    const {
      error: variantDeleteError,
    } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", String(id));

    if (variantDeleteError) {
      alert(
        "Could not delete product variants: " +
          variantDeleteError.message
      );

      console.error(
        "Delete variants error:",
        variantDeleteError
      );

      return;
    }

    // Delete main product
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (!error) {
      setProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );
    } else {
      alert(
        "Error deleting product: " +
          error.message
      );

      console.error(
        "Delete product error:",
        error
      );
    }
  };

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

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
          o.id === id
            ? { ...o, status }
            : o
        )
      );
    }
  };

  // =========================================================
  // METRICS
  // =========================================================

  const totalRevenue = orders
    .filter((o) =>
      [
        "Delivered",
        "Shipped",
        "Pending",
      ].includes(o.status)
    )
    .reduce(
      (sum, o) => sum + o.total,
      0
    );

  const pendingCount = orders.filter(
    (o) => o.status === "Pending"
  ).length;

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // VARIANT SECTION
  // =========================================================

  const variantSection = (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Product Variants
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Add dynamic options such as Shade, Size,
            Color, Scent, Finish, etc.
          </p>
        </div>

        <button
          type="button"
          onClick={addVariantGroup}
          className="px-4 py-2 border border-[#5B1A1A] text-[#5B1A1A] rounded-lg text-sm font-medium hover:bg-[#5B1A1A] hover:text-white"
        >
          + Add Variant Group
        </button>
      </div>

      {variantGroups.map((group) => (
        <div
          key={group.id}
          className="border rounded-xl p-4 mb-4"
        >
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={group.name}
              onChange={(e) =>
                updateVariantGroupName(
                  group.id,
                  e.target.value
                )
              }
              placeholder="Variant name e.g. Shade"
              className="flex-1 border rounded-lg px-3 py-2 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                removeVariantGroup(group.id)
              }
              className="px-3 text-red-500"
            >
              Remove
            </button>
          </div>

          <div className="space-y-2">
            {group.options.map(
              (option, optionIndex) => (
                <div
                  key={optionIndex}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={option}
                    onChange={(e) =>
                      updateVariantOption(
                        group.id,
                        optionIndex,
                        e.target.value
                      )
                    }
                    placeholder="Option e.g. Red"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeVariantOption(
                        group.id,
                        optionIndex
                      )
                    }
                    className="px-3 text-red-500"
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              addVariantOption(group.id)
            }
            className="mt-3 text-sm text-[#5B1A1A] font-medium"
          >
            + Add Option
          </button>
        </div>
      ))}

      {variantGroups.length > 0 && (
        <button
          type="button"
          onClick={generateVariantCombinations}
          className="w-full py-3 border border-[#5B1A1A] text-[#5B1A1A] rounded-lg font-medium hover:bg-[#5B1A1A] hover:text-white"
        >
          Generate Variant Combinations
        </button>
      )}

      {variantCombinations.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-4">
            Variant Combinations
          </h4>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">
                    Variant
                  </th>

                  <th className="text-left p-3">
                    Image
                  </th>

                  <th className="text-left p-3">
                    Actual Price
                  </th>

                  <th className="text-left p-3">
                    Price After Discount
                  </th>

                  <th className="text-left p-3">
                    Inventory
                  </th>
                </tr>
              </thead>

              <tbody>
                {variantCombinations.map(
                  (variant, index) => (
                    <tr
                      key={
                        variant.id ??
                        `${getVariantKey(
                          variant.options
                        )}-${index}`
                      }
                      className="border-b last:border-b-0"
                    >
                      <td className="p-3 font-medium whitespace-nowrap">
                        {Object.entries(
                          variant.options
                        )
                          .map(
                            ([key, value]) =>
                              `${key}: ${value}`
                          )
                          .join(" / ")}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {variant.image ? (
                            <img
                              src={variant.image}
                              alt="Variant"
                              className="w-12 h-12 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg border flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}

                          <label className="cursor-pointer px-3 py-2 border rounded-lg text-xs">
                            Upload

                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file =
                                  e.target.files?.[0];

                                if (file) {
                                  handleVariantImageUpload(
                                    index,
                                    file
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={
                            variant.compareAtPrice
                          }
                          onChange={(e) =>
                            updateVariantCombination(
                              index,
                              "compareAtPrice",
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-32 border rounded-lg px-3 py-2"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariantCombination(
                              index,
                              "price",
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-32 border rounded-lg px-3 py-2"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={variant.inventory}
                          onChange={(e) =>
                            updateVariantCombination(
                              index,
                              "inventory",
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-24 border rounded-lg px-3 py-2"
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================
  // RENDER
  // =========================================================

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
              window.location.href =
                "/login";
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
          ).map(
            ({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() =>
                  setActiveTab(id)
                }
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-[#5B1A1A] text-white"
                    : "text-gray-600 hover:bg-[#F5EDE8]"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          )}
        </aside>

        {/* MAIN */}

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
                    Rs{" "}
                    {totalRevenue.toLocaleString()}
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
                  No products yet. Add your first
                  product above.
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
                            <img
                              src={p.image.split(',')[0]}
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
                            Rs{" "}
                            {p.price.toLocaleString()}

                            {p.compareAtPrice &&
                            p.compareAtPrice >
                              p.price ? (
                              <>
                                {" "}
                                <span className="line-through text-gray-400">
                                  Rs{" "}
                                  {p.compareAtPrice.toLocaleString()}
                                </span>
                              </>
                            ) : null}

                            {" · "}
                            {p.category}

                            {p.subcategory
                              ? ` · ${p.subcategory}`
                              : ""}
                          </p>
                        </div>

                      </div>

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            handleOpenEditProduct(
                              p
                            )
                          }
                          className="p-2 rounded hover:bg-gray-100 transition"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteProduct(
                              p.id
                            )
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
                            {o.phone} ·{" "}
                            {o.city}
                          </p>

                          <p className="text-sm text-gray-500">
                            Rs{" "}
                            {o.total?.toLocaleString()}{" "}
                            · {o.checkoutMethod}
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
                          <option>
                            Pending
                          </option>
                          <option>
                            Shipped
                          </option>
                          <option>
                            Delivered
                          </option>
                          <option>
                            Cancelled
                          </option>
                        </select>

                      </div>

                      {(o.order_items || [])
                        .length > 0 && (
                        <ul className="mt-3 border-t pt-2 text-xs text-gray-500 space-y-1">

                          {(o.order_items || []).map(
                            (item) => (
                              <li key={item.id}>
                                {item.name} ×{" "}
                                {item.quantity} — Rs{" "}
                                {item.price}
                              </li>
                            )
                          )}

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

          <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4">
              Add Product
            </h2>

            <div className="space-y-3">

              {/* PRODUCT IMAGE */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Product Image
                </label>

                <div className="flex flex-wrap gap-2 mb-2">
                    {addImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-24 h-24 border rounded-md overflow-hidden">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={(e) => removeAddImage(idx, e)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                      </div>
                    ))}
                  </div>
                  <div
                  onClick={() =>
                    addFileInputRef.current?.click()
                  }
                  className="w-full h-24 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                >
                  <div className="flex flex-col items-center text-gray-400 text-xs gap-1">
                    <ImagePlus size={22} />
                    <span>
                      Click to upload images
                    </span>
                  </div>

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
                  multiple
                  className="hidden"
                  onChange={
                    handleAddImageSelect
                  }
                />
              </div>

              {/* NAME */}

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

              {/* PRICE */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Actual Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      productForm.compareAtPrice
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        compareAtPrice:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price After Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: Number(
                          e.target.value
                        ),
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

              </div>

              {/* CATEGORY */}

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
                      category:
                        e.target.value,
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

              {/* SUBCATEGORY */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subcategory
                </label>

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={
                    productForm.subcategory
                  }
                  disabled={
                    productForm.category !==
                      "makeup" &&
                    productForm.category !==
                      "skincare"
                  }
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      subcategory:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    {productForm.category ===
                      "perfumes" ||
                    productForm.category ===
                      "hair_acc"
                      ? "No subcategory"
                      : "Select subcategory"}
                  </option>

                  {productForm.category ===
                    "makeup" &&
                    Object.entries(
                      subcategoryOptions.makeup
                    ).map(
                      ([group, items]) => (
                        <optgroup
                          key={group}
                          label={group}
                        >
                          {items.map(
                            ([
                              label,
                              value,
                            ]) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {label}
                              </option>
                            )
                          )}
                        </optgroup>
                      )
                    )}

                  {productForm.category ===
                    "skincare" &&
                    Object.entries(
                      subcategoryOptions.skincare
                    ).map(
                      ([group, items]) => (
                        <optgroup
                          key={group}
                          label={group}
                        >
                          {items.map(
                            ([
                              label,
                              value,
                            ]) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {label}
                              </option>
                            )
                          )}
                        </optgroup>
                      )
                    )}
                </select>
              </div>

              {/* SHORT DESCRIPTION */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Short Description
                </label>

                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={
                    productForm.shortDescription
                  }
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      shortDescription:
                        e.target.value,
                    })
                  }
                  placeholder="One line description"
                />
              </div>

              {/* INVENTORY */}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Inventory
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={
                    productForm.inventory
                  }
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      inventory: Number(
                        e.target.value
                      ),
                    })
                  }
                />
              </div>

              {/* VARIANTS */}

              {variantSection}

            </div>

            {/* BUTTONS */}

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

      {showEditModal &&
        selectedProduct && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">

            <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">

              <h2 className="text-xl font-bold mb-4">
                Edit Product
              </h2>

              <div className="space-y-3">

                {/* IMAGE */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product Image
                  </label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedProduct.image && selectedProduct.image.split(',').filter(Boolean).map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative w-24 h-24 border rounded-md overflow-hidden">
                        <img src={url} alt="Existing" className="w-full h-full object-cover" />
                        <button type="button" onClick={(e) => removeExistingEditImage(url, e)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                      </div>
                    ))}
                    {editImagePreviews.map((preview, idx) => (
                      <div key={`new-${idx}`} className="relative w-24 h-24 border rounded-md overflow-hidden">
                        <img src={preview} alt="New Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={(e) => removeEditImage(idx, e)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                      </div>
                    ))}
                  </div>

                  <div
                    onClick={() =>
                      editFileInputRef.current?.click()
                    }
                    className="w-full h-24 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                  >
                    <div className="flex flex-col items-center text-gray-400 text-xs gap-1">
                      <ImagePlus size={22} />
                      <span>
                        Click to add more images
                      </span>
                    </div>

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
                    multiple
                    className="hidden"
                    onChange={
                      handleEditImageSelect
                    }
                  />
                </div>

                {/* NAME */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name
                  </label>

                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={
                      selectedProduct.name
                    }
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                {/* DESCRIPTION */}

<div>
  <label className="block text-sm font-medium mb-1">
    Description
  </label>

  <textarea
    className="w-full border rounded-md px-3 py-2 text-sm min-h-[120px]"
    value={selectedProduct.description ?? ""}
    onChange={(e) =>
      setSelectedProduct({
        ...selectedProduct,
        description: e.target.value,
      })
    }
    placeholder="Full product description"
  />
</div>

                {/* PRICE */}

                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Actual Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        selectedProduct.compareAtPrice ??
                        0
                      }
                      onChange={(e) =>
                        setSelectedProduct({
                          ...selectedProduct,
                          compareAtPrice:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Price After Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        selectedProduct.price
                      }
                      onChange={(e) =>
                        setSelectedProduct({
                          ...selectedProduct,
                          price: Number(
                            e.target.value
                          ),
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                </div>

                {/* INVENTORY */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Inventory
                  </label>

                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={
                      selectedProduct.inventory ??
                      0
                    }
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        inventory: Number(
                          e.target.value
                        ),
                      })
                    }
                  />
                </div>

                {/* CATEGORY */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>

                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                    value={
                      selectedProduct.category
                    }
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

                {/* SUBCATEGORY */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subcategory
                  </label>

                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={
                      selectedProduct.subcategory ??
                      ""
                    }
                    disabled={
                      selectedProduct.category !==
                        "makeup" &&
                      selectedProduct.category !==
                        "skincare"
                    }
                    onChange={(e) =>
                      setSelectedProduct({
                        ...selectedProduct,
                        subcategory:
                          e.target.value,
                      })
                    }
                  >
                    <option value="">
                      {selectedProduct.category ===
                        "perfumes" ||
                      selectedProduct.category ===
                        "hair_acc"
                        ? "No subcategory"
                        : "Select subcategory"}
                    </option>

                    {selectedProduct.category ===
                      "makeup" &&
                      Object.entries(
                        subcategoryOptions.makeup
                      ).map(
                        ([group, items]) => (
                          <optgroup
                            key={group}
                            label={group}
                          >
                            {items.map(
                              ([
                                label,
                                value,
                              ]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </optgroup>
                        )
                      )}

                    {selectedProduct.category ===
                      "skincare" &&
                      Object.entries(
                        subcategoryOptions.skincare
                      ).map(
                        ([group, items]) => (
                          <optgroup
                            key={group}
                            label={group}
                          >
                            {items.map(
                              ([
                                label,
                                value,
                              ]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </optgroup>
                        )
                      )}
                  </select>
                </div>

                {/* VARIANTS */}

                {variantSection}

              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-2 mt-5">

                <button
                  onClick={() => {
                    resetEditModalState();

                    setVariantGroups([]);
                    setVariantCombinations([]);

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
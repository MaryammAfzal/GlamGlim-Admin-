import re
import sys

file_path = r'c:\Users\maryam\Documents\glam-glim-admin\src\components\Adminportal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State changes
content = content.replace(
    'const [addImageFile, setAddImageFile] = useState<File | null>(null);',
    'const [addImageFiles, setAddImageFiles] = useState<File[]>([]);'
)
content = content.replace(
    'const [addImagePreview, setAddImagePreview] = useState<string | null>(\n    null\n  );',
    'const [addImagePreviews, setAddImagePreviews] = useState<string[]>([]);'
)
content = content.replace(
    'const [editImageFile, setEditImageFile] = useState<File | null>(null);',
    'const [editImageFiles, setEditImageFiles] = useState<File[]>([]);'
)
content = content.replace(
    'const [editImagePreview, setEditImagePreview] = useState<string | null>(\n    null\n  );',
    'const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);'
)

# 2. Handlers
handle_add = """  const handleAddImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAddImageFiles((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setAddImagePreviews((prev) => [...prev, ...previews]);
    }
  };
"""
content = re.sub(
    r'const handleAddImageSelect = \(.*?setAddImagePreview\(URL\.createObjectURL\(file\)\);\n  };',
    handle_add,
    content,
    flags=re.DOTALL
)

handle_edit = """  const handleEditImageSelect = (
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
"""
content = re.sub(
    r'const handleEditImageSelect = \(.*?setEditImagePreview\(URL\.createObjectURL\(file\)\);\n  };',
    handle_edit,
    content,
    flags=re.DOTALL
)

# 3. Resets
content = content.replace('setAddImageFile(null);', 'setAddImageFiles([]);')
content = content.replace('setAddImagePreview(null);', 'setAddImagePreviews([]);')

content = content.replace('setEditImageFile(null);', 'setEditImageFiles([]);')
content = content.replace('setEditImagePreview(null);', 'setEditImagePreviews([]);')

# 4. Upload logic (Add)
upload_add_old = """    let imageUrl = "";

    if (addImageFile) {
      setAddUploading(true);

      const uploadedUrl =
        await uploadProductImage(addImageFile);

      setAddUploading(false);

      if (!uploadedUrl) {
        alert(
          "Image upload failed. Check that the 'product-images' storage bucket exists and is public."
        );
        return;
      }

      imageUrl = uploadedUrl;
    }"""
upload_add_new = """    let imageUrl = "";

    if (addImageFiles.length > 0) {
      setAddUploading(true);
      const uploadedUrls = [];
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

      imageUrl = uploadedUrls.join(',');
    }"""
content = content.replace(upload_add_old, upload_add_new)

# 5. Upload logic (Edit)
upload_edit_old = """    let imageUrl = selectedProduct.image;

    if (editImageFile) {
      setEditUploading(true);

      const uploadedUrl =
        await uploadProductImage(editImageFile);

      setEditUploading(false);

      if (!uploadedUrl) {
        alert(
          "Image upload failed. Check that the 'product-images' storage bucket exists and is public."
        );
        return;
      }

      imageUrl = uploadedUrl;
    }"""
upload_edit_new = """    let imageUrl = selectedProduct.image || "";

    if (editImageFiles.length > 0) {
      setEditUploading(true);
      const uploadedUrls = [];
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

      const existingUrls = imageUrl ? imageUrl.split(',').filter(Boolean) : [];
      imageUrl = [...existingUrls, ...uploadedUrls].join(',');
    }"""
content = content.replace(upload_edit_old, upload_edit_new)

# 6. List UI
list_ui_old = """                          {p.image ? (
                            <img
                              src={p.image}"""
list_ui_new = """                          {p.image ? (
                            <img
                              src={p.image.split(',')[0]}"""
content = content.replace(list_ui_old, list_ui_new)

# 7. Add form UI
add_ui_old = """                  <div
                  onClick={() =>
                    addFileInputRef.current?.click()
                  }
                  className="w-full h-40 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                >

                  {addImagePreview ? (
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
                  onChange={
                    handleAddImageSelect
                  }
                />"""

add_ui_new = """                  <div className="flex flex-wrap gap-2 mb-2">
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
                />"""
content = content.replace(add_ui_old, add_ui_new)

# 8. Edit form UI
edit_ui_old = """                  <div
                    onClick={() =>
                      editFileInputRef.current?.click()
                    }
                    className="w-full h-40 rounded-md border-2 border-dashed border-[#E5D9D0] bg-[#FAF7F4] flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#5B1A1A]/40 transition relative"
                  >

                    {editImagePreview ? (
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={
                          selectedProduct.name
                        }
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
                    onChange={
                      handleEditImageSelect
                    }
                  />

                  <p className="text-[11px] text-gray-400 mt-1">
                    Click the image to replace
                    it.
                  </p>"""

edit_ui_new = """                  <div className="flex flex-wrap gap-2 mb-2">
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
                  />"""
content = content.replace(edit_ui_old, edit_ui_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications complete.")

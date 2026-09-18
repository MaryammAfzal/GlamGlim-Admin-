import re

file_path = r'c:\Users\maryam\Documents\glam-glim-admin\src\components\Adminportal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix add image upload logic
upload_pattern = r'let imageUrl = productForm\.image;\s*if \(addImageFile\) {.*?imageUrl = uploadedUrl;\s*}'
upload_new = """let imageUrl = productForm.image || "";

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
content = re.sub(upload_pattern, upload_new, content, flags=re.DOTALL)

# Fix add image UI
ui_pattern = r'<div\s*onClick=\{\(\) =>\s*addFileInputRef\.current\?\.click\(\)\s*\}\s*className="w-full h-40.*?<input\s*ref=\{addFileInputRef\}.*?/>'
ui_new = """<div className="flex flex-wrap gap-2 mb-2">
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
content = re.sub(ui_pattern, ui_new, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fix applied")

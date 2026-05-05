export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // Check if the file is already a lightweight format or not an image
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // fallback
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to a compressed WebP or JPEG Blob
        const outputType = 'image/webp'; // WebP offers better compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file); // fallback
            }
            // Create a new File from the blob
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = (err) => {
        console.error("Image loading error", err);
        resolve(file); // fallback to original file if parsing fails
      };
    };

    reader.onerror = (err) => {
      console.error("File reading error", err);
      resolve(file);
    };
  });
}

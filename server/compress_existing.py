
import os
import sys
# Ensure imports work by adding current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from image_compressor import compress_image_data, MAX_FILE_SIZE

UPLOAD_DIR = "static/uploads"

def compress_existing():
    if not os.path.exists(UPLOAD_DIR):
        print(f"Directory {UPLOAD_DIR} not found.")
        return

    print(f"Scanning {UPLOAD_DIR} for images > 1MB...")
    count = 0
    
    for filename in os.listdir(UPLOAD_DIR):
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.isfile(file_path):
            continue
            
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            continue
            
        file_size = os.path.getsize(file_path)
        
        if file_size > MAX_FILE_SIZE:
            print(f"Compressing {filename} ({file_size / 1024 / 1024:.2f} MB)...")
            
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                
                compressed = compress_image_data(content, file_ext)
                
                # If compressed size is smaller, overwrite
                if len(compressed) < file_size:
                    with open(file_path, "wb") as f:
                        f.write(compressed)
                    print(f" -> Done. New size: {len(compressed) / 1024 / 1024:.2f} MB")
                    count += 1
                else:
                    print(" -> Skipped (could not compress further or error)")
            except Exception as e:
                print(f" -> Error: {e}")

    print(f"Finished. Compressed {count} images.")

if __name__ == "__main__":
    compress_existing()

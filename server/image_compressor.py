
import os
from io import BytesIO
from PIL import Image

MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB

def compress_image_data(content: bytes, file_ext: str) -> bytes:
    """
    Compresses image data to be under 1MB.
    Returns the compressed bytes.
    If original is under 1MB and not PNG (or we want to force compression), returns original content if small enough.
    However, for consistency with 'strict limit', we check size.
    """
    file_size = len(content)
    
    # If small enough, just return original (unless we want to enforce JPEG for everything, but let's stick to size limit)
    if file_size <= MAX_FILE_SIZE:
        return content

    # Use a BytesIO stream for the content
    img_stream = BytesIO(content)
    
    try:
        img = Image.open(img_stream)
        
        # Convert to RGB (dropping transparency to allow JPEG compression)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize if dimensions are excessively large initially
        max_dimension = 2048
        if max(img.size) > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        
        # Compress Loop
        output = BytesIO()
        quality = 90
        
        while True:
            output.seek(0)
            output.truncate()
            # Force JPEG for compression efficiency
            img.save(output, format="JPEG", quality=quality, optimize=True)
            
            size = output.tell()
            if size <= MAX_FILE_SIZE:
                break
            
            # If quality is already low, resize
            if quality <= 30:
                width, height = img.size
                # Reduce dimensions by 10%
                new_width = int(width * 0.9)
                new_height = int(height * 0.9)
                
                # Safety break if image gets too small
                if new_width < 100 or new_height < 100:
                    break
                    
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            else:
                quality -= 10
                
        return output.getvalue()

    except Exception as e:
        print(f"Error compressing image: {e}")
        return content

def generate_thumbnail(content: bytes, file_ext: str) -> bytes:
    """
    Generates a thumbnail (max 320x320) from image data.
    Returns the thumbnail bytes (JPEG).
    """
    try:
        img_stream = BytesIO(content)
        img = Image.open(img_stream)
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        img.thumbnail((320, 320), Image.Resampling.LANCZOS)
        
        output = BytesIO()
        img.save(output, format="JPEG", quality=70, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return None

from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
from io import BytesIO
from image_compressor import compress_image_data, MAX_FILE_SIZE

router = APIRouter(
    prefix="/upload",
    tags=["files"]
)

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        final_content = content
        final_ext = file_ext
        
        if file_size > MAX_FILE_SIZE and file_ext in ['.jpg', '.jpeg', '.png', '.webp']:
            # Compress
            final_content = compress_image_data(content, file_ext)
            # If compressed, we force JPEG extension for new files
            # (Check if content changed OR size was > limit)
            # compress_image_data returns JPEG bytes if it runs.
            final_ext = ".jpg"
            
        unique_filename = f"{uuid.uuid4()}{final_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as f:
            f.write(final_content)
            
        # Generate Thumbnail
        thumbnail_url = None
        if final_ext in ['.jpg', '.jpeg', '.png', '.webp']:
             # Use final_content which is already compressed if applicable, or original
             from image_compressor import generate_thumbnail
             thumb_data = generate_thumbnail(final_content, final_ext)
             if thumb_data:
                 thumb_filename = f"thumb_{unique_filename}"
                 # Ensure thumb ends in jpg
                 thumb_filename = os.path.splitext(thumb_filename)[0] + ".jpg"
                 thumb_path = os.path.join(UPLOAD_DIR, thumb_filename)
                 with open(thumb_path, "wb") as f:
                     f.write(thumb_data)
                 thumbnail_url = f"/uploads/{thumb_filename}"
            
        # Return relative URL
        return {"url": f"/uploads/{unique_filename}", "thumbnail_url": thumbnail_url}
                

            
        # Return relative URL
        return {"url": f"/uploads/{unique_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

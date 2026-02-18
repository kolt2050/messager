from PIL import Image, ImageDraw, ImageFont
import os

def create_placeholder_icon(output_path):
    # Create image
    size = (256, 256)
    color = (0, 122, 255) # Blue
    img = Image.new('RGB', size, color=color)
    
    d = ImageDraw.Draw(img)
    
    # Draw logic for "M"
    # Since we might not have a font, just draw lines or a simple shape
    # Or try loading default font
    try:
        font = ImageFont.truetype("arial.ttf", 150)
    except IOError:
        font = ImageFont.load_default()

    d.text((70, 40), "M", fill=(255, 255, 255), font=font)
    
    img.save(output_path)
    print(f"Created placeholder icon at {output_path}")

if __name__ == "__main__":
    create_placeholder_icon("v:\\git\\messager\\client\\icon.png")

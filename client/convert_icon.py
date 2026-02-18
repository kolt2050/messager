from PIL import Image
import sys

def convert_to_ico(input_path, output_path):
    try:
        img = Image.open(input_path)
        img.save(output_path, format='ICO', sizes=[(256, 256)])
        print(f"Successfully converted {input_path} to {output_path}")
    except Exception as e:
        print(f"Error converting image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Assumes the generated image is saved as an artifact or locally. 
    # I will pass the paths when running the script.
    if len(sys.argv) != 3:
        print("Usage: python convert_icon.py <input_png> <output_ico>")
        sys.exit(1)
    
    convert_to_ico(sys.argv[1], sys.argv[2])

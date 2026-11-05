import os
from PIL import Image

src_path = r"C:\Users\matheus.ribeiro\.gemini\antigravity\brain\56a0f8c3-4b1f-4196-b62c-f1a7051090f1\faturas_dog_app_icon_1793906532408.jpg"
repo_dir = r"c:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\parcelado-a-vista"

assert os.path.exists(src_path), f"Source image not found: {src_path}"

img = Image.open(src_path).convert("RGBA")
print(f"Original image size: {img.size}")

# 1. Generate icon-512.png
img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(os.path.join(repo_dir, "icon-512.png"), format="PNG", optimize=True)
print("Saved icon-512.png")

# 2. Generate icon-192.png
img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
img_192.save(os.path.join(repo_dir, "icon-192.png"), format="PNG", optimize=True)
print("Saved icon-192.png")

# 3. Generate apple-touch-icon.png (180x180)
img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
img_180.save(os.path.join(repo_dir, "apple-touch-icon.png"), format="PNG", optimize=True)
print("Saved apple-touch-icon.png")

# 4. Generate multi-resolution favicon.ico (16, 32, 48)
fav_sizes = [(16, 16), (32, 32), (48, 48)]
img.save(os.path.join(repo_dir, "favicon.ico"), format="ICO", sizes=fav_sizes)
print("Saved favicon.ico")

# 5. Also copy master image into scripts for reproducibility
master_dest = os.path.join(repo_dir, "scripts", "faturas_dog_logo_master.jpg")
img.convert("RGB").save(master_dest, quality=95)
print(f"Saved master copy to {master_dest}")

print("All icon assets generated successfully!")

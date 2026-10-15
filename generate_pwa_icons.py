from PIL import Image, ImageDraw, ImageFont
import math

def create_pwa_icon(size):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Radii and padding
    pad = int(size * 0.08)
    radius = int(size * 0.22)
    
    # Outer background rounded rectangle (Deep Sapphire / Slate dark gradient)
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    bg_draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=(11, 17, 32, 255))
    
    # Draw radial gradient shine
    center_x, center_y = size * 0.35, size * 0.35
    max_dist = size * 0.6
    for y in range(pad, size - pad):
        for x in range(pad, size - pad):
            # check if inside rounded rect
            d = math.hypot(x - center_x, y - center_y)
            if d < max_dist:
                ratio = 1.0 - (d / max_dist)
                # blend subtle sapphire cyan glow
                # Alpha depends on ratio
                glow = int(55 * (ratio ** 2))
                # Add cyan glow (56, 189, 248)
                current = bg.getpixel((x, y))
                if current[3] > 0:
                    r = min(255, current[0] + int(56 * ratio))
                    g = min(255, current[1] + int(189 * ratio))
                    b = min(255, current[2] + int(248 * ratio))
                    bg.putpixel((x, y), (r, g, b, 255))
                    
    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)
    
    # Border stroke around the icon
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, outline=(56, 189, 248, 90), width=max(1, int(size * 0.015)))
    
    # Draw Modern Credit Card Graphic in center
    # Card 1 (Back glow card, tilted slightly or secondary)
    cw = int(size * 0.58)
    ch = int(cw * 0.62)
    cx = size // 2
    cy = int(size * 0.51)
    
    # Card shape
    x0 = cx - cw // 2
    y0 = cy - ch // 2
    x1 = cx + cw // 2
    y1 = cy + ch // 2
    card_r = int(ch * 0.18)
    
    # Secondary shadow card slightly shifted up-right
    s_x0 = x0 + int(size * 0.04)
    s_y0 = y0 - int(size * 0.05)
    s_x1 = x1 + int(size * 0.04)
    s_y1 = y1 - int(size * 0.05)
    draw.rounded_rectangle([s_x0, s_y0, s_x1, s_y1], radius=card_r, fill=(2, 132, 199, 140), outline=(56, 189, 248, 160), width=max(1, int(size*0.012)))
    
    # Primary Main Card (Front)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=card_r, fill=(21, 31, 50, 250), outline=(56, 189, 248, 240), width=max(2, int(size*0.02)))
    
    # Card magnetic strip or top accent banner
    banner_h = int(ch * 0.22)
    draw.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y0 + banner_h], radius=card_r, fill=(56, 189, 248, 220))
    # Clip lower corners of banner with straight rect
    draw.rectangle([x0 + 2, y0 + banner_h // 2, x1 - 2, y0 + banner_h], fill=(56, 189, 248, 220))
    
    # Chip (Golden amber / emerald style)
    chip_w = int(cw * 0.22)
    chip_h = int(ch * 0.26)
    chip_x = x0 + int(cw * 0.12)
    chip_y = y0 + int(ch * 0.38)
    draw.rounded_rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], radius=int(chip_h * 0.25), fill=(251, 191, 36, 240), outline=(245, 158, 11, 255), width=max(1, int(size*0.008)))
    
    # Contactless waves on card right side
    wave_cx = x1 - int(cw * 0.22)
    wave_cy = y0 + int(ch * 0.52)
    for wr in [int(cw * 0.06), int(cw * 0.10)]:
        bbox = [wave_cx - wr, wave_cy - wr, wave_cx + wr, wave_cy + wr]
        draw.arc(bbox, start=-45, end=45, fill=(52, 211, 153, 230), width=max(2, int(size*0.014)))
        
    # Floating Emerald Sparkle / Coin in bottom-right corner
    coin_r = int(size * 0.14)
    coin_cx = int(size * 0.76)
    coin_cy = int(size * 0.74)
    draw.ellipse([coin_cx - coin_r, coin_cy - coin_r, coin_cx + coin_r, coin_cy + coin_r], fill=(52, 211, 153, 245), outline=(16, 185, 129, 255), width=max(2, int(size*0.018)))
    
    # Inner '$' or checkmark in the emerald coin
    # Let's draw an elegant checkmark or '$'
    chk_w = max(2, int(size * 0.022))
    # Checkmark points:
    p1 = (coin_cx - int(coin_r * 0.42), coin_cy + int(coin_r * 0.02))
    p2 = (coin_cx - int(coin_r * 0.10), coin_cy + int(coin_r * 0.38))
    p3 = (coin_cx + int(coin_r * 0.45), coin_cy - int(coin_r * 0.35))
    draw.line([p1, p2, p3], fill=(11, 17, 32, 255), width=chk_w, joint='curve')
    
    return img

# Generate 192x192 and 512x512 icons
icon192 = create_pwa_icon(192)
icon192.save('icon-192.png', 'PNG')

icon512 = create_pwa_icon(512)
icon512.save('icon-512.png', 'PNG')

# Also save apple-touch-icon
icon192.save('apple-touch-icon.png', 'PNG')
print("Icons generated successfully!")

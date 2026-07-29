import os
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

def create_svgs(public_dir):
    print("Generating SVG Logo Variants...")
    
    # 1. Icon Only SVG
    icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Background Shape (Hexagon) -->
  <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#brand-grad)" opacity="0.1" stroke="url(#brand-grad)" stroke-width="1.5" />
  <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#brand-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Stylized G + Upward Arrow (Finance & GST) -->
  <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
  <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" />

  <!-- AI Nodes -->
  <circle cx="68" cy="32" r="4.5" fill="#14b8a6" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="52" cy="32" r="4.5" fill="#6366f1" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#brand-grad)" stroke-width="2" />
</svg>"""

    # 2. Main Logo SVG (Horizontal: Icon + Text)
    main_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="100%" height="100%">
  <defs>
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
  </defs>
  <!-- Icon Portion -->
  <g transform="translate(10, 10) scale(0.6)">
    <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#brand-grad)" opacity="0.1" stroke="url(#brand-grad)" stroke-width="1.5" />
    <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#brand-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" />
    <circle cx="68" cy="32" r="4.5" fill="#14b8a6" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="32" r="4.5" fill="#6366f1" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#brand-grad)" stroke-width="2" />
  </g>
  <!-- Text Portion -->
  <text x="85" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="22px" font-weight="800" fill="#000000" letter-spacing="-0.5px">GST Buddy <tspan fill="url(#brand-grad)">AI</tspan></text>
  <text x="85" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="11px" font-weight="600" fill="#6b7280" letter-spacing="1.5px">COMPLIANCE OS</text>
</svg>"""

    # 3. White Logo SVG (Horizontal: Icon + White Text for dark headers)
    white_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="100%" height="100%">
  <defs>
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#2dd4bf" />
    </linearGradient>
  </defs>
  <!-- Icon Portion -->
  <g transform="translate(10, 10) scale(0.6)">
    <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#brand-grad)" opacity="0.15" stroke="url(#brand-grad)" stroke-width="1.5" />
    <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#brand-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" />
    <circle cx="68" cy="32" r="4.5" fill="#2dd4bf" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="32" r="4.5" fill="#818cf8" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#brand-grad)" stroke-width="2" />
  </g>
  <!-- Text Portion -->
  <text x="85" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="22px" font-weight="800" fill="#ffffff" letter-spacing="-0.5px">GST Buddy <tspan fill="url(#brand-grad)">AI</tspan></text>
  <text x="85" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="11px" font-weight="600" fill="#9ca3af" letter-spacing="1.5px">COMPLIANCE OS</text>
</svg>"""

    # 4. Dark Logo SVG (Horizontal: Icon + Dark Text for light headers)
    dark_svg = main_svg  # Main logo matches the dark text theme

    # 5. Sidebar Logo SVG (Compact representation for sidebars)
    sidebar_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="100%" height="100%">
  <defs>
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
  </defs>
  <!-- Icon Portion -->
  <g transform="translate(10, 5) scale(0.5)">
    <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#brand-grad)" opacity="0.1" stroke="url(#brand-grad)" stroke-width="1.5" />
    <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#brand-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#brand-grad)" stroke-width="6" stroke-linecap="round" />
    <circle cx="68" cy="32" r="4.5" fill="#14b8a6" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="32" r="4.5" fill="#6366f1" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#brand-grad)" stroke-width="2" />
  </g>
  <!-- Text Portion -->
  <text x="70" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="18px" font-weight="800" fill="currentColor" letter-spacing="-0.5px">GST Buddy <tspan fill="url(#brand-grad)">AI</tspan></text>
</svg>"""

    # Write files
    with open(os.path.join(public_dir, 'logo-icon.svg'), 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    with open(os.path.join(public_dir, 'logo-main.svg'), 'w', encoding='utf-8') as f:
        f.write(main_svg)
    with open(os.path.join(public_dir, 'logo-white.svg'), 'w', encoding='utf-8') as f:
        f.write(white_svg)
    with open(os.path.join(public_dir, 'logo-dark.svg'), 'w', encoding='utf-8') as f:
        f.write(dark_svg)
    with open(os.path.join(public_dir, 'logo-sidebar.svg'), 'w', encoding='utf-8') as f:
        f.write(sidebar_svg)
        
    # Also write favicon.svg
    with open(os.path.join(public_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(icon_svg)

    print("[SUCCESS] SVG Logo Variants created!")

def draw_logo_icon_image(size):
    """Draws a crisp logo icon as a PIL Image with size (size, size)"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # We will draw geometric shapes matching the SVG design
    # A sleek indigo/teal gradient hexagon
    padding = size * 0.1
    # Hexagon outer boundary
    cx, cy = size / 2, size / 2
    r = size / 2 - padding
    
    # Define points of a regular hexagon
    import math
    points = []
    for i in range(6):
        angle = math.radians(i * 60 - 30) # Pointy top
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        points.append((x, y))
        
    # Fill background hexagon with translucent teal/indigo
    draw.polygon(points, fill=(99, 102, 241, 30), outline=(99, 102, 241, 255), width=max(1, int(size*0.02)))
    
    # Draw smaller inner stroke hexagon
    r_inner = r * 0.8
    points_inner = []
    for i in range(6):
        angle = math.radians(i * 60 - 30)
        x = cx + r_inner * math.cos(angle)
        y = cy + r_inner * math.sin(angle)
        points_inner.append((x, y))
    draw.polygon(points_inner, outline=(20, 184, 166, 255), width=max(2, int(size*0.04)))
    
    # Draw G-curve/Arrow shapes inside hexagon
    p_center = (cx, cy)
    p_right = (cx + r_inner * 0.5, cy)
    p_up_right = (cx + r_inner * 0.5, cy - r_inner * 0.5)
    
    # Draw check/arrow lines
    draw.line([p_center, p_right, p_up_right], fill=(99, 102, 241, 255), width=max(3, int(size*0.06)), joint="round")
    
    # Draw circular AI nodes
    node_r = max(2, int(size * 0.05))
    draw.ellipse([p_up_right[0]-node_r, p_up_right[1]-node_r, p_up_right[0]+node_r, p_up_right[1]+node_r], fill=(20, 184, 166, 255), outline=(255, 255, 255, 255), width=max(1, int(size*0.015)))
    draw.ellipse([p_center[0]-node_r, p_center[1]-node_r, p_center[0]+node_r, p_center[1]+node_r], fill=(255, 255, 255, 255), outline=(99, 102, 241, 255), width=max(1, int(size*0.015)))
    
    return img

def generate_pngs(public_dir):
    print("Generating PNG Favicons and PWA Icons...")
    
    sizes = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'favicon-48x48.png': 48,
        'apple-touch-icon.png': 180,
        'android-chrome-192x192.png': 192,
        'android-chrome-512x512.png': 512,
    }
    
    for filename, size in sizes.items():
        img = draw_logo_icon_image(size)
        filepath = os.path.join(public_dir, filename)
        img.save(filepath, "PNG")
        print(f"  - Generated {filename} ({size}x{size})")
        
    # Generate favicon.ico by converting 32x32 image
    ico_img = draw_logo_icon_image(32)
    ico_img.save(os.path.join(public_dir, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("  - Generated favicon.ico (bundled 16, 32, 48)")
    print("[SUCCESS] PNG Icons created!")

if __name__ == "__main__":
    # Target directory is demorepo-openai-main/public
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(current_dir)
    public_dir = os.path.join(project_dir, 'public')
    
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        
    create_svgs(public_dir)
    generate_pngs(public_dir)
    print("[SUCCESS] All brand assets generated successfully!")

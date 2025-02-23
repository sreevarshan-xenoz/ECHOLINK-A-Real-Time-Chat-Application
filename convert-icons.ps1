# Check if ImageMagick is installed
$imageMagick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $imageMagick) {
    Write-Host "ImageMagick is not installed. Please install it from: https://imagemagick.org/script/download.php#windows"
    Write-Host "After installation, run this script again."
    pause
    exit 1
}

# Create build directory if it doesn't exist
if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build"
}

# Source SVG file
$svgFile = "build/icon.svg"
if (-not (Test-Path $svgFile)) {
    Write-Host "Error: icon.svg not found in build directory!"
    pause
    exit 1
}

Write-Host "Converting icons..."

# Windows ICO
Write-Host "Creating Windows icon..."
magick convert $svgFile -background none -resize 256x256 -define icon:auto-resize="256,128,96,64,48,32,16" "build/icon.ico"

# macOS ICNS
Write-Host "Creating macOS icon..."
$icnsDir = "build/icon.iconset"
New-Item -ItemType Directory -Path $icnsDir -Force

# Create different sizes for ICNS
$sizes = @(16, 32, 64, 128, 256, 512, 1024)
foreach ($size in $sizes) {
    $doubleSize = $size * 2
    magick convert $svgFile -background none -resize ${size}x${size} "$icnsDir/icon_${size}x${size}.png"
    magick convert $svgFile -background none -resize ${doubleSize}x${doubleSize} "$icnsDir/icon_${size}x${size}@2x.png"
}

# Convert to ICNS (macOS only, but we'll create PNGs anyway)
if ($IsMacOS) {
    iconutil -c icns $icnsDir -o "build/icon.icns"
} else {
    Write-Host "Note: ICNS file can only be created on macOS. PNG files have been created instead."
}

# Linux PNG
Write-Host "Creating Linux icons..."
$linuxSizes = @(16, 32, 48, 64, 128, 256, 512)
foreach ($size in $linuxSizes) {
    magick convert $svgFile -background none -resize ${size}x${size} "build/icon_${size}x${size}.png"
}
# Create the main icon.png
magick convert $svgFile -background none -resize 512x512 "build/icon.png"

Write-Host "Icon conversion complete!"
Write-Host "Created:"
Write-Host "- build/icon.ico (Windows)"
Write-Host "- build/icon.png (Linux)"
Write-Host "- build/icon.iconset/* (macOS PNG files)"

pause 
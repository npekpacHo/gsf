$ErrorActionPreference = 'Continue'

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ImagesDir = Join-Path $Root 'images'
$TempDir = Join-Path $Root '_tmp_favicons'
$JsFile = Join-Path $Root 'gsf.user.js'

if (!(Test-Path $JsFile)) {
    Write-Host "[Error] File gsf.user.js not found in $Root" -ForegroundColor Red
    exit
}

New-Item -ItemType Directory -Force -Path $ImagesDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# Read JS file
$JsContent = Get-Content $JsFile -Raw -Encoding UTF8

# 1. Find LOCAL_IMAGES block
$LocalImagesRegex = [regex]'(?s)const LOCAL_IMAGES = \{(.*?)\};'
$BlockMatch = $LocalImagesRegex.Match($JsContent)

if (!$BlockMatch.Success) {
    Write-Host "[Error] Could not find LOCAL_IMAGES block in the script." -ForegroundColor Red
    exit
}

$Block = $BlockMatch.Groups[1].Value

# 2. Parse keys and files
$ItemsRegex = [regex]"['""]([^'""]+)['""]\s*:\s*['""]([^'""]+)['""]"
$Matches = $ItemsRegex.Matches($Block)

$Items = @()
foreach ($m in $Matches) {
    $Items += @{ Key = $m.Groups[1].Value; File = $m.Groups[2].Value }
}

Write-Host ("[Info] Found {0} icons in the script.`n" -f $Items.Count) -ForegroundColor Cyan

function Get-IconDomain {
    param([string]$Key, [string]$Content)
    
    if ($Key -match '\.') { return $Key }
    
    $EscapedKey = [regex]::Escape($Key)
    $Pattern = "(?is)key\s*:\s*['""]$EscapedKey['""].*?iconDomain\s*:\s*['""]([^'""]+)['""]"
    $Match = [regex]::Match($Content, $Pattern)
    
    if ($Match.Success) {
        return $Match.Groups[1].Value
    }
    return $null
}

function Get-CandidateUrls {
    param([string]$Key, [string]$Domain)

    $urls = @()

    # 1. Hardcoded high-res official icons for stubborn Google/System services
    $Overrides = @{
        'google-drive'    = 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png'
        'google-docs'     = 'https://ssl.gstatic.com/images/branding/product/1x/docs_2020q4_48dp.png'
        'google-calendar' = 'https://ssl.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png'
        'google-forms'    = 'https://ssl.gstatic.com/images/branding/product/1x/forms_2020q4_48dp.png'
        'google-chat'     = 'https://ssl.gstatic.com/images/branding/product/1x/chat_48dp.png'
        'google-photos'   = 'https://ssl.gstatic.com/images/branding/product/1x/photos_48dp.png'
        'google-groups'   = 'https://ssl.gstatic.com/images/branding/product/1x/groups_48dp.png'
        'google-classroom'= 'https://ssl.gstatic.com/images/branding/product/1x/classroom_48dp.png'
        'google-account'  = 'https://ssl.gstatic.com/images/branding/product/1x/google_home_48dp.png'
        'youtube'         = 'https://www.youtube.com/s/desktop/104595e1/img/favicon_144x144.png'
    }

    if ($Overrides.ContainsKey($Key)) {
        $urls += $Overrides[$Key]
    }

    # 2. Clearbit Logo API (Excellent high-res logos for companies)
    $urls += "https://logo.clearbit.com/$Domain"

    # 3. Standard heuristics
    $urls += "https://$Domain/apple-touch-icon.png"
    $urls += "https://$Domain/favicon.png"
    $urls += "https://www.google.com/s2/favicons?sz=64&domain_url=https://$Domain"
    $urls += "https://icons.duckduckgo.com/ip3/$Domain.ico"
    $urls += "https://$Domain/favicon.ico"

    return $urls
}

function Download-File {
    param([string]$Url, [string]$OutFile)

    $params = @{
        Uri = $Url
        OutFile = $OutFile
        TimeoutSec = 15
        Headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }

    if ($PSVersionTable.PSVersion.Major -lt 6) { $params.UseBasicParsing = $true }

    Invoke-WebRequest @params | Out-Null

    if (!(Test-Path $OutFile)) { throw 'Downloaded file was not created' }
    if ((Get-Item $OutFile).Length -le 0) { throw 'Downloaded file is empty' }
}

function Load-Image {
    param([string]$FilePath)
    try {
        return [System.Drawing.Image]::FromFile($FilePath)
    } catch {
        try {
            $icon = New-Object System.Drawing.Icon($FilePath)
            return $icon.ToBitmap()
        } catch {
            throw 'Cannot read file as image or ico'
        }
    }
}

function Save-AsPng64 {
    param([string]$SourceFile, [string]$OutFile)

    $img = $null; $bmp = $null; $graphics = $null

    try {
        $img = Load-Image -FilePath $SourceFile
        $bmp = New-Object System.Drawing.Bitmap 64, 64
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($img, 0, 0, 64, 64)
        $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bmp) { $bmp.Dispose() }
        if ($img) { $img.Dispose() }
    }

    if (!(Test-Path $OutFile)) { throw 'PNG was not created' }
    if ((Get-Item $OutFile).Length -le 0) { throw 'PNG is empty' }
}

$Ok = 0; $Fail = 0; $Skipped = 0

foreach ($Item in $Items) {
    $key = $Item.Key
    $file = $Item.File
    $out = Join-Path $ImagesDir $file
    $tmp = Join-Path $TempDir ($file + '.download')

    if (Test-Path $out) {
        Write-Host "[Skip] $file (already exists)" -ForegroundColor DarkGray
        $Skipped++
        continue
    }

    $domain = Get-IconDomain -Key $key -Content $JsContent

    if (!$domain) {
        Write-Host "[Warn] $file (could not determine domain for key '$key')" -ForegroundColor Yellow
        $Skipped++
        continue
    }

    Write-Host ("-> {0} ({1}) -> images\{2}" -f $domain, $key, $file)

    $done = $false

    foreach ($url in (Get-CandidateUrls -Key $key -Domain $domain)) {
        try {
            if (Test-Path $tmp) { Remove-Item $tmp -Force }
            
            Download-File -Url $url -OutFile $tmp
            Save-AsPng64 -SourceFile $tmp -OutFile $out

            Write-Host ("  OK: {0}" -f $url) -ForegroundColor Green
            $done = $true
            break
        } catch {
            Write-Host ("  skip: {0}" -f $url) -ForegroundColor DarkGray
        }
    }

    if ($done) {
        $Ok++
    } else {
        Write-Host ("  FAIL: {0}" -f $domain) -ForegroundColor Red
        $Fail++
    }
}

try { Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue } catch {}

Write-Host ''
Write-Host ("Done: {0} downloaded, {1} skipped, {2} failed." -f $Ok, $Skipped, $Fail) -ForegroundColor Cyan
Write-Host ("Output folder: {0}" -f $ImagesDir)
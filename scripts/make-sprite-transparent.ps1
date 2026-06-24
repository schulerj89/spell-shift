param(
  [string]$InputPath = "public/assets/sprites/hero-sprite-sheet.jpg",
  [string]$OutputPath = "public/assets/sprites/hero-sprite-sheet-transparent.png",
  [int]$FrameWidth = 320,
  [int]$FrameHeight = 320,
  [int]$Tolerance = 58,
  [int]$SampleStep = 4
)

Add-Type -AssemblyName System.Drawing

function Get-ColorDistanceSquared {
  param(
    [System.Drawing.Color]$A,
    [System.Drawing.Color]$B
  )

  $dr = [int]$A.R - [int]$B.R
  $dg = [int]$A.G - [int]$B.G
  $db = [int]$A.B - [int]$B.B

  return ($dr * $dr) + ($dg * $dg) + ($db * $db)
}

function Test-LightNeutralPixel {
  param([System.Drawing.Color]$Color)

  $brightest = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $darkest = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))

  return $brightest -ge 185 -and ($brightest - $darkest) -le 48
}

function Get-FrameBackgroundColor {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$MinX,
    [int]$MinY,
    [int]$MaxX,
    [int]$MaxY,
    [int]$Step
  )

  $samples = New-Object System.Collections.Generic.List[System.Drawing.Color]

  for ($x = $MinX; $x -le $MaxX; $x += $Step) {
    $top = $Bitmap.GetPixel($x, $MinY)
    $bottom = $Bitmap.GetPixel($x, $MaxY)
    if (Test-LightNeutralPixel $top) { $samples.Add($top) }
    if (Test-LightNeutralPixel $bottom) { $samples.Add($bottom) }
  }

  for ($y = $MinY; $y -le $MaxY; $y += $Step) {
    $left = $Bitmap.GetPixel($MinX, $y)
    $right = $Bitmap.GetPixel($MaxX, $y)
    if (Test-LightNeutralPixel $left) { $samples.Add($left) }
    if (Test-LightNeutralPixel $right) { $samples.Add($right) }
  }

  if ($samples.Count -eq 0) {
    $samples.Add($Bitmap.GetPixel($MinX, $MinY))
    $samples.Add($Bitmap.GetPixel($MaxX, $MinY))
    $samples.Add($Bitmap.GetPixel($MinX, $MaxY))
    $samples.Add($Bitmap.GetPixel($MaxX, $MaxY))
  }

  $r = 0
  $g = 0
  $b = 0
  foreach ($sample in $samples) {
    $r += $sample.R
    $g += $sample.G
    $b += $sample.B
  }

  return [System.Drawing.Color]::FromArgb(
    255,
    [Math]::Round($r / $samples.Count),
    [Math]::Round($g / $samples.Count),
    [Math]::Round($b / $samples.Count)
  )
}

function Clear-FrameBackground {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$MinX,
    [int]$MinY,
    [int]$MaxX,
    [int]$MaxY,
    [System.Drawing.Color]$BackgroundColor,
    [int]$Tolerance
  )

  $frameWidth = $MaxX - $MinX + 1
  $frameHeight = $MaxY - $MinY + 1
  $visited = New-Object 'bool[]' ($frameWidth * $frameHeight)
  $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
  $maxDistance = $Tolerance * $Tolerance
  $cleared = 0

  function Add-Point {
    param([int]$X, [int]$Y)

    if ($X -lt $MinX -or $X -gt $MaxX -or $Y -lt $MinY -or $Y -gt $MaxY) {
      return
    }

    $localIndex = (($Y - $MinY) * $frameWidth) + ($X - $MinX)
    if ($visited[$localIndex]) {
      return
    }

    $visited[$localIndex] = $true
    $queue.Enqueue([System.Drawing.Point]::new($X, $Y))
  }

  for ($x = $MinX; $x -le $MaxX; $x++) {
    Add-Point $x $MinY
    Add-Point $x $MaxY
  }

  for ($y = $MinY; $y -le $MaxY; $y++) {
    Add-Point $MinX $y
    Add-Point $MaxX $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $pixel = $Bitmap.GetPixel($point.X, $point.Y)

    if ((Get-ColorDistanceSquared $pixel $BackgroundColor) -gt $maxDistance) {
      continue
    }

    $Bitmap.SetPixel($point.X, $point.Y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
    $cleared++

    Add-Point ($point.X + 1) $point.Y
    Add-Point ($point.X - 1) $point.Y
    Add-Point $point.X ($point.Y + 1)
    Add-Point $point.X ($point.Y - 1)
  }

  return $cleared
}

$resolvedInput = Resolve-Path $InputPath
$source = [System.Drawing.Bitmap]::new($resolvedInput.Path)
$bitmap = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
$graphics.Dispose()
$source.Dispose()

$columns = [Math]::Floor($bitmap.Width / $FrameWidth)
$rows = [Math]::Floor($bitmap.Height / $FrameHeight)
$totalCleared = 0

Write-Output "Input: $InputPath ($($bitmap.Width)x$($bitmap.Height))"
Write-Output "Frames: ${columns}x${rows}, size=${FrameWidth}x${FrameHeight}, tolerance=$Tolerance"

for ($row = 0; $row -lt $rows; $row++) {
  for ($column = 0; $column -lt $columns; $column++) {
    $minX = $column * $FrameWidth
    $minY = $row * $FrameHeight
    $maxX = $minX + $FrameWidth - 1
    $maxY = $minY + $FrameHeight - 1
    $background = Get-FrameBackgroundColor $bitmap $minX $minY $maxX $maxY $SampleStep
    $cleared = Clear-FrameBackground $bitmap $minX $minY $maxX $maxY $background $Tolerance
    $totalCleared += $cleared

    Write-Output ("Frame {0},{1}: bg rgb({2},{3},{4}), cleared={5}" -f $column, $row, $background.R, $background.G, $background.B, $cleared)
  }
}

$outputParent = Split-Path -Parent $OutputPath
if ($outputParent -and -not (Test-Path $outputParent)) {
  New-Item -ItemType Directory -Path $outputParent | Out-Null
}

$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Output "Cleared pixels: $totalCleared"
Write-Output "Output: $OutputPath"

param([string]$NodePath = 'node')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeBinary = (Get-Command $NodePath).Source
& $nodeBinary (Join-Path $PSScriptRoot 'sync-theme.mjs')
if($LASTEXITCODE -ne 0){throw 'Shared theme generation failed'}
$stagingRoot = Join-Path $projectRoot ('.packaging\portable-' + [Guid]::NewGuid().ToString('N'))
$payloadRoot = Join-Path $stagingRoot 'payload'
$releaseRoot = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Path $payloadRoot,$releaseRoot -Force | Out-Null
Copy-Item -LiteralPath $nodeBinary -Destination (Join-Path $payloadRoot 'node.exe')
foreach($name in @('dist','data','licenses','server.mjs','sync.mjs','journal.mjs','pairing.mjs','music.mjs','README.md','VERSION_NOTES.md','CHANGELOG.md','RELEASE_NOTES.md','THIRD_PARTY_NOTICES.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $payloadRoot -Recurse
}
[IO.File]::WriteAllText((Join-Path $payloadRoot 'package.json'),'{"name":"maimai-random-pro","version":"3.6.0","type":"module"}')
$wsPath = (& $nodeBinary --input-type=module -e "import {createRequire} from 'node:module';import path from 'node:path';console.log(path.dirname(createRequire(import.meta.url).resolve('ws/package.json')))" | Select-Object -Last 1)
New-Item -ItemType Directory -Path (Join-Path $payloadRoot 'node_modules\ws') -Force | Out-Null
foreach($name in @('package.json','index.js','wrapper.mjs','browser.js','lib','LICENSE')) {
  Copy-Item -LiteralPath (Join-Path $wsPath $name) -Destination (Join-Path $payloadRoot 'node_modules\ws') -Recurse
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$payloadZip = Join-Path $stagingRoot 'payload.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($payloadRoot,$payloadZip,[IO.Compression.CompressionLevel]::Optimal,$false)
$bitmap = [Drawing.Bitmap]::new(256,256)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([Drawing.Color]::Transparent)
$graphics.FillEllipse([Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,222,0)),8,8,240,240)
$pen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(23,23,23),15)
$pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [Drawing.Drawing2D.LineCap]::ArrowAnchor
$graphics.DrawBezier($pen,60,77,123,72,119,179,197,177)
$graphics.DrawBezier($pen,60,178,116,175,139,79,197,78)
$png = [IO.MemoryStream]::new(); $bitmap.Save($png,[Drawing.Imaging.ImageFormat]::Png)
$iconPath = Join-Path $stagingRoot 'app.ico'
$iconWriter = [IO.BinaryWriter]::new([IO.File]::Create($iconPath))
$iconWriter.Write([uint16]0); $iconWriter.Write([uint16]1); $iconWriter.Write([uint16]1)
$iconWriter.Write([byte]0); $iconWriter.Write([byte]0); $iconWriter.Write([byte]0); $iconWriter.Write([byte]0)
$iconWriter.Write([uint16]1); $iconWriter.Write([uint16]32); $iconWriter.Write([uint32]$png.Length); $iconWriter.Write([uint32]22); $iconWriter.Write($png.ToArray())
$iconWriter.Dispose();$graphics.Dispose();$bitmap.Dispose();$png.Dispose();$pen.Dispose()
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outputFile = Join-Path $releaseRoot 'maimai-random-pro-3.6.0-win-x64.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "/resource:$payloadZip,payload.zip" "/win32icon:$iconPath" "/out:$outputFile" (Join-Path $projectRoot 'desktop\PortableLauncher.cs') (Join-Path $projectRoot 'desktop\Palette.generated.cs')
if($LASTEXITCODE -ne 0){throw 'Portable launcher compilation failed'}
Write-Output $outputFile
$hashAlgorithm = [Security.Cryptography.SHA256]::Create()
$hashStream = [IO.File]::OpenRead($outputFile)
try { Write-Output ('SHA256 ' + [BitConverter]::ToString($hashAlgorithm.ComputeHash($hashStream)).Replace('-','').ToLowerInvariant()) }
finally { $hashStream.Dispose(); $hashAlgorithm.Dispose() }

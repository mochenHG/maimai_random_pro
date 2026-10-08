param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceName = 'maimai-random-pro-3.6.0-source'
$stagingRoot = Join-Path $projectRoot ('.packaging\source-' + [Guid]::NewGuid().ToString('N'))
$sourceRoot = Join-Path $stagingRoot $sourceName
$releaseRoot = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Path $sourceRoot,$releaseRoot -Force | Out-Null
# An explicit manifest excludes local state, QA fixtures, dependencies and Git history.
foreach($name in @('src','public','data','design','desktop','scripts','tests','licenses','.gitignore','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','eslint.config.js','index.html','tsconfig.json','vite.config.ts','run.bat','server.mjs','sync.mjs','pairing.mjs','journal.mjs','music.mjs','README.md','VERSION_NOTES.md','CHANGELOG.md','RELEASE_NOTES.md','THIRD_PARTY_NOTICES.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $sourceRoot -Recurse
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$outputFile = Join-Path $releaseRoot ($sourceName + '.zip')
if(Test-Path -LiteralPath $outputFile){throw 'Source ZIP already exists; preserve it or choose a fresh release folder before rebuilding.'}
[IO.Compression.ZipFile]::CreateFromDirectory($stagingRoot,$outputFile,[IO.Compression.CompressionLevel]::Optimal,$false)
Write-Output $outputFile
$hashAlgorithm = [Security.Cryptography.SHA256]::Create()
$hashStream = [IO.File]::OpenRead($outputFile)
try { Write-Output ('SHA256 ' + [BitConverter]::ToString($hashAlgorithm.ComputeHash($hashStream)).Replace('-','').ToLowerInvariant()) }
finally { $hashStream.Dispose(); $hashAlgorithm.Dispose() }

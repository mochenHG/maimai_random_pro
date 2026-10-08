import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const palette = JSON.parse(readFileSync(new URL('../design/palette.json', import.meta.url), 'utf8'))
const vars = mode => Object.entries(palette[mode]).map(([key,value]) => `--${key}:${value}`).join(';')
writeFileSync(new URL('../src/palette.generated.css',import.meta.url), `/* Generated from design/palette.json. */\n:root{${vars('light')}}\n:root[data-theme=dark]{${vars('dark')}}\n.launcher-preview,.launcher-window{${vars('light')}}\n.launcher-preview.is-dark,.launcher-window.is-dark{${vars('dark')}}\n`)
// Chart colors are semantic data, separate from the grayscale application palette.
const difficulties = JSON.parse(readFileSync(new URL('../design/difficulty-colors.json', import.meta.url), 'utf8'))
writeFileSync(new URL('../src/difficulty.generated.css', import.meta.url), `/* Generated from design/difficulty-colors.json. */\n${Object.entries(difficulties).map(([name,colors])=>`.difficulty-${name},.song-difficulty-${name}{--diff:${colors.fill};--diff-ink:${colors.ink}}`).join('\n')}\n`)
const color = hex => {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16))
  return `Color.FromArgb(${hex.length === 9 ? parseInt(hex.slice(7,9),16)+',' : ''}${rgb.join(',')})`
}
const fields = {Background:'bg',Ink:'ink',Muted:'muted',Surface:'surface',Panel:'lens-fill',Field:'lens-field',Primary:'primary-fill',PrimaryInk:'primary-ink',PrimaryHover:'primary-hover',Line:'line'}
const generated = `// Generated from design/palette.json.\nusing System.Drawing;\nsealed class LauncherPalette {\n${Object.keys(fields).map(k=>` internal Color ${k};`).join('\n')}\n internal static LauncherPalette For(bool dark) { return dark ? new LauncherPalette { ${Object.entries(fields).map(([k,v])=>`${k}=${color(palette.dark[v])}`).join(',')} } : new LauncherPalette { ${Object.entries(fields).map(([k,v])=>`${k}=${color(palette.light[v])}`).join(',')} }; }\n}\n`
writeFileSync(new URL('../desktop/Palette.generated.cs',import.meta.url),generated)
console.log(`Shared palettes updated: ${fileURLToPath(new URL('../design/palette.json',import.meta.url))}`)

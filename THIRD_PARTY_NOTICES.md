# Third-party notices

The portable executable embeds Node.js and ws. Node.js and its bundled third-party software notices are included in `licenses/Node-LICENSE.txt`. ws's MIT license is included in `node_modules/ws/LICENSE` inside the runtime bundle.

The built frontend uses React / React DOM (MIT), Zustand (MIT), Lucide icons (ISC), and SheetJS Community Edition (Apache-2.0). Their corresponding license files are collected into `licenses/` in the source and portable runtime distribution.

Motion interaction concepts reference [React Bits](https://reactbits.dev/): Bounce Cards, Split Text, Tilted Card, Click Spark, Counter and Pill Nav. The implementation in this project is written for this application using CSS and browser APIs; no React Bits Pro assets are included.

The v3.6 interaction update also references [Morphicons](https://www.morphicons.com/showcase) for stateful SVG stroke transitions and [Rare UI](https://github.com/swamimalode07/rare-ui) for navigation and menu motion. The small icon profiles, bounded frame scheduler, measured navigation indicator and CSS transitions are independently implemented for this application. Neither library's component source, runtime, branding, or paid assets are bundled.

The maimai song metadata comes from the public [lxns API](https://maimai.lxns.net/api/v0/maimai/song/list), with a snapshot fetched on 2026-10-06. Song titles, chart data and remotely loaded jacket artwork retain their respective rights. Jacket images are not bundled into the executable or source package.


## Additional visual reference (v2.6)

[Liquid Glass WebGL](https://github.com/martin65536/liquid-glass-webgl), published under Apache-2.0, was consulted for glass controls, toggle motion and navigation treatment. This project implements the treatment in its existing DOM/CSS/SVG renderer; no complete external renderer or demo bundle was incorporated.

## QR Code generation (v3.6)

[Project Nayuki QR Code generator](https://github.com/nayuki/QR-Code-generator/blob/master/typescript-javascript/qrcodegen.ts) is included as a vendored TypeScript module in `src/vendor/qrcodegen.ts` under its MIT license. The upstream copyright and license header is retained, with only an ES module export added. License text is also copied to `licenses/QR-Code-generator-LICENSE.txt`. It generates QR codes entirely locally; no remote QR generation service is used. The generated QR component is loaded on demand.

Vendored module SHA-256 after the export adaptation: `646D93111EEE12F5A29867FDCDD0D4C6D838BCAEA5CE19A8A06290D48C3D7868`.

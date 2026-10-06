# Third-party notices

The portable executable embeds Node.js and ws. Node.js and its bundled third-party software notices are included in `licenses/Node-LICENSE.txt`. ws's MIT license is included in `node_modules/ws/LICENSE` inside the runtime bundle.

The built frontend uses React / React DOM (MIT), Zustand (MIT), Lucide icons (ISC), and SheetJS Community Edition (Apache-2.0). Their corresponding license files are collected into `licenses/` in the source and portable runtime distribution.

Motion interaction concepts reference [React Bits](https://reactbits.dev/): Bounce Cards, Split Text, Tilted Card, Click Spark, Counter and Pill Nav. The implementation in this project is written for this application using CSS and browser APIs; no React Bits Pro assets are included.

The maimai song metadata comes from the public [lxns API](https://maimai.lxns.net/api/v0/maimai/song/list), with a snapshot fetched on 2026-10-06. Song titles, chart data and remotely loaded jacket artwork retain their respective rights. Jacket images are not bundled into the executable or source package.

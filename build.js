const fs = require("fs");
let h = fs.readFileSync("src/shell.html", "utf8");
h = h.replace("%%STYLE%%", fs.readFileSync("src/style.css", "utf8"));
h = h.replace("%%SCRIPT%%", fs.readFileSync("src/game.js", "utf8"));
fs.writeFileSync("index.html", h);
console.log(`Built index.html (${h.split("\n").length} lines)`);

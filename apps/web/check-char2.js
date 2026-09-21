const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\products\\page.tsx";
const c = fs.readFileSync(path, "utf8");
const idx = c.indexOf("isFeatured ?");
if (idx === -1) {
  console.log("marker not found");
} else {
  const slice = c.slice(idx, idx + 40);
  console.log(JSON.stringify(slice));
  for (const ch of slice) {
    console.log(ch, "U+" + ch.codePointAt(0).toString(16).padStart(4, "0"));
  }
}

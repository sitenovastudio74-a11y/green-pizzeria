const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\components\\Footer.tsx";
const raw = fs.readFileSync(path, "utf8");
const idx = raw.indexOf("00000");
if (idx === -1) {
  console.log("00000 not found at all in the file.");
} else {
  console.log(JSON.stringify(raw.slice(idx - 30, idx + 30)));
}

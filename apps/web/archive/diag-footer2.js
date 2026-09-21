const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\components\\Footer.tsx";
const raw = fs.readFileSync(path, "utf8");

console.log("Has CRLF:", raw.includes("\r\n"));

const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(eol);

const target = "<p>+91 00000 00000</p>";
const idx = lines.findIndex((l) => l.trim() === target);
console.log("Found at index:", idx);

if (idx === -1) {
  // Show every line that contains "00000" along with its exact JSON representation
  lines.forEach((l, i) => {
    if (l.includes("00000")) {
      console.log("Line " + i + ": " + JSON.stringify(l));
      console.log("Trimmed: " + JSON.stringify(l.trim()));
      console.log("Trimmed === target:", l.trim() === target);
    }
  });
}

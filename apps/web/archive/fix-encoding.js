const fs = require("fs");

const filePath = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\order-confirmation\\[orderId]\\page.tsx";
const backupPath = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\order-confirmation-page-encoding.tsx.bak";

// Read as latin1 to get the raw corrupted bytes, since the file was
// UTF-8 content that got re-saved through a latin1/cp1252 pass somewhere.
const rawBuffer = fs.readFileSync(filePath);
const raw = rawBuffer.toString("utf8");

const backupOk = fs.existsSync(filePath);
if (!backupOk) {
  console.log("PATCH NOT APPLIED. File not found.");
  process.exit(1);
}

const hasCorruption = raw.includes("âœ“") || raw.includes("â€”");

if (!hasCorruption) {
  console.log("No corruption markers (\u00e2\u0153\u201c or \u00e2\u20ac\u201d) found. File may already be fixed, or uses different content. No changes made.");
  process.exit(0);
}

let fixed = raw
  .split("âœ“").join("\u2713")   // checkmark
  .split("â€”").join("\u2014"); // em dash

fs.writeFileSync(backupPath, rawBuffer);
// Write back as plain UTF-8, no BOM
fs.writeFileSync(filePath, fixed, { encoding: "utf8" });

console.log("PATCH APPLIED SUCCESSFULLY.");
console.log("Backup saved at: " + backupPath);
console.log("");
console.log("Replaced corrupted checkmark and em-dash sequences with correct UTF-8 characters.");

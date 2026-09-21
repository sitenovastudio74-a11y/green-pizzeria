const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\account\\page.tsx";
const content = fs.readFileSync(path, "utf8");

const hasCRLF = content.includes("\r\n");
const hasLFOnly = content.includes("\n") && !hasCRLF;
console.log("Contains \\r\\n:", hasCRLF);
console.log("Contains bare \\n only:", hasLFOnly);

function showAround(label, needle) {
  const idx = content.indexOf(needle);
  if (idx === -1) {
    console.log(`${label}: needle not found at all: "${needle}"`);
    return;
  }
  console.log(`--- ${label} ---`);
  console.log(JSON.stringify(content.slice(idx - 20, idx + 150)));
  console.log("");
}

showAround("apiFetch import", "import { apiFetch }");
showAround("View receipt", "View receipt</Link>");
showAround("Change password card", "Change password");

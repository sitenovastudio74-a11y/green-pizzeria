const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\track-order\\[orderId]\\page.tsx";
const content = fs.readFileSync(path, "utf8");

function showSlice(label, needleStart) {
  const idx = content.indexOf(needleStart);
  if (idx === -1) {
    console.log(`${label}: could not even find starting marker "${needleStart}"`);
    return;
  }
  const slice = content.slice(idx, idx + 250);
  console.log(`--- ${label} (raw JSON to reveal hidden chars) ---`);
  console.log(JSON.stringify(slice));
  console.log("");
}

showSlice("PICKUP_STEPS block", "const PICKUP_STEPS");
showSlice("DELIVERED case block", "case \"DELIVERED\":");

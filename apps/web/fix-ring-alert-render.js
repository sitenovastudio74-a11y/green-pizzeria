const fs = require("fs");
const file = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\layout.tsx";
const backup = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\admin-layout-ring-alert-2.tsx.bak";

let text = fs.readFileSync(file, "utf8");

if (text.includes("<OrderRingAlert />")) {
  console.log("Already applied, nothing changed");
  process.exit(0);
}

const anchor = `  return (
    <div className="w-full min-w-0">
      <div className="w-full min-w-0 overflow-x-auto border-b border-dark/10 bg-cream-soft">`;

const count = text.split(anchor).length - 1;

if (count !== 1) {
  console.log(`Anchor found ${count} times (expected 1). Nothing changed.`);
  process.exit(0);
}

fs.copyFileSync(file, backup);

const replacement = `  return (
    <div className="w-full min-w-0">
      <OrderRingAlert />
      <div className="w-full min-w-0 overflow-x-auto border-b border-dark/10 bg-cream-soft">`;

text = text.replace(anchor, replacement);
fs.writeFileSync(file, text, "utf8");

console.log("Done: <OrderRingAlert /> now rendered in admin/layout.tsx. Backup: " + backup);

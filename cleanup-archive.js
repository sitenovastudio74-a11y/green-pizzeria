const fs = require("fs");
const path = require("path");

const roots = [
  "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web",
  "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\api",
];

let totalMoved = 0;
const report = [];

for (const root of roots) {
  const archiveDir = path.join(root, "archive");
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;

    const isBackup = name.endsWith(".bak");
    const isScript =
      /^(patch|create|diag|fix|upload|delete)-.*\.js$/i.test(name) ||
      /^(patch|create|diag|fix|upload|delete)_.*\.js$/i.test(name);

    if (isBackup || isScript) {
      const srcPath = path.join(root, name);
      const destPath = path.join(archiveDir, name);
      try {
        fs.renameSync(srcPath, destPath);
        totalMoved++;
        report.push(path.relative("C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria", srcPath));
      } catch (err) {
        report.push("FAILED to move " + name + ": " + err.message);
      }
    }
  }
}

console.log("Moved " + totalMoved + " file(s) to archive/ folders.");
console.log("");
console.log("Details:");
report.forEach((r) => console.log(" - " + r));
console.log("");
console.log("Archive locations:");
console.log(" - apps\\web\\archive\\");
console.log(" - apps\\api\\archive\\");
console.log("");
console.log("Nothing inside app/, src/, or any other source folder was touched.");

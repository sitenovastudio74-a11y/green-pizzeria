const fs = require("fs");
const path = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\products\\page.tsx";
const c = fs.readFileSync(path, "utf8");
const idx = c.indexOf("Featured");
console.log(JSON.stringify(c.slice(idx - 20, idx + 15)));

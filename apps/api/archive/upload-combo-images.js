const fs = require("fs");
const path = require("path");

const API = "http://localhost:4000";
const PRODUCTS_DIR = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\api\\uploads\\products";

const IMAGE_MAP = {
  "Double Boat Combo": "1789599702916-677691941.png",
  "The Napoli Trio": "1789599794243-719309899.png",
  "The Italian Duo (12 inches)": "1789599747614-134918074.png",
};

async function main() {
  // Step 1: login as admin
  const loginRes = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "test@example.com", password: "newpass456" }),
  });
  if (!loginRes.ok) {
    console.log("LOGIN FAILED:", await loginRes.text());
    process.exit(1);
  }
  const setCookieHeaders = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")];
  const cookieHeader = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
  console.log("Logged in. Cookies captured.");

  // Step 2: fetch admin combo list to get IDs
  const combosRes = await fetch(API + "/combos/admin/all", {
    headers: { Cookie: cookieHeader },
  });
  if (!combosRes.ok) {
    console.log("FAILED TO FETCH COMBOS:", await combosRes.text());
    process.exit(1);
  }
  const combos = await combosRes.json();
  console.log("Found " + combos.length + " combos.");

  for (const combo of combos) {
    const imageFile = IMAGE_MAP[combo.name];
    if (!imageFile) {
      console.log("SKIP (no mapping): " + combo.name);
      continue;
    }
    const imagePath = path.join(PRODUCTS_DIR, imageFile);
    if (!fs.existsSync(imagePath)) {
      console.log("SKIP (file not found): " + combo.name + " -> " + imagePath);
      continue;
    }

    const fileBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuffer], { type: "image/png" });

    const form = new FormData();
    form.append("image", blob, imageFile);

    const patchRes = await fetch(API + "/combos/" + combo.id, {
      method: "PATCH",
      headers: { Cookie: cookieHeader },
      body: form,
    });

    if (patchRes.ok) {
      const updated = await patchRes.json();
      console.log("OK: " + combo.name + " -> imageUrl = " + updated.imageUrl);
    } else {
      console.log("FAILED: " + combo.name + " -> " + (await patchRes.text()));
    }
  }
}

main().catch((err) => {
  console.error("SCRIPT ERROR:", err);
  process.exit(1);
});

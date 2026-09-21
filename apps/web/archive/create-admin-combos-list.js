const fs = require("fs");

const dirPath = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\combos";
fs.mkdirSync(dirPath, { recursive: true });

const filePath = dirPath + "\\page.tsx";

const content = `"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "../../login/page";
import { apiFetch } from "../../lib/api";

type ComboSlot = {
  id: string;
  label: string;
  selectCount: number;
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isEligibleForCoupons: boolean;
  isActive: boolean;
  sortOrder: number;
  slots: ComboSlot[];
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminCombosPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCombos = async () => {
    const r = await apiFetch("/combos/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load combos."));
    const data: Combo[] = await r.json();
    setCombos(data);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    apiFetch("/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not verify access.");
        return r.json();
      })
      .then((profile) => {
        if (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN") {
          setAllowed(true);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (checking || !allowed) return;
    loadCombos()
      .catch((err) => setError(err.message || "Could not load combos."))
      .finally(() => setLoading(false));
  }, [checking, allowed]);

  const handleToggleActive = async (combo: Combo) => {
    setBusyId(combo.id);
    setError(null);
    try {
      const form = new FormData();
      form.append("isActive", String(!combo.isActive));
      const r = await apiFetch(\`/combos/\${combo.id}\`, {
        method: "PATCH",
        body: form,
      });
      if (!r.ok) throw new Error(await readError(r, "Could not update combo."));
      await loadCombos();
    } catch (err: any) {
      setError(err.message || "Could not update combo.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (combo: Combo) => {
    if (!window.confirm(\`Delete "\${combo.name}"? This cannot be undone.\`)) return;
    setBusyId(combo.id);
    setError(null);
    try {
      const r = await apiFetch(\`/combos/\${combo.id}\`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete combo."));
      await loadCombos();
    } catch (err: any) {
      setError(err.message || "Could not delete combo.");
    } finally {
      setBusyId(null);
    }
  };

  if (checking || (allowed && loading)) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Combos / Offers</h1>
        <Link
          href="/admin/combos/new"
          className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          + New combo
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {combos.length === 0 && (
        <p className="text-sm text-muted">No combos yet. Create your first one.</p>
      )}

      {combos.map((combo) => (
        <div key={combo.id} className="border rounded-lg p-4 mb-4 flex gap-4">
          <div className="w-20 h-20 rounded-lg bg-dark/5 overflow-hidden shrink-0 flex items-center justify-center text-lg font-medium text-muted">
            {combo.imageUrl ? (
              <img
                src={\`http://localhost:4000\${combo.imageUrl}\`}
                alt={combo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              combo.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="font-medium truncate">{combo.name}</h2>
              <span
                className={
                  "text-xs font-medium px-2 py-0.5 rounded-full shrink-0 " +
                  (combo.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-dark/10 text-muted")
                }
              >
                {combo.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-muted mb-1">Rs. {combo.price}</p>
            <p className="text-xs text-muted mb-3">
              {combo.slots.length} slot{combo.slots.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-4 text-sm">
              <Link href={\`/admin/combos/\${combo.id}\`} className="text-green-600 font-medium">
                Edit
              </Link>
              <button
                onClick={() => handleToggleActive(combo)}
                disabled={busyId === combo.id}
                className="text-green-600 font-medium"
              >
                {combo.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => handleDelete(combo)}
                disabled={busyId === combo.id}
                className="text-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, { encoding: "utf8" });
console.log("CREATED: " + filePath);

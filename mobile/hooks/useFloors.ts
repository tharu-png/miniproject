// hooks/useFloors.ts
// Real-time Firestore listener for floors in a home

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Floor } from "../types";

export function useFloors(homeId: string) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId) return;

    const ref = collection(db, "homes", homeId, "floors");
    const q = query(ref, orderBy("order", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Floor[];
        setFloors(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [homeId]);

  return { floors, loading, error };
}

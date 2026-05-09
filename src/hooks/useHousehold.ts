"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { saveHouseholdId } from "@/lib/utils";

export function useHousehold(householdId: string) {
  const { household, categories, setHousehold, setCategories } = useAppStore();

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();

    async function load() {
      try {
        const { data: h } = await supabase
          .from("households")
          .select("*")
          .eq("id", householdId)
          .single();

        if (h) {
          setHousehold(h);
          saveHouseholdId(h.id);
        }

        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .eq("household_id", householdId)
          .order("type")
          .order("name");

        setCategories(cats ?? []);
      } catch {
        // Supabase 미설정 시 무시
      }
    }

    load();
  }, [householdId, setHousehold, setCategories]);

  return { household, categories };
}

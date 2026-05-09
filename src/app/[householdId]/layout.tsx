"use client";


import { BottomNav } from "@/components/layout/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { useHousehold } from "@/hooks/useHousehold";

function HouseholdInitializer({ householdId }: { householdId: string }) {
  useHousehold(householdId);
  return null;
}

export default function HouseholdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { householdId: string };
}) {
  const { householdId } = params;

  return (
    <>
      <HouseholdInitializer householdId={householdId} />
      <ToastContainer />
      <main className="pb-28">{children}</main>
      <BottomNav />
    </>
  );
}

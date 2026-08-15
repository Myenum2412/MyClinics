"use client";

import { useCallback, useRef, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { BillingView } from "@/components/billing-view";
import { BillingForm } from "@/components/billing-form";
import { ServicesView, type Service } from "@/components/services-view";
import type { Bill } from "@/components/billing-table";
import type { PatientPick } from "@/components/patient-picker";
import type { StatsItem } from "@/lib/stats";
import { ReceiptText, PlusIcon, StethoscopeIcon } from "lucide-react";

export function BillingTabs({
  initialBills,
  stats,
  patients,
  services,
}: {
  initialBills: Bill[];
  stats?: StatsItem[];
  patients?: PatientPick[];
  services: Service[];
}) {
  const [tab, setTab] = useState("bills");
  const refetchBills = useRef<(() => Promise<void>) | null>(null);

  const handleRefetchReady = useCallback(
    (refetch: () => Promise<void>) => {
      refetchBills.current = refetch;
    },
    []
  );

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v ?? "bills")}>
      <TabsList className="mb-4 ml-1">
        <TabsTrigger value="bills">
          <ReceiptText className="size-4" aria-hidden="true" />
          Bills
        </TabsTrigger>
        <TabsTrigger value="new">
          <PlusIcon className="size-4" aria-hidden="true" />
          New Bill
        </TabsTrigger>
        <TabsTrigger value="services">
          <StethoscopeIcon className="size-4" aria-hidden="true" />
          Services
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bills" keepMounted>
        <BillingView
          initialBills={initialBills}
          stats={stats}
          onReady={handleRefetchReady}
        />
      </TabsContent>

      <TabsContent value="new">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="rounded-xl border border-border bg-card p-4">
            <BillingForm
              patients={patients}
              services={services}
              onCancel={() => setTab("bills")}
              onSaved={async () => {
                await refetchBills.current?.();
                setTab("bills");
              }}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="services">
        <ServicesView initialServices={services} />
      </TabsContent>
    </Tabs>
  );
}

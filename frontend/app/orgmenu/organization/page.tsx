"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Organization {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
}

export default function OrgInfoPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organization", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrg(data?.company ?? null))
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : !org ? (
            <p className="text-sm text-muted-foreground">No organization details found.</p>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{org.name ?? ""}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{org.email ?? ""}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{org.phone ?? ""}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Website</dt>
                <dd>{org.website ?? ""}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd>{org.address ?? ""}</dd>
              </div>
              {org.description && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="mt-1">{org.description}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

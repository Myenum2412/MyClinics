"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Render } from "@puckeditor/core";
import { Loader2 } from "lucide-react";
import { getPublicClinicWebsite } from "@/lib/clinic-api";
import { isGrapesWebsiteData, type GrapesWebsiteData } from "@/lib/website";
import {
  isPageBuilderData,
  pageBuilderConfig,
  type PageBuilderData,
} from "@/components/clinic/page-builder/config";

type SiteState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "puck"; data: PageBuilderData; clinicName: string }
  | { status: "legacy"; data: GrapesWebsiteData; clinicName: string };

export default function ClinicPublicSitePage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [state, setState] = useState<SiteState>({ status: "loading" });

  useEffect(() => {
    if (!clinicId) return;
    let active = true;

    getPublicClinicWebsite(clinicId)
      .then((site) => {
        if (!active) return;
        const data = site.websitePage.data;

        if (isPageBuilderData(data)) {
          setState({ status: "puck", data, clinicName: site.clinic.name });
        } else if (isGrapesWebsiteData(data)) {
          // Pages published before the Puck builder are still served until
          // the clinic publishes a new Puck page.
          setState({ status: "legacy", data, clinicName: site.clinic.name });
        } else {
          setState({ status: "missing" });
          return;
        }

        document.title = site.clinic.name;
        if (site.clinic.description) {
          const meta = document.querySelector('meta[name="description"]');
          if (meta) meta.setAttribute("content", site.clinic.description);
        }
      })
      .catch(() => {
        if (active) setState({ status: "missing" });
      });

    return () => {
      active = false;
    };
  }, [clinicId]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading website…</p>
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">Website not published yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This clinic has not published its website. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "puck") {
    return (
      <div className="min-h-dvh bg-background" data-clinic-site={state.clinicName}>
        <Render config={pageBuilderConfig} data={state.data} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background" data-clinic-site={state.clinicName}>
      <style
        dangerouslySetInnerHTML={{
          __html: `${state.data.css}\n.mc-shell { max-width: none; }`,
        }}
      />
      <div dangerouslySetInnerHTML={{ __html: state.data.html }} />
    </div>
  );
}

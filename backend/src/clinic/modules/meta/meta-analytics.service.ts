import type { Db, WithId } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaLeadAttributionDoc } from "@/clinic/modules/meta/meta-schema";
import { getContactRepository } from "@/clinic/modules/crm-contacts/crm-contacts.repository";

/**
 * MetaAnalyticsService — clinic-specific Meta performance analytics (section 39).
 *
 * Every metric is computed strictly from data the CRM has actually stored.
 * We NEVER report cost/CPA figures that were not retrieved from Meta — if
 * ad-cost data is unavailable the field is omitted rather than fabricated.
 */
export class MetaAnalyticsService {
  constructor(private readonly db: Db) {}

  async compute(clinicId: string): Promise<{
    totalMetaLeads: number;
    byPlatform: { facebook: number; instagram: number; unknown: number };
    byCampaign: Array<{
      campaignId: string | null;
      campaignName: string | null;
      leads: number;
      appointments: number;
      converted: number;
      conversionRate: number;
    }>;
    byAdSet: Array<{ adsetId: string | null; adsetName: string | null; leads: number }>;
    byAd: Array<{ adId: string | null; adName: string | null; leads: number }>;
    byForm: Array<{ formId: string | null; formName: string | null; leads: number }>;
    appointmentsGenerated: number;
    convertedLeads: number;
    conversionRate: number;
    costPerLead: null;
    costPerAppointment: null;
    costPerConversion: null;
  }> {
    const repo = new MetaRepository(this.db);
    const attributions = await repo.attributions().find({ clinicId }).toArray();
    const contactRepo = await getContactRepository({ clinicId } as any);
    const contacts = await contactRepo.list({ clinicId }, { createdAt: -1 }, 100000);
    const contactById = new Map<string, any>();
    for (const c of contacts) contactById.set(c.contactId, c);

    const byPlatform = { facebook: 0, instagram: 0, unknown: 0 };
    const campaignMap = new Map<string, { campaignId: string | null; campaignName: string | null; leads: number; appointments: number; converted: number }>();
    const adsetMap = new Map<string, { adsetId: string | null; adsetName: string | null; leads: number }>();
    const adMap = new Map<string, { adId: string | null; adName: string | null; leads: number }>();
    const formMap = new Map<string, { formId: string | null; formName: string | null; leads: number }>();

    let appointmentsGenerated = 0;
    let convertedLeads = 0;

    for (const a of attributions as WithId<MetaLeadAttributionDoc>[]) {
      byPlatform[a.platform] += 1;
      const lead = contactById.get(a.leadId);
      const hasAppt = Boolean(lead?.appointmentBookedAt);
      const isConverted = lead?.status === "converted";
      if (hasAppt) appointmentsGenerated += 1;
      if (isConverted) convertedLeads += 1;

      const cKey = a.campaignId ?? "unknown";
      const c = campaignMap.get(cKey) ?? {
        campaignId: a.campaignId,
        campaignName: a.campaignName,
        leads: 0,
        appointments: 0,
        converted: 0,
      };
      c.leads += 1;
      if (hasAppt) c.appointments += 1;
      if (isConverted) c.converted += 1;
      campaignMap.set(cKey, c);

      const asKey = a.adsetId ?? "unknown";
      const as = adsetMap.get(asKey) ?? { adsetId: a.adsetId, adsetName: a.adsetName, leads: 0 };
      as.leads += 1;
      adsetMap.set(asKey, as);

      const adKey = a.adId ?? "unknown";
      const ad = adMap.get(adKey) ?? { adId: a.adId, adName: a.adName, leads: 0 };
      ad.leads += 1;
      adMap.set(adKey, ad);

      const fKey = a.formId ?? "unknown";
      const f = formMap.get(fKey) ?? { formId: a.formId, formName: a.formName, leads: 0 };
      f.leads += 1;
      formMap.set(fKey, f);
    }

    const total = attributions.length;
    const rate = total > 0 ? Number(((convertedLeads / total) * 100).toFixed(2)) : 0;

    return {
      totalMetaLeads: total,
      byPlatform,
      byCampaign: [...campaignMap.values()].map((c) => ({
        ...c,
        conversionRate: c.leads > 0 ? Number(((c.converted / c.leads) * 100).toFixed(2)) : 0,
      })),
      byAdSet: [...adsetMap.values()],
      byAd: [...adMap.values()],
      byForm: [...formMap.values()],
      appointmentsGenerated,
      convertedLeads,
      conversionRate: rate,
      costPerLead: null,
      costPerAppointment: null,
      costPerConversion: null,
    };
  }
}

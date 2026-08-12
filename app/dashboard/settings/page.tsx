import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WhatsAppSessionCard } from "@/components/whatsapp-session-card";
import { SoulEditor } from "@/components/soul-editor";
import { KnowledgeEditor } from "@/components/knowledge-editor";
import { getDb } from "@/lib/db";
import { getSoul } from "@/services/ai/soul.service";
import { listKnowledgeDocuments } from "@/services/ai/knowledge.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await getDb();
  const org = await ensureDefaultOrganization(db);
  const soul = await getSoul(db, org.id);
  const documents = await listKnowledgeDocuments(db, org.id);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <WhatsAppSessionCard />

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp AI assistant instructions (soul.md)</CardTitle>
          <CardDescription>
            This is the single source of truth for the WhatsApp AI. Everything it
            says must come from here — never from general knowledge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SoulEditor
            initialContent={soul.content}
            initialFallbackReply={soul.fallbackReply}
            initialVersion={soul.version}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinic knowledge base</CardTitle>
          <CardDescription>
            Additional documents retrieved per-question and injected alongside the
            soul. Facts like location, fees and policies can live here — the AI is
            only allowed to answer from these plus the soul.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeEditor
            initialDocuments={documents.map((d) => ({
              id: d.id,
              title: d.title,
              category: d.category,
              content: d.content,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

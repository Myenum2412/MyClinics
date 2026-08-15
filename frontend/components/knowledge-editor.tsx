"use client";

import { useState } from "react";
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  ArrowPathIcon as Loader2Icon,
  PencilIcon,
  PlusIcon,
  ArrowDownTrayIcon as SaveIcon,
  TrashIcon as Trash2Icon,
  XMarkIcon as XIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

const MAX_CONTENT_LENGTH = 20_000;

export function KnowledgeEditor({ initialDocuments }: { initialDocuments: KnowledgeDoc[] }) {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>(initialDocuments);
  const [editing, setEditing] = useState<KnowledgeDoc | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("clinic");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDoc | null>(null);

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setTitle("");
    setCategory("clinic");
    setContent("");
  }

  function startEdit(doc: KnowledgeDoc) {
    setEditing(doc);
    setCreating(false);
    setTitle(doc.title);
    setCategory(doc.category);
    setContent(doc.content);
  }

  function cancel() {
    setCreating(false);
    setEditing(null);
    setTitle("");
    setCategory("clinic");
    setContent("");
  }

  async function handleSave() {
    if (!title.trim() || !content.trim() || saving) return;
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(`Content must be under ${MAX_CONTENT_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/knowledge/${editing.id}` : "/api/knowledge";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category: category.trim() || "clinic", content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the document.");
        return;
      }
      const doc: KnowledgeDoc = data.document;
      setDocuments((prev) => {
        const exists = prev.some((d) => d.id === doc.id);
        return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [...prev, doc];
      });
      toast.success(editing ? "Document updated." : "Document added.");
      cancel();
    } catch {
      toast.error("Could not save the document. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete || deleting) return;
    setDeleting(confirmDelete.id);
    try {
      const res = await fetch(`/api/knowledge/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Could not delete the document.");
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDelete.id));
      toast.success("Document deleted.");
      setConfirmDelete(null);
    } catch {
      toast.error("Could not delete the document. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  const formOpen = creating || editing !== null;

  return (
    <>
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          The WhatsApp AI answers questions only from these documents. If none
          match a question, it replies that it couldn&apos;t find the information.
        </p>
        {!formOpen && (
          <Button variant="outline" size="sm" onClick={startCreate}>
            <PlusIcon />
            Add document
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Location, Consultation fees"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kb-category">Category</Label>
              <Input
                id="kb-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="clinic"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kb-content">Content</Label>
            <Textarea
              id="kb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-40 resize-y font-mono text-xs leading-relaxed"
              placeholder="Exact information the AI is allowed to give. Keep it factual and specific."
            />
            <span
              className={
                content.length > MAX_CONTENT_LENGTH
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} characters
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              <XIcon />
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={!title.trim() || !content.trim() || saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {saving ? "Saving…" : editing ? "Save changes" : "Add document"}
            </Button>
          </div>
        </div>
      )}

      {documents.length === 0 && !formOpen ? (
        <p className="text-sm text-muted-foreground">
          No knowledge-base documents yet. Add one to let the WhatsApp AI answer
          factual questions.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{doc.title}</span>
                    {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                    {doc.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(doc)} aria-label={`Edit ${doc.title}`}>
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(doc)}
                    disabled={deleting === doc.id}
                    aria-label={`Delete ${doc.title}`}
                  >
                    {deleting === doc.id ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && !deleting && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Delete document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {confirmDelete?.title}
                </span>{" "}
                from the knowledge base? The WhatsApp AI will no longer be able to
                answer from it. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={Boolean(deleting)}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

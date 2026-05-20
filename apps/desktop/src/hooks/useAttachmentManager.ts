import { useMemo, useState } from 'react';
import { Attachment, deleteFile, resolveAttachmentStoragePath } from '@nexus-it/shared';

const getAttachmentKey = (attachment: Attachment): string =>
  attachment.storagePath || attachment.url || attachment.id;

export function useAttachmentManager(initialAttachments: Attachment[]) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [pendingDeleteAttachments, setPendingDeleteAttachments] = useState<Attachment[]>([]);

  // Stable on mount — forms are always freshly mounted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialKeys = useMemo(() => new Set(initialAttachments.map(getAttachmentKey)), []);

  const isInitialAttachment = (attachment: Attachment) =>
    initialKeys.has(getAttachmentKey(attachment));

  const cleanupAttachmentsFromStorage = async (toDelete: Attachment[]) => {
    if (toDelete.length === 0) return;
    const results = await Promise.allSettled(
      toDelete.map(async (a) => {
        const path = resolveAttachmentStoragePath(a);
        if (path) await deleteFile(path);
      })
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) console.error(`Error deleting ${failed} attachment(s) from storage`);
  };

  const handleAttachmentsChange = (nextAttachments: Attachment[]) => {
    const removed = attachments.filter(
      (cur) => !nextAttachments.some((next) => getAttachmentKey(next) === getAttachmentKey(cur))
    );

    setAttachments(nextAttachments);
    if (removed.length === 0) return;

    const persisted = removed.filter(isInitialAttachment);
    const transient = removed.filter((a) => !isInitialAttachment(a));

    if (persisted.length > 0) {
      setPendingDeleteAttachments((prev) => {
        const byKey = new Map(prev.map((a) => [getAttachmentKey(a), a]));
        nextAttachments.forEach((a) => byKey.delete(getAttachmentKey(a)));
        persisted.forEach((a) => byKey.set(getAttachmentKey(a), a));
        return Array.from(byKey.values());
      });
    }

    if (transient.length > 0) void cleanupAttachmentsFromStorage(transient);
  };

  // Call on form cancel: cleans up files uploaded but never saved
  const cancelCleanup = async () => {
    const transient = attachments.filter((a) => !isInitialAttachment(a));
    await cleanupAttachmentsFromStorage(transient);
  };

  // Call after successful submit: deletes server-side removed attachments
  const flushPendingDeletes = async () => {
    await cleanupAttachmentsFromStorage(pendingDeleteAttachments);
    setPendingDeleteAttachments([]);
  };

  return {
    attachments,
    setAttachments,
    handleAttachmentsChange,
    cleanupAttachmentsFromStorage,
    cancelCleanup,
    flushPendingDeletes,
  };
}

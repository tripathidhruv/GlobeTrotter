import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  useCollaborators,
  useCurrentUserId,
  useInviteCollaborator,
  useRemoveCollaborator,
  type Collaborator,
} from "./useCollaborators";

function monogram(collab: Collaborator): string {
  const source = collab.user.name ?? collab.user.email;
  return source.slice(0, 2).toUpperCase();
}

function CollaboratorRow({
  collab,
  isOwner,
  onRequestRemove,
}: {
  collab: Collaborator;
  isOwner: boolean;
  onRequestRemove: (collab: Collaborator) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rail/40 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-rail bg-board font-mono text-[11px] text-platform">
          {monogram(collab)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{collab.user.name ?? collab.user.email}</p>
          {collab.user.name && (
            <p className="truncate font-mono text-[11px] text-mute">{collab.user.email}</p>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="rounded-sm border border-signal px-2 py-0.5 font-mono text-[10px] uppercase tracking-board text-signal">
          {collab.role}
        </span>
        {isOwner && (
          <button
            type="button"
            onClick={() => onRequestRemove(collab)}
            className="font-mono text-[10px] uppercase tracking-board text-mute transition-colors hover:text-signal"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function CollaboratorsPanel({
  tripId,
  ownerId,
  open,
  onClose,
}: {
  tripId: string;
  ownerId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const currentUserId = useCurrentUserId();
  const isOwner = !!currentUserId && currentUserId === ownerId;

  const { data: collaborators, isLoading, isError } = useCollaborators(tripId);
  const invite = useInviteCollaborator(tripId);
  const remove = useRemoveCollaborator(tripId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Collaborator | null>(null);

  if (!open) return null;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => setEmail(""),
        onError: (err) => {
          try {
            const parsed = JSON.parse((err as Error).message);
            setInviteError(typeof parsed === "string" ? parsed : "Couldn't send that invite.");
          } catch {
            setInviteError((err as Error).message || "Couldn't send that invite.");
          }
        },
      }
    );
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    remove.mutate(pendingRemove.userId, {
      onSuccess: () => setPendingRemove(null),
    });
  }

  const panelBody = (
    <div className="w-full max-w-md border-l border-rail bg-platform p-6 shadow-none">
      <div className="flex items-center justify-between border-b border-rail pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-board text-signal">Roster</p>
          <h2 className="font-display text-2xl uppercase tracking-board text-ink">
            Collaborators
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close collaborators panel"
          className="font-mono text-xs uppercase tracking-board text-mute transition-colors hover:text-signal"
        >
          Close
        </button>
      </div>

      <div className="mt-4">
        {isLoading && <p className="text-sm text-mute">Loading roster...</p>}
        {isError && (
          <p className="text-sm text-mute">Couldn't load collaborators right now.</p>
        )}
        {!isLoading && !isError && (!collaborators || collaborators.length === 0) && (
          <p className="text-sm text-mute">No collaborators yet.</p>
        )}
        {collaborators && collaborators.length > 0 && (
          <div>
            {collaborators.map((c) => (
              <CollaboratorRow
                key={c.id}
                collab={c}
                isOwner={isOwner}
                onRequestRemove={setPendingRemove}
              />
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <form onSubmit={handleInvite} className="mt-6 border-t border-rail pt-5">
          <p className="font-mono text-xs uppercase tracking-board text-mute">Invite a rider</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="min-w-0 flex-1 rounded-sm border border-rail bg-platform px-3 py-2 text-sm text-ink outline-none focus-visible:border-transit"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="rounded-sm border border-rail bg-platform px-2 py-2 font-mono text-xs uppercase tracking-board text-ink outline-none focus-visible:border-transit"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={invite.isPending}
              aria-busy={invite.isPending}
              className="rounded-sm bg-signal px-4 py-2 font-display text-xs uppercase tracking-board text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {invite.isPending ? "Inviting..." : "Invite"}
            </button>
          </div>
          {inviteError && (
            <p role="alert" className="mt-2 text-xs text-signal">
              {inviteError}
            </p>
          )}
        </form>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove collaborator?"
        description={
          pendingRemove && (
            <>
              This will remove{" "}
              <span className="text-ink">
                {pendingRemove.user.name ?? pendingRemove.user.email}
              </span>{" "}
              from this trip.
            </>
          )
        }
        confirmLabel="Confirm remove"
        pendingLabel="Removing..."
        isConfirming={remove.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/60">
      {reduce ? (
        panelBody
      ) : (
        <AnimatePresence>
          <motion.div
            key="collab-panel"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {panelBody}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

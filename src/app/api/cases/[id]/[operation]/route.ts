import { z } from "zod";
import { authorize, handle, readJson, requireOrigin } from "@/lib/http";
import {
  analyze,
  decide,
  execute,
  reconcile,
  refreshCase,
  saveMessageDraft,
} from "@/lib/workflow";
import { AppError } from "@/lib/errors";
import { messageDraftSchema } from "@/lib/domain";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; operation: string }> },
) {
  return handle(async () => {
    requireOrigin(request);
    const actor = authorize(request);
    const { id, operation } = await context.params;
    if (operation === "analyze") return analyze(id);
    if (operation === "refresh") return refreshCase(id);
    if (operation === "reconcile") return reconcile(id);
    if (operation === "draft")
      return saveMessageDraft(
        id,
        messageDraftSchema.parse(await readJson(request)),
        actor,
      );
    if (!["approve", "reject", "execute"].includes(operation))
      throw new AppError(404, "Unknown operation");
    const { recommendationId } = z
      .object({ recommendationId: z.string().min(1).max(100) })
      .strict()
      .parse(await readJson(request));
    return operation === "execute"
      ? execute(id, recommendationId)
      : decide(
          id,
          recommendationId,
          operation === "approve" ? "APPROVED" : "REJECTED",
          actor,
        );
  });
}

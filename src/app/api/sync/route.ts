import { z } from "zod";
import { authorize, handle, readJson, requireOrigin } from "@/lib/http";
import { config } from "@/lib/config";
import { paypal } from "@/lib/paypal";
import { saveDispute } from "@/lib/store";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  return handle(async () => {
    requireOrigin(request);
    authorize(request);
    if (config().mode !== "sandbox")
      throw new AppError(400, "Sync is only available in sandbox mode");
    const { id } = z
      .object({
        id: z
          .string()
          .regex(/^[A-Za-z0-9-]{1,255}$/)
          .optional(),
      })
      .strict()
      .parse(await readJson(request));
    if (id) {
      await saveDispute(await paypal.getDispute(id));
      return { count: 1, hasMore: false };
    }
    const list = await paypal.listDisputes();
    for (const item of list.items)
      await saveDispute(await paypal.getDispute(item.dispute_id));
    return {
      count: list.items.length,
      hasMore: list.links.some((l) => l.rel === "next"),
    };
  });
}

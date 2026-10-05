import { z } from "zod";
import { authorize, handle, readJson, requireOrigin } from "@/lib/http";
import { updatePolicy } from "@/lib/workflow";
import { policySchema } from "@/lib/domain";
export async function PUT(request: Request) {
  return handle(async () => {
    requireOrigin(request);
    authorize(request);
    const { rules, version } = z
      .object({ rules: policySchema, version: z.number().int().positive() })
      .strict()
      .parse(await readJson(request));
    return updatePolicy(rules, version);
  });
}

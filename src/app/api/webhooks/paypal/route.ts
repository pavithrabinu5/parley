import { handle, readJson } from "@/lib/http";
import { processWebhook } from "@/lib/webhook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () =>
    processWebhook(request.headers, await readJson(request, 262144)),
  );
}

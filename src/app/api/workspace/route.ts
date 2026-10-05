import { authorize, handle } from "@/lib/http";
import { workspace } from "@/lib/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    authorize(request);
    return workspace();
  });
}

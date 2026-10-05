import { authorize, handle } from "@/lib/http";
import { getCase } from "@/lib/store";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    authorize(request);
    return getCase((await context.params).id);
  });
}

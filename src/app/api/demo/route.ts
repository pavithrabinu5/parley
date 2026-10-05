import { authorize, handle, requireOrigin } from "@/lib/http";
import { seedDemo } from "@/lib/seed";
import { analyze } from "@/lib/workflow";
export async function POST(request: Request) {
  return handle(async () => {
    requireOrigin(request);
    authorize(request);
    const id = await seedDemo();
    await analyze(id);
    return { id };
  });
}

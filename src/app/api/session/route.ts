import { z } from "zod";
import { config } from "@/lib/config";
import {
  equal,
  handle,
  readJson,
  requireOrigin,
  sessionCookie,
} from "@/lib/http";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  const response = await handle(async () => {
    requireOrigin(request);
    const { token } = z
      .object({ token: z.string().max(512) })
      .strict()
      .parse(await readJson(request));
    if (config().token.length < 32)
      throw new AppError(
        503,
        "Configure a merchant access token of at least 32 characters",
      );
    if (!equal(token, config().token))
      throw new AppError(401, "Invalid access token");
    return { signedIn: true };
  });
  if (response.ok)
    response.headers.set(
      "Set-Cookie",
      `parley_session=${sessionCookie()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${config().origin.startsWith("https:") ? "; Secure" : ""}`,
    );
  return response;
}
export async function DELETE(request: Request) {
  const response = await handle(async () => {
    requireOrigin(request);
    return { signedIn: false };
  });
  if (response.ok)
    response.headers.set(
      "Set-Cookie",
      "parley_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    );
  return response;
}

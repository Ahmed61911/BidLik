// Single entrypoint for the edge-runtime container (docker/docker-compose.yml
// runs `start --main-service /home/deno/functions/main`, which treats this
// file as the sole handler for every request). Kong strips the
// /functions/v1 prefix before proxying here (see docker/kong/kong.yml), so
// pathname is just "/<function-name>[...]" — route on that.
import { handleHello } from "../hello/index.ts";
import { handleSendPush } from "../send-push/index.ts";

Deno.serve((req) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/send-push" || pathname.startsWith("/send-push/")) return handleSendPush(req);
  if (pathname === "/hello" || pathname.startsWith("/hello/")) return handleHello(req);

  return new Response("Not Found", { status: 404 });
});

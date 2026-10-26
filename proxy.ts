import { NextResponse, type NextRequest } from "next/server";

const DEV_SESSION_COOKIE = "elijah-dev-session";

export function proxy(request: NextRequest) {
  const devSessionId = process.env.NEXT_DEV_SESSION_ID;
  if (process.env.NODE_ENV !== "development" || !devSessionId) {
    return NextResponse.next();
  }

  if (request.cookies.get(DEV_SESSION_COOKIE)?.value === devSessionId) {
    return NextResponse.next();
  }

  const authCookieNames = request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  const requestHeaders = new Headers(request.headers);
  const remainingCookies = request.cookies
    .getAll()
    .filter(({ name }) => !authCookieNames.includes(name))
    .map(({ name, value }) => `${name}=${value}`);

  if (remainingCookies.length > 0) {
    requestHeaders.set("cookie", remainingCookies.join("; "));
  } else {
    requestHeaders.delete("cookie");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const name of authCookieNames) {
    response.cookies.delete(name);
  }
  response.cookies.set(DEV_SESSION_COOKIE, devSessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

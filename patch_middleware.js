const fs = require('fs');
const content = fs.readFileSync('src/middleware.ts', 'utf8');
const newContent = content.replace(
  'if (ehRotaPublica(pathname)) {',
  `const response = NextResponse.next();\n\n  // Security headers\n  response.headers.set("X-Frame-Options", "DENY");\n  response.headers.set("X-Content-Type-Options", "nosniff");\n  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");\n  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");\n  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");\n\n  if (ehRotaPublica(pathname)) {`
).replace(
  'return NextResponse.next();',
  'return response;'
).replace(
  'return NextResponse.next();',
  'return response;'
).replace(
  'return NextResponse.json({ message: "Não autenticado." }, { status: 401 });',
  'return NextResponse.json({ message: "Não autenticado." }, { status: 401, headers: response.headers });'
).replace(
  'return NextResponse.redirect(new URL("/login", req.url));',
  'const redirectResponse = NextResponse.redirect(new URL("/login", req.url));\n  redirectResponse.headers.set("X-Frame-Options", "DENY");\n  redirectResponse.headers.set("X-Content-Type-Options", "nosniff");\n  redirectResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");\n  redirectResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");\n  redirectResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");\n  return redirectResponse;'
);
fs.writeFileSync('src/middleware.ts', newContent);

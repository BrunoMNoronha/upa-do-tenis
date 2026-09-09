## 2024-05-24 - Testing Intl.DateTimeFormat
**Learning:** Using `Intl.DateTimeFormat` with Vitest can yield different formats across CI environments or local timezones, leading to flaky tests if strict string matching is used.
**Action:** When testing locale-specific output like dates in unit tests without forcing timezone configs, use Regex to match the exact format structure (e.g. `^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$`) rather than specific values to ensure cross-environment reliability.

## 2024-05-24 - Missing try/catch unhandled rejections in API route handlers
**Vulnerability:** API routes (like `src/app/api/clientes/route.ts`) lacking `try/catch` blocks can crash the Node process on unhandled promise rejections or leak raw internal stack traces and error messages from dependencies (like Prisma) to the client if an unhandled error bubbles up to the framework level without a custom error handler.
**Learning:** In Next.js App Router, unhandled errors in route handlers map to a 500 response, but in some configurations or older versions without a global error boundary they can either crash the serverless function immediately or return the raw error payload if the client requests JSON. It is safer to explicitly wrap controller logic in try/catch to ensure controlled formatting and logging.
**Prevention:** Always wrap the entire main execution block of an API route handler in a `try/catch` and return an explicit `NextResponse.json(...)` with a generic 500 message in the `catch` block. Ensure to only log the raw error securely on the server side using `console.error`.

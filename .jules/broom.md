## 2024-05-18 - Remove Unused Imports Carefully

**Learning:** Unused imports can be safely removed, particularly `React` imports from files using Next.js / React 17+ where the new JSX transform makes them redundant. Always ensure to run full format, lint, typecheck and test suite after removing dead code. In this project, running `pnpm test` successfully without PostgreSQL requires accepting that database integration tests will fail, and verifying that compilation and lint checks succeed.

**Action:** Before removing unused code, check if it's deprecated usage or genuinely dead code. After removing it, re-run `pnpm run lint` and `pnpm run typecheck` to confirm the removal didn't cause unresolved references.

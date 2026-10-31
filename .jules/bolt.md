## 2026-10-24 - Iterate once over arrays to prevent unnecessary allocations
**Learning:** Chaining map and filter array methods like `.map(...).filter(...)` or `.flatMap(...).filter(...)` over lists creates multiple passes O(k*N) and allocations.
**Action:** When filtering or mapping data, use a single `for...of` loop with an early continue or explicit boolean conditions to achieve a constant O(N) complexity to reduce GC pressure and CPU overhead in a rendering hot-path.

# Lab 1 — Peer Review Record

**Author:** Apichaya — GitHub: @Apichaya251400  
**Peer reviewer:** Pilaiwan — GitHub: @Pilaiwan3492  

## Pull Requests I authored (reviewed by my partner)

| Issue | Pull Request | Review comment received | My response |
|-------|--------------|-------------------------|-------------|
| 1. Project foundation | PR #1 | "Clear project description and stack. Very Good !" | No changes requested. Merged into `lab1-staging`. |
| 2. API health check | PR #2 | "Re-reviewed against Issue 2 acceptance criteria. Everything required for Issue 2 is now satisfied. Additional suggestion: You might consider separating changes related to Issue 4 (category fetching and UI for categories) into a dedicated PR to make the scope of work clearer and more organized." | Separated Issue 4 category logic into PR #5 as suggested, keeping Issue 2 focused strictly on health check. Merged into `lab1-staging`. |
| 3. Create and seed categories | PR #4 | "Very Good!!! All Issue 3 requirements are satisfied. Approved ?" | No changes requested. Merged into `lab1-staging`. |
| 4. Display category list | PR #5 | "The Issue 4 implementation looks correct, and the frontend/API behavior satisfies the acceptance criteria. However, the current categories.test.ts mocks Prisma and returns a hard-coded list of categories. Could you update this test to use the migrated and seeded database instead of mocking getPrisma()?" followed by "All Issue 4 requirements are satisfied. Approved ?" | Removed `mockPrisma` implementation from `categories.test.ts` and updated Supertest to test directly against the migrated & seeded PostgreSQL database. Merged into `lab1-staging`. |

## Pull Requests I reviewed for my partner

| Pull Request I reviewed | Comment I gave | Partner's response |
|-------------------------|----------------|-------------------|
| Pilaiwan3492 PR #5 — project foundation | "README.md is basically empty rn — just the header, no setup instructions at all. Could u add the setup instructions?" | Updated `README.md` with project structure and full setup instructions. Responded: "I've updated README.md with the project structure and setup instructions. Please check it out, thanks!" |
| Pilaiwan3492 PR #6 — API health check | "All checked, great work!" | Accepted approval and merged into `lab1-staging`. |
| Pilaiwan3492 PR #7 — create and seed categories | "Everything is clean. Ready to approve." | Accepted approval and merged into `lab1-staging`. |
| Pilaiwan3492 PR #8 — display category list | "The full-stack data flow from database to frontend UI works really smoothly." | Accepted approval and merged into `lab1-staging`. |

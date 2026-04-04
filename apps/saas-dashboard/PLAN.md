# saas-dashboard — Architecture Plan

## Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

## Folder Structure

```
src/app/
├── layout.tsx      # Root layout — global font, dark-mode class
├── globals.css     # Tailwind base + custom CSS variables
└── page.tsx        # Home — "Create Flash Sale" button + key display
```

## Page Spec — `page.tsx`

- **Dark-mode** styled dashboard with gradient background
- **"Create Flash Sale" button** → `POST http://localhost:4000/api/admin/events`
- On success: display `publicKey` and `secretKey` in styled cards
- On error: display error message
- Loading state while request is in-flight

## TODO (next iterations)
- [ ] Add `/dashboard` route — list all Flash Sale events (paginated)
- [ ] Add auth (Clerk / NextAuth)
- [ ] Show live queue depth via WebSocket / SSE subscription
- [ ] Add event configuration form (start time, max seats, etc.)

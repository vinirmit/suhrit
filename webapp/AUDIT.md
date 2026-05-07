# Suhrit Web Audit

## Current app findings

- The legacy app is a Vite app, but it is built on top of a generic Material UI template with many unused dependencies and abstractions.
- Backend APIs are already concentrated around a small set of endpoints, but API calls are still issued directly from page components.
- Auth token handling is weak:
  - request auth reads from both `sessionStorage` and `localStorage`
  - user details are cached in `sessionStorage`
  - login depends on a third-party OIDC client with limited local documentation
- Form validation is inconsistent and mostly handwritten inside components.
- Error handling is duplicated and often only logs to the console.
- Several components use weak typing, inline `any`, and state shapes that are reconstructed ad hoc.
- The OPD flow is split across multiple large stateful components without a central domain model or validation layer.
- Printing relies on an extra library where browser-native printing is sufficient.
- The UI shell is more complex than the product needs and brings maintenance overhead without improving core workflows.

## Security risks

- Tokens are read from `localStorage`, which increases exposure to XSS-driven token theft.
- API responses are trusted without runtime validation.
- Input validation is mostly imperative and incomplete.
- Console logging includes potentially sensitive auth and backend errors.
- Auth bootstrapping is tightly coupled to the legacy OIDC storage shape.

## Refactoring strategy

- Replace template-based UI with a lean custom layout and reusable primitives.
- Centralize all backend access in typed `services/` modules with a single `fetch` wrapper.
- Use Zod for form validation and response parsing at the application boundary.
- Keep route paths, backend endpoints, payload names, and queue transitions unchanged.
- Keep session data in memory and `sessionStorage` only; read legacy `localStorage` token shape only as a backward-compatibility fallback.
- Use browser-native printing and route state preservation instead of extra dependencies.

## Key assumption

- The existing Cognito/OIDC redirect flow is environment-specific and not fully inferable from the checked-in code alone.  
  This v2 keeps bearer-token compatibility with the existing backend and supports environment-provided login/logout URLs through `VITE_LOGIN_URL` and `VITE_LOGOUT_URL`.


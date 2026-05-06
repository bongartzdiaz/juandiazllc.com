---
name: test-write
description: Schrijf unit/integration/e2e tests voor een file, function, component of API-route. Stack-aware: Vitest (PT/funnel/HMB), Playwright (e2e), MSW (mock fetch), Testing Library. Output is werkbare test-suite met setup. Gebruik wanneer Juan vraagt "schrijf tests voor X", bij PR-prep, of bij refactor (regression-protectie).
trigger: /test-write
---

# /test-write

Tests schrijven volgens de stack — geen test-framework keuze-paralyse, gewoon de juiste defaults.

## Usage

```
/test-write <pad>
/test-write <pad> --type <unit|integration|e2e|a11y>
/test-write <pad> --stack <pt|hmb|funnel|philly|generic>
/test-write <pad> --focus "<csv>"            # bv "happy-path,validation,server-error"
```

## Default-keuzes per stack

| Stack | Unit/Integration | E2E | Mock-fetch |
|---|---|---|---|
| PT (Vite) | Vitest + Testing Library | Playwright | MSW |
| funnel-app (Next 14) | Vitest + Testing Library | Playwright | MSW |
| HMB Dashboard (Next) | Vitest + Testing Library | Playwright | MSW |
| Philly (Next 16) | Vitest + Testing Library | Playwright | MSW |
| Edge functions (Deno) | `Deno.test` + `assertEquals` | n.v.t. | fetch-mock |

## Hard rules

- **Test gedrag, niet implementatie** — geen `expect(useState).toHaveBeenCalled()`
- **Arrange/Act/Assert** structuur, blank lines tussen secties
- **1 logische assertion per test** — niet 5 unrelated checks samen
- **Beschrijvende test-namen** — `"submits form when all fields are valid"` niet `"test1"`
- **Mock op de boundary** — fetch via MSW, niet de service-functie zelf
- **Geen sleep/wait-arbitrary** — `findBy*` of `waitFor` met conditions
- **Cleanup tussen tests** — Testing Library doet auto-cleanup, MSW reset handlers
- **Geen network in unit/integration** — alles mocked
- **Real DB of staging in e2e** — Playwright tegen staging-omgeving

## Test-types per scope

### Unit (pure functions, hooks, helpers)

```ts
import { describe, it, expect } from "vitest";
import { normalizePhone } from "./otp";

describe("normalizePhone", () => {
  it("converts 06... to +316...", () => {
    expect(normalizePhone("0612345678")).toBe("+31612345678");
  });

  it("rejects landline numbers", () => {
    expect(normalizePhone("0201234567")).toBeNull();
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhone("06 12-34 56 78")).toBe("+31612345678");
  });

  it("returns null for invalid format", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
```

### Integration (component + interaction + mocked services)

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { PhoneVerifyStep } from "./PhoneVerifyStep";

const server = setupServer(
  http.post("/api/otp/send", async () =>
    HttpResponse.json({
      challenge_id: "abc-123",
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      masked_phone: "+31 6 ** ** ** 78",
    })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("PhoneVerifyStep", () => {
  it("disables send-button until phone valid AND consent checked", async () => {
    const user = userEvent.setup();
    render(<PhoneVerifyStep />);

    const button = screen.getByRole("button", { name: /verstuur code/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText(/telefoonnummer/i), "0612345678");
    expect(button).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
  });

  it("opens OTP modal after successful send", async () => {
    const user = userEvent.setup();
    render(<PhoneVerifyStep />);

    await user.type(screen.getByLabelText(/telefoonnummer/i), "0612345678");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /verstuur code/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/\+31 6 \*\*/)).toBeInTheDocument();
  });

  it("shows rate-limit error with retry-after", async () => {
    server.use(
      http.post("/api/otp/send", async () =>
        HttpResponse.json(
          { error: "rate_limit_phone_minute", retry_after: 45 },
          { status: 429 }
        )
      )
    );
    const user = userEvent.setup();
    render(<PhoneVerifyStep />);
    // ... fill + click ...
    expect(await screen.findByRole("alert")).toHaveTextContent(/wacht 45 seconden/i);
  });
});
```

### API-route (Next.js)

```ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/otp/send/route";
import { NextRequest } from "next/server";

function makeReq(body: object): NextRequest {
  return new NextRequest("https://x.example.com/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://x.example.com" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/otp/send", () => {
  it("returns 400 when consent not accepted", async () => {
    const resp = await POST(makeReq({
      phone: "0612345678",
      consent_text_version: "hmb-otp-v1-2026-05-04",
      consent_accepted: false,
    }));
    expect(resp.status).toBe(400);
    const j = await resp.json();
    expect(j.error).toBe("consent_required");
  });

  it("returns 400 for invalid phone format", async () => {
    const resp = await POST(makeReq({
      phone: "abc",
      consent_text_version: "hmb-otp-v1-2026-05-04",
      consent_accepted: true,
    }));
    expect(resp.status).toBe(400);
  });
});
```

### E2E (Playwright)

```ts
// e2e/funnel-otp.spec.ts
import { test, expect } from "@playwright/test";

test("complete OTP-flow happy path", async ({ page }) => {
  await page.goto("/offerte-check");

  await page.getByLabel(/voornaam/i).fill("Test");
  await page.getByLabel(/email/i).fill("test@example.nl");
  await page.getByLabel(/telefoonnummer/i).fill("0612345678");
  await page.getByLabel(/toestemming/i).check();

  await page.getByRole("button", { name: /verstuur code/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Voor e2e tegen staging: gebruik OTP_DEV_LOG_CODE=true env, lees code uit response-header of test-only endpoint
  const code = await page.evaluate(() => window.__TEST_OTP_CODE__);
  await page.getByLabel(/bevestigingscode/i).fill(code);

  await expect(page.getByText(/telefoonnummer bevestigd/i)).toBeVisible();
});
```

### A11y test (axe-core)

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

describe("PhoneVerifyStep a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(<PhoneVerifyStep />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Edge functions (Deno)

```ts
// supabase/functions/_tests/otp-send.test.ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("rejects missing consent", async () => {
  const resp = await fetch("http://localhost:54321/functions/v1/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "+31612345678" }),
  });
  assertEquals(resp.status, 400);
});
```

## Test-categories per file-type

| File type | Min. coverage |
|---|---|
| Pure utility (`_lib/*.ts`) | unit — alle public exports, edge cases |
| React component | render-test + key interactions |
| Form component | validation + submit + error-states + a11y |
| API route | happy + 3 error-paths + auth-fail |
| Hook (custom) | hook test met `renderHook` |
| E2E flow | 1 happy + 1 critical-error per flow |

## Naming-conventies

- **Unit**: `<file>.test.ts` naast source
- **Integration**: idem of `<file>.integration.test.ts`
- **E2E**: `e2e/<flow>.spec.ts`
- **Test fixtures**: `__fixtures__/` of `<file>.fixtures.ts`

## CI-integration

- Run unit/integration in PR-pipeline (`npm run test`)
- Run e2e in nightly of pre-deploy (kost tijd)
- Coverage-threshold: 70% statements voor business-logic libs (`_lib/`), niet voor UI

## Output flow
1. **Brief** — bevestig scope, type, focus-areas
2. **Setup** — vereiste deps + config (vitest.config.ts, playwright.config.ts)
3. **Test-file** — kant-en-klaar
4. **Mock-handlers** als MSW gebruikt
5. **Run-instructies** — `npm test <pad>` etc

## Combineer met
- `/refactor` — tests schrijven vóór refactor (regression-protectie)
- `/ui-form`, `/api-route`, `/ui-component` — output bevat al test-stub
- `/a11y-audit` — voor `jest-axe` integratie

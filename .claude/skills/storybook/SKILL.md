---
name: storybook
description: Genereer een Storybook story-file voor een React component — alle variants, states, interactions, a11y-addon checks, controls. Stack-aware (Next.js + Vite). Gebruik wanneer Juan een component goed wil documenteren, visuele regression-protectie wil, of een design system bouwt.
trigger: /storybook
---

# /storybook

Storybook story bouwen volgens conventies: per variant 1 story, controls voor props, play-functions voor interactions, a11y-addon enabled.

## Usage
```
/storybook <pad-naar-component>
/storybook <pad> --variants "<csv>"
/storybook <pad> --interaction
/storybook <pad> --a11y
```

## Output structuur

`<Component>.stories.tsx` naast component-file:
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "ghost"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Klik mij" } };
export const Outline: Story = { args: { variant: "outline", children: "Outline" } };
export const Disabled: Story = { args: { disabled: true, children: "Disabled" } };
export const WithIcon: Story = { args: { children: "Met icon" } };

// Play-function voor interaction testing
export const Clicked: Story = {
  args: { children: "Click test" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveFocus();
  },
};
```

## Hard rules
- **1 story per state/variant** — geen mega-story met if/else
- **`tags: ["autodocs"]`** voor auto-generated docs page
- **`argTypes`** voor controls — geen rauwe Object args
- **a11y-addon** check op elke story (Storybook draait axe)
- **Stories blijven samples** — niet documentatie ipv echte tests

## Setup-snippet (eerste keer in repo)
```bash
npx storybook@latest init
# voeg toe: @storybook/addon-a11y, @storybook/addon-interactions, @storybook/test
```

## Combineer met
- `/ui-component` — bouw component eerst, dan story
- `/test-write` — story-tests via `@storybook/test`
- `/a11y-audit` — addon vangt veel; deze skill gaat dieper

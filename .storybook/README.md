# Storybook for TCG Dojo

Component library documentation and development environment.

## Setup

### Install Dependencies

```bash
npm install --save-dev \
  @storybook/react-vite \
  @storybook/addon-onboarding \
  @storybook/addon-links \
  @storybook/addon-essentials \
  @storybook/addon-interactions \
  @storybook/addon-a11y \
  @storybook/test \
  @chromatic-com/storybook \
  storybook
```

### Run Storybook

```bash
npm run storybook
```

Storybook will start on `http://localhost:6006`

### Build Storybook

```bash
npm run build-storybook
```

Static build will be created in `storybook-static/`

## Directory Structure

```
.storybook/
├── main.ts          # Storybook configuration
├── preview.ts       # Global decorators and parameters
└── README.md        # This file

src/components/
└── ui/
    ├── Button.tsx
    ├── Button.stories.tsx
    ├── Card.tsx
    ├── Card.stories.tsx
    └── ... (other components)
```

## Writing Stories

### Basic Story

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Hello',
  },
};
```

### With Controls

```typescript
export const Interactive: Story = {
  args: {
    title: 'Interactive Example',
    variant: 'primary',
    size: 'medium',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary'],
    },
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
  },
};
```

### With Actions

```typescript
import { fn } from '@storybook/test';

export const WithActions: Story = {
  args: {
    onClick: fn(),
    onHover: fn(),
  },
};
```

### With Context

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const WithQueryClient: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};
```

## Addons

### Installed Addons

- **@storybook/addon-essentials** - Core addons bundle
  - Controls - Interactive controls for args
  - Actions - Log interactions
  - Viewport - Test different screen sizes
  - Backgrounds - Change background color
  - Toolbars - Custom toolbar items
  - Measure - Measure elements
  - Outline - Outline elements

- **@storybook/addon-a11y** - Accessibility testing
  - Runs automated accessibility checks
  - Reports WCAG violations
  - Provides suggestions for fixes

- **@storybook/addon-interactions** - Interaction testing
  - Test user interactions
  - Write interaction tests
  - Debug interactions

- **@storybook/addon-links** - Link stories together

- **@chromatic-com/storybook** - Visual regression testing

### Using A11y Addon

The accessibility addon automatically runs on all stories:

```typescript
export const Accessible: Story = {
  args: {
    children: 'Accessible Button',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};
```

### Using Viewport Addon

Test components at different screen sizes:

```typescript
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
```

## Component Documentation

### Auto-generated Docs

Enable automatic documentation with:

```typescript
const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'], // Enable auto-docs
} satisfies Meta<typeof MyComponent>;
```

### Custom MDX Docs

Create `MyComponent.stories.mdx`:

```mdx
import { Meta, Canvas, Story, Controls } from '@storybook/blocks';
import * as MyComponentStories from './MyComponent.stories';

<Meta of={MyComponentStories} />

# MyComponent

Description of the component.

## Usage

<Canvas of={MyComponentStories.Default} />

## Props

<Controls of={MyComponentStories.Default} />

## Examples

### Primary Variant

<Canvas of={MyComponentStories.Primary} />

### With Custom Props

<Canvas of={MyComponentStories.Custom} />
```

## Testing

### Interaction Tests

```typescript
import { userEvent, within } from '@storybook/test';

export const InteractionTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find button and click it
    const button = await canvas.getByRole('button');
    await userEvent.click(button);

    // Assert expected outcome
    await expect(canvas.getByText('Clicked!')).toBeInTheDocument();
  },
};
```

### Accessibility Tests

Run accessibility tests:

```bash
npm run storybook
# Open http://localhost:6006
# Click on "Accessibility" tab in addons panel
```

## Best Practices

### 1. One Component Per File

```
Button.tsx
Button.stories.tsx
Button.test.tsx
```

### 2. Organize by Feature/Domain

```
stories/
├── UI/
│   ├── Button.stories.tsx
│   └── Card.stories.tsx
├── Forms/
│   ├── Input.stories.tsx
│   └── Select.stories.tsx
└── Layout/
    ├── Header.stories.tsx
    └── Footer.stories.tsx
```

### 3. Use TypeScript

Always use TypeScript for type safety:

```typescript
type Story = StoryObj<typeof meta>;
```

### 4. Document Props

Use JSDoc comments:

```typescript
interface ButtonProps {
  /** Button label */
  children: React.ReactNode;
  /** Button variant */
  variant?: 'primary' | 'secondary';
  /** Click handler */
  onClick?: () => void;
}
```

### 5. Provide Multiple States

```typescript
export const Default: Story = { ... };
export const Loading: Story = { ... };
export const Error: Story = { ... };
export const Empty: Story = { ... };
```

## Deployment

### Deploy to Chromatic

```bash
npx chromatic --project-token=<your-token>
```

### Deploy to Static Hosting

```bash
npm run build-storybook
# Upload storybook-static/ to hosting provider
```

### GitHub Pages

```yaml
# .github/workflows/storybook.yml
name: Deploy Storybook

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build-storybook
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

## Configuration

### Custom Webpack Config

```typescript
// .storybook/main.ts
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  async viteFinal(config) {
    return mergeConfig(config, {
      // Custom Vite config
    });
  },
};
```

### Global Decorators

```typescript
// .storybook/preview.ts
export const decorators = [
  (Story) => (
    <div style={{ padding: '3rem' }}>
      <Story />
    </div>
  ),
];
```

### Global Parameters

```typescript
// .storybook/preview.ts
export const parameters = {
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#fff' },
      { name: 'dark', value: '#333' },
    ],
  },
};
```

## Troubleshooting

### Styles Not Loading

Add CSS imports to preview:

```typescript
// .storybook/preview.ts
import '../src/index.css';
```

### Component Not Rendering

Check that component is exported:

```typescript
export { MyComponent } from './MyComponent';
```

### Build Errors

Clear cache and rebuild:

```bash
rm -rf node_modules/.cache/storybook
npm run storybook
```

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Component Story Format (CSF)](https://storybook.js.org/docs/api/csf)
- [Storybook Tutorials](https://storybook.js.org/tutorials/)
- [Addon Catalog](https://storybook.js.org/addons)

## Support

- GitHub Issues: https://github.com/storybookjs/storybook/issues
- Discord: https://discord.gg/storybook

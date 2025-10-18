import { h, provide } from 'vue';
import { routerKey } from 'vue-router';

import { userEvent, within, expect, waitFor } from '@storybook/test';

import type { Country } from '@/interfaces/country';
import type { Meta, StoryObj } from '@storybook/vue3';

import SingleCountry from '@/components/SingleCountry.vue';

const sampleCountry: Country = {
  name: { common: 'Poland' },
  flags: { png: 'https://flagcdn.com/w320/pl.png', alt: 'Flag of Poland' },
  population: 37950802,
  region: 'Europe',
  capital: ['Warsaw']
};

const meta: Meta<typeof SingleCountry> = {
  title: 'Components/SingleCountry',
  component: SingleCountry,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a single country card with flag, name, and key facts. Clicking navigates to the country details view.'
      }
    }
  },
  // Provide a minimal router so useRouter() works inside the component
  render: args => ({
    components: { SingleCountry },
    setup() {
      const pushCalls: unknown[] = [];
      const stubRouter = {
        push: (...a: unknown[]) => {
          // capture pushes for interaction testing
          (globalThis as any).__sbRouterPushCalls = pushCalls;
          pushCalls.push(a);
        }
      } as any;
      provide(routerKey, stubRouter);
      return { args };
    },
    render() {
      return h(SingleCountry, { ...this.args });
    }
  })
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    country: sampleCountry,
    // v-model for defineModel() defaults to modelValue
    modelValue: false
  }
};

export const Loaded: Story = {
  args: {
    country: sampleCountry,
    modelValue: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click anywhere on the card; using the title text is reliable
    await userEvent.click(canvas.getByText('Poland'));

    await waitFor(() => {
      const calls = (globalThis as any).__sbRouterPushCalls as any[] | undefined;
      expect(calls && calls.length).toBeGreaterThan(0);
      const [first] = (calls ?? []) as any[];
      expect(first?.[0]).toEqual({ name: 'CountryDetails', params: { name: 'Poland' } });
    });
  }
};

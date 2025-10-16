/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import SingleCountry from '@/components/SingleCountry.vue';

const pushMock = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRouter: () => ({ push: pushMock })
  };
});

const stubs = {
  'v-card': {
    emits: ['click'],
    template: '<div class="card" @click="$emit(\'click\')"><slot /></div>'
  },
  'v-card-title': { template: '<h2><slot /></h2>' },
  'v-card-text': { template: '<div class="card-text"><slot /></div>' },
  'v-skeleton-loader': { template: '<div class="skeleton"><slot /></div>' },
  'v-img': {
    props: ['src'],
    emits: ['load'],
    template: '<img :src="src" @load="$emit(\'load\')" />'
  }
};

const sampleCountry = {
  name: { common: 'Poland' },
  flags: { png: 'poland.png' },
  population: 12345,
  region: 'Europe',
  capital: ['Warsaw']
};

describe('SingleCountry', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('emits update when flag image loads', async () => {
    const wrapper = mount(SingleCountry, {
      props: {
        country: sampleCountry,
        modelValue: false
      },
      global: { stubs }
    });

    await wrapper.find('img').trigger('load');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('navigates to country details when clicked', async () => {
    const wrapper = mount(SingleCountry, {
      props: {
        country: sampleCountry,
        modelValue: true
      },
      global: { stubs }
    });

    await wrapper.find('.card').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({ name: 'CountryDetails', params: { name: 'Poland' } });
  });
});

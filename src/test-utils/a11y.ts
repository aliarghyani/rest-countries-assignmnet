import { expect } from 'vitest';

import axeCore from 'axe-core';

export async function expectNoA11yViolations(root: HTMLElement, config?: axeCore.RunOptions) {
  const context: any = (root as any)?.isConnected ? root : document;
  const results = await axeCore.run(context, config ?? { runOnly: ['wcag2a', 'wcag2aa'] });
  const critical = results.violations.filter(v => v.impact === 'critical');
  const messages = critical.map(v => `${v.id}: ${v.help} at ${v.nodes.map(n => n.target.join(' ')).join(', ')}`).join('\n');
  expect(critical, messages).toHaveLength(0);
}

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AppFooter from '../components/shell/AppFooter';

describe('E2E: component smoke tests (JSX)', () => {
  it('footer links have correct URLs', () => {
    const { container } = render(<AppFooter />);
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map((a) => a.href);

    expect(hrefs).toContain('https://spertsuite.com/');
    expect(hrefs).toContain('https://spertsuite.com/TOS.pdf');
    expect(hrefs).toContain('https://spertsuite.com/PRIVACY.pdf');
    expect(hrefs).toContain('https://github.com/famousdavis/spert-ahp/blob/main/LICENSE');
    expect(hrefs).toHaveLength(5);
  });
});

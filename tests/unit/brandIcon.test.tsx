import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import chromeManifest from '../../src/manifest/chrome.json';
import firefoxManifest from '../../src/manifest/firefox.json';
import { BrandIcon } from '../../src/ui/components/BrandIcon';

const expectedIcons = {
  16: 'icon-16.png',
  32: 'icon-32.png',
  48: 'icon-48.png',
  128: 'icon-128.png',
};

describe('BrandIcon', () => {
  it('renders the stacked M and W monogram as one symmetric vector mark', () => {
    const { container } = render(<BrandIcon className="test-brand" />);
    const icon = container.querySelector('svg[data-maw-brand-icon="true"]');

    expect(icon).toHaveClass('test-brand');
    expect(icon?.querySelectorAll('[data-letter="m"]')).toHaveLength(1);
    expect(icon?.querySelectorAll('[data-letter="w"]')).toHaveLength(1);
  });

  it.each([
    ['Chrome', chromeManifest],
    ['Firefox', firefoxManifest],
  ])('%s manifest exposes the generated extension icons', (_browser, manifest) => {
    expect(manifest.icons).toEqual(expectedIcons);
    expect(manifest.action.default_icon).toEqual(expectedIcons);
  });
});

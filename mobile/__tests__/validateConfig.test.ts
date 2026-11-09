import { DEFAULT_CONFIG } from '../src/config/defaultConfig';
import { isValidConfig } from '../src/config/validateConfig';

const clone = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

describe('isValidConfig', () => {
  it('accepts the bundled defaults', () => {
    expect(isValidConfig(DEFAULT_CONFIG)).toBe(true);
  });

  it('rejects a newer schema the app does not understand', () => {
    const c = clone();
    c.schemaVersion = 2;
    expect(isValidConfig(c)).toBe(false);
  });

  it('rejects non-hex colors', () => {
    const c = clone();
    c.theme.dark.primary = 'red; background: url(x)';
    expect(isValidConfig(c)).toBe(false);
  });

  it('rejects out-of-range numbers', () => {
    const c = clone();
    c.config.aiGeneration.dailyLimitPerUser = 10_000;
    expect(isValidConfig(c)).toBe(false);
  });

  it('rejects missing sections', () => {
    const c = clone();
    delete c.theme;
    expect(isValidConfig(c)).toBe(false);
    expect(isValidConfig(null)).toBe(false);
  });
});

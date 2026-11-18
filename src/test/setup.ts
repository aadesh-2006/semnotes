import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import 'vitest-axe/extend-expect';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 4000 });

// Global Mock for ResizeObserver (used by Recharts in JSDOM)
if (typeof window !== 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock as any;
  global.ResizeObserver = ResizeObserverMock as any;
}

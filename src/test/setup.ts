import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 4000 });

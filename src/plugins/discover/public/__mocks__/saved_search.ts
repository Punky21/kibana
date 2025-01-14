/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedSearch } from '../saved_searches';
import { createSearchSourceMock } from '../../../data/public/mocks';
import { indexPatternMock } from './index_pattern';
import { indexPatternWithTimefieldMock } from './index_pattern_with_timefield';

export const savedSearchMock = ({
  id: 'the-saved-search-id',
  type: 'search',
  attributes: {
    title: 'the-saved-search-title',
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"highlightAll":true,"version":true,"query":{"query":"foo : \\"bar\\" ","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
  },
  references: [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'the-index-pattern-id',
    },
  ],
  migrationVersion: { search: '7.5.0' },
  error: undefined,
  searchSource: createSearchSourceMock({ index: indexPatternMock }),
} as unknown) as SavedSearch;

export const savedSearchMockWithTimeField = ({
  id: 'the-saved-search-id-with-timefield',
  type: 'search',
  attributes: {
    title: 'the-saved-search-title',
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"highlightAll":true,"version":true,"query":{"query":"foo : \\"bar\\" ","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
  },
  references: [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'the-index-pattern-id',
    },
  ],
  migrationVersion: { search: '7.5.0' },
  error: undefined,
  searchSource: createSearchSourceMock({ index: indexPatternWithTimefieldMock }),
} as unknown) as SavedSearch;

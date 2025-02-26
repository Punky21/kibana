/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  ALERTS_AS_DATA_FIND_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getSignalStatus, createSignalsIndex, deleteSignalsIndex } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('query_signals_route and find_alerts_route', () => {
    describe('validation checks', () => {
      it('should not give errors when querying and the signals index does not exist yet', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getSignalStatus())
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        });
      });

      it('should not give errors when querying and the signals index does exist and is empty', async () => {
        await createSignalsIndex(supertest);
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getSignalStatus())
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
        });

        await deleteSignalsIndex(supertest);
      });
    });

    describe('find_alerts_route', () => {
      describe('validation checks', () => {
        it('should not give errors when querying and the signals index does not exist yet', async () => {
          const { body } = await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...getSignalStatus(), index: '.siem-signals-default' })
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql({
            timed_out: false,
            _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
          });
        });

        it('should not give errors when querying and the signals index does exist and is empty', async () => {
          await createSignalsIndex(supertest);
          const { body } = await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...getSignalStatus(), index: '.siem-signals-default' })
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql({
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
            aggregations: {
              statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });

          await deleteSignalsIndex(supertest);
        });

        it('should not give errors when executing security solution histogram aggs', async () => {
          await createSignalsIndex(supertest);
          await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .send({
              index: '.siem-signals-default',
              aggs: {
                alertsByGrouping: {
                  terms: {
                    field: 'event.category',
                    missing: 'All others',
                    order: { _count: 'desc' },
                    size: 10,
                  },
                  aggs: {
                    alerts: {
                      date_histogram: {
                        field: '@timestamp',
                        fixed_interval: '2699999ms',
                        min_doc_count: 0,
                        extended_bounds: {
                          min: '2021-08-17T04:00:00.000Z',
                          max: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  },
                },
              },
              query: {
                bool: {
                  filter: [
                    {
                      bool: {
                        must: [],
                        filter: [
                          {
                            match_phrase: {
                              'signal.rule.id': 'c76f1a10-ffb6-11eb-8914-9b237bf6808c',
                            },
                          },
                          { term: { 'signal.status': 'open' } },
                        ],
                        should: [],
                        must_not: [{ exists: { field: 'signal.rule.building_block_type' } }],
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: '2021-08-17T04:00:00.000Z',
                          lte: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  ],
                },
              },
            })
            .expect(200);

          await deleteSignalsIndex(supertest);
        });
      });
    });
  });
};

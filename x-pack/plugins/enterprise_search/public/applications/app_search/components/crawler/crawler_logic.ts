/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import {
  CrawlerData,
  CrawlerDomain,
  CrawlRequest,
  CrawlRequestFromServer,
  CrawlerStatus,
} from './types';
import { crawlerDataServerToClient, crawlRequestServerToClient } from './utils';

const POLLING_DURATION = 1000;
const POLLING_DURATION_ON_FAILURE = 5000;

export interface CrawlerValues {
  crawlRequests: CrawlRequest[];
  dataLoading: boolean;
  domains: CrawlerDomain[];
  mostRecentCrawlRequestStatus: CrawlerStatus;
  timeoutId: NodeJS.Timeout | null;
}

interface CrawlerActions {
  clearTimeoutId(): void;
  createNewTimeoutForCrawlRequests(duration: number): { duration: number };
  fetchCrawlerData(): void;
  getLatestCrawlRequests(refreshData?: boolean): { refreshData?: boolean };
  onCreateNewTimeout(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  onReceiveCrawlerData(data: CrawlerData): { data: CrawlerData };
  onReceiveCrawlRequests(crawlRequests: CrawlRequest[]): { crawlRequests: CrawlRequest[] };
  startCrawl(): void;
  stopCrawl(): void;
}

export const CrawlerLogic = kea<MakeLogicType<CrawlerValues, CrawlerActions>>({
  path: ['enterprise_search', 'app_search', 'crawler_logic'],
  actions: {
    clearTimeoutId: true,
    createNewTimeoutForCrawlRequests: (duration) => ({ duration }),
    fetchCrawlerData: true,
    getLatestCrawlRequests: (refreshData) => ({ refreshData }),
    onCreateNewTimeout: (timeoutId) => ({ timeoutId }),
    onReceiveCrawlerData: (data) => ({ data }),
    onReceiveCrawlRequests: (crawlRequests) => ({ crawlRequests }),
    startCrawl: () => null,
    stopCrawl: () => null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveCrawlerData: () => false,
      },
    ],
    domains: [
      [],
      {
        onReceiveCrawlerData: (_, { data: { domains } }) => domains,
      },
    ],
    crawlRequests: [
      [],
      {
        onReceiveCrawlRequests: (_, { crawlRequests }) => crawlRequests,
      },
    ],
    timeoutId: [
      null,
      {
        clearTimeoutId: () => null,
        onCreateNewTimeout: (_, { timeoutId }) => timeoutId,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    mostRecentCrawlRequestStatus: [
      () => [selectors.crawlRequests],
      (crawlRequests: CrawlerValues['crawlRequests']) => {
        const eligibleCrawlRequests = crawlRequests.filter(
          (req) => req.status !== CrawlerStatus.Skipped
        );
        if (eligibleCrawlRequests.length === 0) {
          return CrawlerStatus.Success;
        }
        return eligibleCrawlRequests[0].status;
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/internal/app_search/engines/${engineName}/crawler`);

        const crawlerData = crawlerDataServerToClient(response);

        actions.onReceiveCrawlerData(crawlerData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    startCrawl: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/internal/app_search/engines/${engineName}/crawler/crawl_requests`);
        actions.getLatestCrawlRequests();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    stopCrawl: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/internal/app_search/engines/${engineName}/crawler/crawl_requests/cancel`);
        actions.getLatestCrawlRequests();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    createNewTimeoutForCrawlRequests: ({ duration }) => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }

      const timeoutIdId = setTimeout(() => {
        actions.getLatestCrawlRequests();
      }, duration);

      actions.onCreateNewTimeout(timeoutIdId);
    },
    getLatestCrawlRequests: async ({ refreshData = true }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const crawlRequestsFromServer: CrawlRequestFromServer[] = await http.get(
          `/internal/app_search/engines/${engineName}/crawler/crawl_requests`
        );
        const crawlRequests = crawlRequestsFromServer.map(crawlRequestServerToClient);
        actions.onReceiveCrawlRequests(crawlRequests);
        if (
          [
            CrawlerStatus.Pending,
            CrawlerStatus.Starting,
            CrawlerStatus.Running,
            CrawlerStatus.Canceling,
          ].includes(crawlRequests[0]?.status)
        ) {
          actions.createNewTimeoutForCrawlRequests(POLLING_DURATION);
        } else if (
          [CrawlerStatus.Success, CrawlerStatus.Failed, CrawlerStatus.Canceled].includes(
            crawlRequests[0]?.status
          )
        ) {
          actions.clearTimeoutId();
          if (refreshData) {
            actions.fetchCrawlerData();
          }
        }
      } catch (e) {
        actions.createNewTimeoutForCrawlRequests(POLLING_DURATION_ON_FAILURE);
      }
    },
  }),
  events: ({ values }) => ({
    beforeUnmount: () => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }
    },
  }),
});

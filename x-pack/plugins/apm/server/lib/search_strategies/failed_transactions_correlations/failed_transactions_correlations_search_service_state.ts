/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FailedTransactionsCorrelation } from '../../../../common/search_strategies/failed_transactions_correlations/types';

interface Progress {
  started: number;
  loadedFieldCandidates: number;
  loadedFailedTransactionsCorrelations: number;
}
export const failedTransactionsCorrelationsSearchServiceStateProvider = () => {
  let ccsWarning = false;
  function setCcsWarning(d: boolean) {
    ccsWarning = d;
  }

  let error: Error;
  function setError(d: Error) {
    error = d;
  }

  let isCancelled = false;
  function setIsCancelled(d: boolean) {
    isCancelled = d;
  }

  let isRunning = true;
  function setIsRunning(d: boolean) {
    isRunning = d;
  }

  let progress: Progress = {
    started: Date.now(),
    loadedFieldCandidates: 0,
    loadedFailedTransactionsCorrelations: 0,
  };
  function getOverallProgress() {
    return (
      progress.loadedFieldCandidates * 0.025 +
      progress.loadedFailedTransactionsCorrelations * (1 - 0.025)
    );
  }
  function setProgress(d: Partial<Omit<Progress, 'started'>>) {
    progress = {
      ...progress,
      ...d,
    };
  }

  const failedTransactionsCorrelations: FailedTransactionsCorrelation[] = [];
  function addFailedTransactionsCorrelation(d: FailedTransactionsCorrelation) {
    failedTransactionsCorrelations.push(d);
  }
  function addFailedTransactionsCorrelations(
    d: FailedTransactionsCorrelation[]
  ) {
    failedTransactionsCorrelations.push(...d);
  }

  function getFailedTransactionsCorrelationsSortedByScore() {
    return failedTransactionsCorrelations.sort((a, b) => b.score - a.score);
  }

  function getState() {
    return {
      ccsWarning,
      error,
      isCancelled,
      isRunning,
      progress,
      failedTransactionsCorrelations,
    };
  }

  return {
    addFailedTransactionsCorrelation,
    addFailedTransactionsCorrelations,
    getOverallProgress,
    getState,
    getFailedTransactionsCorrelationsSortedByScore,
    setCcsWarning,
    setError,
    setIsCancelled,
    setIsRunning,
    setProgress,
  };
};

export type FailedTransactionsCorrelationsSearchServiceState = ReturnType<
  typeof failedTransactionsCorrelationsSearchServiceStateProvider
>;

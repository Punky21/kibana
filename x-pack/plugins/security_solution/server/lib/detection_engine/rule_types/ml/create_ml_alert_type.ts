/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { PersistenceServices } from '../../../../../../rule_registry/server';
import { ML_ALERT_TYPE_ID } from '../../../../../common/constants';
import { machineLearningRuleParams, MachineLearningRuleParams } from '../../schemas/rule_schemas';
import { mlExecutor } from '../../signals/executors/ml';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';
import { CreateRuleOptions } from '../types';

export const createMlAlertType = (createOptions: CreateRuleOptions) => {
  const {
    lists,
    logger,
    mergeStrategy,
    ignoreFields,
    ml,
    ruleDataClient,
    ruleDataService,
  } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    mergeStrategy,
    ignoreFields,
    ruleDataClient,
    ruleDataService,
  });
  return createSecurityRuleType<MachineLearningRuleParams, {}, PersistenceServices, {}>({
    id: ML_ALERT_TYPE_ID,
    name: 'Machine Learning Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, machineLearningRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: 'security-solution',
    async executor(execOptions) {
      const {
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          listClient,
          rule,
          tuple,
          wrapHits,
        },
        services,
        state,
      } = execOptions;

      const result = await mlExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        listClient,
        logger,
        ml,
        rule,
        services,
        tuple,
        wrapHits,
      });
      return { ...result, state };
    },
  });
};

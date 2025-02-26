/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { mapValues } from 'lodash';
import { LensServerPluginSetup } from '../../../../lens/server';

import {
  mergeMigrationFunctionMaps,
  MigrateFunction,
  MigrateFunctionsObject,
} from '../../../../../../src/plugins/kibana_utils/common';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
} from '../../../../../../src/core/server';
import {
  ConnectorTypes,
  CommentType,
  AssociationType,
  SECURITY_SOLUTION_OWNER,
} from '../../../common';
import { parseCommentString, stringifyComment } from '../../../common/utils/markdown_plugins/utils';

export { caseMigrations } from './cases';
export { configureMigrations } from './configuration';

interface UserActions {
  action_field: string[];
  new_value: string;
  old_value: string;
}

export interface SanitizedCaseOwner {
  owner: string;
}

export const addOwnerToSO = <T = Record<string, unknown>>(
  doc: SavedObjectUnsanitizedDoc<T>
): SavedObjectSanitizedDoc<SanitizedCaseOwner> => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    owner: SECURITY_SOLUTION_OWNER,
  },
  references: doc.references || [],
});

export const userActionsMigrations = {
  '7.10.0': (doc: SavedObjectUnsanitizedDoc<UserActions>): SavedObjectSanitizedDoc<UserActions> => {
    const { action_field, new_value, old_value, ...restAttributes } = doc.attributes;

    if (
      action_field == null ||
      !Array.isArray(action_field) ||
      action_field[0] !== 'connector_id'
    ) {
      return { ...doc, references: doc.references || [] };
    }

    return {
      ...doc,
      attributes: {
        ...restAttributes,
        action_field: ['connector'],
        new_value:
          new_value != null
            ? JSON.stringify({
                id: new_value,
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              })
            : new_value,
        old_value:
          old_value != null
            ? JSON.stringify({
                id: old_value,
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              })
            : old_value,
      },
      references: doc.references || [],
    };
  },
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
    return addOwnerToSO(doc);
  },
};

interface UnsanitizedComment {
  comment: string;
  type?: CommentType;
}

interface SanitizedComment {
  comment: string;
  type: CommentType;
}

interface SanitizedCommentForSubCases {
  associationType: AssociationType;
  rule?: { id: string | null; name: string | null };
}

const migrateByValueLensVisualizations = (
  migrate: MigrateFunction,
  version: string
): SavedObjectMigrationFn => (doc: any) => {
  const parsedComment = parseCommentString(doc.attributes.comment);
  const migratedComment = parsedComment.children.map((comment) => {
    if (comment?.type === 'lens') {
      // @ts-expect-error
      return migrate(comment);
    }

    return comment;
  });

  // @ts-expect-error
  parsedComment.children = migratedComment;
  doc.attributes.comment = stringifyComment(parsedComment);

  return doc;
};

export interface CreateCommentsMigrationsDeps {
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

export const createCommentsMigrations = (
  migrationDeps: CreateCommentsMigrationsDeps
): SavedObjectMigrationMap => {
  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationFn>(
    migrationDeps.lensEmbeddableFactory().migrations,
    migrateByValueLensVisualizations
  ) as MigrateFunctionsObject;

  const commentsMigrations = {
    '7.11.0': (
      doc: SavedObjectUnsanitizedDoc<UnsanitizedComment>
    ): SavedObjectSanitizedDoc<SanitizedComment> => {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          type: CommentType.user,
        },
        references: doc.references || [],
      };
    },
    '7.12.0': (
      doc: SavedObjectUnsanitizedDoc<UnsanitizedComment>
    ): SavedObjectSanitizedDoc<SanitizedCommentForSubCases> => {
      let attributes: SanitizedCommentForSubCases & UnsanitizedComment = {
        ...doc.attributes,
        associationType: AssociationType.case,
      };

      // only add the rule object for alert comments. Prior to 7.12 we only had CommentType.alert, generated alerts are
      // introduced in 7.12.
      if (doc.attributes.type === CommentType.alert) {
        attributes = { ...attributes, rule: { id: null, name: null } };
      }

      return {
        ...doc,
        attributes,
        references: doc.references || [],
      };
    },
    '7.14.0': (
      doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
    ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
      return addOwnerToSO(doc);
    },
  };

  return mergeMigrationFunctionMaps(commentsMigrations, embeddableMigrations);
};

export const connectorMappingsMigrations = {
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
    return addOwnerToSO(doc);
  },
};

export const subCasesMigrations = {
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
    return addOwnerToSO(doc);
  },
};

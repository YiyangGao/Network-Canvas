import { createSelector } from 'reselect';

import { alterRule, egoRule, edgeRule, or, and } from '../utils/networkQuery/query';
import predicate from '../utils/networkQuery/predicate';
import { stages as getStages } from './session';

const getNetwork = state => state.network;

const rotateIndex = (max, nextIndex) => (nextIndex + max) % max;
const maxLength = state => getStages(state).length;

const mapRuleType = (type) => {
  switch (type) {
    case 'alter':
      return alterRule;
    case 'ego':
      return egoRule;
    case 'edge':
      return edgeRule;
    default:
      return () => {};
  }
};

export const getNextIndex = index => createSelector(
  maxLength,
  max => rotateIndex(max, index),
);

const getSkipLogic = index => createSelector(
  getStages,
  stages => stages && stages[index] && stages[index].skipLogic,
);

const getFilter = index => createSelector(
  getSkipLogic(index),
  logic => logic && logic.filter,
);

const getJoinType = index => createSelector(
  getFilter(index),
  filter => ((filter && filter.join === 'OR') ? or : and),
);

const getRules = index => createSelector(
  getFilter(index),
  filter => (filter && filter.rules) || [],
);

const convertRules = index => createSelector(
  getRules(index),
  rules => rules.filter(rule => rule.type && rule.options).map(
    rule => mapRuleType(rule.type)(rule.options),
  ),
);

const getFilterFunction = index => createSelector(
  getJoinType(index),
  convertRules(index),
  (join, rules) => join(rules),
);

const filterNetwork = index => createSelector(
  getFilterFunction(index),
  getNetwork,
  (filter, network) => filter(network),
);

const isSkipAction = index => createSelector(
  getSkipLogic(index),
  logic => logic && logic.action === 'SKIP',
);

const getSkipValue = index => createSelector(
  getSkipLogic(index),
  logic => logic && logic.value && Math.trunc(logic.value),
);

const getSkipOperator = index => createSelector(
  getSkipLogic(index),
  logic => logic && logic.operator,
);

export const isStageSkipped = index => createSelector(
  getSkipLogic(index),
  isSkipAction(index),
  getSkipOperator(index),
  getSkipValue(index),
  filterNetwork(index),
  (logic, action, operator, comparisonValue, results) => {
    let outerQuery = false;
    switch (operator) {
      case 'NONE':
        outerQuery = !results.nodes.length;
        break;
      case 'ANY':
        outerQuery = results.nodes.length > 0;
        break;
      default:
        outerQuery = predicate(operator)(
          { value: results.nodes.length, other: comparisonValue });
    }

    return !!logic && ((action && outerQuery) || (!action && !outerQuery));
  },
);

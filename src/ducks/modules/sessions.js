import { omit, each, map } from 'lodash';
import { Observable } from 'rxjs';
import { combineEpics } from 'redux-observable';
import { actionCreators as SessionWorkerActions } from './sessionWorkers';
import uuidv4 from '../../utils/uuid';
import network, { actionTypes as networkActionTypes, entityPrimaryKeyProperty } from './network';
import ApiClient from '../../utils/ApiClient';

const ADD_SESSION = 'ADD_SESSION';
const LOAD_SESSION = 'LOAD_SESSION';
const UPDATE_PROMPT = 'UPDATE_PROMPT';
const UPDATE_STAGE = 'UPDATE_STAGE';
const REMOVE_SESSION = 'REMOVE_SESSION';
const EXPORT_SESSION = 'EXPORT_SESSION';
const EXPORT_SESSION_FAILED = 'EXPORT_SESSION_FAILED';
const EXPORT_SESSION_SUCCEEDED = 'EXPORT_SESSION_SUCCEEDED';

const initialState = {};

const withTimestamp = session => ({
  ...session,
  updatedAt: Date.now(),
});

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case networkActionTypes.ADD_NODE:
    case networkActionTypes.BATCH_ADD_NODES:
    case networkActionTypes.REMOVE_NODE:
    case networkActionTypes.REMOVE_NODE_FROM_PROMPT:
    case networkActionTypes.UPDATE_NODE:
    case networkActionTypes.TOGGLE_NODE_ATTRIBUTES:
    case networkActionTypes.ADD_EDGE:
    case networkActionTypes.UPDATE_EDGE:
    case networkActionTypes.TOGGLE_EDGE:
    case networkActionTypes.REMOVE_EDGE:
    case networkActionTypes.UPDATE_EGO:
      return {
        ...state,
        [action.sessionId]: withTimestamp({
          ...state[action.sessionId],
          network: network(state[action.sessionId].network, action),
        }),
      };
    case ADD_SESSION:
      return {
        ...state,
        [action.sessionId]: withTimestamp({
          protocolUID: action.protocolUID,
          promptIndex: 0,
          stageIndex: 0,
          caseId: action.caseId,
          network: network(state.network, action),
        }),
      };
    case LOAD_SESSION:
      return state;
    case UPDATE_PROMPT:
      return {
        ...state,
        [action.sessionId]: withTimestamp({
          ...state[action.sessionId],
          promptIndex: action.promptIndex,
        }),
      };
    case UPDATE_STAGE:
      return {
        ...state,
        [action.sessionId]: withTimestamp({
          ...state[action.sessionId],
          stageIndex: action.stageIndex,
        }),
      };
    case REMOVE_SESSION:
      return omit(state, [action.sessionId]);
    case EXPORT_SESSION_SUCCEEDED:
      return {
        ...state,
        [action.sessionId]: withTimestamp({
          ...state[action.sessionId],
          lastExportedAt: Date.now(),
        }),
      };
    default:
      return state;
  }
}

/**
 * Add a batch of nodes to the state.
 *
 * @param {Collection} [nodeList] An array of objects representing nodes to add.
 * @param {Object} [attributeData] Attribute data that will be merged with each node
 *
 * @memberof! NetworkActionCreators
 */
const batchAddNodes = (nodeList, attributeData) => (dispatch, getState) => {
  const { activeSessionId, sessions, installedProtocols } = getState();

  const activeProtocol = installedProtocols[sessions[activeSessionId].protocolUID];
  const nodeRegistry = activeProtocol.codebook.node;
  const nodeTypes = map(nodeList, 'type');

  const registryForTypes = {};
  each(nodeTypes, (nodeType) => {
    registryForTypes[nodeType] = nodeRegistry[nodeType].variables;
  });

  dispatch({
    type: networkActionTypes.BATCH_ADD_NODES,
    sessionId: activeSessionId,
    nodeList,
    attributeData,
    registryForTypes,
  });
};

/**
 * This function generates default values for all variables in the variable registry for this node
 * type.
 *
 * @param {object} registryForType - An object containing the variable registry entry for this
 *                                   node type.
 */

const getDefaultAttributesForEntityType = (registryForType = {}) => {
  const defaultAttributesObject = {};

  // Boolean variables are initialised as `false`, and everything else as `null`
  Object.keys(registryForType).forEach((key) => {
    defaultAttributesObject[key] = registryForType[key].type === 'boolean' ? false : null;
  });

  return defaultAttributesObject;
};

const addNode = (modelData, attributeData = {}) => (dispatch, getState) => {
  const { activeSessionId, sessions, installedProtocols } = getState();


  const activeProtocol = installedProtocols[sessions[activeSessionId].protocolUID];
  const nodeRegistry = activeProtocol.codebook.node;

  const registryForType = nodeRegistry[modelData.type].variables;

  dispatch({
    type: networkActionTypes.ADD_NODE,
    sessionId: activeSessionId,
    modelData,
    attributeData: {
      ...getDefaultAttributesForEntityType(registryForType),
      ...attributeData,
    },
  });
};

const updateNode = (nodeId, newModelData = {}, newAttributeData = {}) => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.UPDATE_NODE,
    sessionId: activeSessionId,
    nodeId,
    newModelData,
    newAttributeData,
  });
};

const toggleNodeAttributes = (uid, attributes) => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.TOGGLE_NODE_ATTRIBUTES,
    sessionId: activeSessionId,
    [entityPrimaryKeyProperty]: uid,
    attributes,
  });
};

const removeNode = uid => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.REMOVE_NODE,
    sessionId: activeSessionId,
    [entityPrimaryKeyProperty]: uid,
  });
};

const removeNodeFromPrompt = (nodeId, promptId, promptAttributes) => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.REMOVE_NODE_FROM_PROMPT,
    sessionId: activeSessionId,
    nodeId,
    promptId,
    promptAttributes,
  });
};

const updateEgo = (modelData = {}, attributeData = {}) => (dispatch, getState) => {
  const { activeSessionId, sessions, installedProtocols } = getState();

  const activeProtocol = installedProtocols[sessions[activeSessionId].protocolUID];
  const egoRegistry = activeProtocol.codebook.node;

  dispatch({
    type: networkActionTypes.UPDATE_EGO,
    sessionId: activeSessionId,
    modelData,
    attributeData: {
      ...getDefaultAttributesForEntityType(egoRegistry.variables),
      ...attributeData,
    },
  });
};

const addEdge = (modelData, attributeData = {}) => (dispatch, getState) => {
  const { activeSessionId, sessions, installedProtocols } = getState();

  const activeProtocol = installedProtocols[sessions[activeSessionId].protocolUID];
  const edgeRegistry = activeProtocol.codebook.edge;

  const registryForType = edgeRegistry[modelData.type].variables;

  dispatch({
    type: networkActionTypes.ADD_EDGE,
    sessionId: activeSessionId,
    modelData,
    attributeData: {
      ...getDefaultAttributesForEntityType(registryForType),
      ...attributeData,
    },
  });
};

const updateEdge = (edgeId, newModelData = {}, newAttributeData = {}) => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.UPDATE_EDGE,
    sessionId: activeSessionId,
    edgeId,
    newModelData,
    newAttributeData,
  });
};

const toggleEdge = (modelData, attributeData = {}) => (dispatch, getState) => {
  const { activeSessionId, sessions, installedProtocols } = getState();

  const activeProtocol = installedProtocols[sessions[activeSessionId].protocolUID];
  const edgeRegistry = activeProtocol.codebook.edge;

  const registryForType = edgeRegistry[modelData.type].variables;

  dispatch({
    type: networkActionTypes.TOGGLE_EDGE,
    sessionId: activeSessionId,
    modelData,
    attributeData: {
      ...getDefaultAttributesForEntityType(registryForType),
      ...attributeData,
    },
  });
};

const removeEdge = edge => (dispatch, getState) => {
  const { activeSessionId } = getState();

  dispatch({
    type: networkActionTypes.REMOVE_EDGE,
    sessionId: activeSessionId,
    edge,
  });
};

const addSession = (caseId, protocolUID) => (dispatch) => {
  const id = uuidv4();

  dispatch(SessionWorkerActions.initializeSessionWorkersThunk(protocolUID));

  dispatch({
    type: ADD_SESSION,
    sessionId: id,
    caseId,
    protocolUID,
  });
};

const loadSession = () => (dispatch) => {
  dispatch({
    type: LOAD_SESSION,
  });
};

const updatePrompt = promptIndex => (dispatch, getState) => {
  const state = getState();
  const sessionId = state.activeSessionId;

  dispatch({
    type: UPDATE_PROMPT,
    sessionId,
    promptIndex,
  });
};

const updateStage = stageIndex => (dispatch, getState) => {
  const state = getState();
  const sessionId = state.activeSessionId;

  dispatch({
    type: UPDATE_STAGE,
    sessionId,
    stageIndex,
  });
};

function removeSession(id) {
  return {
    type: REMOVE_SESSION,
    sessionId: id,
  };
}

const sessionExportSucceeded = id => ({
  type: EXPORT_SESSION_SUCCEEDED,
  sessionId: id,
});

const sessionExportFailed = error => ({
  type: EXPORT_SESSION_FAILED,
  error,
});

// sessionData should already be in an exportable format (e.g., IDs transposed to names)
const exportSession = (remoteProtocolId, sessionUuid, sessionData) => ({
  type: EXPORT_SESSION,
  remoteProtocolId,
  sessionUuid,
  sessionData,
});

const sessionExportPromise = (pairedServer, action) => {
  const { remoteProtocolId, sessionUuid, sessionData } = action;
  if (pairedServer) {
    const client = new ApiClient(pairedServer);
    return client.addTrustedCert().then(() =>
      client.exportSession(remoteProtocolId, sessionUuid, sessionData));
  }
  return Promise.reject(new Error('No paired server available'));
};

const exportSessionEpic = (action$, store) => (
  action$.ofType(EXPORT_SESSION)
    .exhaustMap((action) => {
      const pairedServer = store.getState().pairedServer;
      return Observable
        .fromPromise(sessionExportPromise(pairedServer, action))
        .mapTo(sessionExportSucceeded(action.sessionUuid))
        .catch(error => Observable.of(sessionExportFailed(error)));
    })
);

const actionCreators = {
  addNode,
  batchAddNodes,
  updateNode,
  removeNode,
  removeNodeFromPrompt,
  updateEgo,
  addEdge,
  updateEdge,
  toggleEdge,
  removeEdge,
  toggleNodeAttributes,
  addSession,
  loadSession,
  updatePrompt,
  updateStage,
  removeSession,
  exportSession,
  sessionExportFailed,
};

const actionTypes = {
  ADD_SESSION,
  LOAD_SESSION,
  UPDATE_PROMPT,
  UPDATE_STAGE,
  REMOVE_SESSION,
  EXPORT_SESSION,
  EXPORT_SESSION_FAILED,
};

const epics = combineEpics(
  exportSessionEpic,
);

export {
  actionCreators,
  actionTypes,
  epics,
};

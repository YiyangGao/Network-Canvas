import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import withPrompt from '../../behaviours/withPrompt';
import { PromptSwiper, CategoricalList } from '../';
import { makeGetPromptVariable, makeNetworkNodesForType } from '../../selectors/interface';
import { MultiNodeBucket } from '../../components';
import { entityAttributesProperty } from '../../ducks/modules/network';

/**
  * CategoricalBin Interface
  */
const CategoricalBin = ({
  promptForward,
  promptBackward,
  prompt,
  nodesForPrompt,
  stage,
}) => {
  const {
    prompts,
  } = stage;
  return (
    <div className="categorical-bin-interface">
      <div className="categorical-bin-interface__prompt">
        <PromptSwiper
          forward={promptForward}
          backward={promptBackward}
          prompt={prompt}
          prompts={prompts}
        />
      </div>
      <div className="categorical-bin-interface__bucket">
        <MultiNodeBucket
          nodes={nodesForPrompt}
          listId={`${stage.id}_${prompt.id}_CAT_BUCKET`}
          sortOrder={prompt.bucketSortOrder}
        />
      </div>
      <hr />
      <CategoricalList key={prompt.id} stage={stage} prompt={prompt} />
    </div>
  );
};

CategoricalBin.propTypes = {
  stage: PropTypes.object.isRequired,
  prompt: PropTypes.object.isRequired,
  promptForward: PropTypes.func.isRequired,
  promptBackward: PropTypes.func.isRequired,
  nodesForPrompt: PropTypes.array.isRequired,
};

function makeMapStateToProps() {
  const getStageNodes = makeNetworkNodesForType();
  const getPromptVariable = makeGetPromptVariable();

  return function mapStateToProps(state, props) {
    const stageNodes = getStageNodes(state, props);
    const activePromptVariable = getPromptVariable(state, props);

    return {
      activePromptVariable,
      nodesForPrompt: stageNodes.filter(
        node => !node[entityAttributesProperty][activePromptVariable],
      ),
    };
  };
}

export { CategoricalBin as UnconnectedCategoricalBin };

export default compose(
  withPrompt,
  connect(makeMapStateToProps),
)(CategoricalBin);

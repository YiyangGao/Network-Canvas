if (typeof require !== 'undefined') {nodeRequire = require;} (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global $, window, Swiper, note*/
/* exported ContextGenerator */
module.exports = function ContextGenerator() {
	'use strict';
	//global vars
	var moduleEvents = [];
	var contexts = [];
	var contextGenerator = {};
	var promptSwiper;
	var dragging = false;
	var currentPrompt = 0;
	var mergeContextForm;
	var temporaryFields = {
		contexts: {
			title: 'contexts',
			type: 'hidden'
		}
	};

	contextGenerator.options = {
		targetEl: $('.container'),
		egoData: 'contexts',
		nodeDestination: 'contexts',
		network: netCanvas.Modules.session.getPrimaryNetwork(),
		createNodes: true,
		prompts: [
			'Prompt 1',
			'Prompt 2',
			'Prompt 3',
			'Prompt 4'
		],
	};

	contextGenerator.destroy = function() {
		note.info('Context generator destroyed.');

		window.forms.nameGenForm.removeFields(temporaryFields);

		promptSwiper.destroy();
		$('.new-context-form').remove();
		$('.merge-context-form').remove();
		window.tools.Events.unbind(moduleEvents);
	};

	contextGenerator.nodeAdded = function(e) {
		contextGenerator.addNodeToContext(e.originalEvent.detail);
	};

	contextGenerator.init = function(options) {
		note.info('Context generator initialised.');

		// Add temporary fields to newNodeForm
		window.forms.nameGenForm.addFields(temporaryFields);

		window.tools.extend(contextGenerator.options, options);
		// Events
		var event = [{
			event: 'changeStageStart',
			handler: contextGenerator.destroy,
			targetEl:  window
		},
		{
			event: 'nodeAdded',
			handler: contextGenerator.nodeAdded,
			targetEl:  window
		}];
		window.tools.Events.register(moduleEvents, event);

		// containers
		contextGenerator.options.targetEl.append('<div class="contexthull-title-container"></div><div class="contexthull-hull-container"></div>');

		// Prompts
		$('.contexthull-title-container').append('<div class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>');
		for (var i = 0; i < contextGenerator.options.prompts.length; i++) {
			$('.swiper-wrapper').append('<div class="swiper-slide"><h2>'+contextGenerator.options.prompts[i]+'</h2></div>');
		}
		promptSwiper = new Swiper ('.swiper-container', {
			pagination: '.swiper-pagination',
			speed: 1000
		});

		// Update current prompt counter
		promptSwiper.on('slideChangeEnd', function () {
    		currentPrompt = promptSwiper.activeIndex;
		});

		// bin
		contextGenerator.options.targetEl.append('<div class="contexthull-bin-footer"><span class="contexthull-bin fa fa-4x fa-trash-o"></span></div>');
		$('.contexthull-bin').droppable({
			// accept: '.circle-responsive',
			tolerance: 'touch',
			hoverClass: 'delete',
			over: function( event, ui ) {
				$(this).addClass('delete');
				$(ui.draggable).addClass('delete');
			},
			out: function( event, ui ) {
				$(this).removeClass('delete');
				$(ui.draggable).removeClass('delete');
			},
			drop: function( event, ui ) {
				if ($(ui.draggable).hasClass('circle-responsive')) {
					contextGenerator.removeContext($(ui.draggable).data('index'));
				} else {
					contextGenerator.removeNode($(ui.draggable).data('id'));
				}

			}
		});

		// New context buttons
		contextGenerator.options.targetEl.append('<div class="new-context-button text-center"><span class="fa fa-2x fa-pencil"></span></div>');

		// New context form
		$('.black-overlay').append('<div class="new-context-form"></div>');
		var newContextForm = new window.netCanvas.Modules.FormBuilder('newContextForm');
		newContextForm.build($('.new-context-form'), {
			title: 'What should your context be called?',
			fields: {
				name: {
					type: 'text',
					placeholder: 'Name of Context',
					required: true,

				}
			},
			submit: function(data) {
				if (contexts.indexOf(data.name) === -1) {
					// Update ego
					var properties = {};
					properties[contextGenerator.options.nodeDestination] = contexts;
					contextGenerator.options.network.updateNode(contextGenerator.options.network.getEgo().id, properties);
					contextGenerator.addContext(data.name);
					newContextForm.reset();
					newContextForm.hide();
				} else {
					newContextForm.showError('Error: the name you have chosen is already in use.');
				}
			},
			options: {
				buttons: {
					submit: {
						label: 'Create',
						id: 'context-submit-btn',
						type: 'submit',
						class: 'btn-primary'
					},
					cancel: {
						label: 'Cancel',
						id: 'context-cancel-btn',
						type: 'button',
						class: 'btn-default',
						action: function() {
							newContextForm.reset();
							newContextForm.hide();
						}
					}
				}
			}
		});

		event = [{
			event: 'click',
			handler: window.forms.newContextForm.show,
			targetEl:  '.new-context-button'
		}];
		window.tools.Events.register(moduleEvents, event);

		$('.black-overlay').append('<div class="merge-context-form"></div>');
		mergeContextForm = new window.netCanvas.Modules.FormBuilder('mergeContextForm');
		mergeContextForm.build($('.merge-context-form'), {
			title: 'What should the merged context be called?',
			fields: {
				merged_name: {
					type: 'text',
					placeholder: 'Name of Context',
					required: true,

				},
				source: {
					'type':'hidden',
					'title':'source',
					'name': 'source',
				},
				target: {
					'type':'hidden',
					'title':'target',
					'name': 'target',
				}
			},
			submit: function(data) {
				contextGenerator.mergeContexts(data.source, data.target, data.merged_name);
				window.forms.mergeContextForm.reset();
				window.forms.mergeContextForm.hide();
			},
			options: {
				buttons: {
					submit: {
						label: 'Create',
						id: 'merge-submit-btn',
						type: 'submit',
						class: 'btn-primary'
					},
					cancel: {
						label: 'Cancel',
						id: 'merge-cancel-btn',
						type: 'button',
						class: 'btn-default',
						action: function() {
							mergeContextForm.reset();
							window.forms.mergeContextForm.hide();
						}
					}
				}
			}
		});

		// Add existing data, if present
		if (typeof contextGenerator.options.network.getEgo()[contextGenerator.options.egoData] === 'undefined') {
			note.warn('Ego didn\'t have the community variable you specified, so it was created as a blank array.');
			var properties = {};
			properties[contextGenerator.options.egoData] = [];
			contextGenerator.options.network.updateNode(contextGenerator.options.network.getEgo().id, properties);
		} else {
			contextGenerator.addExistingContexts();
		}

	};

	contextGenerator.addNodeToContext = function(node) {
		note.info('contextGenerator.addNodeToContext():'+node.first_name);
		// // fix the context variable as an array.
		// if (typeof node.contexts !== 'object') {
		// 	var contextArray = [];
		// 	contextArray.push(node.contexts);
		// 	var updateNode = contextGenerator.options.network.getNode(node.id);
		// 	updateNode.contexts = contextArray;
		// 	window.netCanvas.Modules.session.saveData();
		// }
		//
		// note.debug('contextGenerator: adding node to context');
		// note.debug(node);
		// var thisContext = window.tools.htmlUnEscape(node[contextGenerator.options.nodeDestination]);
		// console.log(thisContext);
		// var context = contexts.indexOf(thisContext);
		// note.debug(contexts);
		// console.log(context);
		// $('.circle-responsive[data-index="'+context+'"]').append('<div class="node-circle-container"><div class="node-circle" data-id="'+node.id+'">'+node.label+'</div></div>');
		contextGenerator.makeNodesDraggable();
	};

	contextGenerator.showBin = function() {
		$('.contexthull-bin-footer').addClass('show');
	};

	contextGenerator.hideBin = function() {
		$('.contexthull-bin-footer').removeClass('show');
	};

	contextGenerator.addExistingContexts = function() {
		note.info('contextGenerator.addExistingContexts()');
		// First, we create a super array of all unique items across all variable arrays.
		var egoData = contextGenerator.options.network.getEgo()[contextGenerator.options.egoData];

		$.each(egoData, function(index, value) {
			contextGenerator.addContext(value);
		});

		// Add any nodes to the contexts (filter to ignore ego)
		var nodes = contextGenerator.options.network.getNodes({}, function (results) {
			var filteredResults = [];
			$.each(results, function(index,value) {
				if (value.type !== 'Ego') {
					filteredResults.push(value);
				}
			});

			return filteredResults;
		});

		$.each(nodes, function(nodeIndex, nodeValue) {
			// only deal with nodes that have a single context. is this right?
			if (typeof nodeValue[contextGenerator.options.nodeDestination] !== 'undefined' && nodeValue[contextGenerator.options.nodeDestination].length === 1) {
				// Check if the context exists
				if (contexts.indexOf(nodeValue[contextGenerator.options.nodeDestination][0] !== -1)) {
					contextGenerator.addNodeToContext(nodeValue);
				} else {
					note.warn('A node was found with a context that didn\'t exist!');
				}
 			} else {
				note.debug('Ignored a node because it either had multiple or no contexts.'+nodeValue.id);
			}

		});

	};

	contextGenerator.makeDraggable = function() {
		$('.circle-responsive').draggable({
			// zIndex: 100,
			revert: true,
			refreshPositions: true,
			revertDuration: 200,
			distance: 50,
			stack: '.circle-responsive',
			scroll: false,
			start: function() {
				dragging = true;
				contextGenerator.showBin();
				$(this).addClass('smaller');

			},
			stop: function() {
				setTimeout(function(){dragging = false;}, 100);
				$(this).removeClass('smaller');
				contextGenerator.hideBin();
			}
		});

		$('.circle-responsive').droppable({
			// accept: '.circle-responsive',
			// tolerance: 'fit',
			hoverClass: 'merge',
			over: function(event, ui) {
				// $(this).addClass('merge');
				$(ui.draggable).addClass('merge');
			},
			out: function( event, ui ) {

				$(ui.draggable).removeClass('merge');
			},
			drop: function( event, ui ) {
				setTimeout(function(){dragging = false;}, 100);
				if ($(ui.draggable).hasClass('circle-responsive')) {
					$(this).removeClass('merge');
					$(ui.draggable).removeClass('merge');
					var props = {
						merged_name: $(ui.draggable).data('context')+'/'+$(this).data('context'),
						source: $(ui.draggable).data('index'),
						target: $(this).data('index')
					};
					console.log(props);
					window.forms.mergeContextForm.addData(props);
					window.forms.mergeContextForm.show();
					// window.forms.nameGenForm.hide(); // Why did I do this?

				} else if ($(ui.draggable).hasClass('node-circle')) {
					$(this).removeClass('merge');
					$(ui.draggable).removeClass('merge');
					// check if we are dropping back where we started, and cancel if so.
					if ($(this).data('context') !== $(ui.draggable).parent().parent().data('context')) {
						contextGenerator.moveNode($(ui.draggable).data('id'), $(this).data('index'));
					}

				} else {
					$(this).removeClass('merge');
					$(ui.draggable).removeClass('merge');
					// contextGenerator.removeNode($(ui.draggable).data('id'));
				}

			}
		});
	};

	contextGenerator.makeNodesDraggable = function() {
		$('.node-circle').draggable({
			stack: '.circle-responsive',
			revert: true,
			revertDuration: 200,
			refreshPositions: true,
			scroll: false,
			start: function() {
				$(this).addClass('border');
				contextGenerator.showBin();
			},
			stop: function() {
				$(this).removeClass('border');
				contextGenerator.hideBin();
			}
		});

	};

	contextGenerator.mergeContexts = function (sourceIndex, targetIndex, newName) {
		if (!sourceIndex || !targetIndex || !newName) {
			note.error('ContextGenerator: mergeContexts() needs better parameters!');
			return false;
		}

		// note.warn('I\'m not clever enough to check for nodes not visible that are already in both contexts...but I soon will be.');

		// Create a new context with the combined name.
		var newContextIndex = contextGenerator.addContext(newName);

		// Move nodes from the source and target to the new context
		var sourceNodes = contextGenerator.getContextNodes(sourceIndex);
		var targetNodes = contextGenerator.getContextNodes(targetIndex);
		$.each(sourceNodes, function(index, value) {
			contextGenerator.moveNode(value, newContextIndex);
		});
		$.each(targetNodes, function(index, value) {
			contextGenerator.moveNode(value, newContextIndex);
		});

		// Remove previous contexts
		contextGenerator.removeContext(sourceIndex);
		contextGenerator.removeContext(targetIndex);

	};

	contextGenerator.addContext = function(name) {
		if (!name) {
			note.error('No name provided for new context.');
			throw new Error('No name provided for new context.');
		}
		contexts.push(name);

		// use lowest available color
		var color = 0;
		while ($('.circle-responsive[data-index='+color+']').length > 0) {
			color++;
		}
		$('.contexthull-hull-container').append('<div class="circle-responsive" data-index="'+color+'" data-context="'+window.tools.htmlEscape(name)+'"><div class="circle-content">'+name+'</div></div>');
		contextGenerator.makeDraggable();
		if (contextGenerator.options.createNodes === true) {
			var event = [{
				event: 'tap',
				handler: contextGenerator.showNewNodeForm,
				targetEl:  '.circle-responsive[data-index="'+color+'"]'
			}];
			window.tools.Events.register(moduleEvents, event);
		}

		return color;

	};

	contextGenerator.showNewNodeForm = function() {
		if (!dragging) {
			var target = $(this).data('context');
			window.forms.nameGenForm.addData({contexts: target});
			window.forms.nameGenForm.show();
		}
	};

	contextGenerator.removeContext = function(index) {
		console.log(contexts);
		console.log(index);
		var name = contexts[index];

		console.log(name);
		if (!name) {
			note.error('No name provided to contextGenerator.deleteContext().');
			throw new Error('No name provided to contextGenerator.deleteContext().');
		}

		if (contexts.remove(name) !== 0) {
			var properties = {};
			properties[contextGenerator.options.egoData] = contexts;
			contextGenerator.options.network.updateNode(contextGenerator.options.network.getEgo().id, properties);

			// Remove nodes
			var childNodes = $('div[data-index="'+index+'"]').children('.node-circle-container');
			$.each(childNodes, function(nodeIndex, nodeValue) {
				var thisId = $(nodeValue).children('.node-circle');
				contextGenerator.removeNode($(thisId).data('id'));
			});
			console.log('trying to remove element');
			console.log(name);
			console.log(index);
			$('div[data-index="'+index+'"]').remove();
			return true;
		} else {
			note.warn('contextGenerator.deleteContext() couldn\'t find a context with name '+name+'. Nothing was deleted.');
			return false;
		}

	};

	contextGenerator.getContextNodes = function(index) {
		if (!index) {
			note.error('No context index provided to contextGenerator.getContextNodes().');
		}

		var nodes = [];
		// Remove nodes
		var childNodes = $('div[data-index="'+index+'"]').children('.node-circle-container');
		$.each(childNodes, function(nodeIndex, nodeValue) {
			var thisId = $(nodeValue).children('.node-circle');
			nodes.push($(thisId).data('id'));
		});

		return nodes;

	};

	contextGenerator.removeNode = function(id) {
		if (!id) {
			note.error('No id provided to contextGenerator.deleteNode().');
			throw new Error('No id provided to contextGenerator.deleteNode().');
		}

		if (contextGenerator.options.network.removeNode(id)) {
			$('div[data-id="'+id+'"]').remove();
			note.info('Deleted node with id '+id);
			return true;
		} else {
			note.warn('contextGenerator.removeNode() tried to remove node with ID '+id+', but failed.');
			return false;
		}
	};

	contextGenerator.moveNode = function(node, targetContext) {

		var properties = {};
		properties[contextGenerator.options.nodeDestination] = [];
		properties[contextGenerator.options.nodeDestination].push(contexts[targetContext]);
		contextGenerator.options.network.updateNode(node, properties, function() {
			var target = $('div[data-index="'+targetContext+'"]');
			var element = $('div[data-id="'+node+'"]').parent();
			$(element).appendTo(target);
			return true;
		});
	};

	return contextGenerator;
};

},{}],2:[function(require,module,exports){
/* global window,$ */
/* exported DateInterface */

module.exports = function DateInterface() {
    'use strict';

    // dateInterface globals

    var dateInterface = {};
    var edges;

    dateInterface.options = {
        targetEl: $('.container'),
        edgeType: 'Dyad',
        heading: 'Default Heading'
    };



    dateInterface.init = function(options) {
        window.tools.extend(dateInterface.options, options);
        dateInterface.options.targetEl.append('<div class="node-question-container"></div>');
        $('.node-question-container').append('<h1>'+dateInterface.options.heading+'</h1>');
        $('.node-question-container').append('<p class="lead">'+dateInterface.options.subheading+'</p>');
        dateInterface.options.targetEl.append('<div class="date-container"></div>');

        // get edges according to criteria
        edges = netCanvas.Modules.session.getPrimaryNetwork().getEdges(dateInterface.options.criteria);
        var counter = 0;
        var row = 0;
        $.each(edges, function(index,value) {

            var dyadEdge = netCanvas.Modules.session.getPrimaryNetwork().getEdges({type:'Dyad', from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to:value.to})[0];

            var markup =
            '<div class="date-picker-item overlay">'+
                '<div class="row">'+
                    '<div class="col-sm-12">'+
                        '<h2>Regarding <span>'+dyadEdge.nname_t0+'</span></h2>'+
                    '</div>'+
                '</div>'+
                '<div class="row">'+
                    '<div class="col-sm-12 alert alert-danger logic-error" role="alert">'+
                        '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>'+
                        '<span class="sr-only">Error:</span> Your last sexual encounter cannot come before your first. Please correct the dates before continuing.'+
                    '</div>'+
                    '<div class="col-sm-5">'+
                        '<div class="form-group">'+
                            '<p class="lead">When was the first time you had sex?</p>'+
                            '<div class="input-group date first row'+row+'" id="datetimepicker'+counter+'">'+
                                '<input type="text" class="form-control" />'+
                                '<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>'+
                            '</div>'+
                            '<div class="checkbox">'+
                                '<label><input type="checkbox" name="checkbox-time" class="checkbox-time checkbox'+counter+'"> More than 6 months ago.</label>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                    '<div class="col-sm-5 col-sm-offset-2">'+
                        '<div class="form-group">'+
                            '<p class="lead">When was the last time you had sex?</p>'+
                            '<div class="input-group date second row'+row+'" id="datetimepicker'+(counter+1)+'">'+
                                '<input type="text" class="form-control" />'+
                                '<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
            '</div>';

            $(markup).appendTo('.date-container');
            var dateoptions = {format: 'MM/DD/YYYY'};

            $('#datetimepicker'+counter).datetimepicker(dateoptions);
            $('#datetimepicker'+(counter+1)).datetimepicker(dateoptions);

            $('#datetimepicker'+counter+', #datetimepicker'+(counter+1)).on('dp.change',function (e) {
                var properties = {};
                var target, first, second, incomingDate;

                var $current = $(this);

                if ($(this).hasClass('first')) {

                    if ($('.checkbox'+$current.attr('id').slice(-1)).is(':checked')) {
                        properties.sex_first_before_range = true;
                        incomingDate = null;
                    } else {
                        properties.sex_first_before_range = false;
                        incomingDate = $current.data('DateTimePicker').date().format('MM/DD/YYYY');
                    }

                    target = parseInt($current.attr('id').slice(-1))+1;
                    first = parseInt($current.attr('id').slice(-1));
                    second = parseInt($current.attr('id').slice(-1))+1;

                    if (e.date !== null ) {
                        // $('#datetimepicker'+second).data('DateTimePicker').minDate(e.date);
                    }

                    properties.sex_first_t0 = incomingDate;

                } else {

                    if ($('.checkbox'+$current.attr('id').slice(-1)).is(':checked')) {
                        properties.sex_last_before_range = true;
                        incomingDate = null;
                    } else {
                        properties.sex_last_before_range = false;
                        incomingDate = $current.data('DateTimePicker').date().format('MM/DD/YYYY');
                    }

                    target = parseInt($current.attr('id').slice(-1))-1;
                    first = parseInt($current.attr('id').slice(-1))-1;
                    second = parseInt($current.attr('id').slice(-1));

                    if (e.date !== null) {
                        // $('#datetimepicker'+first).data("DateTimePicker").maxDate(e.date);
                    }

                    properties.sex_last_t0 = incomingDate;

                }

                netCanvas.Modules.session.getPrimaryNetwork().updateEdge(value.id, properties);

                if (window.moment($('#datetimepicker'+first).data('DateTimePicker').date()).isAfter($('#datetimepicker'+second).data('DateTimePicker').date())) {
                    $current.parent().parent().parent().children('.logic-error').fadeIn();
                    $('.arrow-next').attr('disabled','disabled');
                } else {
                    $current.parent().parent().parent().children('.logic-error').fadeOut();
                    $('.arrow-next').removeAttr('disabled');
                }

            });

            if (typeof value.sex_first_t0 !== 'undefined') {
                if (value.sex_first_t0 === null) {
                    $('.checkbox'+counter).prop('checked', true);
                    $('#datetimepicker'+counter).data('DateTimePicker').date(window.moment().subtract(6, 'months').format('MM/DD/YYYY'));
                    $('#datetimepicker'+counter).children().css({opacity:0.5});
                    $('#datetimepicker'+counter).data('DateTimePicker').disable();

                } else {
                    $('#datetimepicker'+counter).data('DateTimePicker').date(value.sex_first_t0);
                }

            }
            if (typeof value.sex_last_t0 !== 'undefined') {
                if (value.sex_last_t0 === null) {
                    $('.checkbox'+(counter+1)).prop('checked', true);
                    $('#datetimepicker'+(counter+1)).data('DateTimePicker').date(window.moment().subtract(6, 'months').format('MM/DD/YYYY'));
                    $('#datetimepicker'+(counter+1)).children().css({opacity:0.5});
                    $('#datetimepicker'+(counter+1)).data('DateTimePicker').disable();

                } else {
                    $('#datetimepicker'+(counter+1)).data('DateTimePicker').date(value.sex_last_t0);
                }

            }

            $('.checkbox'+counter+', .checkbox'+(counter+1)).change(function(e) {
                var $target = $(e.target);
                if(this.checked) {
                    $target.parent().parent().parent().children('.date').data('DateTimePicker').date(window.moment().subtract(6, 'months').format('MM/DD/YYYY'));
                    $target.parent().parent().parent().children('.date').data('DateTimePicker').disable();
                    $target.parent().parent().parent().children('.date').children().css({opacity:0.5});
                } else {
                    $target.parent().parent().parent().children('.date').data('DateTimePicker').enable();
                    $target.parent().parent().parent().children('.date').children().css({opacity:1});
                    $target.parent().parent().parent().children('.date').data('DateTimePicker').date(window.moment().format('MM/DD/YYYY'));
                }
            });


            counter=counter+2;
            row++;
        });



    };

    dateInterface.destroy = function() {
        // Used to unbind events
    };

    return dateInterface;
};

},{}],3:[function(require,module,exports){
/* global $, window, jQuery, note, alert */
/* exported FormBuilder */

module.exports = function FormBuilder(formName) {
  'use strict';

  var formBuilder = {};
  var thisForm;
  var formOptions = {
    open: false,
    inline: false
  };
  var html = '<form></form>';
  var deferredTasks = [];
  var moduleEvents = [];
  var formFields;
  var temporaryFields = [];
  var targetEl;
  var name = formName ? formName : 'Default';
  window.forms = window.forms || {};
  window.forms[name] = formBuilder;

  formBuilder.init = function() {

    note.info('FormBuilder initialised.');
  };

  formBuilder.getID = function() {
    return thisForm.id;
  };

  formBuilder.reset = function() {
    $(html).find('.alert').fadeOut();
    $(html)[0].reset();

    // Reset all custom components
    $.each (thisForm.fields, function(fieldIndex, fieldValue) {
      if (fieldValue.type === 'custom') {
        thisForm.options.customFields[fieldValue.customType].reset();
      }
    });

  };

  formBuilder.showError = function(error) {
    $(html).find('.alert').fadeIn();
    $(html).find('.error').html(error);
  };

  formBuilder.addDeferred = function(item) {
    note.debug('FormBuilder ['+name+']: adding deferred form task.');
    deferredTasks.push(item);
  };

  formBuilder.runDeferred = function() {
    note.debug('FormBuilder ['+name+']: running deferred form initialisation actions.');
    for (var i = 0; i < deferredTasks.length; i++) {
      if (typeof deferredTasks[i].action === 'function') {
        deferredTasks[i].action();
      }
    }

    deferredTasks = [];
  };

  // show and hide methods
  formBuilder.show = function() {
    note.debug('FormBuilder ['+name+']: show()');
    // Run custom show or hide functions, if present
    if (typeof thisForm.show === 'function') {
      note.debug('FormBuilder ['+name+']: show.() running custom show function.');
      thisForm.show();
    }


    targetEl.css('display','block');
    $('.black-overlay').addClass('show');
    setTimeout(function() {
      targetEl.addClass('show');
    }, 100);

    setTimeout(function() {
      $('#'+$(html).attr('id')+' :input:visible:enabled:first').focus();
    }, 500);

  };

  formBuilder.hide = function () {
    note.debug('FormBuilder ['+name+']: hide.');
    targetEl.removeClass('show');

    setTimeout(function() {
      $(thisForm).trigger('reset');
      formBuilder.removeTemporaryFields();
    }, 250);

    setTimeout(function() {
      $('.black-overlay').removeClass('show');
      targetEl.css('display','none');
    }, 300);



  };

  formBuilder.build = function(element, form, options) {
    // element = target element to inject the form into
    // form = an object containing the form fields and configuration options. Also contains load, show, hide, and submit events.
    // options = buttons and custom field type definitions.

    var userOptions = options || {};
    $.extend(formOptions, userOptions);
    thisForm = form;
    targetEl = element;
    // Form options
    if (formOptions.inline === true) {
      html = $(html).addClass('inline-form');
    }

    if (typeof form.heading !== 'undefined') {
      html = $(html).append('<div class="page-header"><h1>'+form.heading+'</h1></div>');
    }

    if (typeof form.title !== 'undefined') {
      html = $(html).append('<legend>'+form.title+'</legend><div class="alert alert-danger" role="alert" style="display: none;"><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> <span class="error"></span></div>');
    }

    // Form fields
    formFields = '<div class="form-fields"></div>';
    formBuilder.addFields(form.fields);

    html = $(html).append(formFields);

    // Buttons
    var buttonGroup = '<div class="text-right button-group"></div>';

    $.each(form.options.buttons, function(buttonIndex, buttonValue){
      buttonGroup = $(buttonGroup).append('<button id="'+buttonValue.id+'" type="'+buttonValue.type+'" class="btn '+buttonValue.class+'">'+buttonValue.label+'</button>&nbsp;');
    });

    html = $(html).append(buttonGroup);

    // Check if we are outputting html or writing to DOM
    if (element instanceof jQuery) {
      note.debug('Formbuilder ['+name+'] outputting to jQuery object.');
      // Write to DOM
      html = $(html).uniqueId();
      thisForm.id = $(html).prop('id');
      element.append(html);
      formBuilder.addEvents();
      // Data population
      if (typeof form.data !== 'undefined') {
        formBuilder.addData(form.data);
      }
      $(html).trigger('formLoaded');
    } else if (element === 'html') {
      note.debug('Formbuilder ['+name+'] outputting HTML.');
      // return the html for the form
      html = $(html).uniqueId();
      thisForm.id = $(html).prop('id');
      return html;
    } else {
      throw new Error('Formbuilder ['+name+'] didn\'t understand the intended output destination of the build method.');
    }

  };

  formBuilder.removeTemporaryFields = function() {
    note.debug('FormBuilder ['+name+']: removeTemporaryFields()');
    note.trace(temporaryFields);
    $.each(temporaryFields, function(fieldIndex, fieldValue) {
      formBuilder.removeField(fieldValue.id);
    });

    temporaryFields = [];
  };

  formBuilder.addTemporaryFields = function(fields) {
    note.debug('FormBuilder ['+name+']: addTemporaryFields()');
    $.each(fields, function(fieldIndex, fieldValue) {
      fieldValue.id = fieldIndex;
      temporaryFields.push(fieldValue);
    });

    formBuilder.addFields(fields);
  };

  formBuilder.addFields = function(fields) {
    var wrapper, variableComponent, variableLabel, checkLabel, placeholder, required;
    note.debug('FormBuilder ['+name+']: addFields(). Iterating through fields.');
    $.each(fields, function(formIndex, formValue) {
      note.trace('FormBuilder ['+name+']: addFields() adding '+formIndex);
      if (!formBuilder.fieldExists(formIndex)) {
        note.trace('FormBuilder ['+name+']: addFields() creating field for '+formIndex);
        variableComponent = ''; variableLabel = ''; checkLabel = '';
        placeholder = formValue.placeholder? formValue.placeholder : '';
        required = formValue.required? 'required' : '';

        if (formValue.type === 'text') {
          note.trace('FormBuilder ['+name+']: addFields() '+formIndex+' type is text.');
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          if (typeof formValue.title !== 'undefined') {
            variableLabel = '<label for="'+formIndex+'">'+formValue.title+'</label>';
          }

          variableComponent = '<input type="'+formValue.type+'" class="form-control" id="'+formIndex+'" name="'+formIndex+'" placeholder="'+placeholder+'" autocomplete="off" '+required+'>';
          wrapper = $(wrapper).append(variableLabel+variableComponent);
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'custom') {
          note.trace('formBuilder.addFields(): '+formIndex+' is a custom form field!');

          // Check if we have been supplied a definition
          if (typeof formValue.customType !== 'undefined' && typeof thisForm.options.customFields[formValue.customType] !== 'undefined') {
            // Check if the definition has a markup function
            if (typeof thisForm.options.customFields[formValue.customType].markup !== 'undefined') {
              wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
              // Pass the markup method the fields options, incase it needs them
              wrapper = $(wrapper).append(thisForm.options.customFields[formValue.customType].markup(formValue.options));
              formFields = $(formFields).append(wrapper);


              // Initialise components as required
              if (typeof thisForm.options.customFields[formValue.customType].markup !== 'undefined') {
                formBuilder.addDeferred({
                  action: thisForm.options.customFields[formValue.customType].initialise
                });
              }

            } else {
              note.warn('formBuilder.addFields(): Custom field of type "'+formValue.customType+'" did not have any markup defined. It will be ignored.');
            }
          } else {
            note.warn('formBuilder.addFields(): Could not find a definition for the custom field type "'+formValue.customType+'". Ignoring.');
          }

          // formValue.customType
        } else if (formValue.type === 'hidden') {
          note.trace('FormBuilder ['+name+']: addFields() '+formIndex+' type is hidden.');
          wrapper = '<div class="hidden-form-group" data-component="'+formIndex+'"></div>';

          variableComponent = '<input type="'+formValue.type+'" class="form-control" id="'+formIndex+'" name="'+formIndex+'" placeholder="'+placeholder+'" autocomplete="off" '+required+'>';
          wrapper = $(wrapper).append(variableLabel+variableComponent);
          formFields = $(formFields).append(wrapper);

        } else if (formValue.type === 'number') {
          note.trace('FormBuilder ['+name+']: addFields() '+formIndex+' type is number.');

          // Create component container
          var component = '<div class="form-group" data-component="'+formIndex+'"></div>';

          // Append Label
          component = $(component).append('<label for="'+formIndex+'">'+formValue.title+'</label>');

          // Create input group container
          var inputGroup = '<div class="input-group"></div>';

          // Check if we have a prefix
          if (typeof formValue.prefix !== 'undefined') {
            // If we do, append it
            inputGroup = $(inputGroup).append('<span class="input-group-addon">'+formValue.prefix+'</span>');
          }

          // Create an input element
          var input = '<input type="number" class="form-control" id="'+formIndex+'" name="'+formIndex+'" placeholder="'+placeholder+'" autocomplete="off" '+required+'>';

          // Set the input attributes
          var properties = {};
          properties.min = formValue.min ? formValue.min : '0';
          properties.max = formValue.max ? formValue.max : '';
          input = $(input).attr(properties);

          // Append the input to the input group or the component
          if (typeof formValue.prefix !== 'undefined') {
            inputGroup = $(inputGroup).append(input);
            // Appent the input group to the componens
            component = $(component).append(inputGroup);

          } else {
            component = $(component).append(input);
          }

          // Append the component to the form
          formFields = $(formFields).append(component);
        } else if (formValue.type === 'slider') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is slider.');
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableLabel = '<label for="'+formIndex+'">'+formValue.title+'</label>';
          variableComponent = '<input type="text" class="form-control slider" id="'+formIndex+'" name="'+formIndex+'">';
          // Initialise sliders through deferred action
          formBuilder.addDeferred({
            action: function() {
              $('#'+formIndex).bootstrapSlider({min: 0, max: 100, value: formValue.initial });
            }
          });

          wrapper = $(wrapper).append(variableLabel+variableComponent);
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'email') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is email.');
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableLabel = '<label for="'+formIndex+'">'+formValue.title+'</label>';
          variableComponent = '<input type="email" class="form-control" id="'+formIndex+'" name="'+formIndex+'" placeholder="'+placeholder+'" autocomplete="off" '+required+'>';
          wrapper = $(wrapper).append(variableLabel+variableComponent);
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'textarea') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is textarea.');
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableLabel = '<label for="'+formIndex+'">'+formValue.title+'</label>';
          variableComponent = '<textarea class="form-control" id="'+formIndex+'" name="'+formIndex+'" rows="'+formValue.rows+'" cols="'+formValue.cols+'" autocomplete="off" placeholder="'+placeholder+'" '+required+'></textarea>';
          wrapper = $(wrapper).append(variableLabel+variableComponent);
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'radio') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is radio.');
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableComponent = '';
          variableLabel = '<label class="control-label">'+formValue.title+'</label>';
          wrapper = $(wrapper).append(variableLabel);

          $.each(formValue.variables, function(checkIndex, checkValue){
            variableComponent = '<input type="radio" name="'+formIndex+'" value="'+checkValue.value+'" id="'+checkValue.id+'" '+required+'>';
            checkLabel = '<label class="radio-inline" for="'+checkValue.id+'">'+checkValue.label+'</label>';
            wrapper = $(wrapper).append(variableComponent+checkLabel);
          });
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'checkbox') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is checkbox.');
          // inline or regular?
          var inline = formValue.inline ? 'checkbox-inline' : 'checkbox';

          // Create wrapper element
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableComponent = '';
          variableLabel = '<label class="control-label">'+formValue.title+'</label>';
          wrapper = $(wrapper).append(variableLabel);

          // Append checkboxes
          $.each(formValue.variables, function(checkIndex, checkValue){
            variableComponent = '<input type="checkbox" data-field="'+formIndex+'" name="'+formIndex+'" value="'+checkValue.id+'" id="'+checkValue.id+'" '+required+'>';
            checkLabel = '<label class="'+inline+'" for="'+checkValue.id+'">'+checkValue.label+'</label>';
            wrapper = $(wrapper).append(variableComponent+checkLabel);
          });
          formFields = $(formFields).append(wrapper);
        } else if (formValue.type === 'button-checkbox') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' type is button-checkbox.');
          // Create wrapper element
          wrapper = '<div class="form-group" data-component="'+formIndex+'"></div>';
          variableComponent = '';
          variableLabel = '<label class="control-label">'+formValue.title+'</label>';
          wrapper = $(wrapper).append(variableLabel);

          // Append checkboxes
          $.each(formValue.variables, function(checkIndex, checkValue){
            variableComponent = '<input type="checkbox" data-field="'+formIndex+'" name="'+checkValue.id+'" id="'+checkValue.id+'" '+required+'>';
            checkLabel = '<label class="checkbox-inline" for="'+checkValue.id+'">'+checkValue.label+'</label>';
            wrapper = $(wrapper).append(variableComponent+checkLabel);
          });
          formFields = $(formFields).append(wrapper);
        }
      } else if(formBuilder.fieldExists(formIndex)) {
        note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' already existed...analysing further.');
        variableComponent = ''; variableLabel = ''; checkLabel = '';
        placeholder = formValue.placeholder? formValue.placeholder : '';
        required = formValue.required? 'required' : '';


        if (formValue.type === 'button-checkbox') {
          note.debug('FormBuilder ['+name+']: addFields() '+formIndex+' a checkbox...building an array.');
          // This field exists. If we are trying to define it again, perhaps it is a checkbox group
          // If it is, we should append the label and input to the existing form group
          // Create wrapper element

          // Append checkboxes
          $.each(formValue.variables, function(checkIndex, checkValue){
            variableComponent = '<input type="checkbox" data-field="'+formIndex+'" name="'+checkValue.id+'" id="'+checkValue.id+'" '+required+'>';
            checkLabel = '<label class="checkbox-inline" for="'+checkValue.id+'">'+checkValue.label+'</label>';
            $(formFields).find('[data-component="'+formIndex+'"]').append(variableComponent+checkLabel);
          });
        } else {
          note.error('FormBuilder ['+name+']: Field with id "'+formIndex+'" already exists!');
        }

      }

    });

    formBuilder.runDeferred();
  };

  formBuilder.removeFields = function(fields) {
    note.debug('FormBuilder ['+name+']: removeFields()');
    $.each(fields, function(fieldIndex) {
      formBuilder.removeField(fieldIndex);
    });
  };

  formBuilder.removeField = function(id) {
    $('[data-component="'+id+'"]').remove();
  };

  formBuilder.fieldExists = function(id) {
    note.trace('FormBuilder ['+name+']: fieldExists() '+id+'...');
    if ($('#'+thisForm.id).find('#'+id).length > 0) {
      note.trace('...exists');
      return true;
    } else if ($('#'+thisForm.id).find('[data-component="'+id+'"]').length > 0) {
      note.trace('...exists as a checkbox.');
      return true;
    } else {
      note.trace('...not found');
      return false;
    }
  };

  formBuilder.fieldType = function(id) {
    var fieldType = $($('#'+thisForm.id).find('#'+id)[0]).prop('type') || false;
    return fieldType;
  };

  formBuilder.addEvents = function() {

    // submit
    window.tools.Events.register(moduleEvents,
      [
        {
          targetEl: $(html),
          event: 'submit',
          handler: function(e) {
            note.debug('FormBuilder ['+name+']: Form submitted.');

            e.preventDefault();

            var data = $(this).serializeArray();
            var cleanData = {};
            for (var i = 0; i < data.length; i++) {

              // To handle checkboxes, we check if the key already exists first. If it
              // does, we append new values to an array. This keeps compatibility with
              // single form fields, but might need revising.

              // Handle checkbox values
              if (data[i].value === 'on') { data[i].value = 1; }

              // This code takes the serialised output and puts it in the structured required to store within noded/edges.
              if (typeof cleanData[data[i].name] !== 'undefined' && typeof cleanData[data[i].name] !== 'object') {
                // if it isn't an object, its a string. Create an empty array and store by itself.
                cleanData[data[i].name] = [cleanData[data[i].name]];
                cleanData[data[i].name].push(data[i].value);
              } else if (typeof cleanData[data[i].name] !== 'undefined' && typeof cleanData[data[i].name] === 'object'){
                // Its already an object, so append our new item
                cleanData[data[i].name].push(data[i].value);
              } else {
                // This is for regular text fields. Simple store the key value pair.
                cleanData[data[i].name] = data[i].value;
              }

            }

            note.debug(cleanData);

            if (typeof thisForm.submit !== 'undefined') {
              thisForm.submit(cleanData);
            }

          }
        },
        {
          targetEl: $('input'),
          event: 'change paste keyup',
          handler: function() {
            $('#'+thisForm.options.buttons.submit.id).html(thisForm.options.buttons.submit.update_label);
          }
        }
      ]);

      // onLoad
      if (typeof thisForm.load !== 'undefined') {
        window.tools.Events.register(moduleEvents, [{
          targetEl: $(html),
          event: 'formLoaded',
          handler: function() {
            thisForm.load(thisForm);
          }
        }]);
      }

      $.each(thisForm.options.buttons, function(buttonIndex, buttonValue){
        if(typeof buttonValue.action !== 'undefined') {
          window.tools.Events.register(moduleEvents, [{
            targetEl: $('#'+buttonValue.id),
            event: 'click',
            handler: buttonValue.action
          }]);
        }
      });

    };

    formBuilder.isOpen = function() {
      return true;
    };

    formBuilder.isClosed = function() {
      return false;
    };

    formBuilder.destroy = function() {
      window.tools.Events.unbind(moduleEvents);
    };

    formBuilder.addData = function(data) {
      note.info('FormBuilder ['+name+']: addData()');
      note.debug(data);
      $.each(data, function(dataIndex, dataValue) {
        note.trace('formbuilder.addData() analysing data for field '+dataIndex);
        if (formBuilder.fieldExists(dataIndex)) {
          note.debug(dataIndex+' exists. Continuing...');
          // For standard inputs
          var currentType = formBuilder.fieldType(dataIndex);

          // But we need this for checkboxes
          currentType = currentType ? currentType : 'checkbox';
          note.trace('Identified '+dataIndex+' as type '+currentType);
          if (currentType === 'text' || currentType === 'email' || currentType === 'number' || currentType === 'hidden') {
            note.trace('assigning '+dataValue+' to '+dataIndex);
            $(html).find('#'+dataIndex).val(dataValue);
          } else if (currentType === 'slider') {
            var dataValueArray = dataValue.split(',').map(Number);
            if (dataValueArray.length>1) {
              $(html).find('#'+dataIndex).val(dataValue);
              $(html).find('#'+dataIndex).bootstrapSlider({min: 0, max: 100, value: dataValueArray });
            } else {
              $(html).find('#'+dataIndex).val(dataValue[0]);
              $(html).find('#'+dataIndex).bootstrapSlider({min: 0, max: 100, value: dataValue[0] });
            }
          } else if (currentType === 'textarea') {
            $(html).find('#'+dataIndex).html(dataValue);
          } else if (currentType === 'radio') {
            $('input:radio[name="'+dataIndex+'"][value="'+dataValue+'"]').prop('checked', true).trigger("change");
          } else if (currentType === 'checkbox') {
            note.trace('adding checkbox data');
            note.trace(dataIndex);
            note.trace(dataValue);
            // If single value, use directly
            if (typeof dataValue !== 'undefined' && typeof dataValue === 'object') {
              // If array, iterate
              for (var i = 0; i < dataValue.length; i++) {
                $(html).find('input:checkbox[value="'+dataValue[i]+'"]').prop('checked', true).trigger("change");
              }
            } else if (typeof dataValue !== 'undefined' && typeof dataValue === 'string') {
              $(html).find('input:checkbox[value="'+dataValue+'"]').prop('checked', true).trigger("change");
            } else if (typeof dataValue !== 'undefined' && typeof dataValue === 'number') {
              $(html).find('#'+dataIndex).prop('checked', true).trigger("change");

            }

          } else {
            note.warn('currentType '+currentType+' not understood.');
          }
        } else {
          // If the dataIndex doesn't exist as a key in the fields object, it could be a sub-key
          // if, for example, it is the child of a checkbox variable
          note.debug('FormBuilder ['+name+']: Data provided for undefined field "'+dataIndex+'"');
        }
      });
    };

    formBuilder.init();

    return formBuilder;
  };

},{}],4:[function(require,module,exports){
/* global window, alert, note, $, Mousetrap, network, netCanvas */

var Hacks = function Hacks() {
    'use strict';
    var hacks = {}, moduleEvents = [];

    hacks.bindEvents = function() {

        // Events
        var event = [
            {
                event: 'keydown',
                targetEl: window.document,
                handler: hacks.handleKeyPress
            },
            {
                event: 'keyup',
                targetEl: window.document,
                subTarget: '.new-node-form #name',
                handler: hacks.nicknameGenerator
            },
            {
                event: 'onmousedown',
                targetEl: window.document,
                handler: function disableclick(event) {
                    if(event.button===2) {
                        return false;
                    }
                }
            },
            {
                event: 'MSHoldVisual',
                targetEl: window.document,
                handler: function(e) { e.preventDefault(); }
            },
            {
                event: 'contextmenu',
                targetEl: window.document,
                handler: function(e) { e.preventDefault(); }
            }
        ];
        window.tools.Events.register(moduleEvents, event);

        // Mousetrap events
        Mousetrap.bind(['command+k', 'ctrl+k'], function(e) {
            e.preventDefault();
            // show hide key
            $(':focus').blur();
            $('.key-panel').toggleClass('on');
        });

        Mousetrap.bind(['command+r', 'ctrl+r'], function() {
            alert('MOFO');
        });

    };

    hacks.renameContext = function(contextName, newName) {
        // get ego
        var ego = network.getEgo();
        ego.contexts.replace(contextName, newName);



        //get nodes
        var nodes = network.getNodes();
        $.each(nodes, function(nodeIndex, nodeValue) {
            if (nodeValue.contexts) {
                nodeValue.contexts.replace(contextName, newName);
            }
        });

        // save everything
        netCanvas.Modules.session.saveData();


        // refresh stage
        $('.refresh-button').trigger('click');
    };

    hacks.unbindEvents = function() {
        window.tools.Events.unbind(moduleEvents);
    };

    hacks.init = function() {
        hacks.bindEvents();
    };

    hacks.destroy = function() {
        hacks.unbindEvents();
    };

    function isEditable($element) {
        return $element.is( 'input[type!="radio"][type!="checkbox"][type!="date"]:not(:disabled):not([readonly]), textarea:text:not(:disabled):not([readonly])') ;
    }

    hacks.nicknameGenerator = function(e) {
        // console.log('nickname');
        // If key is NOT the enter key
        if (e.keyCode !== 13) {
            if($('#name').val().length > 0) {
                var split = $('#name').val();
                split = split.split(' ');
                var fname = split[0];
                var lname;
                if (split.length > 1) {
                    lname = split[split.length-1];
                    if (lname.length > 0) {
                        lname = lname[0]+'.';
                    } else {
                        lname = '';
                    }


                } else {
                    lname = '';
                }

                var label = fname+' '+lname;


                var updateName = function() {
                    $('#label').val(label);
                };

                setTimeout(updateName,0);

            }
        }
    };

    hacks.handleKeyPress = function(e) {
        // note.info('hacks.handleKeyPress');
        note.trace(e.keyCode);
        if (!isEditable($(':focus'))) {
            // console.log('preventDefault');
            e.preventDefault();
        }

        // enter key
        if (e.keyCode === 13) {
            // alert('enter key');
        }

        // Escape key
        if (e.keyCode === 27) {
            // alert('escape key');
        }

        // Prevent accidental backspace navigation
        if (e.keyCode === 8 && !$(e.target).is('input, textarea')) {
            // alert('backspace disabled');
            e.preventDefault();
        }



    };

    hacks.init();

    return hacks;


};

module.exports = new Hacks();

},{}],5:[function(require,module,exports){
/* global window, require, note, nodeRequire, isNodeWebkit */
/* exported IOInterface */

var IOInterface = function IOInterface() {
    'use strict';
    var Datastore = require('nedb');
    var path = require('path');
    var db;
    var ioInterface = {};
    var initialised = false;

    ioInterface.init = function(callback) {

        var dbLocation = path.join('database/', window.netCanvas.Modules.session.name+'.db');

        // Use the node version of nedb when in the node webkit environment.
        if(isNodeWebkit === true) {
            Datastore = nodeRequire('nedb');
            path = nodeRequire('path');
            dbLocation = path.join(nodeRequire('nw.gui').App.dataPath, window.netCanvas.Modules.session.name+'.db');
        }

        // After init, first priority is to to to load previous session for this protocol.
        // Whatever happens, the result of this should call the callback function passing the session id as the only parameter
        note.info('ioInterface initialising.');
        note.debug('Using '+window.netCanvas.Modules.session.name+' as database name.');

        db = new Datastore({ filename: dbLocation, autoload: true });
        initialised = true;
        callback();

    };

    ioInterface.getLastSession = function(callback) {
      note.debug('ioInterface.getLastSession()');
        db.find({}).sort({date:-1}).exec(function (err, docs) {
            if (err) {
                return false;
                // handle error
            }
            note.trace(docs[0]);
            if (docs.length !== undefined && docs.length > 0) {
                initialised = true;
                note.trace('ioInterface.getLastSession(): previous session found. Returning.');
                callback(docs[0]);
                return true;
            } else {
                ioInterface.newSession(function(newDoc) {
                    initialised = true;
                    note.trace('ioInterface.getLastSession(): returning a new session.');
                    callback(newDoc);
                    return true;
                });
            }

        });
    };

    ioInterface.newSession = function(callback) {
        var sessionDate = new Date();
        db.insert([{'date': sessionDate, 'sessionParameters':{}}], function (err, newDoc) {
            if(err) {
                note.error(err);
                return false;
            }

            note.debug('ioInterface added a new session with id '+newDoc[0]._id);

            callback(newDoc[0]);
            return true;
        });
    };

    ioInterface.insertFile = function(file, callback) {

        ioInterface.newSession(function(doc) {
            ioInterface.save(file, doc._id, function() {
                callback(doc._id);
            });
        });

    };

    ioInterface.getSessions = function(callback) {
        db.find({}).sort({date:-1}).exec(function (err, docs) {
            if (err) {
                // handle error
                return false;
            }
            callback(docs);
        });

    };

    ioInterface.getDB = function() {
        return db;
    };

    ioInterface.initialised = function() {
        if (initialised) {
            return true;
        } else {
            return false;
        }
    };

    ioInterface.save = function(sessionData, id, callback) {
      note.debug('ioInterface.save(): '+id);
        delete sessionData._id;
        sessionData.date = new Date();
        note.debug(sessionData);
        db.update({_id: id }, sessionData, {}, function (err) {
            if (err) {
                return false;
            }

            if(callback) {
                callback();
            }
        });
    };

    ioInterface.reset = function(callback) {
        // db.find with empty object returns all objects.
        db.find({}, function (err, docs) {
            if (err) {
                note.error(err);
                return false;
            }

            var resultLength = docs.length;
            for (var i = 0; i < resultLength; i++) {
                ioInterface.deleteDocument(docs[i]._id);
            }

            if (callback) { callback(); }
        });
    };

    ioInterface.deleteDocument = function(id, callback) {
      if(!id) {
        return false;
      }
        note.info('ioInterface deleting document with id '+id);
        db.remove({ _id: id }, {}, function (err) {
            if (err) {
                note.error(err);
                return false;
            }
            note.debug('Deleting complete.');
            if(callback) { callback(); }
        });
    };

    ioInterface.load = function(id, callback) {
        note.info('ioInterface loading data.');
        db.find({'_id': id}, function (err, docs) {
            if (err) {
                // handle error
                return false;
            }
            callback(docs[0]);
        });
    };

    return ioInterface;
};

module.exports = new IOInterface();

},{"nedb":35,"path":28}],6:[function(require,module,exports){
/* global $, window */
/* exported ListSelect */
module.exports = function ListSelect() {
    'use strict';
    //global vars
    var listSelect = {};
    listSelect.options = {
        targetEl: $('.container'),
        variables: [],
        heading: 'This is a default heading',
        subheading: 'And this is a default subheading'
    };

    var itemClickHandler = function() {
        //   console.log('item click handler');
        var properties = {};
        var nodeid = $(this).data('nodeid');
        // console.log('nodeid: '+nodeid);

        if ($(this).data('selected') === true) {
            // console.log("$(this).data('selected') === true");
            $(this).data('selected', false);
            $(this).css({'border':'2px solid #eee','background':'#eee'});

            // remove values
            $.each(listSelect.options.variables, function(index,value) {
                if (value.value === nodeid) {
                    properties[value.value] = undefined;
                }
            });
            netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, properties);

        } else {
            $(this).data('selected', true);
            $(this).css({'border':'2px solid red','background':'#E8C0C0'});

            // update values

            $.each(listSelect.options.variables, function(index,value) {
                if (value.value === nodeid) {
                    properties[value.value] = 1;
                }

            });

            netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, properties);

        }

    };

    var stageChangeHandler = function() {
        listSelect.destroy();
    };

    var processSubmitHandler = function() {
        window.session.nextStage();

    };

    listSelect.destroy = function() {
        // Event Listeners
        window.tools.notify('Destroying listSelect.',0);
        $(window.document).off('click', '.inner', itemClickHandler);
        $(window.document).off('click', '.continue', processSubmitHandler);
        window.removeEventListener('changeStageStart', stageChangeHandler, false);

    };

    listSelect.init = function(options) {
        window.tools.extend(listSelect.options, options);
        // Add header and subheader
        listSelect.options.targetEl.append('<h1 class="text-center">'+listSelect.options.heading+'</h1>');
        listSelect.options.targetEl.append('<p class="lead text-center">'+listSelect.options.subheading+'</p>');
        listSelect.options.targetEl.append('<div class="form-group list-container"></div>');

        $.each(listSelect.options.variables, function(index,value) {
            var el = $('<div class="item"><div class="inner" data-nodeid="'+value.value+'"><h3>'+value.label+'</h3></div></div>');
            var properties = {
                type_t0: 'Ego'
            };

            properties[value.value] = 1;
            if (netCanvas.Modules.session.getPrimaryNetwork().getNodes(properties).length>0) {
                el.find('.inner').data('selected', true);
                el.find('.inner').css({'border':'2px solid red','background':'#E8C0C0'});
            }
            $('.list-container').append(el);
        });


        // Event Listeners
        $(window.document).on('click', '.inner', itemClickHandler);
        $(window.document).on('click', '.continue', processSubmitHandler);
        window.addEventListener('changeStageStart', stageChangeHandler, false);


    };

    return listSelect;
};

},{}],7:[function(require,module,exports){
/* exported Logger */
/* global window, $, note */

var Logger = function Logger() {
    'use strict';
    var logger = {};

    // todo: add custom events so that other scripts can listen for log changes (think vis).

    logger.init = function() {
        note.info('Logger initialising.');

        window.log = window.netCanvas.Modules.session.registerData('log', true);

        // listen for log events on node webkit only due to space constraints.
        if (window.isNodeWebkit) {
            window.addEventListener('log', function (e) {
                logger.addToLog(e.detail);
            }, false);
        }
        return true;
    };

    logger.addToLog = function(e) {
        if (!e) { return false; }

        var eventClone = $.extend({}, e.eventObject);

        var data = {
            'eventType': e.eventType,
            'targetObject':eventClone,
            'eventTime': new Date()
        };

        window.netCanvas.Modules.session.addData('log', data, true);
        var eventLogged = new window.CustomEvent('eventLogged', {'detail':data});
        window.dispatchEvent(eventLogged);
        var unsavedChanges = new window.Event('unsavedChanges');
        window.dispatchEvent(unsavedChanges);
        return true;
    };

    return logger;
};

module.exports = new Logger();

},{}],8:[function(require,module,exports){
(function (process){
/* global window, nodeRequire, FastClick, document, Konva, $, L, log, note, tools, isNodeWebkit, UAParser */
$(document).ready(function() {
    'use strict';

    window.$ = $;
    window.L = L;
    window.Konva = Konva;
    window.gui = {};
    window.netCanvas = {};


    window.isNode = (typeof process !== 'undefined' && typeof require !== 'undefined'); // this check doesn't work, because browserify tries to be clever.
    window.isCordova = !!window.cordova;
    window.isNodeWebkit = false;
    window.netCanvas.devMode = false;

    //Is this Node.js?
    if(window.isNode) {
        //If so, test for Node-Webkit
        try {
            window.isNodeWebkit = (typeof nodeRequire('nw.gui') !== 'undefined');
            window.gui = nodeRequire('nw.gui');
            window.isNodeWebkit = true;
        } catch(e) {
            window.isNodeWebkit = false;
        }
    }

    //Don't include cordova library when not in mobile environment
    if(window.isCordova) {
      $('head').append('<script src="cordova.js"></script>');
    }

    // Arguments
    /** build an object (argument: value) for command line arguments independant of platform **/
    window.getArguments = function() {
        var args = false;
        if (window.isNodeWebkit) {
            args = window.gui.App.argv;
            var newArgs = {};
            for (var i= 0; i < args.length; i++) {
                if (args[i].indexOf('--') === 0) { // Argument begins with --
                    var currentArg = args[i].substring(2);
                    currentArg = currentArg.split('=');
                    // remove quotes around strings
                    if (currentArg[1].charAt(0) === '"' && currentArg[1].charAt(currentArg[1].length -1) === '"') {
                        currentArg[1] = currentArg[1].substr(1,currentArg[1].length -2);
                    }
                    newArgs[currentArg[0]] = currentArg[1];
                }
            }
            return newArgs;
        } else if (window.isCordova) {
            // what can we do here?
            return args;
        } else {
            // browser
            var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
            query  = window.location.search.substring(1);

            args = {};
            while ((match = search.exec(query))) {
                args[decode(match[1])] = decode(match[2]);
            }

            return args;
        }
    };

    // Initialise logging and custom notification
    window.note = log.noConflict();
    note.setLevel('warn', false);

    window.logger = require('./logger.js');

    var args = window.getArguments();

    // Enable dev mode.
    if (args && typeof args.dev !== 'undefined' && args.dev !== false && args.dev !== 0) {

        // Set the debug level
        note.setLevel('info', false);
        note.info('Development mode enabled.');

        // Set dev mode to true
        window.netCanvas.devMode = true;

        // Show dev tools if we are in node webkit
        if (window.isNodeWebkit) {
            window.gui.Window.get().showDevTools();
        } else {
            // no way to show dev tools on web browser
        }

        // Show the refresh button
        $('.refresh-button').show();

        // Disable caching of AJAX requests
        $.ajaxSetup({ cache: false });
    } else {
        $('.refresh-button').hide();
        if (window.isNodeWebkit) {
            window.gui.Window.get().enterFullscreen();
        } else {
            // no way to enter full screen automatically on web browser.
            // could show button or prompt?
        }
    }

    // enable custom log level
    if (args && typeof args.debugLevel !== 'undefined') {
        try {
            note.setLevel(args.debugLevel, false);
            note.info('Console logging level set to '+args.debugLevel);
        } catch (e) {
            note.error('Invalid debugLevel parameter "'+args.debugLevel+'"');
        }
    }

    $('.refresh-button').on('click', function() {
        if(window.isNodeWebkit) {
            var _window = window.gui.Window.get();
            _window.reloadDev();
        } else if (window.isCordova) {
            window.location.reload();
        } else {
            window.location.reload();
        }

    });

    // Override notifications on node webkit to use native notifications
    if (isNodeWebkit === true) {
        var oldError = note.error;
        var oldWarn = note.warn;

        note.error = function(msg) {
            tools.nwNotification({
                icon: 'img/error.png',
                body: msg
            });

            oldError(msg);
        };

        note.warn = function(msg) {
            tools.nwNotification({
                icon: 'img/alert.png',
                body: msg
            });

            oldWarn(msg);
        };
    }

    // print some version stuff
    if (window.isNodeWebkit) {
        var version = window.process.versions['node-webkit'];
        note.info('netCanvas '+window.gui.App.manifest.version+' running on NWJS '+version);
    } else if (window.isCordova) {
        // can we get meaningful version info on cordova? how about a get request to the package.json?
        note.info('netCanvas running on cordova '+window.cordova.version+' on '+window.cordova.platformId);
    } else {
        // anything we can do in browser? yes.
        var parser = new UAParser();
        note.info('netCanvas running on '+parser.getBrowser().name+' '+parser.getBrowser().major+' on '+parser.getOS().name+' '+parser.getOS().version);
    }

    // Require tools
    window.tools = require('./tools');

    // Interface Modules
    window.netCanvas.Modules = {};
    window.netCanvas.Modules.Network = require('./network.js');
    window.netCanvas.Modules.NameGenerator = require('./namegenerator.js');
    window.netCanvas.Modules.DateInterface = require('./dateinterface.js');
    window.netCanvas.Modules.OrdBin = require('./ordinalbin.js');
    window.netCanvas.Modules.IOInterface = require('./iointerface.js');
    window.netCanvas.Modules.GeoInterface = require('./map.js');
    window.netCanvas.Modules.RoleRevisit = require('./rolerevisit.js');
    window.netCanvas.Modules.ListSelect = require('./listselect.js');
    window.netCanvas.Modules.MultiBin = require('./multibin.js');
    window.netCanvas.Modules.Sociogram = require('./sociogram.js');
    window.netCanvas.Modules.SociogramMissing = require('./sociogrammissing.js');
    window.netCanvas.Modules.SociogramNarrative = require('./sociogramnarrative.js');
    window.netCanvas.Modules.FormBuilder = require('./formbuilder.js');
    window.netCanvas.Modules.ContextGenerator = require('./contextgenerator.js');
    window.netCanvas.Modules.Menu = require('./menu.js');
    window.hacks = require('./hacks.js');


    // Initialise datastore
    window.dataStore = require('./iointerface.js');


    // Set up a new session
    window.netCanvas.Modules.session = require('./session.js');

    var sessionParameters = {
        sessionID: null,
        protocol: 'dphil-protocol'
    };

    // study protocol
    if (args && typeof args.protocol !== 'undefined') {
        sessionParameters.protocol = args.protocol;
    }

    if (args && typeof args.session !== 'undefined') {
        sessionParameters.sessionID = args.session;
    }

    // Initialise session now.
    // If theres a session ID, pass it.
    // It there isnt (default) the session will attempt to load the most recent session
    window.netCanvas.Modules.session.init(sessionParameters);

    // Initialiser logger
    window.logger.init();

    // Initialise fastclick
    if ('addEventListener' in document) {
        document.addEventListener('DOMContentLoaded', function() {
            FastClick.attach(document.body);
        }, false);
    }

});

}).call(this,require('_process'))
},{"./contextgenerator.js":1,"./dateinterface.js":2,"./formbuilder.js":3,"./hacks.js":4,"./iointerface.js":5,"./listselect.js":6,"./logger.js":7,"./map.js":9,"./menu.js":10,"./multibin.js":11,"./namegenerator.js":12,"./network.js":13,"./ordinalbin.js":14,"./rolerevisit.js":15,"./session.js":16,"./sociogram.js":17,"./sociogrammissing.js":18,"./sociogramnarrative.js":19,"./tools":20,"_process":29}],9:[function(require,module,exports){
/* global $, window */
/* exported GeoInterface */

/*
 Map module.
*/

module.exports = function GeoInterface() {
    'use strict';
  	// map globals
    var log;
    var taskComprehended = false;
 	var geoInterface = {};
 	var leaflet;
 	var edges;
 	var variable = 'res_chicago_location_p_t0';
 	var currentPersonIndex = 0;
 	var geojson;
 	var mapNodeClicked = false;
    var colors = ['#67c2d4','#1ECD97','#B16EFF','#FA920D','#e85657','#20B0CA','#FF2592','#153AFF','#8708FF'];

  	// Private functions

	function toggleFeature(e) {
        if (taskComprehended === false) {
            var eventProperties = {
                zoomLevel: leaflet.getZoom(),
                stage: window.netCanvas.Modules.session.currentStage(),
                timestamp: new Date()
            };
            log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
            window.dispatchEvent(log);
            taskComprehended = true;
        }

        var mapEventProperties = {
            zoomLevel: leaflet.getZoom(),
            timestamp: new Date()
        };
        log = new window.CustomEvent('log', {'detail':{'eventType': 'mapMarkerPlaced', 'eventObject':mapEventProperties}});
        window.dispatchEvent(log);
		var layer = e.target;
		var properties;

		// is there a map node already selected?
		if (mapNodeClicked === false) {
	 		// no map node selected, so highlight this one and mark a map node as having been selected.
	  		highlightFeature(e);
	  		// updateInfoBox('You selected: <strong>'+layer.feature.properties.name+'</strong>. Click the "next" button to place the next person.');

	  		// Update edge with this info
	  		properties = {};
	  		properties[variable] = layer.feature.properties.name;
	  		netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edges[currentPersonIndex].id, properties);
	  		$('.map-node-location').html('<strong>Currently marked as:</strong> <br>'+layer.feature.properties.name);
		} else {
	  	// Map node already selected. Have we clicked the same one again?
	  		if (layer.feature.properties.name === mapNodeClicked) {
	    		// Same map node clicked. Reset the styles and mark no node as being selected
	      		resetHighlight(e);
	      		mapNodeClicked = false;
		  		properties = {};
		  		properties[variable] = undefined;
		  		netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edges[currentPersonIndex].id, properties);

	  		} else {
          resetAllHighlights();
          highlightFeature(e);
          properties = {};
          properties[variable] = layer.feature.properties.name;
          netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edges[currentPersonIndex].id, properties);
		    // TODO: Different node clicked. Reset the style and then mark the new one as clicked.
	  		}

		}

	}

  	function highlightCurrent() {

      if (edges[currentPersonIndex][variable] !== undefined) {
        mapNodeClicked = edges[currentPersonIndex][variable];
        if (edges[currentPersonIndex][variable] === 'Homeless' || edges[currentPersonIndex][variable] === 'Jail') {
          resetPosition();
          var text = 'Homeless';
          if (edges[currentPersonIndex][variable] === 'Jail') {
            text = 'in Jail';
          }
          $('.map-node-location').html('<strong>Currently marked as:</strong> <br>'+text);
        } else {
          $.each(geojson._layers, function(index,value) {
            if (value.feature.properties.name === edges[currentPersonIndex][variable]) {
              $('.map-node-location').html('<strong>Currently marked as:</strong> <br>'+edges[currentPersonIndex][variable]);
              selectFeature(value);
            }
          });
        }

  		} else {
  			resetPosition();
  		}

  	}


  	function highlightFeature(e) {
        var layer = e.target;
        leaflet.fitBounds(e.target.getBounds(), {maxZoom:14});

        layer.setStyle({
        	fillOpacity: 0.8,
          fillColor: colors[1]
        });

        if (!window.L.Browser.ie && !window.L.Browser.opera) {
        	layer.bringToFront();
        }

        mapNodeClicked = layer.feature.properties.name;
    }

  	function selectFeature(e) {
        var layer = e;
        leaflet.fitBounds(e.getBounds(), {maxZoom:14});

        layer.setStyle({
        	fillOpacity: 0.8,
          fillColor: colors[1]
        });

        if (!window.L.Browser.ie && !window.L.Browser.opera) {
        	layer.bringToFront();
        }
    }

  	function resetHighlight(e) {
  		$('.map-node-location').html('');
  		mapNodeClicked = false;
  		geojson.resetStyle(e.target);
  	}

  	function resetAllHighlights() {
  		$('.map-node-location').html('');
  		mapNodeClicked = false;
		$.each(geojson._layers, function(index,value) {
			geojson.resetStyle(value);
		});
  	}

  	function onEachFeature(feature, layer) {
  		layer.on({
  			click: toggleFeature
  		});
  	}

  	function resetPosition() {
  		leaflet.setView([41.798395426119534,-87.839671372338884], 11);
  	}

    function setHomeless() {
        resetAllHighlights();
        var properties = {};
        properties[variable] = 'Homeless';
        netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edges[currentPersonIndex].id, properties);
        $('.map-node-location').html('<strong>Currently marked as:</strong> <br>Homeless');
    }

    function setJail() {
        resetAllHighlights();
        var properties = {};
        properties[variable] = 'Jail';
        netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edges[currentPersonIndex].id, properties);
        $('.map-node-location').html('<strong>Currently marked as:</strong> <br>in Jail');
    }

    var stageChangeHandler = function() {
        geoInterface.destroy();
    };

  	// Public methods

  	geoInterface.nextPerson = function() {

  		if (currentPersonIndex < edges.length-1) {
  			resetAllHighlights();
	  		currentPersonIndex++;
	        $('.current-id').html(currentPersonIndex+1);
	        $('.map-node-status').html('Tap on the map to indicate the general area where <strong>'+edges[currentPersonIndex].nname_t0+'</strong> lives.');

  			// if variable already set, highlight it and zoom to it.
  			highlightCurrent();
        if (currentPersonIndex === edges.length-1) {
          $('.map-forwards').hide();
        } else {
          $('.map-forwards').show();
        }
        if (currentPersonIndex === 0) {
          $('.map-back').hide();
        } else {
          $('.map-back').show();
        }
  		}

  	};

  	geoInterface.previousPerson = function() {
	  	if (currentPersonIndex > 0) {

	  		resetAllHighlights();
	  		currentPersonIndex--;
	        $('.current-id').html(currentPersonIndex+1);
	        $('.map-node-status').html('Tap on the map to indicate the general area where <strong>'+edges[currentPersonIndex].nname_t0+'</strong> lives.');

  			// if variable already set, highlight it and zoom to it.
  			highlightCurrent();
        if (currentPersonIndex === edges.length-1) {
          $('.map-forwards').hide();
        } else {
          $('.map-forwards').show();
        }
        if (currentPersonIndex === 0) {
          $('.map-back').hide();
        } else {
          $('.map-back').show();
        }
	    }
  	};

  	geoInterface.init = function() {

  		// Initialize the map, point it at the #map element and center it on Chicago
        leaflet = window.L.map('map', {
            maxBounds: [[41.4985986599114, -88.498240224063451],[42.1070175291862,-87.070984247165939]],
            zoomControl: false
        });

        window.L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/normal.day.transit/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
            subdomains: '1234',
            mapID: 'newest',
            app_id: 'FxdAZ7O0Wh568CHyJWKV',
            app_code: 'FuQ7aPiHQcR8BSnXBCCmuQ',
            base: 'base',
            minZoom: 0,
            maxZoom: 20
        }).addTo(leaflet);

        $.ajax({
          	dataType: 'json',
          	url: 'data/census2010.json',
          	success: function(data) {
            	geojson = window.L.geoJson(data, {
                	onEachFeature: onEachFeature,
                	style: function () {
                  		return {weight:1,fillOpacity:0,strokeWidth:0.2, color:colors[1]};
                	}
            	}).addTo(leaflet);

		        // Load initial node
		        edges = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, type:'Dyad', res_cat_p_t0: 'Chicago'});
		        $('.map-counter').html('<span class="current-id">1</span>/'+edges.length);
		        $('.map-node-status').html('Tap on the map to indicate the general area where <strong>'+edges[0].nname_t0+'</strong> lives.');

            	// Highlight initial value, if set
            	highlightCurrent();
              $('.map-back').hide();
              if (currentPersonIndex === edges.length-1) {
                $('.map-forwards').hide();
              } else {
                $('.map-forwards').show();
              }
          	}
        });

        // Events
        window.addEventListener('changeStageStart', stageChangeHandler, false);
        $('.map-back').on('click', geoInterface.previousPerson);
        $('.map-forwards').on('click', geoInterface.nextPerson);
        $('.homeless').on('click', setHomeless);
        $('.jail').on('click', setJail);

  	};

  	geoInterface.destroy = function() {
    	// Used to unbind events
        leaflet.remove();
        window.removeEventListener('changeStageStart', stageChangeHandler, false);
    	$('.map-back').off('click', geoInterface.previousPerson);
        $('.map-forwards').off('click', geoInterface.nextPerson);
        $('.homeless').on('click', setHomeless);
        $('.jail').on('click', setJail);
  	};

  	return geoInterface;
};

},{}],10:[function(require,module,exports){
/* global $, window, module, note, alert */
/* exported Menu */
module.exports = function Menu(options) {
    'use strict';
    var menu = {};
    var menuEl;

    menu.options = {
        name: 'Default',
        icon: 'fa-icon',
        items: [
            {
                label: 'Label',
                icon: 'fa-bars',
                action: function() {
                    alert('Yo');
                }
            }
        ]
    };

    menu.getMenu = function() {
        return menuEl;
    };

    menu.closeMenu = function() {

        var targetMenuObj = $('.'+menuEl.name+'-menu');
        $('.paginate').removeClass('slide');
        $('.content').removeClass('pushed');
        targetMenuObj.removeClass('open');
        $('.menu-btn').show();

        setTimeout(function() {
            $('body').removeClass(menuEl.name);
        }, 500);

    };

    menu.openMenu = function() {
        $('body').addClass(menuEl.name);
        var targetMenuObj = $('.'+menuEl.name+'-menu');
        setTimeout(function() {
            $('.paginate').addClass('slide');
            $('.content').addClass('pushed');
            targetMenuObj.addClass('open');
            $('.menu-btn').hide();
        }, 10);

    };

    menu.destroy = function() {
        $(menuEl.button).remove();
        $(menuEl.menu).remove();
    };

    menu.addItem = function(label,icon,callback) {
        var listIcon = 'fa-file-text';
        if (icon) {
            listIcon = icon;
        }
        var menuItem = $('<li><span class="fa '+listIcon+' menu-icon"></span> '+label+'</li>');
        menuEl.menu.find('ul').append(menuItem);
        menuItem.on('click', function() {
            $('.paginate').removeAttr('disabled');
            menu.closeMenu();
            setTimeout(function() {
                callback();
            }, 200);
        });

    };

    menu.init = function(options) {
        note.info('Menu called "'+options.name+'" initialising...');
        window.tools.extend(menu.options,options);

        var newMenu = {};
        newMenu.name = options.name;
        newMenu.button = $('<span class="fa fa-2x '+options.icon+' menu-btn shown '+options.name+'"></span>');
        $('.menu-container').append(newMenu.button);

        var menuClass = options.name+'-menu';
        newMenu.menu = $('<div class="menu '+menuClass+'"><div class="menu-content"><h2>'+options.name+'</h2><ul></ul></div></div>');
        newMenu.closeBtn = $('<span class="icon icon-close"><i class="fa fa-times fa-2x"></i></span>');
        $(newMenu.menu).append(newMenu.closeBtn);
        $('.menu-container').append(newMenu.menu);

        newMenu.button.on('click', function() {
            menu.openMenu();
        });

        newMenu.closeBtn.on( 'click', function() {
            menu.closeMenu();
        });

        menuEl = newMenu;

        $.each(menu.options.items, function(index, value) {
            menu.addItem(value.label, value.icon, value.action);
        });

    };

    menu.init(options);

    return menu;

};

},{}],11:[function(require,module,exports){
/* global $, window */
/* exported MultiBin */
module.exports = function MultiBin() {
	'use strict';
	//global vars
	var log;
	var taskComprehended = false;
	var animating = false;
	var open = false;
	var multiBin = {}, followup;
	multiBin.options = {
		targetEl: $('.container'),
		edgeType: 'Dyad',
		variable: {
			label:'multibin_variable',
			values: [
				'Variable 1',
			]
		},
		filter: undefined,
		heading: 'Default Heading',
		subheading: 'Default Subheading.'
	};

	var stageChangeHandler = function() {
		multiBin.destroy();
	};

	var followupHandler = function(e) {
		e.preventDefault();
		// Handle the followup data

		// First, retrieve the relevant values

		var nodeid = followup;

		// Next, get the edge we will be storing on
		var criteria = {
			to:nodeid
		};

		window.tools.extend(criteria, multiBin.options.criteria);
		var edge = netCanvas.Modules.session.getPrimaryNetwork().getEdges(criteria)[0];

		// Create an empty object for storing the new properties in
		var followupProperties = {};

		// Assign a new property according to the variable name(s)
		$.each(multiBin.options.followup.questions, function(index) {
			var followupVal = $('#'+multiBin.options.followup.questions[index].variable).val();
			followupProperties[multiBin.options.followup.questions[index].variable] = followupVal;
		});

		// Update the edge
		window.tools.extend(edge, followupProperties);
		netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edge.id, edge);

		// Clean up
		$.each(multiBin.options.followup.questions, function(index) {
			$('#'+multiBin.options.followup.questions[index].variable).val('');
		});

		$('.followup').hide();
		$('.black-overlay').hide();
	};

	var followupCancelHandler = function() {

		// Clean up
		$('#'+multiBin.options.followup.variable).val('');
		$('.followup').hide();
		$('.black-overlay').hide();
	};

	var backgroundClickHandler = function(e) {
		e.stopPropagation();
		if(open === true) {
			if ($('.node-bin-active').length > 0) {
					animating = true;
					setTimeout(function() {
						$('.node-bin-container').children().css({opacity:1});
						$('.node-question-container').fadeIn();
					}, 300);

					var current = $('.node-bin-active');
					$(current).removeClass('node-bin-active');
					$(current).addClass('node-bin-static');
					$(current).children('h1, p').show();
					$('.draggable').draggable({ cursor: 'pointer', revert: 'invalid', disabled: false, start: function(){
						if (taskComprehended === false) {
							var eventProperties = {
								stage: window.netCanvas.Modules.session.currentStage(),
								timestamp: new Date()
							};
							log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
							window.dispatchEvent(log);
							taskComprehended = true;
						}
					}});

					setTimeout(function() {
						open = false;
						animating = false;
					}, 500);

			}
		} else {
		}


	};

	var nodeBinClickHandler = function() {
		if (open === false) {

				if(!$(this).hasClass('node-bin-active')) {
					animating = true;
					open = true;
					$('.node-bin-container').children().not(this).css({opacity:0});
					$('.node-question-container').hide();
					var position = $(this).offset();
					var nodeBinDetails = $(this);
					nodeBinDetails.children('.active-node-list').children('.node-bucket-item').removeClass('shown');
					setTimeout(function() {
						nodeBinDetails.offset(position);
						nodeBinDetails.addClass('node-bin-active');

						nodeBinDetails.removeClass('node-bin-static');
						nodeBinDetails.children('h1, p').hide();

						// $('.content').append(nodeBinDetails);

						nodeBinDetails.addClass('node-bin-active');
						setTimeout(function(){
							var timer = 0;
							$.each(nodeBinDetails.children('.active-node-list').children(), function(index,value) {
								timer = timer + (index*10);
								setTimeout(function(){
									$(value).on('click', nodeClickHandler);
									$(value).addClass('shown');
								},timer);
							});
						},300);
						open = true;
					}, 500);

					setTimeout(function() {
						animating = false;
					}, 500);

				}
		} else {
		}

	};

	var nodeClickHandler = function(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		var el = $(this);
		var id = $(this).parent().parent().data('index');

		// has the node been clicked while in the bucket or while in a bin?
		if ($(this).parent().hasClass('active-node-list')) {
			// it has been clicked while in a bin.
			var edgeID = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id,to:el.data('node-id'), type:multiBin.options.edgeType})[0].id;
			var properties = {};
			// make the values null when a node has been taken out of a bin
			properties[multiBin.options.variable.label] = '';

			// dont forget followups
			if(typeof multiBin.options.followup !== 'undefined') {
				$.each(multiBin.options.followup.questions, function(index, value) {
					properties[value.variable] = undefined;
				});
			}
			netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edgeID,properties);

			$(this).css({'top':0, 'left' :0});
			$(this).appendTo('.node-bucket');
			$(this).css('display', '');
			var noun = 'people';
			if ($('.c'+id).children('.active-node-list').children().length === 1) {
				noun = 'person';
			}
			if ($('.c'+id).children('.active-node-list').children().length === 0) {
				$('.c'+id).children('p').html('(Empty)');
			} else {
				$('.c'+id).children('p').html($('.c'+id).children('.active-node-list').children().length+' '+noun+'.');
			}


		}

	};

	multiBin.destroy = function() {
		// Event Listeners
		window.tools.notify('Destroying multiBin.',0);
		window.removeEventListener('changeStageStart', stageChangeHandler, false);
		$('.node-bin-static').off('click', nodeBinClickHandler);
		$('.node-bucket-item').off('click', nodeClickHandler);
		$('.content').off('click', backgroundClickHandler);
		$('.followup-submit').off('click', followupHandler);
		$('.followup-cancel').off('click', followupCancelHandler);
		$('.followup').remove();

	};

	multiBin.init = function(options) {
		window.tools.extend(multiBin.options, options);

		multiBin.options.targetEl.append('<div class="node-question-container"></div>');

		// Add header and subheader
		$('.node-question-container').append('<h1>'+multiBin.options.heading+'</h1>');

		// Add node bucket
		$('.node-question-container').append('<div class="node-bucket"></div>');

		// Create the followup dialog, if it exists
		if(typeof multiBin.options.followup !== 'undefined') {
			$('body').append('<div class="followup overlay"><form class="followup-form"></form></div>');

			if(typeof multiBin.options.followup.linked !== 'undefined' && multiBin.options.followup.linked === true) {
				var first = true;

				$.each(multiBin.options.followup.questions, function(index, value) {
					$('.followup').children('form').append('<h2>'+value.prompt+'</h2><div class="row form-group"><input type="number" class="form-control '+value.variable+'" id="'+value.variable+'" name="followup" required></div>');

					if (first) {
						$('#'+value.variable).change(function() {
							if ($('#'+multiBin.options.followup.questions[(index+1)].variable).val() > $('#'+value.variable).val()) {
								$('#'+multiBin.options.followup.questions[(index+1)].variable).val($('#'+value.variable).val());
							}
							$('#'+multiBin.options.followup.questions[(index+1)].variable).attr('max', $('#'+value.variable).val());

						});
					}


					first = !first;
				});
			} else {
				$.each(multiBin.options.followup.questions, function(index, value) {
					$('.followup').children('form').append('<h2>'+value.prompt+'</h2><div class="row form-group"><input type="text" class="form-control '+value.variable+'" id="'+value.variable+'" name="followup" required></div>');
				});
			}

			$('.followup').children('form').append('<div class="row form-group"><button type="submit" class="btn btn-primary btn-block followup-submit">Continue</button></div>');

			// Add cancel button if required
			if (typeof multiBin.options.followup.cancel !== 'undefined') {
				$('.overlay').children().last('.form-group').append('<div class="row form-group"><button class="btn btn-warning btn-block followup-cancel">'+multiBin.options.followup.cancel+'</button></div>');
			}

		}

		// bin container
        multiBin.options.targetEl.append('<div class="node-bin-container"></div>');


		var containerWidth = $('.node-bin-container').outerWidth();
		var containerHeight = $('.node-bin-container').outerHeight();
		var number = multiBin.options.variable.values.length;
		var rowThresh = number > 4 ? Math.floor(number*0.66) : 4;
		var itemSize = 0;
		var rows = Math.ceil(number/rowThresh);

		if (containerWidth >= containerHeight) {
			itemSize = number >= rowThresh ? containerWidth/rowThresh : containerWidth/number;

			while(itemSize > (containerHeight/rows)) {
				itemSize = itemSize*0.99;
			}

		} else {
			itemSize = number >= rowThresh ? containerHeight/rowThresh : containerHeight/number;

			while(itemSize > containerWidth) {
				itemSize = itemSize*0.99;
			}
		}

		// get all edges
		var edges = netCanvas.Modules.session.getPrimaryNetwork().getEdges(multiBin.options.criteria, multiBin.options.filter);
		// var newLine = false;
		// One of these for each bin. One bin for each variable value.
		$.each(multiBin.options.variable.values, function(index, value){

			// if (index+1>number && newLine === false) {
			// 	multiBin.options.targetEl.append('<br>');
			// 	newLine = true;
			// }
			var newBin = $('<div class="node-bin node-bin-static c'+index+'" data-index="'+index+'"><h1>'+value+'</h1><p class="lead">(Empty)</p><div class="active-node-list"></div></div>');
			newBin.data('index', index);
			$('.node-bin-container').append(newBin);
			$('.c'+index).droppable({ accept: '.draggable',
			drop: function(event, ui) {
				var dropped = ui.draggable;
				var droppedOn = $(this);
                $(dropped).css({'top':0, 'left' :0});
				// Check if the node has been dropped into a bin that triggers the followup
				if(typeof multiBin.options.followup !== 'undefined' && multiBin.options.followup.trigger.indexOf(multiBin.options.variable.values[index]) >=0 ) {
					$('.followup').show();
					$('.black-overlay').show();
					$('#'+multiBin.options.followup.questions[0].variable).focus();
					followup = $(dropped).data('node-id');
				} else if (typeof multiBin.options.followup !== 'undefined') {
					// Here we need to remove any previously set value for the followup variable, if it exists.
					var nodeid = $(dropped).data('node-id');

					// Next, get the edge we will be storing on
					var criteria = {
						to:nodeid
					};

					window.tools.extend(criteria, multiBin.options.criteria);
					var edge = netCanvas.Modules.session.getPrimaryNetwork().getEdges(criteria)[0];

					// Create an empty object for storing the new properties in
					var followupProperties = {};

					// Assign a new property according to the variable name(s)
					$.each(multiBin.options.followup.questions, function(index) {
						followupProperties[multiBin.options.followup.questions[index].variable] = undefined;
					});

					// Update the edge
					window.tools.extend(edge, followupProperties);
					netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edge.id, edge);

					// Clean up
					$.each(multiBin.options.followup.questions, function(index) {
						$('#'+multiBin.options.followup.questions[index].variable).val('');
					});

				}

				$(dropped).appendTo(droppedOn.children('.active-node-list'));
				var properties = {};
				properties[multiBin.options.variable.label] = multiBin.options.variable.values[index];
				// Add the attribute
				var edgeID = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id,to:$(dropped).data('node-id'), type:multiBin.options.edgeType})[0].id;
				netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edgeID,properties);

				var noun = 'people';
				if ($('.c'+index+' .active-node-list').children().length === 1) {
					noun = 'person';
				}
				$('.c'+index+' p').html($('.c'+index+' .active-node-list').children().length+' '+noun+'.');

				var el = $('.c'+index);
				// var origBg = el.css('background-color');
				setTimeout(function() {
					el.addClass('dropped');
				},0);

				setTimeout(function(){
					el.removeClass('dropped');
					el.removeClass('yellow');
				}, 1000);
			},
			over: function() {
				$(this).addClass('yellow');

			},
			out: function() {
				$(this).removeClass('yellow');
			}
		});

	});

	// $('.node-bin').css({width:itemSize*0.60-20,height:itemSize*0.60-20});
	$('.node-bin').css({width:itemSize,height:itemSize});
	// $('.node-bin').css({width:itemSize,height:itemSize});

	// $('.node-bin h1').css({marginTop: itemSize/3});

	$.each($('.node-bin'), function(index, value) {
		var oldPos = $(value).offset();
		$(value).data('oldPos', oldPos);
		$(value).css(oldPos);

	});

	$('.node-bin').css({position:'absolute'});

	// Add edges to bucket or to bins if they already have variable value.
	$.each(edges, function(index,value) {

		// We need the dyad edge so we know the nname for other types of edges
		var dyadEdge = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, type:'Dyad', to:value.to})[0];
		if (value[multiBin.options.variable.label] !== undefined && value[multiBin.options.variable.label] !== '') {
			index = multiBin.options.variable.values.indexOf(value[multiBin.options.variable.label]);
			$('.c'+index).children('.active-node-list').append('<div class="node-bucket-item draggable" data-node-id="'+value.to+'">'+dyadEdge.nname_t0+'</div>');
			var noun = 'people';
			if ($('.c'+index).children('.active-node-list').children().length === 1) {
				noun = 'person';
			}
			if ($('.c'+index).children('.active-node-list').children().length === 0) {
				$('.c'+index).children('p').html('(Empty)');
			} else {
				$('.c'+index).children('p').html($('.c'+index).children('.active-node-list').children().length+' '+noun+'.');
			}
		} else {
			$('.node-bucket').append('<div class="node-bucket-item draggable" data-node-id="'+value.to+'">'+dyadEdge.nname_t0+'</div>');
		}

	});
	$('.draggable').draggable({ cursor: 'pointer', revert: 'invalid', disabled: false , start: function(){
		if (taskComprehended === false) {
			var eventProperties = {
				stage: window.netCanvas.Modules.session.currentStage(),
				timestamp: new Date()
			};
			log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
			window.dispatchEvent(log);
			taskComprehended = true;
		}
	}});

	// Event Listeners
	window.addEventListener('changeStageStart', stageChangeHandler, false);
	$('.node-bin-static').on('click', nodeBinClickHandler);
	$('.content').on('click', backgroundClickHandler);
	$('.followup-form').on('submit', followupHandler);
	$('.followup-cancel').on('click', followupCancelHandler);

};
return multiBin;
};

},{}],12:[function(require,module,exports){
/* global $, window, Odometer, document, note, Swiper  */
/* exported Namegenerator */
module.exports = function NameGenerator() {
    'use strict';
    //global vars
    var nameGenerator = {};
    var options = {
        targetEl: $('.container'),
    	panels: ['current'],
    	network: netCanvas.Modules.session.getPrimaryNetwork(),
    	form: window.forms.newNodeForm,
    	data: {
    		origin: 'node', // edge or node.
    		namegenerators: [
    			{
    				prompt: 'Name generator prompt',
    				label: 'name generator label',
    				variables: [
    					{label: 'extra-variable', value: 'true', type: 'select'}
    				]
    			}
    		]
    	}
    };

    var promptSwiper;
    var currentPrompt = 0;
    var alterCounter;
    var moduleEvents = [];

    var namesList = ['Joshua', 'Bernie', 'Michelle', 'Gregory', 'Patrick', 'Barney', 'Jonathon','Myles','Alethia','Tammera','Veola','Meredith','Renee','Grisel','Celestina','Fausto','Eliana','Raymundo','Lyle','Carry','Kittie','Melonie','Elke','Mattie','Kieth','Lourie','Marcie','Trinity','Librada','Lloyd','Pearlie','Velvet','Stephan','Hildegard','Winfred','Tempie','Maybelle','Melynda','Tiera','Lisbeth','Kiera','Gaye','Edra','Karissa','Manda','Ethelene','Michelle','Pamella','Jospeh','Tonette','Maren','Aundrea','Madelene','Epifania','Olive'];

    var cardClickHandler = function() {
        window.forms.nameGenForm.show();
        // Handles what happens when a card is clicked

        // Get the ID of the node corresponding to this card, stored in the data-index property.
        var index = $(this).data('index');

        var node = options.network.getNode(index);

        // add fields from data
        var properties = {};
        properties.id = {
            type:'hidden',
            title: 'id'
        };
        properties.namegenerator = {
            type:'hidden',
            title: 'namegenerator'
        };
        $.each(options.data.namegenerators, function(targetIndex, targetValue) {
            properties[targetValue.label] = {
                type:'hidden',
                title: targetValue.label
            };
        });
        window.forms.nameGenForm.addTemporaryFields(properties);

        window.forms.nameGenForm.addData(node);



    };

    nameGenerator.generateTestAlters = function(number) {

        if (!number) {
            note.error('You must specify the number of test alters you want to create. Cancelling!');
            return false;
        }

        var eachTime = 1500;

        for (var i = 0; i < number; i++) {
            var timer = eachTime*i;
            setTimeout(nameGenerator.generateAlter, timer);
        }

    };

    nameGenerator.generateAlter = function() {
        // We must simulate every interaction to ensure that any errors are caught.
        $('.new-node-button').click();
        setTimeout(function() {
            $('#new-node-submit-btn').click();
        }, 500);

        var name = namesList[Math.floor(window.tools.randomBetween(0,namesList.length))]+' '+namesList[Math.floor(window.tools.randomBetween(0,namesList.length))];
        $('#name').val(name);
        window.hacks.nicknameGenerator({keyCode: '12'});
    };

    nameGenerator.destroy = function() {
        note.debug('Destroying nameGenerator.');

        // Event listeners
        promptSwiper.destroy();
        window.tools.Events.unbind(moduleEvents);

    };

    nameGenerator.bindEvents = function() {
        // Event listeners
        // Events
		var event = [{
			event: 'changeStageStart',
			handler: nameGenerator.destroy,
			targetEl:  window
		},
		{
			event: 'nodeAdded',
			handler: nameGenerator.nodeAdded,
			targetEl:  window
		},
        {
            event: 'nodeUpdatedEvent',
            handler: nameGenerator.nodeEdited,
            targetEl:  window
        },
        {
            event: 'tap',
            handler: nameGenerator.toggleSelectable,
            targetEl: window.document,
            subTarget:  '.node-list-item'
        },
        {
            event: 'click',
            handler: nameGenerator.showNewNodeForm,
            targetEl:  '.new-node-button'
        }];
		window.tools.Events.register(moduleEvents, event);


    };

    nameGenerator.nodeAdded = function(e) {
        nameGenerator.addCard(e.originalEvent.detail, function() {
            nameGenerator.updateCounter();
            nameGenerator.makeDraggable();
        });
    };

    nameGenerator.nodeEdited = function(e) {
        nameGenerator.editCard(e.originalEvent.detail, function() {
            nameGenerator.makeDraggable();
        });
    };

    nameGenerator.init = function(userOptions) {
        note.info('nameGenerator initialising.');
        window.tools.extend(options, userOptions);

        var alterCount = nameGenerator.getNodes().length;

        // create elements
        $(options.targetEl).append('<div class="new-node-button text-center"><span class="fa fa-2x fa-plus"></span></div>');
        var alterCountBox = $('<div class="alter-count-box"></div>');
        options.targetEl.append(alterCountBox);

        var nodeContainer = $('<div class="question-container"></div><div class="node-container-bottom-bg"></div>');
        options.targetEl.append(nodeContainer);


        // Prompts
        $('.question-container').append('<div class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>');
        for (var i = 0; i < options.data.namegenerators.length; i++) {
            $('.swiper-wrapper').append('<div class="swiper-slide"><h2>'+options.data.namegenerators[i].prompt+'</h2></div>');
        }
        promptSwiper = new Swiper ('.swiper-container', {
            pagination: '.swiper-pagination',
            speed: 1000
        });

        // Update current prompt counter
        promptSwiper.on('slideChangeStart', function () {
            currentPrompt = promptSwiper.activeIndex;
            nameGenerator.handlePanels();
            nameGenerator.changeData();
        });

        // create namelist container
        var nameList = $('<div class="node-container nameList"></div>');
        options.targetEl.append(nameList);

		// bin
		options.targetEl.append('<div class="delete-bin-footer"><span class="delete-bin fa fa-4x fa-trash-o"></span></div>');
		$('.delete-bin').droppable({
			accept: '.card, .node-list-item',
			tolerance: 'touch',
			hoverClass: 'delete',
			over: function( event, ui ) {
				$(this).addClass('delete');
				$(ui.draggable).addClass('delete');
			},
			out: function( event, ui ) {
				$(this).removeClass('delete');
				$(ui.draggable).removeClass('delete');
			},
			drop: function( event, ui ) {
				nameGenerator.removeNode($(ui.draggable).data('index'));
			}
		});


        // Set node count box
        var el = document.querySelector('.alter-count-box');

        alterCounter = new Odometer({
          el: el,
          value: alterCount,
          format: 'dd',
          theme: 'default'
        });

        nameGenerator.handlePanels();
        nameGenerator.addData();
        nameGenerator.bindEvents();
    };

    nameGenerator.changeData = function() {
            $('.inner-card, .node-list-item').removeClass('shown');
            setTimeout(function() {
                $('.card, .node-list-item').remove();
                nameGenerator.addData();
            }, 500);
    };

    nameGenerator.getNodes = function(criteria) {
        // console.log('getnodes');
        // console.log(criteria);
        var filterCriteria = criteria || {};
        // ignore ego and any nodes that are visible in the main node list
        var nodes = options.network.getNodes(filterCriteria, function (results) {
            var filteredResults = [];
            $.each(results, function(index,value) {
                if (value.type !== 'Ego') {
                    filteredResults.push(value);
                }
            });

            return filteredResults;
        });

        return nodes;
    };

    nameGenerator.toggleSelectable = function() {
        var clicked = this;
        var properties = {};

        // get the togglePabelVariable for the current name generator
        if (options.data.namegenerators[currentPrompt].togglePanelVariable !== 'undefined') {
            $.each(options.data.namegenerators[currentPrompt].variables, function(variableIndex, variableValue) {
                if (variableValue.label === options.data.namegenerators[currentPrompt].togglePanelVariable) {
                    if ($(clicked).hasClass('selected')) {
                        properties[options.data.namegenerators[currentPrompt].togglePanelVariable] = '';
                    } else {
                        properties[options.data.namegenerators[currentPrompt].togglePanelVariable] = variableValue.value;
                    }
                }
            });

            options.network.updateNode($(clicked).data('index'), properties, function() {
                $(clicked).toggleClass('selected');
            });
        }

    };

    nameGenerator.updateSidePanel = function() {
        // console.log('updatesidepanel');

        // Empty it
        $('.current-node-list').children().remove();

        // ignore ego and any nodes that are visible in the main node list
        var nodes = nameGenerator.getNodes();

        var filteredResults = [];
        $.each(nodes, function(index,value) {
            if (value.namegenerator !== options.data.namegenerators[currentPrompt].label) {
                filteredResults.push(value);
            }
        });

        $.each(filteredResults, function(index,value) {
            var selected = '';

            if (value[options.data.namegenerators[currentPrompt].togglePanelVariable] === 'true') {
                selected = 'selected';
            }

            var el = $('<div class="node-list-item '+selected+'" data-index="'+value.id+'">'+value.label+'</div>');
            $('.current-node-list').append(el);

            setTimeout(function() {
                $(el).addClass('shown');
                nameGenerator.makeDraggable();
            },50+(index*50));

        });

    };

    nameGenerator.addData = function () {
        // console.log('add data');
        var properties = {};
        // build properties array from data
        properties.namegenerator = options.data.namegenerators[currentPrompt].label;
        // console.log(properties);
        var nodes = nameGenerator.getNodes(properties);
        // console.log(nodes);
        $.each(nodes, function(index,value) {
            setTimeout(function() {
                nameGenerator.addCard(value);
            }, index * 40);
        });

        nameGenerator.updateSidePanel();
        nameGenerator.updateCounter();

    };

    nameGenerator.updateCounter = function(number) {
        if (!number) {
            alterCounter.update(options.network.getNodes().length-1);
        } else {
            alterCounter.update(number);
        }
    };

    nameGenerator.makeDraggable = function() {
        $('.card').draggable({
            appendTo: 'body',
            helper: 'clone',
            revert: true,
            revertDuration: 200,
            refreshPositions: true,
            scroll: false,
            start: function(event, ui) {
                $(this).addClass('invisible');
                $(ui.helper).addClass('dragging');
                nameGenerator.showBin();
            },
            stop: function(event, ui) {
                $(this).removeClass('invisible');
                $(ui.helper).removeClass('dragging');
                nameGenerator.hideBin();
            }
        });

        $('.node-list-item').draggable({
            // appendTo: 'body',
            helper: 'clone',
            revert: true,
            revertDuration: 200,
            refreshPositions: true,
            distance: 50,
            scroll: false,
            stack: '.node-list-item',
            start: function(event, ui) {
                console.log('dragstart');
                nameGenerator.showBin();
                $(ui.helper).addClass('dragging');
            },
            stop: function(event, ui) {
                console.log('dragstop');
                $(ui.helper).removeClass('dragging');
                nameGenerator.hideBin();
            }
        });

    };

    nameGenerator.showNewNodeForm = function() {
        console.log('nameGenerator.showNewNodeForm()');
        // add fields from data
        var properties = {};
            properties.namegenerator = {
                type:'hidden',
                title: 'namegenerator'
            };

        // Add additional variables, if present
        console.log('nameGenerator.showNewNodeForm() adding additional variables');
        if (typeof options.data.namegenerators[currentPrompt].variables !== 'undefined' && options.data.namegenerators[currentPrompt].variables.length > 0) {
            $.each(options.data.namegenerators[currentPrompt].variables, function(variableIndex, variableValue) {

                properties[variableValue.label] = {
                    type: 'hidden',
                    title: variableValue.label
                };
            });
        }

        console.log('nameGenerator.showNewNodeForm() adding temporary fields');
        window.forms.nameGenForm.addTemporaryFields(properties);

        // Add data from fields
        properties = {};
        properties.namegenerator = options.data.namegenerators[currentPrompt].label;

        // Add data to additional variables, if present
        if (typeof options.data.namegenerators[currentPrompt].variables !== 'undefined' && options.data.namegenerators[currentPrompt].variables.length > 0) {

            // Is there a cute way to do the below using map?
            $.each(options.data.namegenerators[currentPrompt].variables, function(variableIndex, variableValue) {
                properties[variableValue.label] = variableValue.value;
            });
        }

        console.log('nameGenerator.showNewNodeForm() adding data');
        window.forms.nameGenForm.addData(properties);

        console.log('nameGenerator.showNewNodeForm() showing form');
        window.forms.nameGenForm.show();
    };

    nameGenerator.handlePanels = function() {
        note.debug('nameGenerator.handlePanels()');

        if (options.panels.indexOf('current') !== -1) {
            // We are trying to add a panel which shows the current nodes.

            // First, check there are some current nodes:
            // ignore ego and any nodes that are visible in the main node list
            var nodes = nameGenerator.getNodes();

            var filteredResults = [];
            $.each(nodes, function(index,value) {
                if (value.namegenerator !== options.data.namegenerators[currentPrompt].label) {
                    filteredResults.push(value);
                }
            });

            if (filteredResults.length > 0) {
                if ($('.side-container').length === 0) {
                    // Side container
                    var sideContainer = $('<div class="side-container out"></div>');

                    // Current side panel shows alters already elicited
                    sideContainer.append($('<div class="current-panel"><h4>Other people you have mentioned:</h4><div class="current-node-list node-lists"></div><div class="current-node-list-background"></div></div>'));

                    if (sideContainer.children().length > 0) {
                        // move node list to one side
                        sideContainer.insertBefore('.nameList');
                        setTimeout(function() {
                            $('.nameList').addClass('alt');
                            $('.side-container').removeClass('out');
                        }, 10);


                    }
                }
                // halve the panel height if we have two
                if ($('.side-container').children().length > 1) {
                    $('.node-lists').addClass('double');
                }
            } else {
                $('.side-container').addClass('out');
                setTimeout(function() {
                    $('.nameList').removeClass('alt');
                    $('.side-container').remove();
                }, 500);

            }

        }

    };

    nameGenerator.showBin = function() {
        $('.delete-bin-footer').addClass('show');
    };

    nameGenerator.hideBin = function() {
        $('.delete-bin-footer').removeClass('show');
    };

    nameGenerator.addCard = function(properties, callback) {

        var card;

        card = $('<div class="card" data-index="'+properties.id+'"><div class="inner-card"><h4>'+properties.label+'</h4></div></div>');
        var list = $('<ul></ul>');
        list.append('<li>'+properties.name+'</li>');
        card.children('.inner-card').append(list);
        $('.nameList').append(card);

        $(card).on('tap', cardClickHandler);

        nameGenerator.updateCounter();
        nameGenerator.makeDraggable();

        setTimeout(function() {
            $('[data-index='+properties.id+']').children('.inner-card').addClass('shown');
        },20);


        if (callback) {
            callback();
        }

        return true;
    };

    nameGenerator.editCard = function(properties, callback) {
        console.log(properties);

        var card = $('.card[data-index="'+properties.id+'"]');
        card.children('.inner-card').find('h4').html(properties.label);

        var list = card.children('.inner-card').find('ul');
        list.empty();
        list.append('<li>'+properties.name+'</li>');

        if (callback) {
            callback();
        }

        return true;
    };

    nameGenerator.removeNode = function(id) {
        if (!id) {
            note.error('No id provided to nameGenerator.deleteNode().');
            return false;
        }

        if (options.network.removeNode(id)) {
            if(nameGenerator.removeCard(id)) {
                note.info('Deleted node with id '+id);
                nameGenerator.handlePanels();
                return true;
            } else {
                note.error('nameGenerator.removeNode() tried to remove node with ID '+id+', but failed.');
                return false;
            }

        } else {
            note.warn('nameGenerator.removeNode() tried to remove node with ID '+id+', but failed.');
            return false;
        }
    };

    nameGenerator.removeCard = function(id) {

        $('div[data-index='+id+']').remove();
        nameGenerator.updateCounter();

        return true;
    };

    return nameGenerator;
};

},{}],13:[function(require,module,exports){
/* exported Network, Node, Edge, document */
/* global $, window, note, deepmerge, tools */

/**
* This module should implement 'networky' methods, and a querying syntax for
* selecting nodes or edges by their various properties, and interating over them.
* @constructor
*/

module.exports = function Network() {
  'use strict';
  var network = {};
  var namesList = ['Joshua', 'Bernie', 'Michelle', 'Gregory', 'Patrick', 'Barney', 'Jonathon','Myles','Alethia','Tammera','Veola','Meredith','Renee','Grisel','Celestina','Fausto','Eliana','Raymundo','Lyle','Carry','Kittie','Melonie','Elke','Mattie','Kieth','Lourie','Marcie','Trinity','Librada','Lloyd','Pearlie','Velvet','Stephan','Hildegard','Winfred','Tempie','Maybelle','Melynda','Tiera','Lisbeth','Kiera','Gaye','Edra','Karissa','Manda','Ethelene','Michelle','Pamella','Jospeh','Tonette','Maren','Aundrea','Madelene','Epifania','Olive'];

  /**
  * @public
  * @name Network#addNode
  * @function
  * @param {object} properties An object containing the desired node properties.
  * @param {boolean} [ego=false] Whether or not the node being added is an Ego.
  * @param {boolean} [force=false] Override reserved IDs.
  */

  network.nodes = [];
  network.edges = [];

  network.addNode = function(properties, ego, force) {

    var reserved_ids;

    if (!force) { force = false; }

    // Check if we are adding an ego
    if (!ego) { ego = false;}

    // if we are adding an ego create an empty reserved_ids array for later, if not use Ego's.
    if (ego) {
      // fetch in use IDs from Ego
      reserved_ids = [];
    } else {
      // We aren't adding an Ego, so make sure an Ego exists
      if (network.egoExists()) {
        reserved_ids = network.getEgo().reserved_ids;
      } else {
        throw new Error('You must add an Ego before attempting to add other nodes.');
      }

    }


    // Check if an ID has been passed, and then check if the ID is already in use. Cancel if it is.
    if (typeof properties.id !== 'undefined' && this.getNode(properties.id) === true) {
      note.error('Node already exists with id '+properties.id+'. Cancelling!');
      return false;
    }

    // To prevent confusion in longitudinal studies, once an ID has been allocated, it is always reserved.
    // This reserved list is stored with the ego.
    if (!force) {
      if (reserved_ids.indexOf(properties.id) !== -1) {
        note.error('Node id '+properties.id+' is already in use with this ego. Cancelling!');
        return false;
      }
    }

    // Locate the next free node ID
    // should this be wrapped in a conditional to check if properties.id has been provided? probably.
    var newNodeID = 0;
    while (network.getNode(newNodeID) !== false || reserved_ids.indexOf(newNodeID) !== -1) {
      newNodeID++;
    }
    var nodeProperties = {
      id: newNodeID
    };
    window.tools.extend(nodeProperties, properties);

    network.nodes.push(nodeProperties);
    reserved_ids.push(newNodeID);

    var log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeCreate', 'eventObject':nodeProperties}});
    window.dispatchEvent(log);
    var nodeAddedEvent = new window.CustomEvent('nodeAdded',{'detail':nodeProperties});
    window.dispatchEvent(nodeAddedEvent);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);

    return nodeProperties.id;
  };

  network.init = function(loadNodes, loadEdges) {

    network.nodes = typeof loadNodes !== 'undefined' ? loadNodes : [];
    network.edges = typeof loadEdges !== 'undefined' ? loadEdges : [];

    return true;
  };

  network.loadNetwork = function(data, overwrite) {
    note.debug('network.loadNetwork()');
    note.trace(data);
    if (!data || !data.nodes || !data.edges) {
      note.error('network.loadNetwork(): Error loading network. Data format incorrect.');
      return false;
    } else {
      if (!overwrite) {
        overwrite = false;
      }

      if (overwrite) {
        note.trace('network.loadNetwork(): overwriting');
        network.nodes = data.nodes;
        network.edges = data.edges;

      } else {
        note.trace('network.loadNetwork(): not overwriting');
        network.nodes = network.nodes.concat(data.nodes);
        network.edges = network.edges.concat(data.edges);
      }

      return true;
    }
  };

  network.resetNetwork = function() {
    network.nodes = [];
    network.edges = [];
  };

  network.createEgo = function(properties) {
    if (network.egoExists() === false) {
      var egoProperties = {
        id:0,
        type: 'Ego',
        reserved_ids: [0]
      };
      window.tools.extend(egoProperties, properties);
      network.addNode(egoProperties, true);
    } else {
      throw new Error('Ego already exists.');
    }
  };

  network.getEgo = function() {
    note.debug('network.getEgo() called.');
    if (network.getNodes({type:'Ego'}).length !== 0) {
      return network.getNodes({type:'Ego'})[0];
    } else {
      return false;
    }
  };

  network.egoExists = function() {
    if (network.getEgo() !== false) {
      return true;
    } else {
      return false;
    }
  };

  network.edgeExists = function(edge) {
    note.debug('network.edgeExists() called.');
    note.debug(edge);
    if (typeof edge === 'undefined') {
      note.error('ERROR: No edge passed to network.edgeExists().');
      return false;
    }
    // old way of checking if an edge existed checked for values of to, from, and type. We needed those to not have to be unique.
    // New way: check if all properties are the same.

    var reversed = {}, temp;
    reversed = $.extend(true,{}, edge); // Creates a copy not a reference
    temp = reversed.to; // Switch the order (do the reversing)
    reversed.to = reversed.from;
    reversed.from = temp;

    var straightExists = (network.getEdges(edge).length > 0) ? true : false;
    var reverseExists = (network.getEdges(reversed).length > 0) ? true : false;

    if (straightExists === true || reverseExists === true) { // Test if an edge matches either the proposed edge or the reversed edge.
      note.debug('network.edgeExists() true.');
      return true;
    } else {
      note.debug('network.edgeExists() false.');
      return false;
    }
  };

  network.addEdge = function(properties) {
    note.debug('network.addEdge() called.');
    // todo: make nickname unique, and provide callback so that interface can respond if a non-unique nname is used.

    if (typeof properties.from === 'undefined' || typeof properties.to === 'undefined') {
      note.error('Error while executing network.addEdge(). "To" and "From" must BOTH be defined.');
      return false;
    }
    // Required variables (id and type) generated here. These are overwritten as long as the values have been provided.
    var edgeProperties = {
      type: 'Default'
    };

    window.tools.extend(edgeProperties, properties);

    if(network.edgeExists(edgeProperties) === false) {

      if (edgeProperties.id === 'undefined' || network.getEdge(edgeProperties.id) !== false) {
        note.warn('Either you didn\'t provide an ID, or an edge with this id already exists! I\'m generating a new one for you.');

        var newEdgeID = 0;
        while (network.getEdge(newEdgeID) !== false) {
          newEdgeID++;
        }

        edgeProperties.id = newEdgeID;
      }

      network.edges.push(edgeProperties);
      var log = new window.CustomEvent('log', {'detail':{'eventType': 'edgeCreate', 'eventObject':edgeProperties}});
      window.dispatchEvent(log);
      var edgeAddedEvent = new window.CustomEvent('edgeAdded',{'detail':edgeProperties});
      window.dispatchEvent(edgeAddedEvent);
      var unsavedChanges = new window.Event('unsavedChanges');
      window.dispatchEvent(unsavedChanges);

      return edgeProperties.id;
    } else {
      return false;
    }

  };

  network.removeEdges = function(edges) {
    note.debug('network.removeEdges() called.');
    network.removeEdge(edges);
  };

  network.removeEdge = function(edge) {
    var counter = 0;
    note.debug('network.removeEdge() called.');

    if (!edge) {
      note.error('network.removeEdge(): No edge specified!');
      return false;
    }
    var log;
    var edgeRemovedEvent;

    if (typeof edge === 'object' && typeof edge.length !== 'undefined') {
      // we've got an array of object edges
      for (var i = 0; i < edge.length; i++) {
        // localEdges.remove(edge[i]);
        counter = window.tools.removeFromObject(edge[i], network.edges);
        log = new window.CustomEvent('log', {'detail':{'eventType': 'edgeRemove', 'eventObject':edge[i]}});
        edgeRemovedEvent = new window.CustomEvent('edgeRemoved',{'detail':edge[i]});
        window.dispatchEvent(log);
        window.dispatchEvent(edgeRemovedEvent);
      }
    } else {
      // we've got a single edge, which is an object {}
      counter = window.tools.removeFromObject(edge, network.edges);

      log = new window.CustomEvent('log', {'detail':{'eventType': 'edgeRemove', 'eventObject':edge}});
      edgeRemovedEvent = new window.CustomEvent('edgeRemoved',{'detail':edge});
      window.dispatchEvent(log);
      window.dispatchEvent(edgeRemovedEvent);
    }

    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);
    if (counter > 0) {
      return true;
    } else {
      return false;
    }
  };

  network.removeNode = function(id, preserveEdges) {
    note.debug('network.removeNode() called.');

    if (!preserveEdges) { preserveEdges = false; }

    // Unless second parameter is present, also delete this nodes edges
    if (!preserveEdges) {
      network.removeEdge(network.getNodeEdges(id));
    } else {
      note.info('NOTICE: preserving node edges after deletion.');
    }

    var nodeRemovedEvent, log;

    for (var i = 0; i < network.nodes.length; i++) {
      if (network.nodes[i].id === id) {
        log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeRemove', 'eventObject':network.nodes[i]}});
        window.dispatchEvent(log);
        nodeRemovedEvent = new window.CustomEvent('nodeRemoved',{'detail':network.nodes[i]});
        window.dispatchEvent(nodeRemovedEvent);
        window.tools.removeFromObject(network.nodes[i],network.nodes);
        return true;
      }
    }
    return false;
  };

  network.updateEdge = function(id, properties, callback) {
    note.debug('network.updateEdge() called.');
    if(network.getEdge(id) === false || properties === undefined) {
      return false;
    }
    var edge = network.getEdge(id);
    var edgeUpdateEvent, log;

    $.extend(edge, properties);
    edgeUpdateEvent = new window.CustomEvent('edgeUpdatedEvent',{'detail':edge});
    window.dispatchEvent(edgeUpdateEvent);
    log = new window.CustomEvent('log', {'detail':{'eventType': 'edgeUpdate', 'eventObject':edge}});
    window.dispatchEvent(log);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);
    if(callback) {
      callback();
    }

  };

  network.updateNode = function(id, properties, callback) {
    note.info('network.updateNode() called for node id '+id+'.');
    note.debug(properties);

    if(this.getNode(id) === false || properties === undefined) {
      note.error('network.updateNode() couldn\'t find node with id '+id);
      return false;
    }
    var node = this.getNode(id);
    var nodeUpdateEvent, log;

    $.extend(node, properties);
    nodeUpdateEvent = new window.CustomEvent('nodeUpdatedEvent',{'detail':node});
    window.dispatchEvent(nodeUpdateEvent);
    log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeUpdate', 'eventObject':node}});
    window.dispatchEvent(log);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);
    if(callback) {
      callback();
    }

  };

  network.deepUpdateNode = function(id, properties, callback) {
    if(this.getNode(id) === false || properties === undefined) {
      return false;
    }
    var node = this.getNode(id);
    var nodeUpdateEvent, log;

    node = deepmerge(node, properties);
    nodeUpdateEvent = new window.CustomEvent('nodeUpdatedEvent',{'detail':node});
    window.dispatchEvent(nodeUpdateEvent);
    log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeUpdate', 'eventObject':node}});
    window.dispatchEvent(log);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);
    if(callback) {
      callback();
    }
  };

  network.getNode = function(id) {
    // Ensure that ID is always treated as int for === comparisons to work reliably.
    id = parseInt(id);

    if (id === undefined) { return false; }
    for (var i = 0;i<network.nodes.length; i++) {
      if (network.nodes[i].id === id) {return network.nodes[i]; }
    }
    return false;

  };

  network.deduplicate = function() {
    var newNodes = [];
    var ids = [];
    $.each(network.nodes, function(index, value) {
      if (ids.indexOf(value.id) === -1) {
        ids.push(value.id);
        newNodes.push(value);
      }
    });

    network.nodes = newNodes;

    var newEdges = [];
    ids = [];
    $.each(network.edges, function(index, value) {
      if (ids.indexOf(value.id) === -1) {
        ids.push(value.id);
        newEdges.push(value);
      }
    });

    network.edges = newEdges;
    window.netCanvas.Modules.session.saveData();
  };

  network.getEdge = function(id) {
    if (id === undefined) { return false; }
    for (var i = 0;i < network.edges.length; i++) {
      if (network.edges[i].id === id) {return network.edges[i]; }
    }
    return false;
  };

  network.filterObject = function(targetArray,criteria) {
    // Return false if no criteria provided
    if (!criteria) { return false; }
    // Get nodes using .filter(). Function is called for each of nodes.Nodes.
    var result = targetArray.filter(function(el){
      var match = true;

      for (var criteriaKey in criteria) {

        if (el[criteriaKey] !== undefined) {

          // current criteria exists in object.
          if (el[criteriaKey] !== criteria[criteriaKey]) {
            match = false;
          }
        } else {
          match = false;
        }
      }

      if (match === true) {
        return el;
      }

    });

    // reverse to and from to check for those matches.
    if (typeof criteria.from !== 'undefined' && typeof criteria.to !== 'undefined') {

      var reversed = {}, temp;
      reversed = $.extend(true,{}, criteria);
      temp = reversed.to;
      reversed.to = reversed.from;
      reversed.from = temp;

      var result2 = targetArray.filter(function(el){
        var match = true;

        for (var criteriaKey in reversed) {

          if (el[criteriaKey] !== undefined) {


            // current criteria exists in object.
            if (el[criteriaKey] !== reversed[criteriaKey]) {
              match = false;
            }
          } else {
            match = false;
          }
        }

        if (match === true) {
          return el;
        }

      });

      result = result.concat(result2);
    }


    return result;
  };

  network.getNodes = function(criteria, filter) {
    var results;
    if (typeof criteria !== 'undefined' && Object.keys(criteria).length !== 0) {
      results = network.filterObject(network.nodes,criteria);
    } else {
      results = network.nodes;
    }

    if (filter) {
      results = filter(results);
    }

    return results;
  };

  network.getEdges = function(criteria, filter) {
    var results;
    if (typeof criteria !== 'undefined' && Object.keys(criteria).length !== 0) {
      results = network.filterObject(network.edges,criteria);
    } else {
      results = network.edges;
    }

    if (filter) {
      results = filter(results);
    }

    return results;
  };

  network.getNodeInboundEdges = function(nodeID) {
    return network.getEdges({to:nodeID});
  };

  network.getNodeOutboundEdges = function(nodeID) {
    return network.getEdges({from:nodeID});
  };

  network.getNodeEdges = function(nodeID) {
    if (network.getNode(nodeID) === false) {
      return false;
    }
    var inbound = network.getNodeInboundEdges(nodeID);
    var outbound = network.getNodeOutboundEdges(nodeID);
    var concat = inbound.concat(outbound);
    return concat;
  };

  network.setProperties = function(object, properties) {

    if (typeof object === 'undefined') { return false; }

    if (typeof object === 'object' && object.length>0) {
      // Multiple objects!
      for (var i = 0; i < object.length; i++) {
        $.extend(object[i], properties);
      }
    } else {
      // Just one object.
      $.extend(object, properties);
    }

  };

  network.returnAllNodes = function() {
    return network.nodes;
  };

  network.returnAllEdges = function() {
    return network.edges;
  };

  network.clearGraph = function() {
    network.edges = [];
    network.nodes = [];
  };

  network.createRandomGraph = function(nodeCount,edgeProbability) {
    nodeCount = nodeCount || 10;

    edgeProbability = edgeProbability || 0.4;
    note.info('Creating random graph...');

    for (var i=0;i<nodeCount;i++) {
      var current = i+1;
      window.tools.notify('Adding node '+current+' of '+nodeCount,2);
      // Use random coordinates
      var nodeOptions = {
        name: namesList[Math.floor(window.tools.randomBetween(0,namesList.length))],
        coords: [Math.round(window.tools.randomBetween(100,window.innerWidth-100)),Math.round(window.tools.randomBetween(100,window.innerHeight-100))]
      };
      network.addNode(nodeOptions);
    }

    note.debug('Adding edges.');
    $.each(network.nodes, function (index) {
      if (window.tools.randomBetween(0, 1) < edgeProbability) {
        var randomFriend = Math.round(window.tools.randomBetween(0,network.nodes.length-1));
        network.addEdge({from:network.nodes[index].id,to:network.nodes[randomFriend].id});

      }
    });
  };

  return network;

};

},{}],14:[function(require,module,exports){
/* global $, window */
/* exported OrdinalBin */
module.exports = function OrdinalBin() {
    'use strict';
    //global vars
    var ordinalBin = {};
    var taskComprehended = false;
    var log;
    ordinalBin.options = {
        targetEl: $('.container'),
        edgeType: 'Dyad',
        criteria: {},
        variable: {
            label:'gender_p_t0',
            values: [
                'Female',
                'Male',
                'Transgender',
                'Don\'t Know',
                'Won\'t Answer'
            ]
        },
        heading: 'Default Heading',
        subheading: 'Default Subheading.'
    };
    var followup;

    var stageChangeHandler = function() {
        ordinalBin.destroy();
    };

    var followupHandler = function() {
        var followupVal = $(this).data('value');
        var nodeid = followup;
        var criteria = {
            to:nodeid
        };

        window.tools.extend(criteria, ordinalBin.options.criteria);
        var edge = netCanvas.Modules.session.getPrimaryNetwork().getEdges(criteria)[0];

        var followupProperties = {};

        followupProperties[ordinalBin.options.followup.variable] = followupVal;

        window.tools.extend(edge, followupProperties);
        netCanvas.Modules.session.getPrimaryNetwork().updateEdge(edge.id, edge);
        $('.followup').hide();
    };

    ordinalBin.destroy = function() {
        // Event Listeners
        window.tools.notify('Destroying ordinalBin.',0);
        window.removeEventListener('changeStageStart', stageChangeHandler, false);
        $(window.document).off('click', '.followup-option', followupHandler);

    };

    ordinalBin.init = function(options) {

        window.tools.extend(ordinalBin.options, options);

        ordinalBin.options.targetEl.append('<div class="node-question-container"></div>');

        // Add header and subheader
        $('.node-question-container').append('<h1>'+ordinalBin.options.heading+'</h1>');
        $('.node-question-container').append('<p class="lead">'+ordinalBin.options.subheading+'</p>');

        // Add node bucket
        $('.node-question-container').append('<div class="node-bucket"></div>');
        if(typeof ordinalBin.options.followup !== 'undefined') {
            $('.node-question-container').append('<div class="followup"><h2>'+ordinalBin.options.followup.prompt+'</h2></div>');
            $.each(ordinalBin.options.followup.values, function(index,value) {
                $('.followup').append('<span class="btn btn-primary btn-block followup-option" data-value="'+value.value+'">'+value.label+'</span>');
            });
        }

        // bin container
        ordinalBin.options.targetEl.append('<div class="ord-bin-container"></div>');

        // Calculate number of bins required
        var binNumber = ordinalBin.options.variable.values.length;

        // One of these for each bin. One bin for each variable value.
        $.each(ordinalBin.options.variable.values, function(index, value){

            var newBin = $('<div class="ord-node-bin size-'+binNumber+' d'+index+' '+ordinalBin.options.special+'" data-index="'+index+'"><h1>'+value.label+'</h1><div class="ord-active-node-list"></div></div>');
            newBin.data('index', index);
            $('.ord-bin-container').append(newBin);
            $('.d'+index).droppable({ accept: '.draggable',
                drop: function(event, ui) {
                    var dropped = ui.draggable;
                    var droppedOn = $(this);

                    if (ordinalBin.options.variable.values[index].value>0) {
                        $('.followup').show();
                        followup = $(dropped).data('node-id');
                    }
                    dropped.css({position:'inherit'});
                    droppedOn.children('.ord-active-node-list').append(dropped);

                    $(dropped).appendTo(droppedOn.children('.ord-active-node-list'));
                    var properties = {};
                    properties[ordinalBin.options.variable.label] = ordinalBin.options.variable.values[index].value;
                    // Followup question

                    // Add the attribute
                    netCanvas.Modules.session.getPrimaryNetwork().updateNode($(dropped).data('node-id'),properties);

                    $.each($('.ord-node-bin'), function(oindex) {
                        var length = $('.d'+oindex).children('.ord-active-node-list').children().length;
                        if (length > 0) {
                            var noun = 'people';
                            if (length === 1) {
                                noun = 'person';
                            }

                            $('.d'+oindex+' p').html(length+' '+noun+'.');
                        } else {
                            $('.d'+oindex+' p').html('(Empty)');
                        }

                    });

                    var el = $('.d'+index);

                    setTimeout(function(){
                        el.transition({background:el.data('oldBg')}, 200, 'ease');
                        // el.transition({ scale:1}, 200, 'ease');
                    }, 0);

                    $('.draggable').draggable({ cursor: 'pointer', revert: 'invalid',
                        appendTo: 'body',
                        scroll: false,
                        stack: '.draggable',
                        refreshPositions: true,
                        start: function() {
                            if ($(this).css('top') !== 'auto' && $(this).css('top') !== '0px') {
                                $(this).css({position:'absolute'});
                            } else {
                                $(this).css({position:'relative'});
                            }
                            if (taskComprehended === false) {
                                var eventProperties = {
                                    stage: window.netCanvas.Modules.session.currentStage(),
                                    timestamp: new Date()
                                };
                                log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
                                window.dispatchEvent(log);
                                taskComprehended = true;
                            }

                            // $('.ord-node-bin').css({overflow:'hidden'});
                        },
                        stop: function() {
                            $(this).css({position:'inerit'});
                            // $('.ord-node-bin').css({overflow:'scroll'});
                        }
                    });
                },
                over: function() {
                    $(this).data('oldBg', $(this).css('background-color'));
                    $(this).stop().transition({background:'rgba(255, 193, 0, 1.0)'}, 400, 'ease');

                },
                out: function() {
                    $(this).stop().transition({background:$(this).data('oldBg')}, 500, 'ease');
                }
            });

        });

        // get all nodes, ignoring ego
        var nodes = netCanvas.Modules.session.getPrimaryNetwork().getNodes(ordinalBin.options.criteria, function (results) {
            var filteredResults = [];
            $.each(results, function(index,value) {
                if (value.type !== 'Ego') {
                    filteredResults.push(value);
                }
            });

            return filteredResults;
        });

        // Add edges to bucket or to bins if they already have variable value.
        $.each(nodes, function(index,value) {

            if (value[ordinalBin.options.variable.label] !== undefined && value[ordinalBin.options.variable.label] !== '') {
                index = 'error';
                $.each(ordinalBin.options.variable.values, function(vindex, vvalue) {
                    if (value[ordinalBin.options.variable.label] === vvalue.value) {
                        index = vindex;
                    }
                });

                $('.d'+index).children('.ord-active-node-list').append('<div class="node-bucket-item draggable" data-node-id="'+value.id+'">'+value.label+'</div>');

            } else {
                $('.node-bucket').append('<div class="node-bucket-item draggable" data-node-id="'+value.id+'">'+value.label+'</div>');
            }

        });
        $('.draggable').draggable({ cursor: 'pointer', revert: 'invalid',
            appendTo: 'body',
            scroll: false,
            stack: '.draggable',
            refreshPositions: true,
            start: function() {

                $(this).css({position:'relative'});

                if (taskComprehended === false) {
                    var eventProperties = {
                        stage: window.netCanvas.Modules.session.currentStage(),
                        timestamp: new Date()
                    };
                    log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
                    window.dispatchEvent(log);
                    taskComprehended = true;
                }

                // $('.ord-node-bin').css({overflow:'hidden'});
            },
            stop: function() {
                $(this).css({position:'inerit'});
                // $('.ord-node-bin').css({overflow:'scroll'});
            }
        });

        // Event Listeners
        window.addEventListener('changeStageStart', stageChangeHandler, false);
        $(window.document).on('click', '.followup-option', followupHandler);
    };

return ordinalBin;

};

},{}],15:[function(require,module,exports){
/* global $, window */
/* exported RoleRevisit */
var RoleRevisit = function RoleRevisit() {
    'use strict';
    //global vars
    var roleRevisit = {};
    roleRevisit.options = {
        nodeType:'Alter',
        edgeType:'Dyad',
        targetEl: $('.container'),
        variables: [],
        heading: 'This is a default heading',
        subheading: 'And this is a default subheading'
    };

    var nodeBoxOpen = false;
    var editing = false;

    var roles = {
        'Friend': ['Best Friend','Friend','Ex-friend','Other type'],
        'Family / Relative': ['Parent / Guardian','Brother / Sister','Grandparent','Other Family','Chosen Family'],
        'Romantic / Sexual Partner': ['Boyfriend / Girlfriend','Ex-Boyfriend / Ex-Girlfriend','Booty Call / Fuck Buddy / Hook Up','One Night Stand','Other type of Partner'],
        'Acquaintance / Associate': ['Coworker / Colleague','Classmate','Roommate','Friend of a Friend','Neighbor','Other'],
        'Other Support / Source of Advice': ['Teacher / Professor','Counselor / Therapist','Community Agency Staff','Religious Leader','Mentor','Coach','Other'],
        'Drug Use': ['Someone you use drugs with','Someone you buy drugs from'],
        'Other': ['Other relationship']
    };

    var roleClickHandler = function() {

        if ($(this).data('selected') === true) {
            $(this).data('selected', false);
            $(this).removeClass('selected');

        } else {
            $(this).data('selected', true);
            $(this).addClass('selected');
        }

    };

    var stageChangeHandler = function() {
        roleRevisit.destroy();
    };

    var cardClickHandler = function(e) {
        console.log('card click');
        console.log(e);

        var index = $(this).data('index');
        console.log(index);
        // Set the value of editing to the node id of the current person
        editing = index;

        // Update role count
        var roleCount = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to: editing, type:'Role'}).length;
        $('div[data-index="'+index+'"]').children().children('.role-count').html(roleCount+' roles selected.');

        // Mark the existing roles as selected
        var roleEdges = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to: editing, type:'Role'});
        $.each(roleEdges, function(index, value) {
             $('.rel-'+value.reltype_main_t0).find('div[data-sub-relationship="'+value.reltype_sub_t0+'"]').addClass('selected').data('selected', true);
        });

        // Once the box is opened, delete all the Role edges. Simpler than adding removal logic.
        netCanvas.Modules.session.getPrimaryNetwork().removeEdges(netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to: editing, type:'Role'}));
        roleRevisit.openNodeBox();

    };

    var submitFormHandler = function() {
        var el = $('div[data-index='+editing+']');
        el.stop().transition({background:'#1ECD97'}, 400, 'ease');
        $.each($('.relationship.selected'), function() {
             var edgeProperties = {
                type: 'Role',
                from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id,
                to: editing,
                reltype_main_t0: $(this).parent('.relationship-type').data('main-relationship'),
                reltype_sub_t0: $(this).data('sub-relationship')
              };
            netCanvas.Modules.session.getPrimaryNetwork().addEdge(edgeProperties);
        });

        // Deselect all relationships
        $('.relationship').removeClass('selected');
        var roleCount = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to: editing, type:'Role'}).length;
        $('div[data-index="'+editing+'"]').children().children('.role-count').html(roleCount+' roles selected.');
        roleRevisit.closeNodeBox();
    };

    roleRevisit.openNodeBox = function() {
        $('.content').addClass('blurry');
        $('.relationship-types-container').addClass('open');
        nodeBoxOpen = true;
    };

    roleRevisit.closeNodeBox = function() {
        $('.content').removeClass('blurry');
        // $('.newNodeBox').transition({scale:0.1,opacity:0},500);
        $('.relationship-types-container').removeClass('open');
        setTimeout(function() {

        });
        nodeBoxOpen = false;
    };

	roleRevisit.addToList = function(properties) {
		// var index = $(this).data('index');
		var card;

		card = $('<div class="card" data-index="'+properties.to+'"><h4>'+properties.nname_t0+'</h4></div>');
		var list = $('<ul></ul>');

        list.append('<li class="'+properties.fname_t0+'"><strong>First Name</strong>: '+properties.fname_t0+'</li>');
        list.append('<li class="'+properties.lname_t0+'"><strong>Last Name</strong>: '+properties.lname_t0+'</li>');

        var roles = netCanvas.Modules.session.getPrimaryNetwork().getEdges({from:netCanvas.Modules.session.getPrimaryNetwork().getNodes({type_t0:'Ego'})[0].id, to: properties.to, type:'Role'});
        var roleString = '';
        $.each(roles, function(index, value) {
            roleString += ' '+value.reltype_sub_t0+',';
        });

        // cut off the last comma
        roleString = roleString.substring(0, roleString.length - 1);

        list.append('<li><strong>Roles</strong>: '+roleString+'</li>');

		card.append(list);

		$('.nameList').append(card);

	};

    roleRevisit.destroy = function() {
        window.tools.notify('Destroying roleRevisit.',0);
        // Event listeners
        $(window.document).off('click', '.card', cardClickHandler);
        window.removeEventListener('changeStageStart', stageChangeHandler, false);
        $('.relationship-types-container').remove();
        $(window.document).off('click', '.relationship', roleClickHandler);
        $(window.document).off('click', '.relationship-close-button', roleRevisit.toggleRelationshipBox);
    };

    roleRevisit.init = function(options) {
        window.tools.extend(roleRevisit.options, options);
        // create elements
        var title = $('<h1 class="text-center"></h1>').html(roleRevisit.options.heading);
        roleRevisit.options.targetEl.append(title);
        var subtitle = $('<p class="lead text-center"></p>').html(roleRevisit.options.subheading);
        roleRevisit.options.targetEl.append(subtitle);


        // relationship types
        var roleBox = $('<div class="relationship-types-container"><button class="btn btn-primary relationship-close-button">Close</button></div>');
        $('body').append(roleBox);
        var counter = 0;
        $.each(roles, function(index) {
            $('.relationship-types-container').append('<div class="relationship-type rel-'+counter+' c'+counter+'" data-main-relationship="'+counter+'"><h1>'+index+'</h1></div>');
            $.each(roles[index], function(relIndex, relValue) {
                $('.rel-'+counter).append('<div class="relationship" data-sub-relationship="'+relValue+'">'+relValue+'</div>');
            });
            counter++;
        });

        var nodeContainer = $('<div class="node-container"></div>');
        roleRevisit.options.targetEl.append(nodeContainer);

        // create namelist container
        var nameList = $('<div class="table nameList"></div>');
        $('.node-container').append(nameList);

        // Event listeners
        window.addEventListener('changeStageStart', stageChangeHandler, false);
        $(window.document).on('click', '.card', cardClickHandler);
        $(window.document).on('click', '.relationship', roleClickHandler);
        $(window.document).on('click', '.relationship-close-button', submitFormHandler);

        // Set node count box
    };

    return roleRevisit;
};

module.exports = new RoleRevisit();

},{}],16:[function(require,module,exports){
/* global document, window, $, protocol, nodeRequire, note, alert, FileReader */
/* exported Session, eventLog */
var Session = function Session() {
  'use strict';
  //window vars
  var session = {};
  var currentStage = 0;
  var content = $('#content');
  session.id = 0;
  session.sessionData = {};
  var lastSaveTime, saveTimer;

  function saveFile(path) {
    if (window.isNodeWebkit) {
      var data = JSON.stringify(session.sessionData, undefined, 2);
      var fs = nodeRequire('fs');
      fs.writeFile(path, data);
    } else {
      note.warn('saveFile() is not yet implemented on this platform!');
    }
  }

  function clickDownloadInput() {
    $('#save').prop('nwsaveas', session.returnSessionID()+'_'+Math.floor(Date.now() / 1000)+'.json');
    $('#save').trigger('click');
    session.downloadData();
  }

  // custom events
  session.options = {
    fnBeforeStageChange : function(oldStage, newStage) {
      var eventProperties = {
        stage: currentStage,
        timestamp: new Date()
      };
      var log = new window.CustomEvent('log', {'detail':{'eventType': 'stageCompleted', 'eventObject':eventProperties}});
      window.dispatchEvent(log);

      // $(document).trigger('changeStageStart', {'detail':{oldStage: oldStage, newStage: newStage}});
      var changeStageStartEvent = new window.CustomEvent('changeStageStart', {'detail':{oldStage: oldStage, newStage: newStage}});
      window.dispatchEvent(changeStageStartEvent);

    },
    fnAfterStageChange : function(oldStage, newStage) {
      session.sessionData.sessionParameters.stage = newStage;
      var changeStageEndEvent = new window.CustomEvent('changeStageEnd', {'detail':{oldStage: oldStage, newStage: newStage}});
      window.dispatchEvent(changeStageEndEvent);
      if ((currentStage+1) === session.stages.length) { // last stage
        $('.paginate').removeAttr('disabled');
        $('.arrow-next').attr('disabled', 'disabled');
        if (currentStage === 0) { // first and last stage
          $('.arrow-prev').attr('disabled', 'disabled');
        }
      } else if (currentStage === 0) { // first stage
        $('.paginate').removeAttr('disabled');
        $('.arrow-prev').attr('disabled', 'disabled');
      } else {    // neither
        $('.paginate').removeAttr('disabled');
      }
    }
  };


  session.loadProtocol = function(protocolName, callback) {

    session.protocolName = protocolName;

    // Require the session protocol file.
    // var studyPath = path.normalize('../protocols/'+window.studyProtocol+'/protocol.js');
    $.getScript( 'protocols/'+protocolName+'/protocol.js', function() {

      // protocol.js files declare a protocol variable, which is what we use here.
      // It is implicitly loaded as part of the getScript callback
      var study = protocol;

      session.parameters = session.registerData('sessionParameters');
      session.updateSessionData({sessionParameters:study.sessionParameters});
      // copy the stages
      session.stages = study.stages;

      // insert the stylesheet
      $('head').append('<link rel="stylesheet" href="protocols/'+protocolName+'/css/style.css" type="text/css" />');

      // copy the skip functions
      if (typeof study.skipFunctions !== 'undefined') {
        session.skipFunctions = study.skipFunctions;
      }

      // set the study name (used for database name)
      if (study.sessionParameters.name) {
        session.name = study.sessionParameters.name;
      } else {
        note.error('Study protocol must have key "name" under sessionParameters.');
      }

      // create the sessionGlobals
      if (typeof study.globals !=='undefined') {
        session.globals = study.globals;
        // iterate through and execute;
        $.each(session.globals, function(index, value) {
          value();
        });
      }

      // Initialise the menu system – other modules depend on it being there.
      var stagesMenuOptions = {
        name: 'Stages',
        icon: 'fa-bars',
        items: []
      };

      $.each(session.stages, function(index,value) {
        var icon = null;
        if (value.icon) {
          icon = value.icon;
        }
        var itemObject = {
          label: value.label,
          icon: icon,
          action: function() {setTimeout(function() {session.goToStage(index);}, 500); }
        };

        stagesMenuOptions.items.push(itemObject);

      });

      window.stagesMenu = new window.netCanvas.Modules.Menu(stagesMenuOptions);
      callback();

    }).fail(function( jqxhr, textStatus, error ) {
      var err = textStatus + ', ' + error;
      note.error('Error fetching protocol!');
      note.trace(err);
    });

  };

  function sessionNextHandler() {
    session.nextStage();
  }

  function sessionPreviousHandler() {
    session.prevStage();
  }

  session.loadSessionData = function(id, callback) {
    note.debug('session.loadSessionData()');

    var process = function(data) {
      session.id = data._id;
      session.sessionData.sessionParameters = data.sessionParameters;

      // Build a new network
      session.sessionData.network = new window.netCanvas.Modules.Network();

      // Only load the network into the model if there is a network to load
      if(data.network && data.network.nodes && data.network.edges) {
        session.sessionData.network.loadNetwork({nodes:data.network.nodes, edges:data.network.edges}, true);
      } else {
        session.sessionData.network.init();
      }

      if (typeof session.sessionData.sessionParameters.stage !== 'undefined') {
        session.goToStage(session.sessionData.sessionParameters.stage);
      } else {
        session.goToStage(0);
      }

      if (callback) {
        callback();
      }
  };

    // if the session id is null, we load the last session or create a new session as needed
    if (id === null) {
      note.trace('session.loadSessionData: ID is null');
      window.dataStore.getLastSession(function(data) {
        process(data);
      });
    } else {
      note.trace('session.loadSessionData: ID is '+id);
      // if the session id is not null, we load that session id.
      window.dataStore.load(id, function(data) {
        process(data);
      });
    }


  };

  session.newSession = function() {
    note.debug('session.newSession(): creating new session...');
    // Pass null id so that new session is created
    window.dataStore.newSession(function(newDoc) {
      note.debug('session.newSession(): Session created with id '+newDoc._id);
      session.loadSessionData(newDoc._id, function() {
        if (typeof session.sessionData.sessionParameters.stage !== 'undefined') {
          session.goToStage(session.sessionData.sessionParameters.stage);
        } else {
          session.goToStage(0);
        }
      });
    });

  };

  session.init = function(properties) {
    note.info('Session initialising.');

    // Navigation arrows.
    $('.arrow-next').on('click', sessionNextHandler);

    $('.arrow-prev').on('click', sessionPreviousHandler);

    //bind to the custom state change event to handle spinner interactions

    window.addEventListener('changeStageStart', function () {
      $('.loader').transition({opacity:1});
    }, false);

    window.addEventListener('changeStageEnd', function () {
      $('.loader').transition({opacity:0});
    }, false);

    window.document.getElementById('save').addEventListener('change', function () {
      saveFile(this.value);
    });

    window.addEventListener('unsavedChanges', function () {
      session.saveManager();
    }, false);

    var sessionMenuOptions = {
      name: 'Session',
      icon: 'fa-cogs',
      items: []
    };

    window.sessionMenu = new window.netCanvas.Modules.Menu(sessionMenuOptions);
    window.sessionMenu.addItem('New Session', 'fa-plus', session.newSession);
    // window.sessionMenu.addItem('Reset this Session', 'fa-undo', function() {
    //     window.BootstrapDialog.show({
    //         type: window.BootstrapDialog.TYPE_DANGER,
    //         // size: BootstrapDialog.SIZE_LARGE,
    //         title: '',
    //         message: '<h3>Are you sure you want to reset the session?</h3> <p><strong>IMPORTANT:</strong> This will delete all data from this session. Data from other sessions will not be deleted (use purge database if you wish to delete this data too).',
    //         buttons: [{
    //             label: 'Continue',
    //             cssClass: 'btn-modal-success',
    //             action: function(){
    //                 window.dataStore.deleteDocument(session.reset);
    //             }
    //         }, {
    //             label: 'Cancel',
    //             cssClass: 'btn-modal-danger',
    //             action: function(dialogItself){
    //                 dialogItself.close();
    //             }
    //         }]
    //     });
    // });

    window.sessionMenu.addItem('Download Data', 'fa-download', clickDownloadInput);

    window.sessionMenu.addItem('Purge Database', 'fa-trash', function() {
      window.BootstrapDialog.show({
        type: window.BootstrapDialog.TYPE_DANGER,
        // size: BootstrapDialog.SIZE_LARGE,
        title: '',
        message: '<h3>Are you sure you want to purge the database?</h3><p><strong>IMPORTANT:</strong> This will delete all data.',
        buttons: [{
          label: 'Continue',
          cssClass: 'btn-modal-success',
          action: function(){
            window.dataStore.reset(session.reset);
          }
        }, {
          label: ' Cancel',
          cssClass: 'btn-modal-danger',
          action: function(dialogItself){
            dialogItself.close();
          }
        }]
      });
    });

    window.sessionMenu.addItem('Quit Network Canvas', 'fa-sign-out', function() { window.close(); });


    // Attempt to load the protocol passed as a session property

    session.loadProtocol(properties.protocol, function() {
        // If sucessful load the session data.
      window.dataStore.init(function() {
        session.loadSessionData(properties.sessionID);
        // Temporarily disabled as causes issues with ordbin interface. Drop event triggered
        //
        // $('html').on('dragover', function(event) {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     $(this).addClass('dragging');
        // });
        //
        // $('html').on('dragleave', function(event) {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     $(this).removeClass('dragging');
        // });
        //
        // $('html').on('drop', function(event) {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     console.log(event);
        //
        //     var file = event.originalEvent.dataTransfer.files[0],
        //         reader = new FileReader();
        //     reader.onload = function (e) {
        //         try {
        //             var json = JSON.parse(e.target.result);
        //             // Check for obsolete file format
        //             if (!json.network) {
        //                 json.network = {};
        //             }
        //
        //             if (json.nodes || json.edges) {
        //                 note.warn('Obsolete file format detected. Updating.');
        //                 if (json.nodes) {
        //                     json.network.nodes = json.nodes;
        //                     delete json.nodes;
        //                 }
        //
        //                 if (json.edges) {
        //                     json.network.edges = json.edges;
        //                     delete json.edges;
        //                 }
        //
        //             }
        //             window.dataStore.insertFile(json, session.loadSessionData);
        //         } catch (ex) {
        //             note.error('ex when trying to parse json = ' + ex);
        //         }
        //     };
        //     reader.readAsText(file);
        //
        //     return false;
        // });

      });
    });

  };

  session.getPrimaryNetwork = function() {
    return session.sessionData.network;
  };

  session.downloadData = function() {
    var filename = session.returnSessionID()+'.json';
    var text = JSON.stringify(session.sessionData, undefined, 2); // indentation level = 2;
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
  };

  session.reset = function() {
    note.info('Resetting session.');
    session.id = 0;
    session.currentStage = 0;
    session.sessionData = {};

    if (window.isNodeWebkit) {
      window.gui.Window.get().reloadDev();
    } else {
      window.location.reload();
    }

  };

  session.saveManager = function() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(session.saveData, 1000);
  };

  session.updateSessionData = function(data, callback) {
    note.debug('session.updateSessionData()');
    note.trace(data);

    // Here, we used to simply use our extend method on session.sessionData with the new data.
    // This failed for arrays.
    // Switched to $.extend and added 'deep' as first function parameter for this reason.
    $.extend(true, session.sessionData, data);

    var newDataLoaded = new window.Event('newDataLoaded');
    window.dispatchEvent(newDataLoaded);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);

    if (callback) {
      callback();
    }
  };

  session.returnSessionID = function() {
    return session.id;
  };

  session.saveData = function() {
    if(!window.dataStore.initialised()) {
      note.warn('session.saveData() tried to save before dataStore was initialised. Waiting.');
      var unsavedChanges = new window.Event('unsavedChanges');
      window.dispatchEvent(unsavedChanges);
    } else {
      window.dataStore.save(session.sessionData, session.returnSessionID());
    }

    lastSaveTime = new Date();
  };

  session.goToStage = function(stage) {
    if (typeof stage === 'undefined' || typeof session.stages[stage] === 'undefined') {
      return false;
    }

    // Skip logic

    // is there a skip function for this stage?
    if (session.stages[stage].skip) {

      //evaluate skip function
      var outcome = session.stages[stage].skip();

      // if true, skip the stage
      if (outcome === true) {
        if (stage > currentStage) {
          session.goToStage(stage+1);
        } else {
          session.goToStage(stage-1);

        }

        return false;
      }
    }

    note.info('Session is moving to stage '+stage);

    // Crate stage visible event
    var eventProperties = {
      stage: stage,
      timestamp: new Date()
    };
    var log = new window.CustomEvent('log', {'detail':{'eventType': 'stageVisible', 'eventObject':eventProperties}});
    window.dispatchEvent(log);

    // Fire before stage change event
    session.options.fnBeforeStageChange(currentStage,stage);

    // Transition the content
    var newStage = stage;
    var stagePath ='./protocols/'+session.protocolName+'/stages/'+session.stages[stage].page;
    stagePath += '?_=' + (new Date()).getTime();
    content.transition({opacity: '0'},400,'easeInSine').promise().done( function(){
      content.load( stagePath, function() {
        content.transition({ opacity: '1'},400,'easeInSine');
      });
    });

    var oldStage = currentStage;
    currentStage = newStage;
    session.options.fnAfterStageChange(oldStage, currentStage);
    var unsavedChanges = new window.Event('unsavedChanges');
    window.dispatchEvent(unsavedChanges);
  };

  session.nextStage = function() {
    session.goToStage(currentStage+1);
  };

  session.prevStage = function() {
    session.goToStage(currentStage-1);
  };

  session.registerData = function(dataKey, isArray) {
    note.info('A script requested a data store be registered with the key "'+dataKey+'".');
    if (session.sessionData[dataKey] === undefined) { // Create it if it doesn't exist.
    note.debug('Key named "'+dataKey+'" was not already registered. Creating.');
    if (isArray) {
      session.sessionData[dataKey] = [];
    } else {
      session.sessionData[dataKey] = {};
    }
  } else {
    note.debug('A data store with this key already existed. Returning a reference.');
  }
  var unsavedChanges = new window.Event('unsavedChanges');
  window.dispatchEvent(unsavedChanges);
  return session.sessionData[dataKey];
};

session.addData = function(dataKey, newData, append) {
  /*
  This function should let any module add data to the session model. The session model
  (window data variable) is essentially a key/value store.
  */

  // Check if we are appending or overwriting
  if (!append) { append = false; }

  if (append === true) { // this is an array
    session.sessionData[dataKey].push(newData);
  } else {
    window.tools.extend(session.sessionData[dataKey], newData);
  }

  // Notify
  note.debug('Adding data to key "'+dataKey+'".');
  note.debug(newData);

  // Emit an event to trigger data store synchronisation.
  var unsavedChanges = new window.Event('unsavedChanges');
  window.dispatchEvent(unsavedChanges);

};

session.currentStage = function() {
  return currentStage;
};

session.returnData = function(dataKey) {
  if (!dataKey) {
    return session.sessionData;
  } else if (typeof session.sessionData[dataKey] !== 'undefined') {
    return session.sessionData[dataKey];
  } else {
    return session.sessionData;
  }
};

return session;
};

module.exports = new Session();

},{}],17:[function(require,module,exports){
/* global Konva, window, $, note, ConvexHullGrahamScan, Image, Swiper */
/* exported Sociogram */
/*jshint bitwise: false*/

module.exports = function Sociogram() {
	'use strict';
	// Global variables
	var stage = {}, circleLayer = {}, edgeLayer = {}, nodeLayer = {}, wedgeLayer = {}, hullLayer = {}, hullShapes = {}, uiLayer = {}, sociogram = {};
	var moduleEvents = [], selectedNodes = [];
	sociogram.selectedNode = null;
	var newNodeCircleTween, promptSwiper, log, longPressTimer, tapTimer;
	var nodesWithoutPositions = 0, currentPrompt = 0;
	var newNodeCircleVisible = false, hullsShown = false, taskComprehended = false, touchNotTap = false;

	// Colours
	var colors = {
		blue: '#0174DF',
		tomato: '#FF6347',
		teal: '#008080',
		hullpurple: '#9a208e',
		freesia: '#ffd600',
		hullgreen: '#6ac14c',
		cayenne: '#c40000',
		placidblue: '#83b5dd',
		violettulip: '#9B90C8',
		hemlock: '#9eccb3',
		paloma: '#aab1b0',
		sand: '#ceb48d',
		dazzlingblue: '#006bb6',
		edge: '#dd393a',
		selected: '#ffbf00',
	};

	var hullColors = ['#01a6c7','#1ECD97', '#B16EFF','#FA920D','#e85657','Gold','Pink','Saddlebrown','Teal','Silver'];

	// Default settings
	var settings = {
		network: window.netCanvas.Modules.session.getPrimaryNetwork(),
		targetEl: 'kineticCanvas',
		// consecutive single tap - edge mode
		// drag - layout mode
		// double tap - select mode
		// long press - community mode
		modes:['Position'], //edge - create edges, position - lay out, select - node attributes
		panels: ['details'], // Mode - switch between modes, Details - long press shows node details
		options: {
			defaultNodeSize: 33,
			defaultNodeColor: 'white',
			defaultNodeStrokeWidth: 4,
			defaultLabelColor: 'black',
			defaultEdgeColor: colors.edge,
			concentricCircleColor: '#ffffff',
			concentricCircleNumber: 4,
			concentricCircleSkew: false,
			showMe: false,
		},
		dataOrigin: {
			'Position': {
				type: 'node',
				variable: 'coords'
			},
			'Community' : {
				type: 'ego',
				name: 'Groups',
				egoVariable: 'contexts',
				variable: 'contexts'
			}
		},
		prompts: [],
		criteria: { // criteria for being shown on this screen
			includeEgo: false,
			query: {
			}
		}
	};

	// Private functions

	// Adjusts the size of text so that it will always fit inside a given shape.
	function padText(text, container, amount){
		while (( text.getTextWidth() * 1.001 ) < container.width() - ( amount * 2 ) && ( text.getTextHeight() * 1.001 ) < container.height() - ( amount * 2 )) {
			text.fontSize( text.fontSize() * 1.001 );
		}

		text.y( ( (text.getTextHeight() /2) ) * -1);
		text.x( ( (text.getTextWidth() / 2) *- 1 ) );
	}

	function toPointFromObject(array) {
		var newArray = [];
		for (var i = 0; i<array.length; i++) {
			newArray.push(array[i].x);
			newArray.push(array[i].y);
		}

		return newArray;
	}

	function addNodeHandler(e) {
		sociogram.addNode(e.detail);
	}

	sociogram.hullListClickHandler = function(e) {
		var clicked = $(e.target).closest('li');
		var selectedHull = clicked.data('hull');
		if (sociogram.selectedNode.attrs.contexts.indexOf(selectedHull) !== -1 ) {
			clicked.removeClass('active');
			sociogram.removePointFromHull(sociogram.selectedNode, selectedHull);
		} else {
			clicked.addClass('active');
			sociogram.addPointToHull(sociogram.selectedNode, selectedHull);
		}
	};

	function groupButtonClickHandler() {
		sociogram.addHull();
	}

	sociogram.changeData = function() {
		sociogram.resetNodeState();
		sociogram.updateState();
	};

	sociogram.init = function (userSettings) {

		note.info('Sociogram initialising.');

		$.extend(true, settings,userSettings);
		// Add the title and heading
		$('<div class="sociogram-title"></div>').insertBefore('#'+settings.targetEl );

		// Creater swiper pages

		// First, check we have multiple prompts
		if (settings.prompts.length > 1) {
			$('.sociogram-title').append('<div class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>');

			for (var i = 0; i < settings.prompts.length; i++) {
				$('.swiper-wrapper').append('<div class="swiper-slide"><h5>'+settings.prompts[i].prompt+'</h5></div>');
			}

			promptSwiper = new Swiper ('.swiper-container', {
				pagination: '.swiper-pagination',
				paginationClickable: true,
				speed: 1000
			});

			// Update current prompt counter
			promptSwiper.on('slideChangeEnd', function () {
				currentPrompt = promptSwiper.activeIndex;
				sociogram.changeData();
			});
		} else if (settings.prompts.length === 1) {
			$('.sociogram-title').append('<div class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>');
			$('.swiper-wrapper').append('<div class="swiper-slide"><h4>'+settings.prompts[0].prompt+'</h4></div>');
		}

		// Initialise the konva stage
		sociogram.initKinetic();

		// Draw ui compoennts
		sociogram.drawUIComponents(function() {

			// Show hulls checkbox
			if (settings.modes.indexOf('Community') !== -1) {
				$('#'+settings.targetEl).append('<input class="show-contexts-checkbox" type="checkbox" name="context-checkbox-show" id="context-checkbox-show"> <label for="context-checkbox-show">Contexts shown</label>');
			}

			// Panels
			if (settings.panels.indexOf('details') !== -1) {
				$('<div class="details-panel"><div class="context-header"><h4>Details</h4></div><ul class="list-group context-list"></ul><div class="context-footer"><div class="pull-left new-group-button"><span class="fa fa-plus-circle"></span> New context</div></div></div>').appendTo('#'+settings.targetEl);
			}

			sociogram.addNodeData();

			// Add the evevent listeners
			sociogram.bindEvents();

			// Update initial states of all nodes and edges;
			sociogram.updateState();

		});
	};

	sociogram.bindEvents = function() {
		// Events
		var event = [
			{
				event: 'changeStageStart',
				handler: sociogram.destroy,
				targetEl:  window
			},
			{
				event: 'nodeAdded',
				handler: addNodeHandler,
				targetEl:  window
			},
			{
				event: 'edgeAdded',
				handler: sociogram.updateState,
				targetEl:  window
			},
			{
				event: 'nodeRemoved',
				handler: sociogram.removeNode,
				targetEl:  window
			},
			{
				event: 'edgeRemoved',
				handler: sociogram.removeEdge,
				targetEl:  window
			},
			{
				event: 'change',
				handler: sociogram.toggleHulls,
				subTarget: '#context-checkbox-show',
				targetEl:  window.document
			},
			{
				event: 'click',
				handler: groupButtonClickHandler,
				subTarget: '.new-group-button',
				targetEl:  window.document
			},
			{
				event: 'click',
				handler: sociogram.showNewNodeForm,
				targetEl:  '.new-node-button'
			}, {
				event: 'click',
				handler: sociogram.hullListClickHandler,
				targetEl:  window.document,
				subTarget:  '.list-group-item',
			},
			{
				event: 'submit',
				handler: function() {
					setTimeout(function() {
						sociogram.updateState();
					},100);
				},
				targetEl: window.document,
				subtarget: window.forms.nameGenForm.getID()
			}
		];
		window.tools.Events.register(moduleEvents, event);

	};

	sociogram.destroy = function() {
		note.info('sociogram.destroy();');
		stage.destroy();
		window.tools.Events.unbind(moduleEvents);
	};

	sociogram.addNodeData = function() {
		note.debug('sociogram.addNodeData()');
		var criteriaNodes;

		// get nodes according to criteria query
		// filter out ego if required
		if (settings.criteria.includeEgo !== true) {
			criteriaNodes = settings.network.getNodes(settings.criteria.query, function (results) {
				var filteredResults = [];
				$.each(results, function(index,value) {
					if (value.type !== 'Ego') {
						filteredResults.push(value);
					}
				});

				return filteredResults;
			});
		} else {
			criteriaNodes = settings.network.getNodes(settings.criteria.query);
		}

		for (var j = 0; j < criteriaNodes.length; j++) {
			note.debug('sociogram.addNodeData() adding '+j);
			sociogram.addNode(criteriaNodes[j]);
		}

		// Layout Mode
		var layoutNodes = sociogram.getKineticNodes();
		$.each(layoutNodes, function(index,node) {
			node.setPosition(node.attrs.coords);
		});

		// Community
		var communityNodes;

		// community data is coming from ego
		if (typeof netCanvas.Modules.session.getPrimaryNetwork().getEgo().contexts === 'undefined') {
			console.warn('Ego didn\'t have the community variable you specified, so it was created as a blank array.');
			var communityProperties = {};
			communityProperties.contexts= [];
			netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getEgo().id, communityProperties);
		}

		var egoHulls = netCanvas.Modules.session.getPrimaryNetwork().getEgo().contexts;
		$.each(egoHulls, function(hullIndex, hullValue) {
			sociogram.addHull(hullValue);
		});

		communityNodes = sociogram.getKineticNodes();
		$.each(communityNodes, function(index,node) {
			$.each(node.attrs.contexts, function (hullIndex, hullValue) {
				// Difference from node mode is we check if the node hull has been defined by ego too
				// if (egoHulls.indexOf(hullValue) !== -1) {
				sociogram.addPointToHull(node, hullValue);
				// }

			});
		});

	};

	sociogram.toggleHulls = function(e) {
		note.info('Sociogram: toggleHulls()');

		if ((e && e.target.checked) || hullsShown === false) {
			$('label[for="context-checkbox-show"]').html('Contexts shown');
			new Konva.Tween({
				node: hullLayer,
				duration: 0.5,
				opacity: 1
			}).play();
			hullsShown = true;
		} else {
			$('label[for="context-checkbox-show"]').html('Contexts hidden');

			new Konva.Tween({
				node: hullLayer,
				duration: 0.5,
				opacity: 0
			}).play();

			hullsShown = false;
		}
		$('label[for="context-checkbox-show"]').addClass('show');
		setTimeout(function() {
			$('label[for="context-checkbox-show"]').removeClass('show');
		}, 2000);
		hullLayer.draw();
	};

	sociogram.resetNodeState = function() {

		// Reset select
		var kineticNodes = sociogram.getKineticNodes();
		$.each(kineticNodes, function(nodeIndex, nodeValue) {
			nodeValue.children[1].stroke(settings.options.defaultNodeColor);
		});

		nodeLayer.batchDraw();

		// Reset edges
		edgeLayer.removeChildren();
		edgeLayer.batchDraw();

	};

	sociogram.updateState = function() {
		/**
		* Updates visible attributes based on current prompt task
		*/

		// Edge Mode
		if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showEdges === 'object' && typeof settings.prompts[currentPrompt].showEdges.criteria === 'object') {

			var properties = {};
			$.each(settings.prompts[currentPrompt].showEdges.criteria, function(index, value) {
				properties[value.label] = value.value;
			});
			var edges = settings.network.getEdges(properties);
			$.each(edges, function(index, edge) {
				if (typeof settings.prompts[currentPrompt].showEdges.options === "object") {
					sociogram.addEdge(edge, settings.prompts[currentPrompt].showEdges.options);
				} else {
					sociogram.addEdge(edge);
				}

			});

		}

		// Select Mode
		if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showSelected === 'object') {

			var selectNodes = settings.network.getNodes();
			$.each(selectNodes, function(index, node) {
				var currentValue = node[settings.prompts[currentPrompt].showSelected.variable];
				if (currentValue == settings.prompts[currentPrompt].showSelected.value) {
					// this node is selected
					var sociogramNode = sociogram.getNodeByID(node.id);
					sociogramNode.children[1].stroke(colors.selected);
				}
			});

			nodeLayer.draw();

		} else if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showSelected === 'string' && settings.prompts[currentPrompt].showSelected === 'multiple'){
			// special mode where we show selected nodes from multiple variables to help with edge creation.
			var selectNodes = settings.network.getNodes();
			var variables = settings.prompts[currentPrompt].selectVariables;

			$.each(selectNodes, function(index, node) {
				for (var variable in variables) {
					var currentValue = node[variables[variable]];
					if (currentValue) {
						// this node is selected
						var sociogramNode = sociogram.getNodeByID(node.id);
						sociogramNode.children[1].stroke(colors.selected);
					}
				}
			});

			nodeLayer.draw();
		}

	};

	sociogram.getSelectedNodes = function() {
		return selectedNodes;
	};

	sociogram.timeSelectedNode = function() {
		setInterval(function() {
		}, 1000);
	};

	sociogram.addHull = function(label) {
		note.info('sociogram.addHull ['+label+']');
		// ignore groups that already exist
		label = label ? label : 'New Context '+$('li[data-hull]').length;
		if (typeof hullShapes[label] === 'undefined') {
			var thisHull = {};
			thisHull.label = label;
			thisHull.hull = new ConvexHullGrahamScan();

			var color = hullColors[$('.list-group-item').length];

			var hullShape = new Konva.Line({
				points: [window.outerWidth/2, window.outerHeight/2],
				fill: color,
				opacity:0.5,
				stroke: color,
				lineJoin: 'round',
				lineCap: 'round',
				transformsEnabled: 'position',
				hitGraphEnabled: false,
				tension : 0.1,
				strokeWidth: 80,
				closed : true
			});
			hullShapes[label] = hullShape;
			$('.context-list').append('<li class="list-group-item hull" data-hull="'+thisHull.label+'"><div class="context-color" style="background:'+color+'"></div> <span class="context-label">'+thisHull.label+'</span> <span class="pull-right fa fa-pencil"></span></li>');
			// $('.context-list').scrollTo('li[data-hull="'+thisHull.label+'"]', 500);
			hullLayer.add(hullShapes[label]);
			hullLayer.opacity(0);
			hullLayer.draw();

			// If the data origin is ego, also add the new hull to ego
			if (settings.dataOrigin.Community.type === 'ego') {
				// If ego doesn't have the variable set, create it

				var properties;
				if (typeof netCanvas.Modules.session.getPrimaryNetwork().getEgo()[settings.dataOrigin.Community.egoVariable] === 'undefined') {
					properties = {};
					properties[settings.dataOrigin.Community.egoVariable] = [];
					netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getEgo().id, properties);
				}

				// get existing data
				var egoContexts = netCanvas.Modules.session.getPrimaryNetwork().getEgo()[settings.dataOrigin.Community.egoVariable];
				if (egoContexts.indexOf(thisHull.label) === -1) {
					// Update ego
					egoContexts.push(thisHull.label);
					window.netCanvas.Modules.session.saveData();
				}

			}

		}

	};

	sociogram.hullExists = function(hullLabel) {
		var found = false;
		if ($('li[data-hull="'+hullLabel+'"]').length > 0) {
			found = true;
		}
		return found;
	};

	sociogram.addPointToHull = function(point, hullLabel) {
		// check if hull is already present
		note.info('sociogram.addPointToHull()');
		var properties;
		// if a hull with hullLabel doesnt exist, create one
		if (!sociogram.hullExists(hullLabel)) {
			note.warn('sociogram.addPointToHull(): the hull label "'+hullLabel+'" didn\'t exist, so a new hull was created.');
			sociogram.addHull(hullLabel);
		}

		// If the point doesn't have the destination attribute, create it
		if (point.attrs.contexts === 'undefined') {
			note.warn('Node did not have the data destinateion community attribute. A blank array was created.');
			properties = {};
			properties.contexts = [];
			netCanvas.Modules.session.getPrimaryNetwork().updateNode(point.attrs.id, properties);
		}
		// Only store if the node doesn't already have the hull present
		if (point.attrs.contexts.indexOf(hullLabel) === -1) {
			// Find the node we need to store the hull value in, and update it.

			// Create a dummy object so we can use the variable name set in settings.dataDestination
			properties = {};
			properties.contexts = point.attrs.contexts.concat([hullLabel]);
			point.attrs.contexts = point.attrs.contexts.concat([hullLabel]);

			// Update the node with the object
			settings.network.updateNode(point.attrs.id, properties, function() {
				note.debug('Network node updated', 1);
			});
		}

		// redraw all hulls begins here
		var pointHulls = point.attrs.contexts;

		// For each hull of the current point
		for (var i = 0; i < pointHulls.length; i++) {

			// Create an empty hull
			var newHull = new ConvexHullGrahamScan();

			// For each node
			for (var j = 0; j < nodeLayer.children.length; j++) {
				var thisChildHulls = nodeLayer.children[j].attrs.contexts;

				// Test if the current points current hull is in the current node's hull list

				if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
					// It is, so get the position of this node.
					var coords = nodeLayer.children[j].getPosition();

					// Add it to the new hull

					newHull.addPoint(coords.x, coords.y);
				}
			}

			// At the end of this loop we should have a newHull with points for all nodes

			// We need this check because on load all hull shapes might not be defined yet.
			if (typeof hullShapes[pointHulls[i]] !== 'undefined') {
				var tween = new Konva.Tween({
					node: hullShapes[pointHulls[i]],
					points: toPointFromObject(newHull.getHull()),
					duration: 0.5,
					onFinish: function(){
						tween.destroy();
					}
				}).play();

			}

			hullLayer.batchDraw();
			nodeLayer.draw();

		}

	};

	sociogram.redrawHulls = function() {
		for (var i = 0; i < hullShapes.length; i++) {
			var newHull = new ConvexHullGrahamScan();

			for (var j = 0; j < nodeLayer.children.length; j++) {
				var thisChildHulls = nodeLayer.children[j].attrs.contexts;
				if (thisChildHulls.indexOf(hullShapes[i]) !== -1) {
					var coords = nodeLayer.children[j].getPosition();
					newHull.addPoint(coords.x, coords.y);
				}
			}

			hullShapes[i].setPoints(toPointFromObject(newHull.getHull()));
			hullLayer.batchDraw();

		}

	};

	sociogram.getHullShapes = function() {
		return hullShapes;
	};

	sociogram.removePointFromHull = function(point, hullLabel) {
		note.info('sociogram.removePointFromHull()');
		var properties;

		// store properties according to data destination
		if (settings.dataOrigin.Community.type === 'node') {

			// If the point doesn't have the attribute, fail
			if (point.attrs[settings.dataDestination.Community.variable] === 'undefined') {
				note.error('sociogram.removePointFromHull(): Error! The point wasn\'t attached to a hull named '+hullLabel);
				return false;
			}

			// If the hull isnt in the node, fail
			if (point.attrs[settings.dataDestination.Community.variable].indexOf(hullLabel) === -1) {
				note.error('sociogram.removePointFromHull(): Error! The point wasn\'t attached to a hull named '+hullLabel);
				return false;
			} else {
				// Find the node we need to store the hull value in, and update it.

				// Create a dummy object so we can use the variable name set in settings.dataDestination
				properties = {};
				var nodePointHulls = point.attrs.contexts;
				nodePointHulls.remove(hullLabel);
				properties[settings.dataDestination.Community.variable] = nodePointHulls;
				point.attrs.contexts = nodePointHulls;

				// Update the node with the object
				settings.network.updateNode(point.attrs.id, properties, function() {
					note.info('Network node updated', 1);
					note.debug(properties);
				});
			}

		} else if (settings.dataOrigin.Community.type === 'ego') {

			// If the point doesn't have the attribute, fail
			if (point.attrs[settings.dataOrigin.Community.variable] === 'undefined') {
				note.error('sociogram.removePointFromHull(): Error! The point wasn\'t attached to a hull named '+hullLabel);
				return false;
			}

			// If the hull isnt in the node, fail
			if (point.attrs[settings.dataOrigin.Community.variable].indexOf(hullLabel) === -1) {
				note.error('sociogram.removePointFromHull(): Error! The point wasn\'t attached to a hull named '+hullLabel);
				return false;
			} else {
				// Find the node we need to store the hull value in, and update it.

				// Create a dummy object so we can use the variable name set in settings.dataOrigin
				properties = {};
				var egoPointHulls = point.attrs.contexts;
				egoPointHulls.remove(hullLabel);
				properties[settings.dataOrigin.Community.variable] = egoPointHulls;
				point.attrs.contexts = egoPointHulls;

				// Update the node with the object
				settings.network.updateNode(point.attrs.id, properties, function() {
					note.info('Network node updated', 1);
					note.debug(properties);
				});
			}
		} else if (settings.dataOrigin.Position.type === 'edge') {
			// not yet implemented
		}


		// redraw only the hull that the node has been removed from
		// Create an empty hull
		var newHull = new ConvexHullGrahamScan();

		// For each node
		for (var j = 0; j < nodeLayer.children.length; j++) {
			var thisChildHulls = nodeLayer.children[j].attrs.contexts;

			// Test if the current points current hull is in the current node's hull list
			if (thisChildHulls.indexOf(hullLabel) !== -1) {
				// It is, so get the position of this node.
				var coords = nodeLayer.children[j].getPosition();

				// Add it to the new hull
				newHull.addPoint(coords.x, coords.y);
			}
		}



		// At the end of this loop we should have a newHull with points for all nodes

		// We need this check because on load all hull shapes might not be defined yet.
		var hullPoints = newHull.getHull();
		if (hullPoints.length === 1 && typeof hullPoints[0] === 'undefined') {
			hullPoints = [];
		}
		if (typeof hullShapes[hullLabel] !== 'undefined') {
			var tween = new Konva.Tween({
				node: hullShapes[hullLabel],
				points: toPointFromObject(hullPoints),
				duration: 0.5,
				onFinish: function(){
					tween.destroy();
				}
			}).play();
		}

		hullLayer.batchDraw();
		nodeLayer.draw();


	};

	sociogram.addNode = function(options) {

		note.debug('sociogram.addNode()');
		note.trace(options);
		// Placeholder for getting the number of nodes we have.
		var nodeShape;

		var nodeID = 0;
		while (settings.network.getNode(nodeID) !== false) {
			nodeID++;
		}

		var dragStatus = false;
		if (settings.modes.indexOf('Position') !== -1 || settings.modes.indexOf('Edge') !== -1) {
			dragStatus = true;
		}

		// Try to guess at a label if one isn't provided.
		// Is there a better way of doing this?
		if (typeof options.label === 'undefined' && typeof options.nname_t0 !== 'undefined') { // for RADAR use nickname
			options.label = options.nname_t0;
		} else if (typeof options.label === 'undefined' && typeof options.name !== 'undefined'){
			options.label = options.name;
		}

		var nodeOptions = {
			id: nodeID,
			coords: [],
			positioned: false,
			label: 'Undefined',
			type: 'Person',
			transformsEnabled: 'position',
			size: settings.options.defaultNodeSize,
			color: settings.options.defaultNodeColor,
			strokeWidth: settings.options.defaultNodeStrokeWidth,
			stroke: settings.options.defaultNodeColor,
			draggable: dragStatus,
			dragDistance: 20
		};

		nodeOptions.contexts = [];
		window.tools.extend(nodeOptions, options);

		nodeOptions.id = parseInt(nodeOptions.id, 10);
		nodeOptions.x = nodeOptions.coords[0] ? nodeOptions.coords[0] : false;
		nodeOptions.y = nodeOptions.coords[1] ? nodeOptions.coords[1] : false;

		var nodeGroup = new Konva.Group(nodeOptions);

		var selectCircle = new Konva.Circle({
			radius: nodeOptions.size+(nodeOptions.strokeWidth*1.5),
			fill:settings.options.defaultEdgeColor,
			transformsEnabled: 'position',
			opacity:0
		});

		nodeShape = new Konva.Circle({
			radius: nodeOptions.size,
			fill:nodeOptions.color,
			transformsEnabled: 'position',
			strokeWidth: nodeOptions.strokeWidth,
			stroke: nodeOptions.stroke,
			shadowColor: 'black',
			shadowBlur: 2,
			shadowOffset: {x : 0, y : 0},
			shadowOpacity: 1
		});

		// var label = nodeOptions.label.wrap(8,3);
		var nodeLabel = new Konva.Text({
			text: nodeOptions.label,
			fontSize: 13,
			fontFamily: 'Lato',
			transformsEnabled: 'position',
			fill: settings.options.defaultLabelColor,
			// width:nodeShape.getWidth(),
			// height:nodeShape.getHeight(),
			align: 'center',
			// width: (settings.options.defaultNodeSize*2),
			// height: (settings.options.defaultNodeSize*2),
			// x: -35,
			// y: -5,
			// lineHeight: (settings.options.defaultNodeSize*2),
			fontStyle:500
		});

		padText(nodeLabel,nodeShape,8);

		note.debug('Putting node '+nodeOptions.label+' at coordinates x:'+nodeOptions.coords[0]+', y:'+nodeOptions.coords[1]);

		nodeGroup.add(selectCircle);
		nodeGroup.add(nodeShape);
		nodeGroup.add(nodeLabel);

		nodeLayer.add(nodeGroup);

		setTimeout(function() {
			nodeLayer.draw();
		}, 0);

		if (!options.coords || nodeOptions.coords.length === 0) {
			nodesWithoutPositions++;
			if (!newNodeCircleVisible) {
				newNodeCircleTween.play();
				newNodeCircleVisible = true;
			}
			nodeGroup.position({
				x: 0,
				y:$(window).height()/2
			});
			new Konva.Tween({
				node: nodeGroup,
				x: 145,
				y: $(window).height()/2,
				duration:0.7,
				easing: Konva.Easings.EaseOut
			}).play();
			// settings.network.setProperties(settings.network.getNode(nodeOptions.id),{coords:[$(window).width()-150, $(window).height()-150]});
		} else {

		}

		// Node event handlers
		nodeGroup.on('dragstart', function() {

			window.wedge.anim.stop();
			window.clearTimeout(longPressTimer);
			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}

			note.debug('dragstart');

			// Add the current position to the node attributes, so we know where it came from when we stop dragging.
			this.attrs.oldx = this.attrs.x;
			this.attrs.oldy = this.attrs.y;
			if (this.attrs.positioned === false ) {
				this.attrs.positioned = true;
				nodesWithoutPositions--;
				if (nodesWithoutPositions < 1) {
					newNodeCircleTween.reverse();
					newNodeCircleVisible = false;
				}
			}

			this.moveToTop();
			nodeLayer.draw();

			var dragNode = nodeOptions.id;

			// Update the position of any connected edges and hulls
			var pointHulls = this.attrs.contexts;
			for (var i = 0; i < pointHulls.length; i++) {
				var newHull = new ConvexHullGrahamScan();

				for (var j = 0; j < nodeLayer.children.length; j++) {
					var thisChildHulls = nodeLayer.children[j].attrs.contexts;
					if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
						var coords = nodeLayer.children[j].getPosition();
						newHull.addPoint(coords.x, coords.y);
					}
				}

				hullShapes[pointHulls[i]].setPoints(toPointFromObject(newHull.getHull()));
				hullLayer.batchDraw();

			}

			$.each(edgeLayer.children, function(index, value) {

				// value.setPoints([dragNode.getX(), dragNode.getY() ]);
				if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
					var points = [sociogram.getNodeByID(value.attrs.from).getX(), sociogram.getNodeByID(value.attrs.from).getY(), sociogram.getNodeByID(value.attrs.to).getX(), sociogram.getNodeByID(value.attrs.to).getY()];
					value.attrs.points = points;

				}
			});

		});

		nodeGroup.on('dragmove', function() {

			// Cancel wedge actions
			window.wedge.anim.stop();
			var tween = new Konva.Tween({
				node: window.wedge,
				opacity: 0,
				duration: 0,
				onFinish: function(){
					tween.destroy();
				}
			}).play();
			window.clearTimeout(longPressTimer);

			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}

			note.trace('Dragmove');

			var dragNode = nodeOptions.id;
			// Update the position of any connected edges and hulls
			var pointHulls = this.attrs.contexts;
			for (var i = 0; i < pointHulls.length; i++) {
				var newHull = new ConvexHullGrahamScan();

				for (var j = 0; j < nodeLayer.children.length; j++) {
					var thisChildHulls = nodeLayer.children[j].attrs.contexts;
					if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
						var coords = nodeLayer.children[j].getPosition();
						newHull.addPoint(coords.x, coords.y);
					}
				}

				hullShapes[pointHulls[i]].setPoints(toPointFromObject(newHull.getHull()));
				hullLayer.batchDraw();

			}

			$.each(edgeLayer.children, function(index, value) {

				// value.setPoints([dragNode.getX(), dragNode.getY() ]);
				if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
					var points = [sociogram.getNodeByID(value.attrs.from).getX(), sociogram.getNodeByID(value.attrs.from).getY(), sociogram.getNodeByID(value.attrs.to).getX(), sociogram.getNodeByID(value.attrs.to).getY()];
					value.attrs.points = points;

				}
			});
			edgeLayer.batchDraw();
		});

		nodeGroup.on('touchstart mousedown', function() {

			var currentNode = this;

			window.wedge.setAbsolutePosition(this.getAbsolutePosition());

			window.wedge.anim = new Konva.Animation(function(frame) {
				var duration = 750;
				if (frame.time >= duration) { // point of selection
					window.wedge.setAngle(360);
					currentNode.fire('longPress');
				} else {
					window.wedge.opacity(frame.time*(1/duration));
					window.wedge.setStrokeWidth(1+(frame.time*(20/duration)));
					window.wedge.setAngle(frame.time*(360/duration));
				}

			}, wedgeLayer);

			longPressTimer = setTimeout(function() {
				touchNotTap = true;
				window.wedge.anim.start();
			}, 500);

		});

		nodeGroup.on('longPress', function() {
			sociogram.showDetailsPanel();
			sociogram.selectedNode = this;
			var currentNode = this;
			$('.hull').removeClass('active'); // deselect all groups

			// Update side panel
			$('.context-header h4').html('Details for '+currentNode.attrs.label);
			$.each(currentNode.attrs.contexts, function(index, value) {
				$('[data-hull="'+value+'"]').addClass('active');
			});
			window.wedge.anim.stop();
			window.clearTimeout(longPressTimer);
		});

		nodeGroup.on('touchend mouseup', function() {

			window.wedge.anim.stop();
			var tween = new Konva.Tween({
				node: window.wedge,
				opacity: 0,
				duration: 0.3,
				onFinish: function(){
					tween.destroy();
				}
			}).play();
			window.clearTimeout(longPressTimer);
		});

		nodeGroup.on('dbltap dblclick', function() {

		});

		nodeGroup.on('tap click', function() {
			/**
			* Tap (or click when using a mouse) events on a node trigger one of two actions:
			*
			* (1) If a hull is currently selected, tapping a node will add it to the selected hull. Any other events
			* (for example edge creation) will be ignored.
			*
			* (2) If edge creation mode is enabled and there are no selected hulls, tapping a node will mark it as being selected for potential linking.
			* If the node is the first to be selected, nothing more will happen. If it is the second, an edge will be
			* created according to the edge destination settings.
			*/

			var currentNode = this; // Store the context
			var eventProperties;

			if (!touchNotTap) { /** check we aren't in the middle of a touch */

			window.wedge.anim.stop(); // Cancel any existing touch hold animations

			if (settings.prompts[currentPrompt].clickAction === 'edge') {
				if (taskComprehended === false) {
					eventProperties = {
						stage: window.netCanvas.Modules.session.currentStage(),
						timestamp: new Date()
					};
					log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
					window.dispatchEvent(log);
					taskComprehended = true;
				}
				log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeClick', 'eventObject':currentNode.attrs.id}});
				window.dispatchEvent(log);

				/** Test if edge creation mode is enabled */
				if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showEdges === 'object') {

					// Ignore two clicks on the same node
					if (selectedNodes[0] === currentNode) {
						selectedNodes[0].children[0].opacity(0);
						selectedNodes = [];
						nodeLayer.draw();
						return false;
					}

					// Push the clicked node into the selected nodes array;
					selectedNodes.push(currentNode);

					// Check the length of the selected nodes array.
					if(selectedNodes.length === 2) {
						//If it containes two nodes, create an edge

						//Reset the styling
						selectedNodes[1].children[0].opacity(0);
						selectedNodes[0].children[0].opacity(0);

						// Create an edge object

						var edgeProperties = {};
						edgeProperties = {
							from: selectedNodes[0].attrs.id,
							to: selectedNodes[1].attrs.id,
						};

						// Add the custom variables
						$.each(settings.prompts[currentPrompt].showEdges.criteria, function(index, value) {
							edgeProperties[value.label] = value.value;
						});

						// Try adding the edge. If it returns fals, it already exists, so remove it.
						if (settings.network.addEdge(edgeProperties) === false) {
							note.debug('Sociogram removing edge.',2);
							settings.network.removeEdge(settings.network.getEdges(edgeProperties));
						} else {
							note.debug('Sociogram added edge.',2);
						}

						// Empty the selected nodes array and draw the layer.
						selectedNodes = [];

					} else { // First node selected. Simply turn the node stroke to the selected style so we can see that it has been selected.
						currentNode.children[0].opacity(1);
					}
				}
				currentNode.moveToTop();
				nodeLayer.draw();
			} else if (settings.prompts[currentPrompt].clickAction === 'selected') {

				selectedNodes = [];
				// var kineticNodes = sociogram.getKineticNodes();
				// $.each(kineticNodes, function(index, value) {
				// 	value.children[0].opacity(0);
				// });
				window.clearTimeout(tapTimer);

				if (taskComprehended === false) {
					eventProperties = {
						stage: window.netCanvas.Modules.session.currentStage(),
						timestamp: new Date()
					};
					log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
					window.dispatchEvent(log);
					taskComprehended = true;
				}
				log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeClick', 'eventObject':this.attrs.id}});
				window.dispatchEvent(log);



				// if select mode enabled
				if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showSelected === 'object') {

					// flip variable

					// Get current variable value
					var properties = {};
					var currentValue = settings.network.getNode(currentNode.attrs.id)[settings.prompts[currentPrompt].showSelected.variable];
					// flip
					if (currentValue != settings.prompts[currentPrompt].showSelected.value || typeof currentValue === 'undefined') {
						properties[settings.prompts[currentPrompt].showSelected.variable] = settings.prompts[currentPrompt].showSelected.value;
						currentNode.children[1].stroke(colors.selected);
					} else {
						// remove static variables, if present
						var node = netCanvas.Modules.session.getPrimaryNetwork().getNode(currentNode.attrs.id);
						node[settings.prompts[currentPrompt].showSelected.variable] = 0;
						currentNode.children[1].stroke(settings.options.defaultNodeColor);
					}

					settings.network.updateNode(currentNode.attrs.id, properties);

				}
				this.moveToTop();
				nodeLayer.draw();

			}
		} else {
			touchNotTap = false;
		}

	});

	nodeGroup.on('dragend', function() {

		var dragNode = nodeOptions.id;
		// Update the position of any connected edges and hulls
		var pointHulls = this.attrs.contexts;
		for (var i = 0; i < pointHulls.length; i++) {
			var newHull = new ConvexHullGrahamScan();

			for (var j = 0; j < nodeLayer.children.length; j++) {
				var thisChildHulls = nodeLayer.children[j].attrs.contexts;
				if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
					var coords = nodeLayer.children[j].getPosition();
					newHull.addPoint(coords.x, coords.y);
				}
			}

			hullShapes[pointHulls[i]].setPoints(toPointFromObject(newHull.getHull()));
			hullLayer.draw();

		}

		$.each(edgeLayer.children, function(index, value) {

			// value.setPoints([dragNode.getX(), dragNode.getY() ]);
			if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
				var points = [sociogram.getNodeByID(value.attrs.from).getX(), sociogram.getNodeByID(value.attrs.from).getY(), sociogram.getNodeByID(value.attrs.to).getX(), sociogram.getNodeByID(value.attrs.to).getY()];
				value.attrs.points = points;

			}
		});
		edgeLayer.draw();

		note.debug('Drag ended at x: '+this.attrs.x+' y: '+this.attrs.y);

		// set the context
		var from = {};
		var to = {};

		// Fetch old position from properties populated by dragstart event.
		from.x = this.attrs.oldx;
		from.y = this.attrs.oldy;

		to.x = this.attrs.x;
		to.y = this.attrs.y;

		this.attrs.coords = [this.attrs.x,this.attrs.y];

		// Add them to an event object for the logger.
		var eventObject = {
			from: from,
			to: to,
		};

		// Log the movement and save the graph state.
		log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeMove', 'eventObject':eventObject}});
		window.dispatchEvent(log);

		// store properties according to data destination
		// Find the node we need to store the coordinates on, and update it.

		// Create a dummy object so we can use the variable name set in settings.dataDestination
		var properties = {};
		properties.coords = this.attrs.coords;

		// Update the node with the object
		settings.network.updateNode(this.attrs.id, properties, function() {
			window.tools.notify('Network node updated', 1);
		});
		// remove the attributes, just incase.
		delete this.attrs.oldx;
		delete this.attrs.oldy;

	});

	return nodeGroup;
};

// Edge manipulation functions

sociogram.addEdge = function(properties, options) {
	note.info('sogioram.addEdge()');

	// This doesn't *usually* get called directly. Rather, it responds to an event fired by the network module.

	var egoID = settings.network.getEgo().id;

	if(typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== egoID) {
		// We have been called by an event
		properties = properties.detail;
	} else if (typeof properties.from !== 'undefined' && typeof properties.to !== 'undefined' && properties.from !== egoID) {
		// We have been called by another sociogram method
		properties = properties;
	} else {
		return false;
	}

	// the below won't work because we are storing the coords in an edge now...
	note.debug('Sociogram is adding an edge.');
	var toObject = sociogram.getNodeByID(properties.to);
	var fromObject = sociogram.getNodeByID(properties.from);
	var points = [fromObject.attrs.coords[0], fromObject.attrs.coords[1], toObject.attrs.coords[0], toObject.attrs.coords[1]];

	var edgeOptions = {
		// dashArray: [10, 10, 00, 10],
		strokeWidth: 6,
		transformsEnabled: 'position',
		hitGraphEnabled: false,
		opacity:1,
		// fill: '#ff0000',
		// closed: false,
		// width:100,
		stroke: settings.options.defaultEdgeColor,
		// opacity: 0.8,
		points: points,
		shadowColor: 'black',
		shadowBlur: 0.3,
		shadowOffset: {x : 0, y : 0},
		shadowOpacity: 1
	}

	// Handle options parameter to allow overriding default values
	if (options) {
		$.extend(edgeOptions, options);
	}

	var edge = new Konva.Line(edgeOptions);

	edge.setAttrs({
		from: properties.from,
		to: properties.to
	});

	edgeLayer.add(edge);

	setTimeout(function() {
		edgeLayer.draw();
	},0);
	nodeLayer.draw();
	note.trace('Created Edge between '+fromObject.attrs.label+' and '+toObject.attrs.label);

	return true;

};

sociogram.removeEdge = function(properties) {

	note.debug('sociogram.removeEdge() called.');
	if (!properties) {
		note.error('No properties passed to sociogram.removeEdge()!');
	}

	// Test if we are being called by an event, or directly
	if (typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== settings.network.getEgo().id) {
		properties = properties.detail;
	}

	var toObject = properties.to;
	var fromObject = properties.from;

	// This function is failing because two nodes are matching below
	var found = false;
	$.each(sociogram.getKineticEdges(), function(index, value) {
		if (value !== undefined) {
			if (value.attrs.from === fromObject && value.attrs.to === toObject || value.attrs.from === toObject && value.attrs.to === fromObject ) {
				found = true;
				edgeLayer.children[index].remove();
				edgeLayer.draw();
			}
		}

	});

	if (!found) {
		note.error('sociogram.removeEdge() failed! Couldn\'t find the specified edge.');
	} else {
		return true;
	}

};

sociogram.removeNode = function() {
};

// Misc functions

sociogram.clearGraph = function() {
	edgeLayer.removeChildren();
	edgeLayer.clear();
	nodeLayer.removeChildren();
	nodeLayer.clear();

};

sociogram.getStage = function() {
	return stage;
};

// Main initialisation functions

sociogram.initKinetic = function () {
	// Initialise KineticJS stage
	stage = new Konva.Stage({
		container: settings.targetEl,
		width: window.innerWidth,
		height: window.innerHeight
	});

	circleLayer = new Konva.Layer();
	hullLayer = new Konva.FastLayer();
	wedgeLayer = new Konva.FastLayer();
	nodeLayer = new Konva.Layer();
	edgeLayer = new Konva.FastLayer();

	/**
	* This hack allows us to detect clicks that happen outside of nodes, hulls, or edges.
	* We create a transparent rectangle on a special background layer which sits between the UI layer and the interaction layers.
	* We then listen to click events on this shape.
	*/
	var backgroundLayer = new Konva.Layer();
	var backgroundRect = new Konva.Rect({
		x: 0,
		y: 0,
		width: stage.width(),
		height: stage.height(),
		fill: 'transparent',
	});
	backgroundLayer.add(backgroundRect);
	backgroundRect.on('tap click', function() {
		note.debug('sociogram: backgroundRect tap');
		sociogram.hideDetailsPanel();
		sociogram.selectedNode = null;
		$('.hull').removeClass('active'); // deselect all groups

		//deselect Nodes
		selectedNodes = [];
		$.each(sociogram.getKineticNodes(), function(nodesIndex, nodesValue) {
			nodesValue.children[0].opacity(0);
		});

		nodeLayer.draw();

	});

	stage.add(circleLayer);
	stage.add(backgroundLayer);
	stage.add(hullLayer);
	stage.add(edgeLayer);
	stage.add(wedgeLayer);
	stage.add(nodeLayer);

	note.debug('Konva stage initialised.');

};

sociogram.showDetailsPanel = function() {
	$('.details-panel').addClass('show');
};

sociogram.hideDetailsPanel = function() {
	$('.details-panel').removeClass('show');
};

sociogram.generateHull = function(points) {

	var newHull = new ConvexHullGrahamScan();

	for (var i = 0; i < points.length; i++) {
		var coords = points[i].getPosition();
		newHull.addPoint(coords.x, coords.y);
	}

	return toPointFromObject(newHull.getHull());


};

sociogram.showNewNodeForm = function() {

	window.forms.nameGenForm.removeTemporaryFields();

	var properties = {};

	for (var i =0; i <= currentPrompt; i++) {
		// check if current previous prompt has a select element
		if (typeof settings.prompts === 'object' && typeof settings.prompts[i] !== 'undefined' && typeof settings.prompts[i].showSelected === 'object') {
			// add fields from dataTarget
			properties = {};

			properties[settings.prompts[i].showSelected.group] = {
				'type': 'button-checkbox',
				'inline': true,
				'title':settings.prompts[i].showSelected.group,
				'variables':[
					{label:settings.prompts[i].showSelected.shortLabel, id:settings.prompts[i].showSelected.variable},
				]
			};

			window.forms.nameGenForm.addTemporaryFields(properties);

			// Add data from fields
			properties = {};
			properties[settings.prompts[currentPrompt].showSelected.variable] = 1;

			window.forms.nameGenForm.addData(properties);
		}
	}

	window.forms.nameGenForm.show();

};

sociogram.getModuleEvents = function() {
	return moduleEvents;
};

sociogram.drawUIComponents = function (callback) {

	// Load the image
	var imageObj = new Image();
	imageObj.src = 'img/drag-text.png';
	imageObj.onload = function() {

		// New node button
		$('#'+settings.targetEl).append('<div class="new-node-button text-center"><span class="fa fa-2x fa-plus"></span></div>');

		// Draw all UI components
		var previousSkew = 0;
		var circleFills, circleLines;
		var currentColor = settings.options.concentricCircleColor;
		var totalHeight = window.innerHeight-(settings.options.defaultNodeSize); // Our sociogram area is the window height minus twice the node radius (for spacing)
		var currentOpacity = 0.1;

		//draw concentric circles
		for(var i = 0; i < settings.options.concentricCircleNumber; i++) {
			var ratio = (1-(i/settings.options.concentricCircleNumber));
			var skew = i > 0 ? (ratio * 5) * (totalHeight/50) : 0;
			var currentRadius = totalHeight/2 * ratio;
			currentRadius = settings.options.concentricCircleSkew? currentRadius + skew + previousSkew : currentRadius;
			if (i === settings.options.concentricCircleNumber-1 && settings.options.concentricCircleColor > 1) {
				currentRadius += 50;
			}
			previousSkew = skew;
			circleLines = new Konva.Circle({
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				radius: currentRadius,
				hitGraphEnabled: false,
				stroke: 'white',
				strokeWidth: 1.5,
				opacity: 0
			});

			circleFills = new Konva.Circle({
				x: window.innerWidth / 2,
				y: (window.innerHeight / 2),
				radius: currentRadius,
				fill: currentColor,
				hitGraphEnabled: false,
				opacity: currentOpacity,
				strokeWidth: 0,
			});

			// currentColor = tinycolor.darken(currentColor, amount = 15).toHexString();
			currentOpacity = currentOpacity+((0.3-currentOpacity)/settings.options.concentricCircleNumber);
			circleLayer.add(circleFills);
			circleLayer.add(circleLines);

		}

		// Node container
		var newNodeCircle = new Konva.Circle({
			radius: 60,
			transformsEnabled: 'none',
			hitGraphEnabled: false,
			stroke: 'white',
			strokeWidth: 7
		});

		var newNodeText = new Konva.Image({
			x: -20,
			y: -180,
			image: imageObj,
			width: 200,
			height: 105
		});

		// add the shape to the layer

		var newNodeCircleGroup = new Konva.Group({
			x: 145,
			opacity:0,
			y: window.innerHeight / 2,
		});

		newNodeCircleGroup.add(newNodeText);
		newNodeCircleGroup.add(newNodeCircle);
		circleLayer.add(newNodeCircleGroup);

		newNodeCircleTween = new Konva.Tween({
			node: newNodeCircleGroup,
			opacity: 1,
			duration: 1
		});


		// Draw 'me'
		if (settings.options.showMe === true) {

			var meCircle = new Konva.Circle({
				radius: 50,
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				hitGraphEnabled: false,
				fill: '#D0D2DC',
			});

			var meText = new Konva.Text({
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				text: 'me',
				align: 'center',
				offset: {x:28,y:22},
				fontSize: 40,
				fontFamily: 'Helvetica',
				fill: 'black'
			});
			circleLayer.add(meCircle);
			circleLayer.add(meText);
		}

		// draw wedgex

		Konva.selectWedge = function(config) {
			this._initselectWedge(config);
		};

		Konva.selectWedge.prototype = {
			_initselectWedge: function(config) {
				Konva.Circle.call(this, config);
			},
			_sceneFunc: function(context) {
				context.beginPath();
				context.arc(0, 0, this.getRadius(), 0, Konva.getAngle(this.getAngle()), this.getClockwise());
				context.fillStrokeShape(this);
			}
		};

		Konva.Util.extend(Konva.selectWedge, Konva.Wedge);

		window.wedge = new Konva.selectWedge({
			radius: settings.options.defaultNodeSize+5,
			angle: 0,
			fill: 'transparent',
			stroke: colors.selected,
			rotation:-90,
			opacity:0,
			strokeWidth: 10,
		});

		wedgeLayer.add(window.wedge);
		window.wedge.moveToBottom();

		circleLayer.draw();

		note.debug('User interface initialised.');

		if (callback) {
			callback();
		}
	};
};

// Get & set functions

sociogram.getKineticNodes = function() {
	return nodeLayer.children;
};

sociogram.getKineticEdges = function() {
	return edgeLayer.children;
};

sociogram.getSimpleNodes = function() {
	// We need to create a simple representation of the nodes for storing.
	var simpleNodes = {};
	var nodes = sociogram.getKineticNodes();
	$.each(nodes, function (index, value) {
		simpleNodes[value.attrs.id] = {};
		simpleNodes[value.attrs.id].x = value.attrs.x;
		simpleNodes[value.attrs.id].y = value.attrs.y;
		simpleNodes[value.attrs.id].name = value.attrs.name;
		simpleNodes[value.attrs.id].type = value.attrs.type;
		simpleNodes[value.attrs.id].size = value.attrs.size;
		simpleNodes[value.attrs.id].color = value.attrs.color;
	});
	return simpleNodes;
};

sociogram.getSimpleEdges = function() {
	var simpleEdges = {},
	edgeCounter = 0;

	$.each(edgeLayer.children, function(index, value) {
		simpleEdges[edgeCounter] = {};
		simpleEdges[edgeCounter].from = value.attrs.from.attrs.id;
		simpleEdges[edgeCounter].to = value.attrs.to.attrs.id;
		edgeCounter++;
	});

	return simpleEdges;
};

sociogram.getSimpleEdge = function(id) {
	var simpleEdges = sociogram.getSimpleEdges();
	if (!id) { return false; }

	var simpleEdge = simpleEdges[id];
	return simpleEdge;
};

sociogram.getEdgeLayer = function() {
	return edgeLayer;
};

sociogram.getNodeLayer = function() {
	return nodeLayer;
};

sociogram.getUILayer = function() {
	return uiLayer;
};

sociogram.getHullLayer = function() {
	return hullLayer;
};

sociogram.getNodeByID = function(id) {
	var node = {},
	nodes = sociogram.getKineticNodes();

	$.each(nodes, function(index, value) {
		if (value.attrs.id === id) {
			node = value;
		}
	});

	return node;
};

sociogram.getNodeColorByType = function(type) {
	var returnVal = null;
	$.each(settings.nodeTypes, function(index, value) {
		if (value.name === type) {returnVal = value.color;}
	});

	if (returnVal) {
		return returnVal;
	} else {
		return false;
	}
};

return sociogram;

};

},{}],18:[function(require,module,exports){
/* global Konva, window, $, note, Swiper */
/* exported Sociogram */
/*jshint bitwise: false*/

module.exports = function SociogramMissing() {
	'use strict';
	// Global variables
	var stage = {}, circleLayer = {}, edgeLayer = {}, nodeLayer = {}, uiLayer = {}, sociogramMissing = {};
	var moduleEvents = [], selectedNodes = [];
	var selectedNode = null;
	var newNodeCircleTween, promptSwiper, log, tapTimer;
	var nodesWithoutPositions = 0, currentPrompt = 0;
	var taskComprehended  = false;
	var missingMap = {};
	var variableOrder = [
		'support_emotional',
		'support_practical',
		'support_failed',
		'advice_given',
		'advice_sought',
		'advice_refused',
		'advice_negative',
		'info_given',
		'info_refused',
		'technologically_mediated'
	];

	// Colours
	var colors = {
		blue: '#0174DF',
		tomato: '#FF6347',
		teal: '#008080',
		hullpurple: '#9a208e',
		freesia: '#ffd600',
		hullgreen: '#6ac14c',
		cayenne: '#c40000',
		placidblue: '#83b5dd',
		violettulip: '#9B90C8',
		hemlock: '#9eccb3',
		paloma: '#aab1b0',
		sand: '#ceb48d',
		dazzlingblue: '#006bb6',
		edge: '#dd393a',
		selected: '#ffbf00',
	};

	// Default settings
	var settings = {
		network: window.netCanvas.Modules.session.getPrimaryNetwork(),
		options: {
			defaultNodeSize: 33,
			defaultNodeColor: 'white',
			defaultNodeStrokeWidth: 4,
			defaultLabelColor: 'black',
			defaultEdgeColor: colors.edge,
			concentricCircleColor: '#ffffff',
			concentricCircleNumber: 1,
			concentricCircleSkew: false,
			showMe: false
		}
	};

	// Private functions

	// Adjusts the size of text so that it will always fit inside a given shape.
	function padText(text, container, amount){
		while ((text.width() * 1.1)<container.width()-(amount*2)) {
			text.fontSize(text.fontSize() * 1.1);
			text.y((container.height() - text.height())/2);
		}
		text.setX( container.getX() - text.getWidth()/2 );
		text.setY( (container.getY() - text.getHeight()/1.8) );
	}

	sociogramMissing.changeData = function() {
		sociogramMissing.resetNodeState();
		sociogramMissing.updateNodeState();
	};

	sociogramMissing.generateMissingMap = function() {



		var nodes = netCanvas.Modules.session.getPrimaryNetwork().getNodes({}, function (results) {
            var filteredResults = [];
            $.each(results, function(index,value) {
                if (value.type !== 'Ego') {
                    filteredResults.push(value);
                }
            });

            return filteredResults;
        });

		// missing map = {
		// 	advice_given: [21,5,4]
		// }

		$.each(variableOrder, function(index, value) {
			missingMap[value] = [];
			// console.log(missingMap);
		});

		$.each(nodes, function(nodeIndex, nodeValue) {
			var nodeNg = nodeValue.namegenerator;
			var ngIndex = variableOrder.indexOf(nodeNg);
			missingMap[nodeNg] = missingMap.nodeNg || [];

			Object.keys(missingMap).forEach(function(missingKey) {
				if (variableOrder.indexOf(missingKey) < ngIndex) {
					missingMap[missingKey] = missingMap[missingKey] || [];
					missingMap[missingKey].push(nodeValue.id);
				}
			});

		});

		return missingMap;

	};

	sociogramMissing.init = function (userSettings) {

		note.info('SociogramMissing initialising.');

		$.extend(true, settings,userSettings);
		// Add the title and heading
		$('<div class="sociogram-title"></div>').insertBefore('#'+settings.targetEl );

		$('.sociogram-title').append('<div class="swiper-container"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>');
		var missingMap = sociogramMissing.generateMissingMap();
        for (var i = 0; i < settings.prompts.length; i++) {
			if (missingMap[settings.prompts[i].variable].length > 0) {
				$('.swiper-wrapper').append('<div class="swiper-slide"><h5>'+settings.prompts[i].prompt+'</h5></div>');
			} else {
				note.info('Skipping prompt '+i+' because no missing nodes.');
			}

        }

        promptSwiper = new Swiper ('.swiper-container', {
            pagination: '.swiper-pagination',
			paginationClickable: true,
            speed: 1000
        });

        // Update current prompt counter
        promptSwiper.on('slideChangeEnd', function () {
            currentPrompt = promptSwiper.activeIndex;
            sociogramMissing.changeData();
        });

		// Initialise the konva stage
		sociogramMissing.initKinetic();

		// Draw ui compoennts
		sociogramMissing.drawUIComponents(function() {

			sociogramMissing.addNodeData();

			// Add the evevent listeners
			sociogramMissing.bindEvents();

			// Update initial states of all nodes and edges;
			sociogramMissing.updateNodeState();

		});
	};

	sociogramMissing.bindEvents = function() {
		// Events
		var event = [
			{
				event: 'changeStageStart',
				handler: sociogramMissing.destroy,
				targetEl:  window
			},
			{
				event: 'edgeAdded',
				handler: sociogramMissing.updateNodeState,
				targetEl:  window
			},
			{
				event: 'nodeRemoved',
				handler: sociogramMissing.removeNode,
				targetEl:  window
			},
			{
				event: 'edgeRemoved',
				handler: sociogramMissing.removeEdge,
				targetEl:  window
			}
		];
		window.tools.Events.register(moduleEvents, event);

	};

	sociogramMissing.addNodeData = function() {
		note.info('sociogramMissing.addNodeData()');
		note.debug('sociogramMissing.addNodeData() Getting criteriaNodes...');
		var criteriaNodes = settings.network.getNodes({}, function (results) {
			var filteredResults = [];
			$.each(results, function(index,value) {
				if (value.type !== 'Ego') {
					filteredResults.push(value);
				}
			});

			return filteredResults;
		});

		note.debug('sociogramMissing.addNodeData() adding criteriaNodes...');
		for (var j = 0; j < criteriaNodes.length; j++) {
			sociogramMissing.addNode(criteriaNodes[j]);
		}

		// Layout Mode
		var layoutNodes = sociogramMissing.getKineticNodes();
		$.each(layoutNodes, function(index,node) {
			node.setPosition(node.attrs.coords);
		});

	};

	sociogramMissing.resetNodeState = function() {

		// Reset nodes
		var kineticNodes = sociogramMissing.getKineticNodes();
		$.each(kineticNodes, function(nodeIndex, nodeValue) {
			nodeValue.children[1].stroke(settings.options.defaultNodeColor);
			nodeValue.children[1].opacity(1);
			nodeValue.children[2].opacity(1);
		});

		nodeLayer.batchDraw();

		// Reset edges
		edgeLayer.removeChildren();
		edgeLayer.batchDraw();

	};

	sociogramMissing.nodeAlreadyAsked = function(id) {
		// console.log('nodeAlreadyAsked '+id);
		var node = netCanvas.Modules.session.getPrimaryNetwork().getNode(id);
		// console.log(node.label);
		var nodeNg = node.namegenerator;
		// console.log(nodeNg);
		// console.log(settings.prompts[currentPrompt].variable);
		// console.log(variableOrder.indexOf(nodeNg));
		// console.log(variableOrder.indexOf(settings.prompts[currentPrompt].variable));
		if (variableOrder.indexOf(nodeNg) < variableOrder.indexOf(settings.prompts[currentPrompt].variable)) {
			// console.log('returning true.');
			// console.log('-----');
			return true;
		} else {
			// console.log('returning false');
			// console.log('-----');
			return false;
		}

	};

	sociogramMissing.updateNodeState = function() {
		/**
		* Updates visible attributes based on current prompt
		*/

		var selectNodes = window.netCanvas.Modules.session.getPrimaryNetwork().getNodes({}, function (results) {
            var filteredResults = [];
            $.each(results, function(index,value) {
                if (value.type !== 'Ego') {
                    filteredResults.push(value);
                }
            });

            return filteredResults;
        });

		$.each(selectNodes, function(index, node) {
			var currentValue = node[settings.prompts[currentPrompt].variable];
			var currentNode = sociogramMissing.getNodeByID(node.id);
			if (currentValue) {
				// this node is selected
				currentNode.children[1].stroke(colors.selected);
			}

			if (sociogramMissing.nodeAlreadyAsked(node.id)) {
				currentNode.children[1].opacity(0);
				currentNode.children[2].opacity(0);
			}
		});

		nodeLayer.draw();


	};

	sociogramMissing.getSelectedNodes = function() {
		return selectedNodes;
	};

	sociogramMissing.destroy = function() {
		note.debug('Destroying sociogramMissing.');
		stage.destroy();
		window.tools.Events.unbind(moduleEvents);
	};

	sociogramMissing.addNode = function(options) {

		note.info('Sociogram is creating a node.');
		note.debug(options);
		// Placeholder for getting the number of nodes we have.
		var nodeShape;

		var nodeID = 0;
		while (settings.network.getNode(nodeID) !== false) {
			nodeID++;
		}

		var dragStatus = false;

		// Try to guess at a label if one isn't provided.
		// Is there a better way of doing this?
		if (typeof options.label === 'undefined' && typeof options.nname_t0 !== 'undefined') { // for RADAR use nickname
			options.label = options.nname_t0;
		} else if (typeof options.label === 'undefined' && typeof options.name !== 'undefined'){
			options.label = options.name;
		}

		var nodeOptions = {
			id: nodeID,
			coords: [],
			positioned: false,
			label: 'Undefined',
			type: 'Person',
			transformsEnabled: 'position',
			size: settings.options.defaultNodeSize,
			color: settings.options.defaultNodeColor,
			strokeWidth: settings.options.defaultNodeStrokeWidth,
			stroke: settings.options.defaultNodeColor,
			draggable: dragStatus,
			dragDistance: 20
		};

		nodeOptions.contexts = [];
		window.tools.extend(nodeOptions, options);

		nodeOptions.id = parseInt(nodeOptions.id, 10);
		nodeOptions.x = nodeOptions.coords[0] ? nodeOptions.coords[0] : false;
		nodeOptions.y = nodeOptions.coords[1] ? nodeOptions.coords[1] : false;

		var nodeGroup = new Konva.Group(nodeOptions);

		var selectCircle = new Konva.Circle({
			radius: nodeOptions.size+(nodeOptions.strokeWidth*2.3),
			fill:settings.options.defaultEdgeColor,
			transformsEnabled: 'position',
			opacity:0
		});

		nodeShape = new Konva.Circle({
			radius: nodeOptions.size,
			fill:nodeOptions.color,
			transformsEnabled: 'position',
			strokeWidth: nodeOptions.strokeWidth,
			stroke: nodeOptions.stroke
		});

		var nodeLabel = new Konva.Text({
			text: nodeOptions.label,
			// fontSize: 20,
			fontFamily: 'Lato',
			transformsEnabled: 'position',
			fill: settings.options.defaultLabelColor,
			align: 'center',
			// offsetX: (nodeOptions.size*-1)-10, //left right
			// offsetY:(nodeOptions.size*1)-10, //up down
			fontStyle:500
		});

		note.debug('Putting node '+nodeOptions.label+' at coordinates x:'+nodeOptions.coords[0]+', y:'+nodeOptions.coords[1]);

		padText(nodeLabel,nodeShape,10);

		nodeGroup.add(selectCircle);
		nodeGroup.add(nodeShape);
		nodeGroup.add(nodeLabel);

		nodeLayer.add(nodeGroup);

		setTimeout(function() {
			nodeLayer.draw();
		}, 0);

		if (!options.coords || nodeOptions.coords.length === 0) {
			nodesWithoutPositions++;

			nodeGroup.position({
				x: 0,
				y:$(window).height()/2
			});
			new Konva.Tween({
				node: nodeGroup,
				x: 145,
				y: $(window).height()/2,
				duration:0.7,
				easing: Konva.Easings.EaseOut
			}).play();
			// settings.network.setProperties(settings.network.getNode(nodeOptions.id),{coords:[$(window).width()-150, $(window).height()-150]});
		} else {

		}

		nodeGroup.on('tap click', function() {

			selectedNodes = [];
			// var kineticNodes = sociogramMissing.getKineticNodes();
			// $.each(kineticNodes, function(index, value) {
			// 	value.children[0].opacity(0);
			// });
			window.clearTimeout(tapTimer);

			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}
			log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeClick', 'eventObject':this.attrs.id}});
			window.dispatchEvent(log);

			var currentNode = this;
			// flip variable

			// Get current variable value
			var properties = {};
			var currentValue = settings.network.getNode(currentNode.attrs.id)[settings.prompts[currentPrompt].variable];
			// flip
			if (!currentValue || typeof currentValue === 'undefined') {
				properties[settings.prompts[currentPrompt].variable] = 'true';
				currentNode.children[1].stroke(colors.selected);
			} else {
				// remove static variables, if present
				var node = netCanvas.Modules.session.getPrimaryNetwork().getNode(currentNode.attrs.id);
				node[settings.prompts[currentPrompt].variable] = 0;
				currentNode.children[1].stroke(settings.options.defaultNodeColor);
			}

			settings.network.updateNode(currentNode.attrs.id, properties);

			this.moveToTop();
			nodeLayer.draw();
		});

		return nodeGroup;
	};

	// Edge manipulation functions

	sociogramMissing.addEdge = function(properties) {

		// This doesn't *usually* get called directly. Rather, it responds to an event fired by the network module.

		if(typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== settings.network.getEgo().id) {
			// We have been called by an event
			properties = properties.detail;
		} else if (typeof properties.from !== 'undefined' && typeof properties.to !== 'undefined' && properties.from !== settings.network.getEgo().id) {
			// We have been called by another sociogram method
			properties = properties;
		} else {
			return false;
		}

		// the below won't work because we are storing the coords in an edge now...
		note.debug('Sociogram is adding an edge.');
		var toObject = sociogramMissing.getNodeByID(properties.to);
	 	var fromObject = sociogramMissing.getNodeByID(properties.from);
		var points = [fromObject.attrs.coords[0], fromObject.attrs.coords[1], toObject.attrs.coords[0], toObject.attrs.coords[1]];

		var edge = new Konva.Line({
			// dashArray: [10, 10, 00, 10],
			strokeWidth: 4,
			transformsEnabled: 'position',
			hitGraphEnabled: false,
			opacity:1,
			stroke: settings.options.defaultEdgeColor,
			// opacity: 0.8,
			points: points
		});

		edge.setAttrs({
			from: properties.from,
			to: properties.to
		});

		edgeLayer.add(edge);

		setTimeout(function() {
			edgeLayer.draw();
		},0);
		nodeLayer.draw();
		note.debug('Created Edge between '+fromObject.attrs.label+' and '+toObject.attrs.label);

		return true;

	};

	sociogramMissing.removeEdge = function(properties) {

		note.debug('sociogramMissing.removeEdge() called.');
		if (!properties) {
			note.error('No properties passed to sociogramMissing.removeEdge()!');
		}

		// Test if we are being called by an event, or directly
		if (typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== settings.network.getEgo().id) {
			properties = properties.detail;
		}

		var toObject = properties.to;
	 	var fromObject = properties.from;

		// This function is failing because two nodes are matching below
		var found = false;
		$.each(sociogramMissing.getKineticEdges(), function(index, value) {
			if (value !== undefined) {
				if (value.attrs.from === fromObject && value.attrs.to === toObject || value.attrs.from === toObject && value.attrs.to === fromObject ) {
					found = true;
					edgeLayer.children[index].remove();
					edgeLayer.draw();
				}
			}

		});

		if (!found) {
			note.error('sociogramMissing.removeEdge() failed! Couldn\'t find the specified edge.');
		} else {
			return true;
		}

	};

	sociogramMissing.removeNode = function() {
	};

	// Misc functions

	sociogramMissing.clearGraph = function() {
		edgeLayer.removeChildren();
		edgeLayer.clear();
		nodeLayer.removeChildren();
		nodeLayer.clear();

	};

	sociogramMissing.getStage = function() {
		return stage;
	};

	// Main initialisation functions

	sociogramMissing.initKinetic = function () {
		// Initialise KineticJS stage
		stage = new Konva.Stage({
			container: settings.targetEl,
			width: window.innerWidth,
			height: window.innerHeight
		});

		circleLayer = new Konva.Layer();
		nodeLayer = new Konva.Layer();
		edgeLayer = new Konva.FastLayer();

		/**
		* This hack allows us to detect clicks that happen outside of nodes, hulls, or edges.
		* We create a transparent rectangle on a special background layer which sits between the UI layer and the interaction layers.
		* We then listen to click events on this shape.
 		*/
		stage.add(circleLayer);
		stage.add(edgeLayer);
		stage.add(nodeLayer);

		note.debug('Konva stage initialised.');

	};

	sociogramMissing.drawUIComponents = function (callback) {

		// Draw all UI components
		var previousSkew = 0;
		var circleFills, circleLines;
		var currentColor = settings.options.concentricCircleColor;
		var totalHeight = window.innerHeight-(settings.options.defaultNodeSize); // Our sociogram area is the window height minus twice the node radius (for spacing)
		var currentOpacity = 0.1;

		//draw concentric circles
		for(var i = 0; i < settings.options.concentricCircleNumber; i++) {
			var ratio = (1-(i/settings.options.concentricCircleNumber));
			var skew = i > 0 ? (ratio * 5) * (totalHeight/50) : 0;
			var currentRadius = totalHeight/2 * ratio;
			currentRadius = settings.options.concentricCircleSkew? currentRadius + skew + previousSkew : currentRadius;
			if (i === settings.options.concentricCircleNumber-1 && settings.options.concentricCircleColor > 1) {
				currentRadius += 50;
			}
			previousSkew = skew;
			circleLines = new Konva.Circle({
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				radius: currentRadius,
				hitGraphEnabled: false,
				stroke: 'white',
				strokeWidth: 1.5,
				opacity: 0
			});

			circleFills = new Konva.Circle({
				x: window.innerWidth / 2,
				y: (window.innerHeight / 2),
				radius: currentRadius,
				fill: currentColor,
				hitGraphEnabled: false,
				opacity: currentOpacity,
				strokeWidth: 0,
			});

			// currentColor = tinycolor.darken(currentColor, amount = 15).toHexString();
			currentOpacity = currentOpacity+((0.3-currentOpacity)/settings.options.concentricCircleNumber);
			circleLayer.add(circleFills);
			circleLayer.add(circleLines);

		}

		// Node container
		var newNodeCircle = new Konva.Circle({
			radius: 60,
			transformsEnabled: 'none',
			hitGraphEnabled: false,
			stroke: 'white',
			strokeWidth: 7
		});

		// add the shape to the layer

		var newNodeCircleGroup = new Konva.Group({
		 x: 145,
		 opacity:0,
		 y: window.innerHeight / 2,
		});

		newNodeCircleGroup.add(newNodeCircle);
		circleLayer.add(newNodeCircleGroup);

		newNodeCircleTween = new Konva.Tween({
		 node: newNodeCircleGroup,
		 opacity: 1,
		 duration: 1
		});

		// Draw 'me'
		if (settings.options.showMe === true) {

			var meCircle = new Konva.Circle({
				radius: 50,
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				hitGraphEnabled: false,
				fill: '#D0D2DC',
			});

			var meText = new Konva.Text({
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				text: 'me',
				align: 'center',
				offset: {x:28,y:22},
				fontSize: 40,
				fontFamily: 'Helvetica',
				fill: 'black'
			 });
			circleLayer.add(meCircle);
			circleLayer.add(meText);
		}

		circleLayer.draw();

		note.debug('User interface initialised.');

		if (callback) {
			callback();
		}
	};

	// Get & set functions

	sociogramMissing.getKineticNodes = function() {
		return nodeLayer.children;
	};

	sociogramMissing.getKineticEdges = function() {
		return edgeLayer.children;
	};

	sociogramMissing.getSimpleNodes = function() {
		// We need to create a simple representation of the nodes for storing.
		var simpleNodes = {};
		var nodes = sociogramMissing.getKineticNodes();
		$.each(nodes, function (index, value) {
			simpleNodes[value.attrs.id] = {};
			simpleNodes[value.attrs.id].x = value.attrs.x;
			simpleNodes[value.attrs.id].y = value.attrs.y;
			simpleNodes[value.attrs.id].name = value.attrs.name;
			simpleNodes[value.attrs.id].type = value.attrs.type;
			simpleNodes[value.attrs.id].size = value.attrs.size;
			simpleNodes[value.attrs.id].color = value.attrs.color;
		});
		return simpleNodes;
	};

	sociogramMissing.getSimpleEdges = function() {
		var simpleEdges = {},
		edgeCounter = 0;

		$.each(edgeLayer.children, function(index, value) {
			simpleEdges[edgeCounter] = {};
			simpleEdges[edgeCounter].from = value.attrs.from.attrs.id;
			simpleEdges[edgeCounter].to = value.attrs.to.attrs.id;
			edgeCounter++;
		});

		return simpleEdges;
	};

	sociogramMissing.getSimpleEdge = function(id) {
		var simpleEdges = sociogramMissing.getSimpleEdges();
		if (!id) { return false; }

		var simpleEdge = simpleEdges[id];
		return simpleEdge;
	};

	sociogramMissing.getEdgeLayer = function() {
		return edgeLayer;
	};

	sociogramMissing.getNodeLayer = function() {
		return nodeLayer;
	};

	sociogramMissing.getUILayer = function() {
		return uiLayer;
	};

	sociogramMissing.getNodeByID = function(id) {
		var node = {},
		nodes = sociogramMissing.getKineticNodes();

		$.each(nodes, function(index, value) {
			if (value.attrs.id === id) {
				node = value;
			}
		});

		return node;
	};

	sociogramMissing.getNodeColorByType = function(type) {
		var returnVal = null;
		$.each(settings.nodeTypes, function(index, value) {
			if (value.name === type) {returnVal = value.color;}
		});

		if (returnVal) {
			return returnVal;
		} else {
			return false;
		}
	};

	return sociogramMissing;

};

},{}],19:[function(require,module,exports){
/* global Konva, window, $, note, ConvexHullGrahamScan, Image */
/* exported Sociogram */
/*jshint bitwise: false*/

module.exports = function sociogramNarrative() {
	'use strict';
	// Global variables
	var stage = {}, circleLayer = {}, backgroundLayer = {}, edgeLayer = {}, nodeLayer = {}, wedgeLayer = {}, hullLayer = {}, hullShapes = {}, uiLayer = {}, sociogramNarrative = {};
	var moduleEvents = [], selectedNodes = [], hulls = [], animations = [];
	sociogramNarrative.selectedNode = null;
	var viewingOptions = false;
	var newNodeCircleTween, log, backgroundRect;
	var nodesWithoutPositions = 0, currentPrompt = 0;
	var newNodeCircleVisible = false, hullsShown = false, taskComprehended = false;

	// Colours
	var colors = {
		blue: '#0174DF',
		tomato: '#FF6347',
		teal: '#008080',
		hullpurple: '#9a208e',
		freesia: '#ffd600',
		hullgreen: '#6ac14c',
		cayenne: '#c40000',
		placidblue: '#83b5dd',
		violettulip: '#9B90C8',
		hemlock: '#9eccb3',
		paloma: '#aab1b0',
		sand: '#ceb48d',
		dazzlingblue: '#006bb6',
		edge: '#dd393a',
		selected: '#ffbf00',
	};

	var hullColors = ['#01a6c7','#1ECD97', '#B16EFF','#FA920D','#e85657','Gold','Pink','Saddlebrown','Teal','Silver'];

	// Default settings
	var settings = {
		network: window.netCanvas.Modules.session.getPrimaryNetwork(),
		targetEl: 'kineticCanvas',
		// consecutive single tap - edge mode
		// drag - layout mode
		// double tap - select mode
		// long press - community mode
		modes:['Position'], //edge - create edges, position - lay out, select - node attributes
	    panels: ['details'], // Mode - switch between modes, Details - long press shows node details
		options: {
			defaultNodeSize: 33,
			defaultNodeColor: 'white',
			defaultNodeStrokeWidth: 4,
			defaultLabelColor: 'black',
			defaultEdgeColor: colors.edge,
			concentricCircleColor: '#ffffff',
			concentricCircleNumber: 4,
			concentricCircleSkew: false,
			showMe: false
		},
		dataOrigin: {
			'Position': {
				type: 'node',
				variable: 'coords'
			},
			'Community' : {
				type: 'ego',
				name: 'Groups',
				egoVariable: 'contexts',
				variable: 'contexts'
			}
		},
		prompts: [],
	    criteria: { // criteria for being shown on this screen
	        includeEgo: false,
	        query: {
	        }
	    },
		edges: [
			{
				types:['social'],
				keyLabel: 'Spend time together',
				stroke: '#01a6c7'
			}
		]
	};

	// Private functions

	// Adjusts the size of text so that it will always fit inside a given shape.
	function padText(text, container, amount){
		while (( text.getTextWidth() * 1.001 ) < container.width() - ( amount * 2 ) && ( text.getTextHeight() * 1.001 ) < container.height() - ( amount * 2 )) {
			text.fontSize( text.fontSize() * 1.001 );
		}

		text.y( ( (text.getTextHeight() /2) ) * -1);
		text.x( ( (text.getTextWidth() / 2) *- 1 ) );
	}

	function toPointFromObject(array) {
		var newArray = [];
		for (var i = 0; i<array.length; i++) {
			newArray.push(array[i].x);
			newArray.push(array[i].y);
		}

		return newArray;
	}

	function addNodeHandler(e) {
		sociogramNarrative.addNode(e.detail);
	}

	sociogramNarrative.changeData = function() {
		sociogramNarrative.resetNodeState();
		sociogramNarrative.updateState();
	};

	sociogramNarrative.init = function (userSettings) {

		note.info('Sociogram initialising.');

		$.extend(true, settings,userSettings);
		// Add the title and heading
		$('<div class="sociogram-title"></div>').insertBefore('#'+settings.targetEl );

		// Initialise the konva stage
		sociogramNarrative.initKinetic();

		// Draw ui compoennts
		sociogramNarrative.drawUIComponents(function() {

			// Show hulls checkbox
			if (settings.modes.indexOf('Community') !== -1) {
				$('#'+settings.targetEl).append('<input class="show-contexts-checkbox" type="checkbox" name="context-checkbox-show" id="context-checkbox-show"> <label for="context-checkbox-show">Contexts shown</label>');
			}

			// Set node states
			sociogramNarrative.addNodeData();

			// Add the evevent listeners
			sociogramNarrative.bindEvents();

			// Update initial states of all nodes and edges;
			sociogramNarrative.updateState();

			// Update key
			sociogramNarrative.updateKeyPanel();

		});
	};

	function toggleChevron(e) {
		$(e.target)
			.prev('.panel-heading')
			.find('i.indicator')
			.toggleClass('glyphicon-chevron-down glyphicon-chevron-up');
	}

	function toggleKeyOptions() {
		$('.key-panel-initial').toggleClass('show');

		if (viewingOptions) {
			sociogramNarrative.updateKeyPanel();
			viewingOptions = false;
		} else {
			viewingOptions = true;
			// Generate options
			sociogramNarrative.updateOptionsPanel();
		}
	}

	function presetSelectHandler() {
		var name = this.value;

		// event
		var log = new window.CustomEvent('log', {'detail':{'eventType': 'changePreset', 'eventObject':this.Value}});
		window.dispatchEvent(log);
		var unsavedChanges = new window.Event('unsavedChanges')
		window.dispatchEvent(unsavedChanges);

		$.each(settings.presets, function(presetIndex, presetValue) {
			if (presetValue.name === name) {
				settings.edges = presetValue.edges;
				settings.selected = presetValue.selected;
				settings.size = presetValue.size;
			}
		});

		sociogramNarrative.updateState();
		sociogramNarrative.updateKeyPanel();
	}

	sociogramNarrative.bindEvents = function() {
		// Events
		var event = [
			{
				event: 'changeStageStart',
				handler: sociogramNarrative.destroy,
				targetEl:  window
			},
			{
				event: 'nodeAdded',
				handler: addNodeHandler,
				targetEl:  window
			},
			{
				event: 'edgeAdded',
				handler: sociogramNarrative.updateState,
				targetEl:  window
			},
			{
				event: 'nodeRemoved',
				handler: sociogramNarrative.removeNode,
				targetEl:  window
			},
			{
				event: 'edgeRemoved',
				handler: sociogramNarrative.removeEdge,
				targetEl:  window
			},
			{
				event: 'change',
				handler: sociogramNarrative.toggleHulls,
				subTarget: '#context-checkbox-show',
				targetEl:  window.document
			},
			{
				event: 'click',
				handler: toggleKeyOptions,
				targetEl: window.document,
				subTarget: '.btn.change'
			},
			{
				event: 'change',
				targetEl: window.document,
				subTarget: '#key-panel-preset-select',
				handler: presetSelectHandler
			},
			{
				event: 'click',
				targetEl: '.reset-state-button',
				handler: sociogramNarrative.resetButton
			}
		];
		window.tools.Events.register(moduleEvents, event);

		$('#accordion1').on('hidden.bs.collapse', toggleChevron);
		$('#accordion1').on('shown.bs.collapse', toggleChevron);
		$('#accordion2').on('hidden.bs.collapse', toggleChevron);
		$('#accordion2').on('shown.bs.collapse', toggleChevron);

	};

	sociogramNarrative.destroy = function() {
		$.each(animations, function(index, value) {
			value.stop();
		});
		note.info('sociogramNarrative.destroy();');
		stage.destroy();
		window.tools.Events.unbind(moduleEvents);

		$('#accordion1').off('hidden.bs.collapse', toggleChevron);
		$('#accordion1').off('shown.bs.collapse', toggleChevron);
		$('#accordion2').off('hidden.bs.collapse', toggleChevron);
		$('#accordion2').off('shown.bs.collapse', toggleChevron);
	};

	sociogramNarrative.addNodeData = function() {
		note.debug('sociogramNarrative.addNodeData()');
		var criteriaNodes;

		// get nodes according to criteria query
		// filter out ego if required
		if (settings.criteria.includeEgo !== true) {
			criteriaNodes = settings.network.getNodes(settings.criteria.query, function (results) {
				var filteredResults = [];
				$.each(results, function(index,value) {
					if (value.type !== 'Ego') {
						filteredResults.push(value);
					}
				});

				return filteredResults;
			});
		} else {
			criteriaNodes = settings.network.getNodes(settings.criteria.query);
		}

		for (var j = 0; j < criteriaNodes.length; j++) {
			note.debug('sociogramNarrative.addNodeData() adding '+j);
			sociogramNarrative.addNode(criteriaNodes[j]);
		}

		// Layout Mode
		var layoutNodes = sociogramNarrative.getKineticNodes();
		$.each(layoutNodes, function(index,node) {
			node.setPosition(node.attrs.coords);
		});

		// Community
		var communityNodes;

		// community data is coming from ego
		if (typeof netCanvas.Modules.session.getPrimaryNetwork().getEgo().contexts === 'undefined') {
			console.warn('Ego didn\'t have the community variable you specified, so it was created as a blank array.');
			var communityProperties = {};
			communityProperties.contexts= [];
			netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getEgo().id, communityProperties);
		}

		var egoHulls = netCanvas.Modules.session.getPrimaryNetwork().getEgo().contexts;
		$.each(egoHulls, function(hullIndex, hullValue) {
			sociogramNarrative.addHull(hullValue);
		});

		communityNodes = sociogramNarrative.getKineticNodes();
		$.each(communityNodes, function(index,node) {
			$.each(node.attrs.contexts, function (hullIndex, hullValue) {
				// Difference from node mode is we check if the node hull has been defined by ego too
				// if (egoHulls.indexOf(hullValue) !== -1) {
					sociogramNarrative.addPointToHull(node, hullValue);
				// }

			});
		});

	};

	sociogramNarrative.toggleHulls = function(e) {
		note.info('Sociogram: toggleHulls()');

		if ((e && e.target.checked) || hullsShown === false) {
			$('label[for="context-checkbox-show"]').html('Contexts shown');
			new Konva.Tween({
				node: hullLayer,
				duration: 0.5,
				opacity: 1
			}).play();
			hullsShown = true;
		} else {
			$('label[for="context-checkbox-show"]').html('Contexts hidden');

			new Konva.Tween({
				node: hullLayer,
				duration: 0.5,
				opacity: 0
			}).play();

			hullsShown = false;
		}

		// event
		var log = new window.CustomEvent('log', {'detail':{'eventType': 'toggleHulls', 'eventObject':{hullsShow: hullsShown}}});
		window.dispatchEvent(log);
		var unsavedChanges = new window.Event('unsavedChanges')
		window.dispatchEvent(unsavedChanges);

		$('label[for="context-checkbox-show"]').addClass('show');
		setTimeout(function() {
			$('label[for="context-checkbox-show"]').removeClass('show');
		}, 2000);
		hullLayer.draw();
	};

	sociogramNarrative.resetNodeState = function() {
		// event
		var log = new window.CustomEvent('log', {'detail':{'eventType': 'resetNodes', 'eventObject':{}}});
		window.dispatchEvent(log);
		var unsavedChanges = new window.Event('unsavedChanges')
		window.dispatchEvent(unsavedChanges);

		// Reset select
		var kineticNodes = sociogramNarrative.getKineticNodes();
		$.each(kineticNodes, function(nodeIndex, nodeValue) {
			nodeValue.children[1].stroke(settings.options.defaultNodeColor);
			// Reset sizes
			nodeValue.children[1].setAttr('radius', settings.options.defaultNodeSize);
			nodeValue.children[1].fill('white');
			nodeValue.children[2].fill('black');
		});

		nodeLayer.batchDraw();

		// Reset edges
		edgeLayer.removeChildren();
		edgeLayer.batchDraw();
	};

	sociogramNarrative.drawUIComponents = function (callback) {

		// Load the image
		var imageObj = new Image();
		imageObj.src = 'img/drag-text.png';
		imageObj.onload = function() {

			// New node button
			$('#'+settings.targetEl).append('<div class="reset-state-button text-center"><span class="fa fa-2x fa-refresh"></span></div>');

			// Key panel
			$('#'+settings.targetEl).append('<div class="key-panel on"></div>');

			$('.key-panel').append(`
			<div class="key-panel-initial" id="accordion1" role="tablist" aria-multiselectable="true">
					<div class="defaultOnly">
						<select class="selectpicker" title="Preset..." id="key-panel-preset-select" data-width="100%"></select>
					</div>
					<div class="">
						<div class="panel-heading" role="tab" id="headingTwo">
							<h5>
								<a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion1" href="#collapseTwo" aria-expanded="true" aria-controls="collapseTwo">
								Highlighted
								<i class="indicator glyphicon glyphicon-chevron-down pull-right"></i></a>
							</h5>
						</div>
						<div id="collapseTwo" class="nodes-panel panel-collapse collapse in" role="tabpanel" aria-labelledby="headingTwo">

						</div>
					</div>
					<div class="">
						<div class="panel-heading" role="tab" id="headingOne">
							<h5>
								<a role="button" data-toggle="collapse" data-parent="#accordion1" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
								Links
								<i class="indicator glyphicon glyphicon-chevron-down pull-right"></i></a>
							</h5>
						</div>
						<div id="collapseOne" class="links-panel panel-collapse collapse in" role="tabpanel" aria-labelledby="headingOne">

						</div>
					</div>
					<div class="defaultOnly">
						<div class="panel-heading" role="tab" id="headingThree">
							<h5>
								<a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion1" href="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
								Contexts
								<i class="indicator glyphicon glyphicon-chevron-up pull-right"></i></a>
							</h5>
						</div>
						<div id="collapseThree" class="contexts-panel panel-collapse collapse" role="tabpanel" aria-labelledby="headingThree">
						</div>
					</div>
					<div class="settingsOnly">
						<div class="panel-heading" role="tab" id="options-headingThree">
							<h5>
								<a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion2" href="#options-collapseThree" aria-expanded="false" aria-controls="options-collapseThree">
								Size
								<i class="indicator glyphicon glyphicon-chevron-up pull-right"></i></a>
							</h5>
						</div>
						<div id="options-collapseThree" class="size-panel panel-collapse collapse" role="tabpanel" aria-labelledby="options-headingThree">
						</div>
					</div>
					<div class="row">
						<div class="col-md-12">
							<button class="btn btn-primary btn-sm pull-right change">Change <span class="fa fa-arrow-right"></span></button>
						</div>
					</div>
			</div>
			`);


			// Handle preset select
			$.each(settings.presets, function(presetIndex, presetValue) {
				$('#key-panel-preset-select').append('<option value="'+presetValue.name+'">'+presetValue.name+'</option>');
			});

			$('select').selectpicker();

			// Draw all UI components
			var previousSkew = 0;
			var circleFills, circleLines;
			var currentColor = settings.options.concentricCircleColor;
			var totalHeight = window.innerHeight-(settings.options.defaultNodeSize); // Our sociogram area is the window height minus twice the node radius (for spacing)
			var currentOpacity = 0.1;

			//draw concentric circles
			for(var i = 0; i < settings.options.concentricCircleNumber; i++) {
				var ratio = (1-(i/settings.options.concentricCircleNumber));
				var skew = i > 0 ? (ratio * 5) * (totalHeight/50) : 0;
				var currentRadius = totalHeight/2 * ratio;
				currentRadius = settings.options.concentricCircleSkew? currentRadius + skew + previousSkew : currentRadius;
				if (i === settings.options.concentricCircleNumber-1 && settings.options.concentricCircleColor > 1) {
					currentRadius += 50;
				}
				previousSkew = skew;
				circleLines = new Konva.Circle({
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
					radius: currentRadius,
					hitGraphEnabled: false,
					stroke: 'white',
					strokeWidth: 1.5,
					opacity: 0
				});

				circleFills = new Konva.Circle({
					x: window.innerWidth / 2,
					y: (window.innerHeight / 2),
					radius: currentRadius,
					fill: currentColor,
					hitGraphEnabled: false,
					opacity: currentOpacity,
					strokeWidth: 0,
				});

				// currentColor = tinycolor.darken(currentColor, amount = 15).toHexString();
				currentOpacity = currentOpacity+((0.3-currentOpacity)/settings.options.concentricCircleNumber);
				circleLayer.add(circleFills);
				circleLayer.add(circleLines);

			}

			// Node container
			var newNodeCircle = new Konva.Circle({
				radius: 60,
				transformsEnabled: 'none',
				hitGraphEnabled: false,
				stroke: 'white',
				strokeWidth: 7
			});

			var newNodeText = new Konva.Image({
			 x: -20,
			 y: -180,
			 image: imageObj,
			 width: 200,
			 height: 105
			});

			// add the shape to the layer

			var newNodeCircleGroup = new Konva.Group({
			 x: 145,
			 opacity:0,
			 y: window.innerHeight / 2,
			});

			newNodeCircleGroup.add(newNodeText);
			newNodeCircleGroup.add(newNodeCircle);
			circleLayer.add(newNodeCircleGroup);

			newNodeCircleTween = new Konva.Tween({
			 node: newNodeCircleGroup,
			 opacity: 1,
			 duration: 1
			});

			// Draw 'me'
			if (settings.options.showMe === true) {

				var meCircle = new Konva.Circle({
					radius: 50,
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
					hitGraphEnabled: false,
					fill: '#D0D2DC',
				});

				var meText = new Konva.Text({
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
					text: 'me',
					align: 'center',
					offset: {x:28,y:22},
					fontSize: 40,
					fontFamily: 'Helvetica',
					fill: 'black'
				 });
				circleLayer.add(meCircle);
				circleLayer.add(meText);
			}

			circleLayer.draw();

			note.debug('User interface initialised.');

			if (callback) {
				callback();
			}
		};
	};

	sociogramNarrative.updateOptionsPanel = function() {
		var markup = '';
		var panel;

		// Links panel
		panel = $('.links-panel');
		panel.children().remove();

		// create array of all types of edge;
		var types = {
			'negative': {
				label: 'Have had conflict'
			},
			'social': {
				label: 'Spend time together'
			},
			'professional': {
				label: 'Have worked together'
			}
		};
		$.each(types, function(typeIndex, typeValue) {
			markup = `<div>
				<input type="checkbox" name="${typeIndex}" id="${typeIndex}" value="${typeIndex}">
			      <label class="checkbox" for="${typeIndex}">
			        ${typeValue.label}
			      </label>
			  </div>`;
			panel.append(markup);
		});

		// Node panel
		panel = $('.nodes-panel');
		panel.children().remove();
		var nodeVariables = {
			'advice_given': {
				label: 'Gave you advice'
			},
			'advice_sought': {
				label: 'Sought their advice'
			},
			'advice_refused': {
				label: 'Refused to give advice'
			},
			'advice_negative': {
				label: 'Gave you bad advice'
			},
			'support_emotional': {
				label: 'Supported you emotionally'
			},
			'support_practical': {
				label: 'Supported you practically'
			},
			'support_failed': {
				label: 'Failed to support you'
			},
			'info_given': {
				label: 'Gave you information'
			},
			'info_refused': {
				label: 'Refused you information'
			},
			'technologically_mediated': {
				label: 'Know through the internet'
			}
		};
		$.each(nodeVariables, function(typeIndex, typeValue) {
			markup = `<div>
				<input type="checkbox" name="${typeIndex}" id="${typeIndex}" value="${typeIndex}">
				<label class="checkbox" for="${typeIndex}">
				  ${typeValue.label}
				</label>
			</div>`;
			panel.append(markup);
		});

		// Size panel
		panel = $('.size-panel');
		panel.children().remove();
		var sizeVariables = {
			'ord_helpfulness': {
				label: 'Helpfulness'
			},
			'ord_stress': {
				label: 'Cause stress or anxiety'
			},
			'ord_disempowering': {
				label: 'Is controlling'
			},
			'ord_negative': {
				label: 'Have negative interactions with'
			}
		};
		$.each(sizeVariables, function(sizeIndex, sizeValue) {
			markup = `<div>
				<input type="checkbox" name="${sizeIndex}" id="${sizeIndex}" value="${sizeIndex}">
				<label class="checkbox" for="${sizeIndex}">
				  ${sizeValue.label}
				</label>
			</div>`;
			panel.append(markup);
		});

	};

	sociogramNarrative.updateKeyPanel = function() {
		var markup = '';
		var panel;

		// Links panel
		panel = $('.links-panel');
		panel.children().remove();
		if (typeof settings.edges !== 'undefined' && typeof settings.edges === 'object') {
			$.each(settings.edges, function(edgeIndex, edgeValue) {
				markup = `<div class="key-panel-row row">
					<div class="col-md-3 key-panel-icon edge-key-icon">
						<svg class="panel-icon edge-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
							<g>
								<line style="stroke:${edgeValue.stroke};fill:none;stroke-width:25;stroke-miterlimit:10;" x1="48.25" y1="252.815" x2="255.998" y2="48.25"/>
								<line style="stroke:${edgeValue.stroke};fill:none;stroke-width:25;stroke-miterlimit:10;" x1="48.25" y1="48.25" x2="255.998" y2="48.25"/>
								<circle style="fill:#F1F2F2;" cx="48.25" cy="251.75" r="47.25"/>
								<circle style="fill:#F1F2F2;" cx="251.75" cy="48.25" r="47.25"/>
								<circle style="fill:#F1F2F2;" cx="48.25" cy="48.25" r="47.25"/>
							</g>
						</svg>
					</div>
					<div class="col-md-9 key-panel-text edge-key-text">
						<span class="edge-key-label">${edgeValue.keyLabel}</span>
					</div>
				</div>`;

				panel.append(markup);
			});

		}


		// Node panel
		panel = $('.nodes-panel');
		panel.children().remove();
		if (typeof settings.selected !== 'undefined' && typeof settings.selected === 'object') {
			$.each(settings.selected, function(selectedIndex, selectedValue) {
				markup = `<div class="key-panel-row row">
						<div class="col-md-3 key-panel-icon node-key-icon">
							<svg class="panel-icon node-icon" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
								 viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
							<circle style="stroke:${selectedValue.color};fill:#FFFFFF;stroke-width:40;stroke-miterlimit:10;" cx="150" cy="150" r="108.333"/>
							</svg>
						</div>
						<div class="col-md-9 key-panel-text node-key-text">
							<span class="node-key-label">${selectedValue.label}</span>
						</div>
					</div>`;

				panel.append(markup);
			});

		}

	};

	sociogramNarrative.updateState = function() {
		/**
		* Updates visible attributes based on current prompt task
		*/

		sociogramNarrative.resetNodeState();
		var nodes = settings.network.getNodes();
		var edges = settings.network.getEdges();

		// Edges
		if (typeof settings.edges !== 'undefined' && typeof settings.edges === 'object') {

			// Iterate over settings.edge
			$.each(settings.edges, function(index, value) {
				// Now iterate over all edges
				$.each(edges, function(index, edge) {
					// For each edge, check if it is of the type indicated in settings.edges
					if (value.types.indexOf(edge.type) !== -1) {
						var options = {
							stroke: value.stroke
						};
						sociogramNarrative.addEdge(edge, options);
					}

				});
			});

		}

		edgeLayer.draw();

		// Selected nodes
		if (typeof settings.selected !== 'undefined' && typeof settings.selected === 'object') {
			// console.log('selectedmode');
			// Iterate over select settings
			$.each(settings.selected, function(index, value) {

				// Iterate over nodes
				$.each(nodes, function(index, node) {
					// If any of value.variables = 1, select node
					var found = false;
					$.each(value.variables, function(valueIndex, valueValue) {
						if (typeof node[valueValue] !== 'undefined' && (node[valueValue] === 'true' || node[valueValue] === 1 || node[valueValue] === '1') ) {
							// console.log('found');
							found = true;
						}
					});

					// this node is selected
					if (found) {
						var sociogramNode = sociogramNarrative.getNodeByID(node.id);
						sociogramNode.children[1].stroke(value.color);
						sociogramNode.children[1].fill(value.color);
						sociogramNode.children[2].fill('white');
					}

				});
			});

			nodeLayer.draw();
		}

		// // Node sizing
		// if (typeof settings.size !== 'undefined' && typeof settings.size === 'object') {
		// 	var high = 0;
		// 	var low = 0;
		// 	// Iterate over nodes
		// 	$.each(nodes, function(index, node) {
		// 		if (node.type !== 'Ego') {
		// 			var nodeTotal = 0;
		//
		// 			$.each(settings.size, function(sizeIndex, sizeValue) {
		// 				if (typeof node[sizeValue] !== 'undefined' && typeof node[sizeValue] === 'number') {
		// 					console.log('updating nodeTotal with '+node[sizeValue]);
		// 					nodeTotal += node[sizeValue];
		// 				}
		// 			});
		//
		// 			if (typeof nodeTotal !== 'number') {
		// 				nodeTotal = 0;
		// 			}
		//
		// 			nodeTotal = nodeTotal > 0 ? nodeTotal : 0;
		//
		// 			high = nodeTotal > high ? nodeTotal : high;
		// 			low = nodeTotal < low ? nodeTotal : low;
		//
		//
		//
		// 			// set size of the node as proporton of range
		// 			var sociogramNode = sociogramNarrative.getNodeByID(node.id);
		//
		// 			// make low 0.85 of default
		// 			// make high 1.5 of default
		// 			// console.log('nodeTotal '+nodeTotal);
		// 			var range = high;
		// 			// console.log('range '+range);
		// 			var nodeProportion = (nodeTotal/range);
		// 			nodeProportion = nodeProportion || 0;
		// 			// console.log('node proportion '+nodeProportion);
		// 			var nodeRatio = 0.80 + (nodeProportion * 0.50);
		// 			// console.log('noderatio '+nodeRatio);
		// 			var ratio = nodeRatio * settings.options.defaultNodeSize;
		// 			// console.log(ratio);
		// 			sociogramNode.children[1].setAttr('radius', ratio);
		// 		}
		// 	});
		//
		// 	nodeLayer.draw();
		// }

	};

	sociogramNarrative.getSelectedNodes = function() {
		return selectedNodes;
	};

	sociogramNarrative.resetButton = function() {
		$.each(animations, function(index, value) {
			value.stop();
		});

		var kineticNodes = sociogramNarrative.getKineticNodes();

		$.each(kineticNodes, function(index, value) {
			value.children[1].setAttr('shadowColor', 'black');
			value.children[1].setAttr('shadowBlur', 2);
		});

		// console.log(annotations);
		$.each(annotations, function(index, value) {
			value.tween.finish();
			value.tween.destroy();
		});

		backgroundLayer.draw();
	};

	sociogramNarrative.addHull = function(label) {
		note.info('sociogramNarrative.addHull ['+label+']');
		// ignore groups that already exist
		label = label ? label : 'New Context '+$('li[data-hull]').length;
		if (typeof hullShapes[label] === 'undefined') {
			var thisHull = {};
			thisHull.label = label;
	        thisHull.hull = new ConvexHullGrahamScan();

			var color = hullColors[hulls.length];

	        var hullShape = new Konva.Line({
	          points: [window.outerWidth/2, window.outerHeight/2],
	          fill: color,
	          opacity:0.5,
	          stroke: color,
	          lineJoin: 'round',
	          lineCap: 'round',
			  transformsEnabled: 'position',
			  hitGraphEnabled: false,
	          tension : 0.1,
	          strokeWidth: 80,
	          closed : true
	        });
			hullShapes[label] = hullShape;
			hulls.push(thisHull.label);
	        hullLayer.add(hullShapes[label]);
			hullLayer.opacity(0);
	        hullLayer.draw();

			// If the data origin is ego, also add the new hull to ego
			if (settings.dataOrigin.Community.type === 'ego') {
				// If ego doesn't have the variable set, create it

				var properties;
				if (typeof netCanvas.Modules.session.getPrimaryNetwork().getEgo()[settings.dataOrigin.Community.egoVariable] === 'undefined') {
					properties = {};
					properties[settings.dataOrigin.Community.egoVariable] = [];
					netCanvas.Modules.session.getPrimaryNetwork().updateNode(netCanvas.Modules.session.getPrimaryNetwork().getEgo().id, properties);
				}

				// get existing data
				var egoContexts = netCanvas.Modules.session.getPrimaryNetwork().getEgo()[settings.dataOrigin.Community.egoVariable];
				if (egoContexts.indexOf(thisHull.label) === -1) {
					// Update ego
					egoContexts.push(thisHull.label);
					window.netCanvas.Modules.session.saveData();
				}

			}

			// Contexts panel
			var panel = $('.contexts-panel');
			var markup = `<div class="key-panel-row row">
				<div class="col-md-3 key-panel-icon context-key-icon">
				<svg class="panel-icon context-icon camp" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
				<g>
						<path style="fill:${color}" d="M76.495,285.593c-63.25,0-89.125-44.817-57.5-99.593L92.5,58.686c31.625-54.776,83.375-54.776,115,0L281.005,186c31.625,54.776,5.75,99.593-57.5,99.593H76.495z"/>
						<circle style="fill:#FFFFFF;" cx="150" cy="83.675" r="44.761"/>
						<circle style="fill:#FFFFFF;" cx="69.357" cy="224.153" r="43.677"/>
						<circle style="fill:#FFFFFF;" cx="230.991" cy="224.153" r="43.677"/>
				</g>
				</svg>
				</div>
				<div class="col-md-9 key-panel-text context-key-text">
					<span class="context-key-label">${label}</span>
				</div>
			</div>`;

			panel.append(markup);

		}

    };

	sociogramNarrative.hullExists = function(hullLabel) {
		var found = false;
		if (hulls.indexOf(hullLabel) !== -1) {
			found = true;
		}
		return found;
	};

    sociogramNarrative.addPointToHull = function(point, hullLabel) {
		// check if hull is already present
		note.info('sociogramNarrative.addPointToHull()');
		var properties;
		// if a hull with hullLabel doesnt exist, create one
		if (!sociogramNarrative.hullExists(hullLabel)) {
			note.warn('sociogramNarrative.addPointToHull(): the hull label "'+hullLabel+'" didn\'t exist, so a new hull was created.');
			sociogramNarrative.addHull(hullLabel);
		}

		// If the point doesn't have the destination attribute, create it
		if (point.attrs.contexts === 'undefined') {
			note.warn('Node did not have the data destinateion community attribute. A blank array was created.');
			properties = {};
			properties.contexts = [];
			netCanvas.Modules.session.getPrimaryNetwork().updateNode(point.attrs.id, properties);
		}
		// Only store if the node doesn't already have the hull present
		if (point.attrs.contexts.indexOf(hullLabel) === -1) {
			// Find the node we need to store the hull value in, and update it.

			// Create a dummy object so we can use the variable name set in settings.dataDestination
			properties = {};
			properties.contexts = point.attrs.contexts.concat([hullLabel]);
			point.attrs.contexts = point.attrs.contexts.concat([hullLabel]);

			// Update the node with the object
			settings.network.updateNode(point.attrs.id, properties, function() {
				note.debug('Network node updated', 1);
			});
		}

        // redraw all hulls begins here
        var pointHulls = point.attrs.contexts;

		// For each hull of the current point
        for (var i = 0; i < pointHulls.length; i++) {

			// Create an empty hull
            var newHull = new ConvexHullGrahamScan();

			// For each node
            for (var j = 0; j < nodeLayer.children.length; j++) {
				var thisChildHulls = nodeLayer.children[j].attrs.contexts;

				// Test if the current points current hull is in the current node's hull list

				if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
					// It is, so get the position of this node.
                    var coords = nodeLayer.children[j].getPosition();

					// Add it to the new hull

                    newHull.addPoint(coords.x, coords.y);
                }
            }

			// At the end of this loop we should have a newHull with points for all nodes

			// We need this check because on load all hull shapes might not be defined yet.
			var hullPoints = newHull.getHull();
			if (hullPoints.length === 1 && typeof hullPoints[0] === 'undefined') {
				// console.log('catching');
				hullPoints = [];
			}
			// console.log(hullPoints);
			if (typeof hullShapes[pointHulls[i]] !== 'undefined') {
				var tween = new Konva.Tween({
					node: hullShapes[pointHulls[i]],
					points: toPointFromObject(hullPoints),
					duration: 0.5,
					onFinish: function(){
						tween.destroy();
					}
				}).play();

			}

			hullLayer.batchDraw();
            nodeLayer.draw();

        }

    };

	sociogramNarrative.redrawHulls = function() {
		for (var i = 0; i < hullShapes.length; i++) {
			var newHull = new ConvexHullGrahamScan();

			for (var j = 0; j < nodeLayer.children.length; j++) {
				var thisChildHulls = nodeLayer.children[j].attrs.contexts;
				if (thisChildHulls.indexOf(hullShapes[i]) !== -1) {
					var coords = nodeLayer.children[j].getPosition();
					newHull.addPoint(coords.x, coords.y);
				}
			}

			hullShapes[i].setPoints(toPointFromObject(newHull.getHull()));
			hullLayer.batchDraw();

		}

	};

	sociogramNarrative.getHullShapes = function() {
		return hullShapes;
	};

	sociogramNarrative.addNode = function(options) {

		note.info('Sociogram is creating a node.');
		note.debug(options);
		// Placeholder for getting the number of nodes we have.
		var nodeShape;

		var nodeID = 0;
		while (settings.network.getNode(nodeID) !== false) {
			nodeID++;
		}

		var dragStatus = false;
		if (settings.modes.indexOf('Position') !== -1 || settings.modes.indexOf('Edge') !== -1) {
			dragStatus = true;
		}

		// Try to guess at a label if one isn't provided.
		// Is there a better way of doing this?
		if (typeof options.label === 'undefined' && typeof options.nname_t0 !== 'undefined') { // for RADAR use nickname
			options.label = options.nname_t0;
		} else if (typeof options.label === 'undefined' && typeof options.name !== 'undefined'){
			options.label = options.name;
		}

		var nodeOptions = {
			id: nodeID,
			coords: [],
			positioned: false,
			label: 'Undefined',
			type: 'Person',
			transformsEnabled: 'position',
			size: settings.options.defaultNodeSize,
			color: settings.options.defaultNodeColor,
			strokeWidth: settings.options.defaultNodeStrokeWidth,
			stroke: settings.options.defaultNodeColor,
			draggable: dragStatus,
			dragDistance: 20
		};

		nodeOptions.contexts = [];
		window.tools.extend(nodeOptions, options);

		nodeOptions.id = parseInt(nodeOptions.id, 10);
		nodeOptions.x = nodeOptions.coords[0] ? nodeOptions.coords[0] : false;
		nodeOptions.y = nodeOptions.coords[1] ? nodeOptions.coords[1] : false;

		var nodeGroup = new Konva.Group(nodeOptions);

		var selectCircle = new Konva.Circle({
			radius: nodeOptions.size+(nodeOptions.strokeWidth*1.5),
			fill:settings.options.defaultEdgeColor,
			transformsEnabled: 'position',
			opacity:0
		});

		nodeShape = new Konva.Circle({
			radius: nodeOptions.size,
			fill:nodeOptions.color,
			transformsEnabled: 'position',
			strokeWidth: nodeOptions.strokeWidth,
			stroke: nodeOptions.stroke,
			shadowColor: 'black',
			shadowBlur: 2,
			shadowOffset: {x : 0, y : 0},
			shadowOpacity: 1
		});

		// var label = nodeOptions.label.wrap(8,3);
		var nodeLabel = new Konva.Text({
			text: nodeOptions.label,
			fontSize: 13,
			fontFamily: 'Lato',
			transformsEnabled: 'position',
			fill: settings.options.defaultLabelColor,
			align: 'center',
			fontStyle:500
		});

		padText(nodeLabel,nodeShape,8);

		note.debug('Putting node '+nodeOptions.label+' at coordinates x:'+nodeOptions.coords[0]+', y:'+nodeOptions.coords[1]);

		nodeGroup.add(selectCircle);
		nodeGroup.add(nodeShape);
		nodeGroup.add(nodeLabel);

		nodeLayer.add(nodeGroup);

		setTimeout(function() {
			nodeLayer.draw();
		}, 0);

		if (!options.coords || nodeOptions.coords.length === 0) {
			nodesWithoutPositions++;
			if (!newNodeCircleVisible) {
				newNodeCircleTween.play();
				newNodeCircleVisible = true;
			}
			nodeGroup.position({
				x: 0,
				y:$(window).height()/2
			});
			new Konva.Tween({
				node: nodeGroup,
				x: 145,
				y: $(window).height()/2,
				duration:0.7,
				easing: Konva.Easings.EaseOut
			}).play();
			// settings.network.setProperties(settings.network.getNode(nodeOptions.id),{coords:[$(window).width()-150, $(window).height()-150]});
		} else {

		}

		// Node event handlers
		nodeGroup.on('dragstart', function() {

			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}

			note.debug('dragstart');

			// Add the current position to the node attributes, so we know where it came from when we stop dragging.
			this.attrs.oldx = this.attrs.x;
			this.attrs.oldy = this.attrs.y;

			if (this.attrs.positioned === false ) {
				this.attrs.positioned = true;
				nodesWithoutPositions--;
				if (nodesWithoutPositions < 1) {
					newNodeCircleTween.reverse();
					newNodeCircleVisible = false;
				}
			}

			this.moveToTop();
			nodeLayer.draw();

			var dragNode = nodeOptions.id;

			// Update the position of any connected edges and hulls
			var pointHulls = this.attrs.contexts;
			for (var i = 0; i < pointHulls.length; i++) {
				var newHull = new ConvexHullGrahamScan();

				for (var j = 0; j < nodeLayer.children.length; j++) {
					var thisChildHulls = nodeLayer.children[j].attrs.contexts;
					if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
						var coords = nodeLayer.children[j].getPosition();
						newHull.addPoint(coords.x, coords.y);
					}
				}
				var hull = newHull.getHull();
				// console.log(hull);
				var pointFromObject = toPointFromObject(hull);
				// console.log(pointFromObject);
				hullShapes[pointHulls[i]].setPoints(pointFromObject);
				hullLayer.batchDraw();

			}

			$.each(edgeLayer.children, function(index, value) {

				// value.setPoints([dragNode.getX(), dragNode.getY() ]);
				if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
					var points = [sociogramNarrative.getNodeByID(value.attrs.from).getX(), sociogramNarrative.getNodeByID(value.attrs.from).getY(), sociogramNarrative.getNodeByID(value.attrs.to).getX(), sociogramNarrative.getNodeByID(value.attrs.to).getY()];
					value.attrs.points = points;
				}
			});

		});

		nodeGroup.on('dragmove', function() {

			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}

			note.debug('Dragmove');

			var dragNode = nodeOptions.id;
			// Update the position of any connected edges and hulls
			var pointHulls = this.attrs.contexts;
			for (var i = 0; i < pointHulls.length; i++) {
				var newHull = new ConvexHullGrahamScan();

				for (var j = 0; j < nodeLayer.children.length; j++) {
					var thisChildHulls = nodeLayer.children[j].attrs.contexts;
					if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
						var coords = nodeLayer.children[j].getPosition();
						newHull.addPoint(coords.x, coords.y);
					}
				}
				// console.log(newHull);
				var hull = newHull.getHull();
				// console.log(hull);
				var pointFromObject = toPointFromObject(hull);
				// console.log(pointFromObject);
				hullShapes[pointHulls[i]].setPoints(pointFromObject);
				hullLayer.batchDraw();

			}

			$.each(edgeLayer.children, function(index, value) {

				// value.setPoints([dragNode.getX(), dragNode.getY() ]);
				if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
					var points = [sociogramNarrative.getNodeByID(value.attrs.from).getX(), sociogramNarrative.getNodeByID(value.attrs.from).getY(), sociogramNarrative.getNodeByID(value.attrs.to).getX(), sociogramNarrative.getNodeByID(value.attrs.to).getY()];
					value.attrs.points = points;

				}
			});
			edgeLayer.batchDraw();
		});

		nodeGroup.on('touchstart mousedown', function() {
		});

		nodeGroup.on('longPress', function() {

		});

		nodeGroup.on('touchend mouseup', function() {

		});

		nodeGroup.on('dbltap dblclick', function() {

			selectedNodes = [];

			if (taskComprehended === false) {
				var eventProperties = {
					stage: window.netCanvas.Modules.session.currentStage(),
					timestamp: new Date()
				};
				log = new window.CustomEvent('log', {'detail':{'eventType': 'taskComprehended', 'eventObject':eventProperties}});
				window.dispatchEvent(log);
				taskComprehended = true;
			}
			log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeClick', 'eventObject':this.attrs.id}});
			window.dispatchEvent(log);

			var currentNode = this;

			// if select mode enabled
			if (typeof settings.prompts[currentPrompt] !== 'undefined' && typeof settings.prompts[currentPrompt].showSelected === 'object') {

				// flip variable

				// Get current variable value
				var properties = {};
				var currentValue = settings.network.getNode(currentNode.attrs.id)[settings.prompts[currentPrompt].showSelected.variable];
				// flip
				if (currentValue != settings.prompts[currentPrompt].showSelected.value || typeof currentValue === 'undefined') {
					properties[settings.prompts[currentPrompt].showSelected.variable] = settings.prompts[currentPrompt].showSelected.value;
					currentNode.children[1].stroke(colors.selected);
				} else {
					// remove static variables, if present
					var node = netCanvas.Modules.session.getPrimaryNetwork().getNode(currentNode.attrs.id);
					node[settings.prompts[currentPrompt].showSelected.variable] = 0;
					currentNode.children[1].stroke(settings.options.defaultNodeColor);
				}

				settings.network.updateNode(currentNode.attrs.id, properties);

			}
			this.moveToTop();
			nodeLayer.draw();
		});

		nodeGroup.on('tap click', function() {
			/**
			* Tap (or click when using a mouse) events on a node trigger one of two actions:
			*
			* (1) If a hull is currently selected, tapping a node will add it to the selected hull. Any other events
			* (for example edge creation) will be ignored.
			*
			* (2) If edge creation mode is enabled and there are no selected hulls, tapping a node will mark it as being selected for potential linking.
			* If the node is the first to be selected, nothing more will happen. If it is the second, an edge will be
			* created according to the edge destination settings.
			*/

			var currentNode = this; // Store the context

			// event
			var log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeTap', 'eventObject':currentNode}});
			window.dispatchEvent(log);
			var unsavedChanges = new window.Event('unsavedChanges');
			window.dispatchEvent(unsavedChanges);

			// var tween = new Konva.Tween({
			// 	node: currentNode
			// }).play();
			// console.log(currentNode);
			currentNode.children[1].shadowColor('#FA920D');
			var animation = new Konva.Animation(function(frame) {
				var blur = ((Math.sin(frame.time/200)+1)/2)*60;
				currentNode.children[1].setAttr('shadowBlur', blur);
				nodeLayer.batchDraw();
			});

			animations.push(animation);

			animation.start();
		});

		nodeGroup.on('dragend', function() {

			var dragNode = nodeOptions.id;
			// Update the position of any connected edges and hulls
			var pointHulls = this.attrs.contexts;
			for (var i = 0; i < pointHulls.length; i++) {
				var newHull = new ConvexHullGrahamScan();

				for (var j = 0; j < nodeLayer.children.length; j++) {
					var thisChildHulls = nodeLayer.children[j].attrs.contexts;
					if (thisChildHulls.indexOf(pointHulls[i]) !== -1) {
						var coords = nodeLayer.children[j].getPosition();
						newHull.addPoint(coords.x, coords.y);
					}
				}

				hullShapes[pointHulls[i]].setPoints(toPointFromObject(newHull.getHull()));
				hullLayer.draw();

			}

			$.each(edgeLayer.children, function(index, value) {

				// value.setPoints([dragNode.getX(), dragNode.getY() ]);
				if (value.attrs.from === dragNode || value.attrs.to === dragNode) {
					var points = [sociogramNarrative.getNodeByID(value.attrs.from).getX(), sociogramNarrative.getNodeByID(value.attrs.from).getY(), sociogramNarrative.getNodeByID(value.attrs.to).getX(), sociogramNarrative.getNodeByID(value.attrs.to).getY()];
					value.attrs.points = points;

				}
			});
			edgeLayer.draw();

			note.debug('Drag ended at x: '+this.attrs.x+' y: '+this.attrs.y);

			// set the context
			var from = {};
			var to = {};

			// Fetch old position from properties populated by dragstart event.
			from.x = this.attrs.oldx;
			from.y = this.attrs.oldy;

			to.x = this.attrs.x;
			to.y = this.attrs.y;

			this.attrs.coords = [this.attrs.x,this.attrs.y];

			// Add them to an event object for the logger.
			var eventObject = {
				from: from,
				to: to,
			};

			// Log the movement and save the graph state.
			log = new window.CustomEvent('log', {'detail':{'eventType': 'nodeMove', 'eventObject':eventObject}});
			window.dispatchEvent(log);

			// store properties according to data destination
			// Find the node we need to store the coordinates on, and update it.

			// Create a dummy object so we can use the variable name set in settings.dataDestination
			var properties = {};
			properties.coords = this.attrs.coords;

			// Update the node with the object
			settings.network.updateNode(this.attrs.id, properties);
			// remove the attributes, just incase.
			delete this.attrs.oldx;
			delete this.attrs.oldy;

		});

		return nodeGroup;
	};

	// Edge manipulation functions

	sociogramNarrative.addEdge = function(properties, options) {
		note.info('sogioram.addEdge()');

		// This doesn't *usually* get called directly. Rather, it responds to an event fired by the network module.

		var egoID = settings.network.getEgo().id;

		if(typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== egoID) {
			// We have been called by an event
			properties = properties.detail;
		} else if (typeof properties.from !== 'undefined' && typeof properties.to !== 'undefined' && properties.from !== egoID) {
			// We have been called by another sociogram method
			properties = properties;
		} else {
			return false;
		}

		// the below won't work because we are storing the coords in an edge now...
		note.debug('Sociogram is adding an edge.');
		var toObject = sociogramNarrative.getNodeByID(properties.to);
	 	var fromObject = sociogramNarrative.getNodeByID(properties.from);
		var points = [fromObject.attrs.coords[0], fromObject.attrs.coords[1], toObject.attrs.coords[0], toObject.attrs.coords[1]];

		var edgeOptions = {
			// dashArray: [10, 10, 00, 10],
			strokeWidth: 6,
			transformsEnabled: 'position',
			hitGraphEnabled: false,
			opacity:1,
			// fill: '#ff0000',
			// closed: false,
			// width:100,
			stroke: settings.options.defaultEdgeColor,
			// opacity: 0.8,
			points: points,
			shadowColor: 'black',
			shadowBlur: 0.3,
			shadowOffset: {x : 0, y : 0},
			shadowOpacity: 1
		}

		// Handle options parameter to allow overriding default values
		if (options) {
			// console.log('extending with options');
			$.extend(edgeOptions, options);
			// console.log(edgeOptions);
		}

		var edge = new Konva.Line(edgeOptions);

		edge.setAttrs({
			from: properties.from,
			to: properties.to
		});

		edgeLayer.add(edge);

		setTimeout(function() {
			edgeLayer.draw();
		},0);
		nodeLayer.draw();
		note.trace('Created Edge between '+fromObject.attrs.label+' and '+toObject.attrs.label);

		return true;

	};

	sociogramNarrative.removeEdge = function(properties) {

		note.debug('sociogramNarrative.removeEdge() called.');
		if (!properties) {
			note.error('No properties passed to sociogramNarrative.removeEdge()!');
		}

		// Test if we are being called by an event, or directly
		if (typeof properties.detail !== 'undefined' && typeof properties.detail.from !== 'undefined' && properties.detail.from !== settings.network.getEgo().id) {
			properties = properties.detail;
		}

		var toObject = properties.to;
	 	var fromObject = properties.from;

		// This function is failing because two nodes are matching below
		var found = false;
		$.each(sociogramNarrative.getKineticEdges(), function(index, value) {
			if (value !== undefined) {
				if (value.attrs.from === fromObject && value.attrs.to === toObject || value.attrs.from === toObject && value.attrs.to === fromObject ) {
					found = true;
					edgeLayer.children[index].remove();
					edgeLayer.draw();
				}
			}

		});

		if (!found) {
			note.error('sociogramNarrative.removeEdge() failed! Couldn\'t find the specified edge.');
		} else {
			return true;
		}

	};

	sociogramNarrative.removeNode = function() {
	};

	// Misc functions

	sociogramNarrative.clearGraph = function() {
		edgeLayer.removeChildren();
		edgeLayer.clear();
		nodeLayer.removeChildren();
		nodeLayer.clear();

	};

	sociogramNarrative.getStage = function() {
		return stage;
	};

	// Main initialisation functions
	// a flag we use to see if we're dragging the mouse
        // a reference to the line we are currently drawing

		var annotations = [];
		var currentAnnotation;

		function Annotation() {

			var annotation = {
				points: [],
				isMouseDown: false
			};

			annotation.onMouseDown = function() {
				// console.log('mousedown');
				annotations.push(annotation);
				currentAnnotation = annotation;
				// console.log(annotations);
				annotation.isMouseDown = true;
				var position = stage.getPointerPosition();
				annotation.points.push(position.x,position.y);
				annotation.line = new Konva.Line({
					points: annotation.points,
					stroke: 'red',
					strokeWidth: 5,
					lineCap: 'round',
					lineJoin: 'round'
				});
				backgroundLayer.add(annotation.line);
			};

			annotation.onMouseUp = function() {
				// console.log('mouseup');
				currentAnnotation = null;
				annotation.isMouseDown=false;
				annotation.tween = new Konva.Tween({
					node: annotation.line,
					opacity: 0,
					duration: 15,
					onFinish: function(){
					}
				}).play();
			};

			annotation.onMouseMove = function() {

				if(!annotation.isMouseDown){return;}
				// console.log('mousemove');
				var position = stage.getPointerPosition();
				annotation.points.push(position.x,position.y);
				annotation.line.setPoints(annotation.points);
				backgroundLayer.batchDraw();
			};

			annotation.init = function() {
				// make sure we have cancelled all other annotations
				$.each(annotations, function(index, value) {
					value.onMouseUp();
				});
			};

			annotation.init();

			return annotation;
		}



		function killAnnotation(target) {
			// event
			var log = new window.CustomEvent('log', {'detail':{'eventType': 'annotation', 'eventObject':target.points}});
			window.dispatchEvent(log);
			var unsavedChanges = new window.Event('unsavedChanges');
			window.dispatchEvent(unsavedChanges);

			stage.off('mouseup touchend', function(){killAnnotation(target);});
			stage.off('mousemove touchmove', function(){drawAnnotation(target);});
			target.onMouseUp();


		}

		function drawAnnotation(target) {
			target.onMouseMove();
		}

		function newAnnotation(e) {
			$(':focus').blur();
			if (e.target === backgroundRect) {
				// console.log(e);
				// setTimeout(function() {
					var blah = new Annotation();
					blah.onMouseDown();
					// console.log(blah);

					stage.on('mouseup touchend', function(){killAnnotation(blah);});
					stage.on('mousemove touchmove', function(){drawAnnotation(blah);});
				// }, 100);
			}
		}

	sociogramNarrative.initKinetic = function () {
		// Initialise KineticJS stage
		stage = new Konva.Stage({
			container: settings.targetEl,
			width: window.innerWidth,
			height: window.innerHeight
		});

		circleLayer = new Konva.Layer();
		hullLayer = new Konva.FastLayer();
		wedgeLayer = new Konva.FastLayer();
		nodeLayer = new Konva.Layer();
		edgeLayer = new Konva.FastLayer();

		/**
		* This hack allows us to detect clicks that happen outside of nodes, hulls, or edges.
		* We create a transparent rectangle on a special background layer which sits between the UI layer and the interaction layers.
		* We then listen to click events on this shape.
 		*/
		backgroundLayer = new Konva.Layer();
		backgroundRect = new Konva.Rect({
	        x: 0,
	        y: 0,
	        width: stage.width(),
	        height: stage.height(),
			fill: 'transparent'
	      });
		backgroundLayer.add(backgroundRect);

		stage.on('mousedown touchstart', function(e){newAnnotation(e);});

		stage.add(circleLayer);
		stage.add(hullLayer);
		stage.add(edgeLayer);
		stage.add(backgroundLayer);
		stage.add(wedgeLayer);
		stage.add(nodeLayer);

		note.debug('Konva stage initialised.');

	};

	sociogramNarrative.showDetailsPanel = function() {
		$('.details-panel').addClass('show');
	};

	sociogramNarrative.hideDetailsPanel = function() {
		$('.details-panel').removeClass('show');
	};

	sociogramNarrative.generateHull = function(points) {

        var newHull = new ConvexHullGrahamScan();

        for (var i = 0; i < points.length; i++) {
            var coords = points[i].getPosition();
            newHull.addPoint(coords.x, coords.y);
        }

		return toPointFromObject(newHull.getHull());


	};

	sociogramNarrative.getModuleEvents = function() {
		return moduleEvents;
	};

	// Get & set functions

	sociogramNarrative.getKineticNodes = function() {
		return nodeLayer.children;
	};

	sociogramNarrative.getKineticEdges = function() {
		return edgeLayer.children;
	};

	sociogramNarrative.getEdgeLayer = function() {
		return edgeLayer;
	};

	sociogramNarrative.getNodeLayer = function() {
		return nodeLayer;
	};

	sociogramNarrative.getBackgroundLayer = function() {
		return backgroundLayer;
	};

	sociogramNarrative.getUILayer = function() {
		return uiLayer;
	};

	sociogramNarrative.getHullLayer = function() {
			return hullLayer;
	};

	sociogramNarrative.getNodeByID = function(id) {
		var node = {},
		nodes = sociogramNarrative.getKineticNodes();

		$.each(nodes, function(index, value) {
			if (value.attrs.id === id) {
				node = value;
			}
		});

		return node;
	};

	sociogramNarrative.getNodeColorByType = function(type) {
		var returnVal = null;
		$.each(settings.nodeTypes, function(index, value) {
			if (value.name === type) {returnVal = value.color;}
		});

		if (returnVal) {
			return returnVal;
		} else {
			return false;
		}
	};

	return sociogramNarrative;

};

},{}],20:[function(require,module,exports){
/*jshint unused:false*/
/*global Set, window, $, localStorage, Storage, debugLevel, deepEquals, Notification, alert, note */
/*jshint bitwise: false*/
'use strict';

//$.uniqueId taken from jQuery-UI 1.9
( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "jquery", "./version" ], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
} ( function( $ ) {

return $.fn.extend( {
	uniqueId: ( function() {
		var uuid = 0;

		return function() {
			return this.each( function() {
				if ( !this.id ) {
					this.id = "ui-id-" + ( ++uuid );
				}
			} );
		};
	} )(),

	removeUniqueId: function() {
		return this.each( function() {
			if ( /^ui-id-\d+$/.test( this.id ) ) {
				$( this ).removeAttr( "id" );
			}
		} );
	}
} );

} ) );

// String methods

String.prototype.wrap= function(n, hyphen){
	var str1, tem, ax, diff, lim, S= [];
	var A = this.split('/\\s*\/');
	n = n || 50;
	hyphen= hyphen || n*2;
	hyphen= Math.floor(hyphen/2);
	while(A.length){
		str1= A.shift();
		while(str1 && str1.length> n){
			if(ax=== 0 && /^\\S/.test(str1)) S[S.length-1]+= '-';
			tem= str1.substring(0, n);
			ax= tem.lastIndexOf(' ')+ 1;
			if(ax== 0){
				S.push(str1.substring(0, n-1));
				str1= str1.substring(n-1);
			}
			else{
				tem= str1.substring(0, ax);
				diff= n-ax;
				if(diff> hyphen){
					lim=ax+ hyphen;
					while(ax<lim && /\\w/.test(str1.charAt(ax))) ++ax;
					tem= str1.substring(0, ax)+'-';
				}
				str1= str1.substring(ax);
				S.push(tem);
			}
		}
		if(str1) S.push(str1);
	}
	var br = '\n';
	return S.join(br);
}
// Storage prototypes

window.Storage.prototype.showTotalUsage = function() {
    var total = 0;
    for(var x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
            var amount = (localStorage[x].length * 2) / 1024 / 1024;
            total += amount;
            console.log( x + ' = ' + amount.toFixed(2) + ' MB');
        }
    }
    console.log( 'Total: ' + total.toFixed(2) + ' MB');
};

window.Storage.prototype.getKeyUsage = function(key) {
    if (localStorage.hasOwnProperty(key)) {
        var amount = (localStorage[key].length * 2) / 1024 / 1024;
        return amount.toFixed(2);
    }
};

window.Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

window.Storage.prototype.getObject = function(key) {
    if (this.getItem(key) === null) {
        return false;
    } else {
        var value = this.getItem(key);
        return value && JSON.parse(value);
    }
};

jQuery.fn.scrollTo = function(elem, speed) {
    $(this).animate({
        scrollTop:  $(this).scrollTop() - $(this).offset().top + $(elem).offset().top
    }, speed == undefined ? 1000 : speed);
    return this;
};


// Array prototypes

Object.defineProperty(Array.prototype, 'toUnique', {
    enumerable: false,
    value: function() {
        var b,c;
        b=this.length;
        if (this.length > 0) {
            while(c=--b) while(c--) this[b]!==this[c]||this.splice(c,1)
        } else {
            return this;
        }

        // return  // not needed ;)
    }
});

Object.defineProperty(Array.prototype, 'remove', {
    enumerable: false,
    value: function (item) {
        var removeCounter = 0;

        for (var index = 0; index < this.length; index++) {
            if (this[index] === item) {
                this.splice(index, 1);
                removeCounter++;
                index--;
            }
        }
        return removeCounter;
    }
});

Object.defineProperty(Array.prototype, 'replace', {
    enumerable: false,
    value: function (item1, item2) {
        for (var index = 0; index < this.length; index++) {
            if (this[index] === item1) {
				this[index] = item2;
            }
        }
        return this;
    }
});


// Returns an array of linearly spaced numbers within a range.
exports.getLinearRange = function(min, max, number, accuracy) {
    number++;
	var start = min || 0;
	accuracy = accuracy || 2;
	var range = max - min;
	console.log('range ' +range);
    var increment =  range/number;
	console.log('increment '+ increment);
    var returnArray = [];

    for (var i = 0; i <= number; i++) {
		var current = start + (increment*i);
        returnArray.push(current.toFixed(accuracy));
    }

    return returnArray;
};


//
exports.Events = {
    register: function(eventsArray, eventsList) {
        for (var i = 0; i < eventsList.length; i++) {
            eventsArray.push(eventsList[i]);

			if (eventsList[i].targetEl && eventsList[i].handler && eventsList[i].event) {
				if (typeof eventsList[i].subTarget !== 'undefined') {
					// console.log('$('+eventsList[i].targetEl+').on('+eventsList[i].event+', '+eventsList[i].subTarget+', '+eventsList[i].handler+')');
	                $(eventsList[i].targetEl).on(eventsList[i].event, eventsList[i].subTarget, eventsList[i].handler);
	            } else {
	                $(eventsList[i].targetEl).on(eventsList[i].event, eventsList[i].handler);
	            }
			} else {
				note.warn('An event was misspecified, and has been ignored.');
				note.debug(eventsList[i]);
			}



        }

    },
    unbind: function(eventsArray) {
        for (var i = 0; i < eventsArray.length; i++) {
            if (typeof eventsArray[i].subTarget !== 'undefined') {
                $(eventsArray[i].targetEl).off(eventsArray[i].event, eventsArray[i].subTarget, eventsArray[i].handler);
            } else {
                $(eventsArray[i].targetEl).off(eventsArray[i].event, eventsArray[i].handler);
            }
        }
    }
};

exports.arrayDifference = function(a1, a2) {
  var a2Set = new Set(a2);
  return a1.filter(function(x) { return !a2Set.has(x); });
};

exports.euclideanDistance = function(point1, point2) {
    var d1 = point1[0] - point2[0], d2 = point1[1] - point2[1];
    return Math.sqrt(d1 * d1 + d2 * d2);
};

exports.removeFromObject = function(item, object) {
    var removeCounter = 0;

    for (var index = 0; index < object.length; index++) {
        if (object[index] === item) {
            object.splice(index, 1);
            removeCounter++;
            index--;
        }
    }
    return removeCounter;
};


// HTML entity encode/decode
exports.htmlEscape = function(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};

// I needed the opposite function today, so adding here too:
exports.htmlUnEscape = function (value) {
    return String(value)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
};


// helper functions

exports.nwNotification = function(options) {
    var notification = new Notification('Network Canvas:',options);
    notification.onclick = function () {
        // alert('Notification Clicked');
    };

    notification.onshow = function () {
        // play sound on show
        // myAud=document.getElementById("audio1");
        // myAud.play();

        // auto close after 1 second
        // setTimeout(function() {
        //     notification.close();
        // }, 1000);
    };
};

exports.deepEquals = function(a, x) {
    var p;
    for (p in a) {
        if (typeof(x[p]) === 'undefined') {
            return false;
        }
    }

    for (p in a) {
        if (a[p]) {

            switch (typeof(a[p])) {
                case 'object':
                    if (a[p].sort) {
                        a[p].sort();
                        x[p].sort();
                    }
                    if (!deepEquals(a[p], x[p])) {
                        return false;
                    }
                    break;
                case 'function':
                    if (typeof(x[p]) === 'undefined' || a[p].toString() !== x[p].toString()) {
                        return false;
                    }
                    break;
                default:
                    if (a[p] !== x[p]) {
                        return false;
                    }
            }
        } else {
            if (x[p]) {
                return false;
            }

        }
    }
    for (p in x) {
        if (typeof(a[p]) === 'undefined') {
            return false;
        }
    }

    return true;
};

exports.isInNestedObject = function(targetArray, objectKey, objectKeyValue) {
    // This function is for checking for keys in arrays of objects.
    for (var i = 0; i<targetArray.length; i++){
        for (var prop in targetArray[i]){
            if (prop === objectKey && targetArray[i][prop] === objectKeyValue) { return true; }
        }
    }

    return false;
};

exports.getKValueFromNestedObject = function(targetArray, objectKey) {
    // This function is for checking for keys in arrays of objects.
    for (var i = 0; i<targetArray.length; i++){
        for (var prop in targetArray[i]){
            if (prop === objectKey) { return targetArray[i][prop]; }
        }
    }

    return false;
};

exports.getValueFromName = function(targetArray, name) {
    // This function is for checking for keys in arrays of objects.
    for (var i = 0; i<targetArray.length; i++){
        if (typeof targetArray[i].name !== 'undefined' && typeof targetArray[i].value !== 'undefined' && targetArray[i].name === name) {
            return targetArray[i].value;
        }
    }

    return false;
};


exports.extend = function( a, b ) {
    for( var key in b ) {
        if( b.hasOwnProperty( key ) ) {
            a[key] = b[key];
        }
    }
    return a;
};

exports.notify = function(text, level){
    level = level || 0;
    if (level <= window.debugLevel) {
        console.log(text);
    }
};

exports.randomBetween = function(min,max) {
    return Math.random() * (max - min) + min;
};


exports.hex = function (x){
    return ('0' + parseInt(x).toString(16)).slice(-2);
};

$.cssHooks.backgroundColor = {
    get: function(elem) {
        var bg;
        if (elem.currentStyle) {
            bg = elem.currentStyle.backgroundColor;
        } else if (window.getComputedStyle) {
            bg = window.document.defaultView.getComputedStyle(elem,null).getPropertyValue('background-color');
        }

        if (bg.search('rgb') === -1) {
            return bg;
        } else {
            bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            return '#' + window.tools.hex(bg[1]) + window.tools.hex(bg[2]) + window.tools.hex(bg[3]);
        }
    }
};

exports.getRandomColor = function() {
    return '#' + (Math.round(Math.random() * 0XFFFFFF)).toString(16);
};

exports.modifyColor = function(hex, lum) {

    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = '#', c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i*2,2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ('00'+c).substr(c.length);
    }

    return rgb;

};

},{}],21:[function(require,module,exports){
(function (process){
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":29}],22:[function(require,module,exports){
module.exports.BinarySearchTree = require('./lib/bst');
module.exports.AVLTree = require('./lib/avltree');

},{"./lib/avltree":23,"./lib/bst":24}],23:[function(require,module,exports){
/**
 * Self-balancing binary search tree using the AVL implementation
 */
var BinarySearchTree = require('./bst')
  , customUtils = require('./customUtils')
  , util = require('util')
  , _ = require('underscore')
  ;


/**
 * Constructor
 * We can't use a direct pointer to the root node (as in the simple binary search tree)
 * as the root will change during tree rotations
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function AVLTree (options) {
  this.tree = new _AVLTree(options);
}


/**
 * Constructor of the internal AVLTree
 * @param {Object} options Optional
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Key}      options.key Initialize this BST's key with key
 * @param {Value}    options.value Initialize this BST's data with [value]
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function _AVLTree (options) {
  options = options || {};

  this.left = null;
  this.right = null;
  this.parent = options.parent !== undefined ? options.parent : null;
  if (options.hasOwnProperty('key')) { this.key = options.key; }
  this.data = options.hasOwnProperty('value') ? [options.value] : [];
  this.unique = options.unique || false;

  this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
  this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
}


/**
 * Inherit basic functions from the basic binary search tree
 */
util.inherits(_AVLTree, BinarySearchTree);

/**
 * Keep a pointer to the internal tree constructor for testing purposes
 */
AVLTree._AVLTree = _AVLTree;


/**
 * Check the recorded height is correct for every node
 * Throws if one height doesn't match
 */
_AVLTree.prototype.checkHeightCorrect = function () {
  var leftH, rightH;

  if (!this.hasOwnProperty('key')) { return; }   // Empty tree

  if (this.left && this.left.height === undefined) { throw new Error("Undefined height for node " + this.left.key); }
  if (this.right && this.right.height === undefined) { throw new Error("Undefined height for node " + this.right.key); }
  if (this.height === undefined) { throw new Error("Undefined height for node " + this.key); }

  leftH = this.left ? this.left.height : 0;
  rightH = this.right ? this.right.height : 0;

  if (this.height !== 1 + Math.max(leftH, rightH)) { throw new Error("Height constraint failed for node " + this.key); }
  if (this.left) { this.left.checkHeightCorrect(); }
  if (this.right) { this.right.checkHeightCorrect(); }
};


/**
 * Return the balance factor
 */
_AVLTree.prototype.balanceFactor = function () {
  var leftH = this.left ? this.left.height : 0
    , rightH = this.right ? this.right.height : 0
    ;
  return leftH - rightH;
};


/**
 * Check that the balance factors are all between -1 and 1
 */
_AVLTree.prototype.checkBalanceFactors = function () {
  if (Math.abs(this.balanceFactor()) > 1) { throw new Error('Tree is unbalanced at node ' + this.key); }

  if (this.left) { this.left.checkBalanceFactors(); }
  if (this.right) { this.right.checkBalanceFactors(); }
};


/**
 * When checking if the BST conditions are met, also check that the heights are correct
 * and the tree is balanced
 */
_AVLTree.prototype.checkIsAVLT = function () {
  _AVLTree.super_.prototype.checkIsBST.call(this);
  this.checkHeightCorrect();
  this.checkBalanceFactors();
};
AVLTree.prototype.checkIsAVLT = function () { this.tree.checkIsAVLT(); };


/**
 * Perform a right rotation of the tree if possible
 * and return the root of the resulting tree
 * The resulting tree's nodes' heights are also updated
 */
_AVLTree.prototype.rightRotation = function () {
  var q = this
    , p = this.left
    , b
    , ah, bh, ch;

  if (!p) { return this; }   // No change

  b = p.right;

  // Alter tree structure
  if (q.parent) {
    p.parent = q.parent;
    if (q.parent.left === q) { q.parent.left = p; } else { q.parent.right = p; }
  } else {
    p.parent = null;
  }
  p.right = q;
  q.parent = p;
  q.left = b;
  if (b) { b.parent = q; }

  // Update heights
  ah = p.left ? p.left.height : 0;
  bh = b ? b.height : 0;
  ch = q.right ? q.right.height : 0;
  q.height = Math.max(bh, ch) + 1;
  p.height = Math.max(ah, q.height) + 1;

  return p;
};


/**
 * Perform a left rotation of the tree if possible
 * and return the root of the resulting tree
 * The resulting tree's nodes' heights are also updated
 */
_AVLTree.prototype.leftRotation = function () {
  var p = this
    , q = this.right
    , b
    , ah, bh, ch;

  if (!q) { return this; }   // No change

  b = q.left;

  // Alter tree structure
  if (p.parent) {
    q.parent = p.parent;
    if (p.parent.left === p) { p.parent.left = q; } else { p.parent.right = q; }
  } else {
    q.parent = null;
  }
  q.left = p;
  p.parent = q;
  p.right = b;
  if (b) { b.parent = p; }

  // Update heights
  ah = p.left ? p.left.height : 0;
  bh = b ? b.height : 0;
  ch = q.right ? q.right.height : 0;
  p.height = Math.max(ah, bh) + 1;
  q.height = Math.max(ch, p.height) + 1;

  return q;
};


/**
 * Modify the tree if its right subtree is too small compared to the left
 * Return the new root if any
 */
_AVLTree.prototype.rightTooSmall = function () {
  if (this.balanceFactor() <= 1) { return this; }   // Right is not too small, don't change

  if (this.left.balanceFactor() < 0) {
    this.left.leftRotation();
  }

  return this.rightRotation();
};


/**
 * Modify the tree if its left subtree is too small compared to the right
 * Return the new root if any
 */
_AVLTree.prototype.leftTooSmall = function () {
  if (this.balanceFactor() >= -1) { return this; }   // Left is not too small, don't change

  if (this.right.balanceFactor() > 0) {
    this.right.rightRotation();
  }

  return this.leftRotation();
};


/**
 * Rebalance the tree along the given path. The path is given reversed (as he was calculated
 * in the insert and delete functions).
 * Returns the new root of the tree
 * Of course, the first element of the path must be the root of the tree
 */
_AVLTree.prototype.rebalanceAlongPath = function (path) {
  var newRoot = this
    , rotated
    , i;

  if (!this.hasOwnProperty('key')) { delete this.height; return this; }   // Empty tree

  // Rebalance the tree and update all heights
  for (i = path.length - 1; i >= 0; i -= 1) {
    path[i].height = 1 + Math.max(path[i].left ? path[i].left.height : 0, path[i].right ? path[i].right.height : 0);

    if (path[i].balanceFactor() > 1) {
      rotated = path[i].rightTooSmall();
      if (i === 0) { newRoot = rotated; }
    }

    if (path[i].balanceFactor() < -1) {
      rotated = path[i].leftTooSmall();
      if (i === 0) { newRoot = rotated; }
    }
  }

  return newRoot;
};


/**
 * Insert a key, value pair in the tree while maintaining the AVL tree height constraint
 * Return a pointer to the root node, which may have changed
 */
_AVLTree.prototype.insert = function (key, value) {
  var insertPath = []
    , currentNode = this
    ;

  // Empty tree, insert as root
  if (!this.hasOwnProperty('key')) {
    this.key = key;
    this.data.push(value);
    this.height = 1;
    return this;
  }

  // Insert new leaf at the right place
  while (true) {
    // Same key: no change in the tree structure
    if (currentNode.compareKeys(currentNode.key, key) === 0) {
      if (currentNode.unique) {
        var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
        err.key = key;
        err.errorType = 'uniqueViolated';
        throw err;
      } else {
        currentNode.data.push(value);
      }
      return this;
    }

    insertPath.push(currentNode);

    if (currentNode.compareKeys(key, currentNode.key) < 0) {
      if (!currentNode.left) {
        insertPath.push(currentNode.createLeftChild({ key: key, value: value }));
        break;
      } else {
        currentNode = currentNode.left;
      }
    } else {
      if (!currentNode.right) {
        insertPath.push(currentNode.createRightChild({ key: key, value: value }));
        break;
      } else {
        currentNode = currentNode.right;
      }
    }
  }

  return this.rebalanceAlongPath(insertPath);
};

// Insert in the internal tree, update the pointer to the root if needed
AVLTree.prototype.insert = function (key, value) {
  var newTree = this.tree.insert(key, value);

  // If newTree is undefined, that means its structure was not modified
  if (newTree) { this.tree = newTree; }
};


/**
 * Delete a key or just a value and return the new root of the tree
 * @param {Key} key
 * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
 */
_AVLTree.prototype.delete = function (key, value) {
  var newData = [], replaceWith
    , self = this
    , currentNode = this
    , deletePath = []
    ;

  if (!this.hasOwnProperty('key')) { return this; }   // Empty tree

  // Either no match is found and the function will return from within the loop
  // Or a match is found and deletePath will contain the path from the root to the node to delete after the loop
  while (true) {
    if (currentNode.compareKeys(key, currentNode.key) === 0) { break; }

    deletePath.push(currentNode);

    if (currentNode.compareKeys(key, currentNode.key) < 0) {
      if (currentNode.left) {
        currentNode = currentNode.left;
      } else {
        return this;   // Key not found, no modification
      }
    } else {
      // currentNode.compareKeys(key, currentNode.key) is > 0
      if (currentNode.right) {
        currentNode = currentNode.right;
      } else {
        return this;   // Key not found, no modification
      }
    }
  }

  // Delete only a value (no tree modification)
  if (currentNode.data.length > 1 && value) {
    currentNode.data.forEach(function (d) {
      if (!currentNode.checkValueEquality(d, value)) { newData.push(d); }
    });
    currentNode.data = newData;
    return this;
  }

  // Delete a whole node

  // Leaf
  if (!currentNode.left && !currentNode.right) {
    if (currentNode === this) {   // This leaf is also the root
      delete currentNode.key;
      currentNode.data = [];
      delete currentNode.height;
      return this;
    } else {
      if (currentNode.parent.left === currentNode) {
        currentNode.parent.left = null;
      } else {
        currentNode.parent.right = null;
      }
      return this.rebalanceAlongPath(deletePath);
    }
  }


  // Node with only one child
  if (!currentNode.left || !currentNode.right) {
    replaceWith = currentNode.left ? currentNode.left : currentNode.right;

    if (currentNode === this) {   // This node is also the root
      replaceWith.parent = null;
      return replaceWith;   // height of replaceWith is necessarily 1 because the tree was balanced before deletion
    } else {
      if (currentNode.parent.left === currentNode) {
        currentNode.parent.left = replaceWith;
        replaceWith.parent = currentNode.parent;
      } else {
        currentNode.parent.right = replaceWith;
        replaceWith.parent = currentNode.parent;
      }

      return this.rebalanceAlongPath(deletePath);
    }
  }


  // Node with two children
  // Use the in-order predecessor (no need to randomize since we actively rebalance)
  deletePath.push(currentNode);
  replaceWith = currentNode.left;

  // Special case: the in-order predecessor is right below the node to delete
  if (!replaceWith.right) {
    currentNode.key = replaceWith.key;
    currentNode.data = replaceWith.data;
    currentNode.left = replaceWith.left;
    if (replaceWith.left) { replaceWith.left.parent = currentNode; }
    return this.rebalanceAlongPath(deletePath);
  }

  // After this loop, replaceWith is the right-most leaf in the left subtree
  // and deletePath the path from the root (inclusive) to replaceWith (exclusive)
  while (true) {
    if (replaceWith.right) {
      deletePath.push(replaceWith);
      replaceWith = replaceWith.right;
    } else {
      break;
    }
  }

  currentNode.key = replaceWith.key;
  currentNode.data = replaceWith.data;

  replaceWith.parent.right = replaceWith.left;
  if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }

  return this.rebalanceAlongPath(deletePath);
};

// Delete a value
AVLTree.prototype.delete = function (key, value) {
  var newTree = this.tree.delete(key, value);

  // If newTree is undefined, that means its structure was not modified
  if (newTree) { this.tree = newTree; }
};


/**
 * Other functions we want to use on an AVLTree as if it were the internal _AVLTree
 */
['getNumberOfKeys', 'search', 'betweenBounds', 'prettyPrint', 'executeOnEveryNode'].forEach(function (fn) {
  AVLTree.prototype[fn] = function () {
    return this.tree[fn].apply(this.tree, arguments);
  };
});


// Interface
module.exports = AVLTree;

},{"./bst":24,"./customUtils":25,"underscore":42,"util":31}],24:[function(require,module,exports){
/**
 * Simple binary search tree
 */
var customUtils = require('./customUtils');


/**
 * Constructor
 * @param {Object} options Optional
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Key}      options.key Initialize this BST's key with key
 * @param {Value}    options.value Initialize this BST's data with [value]
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function BinarySearchTree (options) {
  options = options || {};

  this.left = null;
  this.right = null;
  this.parent = options.parent !== undefined ? options.parent : null;
  if (options.hasOwnProperty('key')) { this.key = options.key; }
  this.data = options.hasOwnProperty('value') ? [options.value] : [];
  this.unique = options.unique || false;

  this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
  this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
}


// ================================
// Methods used to test the tree
// ================================


/**
 * Get the descendant with max key
 */
BinarySearchTree.prototype.getMaxKeyDescendant = function () {
  if (this.right) {
    return this.right.getMaxKeyDescendant();
  } else {
    return this;
  }
};


/**
 * Get the maximum key
 */
BinarySearchTree.prototype.getMaxKey = function () {
  return this.getMaxKeyDescendant().key;
};


/**
 * Get the descendant with min key
 */
BinarySearchTree.prototype.getMinKeyDescendant = function () {
  if (this.left) {
    return this.left.getMinKeyDescendant()
  } else {
    return this;
  }
};


/**
 * Get the minimum key
 */
BinarySearchTree.prototype.getMinKey = function () {
  return this.getMinKeyDescendant().key;
};


/**
 * Check that all nodes (incl. leaves) fullfil condition given by fn
 * test is a function passed every (key, data) and which throws if the condition is not met
 */
BinarySearchTree.prototype.checkAllNodesFullfillCondition = function (test) {
  if (!this.hasOwnProperty('key')) { return; }

  test(this.key, this.data);
  if (this.left) { this.left.checkAllNodesFullfillCondition(test); }
  if (this.right) { this.right.checkAllNodesFullfillCondition(test); }
};


/**
 * Check that the core BST properties on node ordering are verified
 * Throw if they aren't
 */
BinarySearchTree.prototype.checkNodeOrdering = function () {
  var self = this;

  if (!this.hasOwnProperty('key')) { return; }

  if (this.left) {
    this.left.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) >= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.left.checkNodeOrdering();
  }

  if (this.right) {
    this.right.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) <= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.right.checkNodeOrdering();
  }
};


/**
 * Check that all pointers are coherent in this tree
 */
BinarySearchTree.prototype.checkInternalPointers = function () {
  if (this.left) {
    if (this.left.parent !== this) { throw new Error('Parent pointer broken for key ' + this.key); }
    this.left.checkInternalPointers();
  }

  if (this.right) {
    if (this.right.parent !== this) { throw new Error('Parent pointer broken for key ' + this.key); }
    this.right.checkInternalPointers();
  }
};


/**
 * Check that a tree is a BST as defined here (node ordering and pointer references)
 */
BinarySearchTree.prototype.checkIsBST = function () {
  this.checkNodeOrdering();
  this.checkInternalPointers();
  if (this.parent) { throw new Error("The root shouldn't have a parent"); }
};


/**
 * Get number of keys inserted
 */
BinarySearchTree.prototype.getNumberOfKeys = function () {
  var res;

  if (!this.hasOwnProperty('key')) { return 0; }

  res = 1;
  if (this.left) { res += this.left.getNumberOfKeys(); }
  if (this.right) { res += this.right.getNumberOfKeys(); }

  return res;
};



// ============================================
// Methods used to actually work on the tree
// ============================================

/**
 * Create a BST similar (i.e. same options except for key and value) to the current one
 * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
 * @param {Object} options see constructor
 */
BinarySearchTree.prototype.createSimilar = function (options) {
  options = options || {};
  options.unique = this.unique;
  options.compareKeys = this.compareKeys;
  options.checkValueEquality = this.checkValueEquality;

  return new this.constructor(options);
};


/**
 * Create the left child of this BST and return it
 */
BinarySearchTree.prototype.createLeftChild = function (options) {
  var leftChild = this.createSimilar(options);
  leftChild.parent = this;
  this.left = leftChild;

  return leftChild;
};


/**
 * Create the right child of this BST and return it
 */
BinarySearchTree.prototype.createRightChild = function (options) {
  var rightChild = this.createSimilar(options);
  rightChild.parent = this;
  this.right = rightChild;

  return rightChild;
};


/**
 * Insert a new element
 */
BinarySearchTree.prototype.insert = function (key, value) {
  // Empty tree, insert as root
  if (!this.hasOwnProperty('key')) {
    this.key = key;
    this.data.push(value);
    return;
  }

  // Same key as root
  if (this.compareKeys(this.key, key) === 0) {
    if (this.unique) {
      var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
      err.key = key;
      err.errorType = 'uniqueViolated';
      throw err;
    } else {
      this.data.push(value);
    }
    return;
  }

  if (this.compareKeys(key, this.key) < 0) {
    // Insert in left subtree
    if (this.left) {
      this.left.insert(key, value);
    } else {
      this.createLeftChild({ key: key, value: value });
    }
  } else {
    // Insert in right subtree
    if (this.right) {
      this.right.insert(key, value);
    } else {
      this.createRightChild({ key: key, value: value });
    }
  }
};


/**
 * Search for all data corresponding to a key
 */
BinarySearchTree.prototype.search = function (key) {
  if (!this.hasOwnProperty('key')) { return []; }

  if (this.compareKeys(this.key, key) === 0) { return this.data; }

  if (this.compareKeys(key, this.key) < 0) {
    if (this.left) {
      return this.left.search(key);
    } else {
      return [];
    }
  } else {
    if (this.right) {
      return this.right.search(key);
    } else {
      return [];
    }
  }
};


/**
 * Return a function that tells whether a given key matches a lower bound
 */
BinarySearchTree.prototype.getLowerBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$gt') && !query.hasOwnProperty('$gte')) {
    return function () { return true; };
  }

  if (query.hasOwnProperty('$gt') && query.hasOwnProperty('$gte')) {
    if (self.compareKeys(query.$gte, query.$gt) === 0) {
      return function (key) { return self.compareKeys(key, query.$gt) > 0; };
    }

    if (self.compareKeys(query.$gte, query.$gt) > 0) {
      return function (key) { return self.compareKeys(key, query.$gte) >= 0; };
    } else {
      return function (key) { return self.compareKeys(key, query.$gt) > 0; };
    }
  }

  if (query.hasOwnProperty('$gt')) {
    return function (key) { return self.compareKeys(key, query.$gt) > 0; };
  } else {
    return function (key) { return self.compareKeys(key, query.$gte) >= 0; };
  }
};


/**
 * Return a function that tells whether a given key matches an upper bound
 */
BinarySearchTree.prototype.getUpperBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$lt') && !query.hasOwnProperty('$lte')) {
    return function () { return true; };
  }

  if (query.hasOwnProperty('$lt') && query.hasOwnProperty('$lte')) {
    if (self.compareKeys(query.$lte, query.$lt) === 0) {
      return function (key) { return self.compareKeys(key, query.$lt) < 0; };
    }

    if (self.compareKeys(query.$lte, query.$lt) < 0) {
      return function (key) { return self.compareKeys(key, query.$lte) <= 0; };
    } else {
      return function (key) { return self.compareKeys(key, query.$lt) < 0; };
    }
  }

  if (query.hasOwnProperty('$lt')) {
    return function (key) { return self.compareKeys(key, query.$lt) < 0; };
  } else {
    return function (key) { return self.compareKeys(key, query.$lte) <= 0; };
  }
};


// Append all elements in toAppend to array
function append (array, toAppend) {
  var i;

  for (i = 0; i < toAppend.length; i += 1) {
    array.push(toAppend[i]);
  }
}


/**
 * Get all data for a key between bounds
 * Return it in key order
 * @param {Object} query Mongo-style query where keys are $lt, $lte, $gt or $gte (other keys are not considered)
 * @param {Functions} lbm/ubm matching functions calculated at the first recursive step
 */
BinarySearchTree.prototype.betweenBounds = function (query, lbm, ubm) {
  var res = [];

  if (!this.hasOwnProperty('key')) { return []; }   // Empty tree

  lbm = lbm || this.getLowerBoundMatcher(query);
  ubm = ubm || this.getUpperBoundMatcher(query);

  if (lbm(this.key) && this.left) { append(res, this.left.betweenBounds(query, lbm, ubm)); }
  if (lbm(this.key) && ubm(this.key)) { append(res, this.data); }
  if (ubm(this.key) && this.right) { append(res, this.right.betweenBounds(query, lbm, ubm)); }

  return res;
};


/**
 * Delete the current node if it is a leaf
 * Return true if it was deleted
 */
BinarySearchTree.prototype.deleteIfLeaf = function () {
  if (this.left || this.right) { return false; }

  // The leaf is itself a root
  if (!this.parent) {
    delete this.key;
    this.data = [];
    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = null;
  } else {
    this.parent.right = null;
  }

  return true;
};


/**
 * Delete the current node if it has only one child
 * Return true if it was deleted
 */
BinarySearchTree.prototype.deleteIfOnlyOneChild = function () {
  var child;

  if (this.left && !this.right) { child = this.left; }
  if (!this.left && this.right) { child = this.right; }
  if (!child) { return false; }

  // Root
  if (!this.parent) {
    this.key = child.key;
    this.data = child.data;

    this.left = null;
    if (child.left) {
      this.left = child.left;
      child.left.parent = this;
    }

    this.right = null;
    if (child.right) {
      this.right = child.right;
      child.right.parent = this;
    }

    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = child;
    child.parent = this.parent;
  } else {
    this.parent.right = child;
    child.parent = this.parent;
  }

  return true;
};


/**
 * Delete a key or just a value
 * @param {Key} key
 * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
 */
BinarySearchTree.prototype.delete = function (key, value) {
  var newData = [], replaceWith
    , self = this
    ;

  if (!this.hasOwnProperty('key')) { return; }

  if (this.compareKeys(key, this.key) < 0) {
    if (this.left) { this.left.delete(key, value); }
    return;
  }

  if (this.compareKeys(key, this.key) > 0) {
    if (this.right) { this.right.delete(key, value); }
    return;
  }

  if (!this.compareKeys(key, this.key) === 0) { return; }

  // Delete only a value
  if (this.data.length > 1 && value !== undefined) {
    this.data.forEach(function (d) {
      if (!self.checkValueEquality(d, value)) { newData.push(d); }
    });
    self.data = newData;
    return;
  }

  // Delete the whole node
  if (this.deleteIfLeaf()) {
    return;
  }
  if (this.deleteIfOnlyOneChild()) {
    return;
  }

  // We are in the case where the node to delete has two children
  if (Math.random() >= 0.5) {   // Randomize replacement to avoid unbalancing the tree too much
    // Use the in-order predecessor
    replaceWith = this.left.getMaxKeyDescendant();

    this.key = replaceWith.key;
    this.data = replaceWith.data;

    if (this === replaceWith.parent) {   // Special case
      this.left = replaceWith.left;
      if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }
    } else {
      replaceWith.parent.right = replaceWith.left;
      if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }
    }
  } else {
    // Use the in-order successor
    replaceWith = this.right.getMinKeyDescendant();

    this.key = replaceWith.key;
    this.data = replaceWith.data;

    if (this === replaceWith.parent) {   // Special case
      this.right = replaceWith.right;
      if (replaceWith.right) { replaceWith.right.parent = replaceWith.parent; }
    } else {
      replaceWith.parent.left = replaceWith.right;
      if (replaceWith.right) { replaceWith.right.parent = replaceWith.parent; }
    }
  }
};


/**
 * Execute a function on every node of the tree, in key order
 * @param {Function} fn Signature: node. Most useful will probably be node.key and node.data
 */
BinarySearchTree.prototype.executeOnEveryNode = function (fn) {
  if (this.left) { this.left.executeOnEveryNode(fn); }
  fn(this);
  if (this.right) { this.right.executeOnEveryNode(fn); }
};


/**
 * Pretty print a tree
 * @param {Boolean} printData To print the nodes' data along with the key
 */
BinarySearchTree.prototype.prettyPrint = function (printData, spacing) {
  spacing = spacing || "";

  console.log(spacing + "* " + this.key);
  if (printData) { console.log(spacing + "* " + this.data); }

  if (!this.left && !this.right) { return; }

  if (this.left) {
    this.left.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
  if (this.right) {
    this.right.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
};




// Interface
module.exports = BinarySearchTree;

},{"./customUtils":25}],25:[function(require,module,exports){
/**
 * Return an array with the numbers from 0 to n-1, in a random order
 */
function getRandomArray (n) {
  var res, next;

  if (n === 0) { return []; }
  if (n === 1) { return [0]; }

  res = getRandomArray(n - 1);
  next = Math.floor(Math.random() * n);
  res.splice(next, 0, n - 1);   // Add n-1 at a random position in the array

  return res;
};
module.exports.getRandomArray = getRandomArray;


/*
 * Default compareKeys function will work for numbers, strings and dates
 */
function defaultCompareKeysFunction (a, b) {
  if (a < b) { return -1; }
  if (a > b) { return 1; }
  if (a === b) { return 0; }

  var err = new Error("Couldn't compare elements");
  err.a = a;
  err.b = b;
  throw err;
}
module.exports.defaultCompareKeysFunction = defaultCompareKeysFunction;


/**
 * Check whether two values are equal (used in non-unique deletion)
 */
function defaultCheckValueEquality (a, b) {
  return a === b;
}
module.exports.defaultCheckValueEquality = defaultCheckValueEquality;

},{}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],27:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],28:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":29}],29:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],30:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],31:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":30,"_process":29,"inherits":27}],32:[function(require,module,exports){
(function (global){
/*!
    localForage -- Offline Storage, Improved
    Version 1.4.2
    https://mozilla.github.io/localForage
    (c) 2013-2015 Mozilla, Apache License 2.0
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.localforage = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw (f.code="MODULE_NOT_FOUND", f)}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';
var immediate = _dereq_(2);

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && typeof obj === 'object' && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

exports.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

exports.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

exports.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

exports.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

},{"2":2}],2:[function(_dereq_,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(_dereq_,module,exports){
(function (global){
'use strict';
if (typeof global.Promise !== 'function') {
  global.Promise = _dereq_(1);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"1":1}],4:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function getIDB() {
    /* global indexedDB,webkitIndexedDB,mozIndexedDB,OIndexedDB,msIndexedDB */
    if (typeof indexedDB !== 'undefined') {
        return indexedDB;
    }
    if (typeof webkitIndexedDB !== 'undefined') {
        return webkitIndexedDB;
    }
    if (typeof mozIndexedDB !== 'undefined') {
        return mozIndexedDB;
    }
    if (typeof OIndexedDB !== 'undefined') {
        return OIndexedDB;
    }
    if (typeof msIndexedDB !== 'undefined') {
        return msIndexedDB;
    }
}

var idb = getIDB();

function isIndexedDBValid() {
    try {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        if (!idb) {
            return false;
        }
        // We mimic PouchDB here; just UA test for Safari (which, as of
        // iOS 8/Yosemite, doesn't properly support IndexedDB).
        // IndexedDB support is broken and different from Blink's.
        // This is faster than the test case (and it's sync), so we just
        // do this. *SIGH*
        // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
        //
        // We test for openDatabase because IE Mobile identifies itself
        // as Safari. Oh the lulz...
        if (typeof openDatabase !== 'undefined' && typeof navigator !== 'undefined' && navigator.userAgent && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
            return false;
        }

        return idb && typeof idb.open === 'function' &&
        // Some Samsung/HTC Android 4.0-4.3 devices
        // have older IndexedDB specs; if this isn't available
        // their IndexedDB is too old for us to use.
        // (Replaces the onupgradeneeded test.)
        typeof IDBKeyRange !== 'undefined';
    } catch (e) {
        return false;
    }
}

function isWebSQLValid() {
    return typeof openDatabase === 'function';
}

function isLocalStorageValid() {
    try {
        return typeof localStorage !== 'undefined' && 'setItem' in localStorage && localStorage.setItem;
    } catch (e) {
        return false;
    }
}

// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
function createBlob(parts, properties) {
    /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
    parts = parts || [];
    properties = properties || {};
    try {
        return new Blob(parts, properties);
    } catch (e) {
        if (e.name !== 'TypeError') {
            throw e;
        }
        var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder : typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder : typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder : WebKitBlobBuilder;
        var builder = new Builder();
        for (var i = 0; i < parts.length; i += 1) {
            builder.append(parts[i]);
        }
        return builder.getBlob(properties.type);
    }
}

// This is CommonJS because lie is an external dependency, so Rollup
// can just ignore it.
if (typeof Promise === 'undefined' && typeof _dereq_ !== 'undefined') {
    _dereq_(3);
}
var Promise$1 = Promise;

function executeCallback(promise, callback) {
    if (callback) {
        promise.then(function (result) {
            callback(null, result);
        }, function (error) {
            callback(error);
        });
    }
}

// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).

var DETECT_BLOB_SUPPORT_STORE = 'local-forage-detect-blob-support';
var supportsBlobs;
var dbContexts;

// Transform a binary string to an array buffer, because otherwise
// weird stuff happens when you try to work with the binary string directly.
// It is known.
// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function _binStringToArrayBuffer(bin) {
    var length = bin.length;
    var buf = new ArrayBuffer(length);
    var arr = new Uint8Array(buf);
    for (var i = 0; i < length; i++) {
        arr[i] = bin.charCodeAt(i);
    }
    return buf;
}

//
// Blobs are not supported in all versions of IndexedDB, notably
// Chrome <37 and Android <5. In those versions, storing a blob will throw.
//
// Various other blob bugs exist in Chrome v37-42 (inclusive).
// Detecting them is expensive and confusing to users, and Chrome 37-42
// is at very low usage worldwide, so we do a hacky userAgent check instead.
//
// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
//
// Code borrowed from PouchDB. See:
// https://github.com/pouchdb/pouchdb/blob/9c25a23/src/adapters/idb/blobSupport.js
//
function _checkBlobSupportWithoutCaching(txn) {
    return new Promise$1(function (resolve) {
        var blob = createBlob(['']);
        txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');

        txn.onabort = function (e) {
            // If the transaction aborts now its due to not being able to
            // write to the database, likely due to the disk being full
            e.preventDefault();
            e.stopPropagation();
            resolve(false);
        };

        txn.oncomplete = function () {
            var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
            var matchedEdge = navigator.userAgent.match(/Edge\//);
            // MS Edge pretends to be Chrome 42:
            // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
            resolve(matchedEdge || !matchedChrome || parseInt(matchedChrome[1], 10) >= 43);
        };
    })["catch"](function () {
        return false; // error, so assume unsupported
    });
}

function _checkBlobSupport(idb) {
    if (typeof supportsBlobs === 'boolean') {
        return Promise$1.resolve(supportsBlobs);
    }
    return _checkBlobSupportWithoutCaching(idb).then(function (value) {
        supportsBlobs = value;
        return supportsBlobs;
    });
}

function _deferReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Create a deferred object representing the current database operation.
    var deferredOperation = {};

    deferredOperation.promise = new Promise$1(function (resolve) {
        deferredOperation.resolve = resolve;
    });

    // Enqueue the deferred operation.
    dbContext.deferredOperations.push(deferredOperation);

    // Chain its promise to the database readiness.
    if (!dbContext.dbReady) {
        dbContext.dbReady = deferredOperation.promise;
    } else {
        dbContext.dbReady = dbContext.dbReady.then(function () {
            return deferredOperation.promise;
        });
    }
}

function _advanceReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Dequeue a deferred operation.
    var deferredOperation = dbContext.deferredOperations.pop();

    // Resolve its promise (which is part of the database readiness
    // chain of promises).
    if (deferredOperation) {
        deferredOperation.resolve();
    }
}

function _getConnection(dbInfo, upgradeNeeded) {
    return new Promise$1(function (resolve, reject) {

        if (dbInfo.db) {
            if (upgradeNeeded) {
                _deferReadiness(dbInfo);
                dbInfo.db.close();
            } else {
                return resolve(dbInfo.db);
            }
        }

        var dbArgs = [dbInfo.name];

        if (upgradeNeeded) {
            dbArgs.push(dbInfo.version);
        }

        var openreq = idb.open.apply(idb, dbArgs);

        if (upgradeNeeded) {
            openreq.onupgradeneeded = function (e) {
                var db = openreq.result;
                try {
                    db.createObjectStore(dbInfo.storeName);
                    if (e.oldVersion <= 1) {
                        // Added when support for blob shims was added
                        db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
                    }
                } catch (ex) {
                    if (ex.name === 'ConstraintError') {
                        console.warn('The database "' + dbInfo.name + '"' + ' has been upgraded from version ' + e.oldVersion + ' to version ' + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
                    } else {
                        throw ex;
                    }
                }
            };
        }

        openreq.onerror = function () {
            reject(openreq.error);
        };

        openreq.onsuccess = function () {
            resolve(openreq.result);
            _advanceReadiness(dbInfo);
        };
    });
}

function _getOriginalConnection(dbInfo) {
    return _getConnection(dbInfo, false);
}

function _getUpgradedConnection(dbInfo) {
    return _getConnection(dbInfo, true);
}

function _isUpgradeNeeded(dbInfo, defaultVersion) {
    if (!dbInfo.db) {
        return true;
    }

    var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
    var isDowngrade = dbInfo.version < dbInfo.db.version;
    var isUpgrade = dbInfo.version > dbInfo.db.version;

    if (isDowngrade) {
        // If the version is not the default one
        // then warn for impossible downgrade.
        if (dbInfo.version !== defaultVersion) {
            console.warn('The database "' + dbInfo.name + '"' + ' can\'t be downgraded from version ' + dbInfo.db.version + ' to version ' + dbInfo.version + '.');
        }
        // Align the versions to prevent errors.
        dbInfo.version = dbInfo.db.version;
    }

    if (isUpgrade || isNewStore) {
        // If the store is new then increment the version (if needed).
        // This will trigger an "upgradeneeded" event which is required
        // for creating a store.
        if (isNewStore) {
            var incVersion = dbInfo.db.version + 1;
            if (incVersion > dbInfo.version) {
                dbInfo.version = incVersion;
            }
        }

        return true;
    }

    return false;
}

// encode a blob for indexeddb engines that don't support blobs
function _encodeBlob(blob) {
    return new Promise$1(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = function (e) {
            var base64 = btoa(e.target.result || '');
            resolve({
                __local_forage_encoded_blob: true,
                data: base64,
                type: blob.type
            });
        };
        reader.readAsBinaryString(blob);
    });
}

// decode an encoded blob
function _decodeBlob(encodedBlob) {
    var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
    return createBlob([arrayBuff], { type: encodedBlob.type });
}

// is this one of our fancy encoded blobs?
function _isEncodedBlob(value) {
    return value && value.__local_forage_encoded_blob;
}

// Specialize the default `ready()` function by making it dependent
// on the current database operations. Thus, the driver will be actually
// ready when it's been initialized (default) *and* there are no pending
// operations on the database (initiated by some other instances).
function _fullyReady(callback) {
    var self = this;

    var promise = self._initReady().then(function () {
        var dbContext = dbContexts[self._dbInfo.name];

        if (dbContext && dbContext.dbReady) {
            return dbContext.dbReady;
        }
    });

    promise.then(callback, callback);
    return promise;
}

// Open the IndexedDB database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    // Initialize a singleton container for all running localForages.
    if (!dbContexts) {
        dbContexts = {};
    }

    // Get the current context of the database;
    var dbContext = dbContexts[dbInfo.name];

    // ...or create a new context.
    if (!dbContext) {
        dbContext = {
            // Running localForages sharing a database.
            forages: [],
            // Shared database.
            db: null,
            // Database readiness (promise).
            dbReady: null,
            // Deferred operations on the database.
            deferredOperations: []
        };
        // Register the new context in the global container.
        dbContexts[dbInfo.name] = dbContext;
    }

    // Register itself as a running localForage in the current context.
    dbContext.forages.push(self);

    // Replace the default `ready()` function with the specialized one.
    if (!self._initReady) {
        self._initReady = self.ready;
        self.ready = _fullyReady;
    }

    // Create an array of initialization states of the related localForages.
    var initPromises = [];

    function ignoreErrors() {
        // Don't handle errors here,
        // just makes sure related localForages aren't pending.
        return Promise$1.resolve();
    }

    for (var j = 0; j < dbContext.forages.length; j++) {
        var forage = dbContext.forages[j];
        if (forage !== self) {
            // Don't wait for itself...
            initPromises.push(forage._initReady()["catch"](ignoreErrors));
        }
    }

    // Take a snapshot of the related localForages.
    var forages = dbContext.forages.slice(0);

    // Initialize the connection process only when
    // all the related localForages aren't pending.
    return Promise$1.all(initPromises).then(function () {
        dbInfo.db = dbContext.db;
        // Get the connection or open a new one without upgrade.
        return _getOriginalConnection(dbInfo);
    }).then(function (db) {
        dbInfo.db = db;
        if (_isUpgradeNeeded(dbInfo, self._defaultConfig.version)) {
            // Reopen the database for upgrading.
            return _getUpgradedConnection(dbInfo);
        }
        return db;
    }).then(function (db) {
        dbInfo.db = dbContext.db = db;
        self._dbInfo = dbInfo;
        // Share the final connection amongst related localForages.
        for (var k = 0; k < forages.length; k++) {
            var forage = forages[k];
            if (forage !== self) {
                // Self is already up-to-date.
                forage._dbInfo.db = dbInfo.db;
                forage._dbInfo.version = dbInfo.version;
            }
        }
    });
}

function getItem(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
            var req = store.get(key);

            req.onsuccess = function () {
                var value = req.result;
                if (value === undefined) {
                    value = null;
                }
                if (_isEncodedBlob(value)) {
                    value = _decodeBlob(value);
                }
                resolve(value);
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Iterate over all items stored in database.
function iterate(iterator, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var req = store.openCursor();
            var iterationNumber = 1;

            req.onsuccess = function () {
                var cursor = req.result;

                if (cursor) {
                    var value = cursor.value;
                    if (_isEncodedBlob(value)) {
                        value = _decodeBlob(value);
                    }
                    var result = iterator(value, cursor.key, iterationNumber++);

                    if (result !== void 0) {
                        resolve(result);
                    } else {
                        cursor["continue"]();
                    }
                } else {
                    resolve();
                }
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);

    return promise;
}

function setItem(key, value, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        var dbInfo;
        self.ready().then(function () {
            dbInfo = self._dbInfo;
            if (value instanceof Blob) {
                return _checkBlobSupport(dbInfo.db).then(function (blobSupport) {
                    if (blobSupport) {
                        return value;
                    }
                    return _encodeBlob(value);
                });
            }
            return value;
        }).then(function (value) {
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);

            // The reason we don't _save_ null is because IE 10 does
            // not support saving the `null` type in IndexedDB. How
            // ironic, given the bug below!
            // See: https://github.com/mozilla/localForage/issues/161
            if (value === null) {
                value = undefined;
            }

            transaction.oncomplete = function () {
                // Cast to undefined so the value passed to
                // callback/promise is the same as what one would get out
                // of `getItem()` later. This leads to some weirdness
                // (setItem('foo', undefined) will return `null`), but
                // it's not my fault localStorage is our baseline and that
                // it's weird.
                if (value === undefined) {
                    value = null;
                }

                resolve(value);
            };
            transaction.onabort = transaction.onerror = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };

            var req = store.put(value, key);
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function removeItem(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);

            // We use a Grunt task to make this safe for IE and some
            // versions of Android (including those used by Cordova).
            // Normally IE won't like `.delete()` and will insist on
            // using `['delete']()`, but we have a build step that
            // fixes this for us now.
            var req = store["delete"](key);
            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onerror = function () {
                reject(req.error);
            };

            // The request will be also be aborted if we've exceeded our storage
            // space.
            transaction.onabort = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function clear(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);
            var req = store.clear();

            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onabort = transaction.onerror = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function length(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
            var req = store.count();

            req.onsuccess = function () {
                resolve(req.result);
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function key(n, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        if (n < 0) {
            resolve(null);

            return;
        }

        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var advanced = false;
            var req = store.openCursor();
            req.onsuccess = function () {
                var cursor = req.result;
                if (!cursor) {
                    // this means there weren't enough keys
                    resolve(null);

                    return;
                }

                if (n === 0) {
                    // We have the first key, return it if that's what they
                    // wanted.
                    resolve(cursor.key);
                } else {
                    if (!advanced) {
                        // Otherwise, ask the cursor to skip ahead n
                        // records.
                        advanced = true;
                        cursor.advance(n);
                    } else {
                        // When we get here, we've got the nth key.
                        resolve(cursor.key);
                    }
                }
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function keys(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var req = store.openCursor();
            var keys = [];

            req.onsuccess = function () {
                var cursor = req.result;

                if (!cursor) {
                    resolve(keys);
                    return;
                }

                keys.push(cursor.key);
                cursor["continue"]();
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

var asyncStorage = {
    _driver: 'asyncStorage',
    _initStorage: _initStorage,
    iterate: iterate,
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key,
    keys: keys
};

// Sadly, the best way to save binary data in WebSQL/localStorage is serializing
// it to Base64, so this is how we store it to prevent very strange errors with less
// verbose ways of binary <-> string data storage.
var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

var BLOB_TYPE_PREFIX = '~~local_forage_type~';
var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;

var SERIALIZED_MARKER = '__lfsc__:';
var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

// OMG the serializations!
var TYPE_ARRAYBUFFER = 'arbf';
var TYPE_BLOB = 'blob';
var TYPE_INT8ARRAY = 'si08';
var TYPE_UINT8ARRAY = 'ui08';
var TYPE_UINT8CLAMPEDARRAY = 'uic8';
var TYPE_INT16ARRAY = 'si16';
var TYPE_INT32ARRAY = 'si32';
var TYPE_UINT16ARRAY = 'ur16';
var TYPE_UINT32ARRAY = 'ui32';
var TYPE_FLOAT32ARRAY = 'fl32';
var TYPE_FLOAT64ARRAY = 'fl64';
var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

function stringToBuffer(serializedString) {
    // Fill the string into a ArrayBuffer.
    var bufferLength = serializedString.length * 0.75;
    var len = serializedString.length;
    var i;
    var p = 0;
    var encoded1, encoded2, encoded3, encoded4;

    if (serializedString[serializedString.length - 1] === '=') {
        bufferLength--;
        if (serializedString[serializedString.length - 2] === '=') {
            bufferLength--;
        }
    }

    var buffer = new ArrayBuffer(bufferLength);
    var bytes = new Uint8Array(buffer);

    for (i = 0; i < len; i += 4) {
        encoded1 = BASE_CHARS.indexOf(serializedString[i]);
        encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
        encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
        encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

        /*jslint bitwise: true */
        bytes[p++] = encoded1 << 2 | encoded2 >> 4;
        bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
        bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return buffer;
}

// Converts a buffer to a string to store, serialized, in the backend
// storage library.
function bufferToString(buffer) {
    // base64-arraybuffer
    var bytes = new Uint8Array(buffer);
    var base64String = '';
    var i;

    for (i = 0; i < bytes.length; i += 3) {
        /*jslint bitwise: true */
        base64String += BASE_CHARS[bytes[i] >> 2];
        base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
        base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
        base64String += BASE_CHARS[bytes[i + 2] & 63];
    }

    if (bytes.length % 3 === 2) {
        base64String = base64String.substring(0, base64String.length - 1) + '=';
    } else if (bytes.length % 3 === 1) {
        base64String = base64String.substring(0, base64String.length - 2) + '==';
    }

    return base64String;
}

// Serialize a value, afterwards executing a callback (which usually
// instructs the `setItem()` callback/promise to be executed). This is how
// we store binary data with localStorage.
function serialize(value, callback) {
    var valueString = '';
    if (value) {
        valueString = value.toString();
    }

    // Cannot use `value instanceof ArrayBuffer` or such here, as these
    // checks fail when running the tests using casper.js...
    //
    // TODO: See why those tests fail and use a better solution.
    if (value && (value.toString() === '[object ArrayBuffer]' || value.buffer && value.buffer.toString() === '[object ArrayBuffer]')) {
        // Convert binary arrays to a string and prefix the string with
        // a special marker.
        var buffer;
        var marker = SERIALIZED_MARKER;

        if (value instanceof ArrayBuffer) {
            buffer = value;
            marker += TYPE_ARRAYBUFFER;
        } else {
            buffer = value.buffer;

            if (valueString === '[object Int8Array]') {
                marker += TYPE_INT8ARRAY;
            } else if (valueString === '[object Uint8Array]') {
                marker += TYPE_UINT8ARRAY;
            } else if (valueString === '[object Uint8ClampedArray]') {
                marker += TYPE_UINT8CLAMPEDARRAY;
            } else if (valueString === '[object Int16Array]') {
                marker += TYPE_INT16ARRAY;
            } else if (valueString === '[object Uint16Array]') {
                marker += TYPE_UINT16ARRAY;
            } else if (valueString === '[object Int32Array]') {
                marker += TYPE_INT32ARRAY;
            } else if (valueString === '[object Uint32Array]') {
                marker += TYPE_UINT32ARRAY;
            } else if (valueString === '[object Float32Array]') {
                marker += TYPE_FLOAT32ARRAY;
            } else if (valueString === '[object Float64Array]') {
                marker += TYPE_FLOAT64ARRAY;
            } else {
                callback(new Error('Failed to get type for BinaryArray'));
            }
        }

        callback(marker + bufferToString(buffer));
    } else if (valueString === '[object Blob]') {
        // Conver the blob to a binaryArray and then to a string.
        var fileReader = new FileReader();

        fileReader.onload = function () {
            // Backwards-compatible prefix for the blob type.
            var str = BLOB_TYPE_PREFIX + value.type + '~' + bufferToString(this.result);

            callback(SERIALIZED_MARKER + TYPE_BLOB + str);
        };

        fileReader.readAsArrayBuffer(value);
    } else {
        try {
            callback(JSON.stringify(value));
        } catch (e) {
            console.error("Couldn't convert value into a JSON string: ", value);

            callback(null, e);
        }
    }
}

// Deserialize data we've inserted into a value column/field. We place
// special markers into our strings to mark them as encoded; this isn't
// as nice as a meta field, but it's the only sane thing we can do whilst
// keeping localStorage support intact.
//
// Oftentimes this will just deserialize JSON content, but if we have a
// special marker (SERIALIZED_MARKER, defined above), we will extract
// some kind of arraybuffer/binary data/typed array out of the string.
function deserialize(value) {
    // If we haven't marked this string as being specially serialized (i.e.
    // something other than serialized JSON), we can just return it and be
    // done with it.
    if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
        return JSON.parse(value);
    }

    // The following code deals with deserializing some kind of Blob or
    // TypedArray. First we separate out the type of data we're dealing
    // with from the data itself.
    var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
    var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);

    var blobType;
    // Backwards-compatible blob type serialization strategy.
    // DBs created with older versions of localForage will simply not have the blob type.
    if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
        var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
        blobType = matcher[1];
        serializedString = serializedString.substring(matcher[0].length);
    }
    var buffer = stringToBuffer(serializedString);

    // Return the right type based on the code/type set during
    // serialization.
    switch (type) {
        case TYPE_ARRAYBUFFER:
            return buffer;
        case TYPE_BLOB:
            return createBlob([buffer], { type: blobType });
        case TYPE_INT8ARRAY:
            return new Int8Array(buffer);
        case TYPE_UINT8ARRAY:
            return new Uint8Array(buffer);
        case TYPE_UINT8CLAMPEDARRAY:
            return new Uint8ClampedArray(buffer);
        case TYPE_INT16ARRAY:
            return new Int16Array(buffer);
        case TYPE_UINT16ARRAY:
            return new Uint16Array(buffer);
        case TYPE_INT32ARRAY:
            return new Int32Array(buffer);
        case TYPE_UINT32ARRAY:
            return new Uint32Array(buffer);
        case TYPE_FLOAT32ARRAY:
            return new Float32Array(buffer);
        case TYPE_FLOAT64ARRAY:
            return new Float64Array(buffer);
        default:
            throw new Error('Unkown type: ' + type);
    }
}

var localforageSerializer = {
    serialize: serialize,
    deserialize: deserialize,
    stringToBuffer: stringToBuffer,
    bufferToString: bufferToString
};

/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
// Open the WebSQL database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage$1(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] = typeof options[i] !== 'string' ? options[i].toString() : options[i];
        }
    }

    var dbInfoPromise = new Promise$1(function (resolve, reject) {
        // Open the database; the openDatabase API will automatically
        // create it for us if it doesn't exist.
        try {
            dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
        } catch (e) {
            return reject(e);
        }

        // Create our key/value table if it doesn't exist.
        dbInfo.db.transaction(function (t) {
            t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName + ' (id INTEGER PRIMARY KEY, key unique, value)', [], function () {
                self._dbInfo = dbInfo;
                resolve();
            }, function (t, error) {
                reject(error);
            });
        });
    });

    dbInfo.serializer = localforageSerializer;
    return dbInfoPromise;
}

function getItem$1(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT * FROM ' + dbInfo.storeName + ' WHERE key = ? LIMIT 1', [key], function (t, results) {
                    var result = results.rows.length ? results.rows.item(0).value : null;

                    // Check to see if this is serialized content we need to
                    // unpack.
                    if (result) {
                        result = dbInfo.serializer.deserialize(result);
                    }

                    resolve(result);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function iterate$1(iterator, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;

            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT * FROM ' + dbInfo.storeName, [], function (t, results) {
                    var rows = results.rows;
                    var length = rows.length;

                    for (var i = 0; i < length; i++) {
                        var item = rows.item(i);
                        var result = item.value;

                        // Check to see if this is serialized content
                        // we need to unpack.
                        if (result) {
                            result = dbInfo.serializer.deserialize(result);
                        }

                        result = iterator(result, item.key, i + 1);

                        // void(0) prevents problems with redefinition
                        // of `undefined`.
                        if (result !== void 0) {
                            resolve(result);
                            return;
                        }
                    }

                    resolve();
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function setItem$1(key, value, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            // The localStorage API doesn't return undefined values in an
            // "expected" way, so undefined is always cast to null in all
            // drivers. See: https://github.com/mozilla/localForage/pull/42
            if (value === undefined) {
                value = null;
            }

            // Save the original value to pass to the callback.
            var originalValue = value;

            var dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, function (value, error) {
                if (error) {
                    reject(error);
                } else {
                    dbInfo.db.transaction(function (t) {
                        t.executeSql('INSERT OR REPLACE INTO ' + dbInfo.storeName + ' (key, value) VALUES (?, ?)', [key, value], function () {
                            resolve(originalValue);
                        }, function (t, error) {
                            reject(error);
                        });
                    }, function (sqlError) {
                        // The transaction failed; check
                        // to see if it's a quota error.
                        if (sqlError.code === sqlError.QUOTA_ERR) {
                            // We reject the callback outright for now, but
                            // it's worth trying to re-run the transaction.
                            // Even if the user accepts the prompt to use
                            // more storage on Safari, this error will
                            // be called.
                            //
                            // TODO: Try to re-run the transaction.
                            reject(sqlError);
                        }
                    });
                }
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function removeItem$1(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('DELETE FROM ' + dbInfo.storeName + ' WHERE key = ?', [key], function () {
                    resolve();
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Deletes every item in the table.
// TODO: Find out if this resets the AUTO_INCREMENT number.
function clear$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('DELETE FROM ' + dbInfo.storeName, [], function () {
                    resolve();
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Does a simple `COUNT(key)` to get the number of items stored in
// localForage.
function length$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                // Ahhh, SQL makes this one soooooo easy.
                t.executeSql('SELECT COUNT(key) as c FROM ' + dbInfo.storeName, [], function (t, results) {
                    var result = results.rows.item(0).c;

                    resolve(result);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Return the key located at key index X; essentially gets the key from a
// `WHERE id = ?`. This is the most efficient way I can think to implement
// this rarely-used (in my experience) part of the API, but it can seem
// inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
// the ID of each key will change every time it's updated. Perhaps a stored
// procedure for the `setItem()` SQL would solve this problem?
// TODO: Don't change ID on `setItem()`.
function key$1(n, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT key FROM ' + dbInfo.storeName + ' WHERE id = ? LIMIT 1', [n + 1], function (t, results) {
                    var result = results.rows.length ? results.rows.item(0).key : null;
                    resolve(result);
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function keys$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT key FROM ' + dbInfo.storeName, [], function (t, results) {
                    var keys = [];

                    for (var i = 0; i < results.rows.length; i++) {
                        keys.push(results.rows.item(i).key);
                    }

                    resolve(keys);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

var webSQLStorage = {
    _driver: 'webSQLStorage',
    _initStorage: _initStorage$1,
    iterate: iterate$1,
    getItem: getItem$1,
    setItem: setItem$1,
    removeItem: removeItem$1,
    clear: clear$1,
    length: length$1,
    key: key$1,
    keys: keys$1
};

// Config the localStorage backend, using options set in the config.
function _initStorage$2(options) {
    var self = this;
    var dbInfo = {};
    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    dbInfo.keyPrefix = dbInfo.name + '/';

    if (dbInfo.storeName !== self._defaultConfig.storeName) {
        dbInfo.keyPrefix += dbInfo.storeName + '/';
    }

    self._dbInfo = dbInfo;
    dbInfo.serializer = localforageSerializer;

    return Promise$1.resolve();
}

// Remove all keys from the datastore, effectively destroying all data in
// the app's key/value store!
function clear$2(callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var keyPrefix = self._dbInfo.keyPrefix;

        for (var i = localStorage.length - 1; i >= 0; i--) {
            var key = localStorage.key(i);

            if (key.indexOf(keyPrefix) === 0) {
                localStorage.removeItem(key);
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Retrieve an item from the store. Unlike the original async_storage
// library in Gaia, we don't modify return values at all. If a key's value
// is `undefined`, we pass that value to the callback function.
function getItem$2(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var result = localStorage.getItem(dbInfo.keyPrefix + key);

        // If a result was found, parse it from the serialized
        // string into a JS object. If result isn't truthy, the key
        // is likely undefined and we'll pass it straight to the
        // callback.
        if (result) {
            result = dbInfo.serializer.deserialize(result);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

// Iterate over all items in the store.
function iterate$2(iterator, callback) {
    var self = this;

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var keyPrefix = dbInfo.keyPrefix;
        var keyPrefixLength = keyPrefix.length;
        var length = localStorage.length;

        // We use a dedicated iterator instead of the `i` variable below
        // so other keys we fetch in localStorage aren't counted in
        // the `iterationNumber` argument passed to the `iterate()`
        // callback.
        //
        // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
        var iterationNumber = 1;

        for (var i = 0; i < length; i++) {
            var key = localStorage.key(i);
            if (key.indexOf(keyPrefix) !== 0) {
                continue;
            }
            var value = localStorage.getItem(key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the
            // key is likely undefined and we'll pass it straight
            // to the iterator.
            if (value) {
                value = dbInfo.serializer.deserialize(value);
            }

            value = iterator(value, key.substring(keyPrefixLength), iterationNumber++);

            if (value !== void 0) {
                return value;
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Same as localStorage's key() method, except takes a callback.
function key$2(n, callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var result;
        try {
            result = localStorage.key(n);
        } catch (error) {
            result = null;
        }

        // Remove the prefix from the key, if a key is found.
        if (result) {
            result = result.substring(dbInfo.keyPrefix.length);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

function keys$2(callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var length = localStorage.length;
        var keys = [];

        for (var i = 0; i < length; i++) {
            if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
            }
        }

        return keys;
    });

    executeCallback(promise, callback);
    return promise;
}

// Supply the number of keys in the datastore to the callback function.
function length$2(callback) {
    var self = this;
    var promise = self.keys().then(function (keys) {
        return keys.length;
    });

    executeCallback(promise, callback);
    return promise;
}

// Remove an item from the store, nice and simple.
function removeItem$2(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        localStorage.removeItem(dbInfo.keyPrefix + key);
    });

    executeCallback(promise, callback);
    return promise;
}

// Set a key's value and run an optional callback once the value is set.
// Unlike Gaia's implementation, the callback function is passed the value,
// in case you want to operate on that value only after you're sure it
// saved, or something like that.
function setItem$2(key, value, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        // Convert undefined values to null.
        // https://github.com/mozilla/localForage/pull/42
        if (value === undefined) {
            value = null;
        }

        // Save the original value to pass to the callback.
        var originalValue = value;

        return new Promise$1(function (resolve, reject) {
            var dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, function (value, error) {
                if (error) {
                    reject(error);
                } else {
                    try {
                        localStorage.setItem(dbInfo.keyPrefix + key, value);
                        resolve(originalValue);
                    } catch (e) {
                        // localStorage capacity exceeded.
                        // TODO: Make this a specific error/event.
                        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                            reject(e);
                        }
                        reject(e);
                    }
                }
            });
        });
    });

    executeCallback(promise, callback);
    return promise;
}

var localStorageWrapper = {
    _driver: 'localStorageWrapper',
    _initStorage: _initStorage$2,
    // Default API, from Gaia/localStorage.
    iterate: iterate$2,
    getItem: getItem$2,
    setItem: setItem$2,
    removeItem: removeItem$2,
    clear: clear$2,
    length: length$2,
    key: key$2,
    keys: keys$2
};

function executeTwoCallbacks(promise, callback, errorCallback) {
    if (typeof callback === 'function') {
        promise.then(callback);
    }

    if (typeof errorCallback === 'function') {
        promise["catch"](errorCallback);
    }
}

// Custom drivers are stored here when `defineDriver()` is called.
// They are shared across all instances of localForage.
var CustomDrivers = {};

var DriverType = {
    INDEXEDDB: 'asyncStorage',
    LOCALSTORAGE: 'localStorageWrapper',
    WEBSQL: 'webSQLStorage'
};

var DefaultDriverOrder = [DriverType.INDEXEDDB, DriverType.WEBSQL, DriverType.LOCALSTORAGE];

var LibraryMethods = ['clear', 'getItem', 'iterate', 'key', 'keys', 'length', 'removeItem', 'setItem'];

var DefaultConfig = {
    description: '',
    driver: DefaultDriverOrder.slice(),
    name: 'localforage',
    // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
    // we can use without a prompt.
    size: 4980736,
    storeName: 'keyvaluepairs',
    version: 1.0
};

var driverSupport = {};
// Check to see if IndexedDB is available and if it is the latest
// implementation; it's our preferred backend library. We use "_spec_test"
// as the name of the database because it's not the one we'll operate on,
// but it's useful to make sure its using the right spec.
// See: https://github.com/mozilla/localForage/issues/128
driverSupport[DriverType.INDEXEDDB] = isIndexedDBValid();

driverSupport[DriverType.WEBSQL] = isWebSQLValid();

driverSupport[DriverType.LOCALSTORAGE] = isLocalStorageValid();

var isArray = Array.isArray || function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
};

function callWhenReady(localForageInstance, libraryMethod) {
    localForageInstance[libraryMethod] = function () {
        var _args = arguments;
        return localForageInstance.ready().then(function () {
            return localForageInstance[libraryMethod].apply(localForageInstance, _args);
        });
    };
}

function extend() {
    for (var i = 1; i < arguments.length; i++) {
        var arg = arguments[i];

        if (arg) {
            for (var key in arg) {
                if (arg.hasOwnProperty(key)) {
                    if (isArray(arg[key])) {
                        arguments[0][key] = arg[key].slice();
                    } else {
                        arguments[0][key] = arg[key];
                    }
                }
            }
        }
    }

    return arguments[0];
}

function isLibraryDriver(driverName) {
    for (var driver in DriverType) {
        if (DriverType.hasOwnProperty(driver) && DriverType[driver] === driverName) {
            return true;
        }
    }

    return false;
}

var LocalForage = function () {
    function LocalForage(options) {
        _classCallCheck(this, LocalForage);

        this.INDEXEDDB = DriverType.INDEXEDDB;
        this.LOCALSTORAGE = DriverType.LOCALSTORAGE;
        this.WEBSQL = DriverType.WEBSQL;

        this._defaultConfig = extend({}, DefaultConfig);
        this._config = extend({}, this._defaultConfig, options);
        this._driverSet = null;
        this._initDriver = null;
        this._ready = false;
        this._dbInfo = null;

        this._wrapLibraryMethodsWithReady();
        this.setDriver(this._config.driver);
    }

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.


    LocalForage.prototype.config = function config(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " + 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof options === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.


    LocalForage.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
        var promise = new Promise$1(function (resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error('Custom driver not compliant; see ' + 'https://mozilla.github.io/localForage/#definedriver');
                var namingError = new Error('Custom driver name already in use: ' + driverObject._driver);

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod || !driverObject[customDriverMethod] || typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise$1.resolve(true);
                if ('_support' in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise$1.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function (supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        executeTwoCallbacks(promise, callback, errorCallback);
        return promise;
    };

    LocalForage.prototype.driver = function driver() {
        return this._driver || null;
    };

    LocalForage.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
        var self = this;
        var getDriverPromise = Promise$1.resolve().then(function () {
            if (isLibraryDriver(driverName)) {
                switch (driverName) {
                    case self.INDEXEDDB:
                        return asyncStorage;
                    case self.LOCALSTORAGE:
                        return localStorageWrapper;
                    case self.WEBSQL:
                        return webSQLStorage;
                }
            } else if (CustomDrivers[driverName]) {
                return CustomDrivers[driverName];
            } else {
                throw new Error('Driver not found.');
            }
        });
        executeTwoCallbacks(getDriverPromise, callback, errorCallback);
        return getDriverPromise;
    };

    LocalForage.prototype.getSerializer = function getSerializer(callback) {
        var serializerPromise = Promise$1.resolve(localforageSerializer);
        executeTwoCallbacks(serializerPromise, callback);
        return serializerPromise;
    };

    LocalForage.prototype.ready = function ready(callback) {
        var self = this;

        var promise = self._driverSet.then(function () {
            if (self._ready === null) {
                self._ready = self._initDriver();
            }

            return self._ready;
        });

        executeTwoCallbacks(promise, callback, callback);
        return promise;
    };

    LocalForage.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
        var self = this;

        if (!isArray(drivers)) {
            drivers = [drivers];
        }

        var supportedDrivers = this._getSupportedDrivers(drivers);

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }

        function initDriver(supportedDrivers) {
            return function () {
                var currentDriverIndex = 0;

                function driverPromiseLoop() {
                    while (currentDriverIndex < supportedDrivers.length) {
                        var driverName = supportedDrivers[currentDriverIndex];
                        currentDriverIndex++;

                        self._dbInfo = null;
                        self._ready = null;

                        return self.getDriver(driverName).then(function (driver) {
                            self._extend(driver);
                            setDriverToConfig();

                            self._ready = self._initStorage(self._config);
                            return self._ready;
                        })["catch"](driverPromiseLoop);
                    }

                    setDriverToConfig();
                    var error = new Error('No available storage method found.');
                    self._driverSet = Promise$1.reject(error);
                    return self._driverSet;
                }

                return driverPromiseLoop();
            };
        }

        // There might be a driver initialization in progress
        // so wait for it to finish in order to avoid a possible
        // race condition to set _dbInfo
        var oldDriverSetDone = this._driverSet !== null ? this._driverSet["catch"](function () {
            return Promise$1.resolve();
        }) : Promise$1.resolve();

        this._driverSet = oldDriverSetDone.then(function () {
            var driverName = supportedDrivers[0];
            self._dbInfo = null;
            self._ready = null;

            return self.getDriver(driverName).then(function (driver) {
                self._driver = driver._driver;
                setDriverToConfig();
                self._wrapLibraryMethodsWithReady();
                self._initDriver = initDriver(supportedDrivers);
            });
        })["catch"](function () {
            setDriverToConfig();
            var error = new Error('No available storage method found.');
            self._driverSet = Promise$1.reject(error);
            return self._driverSet;
        });

        executeTwoCallbacks(this._driverSet, callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function supports(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function _extend(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    LocalForage.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
        var supportedDrivers = [];
        for (var i = 0, len = drivers.length; i < len; i++) {
            var driverName = drivers[i];
            if (this.supports(driverName)) {
                supportedDrivers.push(driverName);
            }
        }
        return supportedDrivers;
    };

    LocalForage.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }
    };

    LocalForage.prototype.createInstance = function createInstance(options) {
        return new LocalForage(options);
    };

    return LocalForage;
}();

// The actual localForage object that we expose as a module or via a
// global. It's extended by pulling in one of our other libraries.


var localforage_js = new LocalForage();

module.exports = localforage_js;

},{"3":3}]},{},[4])(4)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],33:[function(require,module,exports){
/**
 * Specific customUtils for the browser, where we don't have access to the Crypto and Buffer modules
 */

/**
 * Taken from the crypto-browserify module
 * https://github.com/dominictarr/crypto-browserify
 * NOTE: Math.random() does not guarantee "cryptographic quality" but we actually don't need it
 */
function randomBytes (size) {
  var bytes = new Array(size);
  var r;

  for (var i = 0, r; i < size; i++) {
    if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
    bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
  }

  return bytes;
}


/**
 * Taken from the base64-js module
 * https://github.com/beatgammit/base64-js/
 */
function byteArrayToBase64 (uint8) {
  var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    , extraBytes = uint8.length % 3   // if we have 1 byte left, pad 2 bytes
    , output = ""
    , temp, length, i;

  function tripletToBase64 (num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
  };

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
    temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output += tripletToBase64(temp);
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  switch (extraBytes) {
    case 1:
      temp = uint8[uint8.length - 1];
      output += lookup[temp >> 2];
      output += lookup[(temp << 4) & 0x3F];
      output += '==';
      break;
    case 2:
      temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
      output += lookup[temp >> 10];
      output += lookup[(temp >> 4) & 0x3F];
      output += lookup[(temp << 2) & 0x3F];
      output += '=';
      break;
  }

  return output;
}


/**
 * Return a random alphanumerical string of length len
 * There is a very small probability (less than 1/1,000,000) for the length to be less than len
 * (il the base64 conversion yields too many pluses and slashes) but
 * that's not an issue here
 * The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
 * See http://en.wikipedia.org/wiki/Birthday_problem
 */
function uid (len) {
  return byteArrayToBase64(randomBytes(Math.ceil(Math.max(8, len * 2)))).replace(/[+\/]/g, '').slice(0, len);
}



module.exports.uid = uid;

},{}],34:[function(require,module,exports){
/**
 * Way data is stored for this database
 * For a Node.js/Node Webkit database it's the file system
 * For a browser-side database it's localforage, which uses the best backend available (IndexedDB then WebSQL then localStorage)
 *
 * This version is the browser version
 */

var localforage = require('localforage')

// Configure localforage to display NeDB name for now. Would be a good idea to let user use his own app name
localforage.config({
  name: 'NeDB'
, storeName: 'nedbdata'
});


function exists (filename, callback) {
  localforage.getItem(filename, function (err, value) {
    if (value !== null) {   // Even if value is undefined, localforage returns null
      return callback(true);
    } else {
      return callback(false);
    }
  });
}


function rename (filename, newFilename, callback) {
  localforage.getItem(filename, function (err, value) {
    if (value === null) {
      localforage.removeItem(newFilename, function () { return callback(); });
    } else {
      localforage.setItem(newFilename, value, function () {
        localforage.removeItem(filename, function () { return callback(); });
      });
    }
  });
}


function writeFile (filename, contents, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }
  localforage.setItem(filename, contents, function () { return callback(); });
}


function appendFile (filename, toAppend, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }

  localforage.getItem(filename, function (err, contents) {
    contents = contents || '';
    contents += toAppend;
    localforage.setItem(filename, contents, function () { return callback(); });
  });
}


function readFile (filename, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }
  localforage.getItem(filename, function (err, contents) { return callback(null, contents || ''); });
}


function unlink (filename, callback) {
  localforage.removeItem(filename, function () { return callback(); });
}


// Nothing to do, no directories will be used on the browser
function mkdirp (dir, callback) {
  return callback();
}


// Nothing to do, no data corruption possible in the brower
function ensureDatafileIntegrity (filename, callback) {
  return callback(null);
}


// Interface
module.exports.exists = exists;
module.exports.rename = rename;
module.exports.writeFile = writeFile;
module.exports.crashSafeWriteFile = writeFile;   // No need for a crash safe function in the browser
module.exports.appendFile = appendFile;
module.exports.readFile = readFile;
module.exports.unlink = unlink;
module.exports.mkdirp = mkdirp;
module.exports.ensureDatafileIntegrity = ensureDatafileIntegrity;


},{"localforage":32}],35:[function(require,module,exports){
var Datastore = require('./lib/datastore');

module.exports = Datastore;

},{"./lib/datastore":37}],36:[function(require,module,exports){
/**
 * Manage access to data, be it to find, update or remove it
 */
var model = require('./model')
  , _ = require('underscore')
  ;



/**
 * Create a new cursor for this collection
 * @param {Datastore} db - The datastore this cursor is bound to
 * @param {Query} query - The query this cursor will operate on
 * @param {Function} execFn - Handler to be executed after cursor has found the results and before the callback passed to find/findOne/update/remove
 */
function Cursor (db, query, execFn) {
  this.db = db;
  this.query = query || {};
  if (execFn) { this.execFn = execFn; }
}


/**
 * Set a limit to the number of results
 */
Cursor.prototype.limit = function(limit) {
  this._limit = limit;
  return this;
};


/**
 * Skip a the number of results
 */
Cursor.prototype.skip = function(skip) {
  this._skip = skip;
  return this;
};


/**
 * Sort results of the query
 * @param {SortQuery} sortQuery - SortQuery is { field: order }, field can use the dot-notation, order is 1 for ascending and -1 for descending
 */
Cursor.prototype.sort = function(sortQuery) {
  this._sort = sortQuery;
  return this;
};


/**
 * Add the use of a projection
 * @param {Object} projection - MongoDB-style projection. {} means take all fields. Then it's { key1: 1, key2: 1 } to take only key1 and key2
 *                              { key1: 0, key2: 0 } to omit only key1 and key2. Except _id, you can't mix takes and omits
 */
Cursor.prototype.projection = function(projection) {
  this._projection = projection;
  return this;
};


/**
 * Apply the projection
 */
Cursor.prototype.project = function (candidates) {
  var res = [], self = this
    , keepId, action, keys
    ;

  if (this._projection === undefined || Object.keys(this._projection).length === 0) {
    return candidates;
  }

  keepId = this._projection._id === 0 ? false : true;
  this._projection = _.omit(this._projection, '_id');

  // Check for consistency
  keys = Object.keys(this._projection);
  keys.forEach(function (k) {
    if (action !== undefined && self._projection[k] !== action) { throw new Error("Can't both keep and omit fields except for _id"); }
    action = self._projection[k];
  });

  // Do the actual projection
  candidates.forEach(function (candidate) {
    var toPush;
    if (action === 1) {   // pick-type projection
      toPush = { $set: {} };
      keys.forEach(function (k) {
        toPush.$set[k] = model.getDotValue(candidate, k);
        if (toPush.$set[k] === undefined) { delete toPush.$set[k]; }
      });
      toPush = model.modify({}, toPush);
    } else {   // omit-type projection
      toPush = { $unset: {} };
      keys.forEach(function (k) { toPush.$unset[k] = true });
      toPush = model.modify(candidate, toPush);
    }
    if (keepId) {
      toPush._id = candidate._id;
    } else {
      delete toPush._id;
    }
    res.push(toPush);
  });

  return res;
};


/**
 * Get all matching elements
 * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
 * This is an internal function, use exec which uses the executor
 *
 * @param {Function} callback - Signature: err, results
 */
Cursor.prototype._exec = function(_callback) {
  var res = [], added = 0, skipped = 0, self = this
    , error = null
    , i, keys, key
    ;

  function callback (error, res) {
    if (self.execFn) {
      return self.execFn(error, res, _callback);
    } else {
      return _callback(error, res);
    }
  }

  this.db.getCandidates(this.query, function (err, candidates) {
    if (err) { return callback(err); }

    try {
      for (i = 0; i < candidates.length; i += 1) {
        if (model.match(candidates[i], self.query)) {
          // If a sort is defined, wait for the results to be sorted before applying limit and skip
          if (!self._sort) {
            if (self._skip && self._skip > skipped) {
              skipped += 1;
            } else {
              res.push(candidates[i]);
              added += 1;
              if (self._limit && self._limit <= added) { break; }
            }
          } else {
            res.push(candidates[i]);
          }
        }
      }
    } catch (err) {
      return callback(err);
    }

    // Apply all sorts
    if (self._sort) {
      keys = Object.keys(self._sort);

      // Sorting
      var criteria = [];
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        criteria.push({ key: key, direction: self._sort[key] });
      }
      res.sort(function(a, b) {
        var criterion, compare, i;
        for (i = 0; i < criteria.length; i++) {
          criterion = criteria[i];
          compare = criterion.direction * model.compareThings(model.getDotValue(a, criterion.key), model.getDotValue(b, criterion.key), self.db.compareStrings);
          if (compare !== 0) {
            return compare;
          }
        }
        return 0;
      });

      // Applying limit and skip
      var limit = self._limit || res.length
        , skip = self._skip || 0;

      res = res.slice(skip, skip + limit);
    }

    // Apply projection
    try {
      res = self.project(res);
    } catch (e) {
      error = e;
      res = undefined;
    }

    return callback(error, res);
  });
};

Cursor.prototype.exec = function () {
  this.db.executor.push({ this: this, fn: this._exec, arguments: arguments });
};



// Interface
module.exports = Cursor;

},{"./model":40,"underscore":42}],37:[function(require,module,exports){
var customUtils = require('./customUtils')
  , model = require('./model')
  , async = require('async')
  , Executor = require('./executor')
  , Index = require('./indexes')
  , util = require('util')
  , _ = require('underscore')
  , Persistence = require('./persistence')
  , Cursor = require('./cursor')
  ;


/**
 * Create a new collection
 * @param {String} options.filename Optional, datastore will be in-memory only if not provided
 * @param {Boolean} options.timestampData Optional, defaults to false. If set to true, createdAt and updatedAt will be created and populated automatically (if not specified by user)
 * @param {Boolean} options.inMemoryOnly Optional, defaults to false
 * @param {String} options.nodeWebkitAppName Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
 *                                            Node Webkit stores application data such as cookies and local storage (the best place to store data in my opinion)
 * @param {Boolean} options.autoload Optional, defaults to false
 * @param {Function} options.onload Optional, if autoload is used this will be called after the load database with the error object as parameter. If you don't pass it the error will be thrown
 * @param {Function} options.afterSerialization/options.beforeDeserialization Optional, serialization hooks
 * @param {Number} options.corruptAlertThreshold Optional, threshold after which an alert is thrown if too much data is corrupt
 * @param {Function} options.compareStrings Optional, string comparison function that overrides default for sorting
 *
 * Event Emitter - Events
 * * compaction.done - Fired whenever a compaction operation was finished
 */
function Datastore (options) {
  var filename;

  // Retrocompatibility with v0.6 and before
  if (typeof options === 'string') {
    filename = options;
    this.inMemoryOnly = false;   // Default
  } else {
    options = options || {};
    filename = options.filename;
    this.inMemoryOnly = options.inMemoryOnly || false;
    this.autoload = options.autoload || false;
    this.timestampData = options.timestampData || false;
  }

  // Determine whether in memory or persistent
  if (!filename || typeof filename !== 'string' || filename.length === 0) {
    this.filename = null;
    this.inMemoryOnly = true;
  } else {
    this.filename = filename;
  }

  // String comparison function
  this.compareStrings = options.compareStrings;

  // Persistence handling
  this.persistence = new Persistence({ db: this, nodeWebkitAppName: options.nodeWebkitAppName
                                      , afterSerialization: options.afterSerialization
                                      , beforeDeserialization: options.beforeDeserialization
                                      , corruptAlertThreshold: options.corruptAlertThreshold
                                      });

  // This new executor is ready if we don't use persistence
  // If we do, it will only be ready once loadDatabase is called
  this.executor = new Executor();
  if (this.inMemoryOnly) { this.executor.ready = true; }

  // Indexed by field name, dot notation can be used
  // _id is always indexed and since _ids are generated randomly the underlying
  // binary is always well-balanced
  this.indexes = {};
  this.indexes._id = new Index({ fieldName: '_id', unique: true });
  this.ttlIndexes = {};

  // Queue a load of the database right away and call the onload handler
  // By default (no onload handler), if there is an error there, no operation will be possible so warn the user by throwing an exception
  if (this.autoload) { this.loadDatabase(options.onload || function (err) {
    if (err) { throw err; }
  }); }
}

util.inherits(Datastore, require('events').EventEmitter);


/**
 * Load the database from the datafile, and trigger the execution of buffered commands if any
 */
Datastore.prototype.loadDatabase = function () {
  this.executor.push({ this: this.persistence, fn: this.persistence.loadDatabase, arguments: arguments }, true);
};


/**
 * Get an array of all the data in the database
 */
Datastore.prototype.getAllData = function () {
  return this.indexes._id.getAll();
};


/**
 * Reset all currently defined indexes
 */
Datastore.prototype.resetIndexes = function (newData) {
  var self = this;

  Object.keys(this.indexes).forEach(function (i) {
    self.indexes[i].reset(newData);
  });
};


/**
 * Ensure an index is kept for this field. Same parameters as lib/indexes
 * For now this function is synchronous, we need to test how much time it takes
 * We use an async API for consistency with the rest of the code
 * @param {String} options.fieldName
 * @param {Boolean} options.unique
 * @param {Boolean} options.sparse
 * @param {Number} options.expireAfterSeconds - Optional, if set this index becomes a TTL index (only works on Date fields, not arrays of Date)
 * @param {Function} cb Optional callback, signature: err
 */
Datastore.prototype.ensureIndex = function (options, cb) {
  var err
    , callback = cb || function () {};

  options = options || {};

  if (!options.fieldName) {
    err = new Error("Cannot create an index without a fieldName");
    err.missingFieldName = true;
    return callback(err);
  }
  if (this.indexes[options.fieldName]) { return callback(null); }

  this.indexes[options.fieldName] = new Index(options);
  if (options.expireAfterSeconds !== undefined) { this.ttlIndexes[options.fieldName] = options.expireAfterSeconds; }   // With this implementation index creation is not necessary to ensure TTL but we stick with MongoDB's API here

  try {
    this.indexes[options.fieldName].insert(this.getAllData());
  } catch (e) {
    delete this.indexes[options.fieldName];
    return callback(e);
  }

  // We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
  this.persistence.persistNewState([{ $$indexCreated: options }], function (err) {
    if (err) { return callback(err); }
    return callback(null);
  });
};


/**
 * Remove an index
 * @param {String} fieldName
 * @param {Function} cb Optional callback, signature: err
 */
Datastore.prototype.removeIndex = function (fieldName, cb) {
  var callback = cb || function () {};

  delete this.indexes[fieldName];

  this.persistence.persistNewState([{ $$indexRemoved: fieldName }], function (err) {
    if (err) { return callback(err); }
    return callback(null);
  });
};


/**
 * Add one or several document(s) to all indexes
 */
Datastore.prototype.addToIndexes = function (doc) {
  var i, failingIndex, error
    , keys = Object.keys(this.indexes)
    ;

  for (i = 0; i < keys.length; i += 1) {
    try {
      this.indexes[keys[i]].insert(doc);
    } catch (e) {
      failingIndex = i;
      error = e;
      break;
    }
  }

  // If an error happened, we need to rollback the insert on all other indexes
  if (error) {
    for (i = 0; i < failingIndex; i += 1) {
      this.indexes[keys[i]].remove(doc);
    }

    throw error;
  }
};


/**
 * Remove one or several document(s) from all indexes
 */
Datastore.prototype.removeFromIndexes = function (doc) {
  var self = this;

  Object.keys(this.indexes).forEach(function (i) {
    self.indexes[i].remove(doc);
  });
};


/**
 * Update one or several documents in all indexes
 * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
 * If one update violates a constraint, all changes are rolled back
 */
Datastore.prototype.updateIndexes = function (oldDoc, newDoc) {
  var i, failingIndex, error
    , keys = Object.keys(this.indexes)
    ;

  for (i = 0; i < keys.length; i += 1) {
    try {
      this.indexes[keys[i]].update(oldDoc, newDoc);
    } catch (e) {
      failingIndex = i;
      error = e;
      break;
    }
  }

  // If an error happened, we need to rollback the update on all other indexes
  if (error) {
    for (i = 0; i < failingIndex; i += 1) {
      this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
    }

    throw error;
  }
};


/**
 * Return the list of candidates for a given query
 * Crude implementation for now, we return the candidates given by the first usable index if any
 * We try the following query types, in this order: basic match, $in match, comparison match
 * One way to make it better would be to enable the use of multiple indexes if the first usable index
 * returns too much data. I may do it in the future.
 *
 * Returned candidates will be scanned to find and remove all expired documents
 *
 * @param {Query} query
 * @param {Boolean} dontExpireStaleDocs Optional, defaults to false, if true don't remove stale docs. Useful for the remove function which shouldn't be impacted by expirations
 * @param {Function} callback Signature err, docs
 */
Datastore.prototype.getCandidates = function (query, dontExpireStaleDocs, callback) {
  var indexNames = Object.keys(this.indexes)
    , self = this
    , usableQueryKeys;

  if (typeof dontExpireStaleDocs === 'function') {
    callback = dontExpireStaleDocs;
    dontExpireStaleDocs = false;
  }

  async.waterfall([
  // STEP 1: get candidates list by checking indexes from most to least frequent usecase
  function (cb) {
    // For a basic match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (typeof query[k] === 'string' || typeof query[k] === 'number' || typeof query[k] === 'boolean' || util.isDate(query[k]) || query[k] === null) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]));
    }

    // For a $in match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (query[k] && query[k].hasOwnProperty('$in')) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in));
    }

    // For a comparison match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (query[k] && (query[k].hasOwnProperty('$lt') || query[k].hasOwnProperty('$lte') || query[k].hasOwnProperty('$gt') || query[k].hasOwnProperty('$gte'))) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]));
    }

    // By default, return all the DB data
    return cb(null, self.getAllData());
  }
  // STEP 2: remove all expired documents
  , function (docs) {
    if (dontExpireStaleDocs) { return callback(null, docs); }

    var expiredDocsIds = [], validDocs = [], ttlIndexesFieldNames = Object.keys(self.ttlIndexes);

    docs.forEach(function (doc) {
      var valid = true;
      ttlIndexesFieldNames.forEach(function (i) {
        if (doc[i] !== undefined && util.isDate(doc[i]) && Date.now() > doc[i].getTime() + self.ttlIndexes[i] * 1000) {
          valid = false;
        }
      });
      if (valid) { validDocs.push(doc); } else { expiredDocsIds.push(doc._id); }
    });

    async.eachSeries(expiredDocsIds, function (_id, cb) {
      self._remove({ _id: _id }, {}, function (err) {
        if (err) { return callback(err); }
        return cb();
      });
    }, function (err) {
      return callback(null, validDocs);
    });
  }]);
};


/**
 * Insert a new document
 * @param {Function} cb Optional callback, signature: err, insertedDoc
 *
 * @api private Use Datastore.insert which has the same signature
 */
Datastore.prototype._insert = function (newDoc, cb) {
  var callback = cb || function () {}
    , preparedDoc
    ;

  try {
    preparedDoc = this.prepareDocumentForInsertion(newDoc)
    this._insertInCache(preparedDoc);
  } catch (e) {
    return callback(e);
  }

  this.persistence.persistNewState(util.isArray(preparedDoc) ? preparedDoc : [preparedDoc], function (err) {
    if (err) { return callback(err); }
    return callback(null, model.deepCopy(preparedDoc));
  });
};

/**
 * Create a new _id that's not already in use
 */
Datastore.prototype.createNewId = function () {
  var tentativeId = customUtils.uid(16);
  // Try as many times as needed to get an unused _id. As explained in customUtils, the probability of this ever happening is extremely small, so this is O(1)
  if (this.indexes._id.getMatching(tentativeId).length > 0) {
    tentativeId = this.createNewId();
  }
  return tentativeId;
};

/**
 * Prepare a document (or array of documents) to be inserted in a database
 * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
 * @api private
 */
Datastore.prototype.prepareDocumentForInsertion = function (newDoc) {
  var preparedDoc, self = this;

  if (util.isArray(newDoc)) {
    preparedDoc = [];
    newDoc.forEach(function (doc) { preparedDoc.push(self.prepareDocumentForInsertion(doc)); });
  } else {
    preparedDoc = model.deepCopy(newDoc);
    if (preparedDoc._id === undefined) { preparedDoc._id = this.createNewId(); }
    var now = new Date();
    if (this.timestampData && preparedDoc.createdAt === undefined) { preparedDoc.createdAt = now; }
    if (this.timestampData && preparedDoc.updatedAt === undefined) { preparedDoc.updatedAt = now; }
    model.checkObject(preparedDoc);
  }

  return preparedDoc;
};

/**
 * If newDoc is an array of documents, this will insert all documents in the cache
 * @api private
 */
Datastore.prototype._insertInCache = function (preparedDoc) {
  if (util.isArray(preparedDoc)) {
    this._insertMultipleDocsInCache(preparedDoc);
  } else {
    this.addToIndexes(preparedDoc);
  }
};

/**
 * If one insertion fails (e.g. because of a unique constraint), roll back all previous
 * inserts and throws the error
 * @api private
 */
Datastore.prototype._insertMultipleDocsInCache = function (preparedDocs) {
  var i, failingI, error;

  for (i = 0; i < preparedDocs.length; i += 1) {
    try {
      this.addToIndexes(preparedDocs[i]);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.removeFromIndexes(preparedDocs[i]);
    }

    throw error;
  }
};

Datastore.prototype.insert = function () {
  this.executor.push({ this: this, fn: this._insert, arguments: arguments });
};


/**
 * Count all documents matching the query
 * @param {Object} query MongoDB-style query
 */
Datastore.prototype.count = function(query, callback) {
  var cursor = new Cursor(this, query, function(err, docs, callback) {
    if (err) { return callback(err); }
    return callback(null, docs.length);
  });

  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Find all documents matching the query
 * If no callback is passed, we return the cursor so that user can limit, skip and finally exec
 * @param {Object} query MongoDB-style query
 * @param {Object} projection MongoDB-style projection
 */
Datastore.prototype.find = function (query, projection, callback) {
  switch (arguments.length) {
    case 1:
      projection = {};
      // callback is undefined, will return a cursor
      break;
    case 2:
      if (typeof projection === 'function') {
        callback = projection;
        projection = {};
      }   // If not assume projection is an object and callback undefined
      break;
  }

  var cursor = new Cursor(this, query, function(err, docs, callback) {
    var res = [], i;

    if (err) { return callback(err); }

    for (i = 0; i < docs.length; i += 1) {
      res.push(model.deepCopy(docs[i]));
    }
    return callback(null, res);
  });

  cursor.projection(projection);
  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Find one document matching the query
 * @param {Object} query MongoDB-style query
 * @param {Object} projection MongoDB-style projection
 */
Datastore.prototype.findOne = function (query, projection, callback) {
  switch (arguments.length) {
    case 1:
      projection = {};
      // callback is undefined, will return a cursor
      break;
    case 2:
      if (typeof projection === 'function') {
        callback = projection;
        projection = {};
      }   // If not assume projection is an object and callback undefined
      break;
  }

  var cursor = new Cursor(this, query, function(err, docs, callback) {
    if (err) { return callback(err); }
    if (docs.length === 1) {
      return callback(null, model.deepCopy(docs[0]));
    } else {
      return callback(null, null);
    }
  });

  cursor.projection(projection).limit(1);
  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Update all docs matching query
 * @param {Object} query
 * @param {Object} updateQuery
 * @param {Object} options Optional options
 *                 options.multi If true, can update multiple documents (defaults to false)
 *                 options.upsert If true, document is inserted if the query doesn't match anything
 *                 options.returnUpdatedDocs Defaults to false, if true return as third argument the array of updated matched documents (even if no change actually took place)
 * @param {Function} cb Optional callback, signature: (err, numAffected, affectedDocuments, upsert)
 *                      If update was an upsert, upsert flag is set to true
 *                      affectedDocuments can be one of the following:
 *                        * For an upsert, the upserted document
 *                        * For an update with returnUpdatedDocs option false, null
 *                        * For an update with returnUpdatedDocs true and multi false, the updated document
 *                        * For an update with returnUpdatedDocs true and multi true, the array of updated documents
 *
 * WARNING: The API was changed between v1.7.4 and v1.8, for consistency and readability reasons. Prior and including to v1.7.4,
 *          the callback signature was (err, numAffected, updated) where updated was the updated document in case of an upsert
 *          or the array of updated documents for an update if the returnUpdatedDocs option was true. That meant that the type of
 *          affectedDocuments in a non multi update depended on whether there was an upsert or not, leaving only two ways for the
 *          user to check whether an upsert had occured: checking the type of affectedDocuments or running another find query on
 *          the whole dataset to check its size. Both options being ugly, the breaking change was necessary.
 *
 * @api private Use Datastore.update which has the same signature
 */
Datastore.prototype._update = function (query, updateQuery, options, cb) {
  var callback
    , self = this
    , numReplaced = 0
    , multi, upsert
    , i
    ;

  if (typeof options === 'function') { cb = options; options = {}; }
  callback = cb || function () {};
  multi = options.multi !== undefined ? options.multi : false;
  upsert = options.upsert !== undefined ? options.upsert : false;

  async.waterfall([
  function (cb) {   // If upsert option is set, check whether we need to insert the doc
    if (!upsert) { return cb(); }

    // Need to use an internal function not tied to the executor to avoid deadlock
    var cursor = new Cursor(self, query);
    cursor.limit(1)._exec(function (err, docs) {
      if (err) { return callback(err); }
      if (docs.length === 1) {
        return cb();
      } else {
        var toBeInserted;

        try {
          model.checkObject(updateQuery);
          // updateQuery is a simple object with no modifier, use it as the document to insert
          toBeInserted = updateQuery;
        } catch (e) {
          // updateQuery contains modifiers, use the find query as the base,
          // strip it from all operators and update it according to updateQuery
          try {
            toBeInserted = model.modify(model.deepCopy(query, true), updateQuery);
          } catch (err) {
            return callback(err);
          }
        }

        return self._insert(toBeInserted, function (err, newDoc) {
          if (err) { return callback(err); }
          return callback(null, 1, newDoc, true);
        });
      }
    });
  }
  , function () {   // Perform the update
    var modifiedDoc , modifications = [], createdAt;

    self.getCandidates(query, function (err, candidates) {
      if (err) { return callback(err); }

      // Preparing update (if an error is thrown here neither the datafile nor
      // the in-memory indexes are affected)
      try {
        for (i = 0; i < candidates.length; i += 1) {
          if (model.match(candidates[i], query) && (multi || numReplaced === 0)) {
            numReplaced += 1;
            if (self.timestampData) { createdAt = candidates[i].createdAt; }
            modifiedDoc = model.modify(candidates[i], updateQuery);
            if (self.timestampData) {
              modifiedDoc.createdAt = createdAt;
              modifiedDoc.updatedAt = new Date();
            }
            modifications.push({ oldDoc: candidates[i], newDoc: modifiedDoc });
          }
        }
      } catch (err) {
        return callback(err);
      }

      // Change the docs in memory
      try {
        self.updateIndexes(modifications);
      } catch (err) {
        return callback(err);
      }

      // Update the datafile
      var updatedDocs = _.pluck(modifications, 'newDoc');
      self.persistence.persistNewState(updatedDocs, function (err) {
        if (err) { return callback(err); }
        if (!options.returnUpdatedDocs) {
          return callback(null, numReplaced);
        } else {
          var updatedDocsDC = [];
          updatedDocs.forEach(function (doc) { updatedDocsDC.push(model.deepCopy(doc)); });
          if (! multi) { updatedDocsDC = updatedDocsDC[0]; }
          return callback(null, numReplaced, updatedDocsDC);
        }
      });
    });
  }]);
};

Datastore.prototype.update = function () {
  this.executor.push({ this: this, fn: this._update, arguments: arguments });
};


/**
 * Remove all docs matching the query
 * For now very naive implementation (similar to update)
 * @param {Object} query
 * @param {Object} options Optional options
 *                 options.multi If true, can update multiple documents (defaults to false)
 * @param {Function} cb Optional callback, signature: err, numRemoved
 *
 * @api private Use Datastore.remove which has the same signature
 */
Datastore.prototype._remove = function (query, options, cb) {
  var callback
    , self = this, numRemoved = 0, removedDocs = [], multi
    ;

  if (typeof options === 'function') { cb = options; options = {}; }
  callback = cb || function () {};
  multi = options.multi !== undefined ? options.multi : false;

  this.getCandidates(query, true, function (err, candidates) {
    if (err) { return callback(err); }

    try {
      candidates.forEach(function (d) {
        if (model.match(d, query) && (multi || numRemoved === 0)) {
          numRemoved += 1;
          removedDocs.push({ $$deleted: true, _id: d._id });
          self.removeFromIndexes(d);
        }
      });
    } catch (err) { return callback(err); }

    self.persistence.persistNewState(removedDocs, function (err) {
      if (err) { return callback(err); }
      return callback(null, numRemoved);
    });
  });
};

Datastore.prototype.remove = function () {
  this.executor.push({ this: this, fn: this._remove, arguments: arguments });
};



module.exports = Datastore;

},{"./cursor":36,"./customUtils":33,"./executor":38,"./indexes":39,"./model":40,"./persistence":41,"async":21,"events":26,"underscore":42,"util":31}],38:[function(require,module,exports){
(function (process){
/**
 * Responsible for sequentially executing actions on the database
 */

var async = require('async')
  ;

function Executor () {
  this.buffer = [];
  this.ready = false;

  // This queue will execute all commands, one-by-one in order
  this.queue = async.queue(function (task, cb) {
    var newArguments = [];

    // task.arguments is an array-like object on which adding a new field doesn't work, so we transform it into a real array
    for (var i = 0; i < task.arguments.length; i += 1) { newArguments.push(task.arguments[i]); }
    var lastArg = task.arguments[task.arguments.length - 1];

    // Always tell the queue task is complete. Execute callback if any was given.
    if (typeof lastArg === 'function') {
      // Callback was supplied
      newArguments[newArguments.length - 1] = function () {
        if (typeof setImmediate === 'function') {
           setImmediate(cb);
        } else {
          process.nextTick(cb);
        }
        lastArg.apply(null, arguments);
      };
    } else if (!lastArg && task.arguments.length !== 0) {
      // false/undefined/null supplied as callbback
      newArguments[newArguments.length - 1] = function () { cb(); };
    } else {
      // Nothing supplied as callback
      newArguments.push(function () { cb(); });
    }


    task.fn.apply(task.this, newArguments);
  }, 1);
}


/**
 * If executor is ready, queue task (and process it immediately if executor was idle)
 * If not, buffer task for later processing
 * @param {Object} task
 *                 task.this - Object to use as this
 *                 task.fn - Function to execute
 *                 task.arguments - Array of arguments, IMPORTANT: only the last argument may be a function (the callback)
 *                                                                 and the last argument cannot be false/undefined/null
 * @param {Boolean} forceQueuing Optional (defaults to false) force executor to queue task even if it is not ready
 */
Executor.prototype.push = function (task, forceQueuing) {
  if (this.ready || forceQueuing) {
    this.queue.push(task);
  } else {
    this.buffer.push(task);
  }
};


/**
 * Queue all tasks in buffer (in the same order they came in)
 * Automatically sets executor as ready
 */
Executor.prototype.processBuffer = function () {
  var i;
  this.ready = true;
  for (i = 0; i < this.buffer.length; i += 1) { this.queue.push(this.buffer[i]); }
  this.buffer = [];
};



// Interface
module.exports = Executor;

}).call(this,require('_process'))
},{"_process":29,"async":21}],39:[function(require,module,exports){
var BinarySearchTree = require('binary-search-tree').AVLTree
  , model = require('./model')
  , _ = require('underscore')
  , util = require('util')
  ;

/**
 * Two indexed pointers are equal iif they point to the same place
 */
function checkValueEquality (a, b) {
  return a === b;
}

/**
 * Type-aware projection
 */
function projectForUnique (elt) {
  if (elt === null) { return '$null'; }
  if (typeof elt === 'string') { return '$string' + elt; }
  if (typeof elt === 'boolean') { return '$boolean' + elt; }
  if (typeof elt === 'number') { return '$number' + elt; }
  if (util.isArray(elt)) { return '$date' + elt.getTime(); }

  return elt;   // Arrays and objects, will check for pointer equality
}


/**
 * Create a new index
 * All methods on an index guarantee that either the whole operation was successful and the index changed
 * or the operation was unsuccessful and an error is thrown while the index is unchanged
 * @param {String} options.fieldName On which field should the index apply (can use dot notation to index on sub fields)
 * @param {Boolean} options.unique Optional, enforce a unique constraint (default: false)
 * @param {Boolean} options.sparse Optional, allow a sparse index (we can have documents for which fieldName is undefined) (default: false)
 */
function Index (options) {
  this.fieldName = options.fieldName;
  this.unique = options.unique || false;
  this.sparse = options.sparse || false;

  this.treeOptions = { unique: this.unique, compareKeys: model.compareThings, checkValueEquality: checkValueEquality };

  this.reset();   // No data in the beginning
}


/**
 * Reset an index
 * @param {Document or Array of documents} newData Optional, data to initialize the index with
 *                                                 If an error is thrown during insertion, the index is not modified
 */
Index.prototype.reset = function (newData) {
  this.tree = new BinarySearchTree(this.treeOptions);

  if (newData) { this.insert(newData); }
};


/**
 * Insert a new document in the index
 * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
 * O(log(n))
 */
Index.prototype.insert = function (doc) {
  var key, self = this
    , keys, i, failingI, error
    ;

  if (util.isArray(doc)) { this.insertMultipleDocs(doc); return; }

  key = model.getDotValue(doc, this.fieldName);

  // We don't index documents that don't contain the field if the index is sparse
  if (key === undefined && this.sparse) { return; }

  if (!util.isArray(key)) {
    this.tree.insert(key, doc);
  } else {
    // If an insert fails due to a unique constraint, roll back all inserts before it
    keys = _.uniq(key, projectForUnique);

    for (i = 0; i < keys.length; i += 1) {
      try {
        this.tree.insert(keys[i], doc);
      } catch (e) {
        error = e;
        failingI = i;
        break;
      }
    }

    if (error) {
      for (i = 0; i < failingI; i += 1) {
        this.tree.delete(keys[i], doc);
      }

      throw error;
    }
  }
};


/**
 * Insert an array of documents in the index
 * If a constraint is violated, the changes should be rolled back and an error thrown
 *
 * @API private
 */
Index.prototype.insertMultipleDocs = function (docs) {
  var i, error, failingI;

  for (i = 0; i < docs.length; i += 1) {
    try {
      this.insert(docs[i]);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.remove(docs[i]);
    }

    throw error;
  }
};


/**
 * Remove a document from the index
 * If an array is passed, we remove all its elements
 * The remove operation is safe with regards to the 'unique' constraint
 * O(log(n))
 */
Index.prototype.remove = function (doc) {
  var key, self = this;

  if (util.isArray(doc)) { doc.forEach(function (d) { self.remove(d); }); return; }

  key = model.getDotValue(doc, this.fieldName);

  if (key === undefined && this.sparse) { return; }

  if (!util.isArray(key)) {
    this.tree.delete(key, doc);
  } else {
    _.uniq(key, projectForUnique).forEach(function (_key) {
      self.tree.delete(_key, doc);
    });
  }
};


/**
 * Update a document in the index
 * If a constraint is violated, changes are rolled back and an error thrown
 * Naive implementation, still in O(log(n))
 */
Index.prototype.update = function (oldDoc, newDoc) {
  if (util.isArray(oldDoc)) { this.updateMultipleDocs(oldDoc); return; }

  this.remove(oldDoc);

  try {
    this.insert(newDoc);
  } catch (e) {
    this.insert(oldDoc);
    throw e;
  }
};


/**
 * Update multiple documents in the index
 * If a constraint is violated, the changes need to be rolled back
 * and an error thrown
 * @param {Array of oldDoc, newDoc pairs} pairs
 *
 * @API private
 */
Index.prototype.updateMultipleDocs = function (pairs) {
  var i, failingI, error;

  for (i = 0; i < pairs.length; i += 1) {
    this.remove(pairs[i].oldDoc);
  }

  for (i = 0; i < pairs.length; i += 1) {
    try {
      this.insert(pairs[i].newDoc);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  // If an error was raised, roll back changes in the inverse order
  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.remove(pairs[i].newDoc);
    }

    for (i = 0; i < pairs.length; i += 1) {
      this.insert(pairs[i].oldDoc);
    }

    throw error;
  }
};


/**
 * Revert an update
 */
Index.prototype.revertUpdate = function (oldDoc, newDoc) {
  var revert = [];

  if (!util.isArray(oldDoc)) {
    this.update(newDoc, oldDoc);
  } else {
    oldDoc.forEach(function (pair) {
      revert.push({ oldDoc: pair.newDoc, newDoc: pair.oldDoc });
    });
    this.update(revert);
  }
};


/**
 * Get all documents in index whose key match value (if it is a Thing) or one of the elements of value (if it is an array of Things)
 * @param {Thing} value Value to match the key against
 * @return {Array of documents}
 */
Index.prototype.getMatching = function (value) {
  var self = this;

  if (!util.isArray(value)) {
    return self.tree.search(value);
  } else {
    var _res = {}, res = [];

    value.forEach(function (v) {
      self.getMatching(v).forEach(function (doc) {
        _res[doc._id] = doc;
      });
    });

    Object.keys(_res).forEach(function (_id) {
      res.push(_res[_id]);
    });

    return res;
  }
};


/**
 * Get all documents in index whose key is between bounds are they are defined by query
 * Documents are sorted by key
 * @param {Query} query
 * @return {Array of documents}
 */
Index.prototype.getBetweenBounds = function (query) {
  return this.tree.betweenBounds(query);
};


/**
 * Get all elements in the index
 * @return {Array of documents}
 */
Index.prototype.getAll = function () {
  var res = [];

  this.tree.executeOnEveryNode(function (node) {
    var i;

    for (i = 0; i < node.data.length; i += 1) {
      res.push(node.data[i]);
    }
  });

  return res;
};




// Interface
module.exports = Index;

},{"./model":40,"binary-search-tree":22,"underscore":42,"util":31}],40:[function(require,module,exports){
/**
 * Handle models (i.e. docs)
 * Serialization/deserialization
 * Copying
 * Querying, update
 */

var util = require('util')
  , _ = require('underscore')
  , modifierFunctions = {}
  , lastStepModifierFunctions = {}
  , comparisonFunctions = {}
  , logicalOperators = {}
  , arrayComparisonFunctions = {}
  ;


/**
 * Check a key, throw an error if the key is non valid
 * @param {String} k key
 * @param {Model} v value, needed to treat the Date edge case
 * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
 * Its serialized-then-deserialized version it will transformed into a Date object
 * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
 */
function checkKey (k, v) {
  if (typeof k === 'number') {
    k = k.toString();
  }

  if (k[0] === '$' && !(k === '$$date' && typeof v === 'number') && !(k === '$$deleted' && v === true) && !(k === '$$indexCreated') && !(k === '$$indexRemoved')) {
    throw new Error('Field names cannot begin with the $ character');
  }

  if (k.indexOf('.') !== -1) {
    throw new Error('Field names cannot contain a .');
  }
}


/**
 * Check a DB object and throw an error if it's not valid
 * Works by applying the above checkKey function to all fields recursively
 */
function checkObject (obj) {
  if (util.isArray(obj)) {
    obj.forEach(function (o) {
      checkObject(o);
    });
  }

  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(function (k) {
      checkKey(k, obj[k]);
      checkObject(obj[k]);
    });
  }
}


/**
 * Serialize an object to be persisted to a one-line string
 * For serialization/deserialization, we use the native JSON parser and not eval or Function
 * That gives us less freedom but data entered in the database may come from users
 * so eval and the like are not safe
 * Accepted primitive types: Number, String, Boolean, Date, null
 * Accepted secondary types: Objects, Arrays
 */
function serialize (obj) {
  var res;

  res = JSON.stringify(obj, function (k, v) {
    checkKey(k, v);

    if (v === undefined) { return undefined; }
    if (v === null) { return null; }

    // Hackish way of checking if object is Date (this way it works between execution contexts in node-webkit).
    // We can't use value directly because for dates it is already string in this function (date.toJSON was already called), so we use this
    if (typeof this[k].getTime === 'function') { return { $$date: this[k].getTime() }; }

    return v;
  });

  return res;
}


/**
 * From a one-line representation of an object generate by the serialize function
 * Return the object itself
 */
function deserialize (rawData) {
  return JSON.parse(rawData, function (k, v) {
    if (k === '$$date') { return new Date(v); }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) { return v; }
    if (v && v.$$date) { return v.$$date; }

    return v;
  });
}


/**
 * Deep copy a DB object
 * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
 * where the keys are valid, i.e. don't begin with $ and don't contain a .
 */
function deepCopy (obj, strictKeys) {
  var res;

  if ( typeof obj === 'boolean' ||
       typeof obj === 'number' ||
       typeof obj === 'string' ||
       obj === null ||
       (util.isDate(obj)) ) {
    return obj;
  }

  if (util.isArray(obj)) {
    res = [];
    obj.forEach(function (o) { res.push(deepCopy(o, strictKeys)); });
    return res;
  }

  if (typeof obj === 'object') {
    res = {};
    Object.keys(obj).forEach(function (k) {
      if (!strictKeys || (k[0] !== '$' && k.indexOf('.') === -1)) {
        res[k] = deepCopy(obj[k], strictKeys);
      }
    });
    return res;
  }

  return undefined;   // For now everything else is undefined. We should probably throw an error instead
}


/**
 * Tells if an object is a primitive type or a "real" object
 * Arrays are considered primitive
 */
function isPrimitiveType (obj) {
  return ( typeof obj === 'boolean' ||
       typeof obj === 'number' ||
       typeof obj === 'string' ||
       obj === null ||
       util.isDate(obj) ||
       util.isArray(obj));
}


/**
 * Utility functions for comparing things
 * Assumes type checking was already done (a and b already have the same type)
 * compareNSB works for numbers, strings and booleans
 */
function compareNSB (a, b) {
  if (a < b) { return -1; }
  if (a > b) { return 1; }
  return 0;
}

function compareArrays (a, b) {
  var i, comp;

  for (i = 0; i < Math.min(a.length, b.length); i += 1) {
    comp = compareThings(a[i], b[i]);

    if (comp !== 0) { return comp; }
  }

  // Common section was identical, longest one wins
  return compareNSB(a.length, b.length);
}


/**
 * Compare { things U undefined }
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * We need to compare with undefined as it will be used in indexes
 * In the case of objects and arrays, we deep-compare
 * If two objects dont have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
 * Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
 *
 * @param {Function} _compareStrings String comparing function, returning -1, 0 or 1, overriding default string comparison (useful for languages with accented letters)
 */
function compareThings (a, b, _compareStrings) {
  var aKeys, bKeys, comp, i
    , compareStrings = _compareStrings || compareNSB;

  // undefined
  if (a === undefined) { return b === undefined ? 0 : -1; }
  if (b === undefined) { return a === undefined ? 0 : 1; }

  // null
  if (a === null) { return b === null ? 0 : -1; }
  if (b === null) { return a === null ? 0 : 1; }

  // Numbers
  if (typeof a === 'number') { return typeof b === 'number' ? compareNSB(a, b) : -1; }
  if (typeof b === 'number') { return typeof a === 'number' ? compareNSB(a, b) : 1; }

  // Strings
  if (typeof a === 'string') { return typeof b === 'string' ? compareStrings(a, b) : -1; }
  if (typeof b === 'string') { return typeof a === 'string' ? compareStrings(a, b) : 1; }

  // Booleans
  if (typeof a === 'boolean') { return typeof b === 'boolean' ? compareNSB(a, b) : -1; }
  if (typeof b === 'boolean') { return typeof a === 'boolean' ? compareNSB(a, b) : 1; }

  // Dates
  if (util.isDate(a)) { return util.isDate(b) ? compareNSB(a.getTime(), b.getTime()) : -1; }
  if (util.isDate(b)) { return util.isDate(a) ? compareNSB(a.getTime(), b.getTime()) : 1; }

  // Arrays (first element is most significant and so on)
  if (util.isArray(a)) { return util.isArray(b) ? compareArrays(a, b) : -1; }
  if (util.isArray(b)) { return util.isArray(a) ? compareArrays(a, b) : 1; }

  // Objects
  aKeys = Object.keys(a).sort();
  bKeys = Object.keys(b).sort();

  for (i = 0; i < Math.min(aKeys.length, bKeys.length); i += 1) {
    comp = compareThings(a[aKeys[i]], b[bKeys[i]]);

    if (comp !== 0) { return comp; }
  }

  return compareNSB(aKeys.length, bKeys.length);
}



// ==============================================================
// Updating documents
// ==============================================================

/**
 * The signature of modifier functions is as follows
 * Their structure is always the same: recursively follow the dot notation while creating
 * the nested documents if needed, then apply the "last step modifier"
 * @param {Object} obj The model to modify
 * @param {String} field Can contain dots, in that case that means we will set a subfield recursively
 * @param {Model} value
 */

/**
 * Set a field to a new value
 */
lastStepModifierFunctions.$set = function (obj, field, value) {
  obj[field] = value;
};


/**
 * Unset a field
 */
lastStepModifierFunctions.$unset = function (obj, field, value) {
  delete obj[field];
};


/**
 * Push an element to the end of an array field
 * Optional modifier $each instead of value to push several values
 * Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
 * Différeence with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
 */
lastStepModifierFunctions.$push = function (obj, field, value) {
  // Create the array if it doesn't exist
  if (!obj.hasOwnProperty(field)) { obj[field] = []; }

  if (!util.isArray(obj[field])) { throw new Error("Can't $push an element on non-array values"); }

  if (value !== null && typeof value === 'object' && value.$slice && value.$each === undefined) {
    value.$each = [];
  }

  if (value !== null && typeof value === 'object' && value.$each) {
    if (Object.keys(value).length >= 3 || (Object.keys(value).length === 2 && value.$slice === undefined)) { throw new Error("Can only use $slice in cunjunction with $each when $push to array"); }
    if (!util.isArray(value.$each)) { throw new Error("$each requires an array value"); }

    value.$each.forEach(function (v) {
      obj[field].push(v);
    });

    if (value.$slice === undefined || typeof value.$slice !== 'number') { return; }

    if (value.$slice === 0) {
      obj[field] = [];
    } else {
      var start, end, n = obj[field].length;
      if (value.$slice < 0) {
        start = Math.max(0, n + value.$slice);
        end = n;
      } else if (value.$slice > 0) {
        start = 0;
        end = Math.min(n, value.$slice);
      }
      obj[field] = obj[field].slice(start, end);
    }
  } else {
    obj[field].push(value);
  }
};


/**
 * Add an element to an array field only if it is not already in it
 * No modification if the element is already in the array
 * Note that it doesn't check whether the original array contains duplicates
 */
lastStepModifierFunctions.$addToSet = function (obj, field, value) {
  var addToSet = true;

  // Create the array if it doesn't exist
  if (!obj.hasOwnProperty(field)) { obj[field] = []; }

  if (!util.isArray(obj[field])) { throw new Error("Can't $addToSet an element on non-array values"); }

  if (value !== null && typeof value === 'object' && value.$each) {
    if (Object.keys(value).length > 1) { throw new Error("Can't use another field in conjunction with $each"); }
    if (!util.isArray(value.$each)) { throw new Error("$each requires an array value"); }

    value.$each.forEach(function (v) {
      lastStepModifierFunctions.$addToSet(obj, field, v);
    });
  } else {
    obj[field].forEach(function (v) {
      if (compareThings(v, value) === 0) { addToSet = false; }
    });
    if (addToSet) { obj[field].push(value); }
  }
};


/**
 * Remove the first or last element of an array
 */
lastStepModifierFunctions.$pop = function (obj, field, value) {
  if (!util.isArray(obj[field])) { throw new Error("Can't $pop an element from non-array values"); }
  if (typeof value !== 'number') { throw new Error(value + " isn't an integer, can't use it with $pop"); }
  if (value === 0) { return; }

  if (value > 0) {
    obj[field] = obj[field].slice(0, obj[field].length - 1);
  } else {
    obj[field] = obj[field].slice(1);
  }
};


/**
 * Removes all instances of a value from an existing array
 */
lastStepModifierFunctions.$pull = function (obj, field, value) {
  var arr, i;

  if (!util.isArray(obj[field])) { throw new Error("Can't $pull an element from non-array values"); }

  arr = obj[field];
  for (i = arr.length - 1; i >= 0; i -= 1) {
    if (match(arr[i], value)) {
      arr.splice(i, 1);
    }
  }
};


/**
 * Increment a numeric field's value
 */
lastStepModifierFunctions.$inc = function (obj, field, value) {
  if (typeof value !== 'number') { throw new Error(value + " must be a number"); }

  if (typeof obj[field] !== 'number') {
    if (!_.has(obj, field)) {
      obj[field] = value;
    } else {
      throw new Error("Don't use the $inc modifier on non-number fields");
    }
  } else {
    obj[field] += value;
  }
};

/**
 * Updates the value of the field, only if specified field is greater than the current value of the field
 */
lastStepModifierFunctions.$max = function (obj, field, value) {
  if (typeof obj[field] === 'undefined') {
    obj[field] = value;
  } else if (value > obj[field]) {
    obj[field] = value;
  }
};

/**
 * Updates the value of the field, only if specified field is smaller than the current value of the field
 */
lastStepModifierFunctions.$min = function (obj, field, value) {
  if (typeof obj[field] === 'undefined') { 
    obj[field] = value;
  } else if (value < obj[field]) {
    obj[field] = value;
  }
};

// Given its name, create the complete modifier function
function createModifierFunction (modifier) {
  return function (obj, field, value) {
    var fieldParts = typeof field === 'string' ? field.split('.') : field;

    if (fieldParts.length === 1) {
      lastStepModifierFunctions[modifier](obj, field, value);
    } else {
      if (obj[fieldParts[0]] === undefined) {
        if (modifier === '$unset') { return; }   // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
        obj[fieldParts[0]] = {};
      }
      modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1), value);
    }
  };
}

// Actually create all modifier functions
Object.keys(lastStepModifierFunctions).forEach(function (modifier) {
  modifierFunctions[modifier] = createModifierFunction(modifier);
});


/**
 * Modify a DB object according to an update query
 */
function modify (obj, updateQuery) {
  var keys = Object.keys(updateQuery)
    , firstChars = _.map(keys, function (item) { return item[0]; })
    , dollarFirstChars = _.filter(firstChars, function (c) { return c === '$'; })
    , newDoc, modifiers
    ;

  if (keys.indexOf('_id') !== -1 && updateQuery._id !== obj._id) { throw new Error("You cannot change a document's _id"); }

  if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
    throw new Error("You cannot mix modifiers and normal fields");
  }

  if (dollarFirstChars.length === 0) {
    // Simply replace the object with the update query contents
    newDoc = deepCopy(updateQuery);
    newDoc._id = obj._id;
  } else {
    // Apply modifiers
    modifiers = _.uniq(keys);
    newDoc = deepCopy(obj);
    modifiers.forEach(function (m) {
      var keys;

      if (!modifierFunctions[m]) { throw new Error("Unknown modifier " + m); }

      // Can't rely on Object.keys throwing on non objects since ES6
      // Not 100% satisfying as non objects can be interpreted as objects but no false negatives so we can live with it
      if (typeof updateQuery[m] !== 'object') {
        throw new Error("Modifier " + m + "'s argument must be an object");
      }

      keys = Object.keys(updateQuery[m]);
      keys.forEach(function (k) {
        modifierFunctions[m](newDoc, k, updateQuery[m][k]);
      });
    });
  }

  // Check result is valid and return it
  checkObject(newDoc);

  if (obj._id !== newDoc._id) { throw new Error("You can't change a document's _id"); }
  return newDoc;
};


// ==============================================================
// Finding documents
// ==============================================================

/**
 * Get a value from object with dot notation
 * @param {Object} obj
 * @param {String} field
 */
function getDotValue (obj, field) {
  var fieldParts = typeof field === 'string' ? field.split('.') : field
    , i, objs;

  if (!obj) { return undefined; }   // field cannot be empty so that means we should return undefined so that nothing can match

  if (fieldParts.length === 0) { return obj; }

  if (fieldParts.length === 1) { return obj[fieldParts[0]]; }

  if (util.isArray(obj[fieldParts[0]])) {
    // If the next field is an integer, return only this item of the array
    i = parseInt(fieldParts[1], 10);
    if (typeof i === 'number' && !isNaN(i)) {
      return getDotValue(obj[fieldParts[0]][i], fieldParts.slice(2))
    }

    // Return the array of values
    objs = new Array();
    for (i = 0; i < obj[fieldParts[0]].length; i += 1) {
       objs.push(getDotValue(obj[fieldParts[0]][i], fieldParts.slice(1)));
    }
    return objs;
  } else {
    return getDotValue(obj[fieldParts[0]], fieldParts.slice(1));
  }
}


/**
 * Check whether 'things' are equal
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * In the case of object, we check deep equality
 * Returns true if they are, false otherwise
 */
function areThingsEqual (a, b) {
  var aKeys , bKeys , i;

  // Strings, booleans, numbers, null
  if (a === null || typeof a === 'string' || typeof a === 'boolean' || typeof a === 'number' ||
      b === null || typeof b === 'string' || typeof b === 'boolean' || typeof b === 'number') { return a === b; }

  // Dates
  if (util.isDate(a) || util.isDate(b)) { return util.isDate(a) && util.isDate(b) && a.getTime() === b.getTime(); }

  // Arrays (no match since arrays are used as a $in)
  // undefined (no match since they mean field doesn't exist and can't be serialized)
  if ((!(util.isArray(a) && util.isArray(b)) && (util.isArray(a) || util.isArray(b))) || a === undefined || b === undefined) { return false; }

  // General objects (check for deep equality)
  // a and b should be objects at this point
  try {
    aKeys = Object.keys(a);
    bKeys = Object.keys(b);
  } catch (e) {
    return false;
  }

  if (aKeys.length !== bKeys.length) { return false; }
  for (i = 0; i < aKeys.length; i += 1) {
    if (bKeys.indexOf(aKeys[i]) === -1) { return false; }
    if (!areThingsEqual(a[aKeys[i]], b[aKeys[i]])) { return false; }
  }
  return true;
}


/**
 * Check that two values are comparable
 */
function areComparable (a, b) {
  if (typeof a !== 'string' && typeof a !== 'number' && !util.isDate(a) &&
      typeof b !== 'string' && typeof b !== 'number' && !util.isDate(b)) {
    return false;
  }

  if (typeof a !== typeof b) { return false; }

  return true;
}


/**
 * Arithmetic and comparison operators
 * @param {Native value} a Value in the object
 * @param {Native value} b Value in the query
 */
comparisonFunctions.$lt = function (a, b) {
  return areComparable(a, b) && a < b;
};

comparisonFunctions.$lte = function (a, b) {
  return areComparable(a, b) && a <= b;
};

comparisonFunctions.$gt = function (a, b) {
  return areComparable(a, b) && a > b;
};

comparisonFunctions.$gte = function (a, b) {
  return areComparable(a, b) && a >= b;
};

comparisonFunctions.$ne = function (a, b) {
  if (a === undefined) { return true; }
  return !areThingsEqual(a, b);
};

comparisonFunctions.$in = function (a, b) {
  var i;

  if (!util.isArray(b)) { throw new Error("$in operator called with a non-array"); }

  for (i = 0; i < b.length; i += 1) {
    if (areThingsEqual(a, b[i])) { return true; }
  }

  return false;
};

comparisonFunctions.$nin = function (a, b) {
  if (!util.isArray(b)) { throw new Error("$nin operator called with a non-array"); }

  return !comparisonFunctions.$in(a, b);
};

comparisonFunctions.$regex = function (a, b) {
  if (!util.isRegExp(b)) { throw new Error("$regex operator called with non regular expression"); }

  if (typeof a !== 'string') {
    return false
  } else {
    return b.test(a);
  }
};

comparisonFunctions.$exists = function (value, exists) {
  if (exists || exists === '') {   // This will be true for all values of exists except false, null, undefined and 0
    exists = true;                 // That's strange behaviour (we should only use true/false) but that's the way Mongo does it...
  } else {
    exists = false;
  }

  if (value === undefined) {
    return !exists
  } else {
    return exists;
  }
};

// Specific to arrays
comparisonFunctions.$size = function (obj, value) {
    if (!util.isArray(obj)) { return false; }
    if (value % 1 !== 0) { throw new Error("$size operator called without an integer"); }

    return (obj.length == value);
};
comparisonFunctions.$elemMatch = function (obj, value) {
  if (!util.isArray(obj)) { return false; }
  var i = obj.length;
  var result = false;   // Initialize result
  while (i--) {
    if (match(obj[i], value)) {   // If match for array element, return true
      result = true;
      break;
    }
  }
  return result;
};
arrayComparisonFunctions.$size = true;
arrayComparisonFunctions.$elemMatch = true;


/**
 * Match any of the subqueries
 * @param {Model} obj
 * @param {Array of Queries} query
 */
logicalOperators.$or = function (obj, query) {
  var i;

  if (!util.isArray(query)) { throw new Error("$or operator used without an array"); }

  for (i = 0; i < query.length; i += 1) {
    if (match(obj, query[i])) { return true; }
  }

  return false;
};


/**
 * Match all of the subqueries
 * @param {Model} obj
 * @param {Array of Queries} query
 */
logicalOperators.$and = function (obj, query) {
  var i;

  if (!util.isArray(query)) { throw new Error("$and operator used without an array"); }

  for (i = 0; i < query.length; i += 1) {
    if (!match(obj, query[i])) { return false; }
  }

  return true;
};


/**
 * Inverted match of the query
 * @param {Model} obj
 * @param {Query} query
 */
logicalOperators.$not = function (obj, query) {
  return !match(obj, query);
};


/**
 * Use a function to match
 * @param {Model} obj
 * @param {Query} query
 */
logicalOperators.$where = function (obj, fn) {
  var result;

  if (!_.isFunction(fn)) { throw new Error("$where operator used without a function"); }

  result = fn.call(obj);
  if (!_.isBoolean(result)) { throw new Error("$where function must return boolean"); }

  return result;
};


/**
 * Tell if a given document matches a query
 * @param {Object} obj Document to check
 * @param {Object} query
 */
function match (obj, query) {
  var queryKeys, queryKey, queryValue, i;

  // Primitive query against a primitive type
  // This is a bit of a hack since we construct an object with an arbitrary key only to dereference it later
  // But I don't have time for a cleaner implementation now
  if (isPrimitiveType(obj) || isPrimitiveType(query)) {
    return matchQueryPart({ needAKey: obj }, 'needAKey', query);
  }

  // Normal query
  queryKeys = Object.keys(query);
  for (i = 0; i < queryKeys.length; i += 1) {
    queryKey = queryKeys[i];
    queryValue = query[queryKey];

    if (queryKey[0] === '$') {
      if (!logicalOperators[queryKey]) { throw new Error("Unknown logical operator " + queryKey); }
      if (!logicalOperators[queryKey](obj, queryValue)) { return false; }
    } else {
      if (!matchQueryPart(obj, queryKey, queryValue)) { return false; }
    }
  }

  return true;
};


/**
 * Match an object against a specific { key: value } part of a query
 * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
 */
function matchQueryPart (obj, queryKey, queryValue, treatObjAsValue) {
  var objValue = getDotValue(obj, queryKey)
    , i, keys, firstChars, dollarFirstChars;

  // Check if the value is an array if we don't force a treatment as value
  if (util.isArray(objValue) && !treatObjAsValue) {
    // If the queryValue is an array, try to perform an exact match
    if (util.isArray(queryValue)) {
      return matchQueryPart(obj, queryKey, queryValue, true);
    }

    // Check if we are using an array-specific comparison function
    if (queryValue !== null && typeof queryValue === 'object' && !util.isRegExp(queryValue)) {
      keys = Object.keys(queryValue);
      for (i = 0; i < keys.length; i += 1) {
        if (arrayComparisonFunctions[keys[i]]) { return matchQueryPart(obj, queryKey, queryValue, true); }
      }
    }

    // If not, treat it as an array of { obj, query } where there needs to be at least one match
    for (i = 0; i < objValue.length; i += 1) {
      if (matchQueryPart({ k: objValue[i] }, 'k', queryValue)) { return true; }   // k here could be any string
    }
    return false;
  }

  // queryValue is an actual object. Determine whether it contains comparison operators
  // or only normal fields. Mixed objects are not allowed
  if (queryValue !== null && typeof queryValue === 'object' && !util.isRegExp(queryValue) && !util.isArray(queryValue)) {
    keys = Object.keys(queryValue);
    firstChars = _.map(keys, function (item) { return item[0]; });
    dollarFirstChars = _.filter(firstChars, function (c) { return c === '$'; });

    if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
      throw new Error("You cannot mix operators and normal fields");
    }

    // queryValue is an object of this form: { $comparisonOperator1: value1, ... }
    if (dollarFirstChars.length > 0) {
      for (i = 0; i < keys.length; i += 1) {
        if (!comparisonFunctions[keys[i]]) { throw new Error("Unknown comparison function " + keys[i]); }

        if (!comparisonFunctions[keys[i]](objValue, queryValue[keys[i]])) { return false; }
      }
      return true;
    }
  }

  // Using regular expressions with basic querying
  if (util.isRegExp(queryValue)) { return comparisonFunctions.$regex(objValue, queryValue); }

  // queryValue is either a native value or a normal object
  // Basic matching is possible
  if (!areThingsEqual(objValue, queryValue)) { return false; }

  return true;
}


// Interface
module.exports.serialize = serialize;
module.exports.deserialize = deserialize;
module.exports.deepCopy = deepCopy;
module.exports.checkObject = checkObject;
module.exports.isPrimitiveType = isPrimitiveType;
module.exports.modify = modify;
module.exports.getDotValue = getDotValue;
module.exports.match = match;
module.exports.areThingsEqual = areThingsEqual;
module.exports.compareThings = compareThings;

},{"underscore":42,"util":31}],41:[function(require,module,exports){
(function (process){
/**
 * Handle every persistence-related task
 * The interface Datastore expects to be implemented is
 * * Persistence.loadDatabase(callback) and callback has signature err
 * * Persistence.persistNewState(newDocs, callback) where newDocs is an array of documents and callback has signature err
 */

var storage = require('./storage')
  , path = require('path')
  , model = require('./model')
  , async = require('async')
  , customUtils = require('./customUtils')
  , Index = require('./indexes')
  ;


/**
 * Create a new Persistence object for database options.db
 * @param {Datastore} options.db
 * @param {Boolean} options.nodeWebkitAppName Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
 *                                            Node Webkit stores application data such as cookies and local storage (the best place to store data in my opinion)
 */
function Persistence (options) {
  var i, j, randomString;

  this.db = options.db;
  this.inMemoryOnly = this.db.inMemoryOnly;
  this.filename = this.db.filename;
  this.corruptAlertThreshold = options.corruptAlertThreshold !== undefined ? options.corruptAlertThreshold : 0.1;

  if (!this.inMemoryOnly && this.filename && this.filename.charAt(this.filename.length - 1) === '~') {
    throw new Error("The datafile name can't end with a ~, which is reserved for crash safe backup files");
  }

  // After serialization and before deserialization hooks with some basic sanity checks
  if (options.afterSerialization && !options.beforeDeserialization) {
    throw new Error("Serialization hook defined but deserialization hook undefined, cautiously refusing to start NeDB to prevent dataloss");
  }
  if (!options.afterSerialization && options.beforeDeserialization) {
    throw new Error("Serialization hook undefined but deserialization hook defined, cautiously refusing to start NeDB to prevent dataloss");
  }
  this.afterSerialization = options.afterSerialization || function (s) { return s; };
  this.beforeDeserialization = options.beforeDeserialization || function (s) { return s; };
  for (i = 1; i < 30; i += 1) {
    for (j = 0; j < 10; j += 1) {
      randomString = customUtils.uid(i);
      if (this.beforeDeserialization(this.afterSerialization(randomString)) !== randomString) {
        throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start NeDB to prevent dataloss");
      }
    }
  }

  // For NW apps, store data in the same directory where NW stores application data
  if (this.filename && options.nodeWebkitAppName) {
    console.log("==================================================================");
    console.log("WARNING: The nodeWebkitAppName option is deprecated");
    console.log("To get the path to the directory where Node Webkit stores the data");
    console.log("for your app, use the internal nw.gui module like this");
    console.log("require('nw.gui').App.dataPath");
    console.log("See https://github.com/rogerwang/node-webkit/issues/500");
    console.log("==================================================================");
    this.filename = Persistence.getNWAppFilename(options.nodeWebkitAppName, this.filename);
  }
};


/**
 * Check if a directory exists and create it on the fly if it is not the case
 * cb is optional, signature: err
 */
Persistence.ensureDirectoryExists = function (dir, cb) {
  var callback = cb || function () {}
    ;

  storage.mkdirp(dir, function (err) { return callback(err); });
};




/**
 * Return the path the datafile if the given filename is relative to the directory where Node Webkit stores
 * data for this application. Probably the best place to store data
 */
Persistence.getNWAppFilename = function (appName, relativeFilename) {
  var home;

  switch (process.platform) {
    case 'win32':
    case 'win64':
      home = process.env.LOCALAPPDATA || process.env.APPDATA;
      if (!home) { throw new Error("Couldn't find the base application data folder"); }
      home = path.join(home, appName);
      break;
    case 'darwin':
      home = process.env.HOME;
      if (!home) { throw new Error("Couldn't find the base application data directory"); }
      home = path.join(home, 'Library', 'Application Support', appName);
      break;
    case 'linux':
      home = process.env.HOME;
      if (!home) { throw new Error("Couldn't find the base application data directory"); }
      home = path.join(home, '.config', appName);
      break;
    default:
      throw new Error("Can't use the Node Webkit relative path for platform " + process.platform);
      break;
  }

  return path.join(home, 'nedb-data', relativeFilename);
}


/**
 * Persist cached database
 * This serves as a compaction function since the cache always contains only the number of documents in the collection
 * while the data file is append-only so it may grow larger
 * @param {Function} cb Optional callback, signature: err
 */
Persistence.prototype.persistCachedDatabase = function (cb) {
  var callback = cb || function () {}
    , toPersist = ''
    , self = this
    ;

  if (this.inMemoryOnly) { return callback(null); }

  this.db.getAllData().forEach(function (doc) {
    toPersist += self.afterSerialization(model.serialize(doc)) + '\n';
  });
  Object.keys(this.db.indexes).forEach(function (fieldName) {
    if (fieldName != "_id") {   // The special _id index is managed by datastore.js, the others need to be persisted
      toPersist += self.afterSerialization(model.serialize({ $$indexCreated: { fieldName: fieldName, unique: self.db.indexes[fieldName].unique, sparse: self.db.indexes[fieldName].sparse }})) + '\n';
    }
  });

  storage.crashSafeWriteFile(this.filename, toPersist, function (err) {
    if (err) { return callback(err); }
    self.db.emit('compaction.done');
    return callback(null);
  });
};


/**
 * Queue a rewrite of the datafile
 */
Persistence.prototype.compactDatafile = function () {
  this.db.executor.push({ this: this, fn: this.persistCachedDatabase, arguments: [] });
};


/**
 * Set automatic compaction every interval ms
 * @param {Number} interval in milliseconds, with an enforced minimum of 5 seconds
 */
Persistence.prototype.setAutocompactionInterval = function (interval) {
  var self = this
    , minInterval = 5000
    , realInterval = Math.max(interval || 0, minInterval)
    ;

  this.stopAutocompaction();

  this.autocompactionIntervalId = setInterval(function () {
    self.compactDatafile();
  }, realInterval);
};


/**
 * Stop autocompaction (do nothing if autocompaction was not running)
 */
Persistence.prototype.stopAutocompaction = function () {
  if (this.autocompactionIntervalId) { clearInterval(this.autocompactionIntervalId); }
};


/**
 * Persist new state for the given newDocs (can be insertion, update or removal)
 * Use an append-only format
 * @param {Array} newDocs Can be empty if no doc was updated/removed
 * @param {Function} cb Optional, signature: err
 */
Persistence.prototype.persistNewState = function (newDocs, cb) {
  var self = this
    , toPersist = ''
    , callback = cb || function () {}
    ;

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  newDocs.forEach(function (doc) {
    toPersist += self.afterSerialization(model.serialize(doc)) + '\n';
  });

  if (toPersist.length === 0) { return callback(null); }

  storage.appendFile(self.filename, toPersist, 'utf8', function (err) {
    return callback(err);
  });
};


/**
 * From a database's raw data, return the corresponding
 * machine understandable collection
 */
Persistence.prototype.treatRawData = function (rawData) {
  var data = rawData.split('\n')
    , dataById = {}
    , tdata = []
    , i
    , indexes = {}
    , corruptItems = -1   // Last line of every data file is usually blank so not really corrupt
    ;

  for (i = 0; i < data.length; i += 1) {
    var doc;

    try {
      doc = model.deserialize(this.beforeDeserialization(data[i]));
      if (doc._id) {
        if (doc.$$deleted === true) {
          delete dataById[doc._id];
        } else {
          dataById[doc._id] = doc;
        }
      } else if (doc.$$indexCreated && doc.$$indexCreated.fieldName != undefined) {
        indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
      } else if (typeof doc.$$indexRemoved === "string") {
        delete indexes[doc.$$indexRemoved];
      }
    } catch (e) {
      corruptItems += 1;
    }
  }

  // A bit lenient on corruption
  if (data.length > 0 && corruptItems / data.length > this.corruptAlertThreshold) {
    throw new Error("More than " + Math.floor(100 * this.corruptAlertThreshold) + "% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start NeDB to prevent dataloss");
  }

  Object.keys(dataById).forEach(function (k) {
    tdata.push(dataById[k]);
  });

  return { data: tdata, indexes: indexes };
};


/**
 * Load the database
 * 1) Create all indexes
 * 2) Insert all data
 * 3) Compact the database
 * This means pulling data out of the data file or creating it if it doesn't exist
 * Also, all data is persisted right away, which has the effect of compacting the database file
 * This operation is very quick at startup for a big collection (60ms for ~10k docs)
 * @param {Function} cb Optional callback, signature: err
 */
Persistence.prototype.loadDatabase = function (cb) {
  var callback = cb || function () {}
    , self = this
    ;

  self.db.resetIndexes();

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  async.waterfall([
    function (cb) {
      Persistence.ensureDirectoryExists(path.dirname(self.filename), function (err) {
        storage.ensureDatafileIntegrity(self.filename, function (err) {
          storage.readFile(self.filename, 'utf8', function (err, rawData) {
            if (err) { return cb(err); }

            try {
              var treatedData = self.treatRawData(rawData);
            } catch (e) {
              return cb(e);
            }

            // Recreate all indexes in the datafile
            Object.keys(treatedData.indexes).forEach(function (key) {
              self.db.indexes[key] = new Index(treatedData.indexes[key]);
            });

            // Fill cached database (i.e. all indexes) with data
            try {
              self.db.resetIndexes(treatedData.data);
            } catch (e) {
              self.db.resetIndexes();   // Rollback any index which didn't fail
              return cb(e);
            }

            self.db.persistence.persistCachedDatabase(cb);
          });
        });
      });
    }
  ], function (err) {
       if (err) { return callback(err); }

       self.db.executor.processBuffer();
       return callback(null);
     });
};


// Interface
module.exports = Persistence;

}).call(this,require('_process'))
},{"./customUtils":33,"./indexes":39,"./model":40,"./storage":34,"_process":29,"async":21,"path":28}],42:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}]},{},[8]);
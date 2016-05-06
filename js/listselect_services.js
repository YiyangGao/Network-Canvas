/* global $, window */
/* exported ListSelect */
module.exports = function ListSelect() {
    'use strict';
    //global vars
    var listSelect = {};
    listSelect.options = {
        targetEl: $('.container')
    };

    var itemClickHandler = function() {
        console.log('item click');
        // console.log(e);
        //   console.log('item click handler');
        var nodeid = $(this).data('nodeid');
        // console.log('nodeid: '+nodeid);

        $(this).find('.select-icon').toggleClass('fa-circle-o fa-check-circle-o');

        if ($(this).parent().hasClass('selected')) {
            $(this).parent().removeClass('selected');
            console.log($($('[data-nodeid='+nodeid+']').parent()[0]).children('.collapse'));
            // uncheck boxes
            $('[data-parent='+nodeid+']').each(function(){ $(this).prop('checked', false); });

            // remove values
            window.network.removeEdge(window.network.getEdge($(this).data('edgeid')));

        } else {
            $(this).parent().addClass('selected');

            var properties = {
                from: window.network.getEgo().id,
                to: nodeid,
                type: listSelect.options.edge
            };

            properties[listSelect.options.variable.label] = [];

            var targetEdge = window.network.addEdge(properties);

            $(this).data('edgeid', targetEdge);

        }

    };

    var stageChangeHandler = function() {
        listSelect.destroy();
    };

    listSelect.destroy = function() {
        // Event Listeners
        window.tools.notify('Destroying listSelect.',0);
        $(window.document).off('click', '.inner', itemClickHandler);
        window.removeEventListener('changeStageStart', stageChangeHandler, false);

    };

    listSelect.init = function(options) {
        window.tools.extend(listSelect.options, options);
        // Add header and subheader
        listSelect.options.targetEl.append('<h1 class="text-center">'+listSelect.options.heading+'</h1>');
        listSelect.options.targetEl.append('<div class="form-group service-list-container"></div>');

        var edges = window.network.getEdges(listSelect.options.criteria);

        $.each(edges, function(index,value) {
          var node = window.network.getNode(value.to);
          var targetEdge = window.network.getEdges({type: listSelect.options.edge, from: window.network.getEgo().id, to:node.id});

          var el = $('<div class="item"><div class="inner" data-nodeid="'+node.id+'" data-toggle="collapse" data-target="#collapse-'+value.id+'" aria-expanded="false" aria-controls="collapse-'+value.id+'"><h3><i class="select-icon fa fa-circle-o pull-left"></i>'+node.name+'</h3></div></div>');

          var markup = $('<div class="collapse" id="collapse-'+value.id+'"><div class="well"><div class="btn-group check"></div></div>');

            $('.service-list-container').append(el);

            if (targetEdge.length > 0) {
                el.find('.inner').data('edgeid', targetEdge[0].id);
                $('[data-nodeid="'+node.id+'"]').parent().addClass('selected');
                el.find('.select-icon').toggleClass('fa-circle-o fa-check-circle-o');
                markup.addClass('in');
            }

            el.append(markup);

            $.each(listSelect.options.variable.options, function(optionIndex, optionValue) {
                var checked = '';
                if(targetEdge.length > 0 && targetEdge[0][listSelect.options.variable.label].indexOf(optionValue) !== -1) {
                    checked = 'checked="checked"';
                }
                el.find('.check').append('<div class="col-md-6 text-left check-row"><input data-parent="'+node.id+'" name="'+listSelect.options.variable.label+'" type="checkbox" class="faChkRnd" id="check-'+index+optionIndex+'" data-value="'+optionValue+'" '+checked+'><label for="check-'+index+optionIndex+'">'+optionValue+'</label></div>');
            });
        });

        // Event Listeners
        $(window.document).on('click', '.inner', itemClickHandler);
        $('[name="'+listSelect.options.variable.label+'"]').change(function() {
            // if ($(this).is(':checked')) {
                // console.log(e);
                // console.log(this);
                // console.log($(this).data('value'));
                var el = $(this).parent().parent();
                var id = $(this).parent().parent().parent().parent().parent().find('.inner').data('edgeid');
                console.log(id);
                console.log(window.network.getEdge(id));
                // console.log($(el).find('input:checked'));

                // console.log(allAttributes);
                var properties = {};
                properties[listSelect.options.variable.label] = $(el).find('input:checked').map(function(){
                    return $(this).data('value');
                }).get();

                // console.log(id);
                console.log(properties);
                window.network.updateEdge(id, properties);
            // }


        });
        window.addEventListener('changeStageStart', stageChangeHandler, false);


    };

    return listSelect;
};

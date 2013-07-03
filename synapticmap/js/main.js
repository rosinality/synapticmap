var TotalNode = 0;

function NodeClick() {
	var parent = $(this).parent();
	if (parent.hasClass('prevent-click')) {
		parent.removeClass('prevent-click');
		return;
	}
	jsPlumb.setDraggable(parent, false);
	$(this).attr('contenteditable', 'true');
	parent.children('.remove-button').removeClass('hide');
	parent.children('.ui-resizable-handle').removeClass('hide');
	parent.css({ border: '1px dashed #fff' });
}
function NodeBlur() {
	var parent = $(this).parent();
	jsPlumb.setDraggable($(parent), true);
	$(this).attr('contenteditable', 'false');
	parent.children('.ui-resizable-handle').addClass('hide');
	parent.css({ border: '1px solid #989898' });
	parent.children('.remove-button').addClass('hide');
}
function NodeKeydown(event) {
	var keyCode = event.keyCode || event.which;

	if (keyCode == 9) {
		event.preventDefault();
		var parent = $(this).parent();
		var offset = parent.offset();
		var newNode = AddNode(
			offset.left + parent.width() + 40, offset.top);
		jsPlumb.connect({
			source: parent.attr('id'),
			target: newNode.attr('id')
		});
		newNode.children('.nodetext').click().focus();
		document.execCommand('selectAll', false, null);
	} else if (keyCode == 27) {
		$(this).blur();
	}
}
function RemoveNode(id) {
	jsPlumb.detachAllConnections(id);
	jsPlumb.removeAllEndpoints(id);
//	$('#' + id).remove();
	$('#' + id).addClass('hide');
}
function RemoveButton() {
	if (!confirm('Do you really want to remove this node?')) {
		return;
	}

	var parent = $(this).parent();
	RemoveNode(parent.attr('id'));
}
function AddNode (X, Y, ID, Text) {
	var templateNode = $('#Template').clone();
	templateNode.removeClass('hide');
	templateNode.css({ left: X, top: Y });
	templateNode.removeClass('ui-draggable');
	
	if (ID) {
		templateNode.attr('id', ID);
	} else {
		templateNode.attr('id', 'Node' + TotalNode);
	}

	var textDiv = templateNode.children('.nodetext');
	if (Text) {
		textDiv.html(Text);
	} else {
		textDiv.text('New node ' + (TotalNode + 1));
	}
	textDiv.click(NodeClick).blur(NodeBlur).keydown(NodeKeydown);
	templateNode.children('.remove-button').mousedown(RemoveButton);

	jsPlumb.makeSource(templateNode, {
		filter: '.linkbar',
		anchor: 'Continuous',
		connection: ['StateMachine', { curviness: 20 }],
		connectorStyle: { strokeStyle: '#989898', lineWidth: 1 },
	});
	jsPlumb.makeTarget(templateNode, {
		dropOptions: { hoverClass: 'dragHover' },
		anchor: 'Continuous'
	});
	templateNode.resizable({
		ghost: true,
		handles: 'se'
	});
	templateNode.children('.ui-resizable-handle').addClass('hide');
	$('body').append(templateNode);
	
	jsPlumb.draggable(templateNode, {
		start: function (event, ui) {
			$(this).addClass('prevent-click');
		}
	});
	
	TotalNode++;

	return templateNode;
}

function SaveDialog() {
	$('#save-dialog').dialog('open');
}

function SaveFile(fileName) {
	var Nodes = [];
	var Connections = [];

	$('.node').each(function () {
		var Node = $(this);
		if (Node.attr('id') != 'Template') {
			Nodes.push({
				id: Node.attr('id'),
				text: Node.children('.nodetext').html(),
				left: Node.css('left'),
				top: Node.css('top'),
				width: Node.css('width'),
				height: Node.css('height')
			});
		}
	});

	var AllConnections = jsPlumb.getConnections();
	for (var index = 0; index < AllConnections.length; index++) {
		if (AllConnections[index].getOverlay('label') == null) {
			Connections.push([AllConnections[index].sourceId,
			AllConnections[index].targetId,
			null,
			AllConnections[index].getOverlay('arrow-source') != null,
			AllConnections[index].getOverlay('arrow-target') != null]);
		} else {
			Connections.push([AllConnections[index].sourceId,
			AllConnections[index].targetId,
			AllConnections[index].getOverlay('label').getLabel(),
			AllConnections[index].getOverlay('arrow-source') != null,
			AllConnections[index].getOverlay('arrow-target') != null]);
		}
	}

	var jsonBlob = new Blob([JSON.stringify([Nodes, Connections])],
		{ type: 'application/json' });
	saveAs(jsonBlob, fileName + '.txt');
}
/*
function Save() {
	if (!confirm('Do you really want to overwrite this?')) {
		return;
	}
	var Nodes = [];
	var Connections = [];

	$('.node').each(function () {
		var Node = $(this);
		if (Node.attr('id') != 'Template') {
			Nodes.push({
				id: Node.attr('id'),
				text: Node.children('.nodetext').html(),
				left: Node.css('left'),
				top: Node.css('top'),
				width: Node.css('width'),
				height: Node.css('height')
			});
		}
	});

	var AllConnections = jsPlumb.getConnections();
	for (var index = 0; index < AllConnections.length; index++) {
		Connections.push([AllConnections[index].sourceId,
			AllConnections[index].targetId]);
	}

	localStorage.setItem('Neuromap', JSON.stringify([Nodes, Connections]));
}
*/
function Clear() {
	jsPlumb.deleteEveryEndpoint();
	$('.node:not(#Template)').remove();
	TotalNode = 0;
}

function LoadDialog() {
	$("#openfile").click();
}

function LoadFile(fileName) {
	var reader = new FileReader();
	reader.onload = function (event) {
		Load(event.target.result);
	}
	reader.readAsText(fileName);
}

var ArrowStyle = {
	Width: 8,
	Length: 10
};

function Load(jsonString) {
	Clear();

	var data = JSON.parse(jsonString);
	var Nodes = data[0];
	var Connections = data[1];
	var HTML = '';

	for (var index = 0; index < Nodes.length; index++) {
		var Node = Nodes[index];
		AddNode(Node.left, Node.top, Node.id, Node.text);
	}
	
	jsPlumb.setSuspendDrawing(true);
	var overlay = [];
	for (var index = 0; index < Connections.length; index++) {
		if (Connections[index][2]) {
			overlay.push(
				['Label', {
					id: 'label',
					cssClass: 'connector-label',
					label: Connections[index][2]
				}]
			);
		}
		if (Connections[index][3]) {
			overlay.push(
				['Arrow', {
					location: 0,
					direction: -1,
					id: 'arrow-source',
					length: ArrowStyle.Length,
					foldback: 1,
					width: ArrowStyle.Width,
					paintStyle: {
						fillStyle: '#2d2d30',
					}
				}]
			);	
		}
		if (Connections[index][4]) {
			overlay.push(
				['Arrow', {
					location: 1,
					id: 'arrow-target',
					length: ArrowStyle.Length,
					foldback: 1,
					width: ArrowStyle.Width,
					paintStyle: {
						fillStyle: '#2d2d30',
					}
				}]
			);
		}
		var NewConnection = jsPlumb.connect({
			source: Connections[index][0],
			target: Connections[index][1],
			paintStyle: {
				lineWidth: 1
			},
			overlays: overlay
		});
		if (Connections[index][4] === false) {
			NewConnection.removeOverlay('arrow-target');
		}
		overlay = [];
	}
	jsPlumb.setSuspendDrawing(false, true);
	jsPlumb.repaintEverything();
}

function SetGlobalLayout(layout) {
	var Connections = [];
	var AllConnections = jsPlumb.getConnections();
	for (var index = 0; index < AllConnections.length; index++) {
		Connections.push([AllConnections[index].sourceId,
			AllConnections[index].targetId]);
	}
	jsPlumb.deleteEveryEndpoint();
	jsPlumb.setSuspendDrawing(true);
	for (var index = 0; index < Connections.length; index++) {
		if (layout == 'Bezier') {
			jsPlumb.connect({
				source: Connections[index][0],
				target: Connections[index][1],
				connector: [layout, { curviness: 20 }]
			});
		} else {
			jsPlumb.connect({
				source: Connections[index][0],
				target: Connections[index][1],
				connector: [layout, {}]
			});
		}
	}
	jsPlumb.setSuspendDrawing(false, true);
}

$(function () {
	var main = AddNode(0, 0);
	main.children('.nodetext').text('Your main idea');
	main.css('position', 'absolute');
	main.css('top', Math.max(0, (($(window).height() - $(main).outerHeight()) / 2) +
		$(window).scrollTop()) + 'px');
	main.css('left', Math.max(0, (($(window).width() - $(main).outerWidth()) / 2) +
		$(window).scrollLeft()) + 'px');

	$('#menu').menu();

	$(document).click(function (event) {
		var target = $(event.target);

		if (target.hasClass('formatter') || target.is('path')) {
			return;
		}

		if (SelectedConnection != null) {
			SelectedConnection.setPaintStyle({ strokeStyle: '#989898' });
			SelectedConnection = null;
			$('#connector-formatter').addClass('hide');
		}

		if (target.is('div')) {
			return; 
		}

		$(document).focus();
		
	});

	$(document).dblclick(function (event) {
		var target = $(event.target);

		if (target.is('div') || target.is('path') || target.hasClass('formatter')) {
			return; 
		}

		AddNode(event.clientX, event.clientY);
	});

	$(document).keydown(function (event) {
		var keyCode = event.keyCode || event.which;

		if (keyCode == 46) {
			if (SelectedConnection && !$(event.target).hasClass('formatter')) {
				jsPlumb.detach(SelectedConnection);
				$('#connector-formatter').addClass('hide');
			}
		}
	});

	$('#openfile').change(function (event) {
		for (var i = 0; i < this.files.length; i++) {
			LoadFile(this.files[i]);
			break;
		}
	});

	$('#label-text').keydown(function (event) {
		if (event.keyCode == 13) {
			var text = $(this)

			if (SelectedConnection) {

				if (SelectedConnection.getOverlay('label')) {
					SelectedConnection.getOverlay('label').setLabel(text.val());
				} else {
					SelectedConnection.addOverlay(['Label', {
						label: text.val(),
						id: 'label',
						cssClass: 'connector-label'
					}]);
				}
			}
		}
	});

	$('#arrow-target').change(function () {
		var checked = $(this).is(':checked');
		if (checked) {
			if (!SelectedConnection.getOverlay('arrow-target')) {
				SelectedConnection.addOverlay(['Arrow', {
					location: 1,
					id: 'arrow-target',
					length: ArrowStyle.Length,
					foldback: 1,
					width: ArrowStyle.Width,
					paintStyle: {
						fillStyle: '#2d2d30',
					}
				}]);
			}
		} else {
			SelectedConnection.removeOverlay('arrow-target');
		}
	});
	$('#arrow-source').change(function () {
		var checked = $(this).is(':checked');
		if (checked) {
			if (!SelectedConnection.getOverlay('arrow-source')) {
				SelectedConnection.addOverlay(['Arrow', {
					location: 0,
					direction: -1,
					id: 'arrow-source',
					length: ArrowStyle.Length,
					foldback: 1,
					width: ArrowStyle.Width,
					paintStyle: {
						fillStyle: '#2d2d30',
					}
				}]);
			}
		} else {
			SelectedConnection.removeOverlay('arrow-source');
		}
	});

	$('#save-dialog').dialog({
		autoOpen: false,
		height: 200,
		width: 300,
		modal: true,
		buttons: {
			"Save map": function () {
				var Save = $('#save-filename');
				if (Save.val().length == 0 || Save.val() == null) {
					Save.addClass("ui-state-error");
					return;
				}
				SaveFile(Save.val());
				$(this).dialog('close');
			},

			Cancel: function () {
				$(this).dialog('close');
			}
		},

		close: function () {
			$('#save-filename').val('').removeClass('ui-state-error');
		}
	});
});

var SelectedConnection;
function Initialize () {
	jsPlumb.importDefaults({
		Endpoint: ['Blank', {}],
		Connector: ['Bezier', { curviness: 20 }],
		HoverPaintStyle: {
			strokeStyle: '#42a62c',
			lineWidth: 1
		},
		ConnectionOverlays: [
			['Arrow', {
				location: 1,
				id: 'arrow-target',
				length: ArrowStyle.Length,
				foldback: 1,
				width: ArrowStyle.Width,
				paintStyle: {
					fillStyle: '#2d2d30',
				}
			}]//,
		//	['Label', { label: 'FOO', id: 'label' }]
		]
	});

	jsPlumb.bind('click', function (connection, event) {
		if (SelectedConnection) {
			SelectedConnection.setPaintStyle({ strokeStyle: '#989898' })
		}
		connection.setPaintStyle({ strokeStyle: '#42a62c' });
		SelectedConnection = connection;
		var formatter = $('#connector-formatter');
		formatter.css({ left: event.clientX + 15,
						top: event.clientY + 15 });
		if (connection.getOverlay('arrow-target')) {
			$('#arrow-target').attr('checked', true);
		} else {
			$('#arrow-target').attr('checked', false);
		}
		if (connection.getOverlay('arrow-source')) {
			$('#arrow-source').attr('checked', true);
		} else {
			$('#arrow-source').attr('checked', false);
		}
		if (connection.getOverlay('label')) {
			$('#label-text').val(connection.getOverlay('label').getLabel());
		}
		formatter.removeClass('hide');
	//	jsPlumb.detach(connection);
	});
}

jsPlumb.ready(Initialize);
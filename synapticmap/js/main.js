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
	$('#' + id).remove();
}
function AddNode (X, Y, Text = '') {
	var templateNode = $('#Template').clone();
	templateNode.removeClass('hide');
	templateNode.css({ left: X, top: Y });
	templateNode.removeClass('ui-draggable');
	templateNode.attr('id', 'Node' + TotalNode);

	var textDiv = templateNode.children('.nodetext');
	if (Text) {
		textDiv.html(Text);
	} else {
		textDiv.text('New node ' + (TotalNode + 1));
	}
	textDiv.click(NodeClick).blur(NodeBlur).keydown(NodeKeydown);

	jsPlumb.makeSource(templateNode, {
		filter: '.linkbar',
		anchor: 'Continuous',
		connection: ['StateMachine', { curviness: 20 }],
		connectorStyle: { strokeStyle: '#989898', lineWidth: 1},
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
		Connections.push([AllConnections[index].sourceId,
			AllConnections[index].targetId]);
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
//	Initialize();
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

function Load(jsonString) {
	Clear();

	var data = JSON.parse(jsonString);
	var Nodes = data[0];
	var Connections = data[1];
	var HTML = '';

	for (var index = 0; index < Nodes.length; index++) {
		var Node = Nodes[index];
		AddNode(Node.left, Node.top, Node.text).attr('id', Node.id);
	}
	
	jsPlumb.setSuspendDrawing(true);
	for (var index = 0; index < Connections.length; index++) {
		jsPlumb.connect({
			source: Connections[index][0],
			target: Connections[index][1]
		});
	}
	jsPlumb.setSuspendDrawing(false, true);
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
		if ($(event.target).is('div')) {
			return; 
		}

		$(document).focus();
	})

	$(document).dblclick(function (event) {
		if ($(event.target).is('div')) {
			return;
		}

		AddNode(event.clientX, event.clientY);
	});

	$('#openfile').change(function (event) {
		for (var i = 0; i < this.files.length; i++) {
			LoadFile(this.files[i]);
			break;
		}
	});

	$('.remove-button').mousedown(function () {
		if (!confirm('Do you really want to remove this node?')) {
			return;
		}

		var parent = $(this).parent();
		RemoveNode(parent.attr('id'));
	})

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

function Initialize () {
	jsPlumb.importDefaults({
		Endpoint: ['Blank', {}],
		Connector: ['Bezier', { curviness: 20 }],
		HoverPaintStyle: { strokeStyle: '#42a62c', lineWidth: 1 },
		ConnectionOverlays: [
			['Arrow', {
				location: 1,
				id: 'arrow',
				length: 8,
				foldback: 1,
				width: 6
			}]//,
		//	['Label', { label: 'FOO', id: 'label' }]
		]
	});

	jsPlumb.bind('click', function (connection) {
		jsPlumb.detach(connection);
	});

	jsPlumb.bind('connection', function (info) {
		info.connection.setPaintStyle({ strokeStyle: '#989898' });
	//	info.connection.getOverlay('label').setLabel(info.connection.id);
	});
}

jsPlumb.ready(Initialize);
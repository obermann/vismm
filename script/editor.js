/*
NEW EDGE (CONNECT WITH SELECTED NODE)
Shift-Click (click on the node to connect to from the last selected node)

On version 8.3.3 -> 8.4 deselectNode parameter change from [ids] to [{}]
and so it broke the documentation https://visjs.github.io/vis-network/docs/network/#Events
On version 8.5.3 -> 8.5.4... deselectNode does not fire any more.
Use version 8.3.3:
https://unpkg.com/browse/vis-network@8.3.3/dist/
*/
visNetwork.addEventListener("deselectNode", function (e) {
	//console.log("deselectNode", e);
	if (e.event.srcEvent.shiftKey && e.nodes.length > 0
		// Check if an edge of ANY DIRECTION already exists.
		&& visNetwork.getConnectedNodes(e.nodes[0]).indexOf(e.previousSelection.nodes[e.previousSelection.nodes.length - 1]) === -1) {
		visDataSet.add({
			from: e.previousSelection.nodes[e.previousSelection.nodes.length - 1],
			to: e.nodes[0]
		}, "evEdit");
		// Restore selection.
		visNetwork.selectNodes(e.previousSelection.nodes, true);
	}
}, false);


visNetworkContainer.addEventListener("keydown", function (e) {
	if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === "Shift" && visNetwork.getSelectedNodes().length > 0) {
		visNetworkContainer.style.cursor = "crosshair";
	}
}, false);


visNetworkContainer.addEventListener("keyup", function (e) {
	if (e.key === "Shift") {
		visNetworkContainer.style.cursor = "";
	}
}, false);


/*
DELETE (NODES AND EDGES)
Win
Delete
Mac
Delete (equivalent of Backspace)

var keys = vis.keycharm({ container: visNetwork, preventDefault: true }); old recomendation do not work, alternative:
visNetwork.interactionHandler.navigationHandler.keycharm.bind("delete", function);
Anyway https://github.com/AlexDM0/keycharm do not work with key combinations.
*/
//visNetwork.canvas.frame.addEventListener("keydown", function (e) {
visNetworkContainer.addEventListener("keydown", function (e) {
	if (e.key === "Delete" || e.key === "Del" || e.key === "Backspace") {
		// visDataSet.remove(visNetwork.getSelectedEdges());
		// visDataSet.remove(visNetwork.getSelectedNodes());
		// visDataSet.flush();
		// Turns out that even with flush() two removals generate two events!
		var a = visNetwork.getSelectedEdges();
		Array.prototype.push.apply(a, visNetwork.getSelectedNodes());
		visDataSet.remove(a, "evEdit");
	}
}, false);

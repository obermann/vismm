var editorHistory = (function () {
	var records = [];
	var position = 0;
	function store(event, properties, senderId) {
		if (senderId === "ignore") return;
		if (senderId === "clear") {
			records = [];
			position = 0;
			return;
		}
		// Forget possible redos.
		records.length = position;
		records.push({ event: event, properties: properties });
		// event: "add|update|remove",
		// properties.items: [id],
		// properties.oldData: [{ node|edge }]
		position += 1;
	}
	function subscribe() {
		visDataSet.on("*", store);
	}
	function unsubscribe() {
		visDataSet.off("*", store);
	}
	subscribe();
	return {
		undo: function () {
			if (position === 0) return;
			unsubscribe();
			position -= 1;
			switch (records[position].event) {
				case "add": // then remove
					records[position].properties.data = visDataSet.get(records[position].properties.items);
					visDataSet.remove(records[position].properties.items);
					break;
				case "update":
					/* data already stored by event
					records[position].properties.data = visDataSet.get(records[position].properties.items);*/
				case "remove": // then add
					visDataSet.update(records[position].properties.oldData);
			}
			subscribe();
		},
		redo: function () {
			if (position === records.length) return;
			unsubscribe();
			switch (records[position].event) {
				case "add":
				case "update":
					visDataSet.update(records[position].properties.data);
					break;
				case "remove":
					visDataSet.remove(records[position].properties.items);
			}
			position += 1;
			subscribe();
		}
	}
}());


/*
UNDO
Win
Ctrl-Z
Alt-Backspace
Mac
Command-Z
*/
visNetworkContainer.addEventListener("keydown", function (e) {
	if (
			(e.key === "Undo")
			|| (!e.altKey && !e.shiftKey &&
				(e.ctrlKey || e.metaKey) && e.keyCode === 90)
			|| (!e.ctrlKey && !e.metaKey && !e.shiftKey &&
				e.altKey && e.key === "Backspace")
		) {
		e.stopPropagation();
		e.preventDefault();
		editorHistory.undo();
	}
}, false);


/*
REDO
Win
Ctrl-Y
Ctrl-Shift-Z
Mac
Shift-Command-Z
*/
visNetworkContainer.addEventListener("keydown", function (e) {
	if (
			(e.key === "Redo")
			|| (!e.altKey && !e.shiftKey &&
				(e.ctrlKey || e.metaKey) && e.keyCode === 89)
			|| (!e.altKey &&
				(e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 90)
		) {
		e.stopPropagation();
		e.preventDefault();
		editorHistory.redo();
	}
}, false);

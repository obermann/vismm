var labelSeparator = "\n<i>";
var labelSeparatorMinus = -labelSeparator.length;


/*
Escape tags (visjs interprets only &lt; and &amp;).
TODO visjs escape not working bug at #17294 splitHtmlBlocks #17078 replace
https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/shared/LabelSplitter.js
*/
function escForVis(label) {
	return label
		.trim()
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.split(/\s*\n\s*/)
		.join(labelSeparator);
}


// DOT has explicit HTML tags list:
// http://www.graphviz.org/doc/info/shapes.html#html
var tagDisplay = (function () {
	var B = "block";
	var I = "inline";
	return {
		// HTML standard block:
		ADDRESS: B,
		ARTICLE: B,
		ASIDE: B,
		BLOCKQUOTE: B,
		CANVAS: B,
		DD: B,
		DIV: B,
		DL: B,
		DT: B,
		FIELDSET: B,
		FIGCAPTION: B,
		FIGURE: B,
		FOOTER: B,
		FORM: B,
		H1: B,
		H2: B,
		H3: B,
		H4: B,
		H5: B,
		H6: B,
		HEADER: B,
		HR: B,
		LI: B,
		MAIN: B,
		NAV: B,
		NOSCRIPT: B,
		OL: B,
		P: B,
		PRE: B,
		SECTION: B,
		TABLE: B,
		TFOOT: B,
		UL: B,
		VIDEO: B,

		// HTML standard inline:
		A: I,
		ABBR: I,
		ACRONYM: I,
		B: I,
		BDO: I,
		BIG: I,
		BR: I,
		BUTTON: I,
		CITE: I,
		CODE: I,
		DFN: I,
		EM: I,
		I: I,
		IMG: I,
		INPUT: I,
		KBD: I,
		LABEL: I,
		MAP: I,
		OBJECT: I,
		OUTPUT: I,
		Q: I,
		SAMP: I,
		SCRIPT: I,
		SELECT: I,
		SMALL: I,
		SPAN: I,
		STRONG: I,
		SUB: I,
		SUP: I,
		TEXTAREA: I,
		TIME: I,
		TT: I,
		VAR: I,

		// Customary and DOT HTML
		FONT: I,
		O: I,
		S: I,
		U: I,
		TD: B,
		TR: B,
		VR: B
	}
}());


// Reliable replacement for innerText.
function nodeToLabel(node) {
	// Pre-order tree traversal.
	var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false); //IE requires all params
	var text = "";
	var line = "";
	var inParagraph = false;

	function newLine() {
		if (line && (line = line.replace(/\s+/g, " ").trim())) {
			//text += line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + labelSeparator;
			// Since visjs unescapes only &amp; and &lt; we will need to escape &gt; at saving to DOT.
			//text += line.replace(/&/g, "&amp;").replace(/</g, "&lt;") + labelSeparator;
			// Since we may need to paste fragments, we will need a second stage transformation to visjs.
			text += line + "\n";
			line = "";
		}
	}

	function walk(node) {
		if (node === null) return;
		else if (node.nodeType === Node.TEXT_NODE) line += node.nodeValue;
		else if (node.tagName === "BR") newLine();
		else {
			var display = tagDisplay[node.tagName];
			if (!display) { // Imperfect fallback just in case and just for nodes inside viewed DOM.
				display = window.getComputedStyle(node).getPropertyValue("display");
				console.log("Special display of unknown tag " + node.tagName, ': "' + display + '"');
			}
			if (display && display !== "inline") {
				newLine();
				inParagraph = true;
			}
			walk(treeWalker.firstChild());
			if (inParagraph) {
				newLine();
				inParagraph = false;
			}
		}
		walk(treeWalker.nextNode());
	}

	walk(treeWalker.firstChild());
	newLine();
	//return text.slice(0, labelSeparatorMinus); see comment on newLine()
	return text;
}


function labelToName(label) {
	var i = label.indexOf("\n");
	return (i === -1)? label : label.substring(0, i);
}


// Our <div id="vis-network-container"> (visNetworkContainer) is just a dummy placeholder for
// the actual events processor and canvas container <div> that will be accessible as:
// visNetwork.canvas.frame
// e.g. visNetwork.canvas.frame.focus()
var visNetworkContainer = document.getElementById("vis-network-container");

// Using single general DataSet with two DataViews for simpler undo/redo tracking.
var visDataSet = new vis.DataSet();
var visDataViews = {
	nodes: new vis.DataView(visDataSet, {
		filter: function (item) {
			return !item.hasOwnProperty("to")
		}
	}),
	edges: new vis.DataView(visDataSet, {
		filter: function (item) {
			return item.hasOwnProperty("to")
		}
	})
}
var cache = (function () {
	var names = {};
	function add(data) {
		if (!data.label) return;
		var name = labelToName(data.label);
		if (names.hasOwnProperty(name)) {
			if (names[name].length === 1) {
				visDataSet.update({ id: names[name][0], group: "error" }, "evGroup");
			}
			visDataSet.update({ id: data.id, group: "error" }, "evGroup");
			names[name].push(data.id);
		}
		else {
			visDataSet.update({ id: data.id, group: "default" }, "evGroup");
			names[name] = [data.id];
		}
	}
	function remove(data) {
		if (!data.label) return;
		var name = labelToName(data.label);
		if (names[name].length === 1)
			delete names[name];
		else {
			names[name].splice(names[name].indexOf(data.id), 1);
			if (names[name].length === 1) {
				visDataSet.update({ id: names[name][0], group: "default" }, "evGroup");
			}
		}
	}
	function store(event, properties, senderId) {
		if (senderId === "evClear") {
			names = {};
			return;
		}
		switch (event) {
			case "add":
				visDataSet.get(properties.items).forEach(add);
				break;
			case "update":
				properties.data.forEach(function (data, i) {
					if (!data.label) return; // This update is not about label.
					remove(properties.oldData[i]);
					add(data);
				});
				break;
			case "remove":
				properties.oldData.forEach(remove);
		}
		//console.log("cache", JSON.stringify(names));
	}
	visDataViews.nodes.on("*", store);
	return {
		exists: function (name) {
			return names.hasOwnProperty(name)
		},
		getIds: function (name) {
			return names[name]
		},
		check: function () {
			for (var name in names) if (names[name].length > 1) return false;
			return true;
		},
		getErrors: function () {
			var errors = [];
			for (var name in names) if (names[name].length > 1) Array.prototype.push.apply(errors, names[name]);
			return errors;
		}
	}
}());


function merge(current, update) {
	Object.keys(update).forEach(function(key) {
		if (
			current.hasOwnProperty(key)
			&& typeof current[key] === "object"
			&& !(current[key] instanceof Array)
		)
			merge(current[key], update[key]);
		else
			current[key] = update[key];
	});
	return current;
}

// Preset options
var options = {
	interaction: {
		navigationButtons: false,
		multiselect: true,
		keyboard: {
			bindToWindow: false
		}
	},
	edges: {
		endPointOffset: {
			from: -3,
			to: -3
		},
		arrows: {
			from: {
				enabled: true,
				scaleFactor: 0.1,
				type: "circle"
			},
			to: {
				enabled: true,
				scaleFactor: 0.1,
				type: "circle"
			}
		}
	},
	nodes: {
		font: { // Defaults: face="arial", size=14
			multi: "html",
			align: "left",
			ital: {
				size: 10
			}
		},
		shape: "box"
	},
	groups: {
		useDefaultGroups: false
	},
	physics: {
		barnesHut: {
			avoidOverlap: 1,
			springConstant: 0.01,
			centralGravity: 0.2
		},
		forceAtlas2Based: {
			avoidOverlap: 1,
			springConstant: 0.04,
			centralGravity: 0.005
		},
		solver: "barnesHut" // Default is "barnesHut"
	}
}

options = merge(options, style.vis);

var visNetwork = new vis.Network(visNetworkContainer, visDataViews, options);
visNetwork.canvas.frame.focus();


visNetwork.addEventListener("dragStart", function (e) {
	visNetworkContainer.style.cursor = (e.nodes.length === 0 && e.edges.length === 0)? "all-scroll" : "grabbing";
});

visNetwork.addEventListener("dragEnd", function () {
	visNetworkContainer.style.cursor = ""; // "grab"
});


/*
ZOOM TO FIT
F4
Ctrl-E
*/
visNetworkContainer.addEventListener("keydown", function (e) {
	if (
			(!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey &&
				e.key === "F4") //e.keyCode === 115
			|| (!e.altKey && !e.shiftKey &&
				(e.ctrlKey || e.metaKey) && e.keyCode === 69)
		) {
		e.stopPropagation();
		e.preventDefault();
		visNetwork.fit({ animation: true });
	}
}, false);

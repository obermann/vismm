var fileInput = document.getElementById("file");


var io = (function () {
	var fileName = "new.gv";
	var interpreter = new DOMParser().parseFromString("", "text/html").createRange();

	/*
	For DOT quoted string need to escape symbols: \ & "
	For DOT HTML: \ & < >
	For visjs HTML label already escaped symbols: & <
	Left: \ >
	(Use it after visjs formatting was removed!)
	*/
	function escForDot(line) {
		return line.replace(/>/g, "&gt;").replace(/\\/g, "\\\\");
	}

	/*
	http://www.graphviz.org/doc/info/lang.html
	http://www.graphviz.org/doc/info/attrs.html#k:escString
	http://www.graphviz.org/doc/info/shapes.html#record

	Following GraphViz sources:
	graphviz-2.46.0\lib\common\labels.c make_label > strdup_and_subst_obj0, htmlEntityUTF8, make_simple_label | ^make_html_label
	graphviz-2.46.0\lib\common\htmltable.c > make_html_label > size_html_txt > ^strdup_and_subst_obj > ^strdup_and_subst_obj0
	graphviz-2.46.0\lib\common\shapes.c parse_reclbl > ^make_label

	Notes:
	Parser takes care about ports.
	DOT node name may contain linebreaks. Therefore forget about ensuring node headline uniqueness e.g. with adding that name to the label.
	*/
	function labelNode(data) {
		function subst_obj0(str, escBackslash) {
			return str.replace(/\\./g, function (match) {
				switch (match[1]) {
					case "N": return data.id;
					case "G": return data.dotAttributes.graphName;
					case "L": return (data.dotAttributes.node.label.type === "html")? data.dotAttributes.node.label.value : match; // This selectivity seems like GraphViz bug.
					//case "E": // This one is ignored by GraphViz for real, but L,T,H are shown. Lets show E too.
					//case "T":
					//case "H":
					case "\\": if (escBackslash) return "\\"; // SIC (HTML will show escaped and unescaped \)
					default: return match;
				}
			});
		}
		function defaultProc(label) {
			// Parse HTML entities.
			//label = interpreter.parseFromString(label.replace(/</g, "&lt;"), "text/html").body.textContent;
			label = interpreter.createContextualFragment(label.replace(/</g, "&lt;")).textContent;
			label = label.replace(/\\./g, function (match) {
				switch (match[1]) {
					case "l":
					case "n":
					case "r": return "\n";
					/*
					Theoretical /\\.?/g for EOL with
					case undefined: return "";
					is correct but impossible beacause a backslash escaping closing quotes mark will fail the whole parsing.
					*/
					default: return match[1];
				}
			});
			label = escForVis(label);
			return label;
		}
		var label;
		if (data.dotAttributes.node.label) {
			label = data.dotAttributes.node.label.value;
			if (
				data.dotAttributes.node.shape && (
					data.dotAttributes.node.shape.value === "record" ||
					data.dotAttributes.node.shape.value === "Mrecord"
				)
			) {
				console.log("DOT Import Report: Warning! Interpreting Record-based node label: " + label);
				label = label.replace(/\\./g, function (match) {
					switch (match[1]) {
						case "<": return "&lt;";
						case ">": return "&gt;";
						case "{": return "&#x7B;";
						case "|": return "&#x7C;";
						case "}": return "&#x7D;";
						case " ": return " ";//"&nbsp;"; We do not use "hard space".
						default: return match;
					}
				});
				if (data.dotAttributes.node.label.type === "html")
					label = label
						.replace(/[{}]/g, "")
						.replace(/\|/g, "<br />");
				else
					label = label
						.replace(/<[^>]+>/g, "")
						.replace(/[{}\n\r]/g, "")
						.replace(/\|/g, "\n");
			}
			switch (data.dotAttributes.node.label.type) {
				case "html":
					/*
					Parse HTML-like label.
					http://www.graphviz.org/doc/info/shapes.html#html
					Note that, in HTML strings, angle brackets must occur in matched pairs,
					and newlines and other formatting whitespace characters are allowed.
					In addition, the content must be legal XML, so that the special
					XML escape sequences for ", &, <, and > may be necessary in order
					to embed these characters in attribute values or raw text.
					HTML-like labels is very different from standard HTML
					to treat ordinary space characters as non-breaking.
					*/
					//label = label.replace(/ /g, "&nbsp;"); We do not need this.
					//var interpreter = document.getElementById("interpreter"); interpreter.innerHTML = label; label = interpreter.innerText; // XSS risk!
					//var interpreter = document.createRange(); interpreter.createContextualFragment(label); // XSS risk!
					// Only DOMParser is XSS safe.
					// Range or DOMParser do not know CSS values (even Range with actual selection).
					//label = nodeToLabel(interpreter.parseFromString(label, "text/html").body);
					label = nodeToLabel(interpreter.createContextualFragment(label));
					label = subst_obj0(label, true);
					label = escForVis(label);
					break;
				case "quoted":
					// Parse DOT (escString) label.
					label = subst_obj0(label);
					label = defaultProc(label);
					break;
			}
		}
		else { // Absent label is equivalent to label="\N".
			label = (data.dotNameType === 'string' || data.dotNameType === 'numeral')? data.id : defaultProc(data.id);
		}
		var newData = {
			id: data.id,
			label: label
		}
		var name = labelToName(label);
		var ids = cache.getIds(name);
		if (ids) {
			if (ids.length === 1) {
				visDataSet.update({ id: ids[0], group: "error" }, "ignore");
			}
			newData.group = "error";
		}
		else
			newData.group = "default";
		delete data.dotNameType;
		delete data.dotAttributes;
		visDataSet.update(newData, "ignore");
	}

	// New node def or spec. node attr application.
	function newNode(node_id, attributes, attr_list) {
		var data = visDataSet.get(node_id.name.value);
		if (data === null) {
			data = {
				id: node_id.name.value,
				dotNameType: node_id.name.type,
				dotAttributes: {}
			}
			for (var x in attributes) data.dotAttributes[x] = attributes[x];
			if (attr_list) {
				data.dotAttributes.node = Object.setPrototypeOf(attr_list, attributes.node);
			}
			visDataSet.add(data, "ignore");
		}
		else {
			if (attr_list) {
				data.dotAttributes.node = Object.setPrototypeOf(attr_list, data.dotAttributes.node);
				console.log("DOT Import Report: Info. Repeated statement for the same node: " + node_id.name.value);
			}
		}
		return data;
	}

	function connectNode(data, edges) {
		edges.from.forEach(function (edgeFrom) {
			if (visNetwork.getConnectedNodes(edgeFrom).indexOf(data.id) === -1)
				visDataSet.add({
					from: edgeFrom,
					to: data.id
				}, "ignore");
			else
				console.log("DOT Import Report: Warning! Ignoring repeated edge from: " + edgeFrom + " to: " + data.id);
		});
	}

	/*
	Configuration with initial call:
	Add to attributes param objects that will be used, e.g.
	walkDot(ast[0], { graph: {}, node: {}, edge: {} });
	For now edge is not implemented.
	*/
	function walkDot(tree, attributes, edges) {
		switch (tree.type) {
			case "node_id": // Called only from the context of edge_stmt.
				connectNode(newNode(tree, attributes), edges);
				edges.to.push(tree.name.value);
				break;
			case "node_stmt":
				var data = newNode(tree.node_id, attributes, tree.attr_list);
				if (edges) {
					connectNode(data, edges);
					edges.to.push(tree.node_id.name.value);
				}
				break;
			case "edge_stmt": // Not precise, but less clunky code.
				var newEdges = {
					from: (edges)? edges.from : [],
					to: []
				}
				for (var i = 0; i < tree.edge_list.length; i++) {
					walkDot(tree.edge_list[i], attributes, newEdges);
					if (edges) {
						Array.prototype.push.apply(edges.to, newEdges.to);
						Array.prototype.push.apply(newEdges.to, edges.from);
					}
					newEdges = {
						from: newEdges.to,
						to: []
					}
				}
				break;
			case "attr_stmt":
				if (attributes.hasOwnProperty(tree.target))
					attributes[tree.target] = Object.setPrototypeOf(tree.attr_list, attributes[tree.target]);
				break;
			case "graph":
			case "digraph":
				attributes.graphName = (tree.hasOwnProperty("name"))? tree.name.value : "";
			default:
				if (tree.hasOwnProperty("stmt_list")) { // case of "graph" "digraph" "subgraph"
					var attributesCopy = {};
					for (var x in attributes) attributesCopy[x] = attributes[x];
					//attributesCopy.graphName = (tree.hasOwnProperty("name"))? tree.name.value : ""; SIC! \G in node labels ignores subgraph name.
					tree.stmt_list.forEach(function (stmt) { walkDot(stmt, attributesCopy, edges) });
				}
		}
	}

	return {
		open: function (file) {
			var reader = new FileReader();
			reader.onload = function (e) { // Read.
				//var dot = vis.parseDOTNetwork(e.target.result);
				//var dot = vis.network.convertDot(e.target.result);
				//var dot = vis.network.dotparser.parseDOT(e.target.result);
				var ast;
				try {
					ast = dot.parse(e.target.result);
				}
				catch (error) {
					// No graph is error too.
					console.error(error);
					alert(error + "\nLocation: " + JSON.stringify(error.location, null, 4));
					return;
				}
				//console.log("AST", ast);
				visNetwork.physics.enabled = false;
				//visDataSet.setOptions({ queue: true });
				visDataSet.clear("clear");
				walkDot(ast[0], { node: {} }); // Importing first DOT graph only.
				visDataViews.nodes.forEach(labelNode);
				console.log("DOT Import Report: Info. Imported nodes: " + visDataViews.nodes.length + " edges: " + visDataViews.edges.length);
				//console.log("nodes", visDataViews.nodes.get());
				//visDataSet.setOptions({ queue: false });
				visNetwork.physics.enabled = true;
			};
			reader.readAsText(file);
			fileName = file.name;
		},
		save: function () {
			/*
			var errors = visDataViews.nodes.get({
				filter: function (node) {
					return (node.group === "error")
				}
			});
			*/
			var errors = cache.getErrors();
			if (errors.length) {
				visNetwork.fit({
					nodes: errors,
					animation: true
				});
				alert("There are nodes with the same name.\nCannot save.");
				return;
			}
			// DOT does not support Unicode BOM.
			var s = 'strict graph {\n';
			s += 'charset="UTF-8"\n';
			s += 'graph [overlap=false, splines=true, nodesep="0.36"]\n';
			s += 'node [shape="box", style="rounded, filled", color="lightgray", fontname="sans-serif"]\n';
			s += '/*\nTo decorate edges, e.g. like arrows, uncomment the following edge statement.\n';
			s += 'http://www.graphviz.org/doc/info/attrs.html#k:arrowType\n*/\n';
			s += '//edge [dir=forward, arrowtail=normal, arrowhead=normal]\n\n';
			visDataViews.nodes.forEach(function (node) {
				var a = node.label.split(labelSeparator);
				var name = escForDot(a[0]);
				if (a.length === 1)
					// Just to declare.
					s += '<' + name + '> [\nlabel=<' + name + '>\n]\n\n';
				else {
					s += '<' + name + '> [\nlabel=<' + name + '<font point-size="9"><br align="left"/><i>\n';
					for (var i = 1; i < a.length; i++)
						s += escForDot(a[i]) + '<br align="left"/>\n';
					s += '</i></font>>\n]\n\n';
				}
			});
			visDataViews.edges.forEach(function (edge) {
				var a = visNetwork.getConnectedNodes(edge.id);
				s += "\n<" + escForDot(labelToName(visDataSet.get(a[0]).label)) + "> -- <" + escForDot(labelToName(visDataSet.get(a[1]).label)) + ">";
			});
			s += "\n}";
			var b = new Blob([s], { type: "text/plain" });
			var a = document.getElementById("a");
			a.download = fileName;
			a.href = window.URL.createObjectURL(b);
			a.click();
			// TODO Since html5 you may use the LocalStorage API.
		}
	}
}());


/*************/
/*** Input ***/
/*************/
/*
DRAG & DROP TO OPEN FILE

https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
We don't actually need to do anything with the dragenter and dragover events in our case.
They just stop propagation of the event and prevent the default action from occurring.
*/
visNetworkContainer.addEventListener("dragenter", function (e) {
	e.stopPropagation();
	e.preventDefault();
}, false);

visNetworkContainer.addEventListener("dragover", function (e) {
	e.stopPropagation();
	e.preventDefault();
}, false);

visNetworkContainer.addEventListener("drop", function (e) {
	e.stopPropagation();
	e.preventDefault();
	io.open(e.dataTransfer.files[0]);
}, false);

fileInput.addEventListener("change", function (e) {
	//io.open(this.files[0]);
	io.open(e.target.files[0]);
}, false);

/*
OPEN FILE
Ctrl-O
*/
visNetworkContainer.addEventListener("keydown", function (e) {
	if (!e.altKey && !e.shiftKey &&
			(e.ctrlKey || e.metaKey) && e.keyCode === 79) {
		e.stopPropagation();
		e.preventDefault();
		fileInput.value = ""; // Enable onchange when selecting the same file.
		fileInput.click();
	}
}, false);


/**************/
/*** Output ***/
/**************/
/*
SAVE TO FILE (DOWNLOAD)
Ctrl-S
*/
visNetworkContainer.addEventListener("keydown", function (e) {
	if (!e.altKey && !e.shiftKey &&
			(e.ctrlKey || e.metaKey) && e.keyCode === 83) {
		e.stopPropagation();
		e.preventDefault();
		io.save();
	}
}, false);

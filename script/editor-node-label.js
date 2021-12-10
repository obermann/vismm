var editor = document.getElementById("editor");
var editorNodeLabel = document.getElementById("editor-node-label");


var nodeLabel = (function () {
	var separator = "P";
	var data = null;
	var ranges = [];
	var observer = new MutationObserver(function(recordList, observer) {
		observer.disconnect();
		editorNodeLabel.className = "";
	});

	var padding = 72; // px
	var fontSize = window.getComputedStyle(editorNodeLabel).getPropertyValue("font-size").match(/([+-]?[\d\.]+(?:e[+-]?\d+)?)(.*)/); //[string, number, unit]
	var currentFontSize = fontSize[1] = parseFloat(fontSize[1]);
	var lastWidthDiff, lastHeightDiff = 0;

	function resize() {
		if (editor.style.display === "none") return;
		var widthDiff = document.body.parentNode.clientWidth - editorNodeLabel.scrollWidth;
		var heightDiff = document.body.parentNode.clientHeight - editorNodeLabel.scrollHeight;
		if (lastWidthDiff === widthDiff && lastHeightDiff === heightDiff) return;

		function fontDownSize() {
			while (
				(lastWidthDiff = document.body.parentNode.clientWidth - editorNodeLabel.scrollWidth) < padding
				|| (lastHeightDiff = document.body.parentNode.clientHeight - editorNodeLabel.scrollHeight) < padding
			) {
				currentFontSize -= 1;
				editorNodeLabel.style.fontSize = currentFontSize + fontSize[2];
				//console.log("font", currentFontSize);
			};
			editorNodeLabel.style.left = Math.floor(lastWidthDiff / 2) + "px";
			editorNodeLabel.style.top = Math.floor(lastHeightDiff / 2) + "px";
		}

		if (widthDiff < padding || heightDiff < padding) {
			// Font down.
			fontDownSize();
		}
		else {
			if (
				currentFontSize !== fontSize[1]
				&& (lastWidthDiff < widthDiff || lastHeightDiff < heightDiff)
			) {
				// Font up then down.
				editorNodeLabel.style.fontSize = fontSize[1] + fontSize[2];
				currentFontSize = fontSize[1];
				fontDownSize();
			}
			else {
				if (lastWidthDiff !== widthDiff) {
					editorNodeLabel.style.left = Math.floor(widthDiff / 2) + "px";
					lastWidthDiff = widthDiff;
				}
				if (lastHeightDiff !== heightDiff) {
					editorNodeLabel.style.top = Math.floor(heightDiff / 2) + "px";
					lastHeightDiff = heightDiff;
				}
			}
		}
	};

	document.execCommand("defaultParagraphSeparator", false, separator);
	document.execCommand("insertBrOnReturn", false, false);
	editor.style.display = "none";

	return {
		edit1: function(e) {
			if (e.nodes.length === 0) {
				// New node.
				data = [{
					label: "",
					group: "default",
					x: e.pointer.canvas.x,
					y: e.pointer.canvas.y
				}];
			} else {
				var n = visDataSet.get(e.nodes[0]);
				// Need to copy a node to follow implied read-only intent!
				data = [{
					id: n.id,
					label: n.label,
					group: n.group
				}]
			}
			if (style.transition && style.transition.edit) {
				style.transition.edit(nodeLabel.edit2, e);
			}
			else {
				nodeLabel.edit2();
			}
		},
		edit2: function () {
			editorNodeLabel.innerHTML = (data[0].label === "")? "" : "<" + separator + ">" + data[0].label.split(labelSeparator).join("</" + separator + "><" + separator + ">") + "</" + separator + ">";
			if (data[0].group === "error") {
				editorNodeLabel.className = "error";
				observer.observe(editorNodeLabel, { subtree: true, childList: true, characterData: true });
			}
			editor.style.display = "block";
			resize();
			// Focus.
			var r = document.createRange();
			r.selectNodeContents(editorNodeLabel);
			r.collapse(false);
			ranges = [r];
			editorNodeLabel.focus(); // calls this.restoreSelection()
		},
		save1: function (e) {
			var label = escForVis(nodeToLabel(editorNodeLabel));
			var newName = labelToName(label);
			//if (visDataViews.nodes.get({ filter: function (item) { return ((labelToName(item.label) === newName) && (item.id !== data[0].id)) } }).length) {
			var a = cache.getIds(newName);
			if (a && (a.length > 1 || a[0] !== data[0].id)) {
				//editorNodeLabel.normalize(); do not work because browser inserts <span>s
				editorNodeLabel.className = "error";
				observer.observe(editorNodeLabel, { subtree: true, childList: true, characterData: true });
				return false;
			}
			if (data[0].group === "error") {
				var a = cache.getIds(labelToName(data[0].label));
				if (a.length === 2)
					data.push({ id: visDataViews.nodes.get(a[1 - a.indexOf(data[0].id)]).id, group: "default" });
				data[0].group = "default";
			}
			data[0].label = label;
			observer.disconnect();
			editor.style.display = "none";
			if (style.transition && style.transition.save) {
				style.transition.save(nodeLabel.save2, e);
			}
			else {
				nodeLabel.save2();
			}
			visNetwork.canvas.frame.focus();
		},
		save2: function () {
			visDataSet.update(data);
		},
		quit: function (e) {
			observer.disconnect();
			editor.style.display = "none";
			editorNodeLabel.className = "";
			if (style.transition && style.transition.cancel) {
				style.transition.cancel(function () {}, e);
			}
			visNetwork.canvas.frame.focus();
		},
		storeSelection: function () {
			var s = window.getSelection();
			ranges = new Array(s.rangeCount);
			for (var i = 0; i < s.rangeCount; i++) {
				ranges[i] = s.getRangeAt(i);
			}
		},
		restoreSelection: function () {
			var s = window.getSelection();
			s.removeAllRanges();
			for (var i = 0; i < ranges.length; i++) {
				s.addRange(ranges[i]);
			}
		},
		paste: function (e) {
			var a = (e.dataTransfer || e.clipboardData || window.clipboardData).getData("text");
			if (!a) return false;
			e.stopPropagation();
			e.preventDefault();
			a = a.split(/[\r\n]+/g);
			var paste = a[0];
			for (var i = 1; i < a.length; i++)
				paste += "<" + separator + ">" + a[i] + "</" + separator + ">";
			if (document.queryCommandSupported("insertHTML"))
				document.execCommand("insertHTML", false, paste);
			else { //Internet Explorer //.insertAdjacentHTML ("afterBegin", paste);
				var selection = window.getSelection();
				if (!selection.rangeCount) return false;
				selection.deleteFromDocument();
				var range = selection.getRangeAt(0);
				var documentFragment = range.createContextualFragment(paste);
				range.insertNode(documentFragment);
			}
			resize();
		},
		resize: function () { resize() }
	}
}());


visNetwork.addEventListener("doubleClick", function (e) {
	e.event.srcEvent.stopPropagation();
	e.event.srcEvent.preventDefault();
	nodeLabel.edit1(e);
}, false);


// To restore selection when returning to editor.
editor.addEventListener("click", function (e) {
	e.stopPropagation();
	e.preventDefault();
	editorNodeLabel.focus();
}, false);


/*
CLOSE EDITOR WITHOUT SAVE
Escape
*/
editor.addEventListener("keydown", function (e) {
	if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
		&& (e.key === "Escape" || e.key === "Esc")) {
		e.stopPropagation();
		e.preventDefault();
		nodeLabel.quit(e);
	}
}, false);


/*
CLOSE EDITOR AND SAVE
Ctrl-S
*/
editor.addEventListener("keydown", function (e) {
	if (!e.altKey && !e.shiftKey &&
			(e.ctrlKey || e.metaKey) && e.keyCode === 83) {
		e.stopPropagation();
		e.preventDefault();
		nodeLabel.save1(e);
	}
}, false);


editorNodeLabel.addEventListener("paste", nodeLabel.paste, false);
editorNodeLabel.addEventListener("drop", nodeLabel.paste, false);


editorNodeLabel.addEventListener("blur", nodeLabel.storeSelection, false);
editorNodeLabel.addEventListener("focus", nodeLabel.restoreSelection, false);


editorNodeLabel.addEventListener("keyup", nodeLabel.resize, false);
window.addEventListener("resize", nodeLabel.resize, false);

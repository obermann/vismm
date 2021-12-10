/*
https://ethanschoonover.com/solarized/

Do not count on inheritance:
vis.js "inherit" is more like "copy value of particular property for another particular property".
*/

var style = (function () {
	var solar = {
		base03 : "#002b36",
		base02 : "#073642",
		base01 : "#586e75",
		base00 : "#657b83",
		base0  : "#839496",
		base1  : "#93a1a1",
		base2  : "#eee8d5",
		base3  : "#fdf6e3",

		yellow : "#b58900",
		orange : "#cb4b16",
		red    : "#dc322f",
		magenta: "#d33682",
		violet : "#6c71c4",
		blue   : "#268bd2",
		cyan   : "#2aa198",
		green  : "#859900"
	}
	var position = null;
	var sprite = null;
	var currentCallback = null;

	function afterTransition() {
		if (currentCallback === null) return; // Perform only once per transition of all props.
		sprite.style.zIndex = "-1";
		currentCallback();
		currentCallback = null;
	}

	window.addEventListener("load", function (e) {
		sprite = document.createElement("div");
		sprite.id = "sprite";
		document.body.appendChild(sprite);
		sprite.addEventListener("transitionend", afterTransition);
	});

	return {
		vis: {
			nodes: {
				color: {
					border: solar.base00,
					highlight: {
						border: solar.base01
					}
				},
				labelHighlightBold: false
				//shadow: { color:  solar.base1 }
			},
			groups: {
				default: {
					chosen: {
						// If "node: false" then super.borderWidthSelected ignored!
						//node: function (values, id, selected, hovering) {},
						label: function (values, id, selected, hovering) {
							values.color = solar.base01
						}
					},
					color: {
						background: solar.base2,
						highlight: {
							background: solar.base2
						}
					},
					font: {
						color: solar.base00
					}
				},
				error: {
					chosen: {
						label: function (values, id, selected, hovering) {
							values.color = solar.base3
						}
					},				
					color: {
						background: solar.red,
						highlight: {
							background: solar.red
						}
					},
					font: {
						color: solar.base2
					}
				}
			},
			edges: {
				//arrows: "middle",
				chosen: {
					// If "edge: false" then super.selectionWidth ignored!
					edge: function(values, id, selected, hovering) {
						//values.inheritsColor = true //do not inherit from node>highlight>border, do not work at all @8.3.3
						values.color = solar.base01,
						values.width = 2
					}
				},
				//color: { inherit: "from" }, // Default
				labelHighlightBold: false,
				/* Possible options:
					dynamic
					continuous
					discrete
					diagonalCross
					straightCross
					horizontal
					vertical
					curvedCW
					curvedCCW
					cubicBezier
				https://visjs.github.io/vis-network/examples/network/edgeStyles/smooth.html
				Control for performace (dynamic is default and the heaviest)! */
				//smooth: { type: "continuous" }
			}
		},
		transition: {
			edit: function (callback, e) {
				currentCallback = callback;
				sprite.style.transition = "none"; // Transition: off.
				sprite.style.backgroundColor = "";
				if (e.nodes.length === 0) {
					position = {
						left: e.event.srcEvent.clientX + "px",
						top: e.event.srcEvent.clientY + "px",
						width: "1em",
						height: "1em"
					}
				}
				else {
					var box = visNetwork.getBoundingBox(e.nodes[0]);
					var lt = visNetwork.canvasToDOM({ x: box.left, y: box.top });
					var rb = visNetwork.canvasToDOM({ x: box.right, y: box.bottom });
					position = {
						left: lt.x + "px",
						top: lt.y + "px",
						width: (rb.x - lt.x) + "px",
						height: (rb.y - lt.y) + "px"
					}
				}
				sprite.style.left = position.left;
				sprite.style.top = position.top;
				sprite.style.width = position.width;
				sprite.style.height = position.height;
				/* https://stackoverflow.com/a/16575811
				The browser is caching the styling changes that it needs to make
				until the JavaScript has finished executing,
				and then making all the changes in a single reflow.
				Firefox may execute the setTimeout() function before the reflow.
				The closest thing there is to a 'standard' way to force a reflow of the element
				is to read the offsetHeight property of the element.
				*/
				sprite.offsetHeight;
				with (sprite.style) {
					transition = ""; // Transition: on (as defined in css).
					zIndex = "100";
					left = "0";
					top = "0";
					width = "100%";
					height = "100%";
				}
			},
			save: function (callback) {
				currentCallback = callback;
				sprite.style.zIndex = "100";
				sprite.style.left = position.left;
				sprite.style.top = position.top;
				sprite.style.width = position.width;
				sprite.style.height = position.height;
			},
			cancel: function (callback) {
				currentCallback = callback;
				sprite.style.zIndex = "100";
				sprite.style.backgroundColor = "transparent";
			}
		}
	}
}());

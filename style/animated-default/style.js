var style = (function () {
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
				labelHighlightBold: false
			},
			groups: {
				//default: {}, //skip this in hope of visjs always returns to its default style
				error: {
					color: {
						background: "fuchsia",
						border: "red",
						highlight: {
							background: "#FF90FF",
							border: "red"
						}
					}
				}
			},
			edges: {
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

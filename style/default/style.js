/*
Do not count on inheritance:
vis.js "inherit" is more like "copy value of particular property for another particular property".
*/
var style = {
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
			color: "#2B7CE9" // Do not want to inherit color from group:error nodes.
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
	}
}

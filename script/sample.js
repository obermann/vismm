/*
Example of how to construct initial graph.
*/
//visDataSet.clear("clear");
visDataSet.add([
	{
		id: "1",
		label: "First\n<i>One",
		group: "default"
	},
	{
		id: "2",
		label: "Second\n<i>Two",
		group: "default"
	},
	{
		id: "3",
		label: "Third\n<i>Three",
		group: "default"
	},
	{
		from: "1",
		to: "2"
	},
	{
		from: "2",
		to: "3"
	},
	{
		from: "3",
		to: "1"
	}
], "ignore");

/*
Example of how to construct initial graph.
*/
//visDataSet.clear("evClear");
visDataSet.add([
	{
		id: "1",
		label: "First\n<i>One"
	},
	{
		id: "2",
		label: "Second\n<i>Two"
	},
	{
		id: "3",
		label: "Third\n<i>Three"
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
]);

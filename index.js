var reddit = require('./reddit').create(
	{
		cronPattern: "0 */5 * * * *",
		channel: "@peyman"
	}
);

reddit.run();

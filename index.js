var reddit = require('./reddit').create(
	{
		cronPattern: "0 */1 * * * *",
		channel: "@peyman"
	}
);

reddit.run();

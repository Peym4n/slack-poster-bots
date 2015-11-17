var reddit = require('./reddit').create(
	{
		cronPattern: "0 */1 * * * *"
	}
);

reddit.run();

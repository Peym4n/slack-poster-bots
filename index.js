var fs = require("fs");
var bots = [];
try {
	var botsStr = fs.readFileSync("bots.json");
	bots = JSON.parse(botsStr);
} catch(e) {
	console.error("Error loading bots.json!", e);
}
bots.forEach(function(botConfig) {
	var bot = null;
	try {
		bot = require('./' + botConfig.type).create(botConfig);
	} catch(e) {
		console.error("Error loading bot:", botConfig.type, e);
	}
	if(bot) bot.run();
});
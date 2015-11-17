var Bot = require('./bot');
var Slack = require('node-slack');
var webhook = "https://hooks.slack.com/services/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";
var slack = new Slack(webhook, {});
var storage = require('node-persist');
var request = require('request-json');
var client = request.createClient('https://www.reddit.com/');
var diff = require('simple-array-diff');
var fs = require("fs");
storage.initSync();
module.exports = {
	create: function(config) {
		config = config || {};
		var redditBot = new Bot({
			type: "reddit",
			name: config.name || "Reddit",
			icon: config.icon || null,
			channel: config.channel,
			msgFormat: config.msgFormat || "<%url%|%title%>\r\n%permalink%\r\n_By %author% | Score: %score% | Comments: %num_comments%_",
			cronPattern: config.cronPattern,
			options: {
				subs: config.subs || "reddit-subs.json",
				postCount: config.postCount || 10
			},
			onFetch: function(bot, callback) {
				var subs = JSON.parse(fs.readFileSync(bot.options.subs));
				subs.forEach(function(sub) {
					var cacheKey = getCacheKey(sub);
					console.log(cacheKey + ":", "fetching...");
					client.get(sub + '/.json?limit=' + bot.options.postCount, function(err, res, body) {
						if(err) return console.log(cacheKey + ":", err);
						var posts = {};
						var ids = [];
						body.data.children.forEach(function(child) {
							ids.push(child.data.id);
							posts[child.data.id] = child.data;
						});
						var cache = storage.getItem(bot.type + "." + cacheKey);
						var results = {added: [], removed: [], common: []};
						if(cache) {
							//console.log(cacheKey + ":", "cached items found");
							results = diff(cache, ids);
							if(results.added.length) {
								console.log(cacheKey + ":", "found " + results.added.length + " new post(s).");
								console.log(cacheKey + ":", "added:", results.added);
								callback(results.added.map(function(id) { return posts[id]; }));
							} else {
								console.log(cacheKey + ":", "no new posts found.");
							}
						} else {
							console.log(cacheKey + ":", "no cache found!");
							console.log(cacheKey + ":", "current:", ids);
						}
						if(results.added.length || !results.common.length) {
							console.log(cacheKey + ":", "updating cache...");
							storage.setItem(bot.type + "." + cacheKey, ids);
						}
					});
				});
			},
			onPost: function(bot, data, callback) {
				console.log("posting data:", data.length);
				data.forEach(function(post) {
					slack.send({
						text: bot.msgFormat.replace(/%([^%]+)%/g, function(match, p1) { return post[p1]; }),
						channel: '@peyman',
						icon_emoji: ":reddit:",
						unfurl_links: true
					});
				});
			}
		});
		return redditBot;
	}
};

function getCacheKey(sub) {
	if(sub[sub.length-1] === "/") sub = sub.slice(0, -1);
	var lastIdx = sub.lastIndexOf("/");
	if(lastIdx > -1) sub = sub.slice(lastIdx + 1);
	return sub;
}
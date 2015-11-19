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
			icon: config.icon || "https://camo.githubusercontent.com/b13830f5a9baecd3d83ef5cae4d5107d25cdbfbe/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f3732313033382f313732383830352f35336532613364382d363262352d313165332d383964312d3934376632373062646430332e706e67",
			channel: config.channel,
			msgFormat: config.msgFormat || "<%url%|%title%>\r\n<https://www.reddit.com%permalink%|_%subreddit%: by %author% | :+1::skin-tone-2: %score% | :speech_balloon: %num_comments% | :mantelpiece_clock: %created_time_str%_>",
			cronPattern: config.cronPattern,
			options: {
				subs: config.subs || "reddit-subs.json",
				postCount: config.postCount || 10
			},
			onFetch: function(bot, callback) {
				var subs = JSON.parse(fs.readFileSync(bot.options.subs));
				subs.forEach(function(sub, idx) {
					setTimeout(function() {
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
							var cache = storage.getItem(bot.type + "." + cacheKey) || [];
							var cacheDiff = diff(cache, ids);
							if(cache.length) {
								//console.log(cacheKey + ":", "cached items found");
								if(cacheDiff.added.length) {
									console.log(cacheKey + ":", "found " + cacheDiff.added.length + " new post(s).");
									console.log(cacheKey + ":", "added:", cacheDiff.added);
									callback(cacheDiff.added.map(function(id) { return posts[id]; }));
								} else {
									console.log(cacheKey + ":", "no new posts found.");
								}
							} else {
								console.log(cacheKey + ":", "no cache found!");
								console.log(cacheKey + ":", "current:", ids);
							}
							if(cacheDiff.added.length) {
								var cache = cacheDiff.added.concat(cacheDiff.common).concat(cacheDiff.removed);
								while(cache.length > 100) {
									cache.pop();
								}
								console.log(cacheKey + ":", "updating cache...");
								storage.setItem(bot.type + "." + cacheKey, cache);
							}
						});
					}, idx * 30000);
				});
			},
			onPost: function(bot, data, callback) {
				console.log("posting data:", data.length);
				data.forEach(function(post) {
					var createdTimeStr = new Date(post.created_utc * 1000).toString();
					post.created_time_str = createdTimeStr.slice(0, createdTimeStr.indexOf(' ('));
					var msgData = {
						text: bot.msgFormat.replace(/%([^%]+)%/g, function(match, p1) { return post[p1]; }),
						channel: bot.channel,
						unfurl_media: true,
						unfurl_links: false
					};
					if(bot.icon) {
						msgData[bot.icon[0] === ":" ? "icon_emoji" : "icon_url"] = bot.icon;
					}
					slack.send(msgData);
				});
			}
		});
		return redditBot;
	}
};

function getCacheKey(sub) {
	if(sub[0] === "/") sub = sub.slice(1);
	if(sub[sub.length-1] === "/") sub = sub.slice(0, -1);
	var idx = sub.indexOf("/");
	if(idx > -1) sub = sub.slice(idx + 1);
	sub = sub.replace(/\//g, "_");
	return sub;
}
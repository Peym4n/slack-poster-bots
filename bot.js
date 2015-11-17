var CronJob = require('cron').CronJob;
function Bot(config) {
	config = config || {};
	this.name = config.name || "bot";
	this.type = config.type || "bot";
	this.icon = config.icon || null;
	this.channel = config.channel || "";
	this.msgFormat = config.msgFormat || "";
	this.cronPattern = config.cronPattern || "*/10 * * * *";
	this.options = config.options || {};
	this.cronJob = null;
	this.onFetch = config.onFetch || function() {};
	this.onPost = config.onPost || function() {};
}
Bot.prototype.fetch = function(callback) {
	console.log("fetching...");
	var me = this;
	return me.onFetch && me.onFetch(me, function(data) {
		if(data) {
			me.post(data, callback);
		}
	});
};
Bot.prototype.post = function(data, callback) {
	console.log("posting...");
	return this.onPost && this.onPost(this, data, callback);
};
Bot.prototype.run = function(callback) {
	console.log("running...");
	if(this.cronJob) {
		console.log("cronJob exists, starting...");
		this.cronJob.start();
	} else {
		console.log("no cronJob, creating...");
		var me = this;
		me.cronJob = new CronJob({
			cronTime: me.cronPattern,
			onTick: function() {
				console.log("cronJob tick.");
				me.fetch(callback);
			},
			start: true,
			runOnInit: true
		});
	}
};
Bot.prototype.stop = function(data) {
	if(this.cronJob) this.cronJob.stop();
};
module.exports = Bot;
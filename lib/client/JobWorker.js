/**
 * Powered by Andy <andy@away.name>.
 * Date: 03.08.13
 */
var WebSocket = require('ws')
	, Errors = require('../Errors')
	, events = require('events')
	, util = require('util')
	, EventEmitter = events.EventEmitter
	, uuid = require('node-uuid');

var JobWorker = function(options){
	this._onOpen = this._onOpen.bind(this);
	this._onMessage = this._onMessage.bind(this);
	this._onClose = this._onClose.bind(this);
	this.options = options || {};
	this.options.host = this.options.host || "localhost";
	this.options.port = this.options.port || 80;
	this.options.maxqps = this.options.maxqps || 10;

	this.id = null;
	this.requests = {};
	this.ws = new WebSocket('ws://' + this.options.host + ":" + this.options.port);
	this.ws.on('open', this._onOpen);
	this.ws.on('close', this._onClose);
	this.ws.on('message', this._onMessage);

	this.isOpen = false;
	this.functions = {};
};

/**
 * Inherits from EventEmitter.
 */
util.inherits(JobWorker, events.EventEmitter);

/**
 * Event on open
 * @private
 */
JobWorker.prototype._onOpen = function(){
	this.isOpen = true;
	this.emit('open');
};

/**
 * Event on WebSocket message
 * @param data
 * @param flag
 * @private
 */
JobWorker.prototype._onMessage = function(data, flag){
	var self = this;
	var msg = null;
	try{
		msg = JSON.parse(data);
	}catch (err){
		return;
	}
	if (msg.type === "worker-id"){
		self.id = msg.id;
		self._executeCommand({type: "register", data: {
			maxqps: this.options.maxqps,
			executable: true
		}}, function(err, result){
			if (err){
				self.emit('error', new Error(Errors.E3003(err)));
			} else {
				self.emit('register');
			}
		});
	} else if (msg.type === "notification"){
		var job = msg.job;
		var functionExists = false;
		for(var key in this.functions) if (this.functions.hasOwnProperty(key)){
			if (key === job.name){
				functionExists = true;
				break;
			}
		}
		if (!functionExists) return;
		self._executeCommand({type: "take-job", data: {jobId: job.id}}, function(err, result){
			if (err) {
				self.emit('error', new Error(Errors.E5001(err)));
			} else {
				self._executeJob(job, function(err, result){
					self._executeCommand({type: "complete-job", data: {jobId: job.id, error: err, result: result}}, function(err, result){
						self.emit('job-complete', job);
					});
				});
			}
		});
	} else {
		var request = this.requests[msg.id];
		delete this.requests[msg.id];
		if (msg.success){
			request(null, msg.result);
		} else {
			request(msg.error);
		}
	}
};

/**
 *
 * @param data
 * @param callback
 * @private
 */
JobWorker.prototype._executeCommand = function(data, callback){
	var self = this;
	data.id = uuid.v4();
	this.requests[data.id] = callback;
	try{
		this.ws.send(JSON.stringify(data));
	}catch (err){
		self.emit('error', new Error(Errors.E1001(err)));
	}
};

/**
 * Execute job
 * @param job
 * @param callback
 */
JobWorker.prototype._executeJob = function(job, callback){
	var func = this.functions[job.name];
	if (func == null){
		callback(Errors.E5000());
		return;
	}
	job.args.push(callback);
	func.apply(this, job.args);
};

/**
 * Event on close
 * @private
 */
JobWorker.prototype._onClose = function(){
	this.isOpen = false;
	this.emit('close');
};

/**
 * Register worker function
 * @param {String} name Function name
 * @param {Function} func
 */
JobWorker.prototype.registerFunction = function(name, func){
	this.functions[name] = func;
};

module.exports = exports = JobWorker;
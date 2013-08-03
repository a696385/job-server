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

var JobClient = function(options){
	this._onOpen = this._onOpen.bind(this);
	this._onMessage = this._onMessage.bind(this);
	this._onClose = this._onClose.bind(this);
	this.options = options || {};
	this.options.host = this.options.host || "localhost";
	this.options.port = this.options.port || 80;

	this.id = null;
	this.requests = {};
	this.ws = new WebSocket('ws://' + this.options.host + ":" + this.options.port);
	this.ws.on('open', this._onOpen);
	this.ws.on('close', this._onClose);
	this.ws.on('message', this._onMessage);

	this.isOpen = false;
};

/**
 * Inherits from EventEmitter.
 */
util.inherits(JobClient, events.EventEmitter);

/**
 * Event on open
 * @private
 */
JobClient.prototype._onOpen = function(){
	this.isOpen = true;
	this.emit('open');
};

/**
 * Event on WebSocket message
 * @param data
 * @param flag
 * @private
 */
JobClient.prototype._onMessage = function(data, flag){
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
			executable: false
		}}, function(err, result){
			if (err){
				self.emit('error', new Error(Errors.E3003(err)));
			} else {
				self.emit('register');
			}
		});
	} else {
		var request = this.requests[msg.id];
		delete this.requests[msg.id];
		if (msg.success){
			request(null, msg.result, msg.workerId);
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
JobClient.prototype._executeCommand = function(data, callback){
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
 * Event on close
 * @private
 */
JobClient.prototype._onClose = function(){
	this.isOpen = false;
	this.emit('close');
};

JobClient.prototype.registerFunction = function(name){
	this[name] = function(){
		var args = Array.prototype.slice.call(arguments);
		var callback = args.pop();
		this._executeCommand({type: "create-job", data: {
			name: name,
			args: args
		}}, callback);
	};
	this[name + "ByWorker"] = function(){
		var args = Array.prototype.slice.call(arguments);
		var workerId = args.shift();
		var callback = args.pop();
		this._executeCommand({type: "create-job", data: {
			name: name,
			args: args,
			workerId: workerId
		}}, callback);
	};
};

module.exports = exports = JobClient;
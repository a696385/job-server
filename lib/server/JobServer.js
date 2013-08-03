/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var WebSocketServer = require('ws').Server
	, Errors = require('../Errors')
	, Worker = require('./Worker')
	, Store = require('./Store')
	, events = require('events')
	, util = require('util')
	, EventEmitter = events.EventEmitter;

/**
 * Jeb Server
 * @param options
 * @constructor
 */
var JobServer = function(options){
	this.options = options;
	this.store = new Store();
	this.wss = new WebSocketServer(options);
	this.wss.on('connection', this._onConnection.bind(this));
	this.wss.on('error', this._onError.bind(this));
	this.workers = [];
	this.waitings = {};
};

/**
 * Inherits from EventEmitter.
 */
util.inherits(JobServer, events.EventEmitter);

/**
 * Event on client connect
 * @param ws
 * @private
 */
JobServer.prototype._onConnection = function(ws){
	this.workers.push(new Worker(this, ws));
};

/**
 * Remove worker from server
 * @param {Worker} worker
 */
JobServer.prototype.removeWorker = function(worker){
	var index = this.workers.indexOf(worker);
	if (index !== -1) this.workers.splice(index, 1);
};

/**
 * Event on WebSocket error
 * @param err
 * @private
 */
JobServer.prototype._onError = function(err){
	this.emit('error', Errors.E1000(err));
};

/**
 * Get worker by id
 * @param {String} workerId
 */
JobServer.prototype.getWorker = function(workerId){
	for(var i = 0, len = this.workers.length; i < len; i++){
		if (this.workers[i].id === workerId) return this.workers[i];
	}
	return null;
};

module.exports = exports = JobServer;

/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var Errors = require('../Errors')
	, uuid = require('node-uuid');

/**
 * Client Worker
 * @param {JobServer} server Job Server instance
 * @param {WebSocket} ws Client WebSocket object
 * @constructor
 */
var Worker = function(server, ws){
	this._onJobCreate = this._onJobCreate.bind(this);
	this._onJobComplete = this._onJobComplete.bind(this);
	this._onMessage = this._onMessage.bind(this);
	this._onClose = this._onClose.bind(this);
	this._onError = this._onError.bind(this);

	this.id = uuid.v4();
	this.server = server;
	this.server.store.on('new-job', this._onJobCreate);
	this.server.store.on('completed-job', this._onJobComplete);
	this.ws = ws;
	this.ws.on('message', this._onMessage);
	this.ws.on('close', this._onClose);
	this.ws.on('error', this._onError);

	this.isOpen = true;
	this.isRegistered = false;
	this.isBloked = true;
	this.isExecutable = false;
	this.maxqps = -1;
	this.workedCount = 0;
	this.allowTake = null;

	this.send({type: "worker-id", id: this.id});
};

/**
 * Event on worker error
 * @param err
 * @private
 */
Worker.prototype._onError = function(err){
	this.server.emit('error', err);
};

/**
 * Event on worker message
 * @param data
 * @param flags
 * @private
 */
Worker.prototype._onMessage = function(data, flags){
	var self = this;
	var sendError = function(requestId, err){
		self.server.emit('error', new Error(err));
		self.send({id: requestId, success: false, error: err.toString()});
	};
	var sendSuccess = function(requestId, data){
		self.send({id: requestId, success: true, result: data});
	};

	if (!this.isOpen && flags.binary) return;
	var msg = null;
	try{
		msg = JSON.parse(data);
	}catch (err){
		sendError(null, Errors.E2000(err));
		return;
	}
	//validate
	if (!msg.type || !msg.id){
		sendError(msg.id, Errors.E2001("type or id is not defended"));
		return;
	}
	if (msg.type === "register" && msg.data == null){
		sendError(msg.id, Errors.E2001("message body is not defended"));
		return;
	}
	if (msg.type === "take-job" && msg.data.jobId == null){
		sendError(msg.id, Errors.E2001("job id is not defended"));
		return;
	}
	if (msg.type === "complete-job" && (msg.data.jobId == null || (msg.data.error == null && msg.data.result == null))){
		sendError(msg.id, Errors.E2001("job id or complete result is not defended"));
		return;
	}
	if (msg.type === "create-job" && (msg.data.name == null || msg.data.args == null)){
		sendError(msg.id, Errors.E2001("name or args is not defended"));
		return;
	}

	//Read messages
	if (msg.type === "register"){
		if (this.isRegistered){
			sendError(msg.id, Errors.E3000());
		} else {
			this.isRegistered = true;
			this.isBloked = false;
			this.maxqps = msg.data.maxqps || 10;
			this.isExecutable = msg.data.executable || false;
			sendSuccess(msg.id);
			self._notificationForJobs();
		}
		return;
	}

	if (!this.isRegistered){
		sendError(msg.id, Errors.E3001());
		return;
	}
	if (msg.type === "get-jobs"){
		var jobs = this.server.store.getJobs(this.id, function(err, jobs){
			if (!err){
				sendSuccess(msg.id, jobs);
			} else {
				sendError(msg.id, Errors.E4000());
			}
		});
	} else if (msg.type === "take-job"){
		if ((this.isBloked && this.allowTake !== msg.data.jobId) || this.workedCount >= this.maxqps){
			sendError(msg.id, Errors.E3002());
			return;
		}
		console.log(new Date(), "Take Job ", msg.data.jobId, "[", self.id, "]");
		this.server.store.takeJob(msg.data.jobId, self.id, function(err, job){
			if (!err){
				self.workedCount++;
				sendSuccess(msg.id);
			} else {
				sendError(msg.id, Errors.E4001(err));
			}
		});
	} else if (msg.type === "complete-job"){
		this.workedCount--;
		var result = {};
		if (!!msg.data.error){
			result = {error: msg.data.error};
		} else {
			result = {result: msg.data.result};
		}
		console.log(new Date(), "Complete Job ", msg.data.jobId, "[", self.id, "]");
		this.server.store.completeJob(msg.data.jobId, result, function(err){
			if (!err){
				sendSuccess(msg.id);
			} else {
				sendError(msg.id, Errors.E4001(err));
			}
		});
	} else if (msg.type === "create-job"){
		console.log(new Date(), "Create Job ", msg.data.name, "( ", msg.data.args, " )", "[", msg.data.workerId, "]");
		this.server.store.addJob(msg.data.name, msg.data.args, msg.data.workerId, function(err, jobId){
			if (!err){
				if (msg.data.workerId != null){
					for(var i = 0, len = self.server.workers.length; i < len; i++){
						if (self.server.workers[i].id === msg.data.workerId){
							self.server.workers[i].isBloked = true;
							self.server.workers[i].allowTake = jobId;
							break;
						}
					}
				}
				self.server.waitings[jobId] = {id: msg.id, unblock: msg.data.workerId != null, workerId: self.id};

			} else {
				sendError(msg.id, Errors.E4002(err));
			}
		});
	}
};

/**
 * Event on close connection with worker
 * @private
 */
Worker.prototype._onClose = function(){
	this.isOpen = false;
	this.server.removeWorker(this);
	this.server.store.removeListener('new-job', this._onJobCreate);
	this.server.store.removeListener('completed-job', this._onJobComplete);
	this.ws.removeListener('message', this._onMessage);
	this.ws.removeListener('close', this._onClose);
	this.ws.removeListener('error', this._onError);

};

/**
 * Send object to worker
 */
Worker.prototype.send = function(data){
	try{
		this.ws.send(JSON.stringify(data));
	} catch (e){
		this._onError(e);
	}
};

/**
 * On Job Completed
 * @param {String} jobId
 * @private
 */
Worker.prototype._onJobComplete = function(jobId){
	var self = this;
	var msgInfo = self.server.waitings[jobId];
	delete self.server.waitings[jobId];
	if (msgInfo == null) return;
	this.server.store.getJob(jobId, function(err, job){
		var worker = self.server.getWorker(msgInfo.workerId);
		if (worker == null) return;
		if (err || job.result.error){
			worker.send({id: msgInfo.id, success: false, error: Errors.E4001(err || job.result.error).toString(), workerId: job.workerId});
		} else {
			worker.send({id: msgInfo.id, success: true, result: job.result.result, workerId: job.workerId});
		}
		if (msgInfo.unblock){
			worker.isBloked = false;
			worker.allowTake = null;
		}
		self._notificationForJobs();
	});
};

/**
 * Notifications about all free jobs
 * @private
 */
Worker.prototype._notificationForJobs = function(){
	var self = this;
	self.server.store.getJobs(self.id, function(err, jobs){
		if (err) return;
		jobs.forEach(function(job){
			self._onJobCreate(job.id);
		});
	});
};

/**
 * On create new job
 * @param {String} jobId
 * @private
 */
Worker.prototype._onJobCreate = function(jobId){
	if (!this.isExecutable) return;
	var self = this;
	this.server.store.getJob(jobId, function(err, job){
		if (err || !job) return;
		if (!job.tacked && !job.completed && (!job.workerId || job.workerId === self.id)){
			self.send({type: "notification", job: job});
		}
	});
};

module.exports = exports = Worker;
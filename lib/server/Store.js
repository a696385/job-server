/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var uuid = require('node-uuid')
	, events = require('events')
	, util = require('util')
	, Errors = require('../Errors');

var Store = function(){
	this.jobs = [];
	this.totalJobs = 0;
	this.completedJobs = 0;
};

/**
 * Inherits from EventEmitter.
 */
util.inherits(Store, events.EventEmitter);

/**
 * Add job to store
 * @param {String} name Job name
 * @param {Object} args Arguments for job
 * @param {String} [workerId] Id of worker
 * @param {Function} callback
 */
Store.prototype.addJob = function(name, args, workerId, callback){
	var id = uuid.v4();
	this.jobs.push({
		id: id,
		name: name,
		args: args,
		workerId: workerId,
		tacked: false,
		completed: false,
		result: null,
		toObject: function(){
			return {
				id: this.id,
				name: this.name,
				args: this.args
			};
		}
	});
	this.totalJobs++;
	this.emit('new-job', id);
	callback(null, id);
};

/**
 * Get free jobs
 * @param {String} workerId WorkerId for get jobs
 * @param {Function} callback
 */
Store.prototype.getJobs = function(workerId, callback){
	var result = [];

	this.jobs.forEach(function(job){
		if (job.tacked || job.completed) return;
		if (!job.workerId || (job.workerId === workerId)){
			result.push(job.toObject());
		}
	});

	callback(null, result);
};

/**
 * Get not completed worker jobs
 * @param {String} workerId WorkerId for get jobs
 * @param {Function} callback
 */
Store.prototype.getWorkerCurrentJobs = function(workerId, callback){
    var result = [];

    this.jobs.forEach(function(job){
        if (!job.completed && job.workerId === workerId){
            result.push(job.toObject());
        }
    });

    callback(null, result);
};

/**
 * Get job object
 * @param {String} jobId Job ID
 * @param {Function} callback
 */
Store.prototype.getJob = function(jobId, callback){
	for(var i = 0; i < this.jobs.length; i++){
		if (this.jobs[i].id === jobId) {
			callback(null, this.jobs[i]);
			return;
		}
	}
	callback(null, null);
};

/**
 * Take job for worker
 * @param {String} jobId
 * @param {String} workerId
 * @param {Function} callback
 */
Store.prototype.takeJob = function(jobId, workerId, callback){
	var self = this;
	self.getJob(jobId, function(err, job){
		if (err || job == null) {
			callback(err || new Error("Job not found"));
		} else {
			if (job.tacked || job.completed) {
				callback(Errors.E4003());
				return;
			}
			job.tacked = true;
			job.workerId = workerId;
			callback(null, job);
		}
	});
};

/**
 * Complete job
 * @param {String} jobId
 * @param {Object} result
 * @param {Function} callback
 */
Store.prototype.completeJob = function(jobId, result, callback){
	var self = this;
	self.getJob(jobId, function(err, job){
		if (err) {
			callback(err);
		} else {
			if (job.completed) {
				callback(Errors.E4004());
				return;
			}
			job.completed = true;
			job.tacked = false;
			job.result = result;
			self.completedJobs++;
			self.emit('completed-job', jobId);
			callback(null);
		}
	});
};

/**
 * Remove job from store
 * @param {String} jobId
 */
Store.prototype.removeJob = function(jobId){
    for (var i = 0; i < this.jobs.length; i++){
        if (this.jobs[i].id === jobId){
            this.jobs.splice(i, 1);
            return;
        }
    }
};

module.exports = exports = Store;
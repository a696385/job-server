/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var JobServer = require('./server/JobServer')
	, JobWorker = require('./client/JobWorker')
	, JobClient = require('./client/JobClient')
	, uuid = require('node-uuid');

/**
 * Create job server
 * @param {Object} options new Job Server options
 * @param {String} [options.host] Bind host name
 * @param {Number} [options.port] Bind port
 * @param {http.Server} [options.server] Http Server
 * @returns {Object}
 */
exports.createServer = function(options){
	return new JobServer(options);
};

/**
 * Create job worker
 * @param {Object} options new Job Worker options
 * @param {String} [options.host] Job Server host name
 * @param {Number} [options.port] Job Server port
 * @param {Number} [options.maxqps] Max count of queries per one time
 */
exports.createWorker = function(options){
	return new JobWorker(options);
};

/**
 * Create job server client
 * @param {Object} options new Job Worker options
 * @param {String} [options.host] Job Server host name
 * @param {Number} [options.port] Job Server port
 */
exports.createClient = function(options){
	return new JobClient(options);
};

/**
 * Get new UUID
 * @returns {String}
 */
exports.newUUID = function(){
	return uuid.v4();
};
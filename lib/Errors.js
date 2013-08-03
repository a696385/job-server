/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var util = require('util');

module.exports = exports = {
	E1000: "Can not create server",
	E1001: "Can not send message to server",
	E2000: "Ca not parse message from client",
	E2001: "Invalid message from client",
	E3000: "Worker already registered",
	E3001: "Worker do not registered",
	E3002: "Worker is busy",
	E3003: "Can not register on server",
	E4000: "Can not execute command",
	E4001: "Job not found",
	E4002: "Can not create job",
	E4003: "Job already tacked",
	E4004: "Job already completed",
	E5000: "Job not found",
	E5001: "Can not take job"
};

/**
 * Create object for each error like {code: string, message: string, exception: objects}
 */
for(var key in exports) if (exports.hasOwnProperty(key)){
	var error = exports[key];
	(function(key, message) {
		exports[key] = function(e){
			var result = {
				code: key,
				message: message,
				exception: e
			};
			result.toString = function(){
				var exp = this.exception;
				if (exp) {
					if (exp.code && exp.message) {
						exp = exp.toString();
					} else {
						exp = util.inspect(exp);
					}
				}
				return "#" + this.code + ": " + this.message + (exp != null? " (" + exp + ")": "");
			};
			return result;
		};
	})(key, error);
}
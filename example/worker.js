/**
 * Powered by Andy <andy@away.name>.
 * Date: 03.08.13
 */

var JobServer = require("../");

var jobWorker = JobServer.createWorker({port: 8080, maxqps: 3});
jobWorker.on('error', function(err){
	console.error("Worker: ", err);
});

jobWorker.on('register', function(){
	console.log("Register!");
});

jobWorker.on('job-complete', function(job){
	console.log('Complete job - ' + job.name);
});

jobWorker.registerFunction('wait', function(callback){
	setTimeout(function(){
		callback(null, "Wait completed");
	}, 4000);
});
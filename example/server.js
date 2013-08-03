/**
 * Powered by Andy <andy@away.name>.
 * Date: 02.08.13
 */

var JobServer = require("../");

var jobServer = JobServer.createServer({port: 8080});
jobServer.on('error', function(err){
	console.error("Server: ", err);
});

setInterval(function(){
	console.log("Client count: " + jobServer.workers.length);
	console.log("Jobs - Total: " + jobServer.store.totalJobs + "; Completed: " + jobServer.store.completedJobs);
}, 5000);
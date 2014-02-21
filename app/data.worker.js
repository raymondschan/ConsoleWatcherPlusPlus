onmessage = function (oEvent) {
	var d = oEvent.data;

	if (d.cmd == 'pull') {
  		postMessage(
  			{type:'badge', value:parseInt(Math.random()*10)}
  		);
  	} else if (d.cmd == 'getios') {
  		console.log('Webworker is pulling data for ' + d.ios);
  		var ios = [];
  		for (var i = 0; i < d.ios.length; i++) {
  			ios.push({id:d.ios[i], title: d.ios[i], startDate: "01/02/2014 ", endDate: "01/03/2014", desc: "Short description of the IOs info"});
  		}

  		postMessage({type:'ioslist', value:ios});
  	} else {
  		console.log("dataworker: command not recognized.");
  	}
};






/*
$.get("https://api.twitter.com/1.1/statuses/show/210462857140252672.json", function(res) {
	alert(res);
}).fail(function(err) { 
	var notification = webkitNotifications.createNotification('icon.png', 'Error!',  err);
	notification.show();
});
chrome.browserAction.setBadgeText({text:'1'});
*/

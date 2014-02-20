onmessage = function (oEvent) {
	var cmd = oEvent.data.cmd;

	if (cmd == 'pull') {
  		postMessage('' + parseInt(Math.random()*10));
  	} else if (cmd == 'getios') {
  		postMessage({type:'ioslist', value: 
  			{ 
  				ios:[
					{title: "Zales Valentine's Day 2014", startDate: "01/02/2014 ", endDate: "01/03/2014", desc: "Short description of the IOs info"},
					{title: "E-Trade FBX Q1", startDate: "01/02/2014 ", endDate: "01/03/2014", desc: "Short description of the IOs info"},
					{title: "H&M Display Moms", startDate: "01/02/2014 ", endDate: "01/03/2014", desc: "Short description of the IOs info"}
				]
			}
		});
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

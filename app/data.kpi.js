onmessage = function (oEvent) {
	var cmd = oEvent.data.cmd;

	// Correct syntax to call the following would be:
	//  function('12345','67890', function(jsonData) {
	//		... jsonData ...
	//	});
	if(cmd === 'getPackagSummary') {
		console.log("Going in");
		var insertionOrderId = oEvent.data.insertionOrderId;
		var packagId = oEvent.data.packagId;

		(function(insertionOrderId, packagId) {
			$.ajax({
				url: 'https://console.turn.com/jax/ioSummaryPackages/details/' + insertionOrderId,
				type: 'GET',
				data: {
					packagIds: packagId,
					tz: 'market'
				},
				dataType: 'json'
			}).done(function(jsonOutput) {
				var details = {};
				if(jsonOutput.hasOwnProperty(packagId)) {
					details = jsonOutput[packagId];
	
					// Convert the following IDs to their respective string representations
					details.goalType = getGoalType(details.goalType);
					details.pacingType = getPacingType(details.pacingTypeId);
				}
				details.updatedDate = jsonOutput.updatedDate;
	
				postMessage({type: 'packagSummary', output: details});
			});
		})(insertionOrderId, packagId);
	}

	var getGoalType = function(goalTypeId) {
		switch(goalTypeId) {
			case 1:
				return 'CPA';
			case 2:
				return 'CPC';
			case 3:
				return 'VIDEO_ENGAGEMENT';
			default:
				return null;
		}
	};

	var getPacingType = function(pacingTypeId) {
		switch(pacingTypeId) {
			case 1:
				return 'ASAP';
			case 2:
				return 'Even throughout period';
			case 3:
				return 'DAILY';
			default:
				return null;
		}
	};

// Sample output:
//{
//	  "updatedDate": 1,
//	  "1174238299": {
//	    "statusId": "Play",
//	    "budgetPacing": {
//	      "flightDuration": {
//	        "remainder": 9,
//	        "percent": 0.6785714285714286,
//	        "start": 1391230800000,
//	        "end": 1393649999000
//	      },
//	      "budgetSpend": {
//	        "remainder": 26536.401597524396,
//	        "percent": 0.6783466473027346
//	      },
//	      "projected": {
//	        "remainder": 1135.5520554664981,
//	        "percent": 0.013764267338987855
//	      }
//	    },
//	    "budget": 82500.0,
//	    "currentFlight": {
//	      "startDate": 1391230800000,
//	      "updatedDate": 1,
//	      "endDate": 1393649999000
//	    },
//	    "dailyPacing": false,
//	    "name": "Mobile Prospecting",
//	    "goalWidget": null,
//	    "goalType": 1,
//	    "dailySpend": {
//	      "neededSpend": {
//	        "remainder": 2948.4890663915994,
//	        "percent": 0.9586619899582081
//	      },
//	      "yesterdaySpend": {
//	        "remainder": 3075.6294682343,
//	        "percent": 1.0
//	      }
//	    },
//	    "isPast": false,
//	    "goal": 4.0,
//	    "pacingTypeId": 2
//	  }
//	}

};
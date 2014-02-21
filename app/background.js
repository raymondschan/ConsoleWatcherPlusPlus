var mainWindow;
var poolingTimeout	= 300000;
var serverHostname	= '172.16.177.239';
var serverPort		= '8443';

Data = {
	objectIds: [],
	objectDetails: {},
	objectActivities: {},
	objectLastActivities: {},
	objectDatahub: [],
	objectDelivery: {},
	onBookmarkable: false,
	onBookmarkableId: null,
	refreshIOview: false,
	hasFailed:false
};

Toolbox = {
	numBeautifier: function(num, significantFigures) {
		var THOUSAND = 1000;
		var MILLION = 1E6;
		var BILLION = 1E9;

		var result;
		var significantFigures;
		
		if (num < THOUSAND) {
			result = num.toFixed(2);
			// result = num.toPrecision(significantFigures);
		} else if (num < MILLION) {
			result = (num / THOUSAND).toPrecision(significantFigures) + 'K';
		} else if (num < BILLION) {
			result = (num / MILLION).toPrecision(significantFigures) + 'M';
		} else {
			result = (num / BILLION).toPrecision(significantFigures) + 'B';
		}
		
		return result;
	}
};


var AsynchRequester = function() {
	var self = this;

	self.getIoSummaryPkg = function(packagId, callback) {
		console.log('Requesting package endpoint...');
		$.ajax({
			url: 'https://'+ serverHostname +':' + serverPort + '/jax/ioSummaryPackages/turnWatcher/packag/' + packagId,
			type: 'GET',
			data: { tz: 'market' },
			dataType: 'json'
		}).done(function(jsonOutput) {
			var details = jsonOutput || {};
			details.id 	= packagId;
			
			if (details.currentFlight.startDate != null)
				details.startDate = new Date(details.currentFlight.startDate).toLocaleDateString();

			if (details.currentFlight.endDate != null)
				details.endDate = new Date(details.currentFlight.endDate).toLocaleDateString();

			if (callback)
				callback(packagId, details);

		}).error(function(err) {
			console.log('[ERROR] - HTTP Failure! (kpi)');
			Data.hasFailed = true;
			if (callback)
				callback(packagId, {id:packagId, name: packagId + ': Loading Data...', startDate:'', endDate:'', fail:true});

		});
	};

	self.getDatahubQueue = function(packagId, callback) {
		console.log('Requesting datahub endpoint...');
		$.ajax({
			url: 'https://'+ serverHostname +':'+ serverPort +'/jax/turnWatcher/datahub',
			type: 'GET',
			data: { tz: 'market'},
			dataType: 'json'
		}).done(function(jsonOutput) {
			console.log(jsonOutput);
			var details = jsonOutput || {};

			if (callback)
				callback(0, jsonOutput.my_jobs || []);
		}).error(function() {
			console.log('[ERROR] - HTTP Failure! (datahub)');
		});
	};

	self.getObjectDelivery = function(packagId, callback) {
		console.log('Requesting delivery endpoint...');
		$.ajax({
			url: 'https://'+ serverHostname +':'+ serverPort +'/jax/turnWatcher/delivery/reasonForNone/' + packagId,
			type: 'GET',
			data: { tz: 'market'},
			dataType: 'json'
		}).done(function(jsonOutput) {
			console.log(jsonOutput);
			var details = jsonOutput || {};
			// {1092376542=[BehavioralTargeting]}
			if (details != {})
				if (callback)
					callback(packagId, details);
		}).error(function() {
			console.log('[ERROR] - HTTP Failure! (delivery)');
		});
	};

	self.getObjectActivity = function(packagId, callback) {
		console.log('Requesting activity endpoint...');
		
		$.ajax({
			url: 'https://'+ serverHostname +':'+ serverPort +'/jax/turnWatcher1/AuditLogController/' + packagId,
			type: 'GET',
			data: { tz: 'market'},
			dataType: 'json'
		}).done(function(jsonOutput) {
			console.log(jsonOutput);

			var details = jsonOutput.Line_Item_Log
				.concat(jsonOutput.Packag_Audit_Log)
				.concat(jsonOutput.Packag_Budget_Schedule_Audit_Log)
				.concat(jsonOutput.Line_Item_Budget_Schedule_Id);


			if (Data.objectLastActivities.hasOwnProperty(packagId) && details.length > 0) {
				var lastDate = new Date(Data.objectLastActivities.packageId);
				if (lastDate < new Date(details[0].change_date)) {
					app.sendNotification('Configuration change', details[0]);
					Data.objectLastActivities.packageId = details[0].change_date;
				}
	 		} else {
	 			if (details.length > 0)
	 				app.sendNotification('Configuration change', 
	 					details[0].account_name + ' changed '+ 
	 					details[0].field_name + ' of ' + 
	 					details[0].object_id + ' at ' + 
	 					details[0].change_date + ' (New value is '+  details[0].new_value + ')');
	 		}

			if (callback)
				callback(packagId, details);

		}).error(function() {
			console.log('[ERROR] - HTTP Failure! (activity)');
		});
	};

	return self;
}

/*
* Main Application
*/
var RuntimeApplication = function() {
	var self = this;

	self.init = function(w) {
		app.poolData();
	};

	self.setMain = function(w) {
		mainWindow = w;
		$ = mainWindow.jQuery;
		window.$ = mainWindow.jQuery;
		window.jQuery = mainWindow.jQuery;
		mainWindow.localStorage = this.localStorage;
	};

	self.sendNotification = function(title, text) {
		var notification = webkitNotifications.createNotification('icons/notif.png', title, text);
		notification.show();
	};

	self.bookmarkNewObject = function() {
		var objectId	= Data.onBookmarkableId;
		var bookmarks 	= window.localStorage.getItem("tw_bookmarks");

		Data.onBookmarkable = false;
		if (bookmarks == null) {
			window.localStorage.setItem("tw_bookmarks", JSON.stringify({objects:[objectId], num:1}));
			Data.refreshIOview = 1;
			explicitPool();
			urlListener();

			return 1;
		} else {
			bookmarks = JSON.parse(bookmarks);

			for (var i = 0; i < bookmarks.objects.length; i++)
				if (bookmarks.objects[i] == objectId)
					return 0;

			bookmarks.objects.push(objectId);
			bookmarks.num += 1;

			window.localStorage.setItem("tw_bookmarks", JSON.stringify(bookmarks));
			Data.refreshIOview = bookmarks.num;
			explicitPool();
			urlListener();

			return 1;
		}
		
	};

	self.isBookmarked = function() {
		var objectId	= Data.onBookmarkableId;
		var bookmarks 	= window.localStorage.getItem("tw_bookmarks");

		if (bookmarks != undefined) {
			bookmarks = JSON.parse(bookmarks);
			if (bookmarks.objects != undefined)
				for (var i = 0; i < bookmarks.objects.length; i++)
					if (bookmarks.objects[i] == objectId)
						return 1;
		}

		return 0;
	};

	self.bookmarkRemoveObject = function(ev) {
		var objectId = $(ev.currentTarget).attr('data-id');
		var bookmarks = window.localStorage.getItem("tw_bookmarks");
		
		if (bookmarks == null)
			return;

		bookmarks = JSON.parse(bookmarks);
		for (var i = 0; i < bookmarks.objects.length; i++) {

			if (bookmarks.objects[i] == objectId) {
				bookmarks.objects.splice(i, 1);
				bookmarks.num -= 1;
				break;
			}

		}

		window.localStorage.setItem("tw_bookmarks", JSON.stringify(bookmarks));

		if (Data.refreshIOview == 0) {
		 	explicitPool();
			self.buildObjectView();	
		} else {
			Data.refreshIOview = bookmarks.num;
			explicitPool();
		}
		urlListener();
	};

	self.getBookmarkedIds = function() {

		console.log('Getting object list...');
		var bookmarks 	= window.localStorage.getItem("tw_bookmarks");
		console.log(bookmarks);

		if (bookmarks != undefined) {
			bookmarks = JSON.parse(bookmarks);
			var ids = bookmarks.objects;
			if (ids != undefined && ids.length > 0)
				Data.objectIds = ids;
			else
				Data.objectIds = [];
		} else {
			console.log('No bookmarks...');
		}

	};


	self.templateCompiler = function(){

		generate = function(obj, params, target) {
			var source   = $('#' + obj).html();
			var template = Handlebars.compile(source);
			var html    = template(params);
			$(target).html(html);
		};

		return this;
	}();


	self.buildObjectView = function() {

		if (Data.objectDetails != undefined && Data.objectIds.length > 0) {
			mainWindow.jQuery('.io-list').html('');
			for (var i = 0; i < Data.objectIds.length; i++) {
				if (Data.objectDetails[Data.objectIds[i]] != undefined)
					buildObjectViewUq(i, Data.objectDetails[Data.objectIds[i]]);
			}
		} else {
			var view 	= document.createElement('div');
			self.templateCompiler.generate('template-no-bookmarks', {}, view);
			mainWindow.jQuery('.io-list').html(view);
		}
	};

	var buildObjectViewUq = function(i, data) {
		var ioView 	= document.createElement('div');
		$(ioView).attr('id', 'io-' + i);

		data.desc = data.id + ' - Package';
		self.templateCompiler.generate('template-io-view', data, ioView);
		if (data.fail == undefined)
			self.constructKPI(ioView, data); 

		mainWindow.jQuery(ioView).find('.io-view').on('click', function(ev) { 
			var details = $(ev.currentTarget).closest('div.io-container').find('.io-details');
			if (details.css('display') == 'none') { $('.io-details').slideUp();details.slideDown(); } 
			else { details.slideUp(); }
		});

		mainWindow.jQuery(ioView)
			.find('.io-view .remove-bookmark')
			.on('click', self.bookmarkRemoveObject);

		mainWindow.jQuery('.io-list').append(ioView);
		initSlider(ioView);
		self.setControlIcons(ioView);
	}

	self.setControlIcons = function(el) {
		console.log('Set controls ' + el);
		$(el).find('.view-activity').on('click', function(ev) { 
			var id 		= $(ev.currentTarget).attr('data-id');
			var co 		= $(ev.currentTarget).closest('.io-details').find('.sub-view');
			var icos  	= $(ev.currentTarget).closest('.io-details').find('.control-icons');
			var sub 	= document.createElement('div');
			var acts 	= [];

			console.log(Data.getObjectActivities);
			if (Data.objectActivities.hasOwnProperty(id)) {
				acts = Data.objectActivities[id];
			}

			if (acts.length > 0) {
				self.templateCompiler.generate('template-activity', {acts:acts}, sub);
				$(sub).find('.show-controls').on('click', self.navBackControls);
				co.html(sub);
			} else {
				self.templateCompiler.generate('template-activity', {info:'No activity in the last 7 days.'}, sub);
				$(sub).find('.show-controls').on('click', self.navBackControls);
				co.html(sub);				
			}
			
			icos.slideUp();
			co.slideDown();
		});


		$(el).find('.view-delivery').on('click', function(ev) {
			var id 		= $(ev.currentTarget).attr('data-id');
			var co 		= $(ev.currentTarget).closest('.io-details').find('.sub-view');
			var sub 	= document.createElement('div');
			var icos  	= $(ev.currentTarget).closest('.io-details').find('.control-icons');

			if (Data.objectDelivery != undefined && Data.objectDelivery.hasOwnProperty(id) && Data.objectDelivery[id].lis.length > 0) {
				self.templateCompiler.generate('template-delivery', {lis:Data.objectDelivery[id].lis}, sub);
				$(sub).find('.show-controls').on('click', self.navBackControls);
				co.html(sub);
			} else {
				self.templateCompiler.generate('template-delivery', {info:'Your campaign is delivering correctly.'}, sub);
				$(sub).find('.show-controls').on('click', self.navBackControls);
				co.html(sub);
			}

			icos.slideUp();
			co.slideDown();

		});

		$(el).find('.view-datahub').on('click', function(ev) { 
			var id 		= $(ev.currentTarget).attr('data-id');
			var co 		= $('.datahub-container');
			var sub 	= document.createElement('div');
			var jobs 	= Data.objectDatahub || [];
			co.hide();
			if (jobs.length > 0) {
				self.templateCompiler.generate('template-datahub', {jobs:jobs}, sub);
				$(sub).find('.show-controls').on('click', function() {
					$('.body-container').slideDown();
					$('.datahub-container').slideUp();
				});
				co.html(sub);

				$('.body-container').slideUp();
				$('.datahub-container').slideDown();
			}
		});
		$(el).find('view-alert').on('click', function(ev) {
			var co = $(ev.currentTarget).closest('.io-details').find('.sub-view');
			var sub = document.createElement('div');
			self.templateCompiler.generate('template-io-view', io, sub);			
		});
	};

	self.navBackControls = function(ev) {
		var el 		= ev.currentTarget;
		var co 		= $(el).closest('.slider').find('.sub-view');
		var icos 	= $(el).closest('.slider').find('.control-icons');
		
		icos.slideDown();
		co.slideUp();
	};

	self.constructKPI = function(ioView, data) {
		var kpiMetrics = $('<div></div>');

		// TODO: these values need to be replaced with real endpoint data
		var results = {
			impressions: data.impressions,
			clicks: data.clicks,
			actions: data.actions,
			spend: 'n/a',
			neededSpend: {
				percent: (data.neededSpend) ? data.neededSpend.percent : 'n/a',
				remainder: (data.neededSpend) ? data.neededSpend.remainder : 'n/a'
			},
			yesterdaySpend: {
				percent: (data.yesterdaySpend) ? data.yesterdaySpend.percent : 'n/a',
				remainder: (data.yesterdaySpend) ? data.yesterdaySpend.remainder : 'n/a'
			},
			goal: {
				percent: (data.goal) ? data.goal.percent : 0,
				remainder: (data.goal) ? data.goal.remainder : 0
			},
			actual: {
				percent: 0.35,
				remainder: 30
			},
			budgetSchedule: {
				startDate: data.budgetSchedule.startDate || 'n/a',
				endDate: data.budgetSchedule.endDate || 'n/a',
				budget: data.budgetSchedule.budget  || 'n/a'
			}
		};

		results.neededSpend.remainder = Toolbox.numBeautifier(results.neededSpend.remainder, 3);
		results.yesterdaySpend.remainder = Toolbox.numBeautifier(results.yesterdaySpend.remainder, 3);
		results.goal.remainder = Toolbox.numBeautifier(results.goal.remainder, 3);
		results.actual.remainder = Toolbox.numBeautifier(results.actual.remainder, 3);
		results.budgetSchedule.startDate = new Date(results.budgetSchedule.startDate).toLocaleDateString();
		results.budgetSchedule.endDate = new Date(results.budgetSchedule.endDate).toLocaleDateString();
		results.budgetSchedule.budget = Toolbox.numBeautifier(results.budgetSchedule.budget, 3);
		
		self.templateCompiler.generate('template-kpi-metrics', results, kpiMetrics);

		kpiMetrics.find('.needed-spend .inner-progress-bar').width(results.neededSpend.percent * 100 + '%');
		kpiMetrics.find('.yesterday .inner-progress-bar').width(results.yesterdaySpend.percent * 100 + '%');
		kpiMetrics.find('.goal .inner-progress-bar').width(results.goal.percent * 100 + '%');
		kpiMetrics.find('.actual .inner-progress-bar').width(results.actual.percent * 100 + '%');
		
		console.log('Insertion kpi metrics');
		console.log(ioView);

		$(ioView).find('.kpi-metrics').append(kpiMetrics);
	};

	self.poolData = function() {
		explicitPool();
		setTimeout(self.poolData, poolingTimeout);
	};

	var explicitPool = function() {
		self.getBookmarkedIds();

		for (var i = 0; i < Data.objectIds.length; i++) {
			var id = Data.objectIds[i];
			asynchReq.getIoSummaryPkg(id, self.persistDataDetails);	
			asynchReq.getObjectActivity(id, self.persistDataActivity);
			asynchReq.getObjectDelivery(id, self.persistDelivery);
		}
		asynchReq.getDatahubQueue(id, self.persistDatahubQueue);
	}

	self.persistDataDetails = function(oid, objectData) {
		Data.objectDetails[oid] = objectData;
		if (Data.refreshIOview > 0) {
			Data.refreshIOview -= 1;
			self.buildObjectView();
		}

		if (objectData.fail == false && Data.hasFailed) {
			self.buildObjectView();	
			Data.hasFailed = false;
		}

	};

	self.persistDatahubQueue = function(oid, objectData) { Data.objectDatahub = objectData; };
	self.persistDelivery = function(oid, objectData) { 
		var lis = [];
		for (key in objectData) 
			if (key != undefined) 
				lis.push({li:key, causes:objectData[key]});

		Data.objectDelivery[oid] = {lis:lis}; 
	};
	self.persistDataActivity = function(oid, objectData) { Data.objectActivities[oid] = objectData; };


	var initSlider = function(object) {
		var slideCount = $(object).find('.slider ul li').length;
		var slideWidth = $(object).find('.slider ul li').width();
		var slideHeight = $(object).find('.slider ul li').height();
		var sliderUlWidth = slideCount * slideWidth;
		
		$(object).find('.slider ul').css({ width: sliderUlWidth + 40, marginLeft: - slideWidth });
		
	    function moveLeft(p) {
	        p.find('.slider ul').animate({
	            left: + slideWidth
	        }, 200, function () {
	            p.find('.slider ul li:last-child').prependTo(p.find('.slider ul'));
	            p.find('.slider ul').css('left', '');
	        });
	    };

	    function moveRight(p) {
	        p.find('.slider ul').animate({
	            left: - slideWidth
	        }, 200, function () {
	            p.find('.slider ul li:first-child').appendTo(p.find('.slider ul'));
	            p.find('.slider ul').css('left', '');
	        });
	    };

	    $(object).find('a.control_prev').click(function (ev) { 
	    	moveLeft($(ev.currentTarget).closest('.io-details')); 
	    });
	    $(object).find('a.control_next').click(function (ev) { 
	    	moveRight($(ev.currentTarget).closest('.io-details')); 
	    });
	}

	return this;
};

app 		= new RuntimeApplication();	
asynchReq 	= new AsynchRequester();
app.init();

/*
* Tab listener
*/
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) { urlListener(); });
chrome.tabs.onActivated.addListener(function(tabId, changeInfo, tab) { urlListener(); });
chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) { urlListener(); });

function urlListener() {
	Data.onBookmarkable 	= false;
	Data.onBookmarkableId 	= null; 
	chrome.browserAction.setBadgeText({ text: '' });

	chrome.tabs.getSelected(null,function(tab) {
		var url = tab.url;

		if (url == undefined)
			return;

		if (url.indexOf('powerboardsNew.html') > 0) {
			var regex 	= new RegExp('(.*)(insertionOrderId=)([0-9]*)&(.*)parentObjectId=([0-9]*)(.*)');
			if (regex.test(url)) {
				var res 	= regex.exec(url);
				var oId 	= res[5];
				
				Data.onBookmarkableId 	= oId; 
				if (app.isBookmarked() == 0) {
					chrome.browserAction.setBadgeBackgroundColor({color:'#3bb710'});
					chrome.browserAction.setBadgeText({text:'+'});
					Data.onBookmarkable = true;
				}
			}
		}
	});
}

/*
* Handle bars helpers
*/
Handlebars.registerHelper('each', function(context, options) {
	var ret = '';
	if (context != undefined)
		for(var i=0, j = context.length; i<j; i++) {
			ret += options.fn(context[i]);
		}
	return ret;
});

Handlebars.registerHelper('applyTemplate', function(name, context){
    // we need the sub template compiled here
    // in order to be able to generate the top level template
    var subTemplate =  Handlebars.compile($('#' + name).html());
    
    var innerContent = context.fn(this);
    var subTemplateArgs = $.extend({}, context.hash, {content: new Handlebars.SafeString(innerContent)});

    return subTemplate(subTemplateArgs)
});

Handlebars.registerHelper('if', function(conditional, options) {
  if(conditional) {
    return options.fn(this);
  }
});

Handlebars.registerHelper('exclusion', function(conditional, options) {
	if (conditional == 'Deal') {
		return 'Console Watcher noticed that your campaign is getting a lot of exclusions due to deal and this may be causing no delivery on your campaign. Can you please check the campaign setup specifically the deal?';
	} else if (conditional == 'SmoothGoalSeek') {
		return 'Console Watcher noticed that your campaign is getting a lot of exclusions since there is not an IO Goal set. Can you please set an IO Goal?';
	} else if (conditional == 'AdMask') {
		return 'Console Watcher noticed that your campaign is getting a lot of exclusions due to the Ads in your campaign. Can you please recheck the ad attributes?';
	} else if (conditional == 'Behavioral Targeting') {
		return 'Console Watcher noticed that your campaign is getting a lot of exclusions due to segment targeting. Can you please check if there are enough users in your segment?';
	} else {
		return conditional;
	}
});


Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

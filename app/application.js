/*
* Template engine
*/
var TemplateCompiler = function(){

	generate = function(obj, params, target) {
		var source   = $('#' + obj).html();
		var template = Handlebars.compile(source);
		var html    = template(params);
		$(target).html(html);
	}

	return this;
}();

function numBeautifier(num, significantFigures) {
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

/*
* Main Application
*/
var ConsoleApplication = function() {
	var bgDataWorker = new Worker("app/data.worker.js");
	var self = this;

	self.init = function() {
		//self.getIOs();
		self.constructKPI();

		$('#app-title').on('click', function(){
			self.sendNotification();
		});
	};

	self.sendNotification = function() {
		var notification = webkitNotifications.createNotification(
			'icons/icon.png', 
			'A parameter has been modified',  
			"Package 'Test Package - EX Trading' - new Daily cap set to $20 (Previous value was $18)");
		notification.show();
	};

	self.getIOs = function() {
		bgDataWorker.postMessage({cmd:'getios'});
	};


	var constructIOList = function(ios) {
		var ioView = document.createElement('div');
		TemplateCompiler.generate('template-io-view', ios, ioView);

		$(ioView).find('.io-view').on('click', function(ev) { 
			bgDataWorker.postMessage("pull");
			var details = $(ev.currentTarget).closest('div.io-container').find('.io-details');
			if (details.css('display') == 'none') { details.slideDown();
			} else { details.slideUp(); }
		});

		$('.io-list').append(ioView);
		initSlider();
	};

	self.constructKPI = function() {
		var kpiMetrics = $('<div></div>');

		// TODO: these values need to be replaced with real endpoint data
		var results = {
			impressions: 41923,
			clicks: 129,
			actions: 5,
			spend: 3021,
			neededSpend: {
				percent: 1,
				remainder: 6107
			},
			yesterdaySpend: {
				percent: 0.97,
				remainder: 5943.68
			},
			goal: {
				percent: 1,
				remainder: 83.98
			},
			actual: {
				percent: 0.35,
				remainder: 30
			},
			budgetSchedule: {
				startDate: 1392698830000,
				endDate: 1392952163680,
				budget: 8200
			}
		};
		results.neededSpend.remainder = numBeautifier(results.neededSpend.remainder, 3);
		results.yesterdaySpend.remainder = numBeautifier(results.yesterdaySpend.remainder, 3);
		results.goal.remainder = numBeautifier(results.goal.remainder, 3);
		results.actual.remainder = numBeautifier(results.actual.remainder, 3);
		results.budgetSchedule.startDate = new Date(results.budgetSchedule.startDate).toLocaleDateString();
		results.budgetSchedule.endDate = new Date(results.budgetSchedule.endDate).toLocaleDateString();
		results.budgetSchedule.budget = numBeautifier(results.budgetSchedule.budget, 3);
		TemplateCompiler.generate('template-kpi-metrics', results, kpiMetrics);
		kpiMetrics.find('.needed-spend .inner-progress-bar').width(results.neededSpend.percent * 100 + '%');
		kpiMetrics.find('.yesterday .inner-progress-bar').width(results.yesterdaySpend.percent * 100 + '%');
		kpiMetrics.find('.goal .inner-progress-bar').width(results.goal.percent * 100 + '%');
		kpiMetrics.find('.actual .inner-progress-bar').width(results.actual.percent * 100 + '%');
		$('.kpi-metrics').append(kpiMetrics);
	};

	var constructPKGList = function() {
		bgDataWorker.postMessage({cmd:'getiostatus'});
	};

	var initSlider = function() {
		var slideCount = $('.slider ul li').length;
		var slideWidth = $('.slider ul li').width();
		var slideHeight = $('.slider ul li').height();
		var sliderUlWidth = slideCount * slideWidth;
		
		$('.slider ul').css({ width: sliderUlWidth, marginLeft: - slideWidth });
		
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

	    $('a.control_prev').click(function (ev) { 
	    	moveLeft($(ev.currentTarget).closest('.io-details')); 
	    });
	    $('a.control_next').click(function (ev) { 
	    	moveRight($(ev.currentTarget).closest('.io-details')); 
	    });
	}


	bgDataWorker.addEventListener("message", function (oEvent) {
		var d = oEvent.data;
		if (d.type == 'ioslist') {
			constructIOList(d.value);
		} else {
			chrome.browserAction.setBadgeText({text:d.value});
		}
	}, false);


	return this;
};


/*
* Tab listener
*/
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	chrome.tabs.getSelected(null,function(tab) {
	    var tablink = tab.url;
	    console.log(tablink);
	});
});

chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {   
	chrome.tabs.getSelected(null,function(tab) {
	    var tablink = tab.url;
	    console.log(tablink);
	});
});


jQuery(document).ready(function ($) {
	(function() {

		var consoleApp = new ConsoleApplication();
		consoleApp.init();
		
	    /*
	    * Handle bars helpers
	    */
		Handlebars.registerHelper('each', function(context, options) {
			var ret = '';
			for(var i=0, j=context.length; i<j; i++) {
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


	})();
});
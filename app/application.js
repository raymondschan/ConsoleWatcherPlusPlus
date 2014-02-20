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

/*
* Main Application
*/
var ConsoleApplication = function() {
	var bgDataWorker = new Worker("app/data.worker.js");
	var self = this;

	self.init = function() {
		self.getIOs();

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
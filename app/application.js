jQuery(document).ready(function ($) {
	(function() {

		var proc = chrome.extension.getBackgroundPage();
		
		proc.app.setMain(window);
		proc.app.buildObjectView();

		$('#app-refresh').on('click', function(){
			window.location.href = 'main.html'
		});

		$('#add-bookmark').on('click', function() {
			if (proc.app.bookmarkNewObject() == 1) {
				$('#toolbar-add-bookmark').slideUp();
				chrome.browserAction.setBadgeText({text:''});
			} else {
				$('#toolbar-add-bookmark').html('Unable to bookmark.');
			}
		});

		if (proc.Data.onBookmarkable) {
			$('#toolbar-add-bookmark').show();
		} else {
			$('#toolbar-add-bookmark').hide();
		}

	})();
});

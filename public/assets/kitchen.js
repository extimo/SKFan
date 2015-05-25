soundManager.setup({
	url: '/renders/soundmaster/swf',
	flashVersion: 9,
	useHighPerformance: true,
	wmode: 'transparent',
	debugMode: true,
	onready: function() {
		soundManager.createSound({
			id: 'sms',
			autoLoad: true,
			url: '/assets/sms.mp3',
			multiShot: true
		});
		soundManager.getSoundById('sms').load();
	},
	ontimeout: function() {
		alert('can not init soundmaster');
	}
});

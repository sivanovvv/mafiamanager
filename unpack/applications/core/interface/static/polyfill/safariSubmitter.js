// Polyfill for event.submitter not existing in safari
// Taken from https://gist.github.com/nuxodin/3ae174f2a6a112df3ccad22459237a91
!function(){
	var lastBtn = null
	document.addEventListener('click',function(e){
		if (!e.target.closest) return;
		lastBtn = e.target.closest('button, input[type=submit]');
	}, true);
	document.addEventListener('submit',function(e){
		if ('submitter' in e) return;
		var candidates = [document.activeElement, lastBtn];
		lastBtn = null;
		for (var i=0; i < candidates.length; i++) {
			var candidate = candidates[i];
			if (!candidate) continue;
			if (!candidate.form) continue;
			if (!candidate.matches('button, input[type=button], input[type=image]')) continue;
			e.submitter = candidate;
			return;
		}
		e.submitter = e.target.querySelector('button, input[type=button], input[type=image]');
	}, true);
}();
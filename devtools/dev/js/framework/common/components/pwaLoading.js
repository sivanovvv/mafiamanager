// PWAs don't have a loading indicator. This adds one when certain links are tapped
class iPwaLoading extends HTMLElement {

	constructor () {
		super();
	}

	connectedCallback(){
		document.addEventListener("click", this);
		window.addEventListener('pageshow', this);
	}

	// Handle events
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

	pageshowEvent(e){
		if (e.persisted) {
			// Hide the loader if the page was loaded via the back button/swipe gesture
			this.hidden = true;
		}
	}

	// Handle events
	clickEvent(e){
		const link = e.target.closest("a[href]");
		// Not a link
		if (!link) return;
		// Wrapping in a setTimeout places this code at the end of the call stack. This ensures other click events have run, and we can more reliably check defaultPrevented.
		setTimeout(() => {
			// Link has preventDefault and likely doesn't navigate to a new page
			if (e.defaultPrevented) return;
			// Ignore certain links
			if (
				link.matches('[href^="#"], [href^="javascript:"], [target="_blank"]') ||
				e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
			) return;
			// Show the loader
			this.hidden = false;
		});
	}

}
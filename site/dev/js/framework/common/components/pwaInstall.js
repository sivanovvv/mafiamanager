class IPwaInstall extends HTMLElement {
	constructor() {
		super();
		this.deferredAndroidPrompt = null;
		this.dismissed = ips.utils.cookie.get('pwaInstallBanner');
	}

	// Handle events
    handleEvent(e){
        return this[e.type + "Event"] && this[e.type + "Event"](e);
    }

	connectedCallback() {
		this.addEventListener("click", this);
		window.addEventListener('appinstalled', this);
		window.addEventListener('beforeinstallprompt', this);
	}

	clickEvent(e){
		// Dismiss the banner if Dismiss button is clicked
        if(e.target.closest("#iPwaInstall__dismiss")){
			ips.utils.cookie.set('pwaInstallBanner', "dismissed", true);
			this.hideBanner();
		/*
		} else if(e.target.closest("#iPwaInstall__install") && (this.deferredAndroidPrompt)){
			// If the install button is clicked and if we're on Android, install the app and then hide the banner
			this.deferredAndroidPrompt.prompt();
			this.deferredAndroidPrompt.userChoice.then(choice => {
				if (choice.outcome === 'accepted') {
					ips.utils.cookie.set('pwaInstallBanner', "installed", true);
					this.hideBanner();
				}
				this.deferredAndroidPrompt = null;
			});
		*/
		}
    }

	// Chrome/Android: This event runs once per browsing session if Chrome determines the app hasn't been installed. We prevent this from running and replace it with our own UI
	// We store the event and display our own Install button, but the button will only be displayed when Chrome allows it
	beforeinstallpromptEvent(e){
		// If the banner has been dismissed, return early
		if(this.dismissed) return;
		// Prevent the default UI from showing
		e.preventDefault();
		// Store the event so we can reference it later
		this.deferredAndroidPrompt = e;
		// Show custom install button
		// this.querySelector("#iPwaInstall__install").hidden = false;
	}

	// Chrome/Android: Hide the banner when the app is installed using the .prompt() method
	appinstalledEvent(e){
		ips.utils.cookie.set('pwaInstallBanner', "installed", true);
		this.hideBanner();
	}

	hideBanner() {
		this.hidden = true;
	}
}
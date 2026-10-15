/*
	Display an "Enable push notifications" prompt
*/
class iPushNotificationsPrompt extends HTMLElement {

    constructor () {
        super();
    }

	connectedCallback(){
		// If push notifications aren't supported, return early
		if (!("Notification" in window)) return;
		// Add click events to message
		this.addEventListener("click", this);
		// If data-persistent is used, show the message even if notifications have been disabled (helpful for displaying enable instructions)
		// Otherwise, only show the message if a decision hasn't been made.
		if((this.hasAttribute("data-persistent")) || (Notification.permission === "default")){
			this.updateUI(Notification.permission);
			// Display message since it's hidden by default
			this.hidden = false;
		}
	}

    // Handle events
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

	// Run a method when a data-click element is clicked
    clickEvent(e){
		const el = e.target.closest('[data-click]');
		if(!el) return;

		const method = el.getAttribute("data-click");
		if (method && typeof this[method] === "function") {
			return this[method](e);
		} else {
			console.warn(`No method named "${method}" found on`, this);
		}
    }

	// Hide banner if "Close" button is clicked
	hideMessage(e){
		this.hidden = true;
	}

	// Show browser prompt if "Enable" button is clicked
	async requestPermission(){
		try {
			const permission = await Notification.requestPermission();
			if ( permission === "granted" ) {
				$(document).trigger('permissionGranted.notifications');
			}
			else
			{
				$(document).trigger('permissionDenied.notifications');
			}
			// Notify all instances
			document.querySelectorAll("i-push-notifications-prompt").forEach(el => {
				el.updateUI(permission);
			});
		} catch (error) {
			console.error('Permission request failed:', error);
			// Notify all instances
			document.querySelectorAll("i-push-notifications-prompt").forEach(el => {
				el.updateUI('error');
			});
		}
	}

	updateUI(permission){

		// Style message based on permission
		this.setAttribute("data-permission", permission);

		// Get content area
		const contentEl = this.querySelector('[data-role="content"]');
		if (!contentEl) return;

		// Get template content
		const template = this.querySelector(`template[data-value="${permission}"]`);
		if (!template){
			console.warn(`Cannot update message. There is no template[data-value="${permission}"] element`);
			return;
		}

		// Append the message to the content area
		const clone = template.content.cloneNode(true);
		contentEl.innerHTML = '';
		contentEl.appendChild(clone);

	}
}
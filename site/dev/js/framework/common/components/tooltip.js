/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 * 
 * Displays a custom tooltip for any element with a `data-ipstooltip` attribute.
 * Supports both hover and focus, removes native `title` tooltips, and uses CSS anchor positioning if supported.
 * 
 * Author: Ehren Harber
 */
class Tooltip extends HTMLElement {
	/**
	 * Sets up internal state and binds the `beforetoggle` event handler.
	 */
	constructor() {
		super();
		this.anchor = null;
		this.tooltipContent = "";
		this.supportsAnchor = CSS.supports("(position-area: bottom) and (not (-webkit-hyphens: auto))");
		this.addEventListener("beforetoggle", this);
	}

	/**
	 * Runs when the element is inserted into the DOM.
	 * Adds global listeners for hover and focus (but only on devices with hover support).
	 */
	connectedCallback() {
		if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
			document.addEventListener("mouseover", this);
			document.addEventListener("focusin", this);
		}
	}

	/**
	 * Runs when the element is removed from the DOM.
	 * Removes global listeners for hover and focus (but only on devices with hover support).
	 */
	disconnectedCallback(){
		if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
			document.removeEventListener("mouseover", this);
			document.removeEventListener("focusin", this);
		}
	}

	/**
	 * Central event handler for all events this component listens to.
	 * handleEvent ensures 'this' references the component, and it dynamically calls a method named `${event.type}Event` if it exists.
	 * 
	 * @param {Event} e - The event object.
	 */
	handleEvent(e) {
		if (this[`${e.type}Event`]) {
			this[`${e.type}Event`](e);
		}
	}

	/**
	 * Handles `mouseover` events to potentially show a tooltip.
	 * @param {MouseEvent} e 
	 */
	mouseoverEvent(e) {
		this.potentiallyShowTooltip(e);
	}

	/**
	 * Handles `focusin` events to potentially show a tooltip.
	 * @param {FocusEvent} e 
	 */
	focusinEvent(e) {
		this.potentiallyShowTooltip(e);
	}

	/**
	 * Determines whether the event target should trigger a tooltip.
	 * Prevents re-triggering if hovering between children of the same anchor.
	 * We use rAF to optimize performance by only checking elements once per frame.
	 * @param {MouseEvent|FocusEvent} e 
	 */
	potentiallyShowTooltip(e) {
		if (this._raf) cancelAnimationFrame(this._raf);
		this._raf = requestAnimationFrame(() => {
			this._raf = null;
			const anchor = e.target.closest("[data-ipstooltip]");
			if (!anchor || this.anchor === anchor) return;

			this.anchor = anchor;
			this.getTooltipContent();
			if (!this.tooltipContent) return;

			this.showPopover({source: this.anchor});
		});
	}

	/**
	 * Hides the tooltip when the mouse leaves the anchor element.
	 * @param {MouseEvent} e 
	 */
	mouseleaveEvent(e) {
		this.hidePopover();
	}

	/**
	 * Hides the tooltip when the anchor loses focus.
	 * @param {FocusEvent} e 
	 */
	focusoutEvent(e) {
		this.hidePopover();
	}

	/**
	 * Hides the tooltip when the user scrolls the page.
	 * @param {Event} e 
	 */
	scrollEvent(e) {
		this.hidePopover();
	}

	/**
	 * Handles `beforetoggle` from the <popover> API.
	 * Sets up or tears down event listeners, updates text content,
	 * and ensures accessibility attributes are applied.
	 * 
	 * @param {ToggleEvent} e 
	 */
	beforetoggleEvent(e) {
		if (e.newState === "open") {
			// Listen for events that should close the tooltip
			this.anchor.addEventListener("focusout", this);
			this.anchor.addEventListener("mouseleave", this);
			document.addEventListener("scroll", this, { passive: true });

			// Apply tooltip content
			this.innerHTML = this.tooltipContent;

			// This tooltip may have ajax content (eg. Reaction summaries).
			// In this case, the default tooltip content is shown, but later replaced once the ajax content loads
			const ajaxContent = this.anchor.getAttribute("data-ipstooltip-ajax");
			if(ajaxContent){
				const currentAnchor = this.anchor;
				ips.getAjax()( ajaxContent ).done(response => {
					// We only want to update the tooltip content if we're still hovering over the same anchor. If we've moved anchors before the cotnent loads, don't do anything.
					if(currentAnchor === this.anchor){
						// Update tooltip attribute on anchor
						this.anchor.setAttribute("data-ipstooltip", response);
						// Update tooltip content
						this.innerHTML = response;
						// Remove ajax attribute since we can just reference the new data-ipstooltip value
						this.anchor.removeAttribute("data-ipstooltip-ajax");
					}
				});
			}

			// Link anchor to tooltip for screen readers
			this.anchor.setAttribute("aria-describedby", this.id);

			// Position manually if CSS anchor is not supported
			if (!this.supportsAnchor) {
				this.anchorPolyfill();
			}

			// If the anchor is removed from the DOM while the tooltip is active (ie. a close button on a dialog), ensure the tooltip is hidden too
			this.anchorObserver = new MutationObserver(() => {
				if (!document.body.contains(this.anchor)) {
					this.hidePopover();
				}
			});
			this.anchorObserver.observe(document.body, { childList: true, subtree: true });

		} else {
			// Tooltip is closing. Reset events and properties
			if (this.anchorObserver) {
				this.anchorObserver.disconnect();
				this.anchorObserver = null;
			}
			if (this.anchor) {
				this.anchor.removeAttribute("aria-describedby");
				this.anchor.removeEventListener("focusout", this);
				this.anchor.removeEventListener("mouseleave", this);
			}
			this.anchor = null;
			this.tooltipContent = null;
			document.removeEventListener("scroll", this, { passive: true });
		}
	}

	getTooltipContent() {

		let tooltipContent;
		this.tooltipContent = null;

		// Remove native title attribute to prevent default browser tooltip from showing
		if (this.anchor.title) {
			this.anchor.dataset.ipstooltip = this.anchor.title;
			this.anchor.removeAttribute("title");
		}

		// If the tooltip attribute is populated or if we're using aria-label, use the value in the tooltip
		tooltipContent = this.anchor.dataset.ipstooltip || this.anchor.ariaLabel;
		if (tooltipContent) {
			this.tooltipContent = tooltipContent;
			return;
		}

		// The data-ipsTooltip-label is deprecated, but we'll support it incase of 3rd party code
		tooltipContent = this.anchor.dataset.ipstooltipLabel;
		if (tooltipContent) {
			this.anchor.dataset.ipstooltip = tooltipContent;
			this.anchor.removeAttribute("data-ipstooltip-label");
			this.tooltipContent = tooltipContent;
			return;
		}

		// Alternatively, we can use an external HTML element for the content, via data-ipstooltip-source
		// This finds an element with the matching ID and inserts the content into the tooltip
		tooltipContent = this.anchor.dataset.ipstooltipSource;
		if (tooltipContent) {
			const tooltipContentEl = document.getElementById(tooltipContent);
			if (tooltipContentEl) {
				this.tooltipContent = tooltipContentEl.innerHTML;
				return;
			}
		}

		// Finally, if there's an <i-tooltip-content> element inside the anchor, use that for the tooltip
		tooltipContent = this.anchor.querySelector("i-tooltip-content");
		if(tooltipContent){
			this.tooltipContent = tooltipContent.innerHTML;
			return;
		}

	}

	/**
	 * Fallback positioning logic for browsers that don't support CSS anchor positioning.
	 * Sets custom properties that can be used in CSS for positioning.
	 */
	anchorPolyfill() {
		const rect = this.anchor.getBoundingClientRect();
		this.style.setProperty("--top", rect.top + "px");
		this.style.setProperty("--left", rect.left + rect.width / 2 + "px");
		this.style.setProperty("--height", rect.height + "px");
	}
}
/**
 * The i-carousel-navigation custom element adds autoplay, pause toggling, and arrow-based navigation to carousels
 */
class iCarouselNavigation extends HTMLElement {

	static observedAttributes = ["data-autoplay"];

	connectedCallback() {
		// If the element isn't in the DOM, return early. This can happen with the Page Editor when the element is cloned via managingFinished()
		if (!this.isConnected) return;
		
		// Get carousel
		this.carousel = document.getElementById(this.getAttribute("data-carousel"));
		if (!this.carousel) return;

		// Get direction
		this.isRTL = document.documentElement.dir === "rtl";

		// Add click events to buttons
		this.addEventListener("click", this);
		this.carousel.addEventListener("keydown", this);

		// Get carousel items
		this.carouselItems = [...this.carousel.children];

		// Add data-carousel-visible to visible children
		this.carouselObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.target === this.carousel.firstElementChild) {
					this.firstVisible = entry.isIntersecting;
				}
				if (entry.target === this.carousel.lastElementChild) {
					this.lastVisible = entry.isIntersecting;
				}
				entry.target.toggleAttribute("data-carousel-visible", entry.isIntersecting);
			});
			// Hide the controls if both the first and last children are visible
			requestAnimationFrame(() => {
				this.hidden = this.firstVisible && this.lastVisible;
			});
		}, { root: this.carousel, threshold: .99 });

		// Observe each item
		this.carouselItems.forEach(item => this.carouselObserver.observe(item));

		// If this component is inside a Page Editor widget, we need to get the autoplay interval from the parent [data-widget-interval] element
		this.insideAutoplayWidget = this.closest("[data-widget-interval]");
		if(this.insideAutoplayWidget){
			this.setAttribute("data-autoplay", Number(this.insideAutoplayWidget.getAttribute("data-widget-interval")) * 1000);
		}
	}

	disconnectedCallback() {
		this.stopAutoScroll();
		this.removeEventListener("click", this);
		if (this.carousel) {
			this.carousel.removeEventListener("keydown", this);
		}
		if (this.carouselObserver) {
			this.carouselObserver.disconnect();
			this.carouselObserver = null;
		}
	}

	/**
	 * Called whenever an observed attribute changes.
	 * @param {string} name
	 * @param {string | null} oldValue
	 * @param {string | null} newValue
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		// If the element isn't in the DOM, return early. This can happen with the Page Editor when the element is cloned via managingFinished()
		if (!this.isConnected) return;
		if(name === "data-autoplay" && newValue != null){
			// Ensure autoplay time is valid
			const delay = Number(newValue);

			if (Number.isNaN(delay) || delay <= 0){
				this.autoplayDuration = null;
				console.error("[data-autoplay] should be a valid number");
				return;
			}

			this.autoplayDuration = delay;
			this.startAutoScroll();
		}
	}

	/**
	 * Start the setInterval which autoscrolls the carousel.
	 */
	startAutoScroll() {
		// End the current timer if one exists
		this.stopAutoScroll();

		// Start autoscroll
		/**
		 * Interval handle for autoplay.
		 * @type {number | null}
		 */
		this.autoTimer = setInterval(() => {
			this.scrollCarousel("next");
		}, this.autoplayDuration || 3000);
	}

	/**
	 * Stop the autoplay interval if running.
	 */
	stopAutoScroll() {
		// Clear the interval
		if (this.autoTimer) {
			clearInterval(this.autoTimer);
			this.autoTimer = null;
		}
	}

	/**
	 * Event delegation dispatcher for this component.
	 * @param {Event} e
	 * @returns {*}
	 */
	handleEvent(e) {
		return this[`${e.type}Event`] && this[`${e.type}Event`](e);
	}

	/**
	 * Handles click events for navigation.
	 * @param {MouseEvent} e
	 */
	clickEvent(e) {
		// Was a navigation button clicked?
		const arrowButton = e.target.closest("[data-carousel-arrow]");
		if (!arrowButton) return;
		// Stop auto-scroll
		this.stopAutoScroll();
		// Get arrow direction
		const arrowDirection = arrowButton.getAttribute("data-carousel-arrow");
		// Scroll carousel
		this.scrollCarousel(arrowDirection);
	}

	/**
	 * Scrolls the carousel in the given direction.
	 * @param {"next" | "prev"} [arrowDirection="next"]
	 */
	scrollCarousel(arrowDirection = "next"){
		// Get visible children
		const visibleChildren = this.carousel.querySelectorAll('[data-carousel-visible]');

		// If we click through full-width carousels quickly, it's possible that no elements are completely visible at this point, so we return early.
		if(!visibleChildren.length) return;

		// Get first/last visible child
		const firstVisibleChild = visibleChildren[0];
		const lastVisibleChild = visibleChildren.length > 0 ? visibleChildren[visibleChildren.length - 1] : null;

		// Find out what item we should scroll to
		let scrollToItem;

		if (arrowDirection === "prev") {
			// Either scroll to the element before the first visible one, or loop to the end if we're already at the first
			scrollToItem = firstVisibleChild.previousElementSibling || this.carousel.lastElementChild;
		} else {
			// If the last element is already visible, scroll back to the start. Otherwise scroll to the element after the first visible one
			scrollToItem = (lastVisibleChild === this.carousel.lastElementChild) ? this.carousel.firstElementChild : firstVisibleChild.nextElementSibling;
		}

		// RTL requires an extra calc
		const offsetRight = (this.carousel.clientWidth - (scrollToItem.offsetLeft + scrollToItem.offsetWidth)) * -1;

		// Scroll the carousel
		this.carousel.scrollTo({
			left: (this.isRTL) ? offsetRight : scrollToItem.offsetLeft,
			behavior: "smooth"
		});
	}

	/**
	 * Handles keyboard events when the carousel is focused.
	 * Left/right arrows will stop the auto-scrolling. Pressing TAB will focus the "first visible" focusable element. Without this, the first carousel item is focused even if it's out of view.
	 * @param {KeyboardEvent} e
	 */
	keydownEvent(e){
		if(e.target !== this.carousel) return;
		
		if(e.key === "ArrowLeft" || e.key === "ArrowRight"){
			this.stopAutoScroll();
		} else if(e.key === "Tab" && !e.shiftKey){
			const firstFocus = this.carousel.querySelector(`[data-carousel-visible] :is(a, button):not([tabindex="-1"])`);
			if(firstFocus){
				firstFocus.focus();
				e.preventDefault();
			}			
		}
	}
}
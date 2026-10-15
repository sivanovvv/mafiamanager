/*
	This custom element allows i-card to be swipe-dismissed on touch devices
*/
class iCard extends HTMLElement {

    connectedCallback () {
        this.supportsPopover = CSS.supports("selector(:popover-open)");
        this.supportsAnimationTimeline = CSS.supports("(animation-timeline: scroll())");
        this.isOffCanvas = this.matches('.ipsOffCanvas');
        // Focus trap
        this.focusableEls = this.querySelectorAll(':is(a, button, textarea, input:not([type="hidden"]), select):not([disabled], [tabindex="-1"])');
        this.firstFocusableEl = this.focusableEls[0];  
        this.lastFocusableEl = this.focusableEls[this.focusableEls.length - 1];
        // Events
        this.addEventListener("beforetoggle", this);
        this.addEventListener("toggle", this);
        this.addEventListener("keydown", this);
        // IntersectionObserver to close popover on swipe (mobile UI)
        this.swipeObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                // This attribute removes the transition, allowing the popover to instantly hide once swiped. This fixes a bug in Safari 26.0 where the backdrop could flash during the closing transition after being swiped.
                this.setAttribute("hidden-via-swipe", true);
                // We remove the scroll position so it resets back to 0% if reopened
                if(!this.supportsAnimationTimeline){
                    this.style.removeProperty('--i-card--backdrop-scroll');
                }
                this.hidePopover();
            }
        }, {
            root: this,
            threshold: .1
        });
    }

    // Handle events
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

    // Before opening the popover, create extra elements if necessary
    beforetoggleEvent(e){
        if(e.newState === "open"){
            // If the popover was previously hidden by swipe, remove the attribute
            this.removeAttribute("hidden-via-swipe");
            // Append menu to element (or body) to prevent external styles from leaking in
            if(this.hasAttribute("data-i-card-append")){
                const appendMenuTo = this.getAttribute("data-i-card-append") || "body";
                document.querySelector(appendMenuTo).append(this);
            }
            // Create the swipe elements, used in the mobile UI
            if(!this.swipeElement){
                this.createSwipeElement();
            }
        }
    }

    // Toggle the popover
    toggleEvent(e){
        // If the popover is being opened..
        if(e.newState === "open"){
            // Scroll to the snap element for (mobiles/offcanvas)
            this.snapElement.scrollIntoView({ block: "end", inline: "end", behavior: "instant" });
            // Add "swipe to dismiss"
            this.swipeObserver.observe(this.swipeElement);
            // Scroll event is required for scroll animation (backdrop opacity)
            if(!this.supportsAnimationTimeline){
                requestAnimationFrame(() => {
                    this.addEventListener("scroll", this, { passive: true });
                });
            }
            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('ipsCardOpened', {
                detail: { card: this },
                bubbles: true
            }));
        } else {
            // Remove IntersectionObserver and event listeners
            this.swipeObserver.disconnect();
            if(!this.supportsAnimationTimeline){
                this.removeEventListener("scroll", this);
            }
            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('ipsCardClosed', {
                detail: { card: this },
                bubbles: true
            }));
        }
    }

    // Focus trap elements, preventing the user from tabbing outside of an opened card
    keydownEvent(e){
        const isTabPressed = e.key === 'Tab';

        if (!isTabPressed) return;

        if ( e.shiftKey ){
            if (document.activeElement === this.firstFocusableEl) {
                this.lastFocusableEl.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === this.lastFocusableEl) {
                this.firstFocusableEl.focus();
                e.preventDefault();
            }
        }
    }

    scrollEvent(e){
        // Scroll driven animation polyfill
        requestAnimationFrame(() => {
            if(e.target === this){
                let scrollPercentage = (this.isOffCanvas) ? 
                    Math.floor(this.scrollLeft / Math.max(1, this.scrollWidth - this.clientWidth) * 100) + "%" :
                    Math.floor(this.scrollTop / Math.max(1, this.scrollHeight - this.clientHeight) * 100) + "%";

                this.style.setProperty('--i-card--backdrop-scroll', scrollPercentage);
            }
        });
    }

    createSwipeElement(){
        // Create light-dismiss and swipe elements
        let addBackdropElements = ``;
        if(!this.querySelector(".iCardSwipe")){
            addBackdropElements += `<div class='iCardSwipe'></div>`;
        }
        if(!this.querySelector(".iCardDismiss")){
            addBackdropElements += `<button class="iCardDismiss" type="button" popovertarget="${this.id}" popovertargetaction="hide" aria-label="Close" tabindex="-1"></button>`;
        }
        if(!this.querySelector(".iCardSnap")){
            addBackdropElements += `<div class="iCardSnap"></div>`;
        }
        // Prepend them to the popover
        this.insertAdjacentHTML("afterbegin", addBackdropElements);
        // Store swipe and snap elements
        this.swipeElement = this.querySelector(".iCardSwipe");
        this.snapElement = this.querySelector(".iCardSnap");
    }

}
/*
	This custom element:
	1. Allows the menu to be swipe-dismissed on touch devices
	2. Positions dropdown menus
*/
class iDropdown extends HTMLElement {

    connectedCallback () {
        // Check support for anchor
        this.supportsAnchor = CSS.supports("(position-area: bottom) and (not (-webkit-hyphens: auto))");
        this.supportsPopover = CSS.supports("selector(:popover-open)");
        this.supportsAnimationTimeline = CSS.supports("(animation-timeline: scroll())");
        // UI #201125: Safari 26.1 doesn't have full support for anchors or closing transitions, so we assign fallbacks using this property.
        this.isSafari = CSS.supports("(-webkit-hyphens: auto)");
        // Focus trap
        this.focusableEls = this.querySelectorAll(':is(a, button, textarea, input:not([type="hidden"]), select):not([disabled], [tabindex="-1"])');
        this.firstFocusableEl = this.focusableEls[0];  
        this.lastFocusableEl = this.focusableEls[this.focusableEls.length - 1];
        // Events
        this.addEventListener("beforetoggle", this);
        this.addEventListener("toggle", this);
        this.addEventListener("keydown", this);
        // Add events and UX benefits if the menu is opened before the JS loads
        if(this.matches(":popover-open")){
            this.beforetoggleEvent({ newState: "open", oldState: "closed" });
            this.toggleEvent({ newState: "open", oldState: "closed" });
        }
    }

    // Handle events
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

    // Focus trap elements, preventing the user from tabbing outside of an opened dropdown menu
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

    clickEvent(e){

        // Get the clicked item in the menu
        let itemClicked = e.target.closest(".iDropdown__items a, .iDropdown__items button");

        // Dispatch the click event
        this.handleClick(e, itemClicked);

    }

    // Fired when <label> elements are clicked. Emits the same behavior as the click event, but lets labels natively handle inputs
    changeEvent(e){
        // Get the clicked item in the menu
        let itemClicked = e.target.closest(".iDropdown__items label");

        // Dispatch the click event
        this.handleClick(e, itemClicked);
    }

    // This controls clicks on a, button and label elements. We handle it here since we need to dispatch it either on "click" or "input" depending on the element type
    handleClick(e, itemClicked){
        
        // Return early if the item clicked is not a valid element (a, button, label)
        if(!itemClicked) return;

        // Close the menu after clicking an item, unless data-i-dropdown-persist exists
        if(!itemClicked.closest("[data-i-dropdown-persist]")){
            setTimeout(() => {
                // We have to use .closest() instead of this, otherwise all parent dropdowns (Eg. Edit tags > add prefix) will close too
                itemClicked.closest("i-dropdown")?.hidePopover();
            }, 150);
        }

        // Return early if the item should not be selectable
        if(itemClicked.closest("[data-i-dropdown-noselect]")) return;

        // Pinging is only used in ModCP and announcements. @todo Is this necessary or potentially redundant?
        const pingItems = itemClicked.closest('[data-action="ipsMenu_ping"]');
        if( pingItems ){
            e.preventDefault();
            ips.getAjax()( pingItems.getAttribute('href') ).done( () => {
                this.trigger.dispatchEvent(new CustomEvent('menuPingSuccessful', {}));
            });
        }

        // Optionally update the trigger label
        const selectedTextTrigger = this.trigger.closest('[data-role="ipsMenu_selectedText"]'),
              selectedTextMenu = e.target.closest('[data-role="ipsMenu_selectedText"]');
        if(selectedTextTrigger && selectedTextMenu){
            selectedTextTrigger.innerText = selectedTextMenu.innerText;
        }

        // Optionally update the trigger icon
        const selectedIconTrigger = this.trigger.closest('[data-role="ipsMenu_selectedIcon"]'),
              selectedIconMenu = e.target.closest('[data-role="ipsMenu_selectedIcon"]');
        if(selectedIconTrigger && selectedIconMenu){
            selectedIconTrigger.replaceWith(selectedIconMenu.cloneNode(true));
        }

        // Dispatch a CustomEvent
        let eventDetail = {
            triggerElem: this.trigger,
            triggerID: this.trigger.getAttribute("popovertarget"),
            menuElem: this,
            originalEvent: e
        };

        // We sometimes simulate radios/checkbox behavior using links
        // "radio" only allow a single link to be selected. "checkbox" allows multiple.
        let selectableList = itemClicked.closest("[data-i-dropdown-selectable]");
        if(selectableList && itemClicked.matches("a, button")){
            if(selectableList.getAttribute("data-i-dropdown-selectable") === "radio"){
                // If the selectable type is radio, remove all active options
                selectableList.querySelectorAll('[aria-selected="true"]').forEach(el => el.removeAttribute("aria-selected"));
                // And then assign the active attribute to the clicked item
                itemClicked.setAttribute("aria-selected", "true");
            } else {
                // If this is a "checkbox" version, toggle the attribute instead
                if(itemClicked.hasAttribute("aria-selected")){
                    itemClicked.removeAttribute("aria-selected")
                } else {
                    itemClicked.setAttribute("aria-selected", "true")
                }
            }
        }
        
        // Store selected value from data-ipsMenuValue
        if(itemClicked.hasAttribute("data-ipsMenuValue")){
            eventDetail.selectedItemID = itemClicked.getAttribute("data-ipsMenuValue");
        } else {
            // If the element doesn't have [data-ipsMenuValue], it might be a <label><input></label>
            // In this case, the inputs value should be used.
            let inputValue = itemClicked.querySelector("input[value]");
            if(inputValue){
                eventDetail.selectedItemID = inputValue.value;
            }
        }

        // Add the selected items to the event detail
        let selectedListItems = this.querySelectorAll("[aria-selected='true'], :checked"),
            selectedItemObj = {};

        if(selectedListItems.length){
            selectedListItems.forEach(el => {
                // If el is a :checked element, we need to reassign it to the label
                let input = el.closest("label");
                if(input){
                    el = input;
                }
                
                if( !el.id ) {
                    el.id = 'ips_uid_' + Math.floor(Math.random() * 9999) + 1;
                }

                selectedItemObj[el.getAttribute('id')] = el;
            })

            eventDetail.selectedItems = selectedItemObj;
        }

        // Dispatch custom event to the trigger, with details of the menu
        this.trigger.dispatchEvent(new CustomEvent("menuItemSelected", { 
            detail: eventDetail,
            bubbles: true
        }));
    }

    // Before opening the popover, create extra elements if necessary
    beforetoggleEvent(e){
        this.open = e.newState === 'open';
        if(e.newState === "open"){
            // If the popover was previously hidden by swipe, remove the attribute
            this.removeAttribute("hidden-via-swipe");
            // Find out which trigger was clicked. This is necessary incase there are multiple triggers for the same menu.
            if(e.source){
                this.trigger = e.source
            } else if(document.activeElement.matches("[popovertarget]")){
                // If the activeElement has [popovertarget], use it.
                this.trigger = document.activeElement;
            } else if(this.safariTrigger){
                this.trigger = this.safariTrigger;
            } else {
                // If a trigger still isn't defined for some reason, we'll just find a trigger ourselves.
                this.trigger = document.querySelector(`[popovertarget="${this.id}"]`);
            }
            // Append menu to element (or body) to prevent external styles from leaking in
            if(this.hasAttribute("data-i-dropdown-append")){
                const appendMenuTo = this.getAttribute("data-i-dropdown-append") || "body";
                document.querySelector(appendMenuTo)?.append(this);
            }

            // do we have to load remote content?
            if (!this._remoteContentLoaded) {
                this.resetRemoteContent()
                    .catch(err => Debug.error(err))
                    .finally(() => {
                        // still open? scroll into view again
                        if (this.open) {
                            this.scrollTop = this.scrollHeight;
                        }
                    });
            }

            // Position the dropdown menu
            this.positionAnchors(e);
            // Create the swipe elements, used in the mobile UI
            if(!this.swipeElement){
                this.createSwipeElement();
            }
        } else {
            // UI #211125, Safari 26.1: We use fixed positioning for closed dropdowns, which fixes a jumping menu issue during the closing transition
            if(this.isSafari){
                this.positionAnchors(e);
            }
        }
    }

    // Toggle the popover
    toggleEvent(e){
        // If the popover is being opened..
        if(e.newState === "open"){
            // Scroll to bottom of popover (for the mobile UI) since the swipe element is at the top
            this.scrollTop = this.scrollHeight;
            // Add "swipe to dismiss"
            this.swipeObserver.observe(this.swipeElement);
            // Add event listeners
            this.addEventListener("change", this);
            this.addEventListener("click", this);
            // The scroll event, required for the scroll-animation polyfill, is added in the transitionend event since the scrollTop (above) will otherwise prematurely change the backdrop opacity
            if(!this.supportsAnimationTimeline){
                this.addEventListener("transitionend", this);
            }
            // Scroll event on document positions the polyfilled popover polyfill elements (which use position: fixed)
            if(!this.supportsPopover){
                document.addEventListener("scroll", this, { passive: true });
            }
            // Dispatch custom event with details of the menu. The goal is to mimic the menuOpened event in ips.ui.menu.js
            this.trigger.dispatchEvent(new CustomEvent("menuOpened", { 
                detail: {
                    elemID: (this.trigger.id) ? this.trigger.id : this.trigger.getAttribute("popovertarget"),
                    menu: this
                },
                bubbles: true
            }));            
        } else {
            // Remove IntersectionObserver and event listeners
            this.swipeObserver.disconnect();
            // We cant't remove the click or change events here since external elements can sometimes dispatch click events to these links/buttons. If they don't have the listener, they fail.
            if(!this.supportsAnimationTimeline){
                this.removeEventListener("scroll", this, { passive: true });
                this.removeEventListener("transitionend", this);
            }
            if(!this.supportsPopover && !document.querySelector('i-dropdown[class*=":popover-open"]')){
                document.removeEventListener("scroll", this, { passive: true });
            }

            // Dispatch custom event with details of the menu. The goal is to mimic the menuClosed event in ips.ui.menu.js
            this.trigger.dispatchEvent(new CustomEvent("menuClosed", { 
                detail: {
                    elemID: (this.trigger.id) ? this.trigger.id : this.trigger.getAttribute("popovertarget"),
                    menu: this
                },
                bubbles: true
            }));
        }
    }

    transitionendEvent(e){
        // Only run this event once (otherwise it runs for each element that's transitioning)
        if(e.target === this){
            // Add scroll event to the popover once it has finished transitioning. This applies the scroll-animations polyfill
            this.addEventListener("scroll", this, { passive: true });
        }
    }

    scrollEvent(e){
        requestAnimationFrame(() => {
            if(e.target === this){
                // Scroll driven animation polyfill
                this.style.setProperty('--i-dropdown--backdrop-scroll', Math.floor(this.scrollTop / (this.scrollHeight - this.clientHeight) * 100) + "%");
            } else {
                // Anchor polyfill. Update the position of dropdowns on scroll in unsupported browsers.
                this.style.setProperty("--_anchor-scroll", window.scrollY + "px");
            }
        });
    }

    /**
     * Create element to serve as the content root if there is not one
     */
    createContentElement() {
        this.contentElement = this.querySelector(':scope > :is(.iDropdown, [data-i-dropdown-wrapper]) > :is(.iDropdown__content, [data-i-dropdown-content])');
        if (this.contentElement instanceof HTMLElement) {
            return;
        }

        let contentWrapper = this.querySelector(`:scope > :is(.iDropdown, [data-i-dropdown-wrapper])`);
        if (!contentWrapper) {
            this.insertAdjacentHTML("beforeend", "<div class='iDropdown' data-i-dropdown-wrapper></div>");
            contentWrapper = this.querySelector(`:scope > :is(.iDropdown, [data-i-dropdown-wrapper])`);
        }

        contentWrapper.insertAdjacentHTML("beforeend", "<div class='iDropdown__content' data-i-dropdown-content=''></div>");
        this.contentElement = contentWrapper.querySelector(':scope > :is(.iDropdown__content, [data-i-dropdown-content])');
    }

    /**
     * If this dropdown is
     * @return {Promise<void>}
     */
    async resetRemoteContent() {
        if (this.dataset.iDropdownSource) {
            this._remoteContentLoaded = true;
            if (!this.contentElement) {
                this.createContentElement();
            }
            this.contentElement.classList.add('ipsLoading', 'ipsLoading--small');

            // wait until this is opened again if it's closed
            if (!this.open) {
                this._remoteContentLoaded = false;
                return;
            }

            try {
                let res = await ips.fetch(this.dataset.iDropdownSource);

                // just double check remote content is 'supposed' to be loaded
                if (!this._remoteContentLoaded) {
                    return;
                }

                if (typeof res === 'object') {
                    res = res.content;
                }

                if (typeof res !== 'string') {
                    throw new TypeError(`Expected a string as the content type`);
                }

                this.contentElement.classList.remove('ipsLoading', 'ipsLoading--small');
                this.contentElement.innerHTML = res;
                $(document).trigger('contentChange', [this.contentElement]);
            } catch (err) {
                this._remoteContentLoaded = false;
                throw err;
            }
        }
    }

    createSwipeElement(){
        // Create light-dismiss and swipe elements
        let addBackdropElements = ``;
        if(!this.querySelector(".iDropdownSwipe")){
            addBackdropElements += `<div class='iDropdownSwipe'></div>`;
        }
        if(!this.querySelector(".iDropdownDismiss")){
            addBackdropElements += `<button class="iDropdownDismiss" type="button" popovertarget="${this.id}" popovertargetaction="hide" aria-label="Close"></button>`;
        }
        // Prepend them to the popover
        this.insertAdjacentHTML("afterbegin", addBackdropElements);
        // An intersectionObserver is assigned to the swipeElement
        this.swipeElement = this.querySelector(".iDropdownSwipe");
    }

    // IntersectionObserver to close popover on swipe (mobile UI)
    swipeObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                // This attribute removes the transition, allowing the popover to instantly hide once swiped. This fixes a bug in Safari 26.0 where the backdrop could flash during the closing transition after being swiped.
                this.setAttribute("hidden-via-swipe", true);
                // We remove the scroll position so it resets back to 0% if reopened
                this.style.removeProperty('--i-dropdown--backdrop-scroll');
                this.hidePopover();
            }
        });
    }, {
        root: this,
        threshold: .1
    })

    // If anchor-positioning isn't supported, or if we're in Safari, use manual positioning
    positionAnchors(e){
        if(!this.supportsAnchor || this.isSafari){
            // Get coordinates of trigger
            this.triggerPos = this.trigger.getBoundingClientRect();
            // Assign anchor and scroll variables
            if(e.newState === 'open' || this.isSafari){
                this.style.setProperty("--_anchor-v", window.scrollY + this.triggerPos.bottom + "px");
                this.style.setProperty("--_anchor-h", this.triggerPos.left + (this.triggerPos.width / 2) + "px");
                this.style.setProperty("--_anchor-height", this.triggerPos.height + "px");
                this.style.setProperty("--_remaining-height", document.documentElement.scrollHeight - window.scrollY - this.triggerPos.bottom + "px");
                if(!this.supportsPopover){
                    this.style.setProperty("--_anchor-scroll", window.scrollY + "px");
                }
                if(this.isSafari){
                    // UI #211125, Safari 26.1: Closing menus can jump in position if they're inside a relative position parent
                    this.style.setProperty("--_anchor-v-fixed", this.triggerPos.bottom + "px");
                }
            }
        } else if(!e.source){
            // If the browser doesn't support implicit anchoring (Chrome 125 - 133), add a polyfill
            if (!this.anchorCounter) this.anchorCounter = 1;
            let anchorName = `--${this.id}-${this.anchorCounter++}`;
            this.trigger.style.setProperty("anchor-name", anchorName);
            this.style.setProperty("position-anchor", anchorName);
        }
    }
}
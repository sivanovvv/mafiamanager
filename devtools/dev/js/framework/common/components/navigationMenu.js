/**
 * i-navigation-menu component which:
 * - handles "More" dropdown menu
 * - provides an anchor position polyfill
 * - allows a hover menu UX via [data-hover]
 *
 * @copyright Invision Power Services, Inc. - https://www.invisioncommunity.com
 * @since October 2025
 * @author Ehren Harber
 */
class INavigationMenu extends HTMLElement {

    /**
     * Called when the element is inserted into the DOM.
     * Initializes menu elements, intersection observers, and event listeners.
     */
    connectedCallback(){
        this.menu = this.querySelector('[data-role="menu"]');
        this.moreLi = this.menu.querySelector('[data-role="moreLi"]');
        this.moreMenu = this.moreLi.querySelector('[data-role="moreMenu"]');
        this.clone = this.querySelector('[data-role="clone"]');
        this.supportsAnchor = CSS.supports("(position-area: bottom) and (not (-webkit-hyphens: auto))");
        this.supportsEventSource = typeof ToggleEvent !== 'undefined' && 'source' in ToggleEvent.prototype;
        // Anchor position polyfill
        if(!this.supportsAnchor || !this.supportsEventSource){
            this.querySelectorAll("[popover]").forEach(dropdown => {
                dropdown.addEventListener("beforetoggle", this);
                // Apply positioning if a menu is opened before the JS loads. We can't dispatch beforetoggle, so we just toggle it twice
                if(dropdown.matches(":popover-open")){
                    dropdown.hidePopover();
                    dropdown.showPopover();
                }
            });
        }
        // Add IntersectionObserver to links
        this.items = this.clone.querySelectorAll(":scope > :not([data-role='moreLiClone'])");
        this.items.forEach(i => this.priorityObserver.observe(i));
    }

    /**
     * Generic event handler that delegates to event-specific methods.
     * @param {Event} e - The event object.
     * @returns {*} The return value of the specific event handler, if any.
     */
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

	/**
	 * Specifies which attributes should be observed for changes by `attributeChangedCallback`.
	 * When any of these attributes change, the element will be notified so it can respond accordingly.
	 * @returns {string[]} An array of attribute names to observe.
	 */
	static get observedAttributes() {
        return ['data-hover'];
    }

    /**
	 * Called automatically whenever one of the element's observed attributes changes.
	 * @param {string} name - The name of the attribute that changed.
	 * @param {string|null} oldValue - The previous value of the attribute before the change.
	 * @param {string|null} newValue - The new value of the attribute after the change.
	 */
    attributeChangedCallback(name, oldValue, newValue) {
		if(name === "data-hover" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.addEventListener("mouseover", this);
            this.addEventListener("mouseleave", this);
		}
	}

    /**
     * Positions a popover menu below its triggering element when native anchor positioning is unavailable or incomplete.
     * @param {Event} e - The beforetoggle Event
     */
    beforetoggleEvent(e){
        let dropdown = e.target;
        let trigger = e.source ?? this.querySelector(`[popovertarget="${dropdown.id}"]`);
        if(!trigger) return;
        const triggerPos = trigger.getBoundingClientRect();
        if(e.newState === 'open'){
            if(!this.supportsAnchor){
                dropdown.style.setProperty("--_anchor-v", window.scrollY + triggerPos.bottom + "px");
                dropdown.style.setProperty("--_anchor-h", triggerPos.left + (triggerPos.width / 2) + "px");
            } else if(!e.source){
                // If the browser doesn't support implicit anchoring (Chrome 125 - 139), add a polyfill
                if (!dropdown._anchorCounter) dropdown._anchorCounter = 1;
                let anchorName = `--${dropdown.id}-${dropdown._anchorCounter++}`;
                trigger.style.setProperty("anchor-name", anchorName);
                dropdown.style.setProperty("position-anchor", anchorName);
            }
        } else {
            dropdown.style.setProperty("--_anchor-v-fixed", triggerPos.bottom + "px");
        }
    }

    /**
     * Moves overflowed navigation links into the "More" dropdown menu.
     * @param {HTMLElement[]} links - The list items to move into the More menu.
     */
    moveToMore(links){
        const moreFragment = document.createDocumentFragment();
        links.forEach(link => {
            // Move link into fragment so we can batch prepend later
            moreFragment.append(link);
            // See if a dropdown exists and if so, replace button with header and remove popover
            const toggle = link.querySelector("[popovertarget]");
            if(!toggle) return;
            if(!link.querySelector(".ipsNav__dropdownTitle")){
                toggle.insertAdjacentHTML("beforebegin", `<div class="ipsNav__dropdownTitle">${toggle.innerHTML}</div>`);
            }
            const dropdown = link.querySelector("[popover]");
            if(dropdown){
                dropdown.removeAttribute('popover');
                dropdown.setAttribute('data-popover', '');
            }
        });
        // If the more menu contains the active link..
        if(moreFragment.querySelector("[aria-current]")){
            // ..add [data-active] to "More"
            this.moreLi.setAttribute("data-active", "");
        }
        // Add links to More menu
        this.moreMenu.prepend(moreFragment);
    }

    /**
     * Moves links back from the "More" dropdown to the main navigation menu.
     * @param {HTMLElement[]} links - The list items to move into the main menu.
     */
    moveToMain(links){
        const mainFragment = document.createDocumentFragment();
        links.forEach(link => {
            // Move link into fragment so we can batch prepend later
            mainFragment.append(link);
            // See if a dropdown exists and if so, add popover
            const dropdown = link.querySelector("[data-popover]");
            if(dropdown){
                dropdown.removeAttribute('data-popover');
                dropdown.setAttribute('popover', '');
            }
        });
        // Move links into Main menu
        this.moreLi.before(mainFragment);
        // Remove [data-active] from the More menu
        if(!this.moreMenu.querySelector("[aria-current]")){
            this.moreLi.removeAttribute("data-active");
        }
    }

    /**
     * IntersectionObserver callback that dynamically moves links between the main and More menus.
     * @type {IntersectionObserver}
     */
    priorityObserver = new IntersectionObserver((entries) => {
        let moveLinksToMain = [],
            moveLinksToMore = [];
        entries.forEach((entry) => {
            if(entry.isIntersecting){
                // Get the actual navigation link
                const link = this.moreMenu.querySelector(`[data-id="${entry.target.dataset.id}"]`);
                // If the link is already in the main menu, ignore it
                if(!link) return;
                // Add it to the array so we can append it later
                moveLinksToMain.push(link);
            } else {
                // Get the actual navigation link
                const link = this.menu.querySelector(`[data-id="${entry.target.dataset.id}"]`);
                if(!link) return;
                // If the link is already in the more menu, ignore it
                if(this.moreMenu.contains(link)) return;
                // Add it to the array so we can prepend it later
                moveLinksToMore.push(link);
            }
        });
        if(moveLinksToMain.length){
            this.moveToMain(moveLinksToMain);
        }else if(moveLinksToMore.length){
            this.moveToMore(moveLinksToMore);
        }
        // Store the first More link, so we can hide it on page load with cookies to prevent Layout Shifts
        let firstMoreLink = this.moreMenu.firstElementChild;
        // Hide/show More menu depending on its children
        this.moreLi.hidden = !firstMoreLink;
        if(firstMoreLink){
            ips.utils.cookie.set("moreMenuLink", firstMoreLink.dataset.id, false);
        } else {
            ips.utils.cookie.unset("moreMenuLink");
        }
        this.setAttribute("data-observed", "");
    }, {
        root: this.querySelector(".js-ipsNavPriority"),
        threshold: 1
    })
    
    /**
	 * Handles `mouseover` events to potentially show a menu.
	 * @param {MouseEvent} e 
	 */
	mouseoverEvent(e) {
		this.potentiallyShowHoverMenu(e);
	}

    /**
	 * Hides the menu when the mouse leaves a nav item
	 * @param {MouseEvent} e 
	 */
	mouseleaveEvent(e) {
        this.hideHoverMenu();
	}

    /**
	 * Determines whether the event target should trigger a dropdown.
	 * We use rAF to optimize performance by only checking elements once per frame.
	 * @param {MouseEvent|FocusEvent} e 
	 */
	potentiallyShowHoverMenu(e) {
		if (this._raf) cancelAnimationFrame(this._raf);
		this._raf = requestAnimationFrame(() => {
			this._raf = null;
            // Are we hovering over an item?
            const item = e.target.closest('[data-role="menu"] > li');
            // If we aren't hovering an item, hide open hover menus
            if(!item){
                this.hideHoverMenu();
                return;
            }
            // If the item already has an open dropdown, do nothing
            if(item.querySelector(":popover-open")){
                return;
            }
            // Does a dropdown menu exist in this item?
			const anchor = item.querySelector("[popovertarget]");
            const dropdown = item.querySelector("[popover]");
            // If not, we're hovering over a regular link, so immediately close other dropdowns
            if(!anchor || !dropdown){
                this.hideHoverMenu();
                return;
            }
            // Open the new hover menu
			dropdown.showPopover({source: anchor});
		});
	}

    /**
     * Hides currently open hover menu.
     */
    hideHoverMenu(){
        const openedMenu = this.querySelector(":popover-open");
        openedMenu?.hidePopover();
    }
};
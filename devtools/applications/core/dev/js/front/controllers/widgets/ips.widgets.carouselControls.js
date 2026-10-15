/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.widgets.carouselControls.js - Widget area controller
 *
 * Author: Matt Finger
 */
;( function($){
    "use strict";

    ips.controller.register('core.front.widgets.carouselControls', {
        /** @type {HTMLElement|null|undefined} */
        _area: undefined,
        _carouselInterval: undefined,

        /** @type {HTMLElement|undefined} */
        _carouselIndicator: undefined,
        _isScrolling: false,
        _actualCarouselIndex: 0,
        _container: undefined,

        initialize() {
            // we don't want nested areas doing things or areas in the pagebuilder doing things
            if (this.elem.closest('.pageBuilderRoot') || !this.getCarousel()) {
                return;
            }
            this._area = undefined;
            this.setupCarousel();
        },

        destroy() {
            if(this._carouselInterval) {
                clearInterval(this._carouselInterval);
            }
        },

        /**
         * Get the scrolling element directly containing the items of the carousel
         * @return {HTMLElement|null}
         */
        getCarousel() {
            if (this._area === undefined) {
                const container = this.getContainer();
                if (!container?.classList.contains('cWidgetContainer--carousel')) {
                    this._area = null;
                } else {
                    this._area = container.querySelector(":scope > .cWidgetContainer__carousel-wrap") || container;
                }
            }
            return this._area;
        },

        /**
         * Get the widget group containing the carousel items and the scroller
         * @return {HTMLElement|null}
         */
        getContainer() {
            if (this._container === undefined) {
                const container = this.elem.closest('.cWidgetContainer');
                if (!container?.classList.contains('cWidgetContainer--carousel')) {
                    this._container = null;
                } else {
                    this._container = container;
                }
            }
            return this._container;
        },

        /**
         * @returns {[number, number, NodeList<HTMLElement>]}
         */
        getCarouselOffset() {
            let children = [...this.getCarousel().querySelectorAll(':scope > .cWidgetContainer:not([hidden])')];
            if (this._isScrolling) {
                return [this._actualCarouselIndex, children.length, children];
            }

            const box = this.getScrollerBox();
            let index;
            for (index = 0; index < children.length - 1; index++) {
                if (!this.isRTL() && Math.ceil(children[index].getBoundingClientRect().left) >= Math.floor(box.left)) {
                    return [index, children.length, children];
                } else if (this.isRTL() && Math.floor(children[index].getBoundingClientRect().right) <= Math.ceil(box.right)) {
                    return [index, children.length, children];
                }
            }
            return [children.length - 1, children.length, children];
        },

        /**
         * Whether this carousel is in RTL mode
         * @return {boolean}
         */
        isRTL() {
            return document.documentElement.dir === "rtl";
        },

        /**
         * @returns {HTMLElement}
         */
        getCarouselIndicator() {
            if (this._carouselIndicator === undefined) {
                this._carouselIndicator = this.elem.querySelector(`.cWidgetContainer__carousel-indicator`);
            }

            return this._carouselIndicator;
        },

        /**
         * Update the carousel index
         */
        updateCarouselIndicator() {
            const indicator = this.getCarouselIndicator();
            if (!indicator) {
                Debug.warn(`Couldn't find a carousel indicator for a carousel`);
                return;
            }
            let [index, total] = this.getCarouselOffset();
            index = Math.min(index, this.getPageCount());
            total = Math.min(total, this.getPageCount());

            indicator.innerHTML = this.shouldUseCarouselLinks() ? `<a href="#${this.getCarouselHref(index)}">${index + 1}/${total}</a>` : `${index + 1}/${total}`;
            this.elem.querySelectorAll('button').forEach(el => total <= 1 ? el.setAttribute('disabled', '') : el.removeAttribute('disabled'));
        },

        /**
         * Scroll the carousel
         * @param {MouseEvent|CustomEvent<{dir:"left"|"right"}>|Event}	e
         */
        carouselScroll(e) {
            let dir;
            if (e instanceof PointerEvent) {
                const button = e.target?.closest?.(`[data-carousel-arrow]`);
                if (!button) {
                    return;
                }
                dir = button.dataset.carouselArrow || 'next';
            } else if (e.detail.dir) {
                dir = e.detail.dir
            }

            if (!dir || !['prev', 'next'].includes(dir)) {
                Debug.warn("Not scrolling because the direction could not be determined")
                return;
            }

            if (this._carouselInterval && e instanceof PointerEvent) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }

            const [index, total, children] = this.getCarouselOffset();
            const box = this.getScrollerBox();
            let atEnd = false;
            if (dir === 'next') {
                if (index === total - 1) {
                    atEnd = true;
                } else if (!this.isRTL()) {
                    atEnd = Math.floor(children[total-1].getBoundingClientRect().right) <= Math.ceil(box.right);
                } else {
                    atEnd = Math.ceil(children[total-1].getBoundingClientRect().left) >= Math.floor(box.left);
                }
            } else {
                // dir === 'prev'
                if (index === 0) {
                    atEnd = true;
                } else if (this.isRTL()) {
                    atEnd = Math.floor(children[0].getBoundingClientRect().right) <= Math.ceil(box.right);
                } else {
                    atEnd = Math.ceil(children[0].getBoundingClientRect().left) >= Math.floor(box.left);
                }
            }

            const toIndex = ((dir === 'prev' && atEnd) ?
                (total - 1) :
                (atEnd ? 0 : index + (dir === 'prev' ? -1 : 1))) % total;

            const childBox = children[toIndex].getBoundingClientRect();
            const paddedBox = this.getPaddedScrollBox();
            let scrollAmount;
            if (this.isRTL()) {
                scrollAmount = (toIndex === total - 1 ? childBox.left : childBox.right) - paddedBox.right;
            } else {
                scrollAmount = (toIndex === total - 1 ? childBox.right : childBox.left) - paddedBox.left;
            }

            this._isScrolling = true;
            this._actualCarouselIndex = toIndex;
            children.forEach(child => child.style.scrollSnapStop="normal")
            this.getCarousel().scrollTo({left: this.getCarousel().scrollLeft + scrollAmount, behavior: "smooth"});
            this.updateCarouselIndicator();
        },

        /**
         * @return {DOMRect}
         */
        getScrollerBox() {
            return this.getCarousel().getBoundingClientRect();
        },

        /**
         * Get the padded scroll box. This is the portion of the scroll box where the scroll snap begins
         * @return {DOMRect}
         */
        getPaddedScrollBox() {
            const box = this.getScrollerBox();
            const padding = this.getScrollPadding();
            return new DOMRect(
                box.x + padding.left,
                box.y,
                box.width - (padding.left + padding.right),
                box.height
            );
        },

        /**
         * Get the scroll padding for this carousel
         * @return {{left: number, right: number}|*}
         */
        getScrollPadding() {
            const style = getComputedStyle(this.elem);
            const padding = {left: 0, right: 0};
            for (const dir of ['Left','Right']) {
                if (style[`scrollPadding${dir}`]?.match(/^(\d+|\d+\.\d*|\.\d+)px$/)) {
                    padding[dir.toLowerCase()] = parseFloat(style[`scrollPadding${dir}`].match(/^(\d+|\d+\.\d*|\.\d+)px$/)[1]);
                }
            }

            return padding;
        },

        /**
         *  Handle the end of the carousel scrolling
         */
        carouselScrollEnd() {
            this._isScrolling = false;
            const children = this.getCarousel().querySelectorAll(":scope > .cWidgetContainer:not([hidden])");
            children.forEach(child => child.style.scrollSnapStop="")
            this.updateCarouselIndicator();
        },

        /**
         * Generate an anchor (without the '#' at the start) to reference this element
         *
         * @param 	{number}	idx
         *
         * @return {string}
         */
        getCarouselHref(idx) {
            if (this.shouldUseCarouselLinks()) {
                return `carouselwidget_${this.getCarousel().dataset.widgetarea}_${this.getCarousel().dataset.widgetAreaId}_${idx + 1}`;
            }
            return '';
        },

        /**
         *
         * @return {boolean}
         */
        shouldUseCarouselLinks() {
            return !!(this.getCarousel().dataset.widgetAreaId && this.getCarousel().dataset.widgetarea);
        },

        /**
         * Actually set up the carousel
         */
        setupCarousel() {
            // If there is no usable scrollbar, quit now
            if (!(this.getCarousel() instanceof Element) || this.getCarousel().closest('body') !== document.body || !this.getCarousel().querySelector(`:scope > .cWidgetContainer`) || (this.getCarousel().querySelectorAll(`:scope > .cWidgetContainer`).length === 1 && this.getCarousel().querySelector(`:scope > .cWidgetContainer`).getBoundingClientRect().width >= this.elem.getBoundingClientRect().width)) {
                this.elem.ipsHide();
                return;
            }

            this.elem.ipsShow();

            const buttonContainer = this.elem;
            buttonContainer.querySelectorAll('[data-carousel-arrow]').forEach(button => button.addEventListener('click', e => this.carouselScroll(e)));
            if ('onscrollend' in this.getCarousel()) {
                this.getCarousel().addEventListener('scrollend', () => this.carouselScrollEnd(), {capture: true});
            } else {
                this.getCarousel().addEventListener('scroll', ips.utils.debounce(() => this.carouselScrollEnd(), 200), {capture: true});
            }

             this.updateCarouselIndicator();

            // see if we need to scroll
            if (this.shouldUseCarouselLinks() && window.location.hash) {
                const [_, total, children] = this.getCarouselOffset();
                for (let i = 0; i < total; i++) {
                    const hash = this.getCarouselHref(i);
                    if (hash && window.location.hash === `#${hash}`) {
                        this._actualCarouselIndex = i;
                        this._isScrolling = true;
                        children[i].scrollIntoView({behavior:"instant", block:"start", inline:"start"});
                        break;
                    }
                }
            } else {
                this.setupLoop(); // we only setup the loop if the page's URL didn't link to a specific page in the carousel
            }

            this.getContainer()?.addEventListener('ips:scrollCarousel', e => this.carouselScroll(e));

            this.setupObserver();
        },

        /**
         * Setup the interval loop
         *
         * @return {void}
         */
        setupLoop() {
            if (this._carouselInterval) {
                return;
            }
            const container = this.getContainer();
            if (container && container.dataset.widgetInterval) {
                const interval = parseInt(container.dataset.widgetInterval);
                if (interval > 0) {
                    this._carouselInterval = setInterval(() => {
                        // just in case cleanup
                        if (this.elem?.ownerDocument !== document) {
                            Debug.log('not scrolling because the carousel is no longer in the document');
                            clearInterval(this._carouselInterval);
                            return;
                        }
                        this.elem.dispatchEvent(new CustomEvent('ips:scrollCarousel', {
                            bubbles: true,
                            detail: {
                                dir: "next"
                            }
                        }))
                    }, interval * 1000);
                }
            }
        },

        /**
         * Get the number of "pages" in the carousel. This is the number of positions that can actually be snapped to
         *
         * @return {number}
         */
        getPageCount() {
            const box = this.getCarousel()?.getBoundingClientRect();
            if (!box) {
                return 1;
            }

            let children = [...this.getCarousel().querySelectorAll(`:scope > .cWidgetContainer:not([hidden])`)];
            if (children.length < 2) {
                return 1;
            }
            if (this.isRTL()) {
                children = children.reverse();
            }

            let basePages = Math.ceil(Math.abs(children[children.length - 1].getBoundingClientRect().right - children[0].getBoundingClientRect().left) / box.width);

            /* The last one is special because its scroll margin is at the end. In short, if the end of the last one is not visible when the second to last is snapped, we add one */
            if (children.length > 2 && (children[children.length - 1].getBoundingClientRect().right - children[children.length - 2].getBoundingClientRect().left) > box.width) {
                basePages++;
            }

            return basePages;
        },

        setupObserver() {
            if (this._observer) {
                this._observer.disconnect();
            }

            if (this.getCarousel() instanceof HTMLElement) {
                this._observer = new ResizeObserver(ips.utils.debounce(() => this.updateCarouselIndicator()));
                this._observer.observe(this.getCarousel());
            }
        }

    });
}(jQuery));
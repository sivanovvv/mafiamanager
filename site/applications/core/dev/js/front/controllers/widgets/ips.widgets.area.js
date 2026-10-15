/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.widgets.area.js - Widget area controller
 *
 * Author: Matt Finger (orig. Rikki Tissier)
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.widgets.area', {
		_managing: false,
		reactContainer: null,
		reactRoot: null,

		initialize() {
			// we don't want nested areas doing things or areas in the pagebuilder doing things
			if (this.elem.closest('.pageBuilderRoot')) {
				return;
			}

			this.on( 'managingStarted.widgets', this.managingStarted );
			this.on( 'managingFinished.widgets', this.managingFinished );
		},

		isRoot() {
			if (!this.elem?.parentElement) {
				return false
			}

			return !this.elem.parentElement.closest('[data-controller="core.front.widgets.area"]')
		},

		/**
		 * Called when we're managing widgets
		 *
		 * @returns {void}
		 */
		async managingStarted() {
			if (!this.reactContainer && this.elem.dataset.widgetarea && this.isRoot()) {
				this._managing = true;
				const container = this.reactContainer = document.createElement('div')
				container.className = 'pageBuilderRoot'
				this.elem.parentElement.insertBefore(container, this.elem)
				this.reactContainer.ipsHide()
				this.elem.classList.add('cWidgetContainer_managing')
				this.elem.querySelectorAll('.cWidgetContainer').forEach(el => el.classList.add('cWidgetContainer_managing'))
				this.reactRoot = await ips.utils.pagebuilder.initializePageBuilderTree(container, this.elem).root

				// wait a split second so there isn't a blank screen for a split sec. Not sure **exactly** why but this resolved the blank screen for chrome and safari
				await new Promise(resolve => setTimeout(resolve, 10))
				this.elem.ipsHide()
				this.reactContainer.ipsShow()
			}
		},

		/**
		 * Called when we're no longer managing widgets
		 *
		 * @returns {void}
		 */
		managingFinished() {
			if (this.isRoot()) {
				this._managing = false;

				const rootClone = this.reactContainer?.cloneNode(true)
				rootClone?.querySelectorAll('details > summary > input').forEach(titleInput => {
					const titleNode = document.createTextNode(titleInput.value)
					titleInput.parentElement.replaceChild(titleNode, titleInput)
				})

				rootClone?.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'))

				const newState = rootClone?.querySelector(`[data-depth="0"]`)?.innerHTML;
				this.reactRoot?.unmount();
				this.reactContainer?.remove();
				document.querySelectorAll('[data-role="widgetAreaConfigForm"]').forEach(el => el.remove())
				this.reactContainer = null;
				this.reactRoot = null;

				if (newState !== undefined) {
					// need to clean up old HTML
					ips.cleanContentsOf(this.elem);
					this.elem.innerHTML = newState;
					const widgets = [...this.elem.querySelectorAll('.cWidgetContainer > .ipsWidget__content--wrap > .ipsWidget')];
					if (newState && widgets.some(widget => !!widget.innerHTML.match(/\S/))) {
						widgets.forEach(widget => {
							if (!widget.innerHTML.match(/\S/)) {
								widget.closest('.cWidgetContainer').setAttribute('hidden', '');
							}
						})
						this.elem.ipsShow();
					}
					this.cleanContents()
					this.elem.querySelectorAll('section.cWidgetContainer').forEach(element => {
						if (!element.dataset.controller?.split(',').includes('core.front.widgets.area')) {
							element.dataset.controller = [(element.dataset.controller || ''), 'core.front.widgets.area'].filter(i => !!i).join(',')
						}
					})

					// This can throw errors, but it shouldn't block the widget manager from closing
					try {
						$(document).trigger('contentChange', [$(this.elem)])
					} catch (e) {
						Debug.error(e)
					}
				}
			}
		},

		/**
		 * Clean the contents of the area after the editing has finished
		 */
		cleanContents() {
			this.elem.querySelectorAll('.cWidgetContainer .ipsWidget__content--wrap > :is(.ipsWidgetBlank, .cSidebarBlock_managing), .cWidgetContainer__menu_region').forEach(el => el.remove())

			const classesToRemove = ['cWidgetContainer_managing', 'cWidgetContainer--menu_open', 'cWidgetContainer--dragLeft', 'cWidgetContainer--dragRight', 'cWidgetContainer--dragAbove', 'cWidgetContainer--dragBelow', 'cWidgetContainer--dragInside', 'cWidgetContainer--editable']
			const query = `:is(${classesToRemove.map(token => `.${token}`).join(', ')})`;
			[this.elem, ...this.elem.querySelectorAll(query)]
				.forEach(el => {
					for (const token of classesToRemove) {
						el.classList.remove(token)
					}
				})
		},
	});
}(jQuery));
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.image.js - Image controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	/**
	 * @typedef {{id: number|string, content:string}[]}	ImageNavLinks
	 * @typedef {Object&{image: string, url: string, info: string, title: string, id: string|number, images_prev: ImageNavLinks, images_next: ImageNavLinks, image_link_current:string}} ImageFetchResponse
	 */

	const selectorPropertyMap = {
		comments: '[data-role="imageComments"]',
		image: '[data-role="imageFrame"]',
		info: '[data-role="imageInfo"]',
		breadcrumb_top: 'nav.ipsBreadcrumb--top',
		breadcrumb_bottom: 'nav.ipsBreadcrumb--bottom',
		breadcrumb_mobile: 'nav.ipsBreadcrumb--mobile',
		breadcrumb_off_canvas: 'nav.ipsOffCanvas__breadcrumb'
	};

	ips.controller.register('gallery.front.view.image', {

		initialize: function () {
			this.on( 'menuOpened', this.menuOpened );
			this.on( 'menuClosed', this.menuClosed );
			this.on( document, 'keydown', this.keyDown );
			this.on( 'click', '[data-action="setAsCover"]', this.setAsCover );
			this.on( 'click', '[data-action="setAsProfile"]', this.setAsProfile );
			this.on( 'click', '[data-action="rotateImage"]', this.rotateImage );
			this.on( 'click', '[data-action="changeImage"]', this.changeImage );
			this._stateUpdate = e => this.stateUpdate(e);
			ips.utils.history.replaceState({id: this.getCurrentImageId()}, 'gallery.view.image', window.location.href);
			window.addEventListener('historychange', this._stateUpdate);
		},

		destroy() {
			window.removeEventListener('historychange:gallery.view.image', this._stateUpdate);
		},

		/**
		 * Adds a classname to wrapper when a menu opens
		 *
		 * @returns {void}
		 */
		menuOpened: function () {
			this.scope.find('.elGalleryImage').addClass('cGalleryImageHover');
		},

		/**
		 * Removes classname to wrapper when a menu opens
		 *
		 * @returns {void}
		 */
		menuClosed: function (e) {
			this.scope.find('.elGalleryImage').removeClass('cGalleryImageHover');
		},
		
		/**
		 * Handles the keyDown event for navigating photos
		 *
		 * @returns {void}
		 */
		keyDown: function (e) {

			// Ignore the keypress if we're in a form element
			if( $( e.target ).closest('input, textarea, .ipsComposeArea, .ipsComposeArea_editor').length ){
				return;
			}

			switch( e.keyCode ){
				case ips.ui.key.LEFT:
					this.scope.find('[data-action="changeImage"][data-direction="prev"]')[0].click();
				break;
				case ips.ui.key.RIGHT:
					this.scope.find('[data-action="changeImage"][data-direction="next"]')[0].click();
				break;
			}
		},

		/**
		 * Sets the current image as the user's profile picture
		 *
		 * @param 	{event}		e 	Event object
		 * @returns {void}
		 */
		setAsProfile: function (e) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('set_as_photo_confirm'),
				callbacks: {
					ok: function () {
						ips.getAjax()( url, {
							showLoading: true
						} )
							.done( function (response) {
								ips.ui.flashMsg.show( response.message );
							})
							.fail( function () {
								window.location = url;
							});
					}
				}
			});
		},

		/**
		 * Sets the image as a cover photo
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		setAsCover: function (e) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');

			ips.getAjax()( url, {
				showLoading: true
			} )
				.done( function (response) {
					ips.ui.flashMsg.show( response.message );
				})
				.fail( function () {
					window.location = url;
				});
		},

		/**
		 * Rotates the image
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		rotateImage: function (e) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');
			var self = this;

			ips.getAjax()( url, {
				showLoading: true
			} )
				.done( function (response) {
					self.scope.find('[data-role="theImage"]')[0].src = response.src;
					self.scope.find('[data-role="theImage"]').css( { 'width': response.width + 'px', 'height': response.height + 'px' } );
					self.scope.find('[data-role="theImage"]').closest('.cGalleryViewImage').css( { 'width': response.width + 'px', 'height': response.height + 'px' } );
					ips.ui.flashMsg.show( response.message );
				})
				.fail( function () {
					window.location = url;
				});
		},

		/**
		 * Fetch new image and replace existing HTML so we don't need to refresh the page
		 *
		 * @param	{Event} 	e 		Event object
		 * @returns {void}
		 */
		changeImage: async function(e){
			e.preventDefault();

			let commentTab;
			const tabsContainer = this.elem.querySelector(`${selectorPropertyMap.comments} i-tabs`);
			if (tabsContainer) {
				let tab = tabsContainer.querySelector(`[href][aria-selected="true"]`)?.href;
				if (tab && tab.endsWith('comments')) {
					commentTab = 'comments';
				} else if (tab) {
					commentTab = 'reviews';
				}
			}
			let url = $( e.currentTarget ).attr('href');
			const currentId = this.getCurrentImageId();
			const urlObj = new URL(url, window.location.href);
			urlObj.updateSearchParams({param: 'browse', value: '1'});

			try {
				// Fetch new image data
				let selectedId;
				if (urlObj.searchParams.get('do') === 'previous' && currentId && currentId in this._prevIdCache) {
					selectedId = this._prevIdCache[currentId];
				} else if (urlObj.searchParams.get('do') === 'next' && currentId && currentId in this._nextIdCache) {
					selectedId = this._nextIdCache[currentId];
				} else if (e.currentTarget.closest(`#gallery-image-thumbs > [data-image-id]`)) {
					selectedId = e.currentTarget.closest(`#gallery-image-thumbs > [data-image-id]`).dataset.imageId;
				}

				if (selectedId && selectedId === currentId) {
					Debug.log(`Not loading image ${selectedId} from ${urlObj} because it is the current image`);
					return;
				}

				for (const selector of Object.values(selectorPropertyMap)) {
					this.elem.querySelectorAll(`${selector}:not(${selector} *)`).forEach(el => el.classList.add('ipsLoading'));
				}

				const response = await this.fetchImageData(urlObj.toString(), commentTab, selectedId);

				// Update browser URL
				url = new URL(response.url, window.location.href)
				if (commentTab) {
					url.updateSearchParams({param: "tab", value: commentTab});
				}
				ips.utils.history.pushState({url:url.toString(), response, commentTab, id: response.id.toString()}, `gallery.view.image`, url.toString(), e);
				if (this.historyPromise) {
					await this.historyPromise;
				}

				const currentThumbIDs = new Set(
					[...this.elem.querySelectorAll("#gallery-image-thumbs [data-image-id]")]
						.map(elem => elem.dataset.imageId)
				);

				let thumbsChanged = false;
				for (const thumb of this.elem.querySelectorAll("#gallery-image-thumbs [data-image-id]")) {
					if (!currentThumbIDs.has(thumb.dataset.imageId)) {
						thumbsChanged = true;
						break;
					}
					currentThumbIDs.delete(thumb.dataset.imageId);
				}

				if (currentThumbIDs.size && !thumbsChanged) {
					thumbsChanged = true;
				}
				selectedId = this.getCurrentImageId();
				if (selectedId) {
					// We need to clear out the existing prev/next associations if an image was added or deleted, otherwise it will skip images and/or display the cached deleted image and content feed, creating issues
					if (thumbsChanged) {
						this._prevIdCache = {};
						this._nextIdCache = {};
					}

					const urlObj = new URL(response.url, window.location.href);
					if (urlObj.searchParams.get('do') === 'previous' && currentId) {
						this._prevIdCache[currentId] = selectedId;
						this._nextIdCache[selectedId] = currentId;
					} else if (urlObj.searchParams.get('do') === 'next' && currentId) {
						this._nextIdCache[currentId] = selectedId;
						this._prevIdCache[selectedId] = currentId;
					}
				}
			} catch (e) {
				Debug.warn(e);
			}
		},

		/**
		 * Get the image data based on details
		 * @param url
		 * @param commentTab
		 * @param id
		 * @return {Promise<ImageFetchResponse>}
		 */
		async fetchImageData(url, commentTab, id) {
			url = new URL(url, window.location.href)
				.updateSearchParams({params: {
					tab: ['comments','reviews'].includes(commentTab) ? commentTab : null, // null removes this param if it's set
					browse: 1,
				}})
				.toString();
			commentTab = commentTab || 'reviews';
			const response = this._resultCache?.[commentTab]?.[id] || await ips.fetch(url, {bypassRedirect: 'none'});
			if (typeof response !== 'object' || ['image','url','info','title', 'id'].some(prop => !(prop in response))) {
				throw new RangeError(`The response from the endpoint ${urlObj} is not a JSON object containing image, url, info and title properties.`);
			}

			if (id) {
				this._resultCache[commentTab] = this._resultCache[commentTab] || {};
				this._resultCache[commentTab][id] = response;
			}

			return response;
		},

		/**
		 * Handle a state update
		 * @param {CustomEvent<Object&{detail: 'replace'|'pop'|'push'|string,state: {"gallery.view.image": Object&{response: Object|undefined, commentTab: string|undefined, id:string|number}}}>}e
		 * @return {Promise<void>}
		 */
		async stateUpdate(e) {
			if (e.detail.type === 'replace') {
				return;
			}
			let _resolve, _reject;
			let {response, commentTab, id} = e.detail.state['gallery.view.image'];
			this.historyPromise = new Promise(((resolve, reject) => {
				_resolve = resolve;
				_reject = reject;
			}));
			if (!id || id === this.getCurrentImageId()) {
				Debug.log(`Not handling a state update for the gallery view because the id has not changed`);
				_reject(`The view wasn't actually changed`);
				return;
			}
			if (!response || !commentTab) {
				let tab = this.elem.querySelector(`${selectorPropertyMap.comments} i-tabs [href][aria-selected="true"]`)?.href;
				if (tab && tab.endsWith('comments')) {
					commentTab = 'comments';
				} else if (tab) {
					commentTab = 'reviews';
				}

				response = await this.fetchImageData(window.location.href, commentTab, id);
				ips.utils.history.replaceState({...e.detail.state['gallery.view.image'], response, commentTab, id, url: response.url});
			}

			for (const [property, selector] of Object.entries(selectorPropertyMap)) {
				const root = ['breadcrumb_top','breadcrumb_bottom','breadcrumb_mobile', 'breadcrumb_off_canvas'].includes(property) ? document.body : this.elem;
				root.querySelectorAll(`${selector}:not(${selector} *)`).forEach(el => {
					el.insertAdjacentHTML("afterend", response[property] || "");
					el.remove();
				});
			}
			this.updateActiveThumb(response);

			document.title = response.title;

			// Refresh content
			$( document ).trigger( 'contentChange', [ $(this.elem) ] );

			if (response.dataLayer) {
				this.scope.trigger('ipsDataLayerProperties', {_properties: response.dataLayer});
			}
			_resolve();
		},

		/**
		 * @type {Promise<void>|undefined}
		 */
		historyPromise: undefined,

		/**
		 * Get the id of the currently visible image.
		 * @return {string | undefined}
		 */
		getCurrentImageId() {
			const id = this.elem.querySelector("[data-role='imageFrame'][data-image-id]")?.dataset.imageId;
			if (id === undefined) {
				Debug.warn(new RangeError(`Could not determine the current image id from the image frame`));
			}
			return id;
		},

		/**
		 * Since the prev/next buttons use the current image, and do=next in the URL, we have to cache the image ID after the request is done
		 * @type {Object<string, string>}
		 */
		_nextIdCache: {},

		/**
		 * Since the prev/next buttons use the current image, and do=next in the URL, we have to cache the image ID after the request is done
		 * @type {Object<string, string>}
		 */
		_prevIdCache: {},

		/**
		 *
		 */
		_resultCache: {},

		/**
		 * @param {ImageFetchResponse|undefined}	response
		 */
		updateActiveThumb(response) {
			if (response) {
				// merge in images before this one
				const allImages = [...this.elem.querySelectorAll(`#gallery-image-thumbs > [data-image-id]`)];
				const remainingIds = new Set(allImages.map(img => parseInt(img.dataset.imageId)));

				/**
				 * @type {ImageNavLinks}
				 */
				const toInsert = [...response.images_prev, {id: response.id, content:response.image_link_current}, ...response.images_next];

				// first is there any overlap?
				const overlap = toInsert.findIndex(val => remainingIds.has((parseInt(val.id))));
				if (overlap !== -1) {
					const id = parseInt(toInsert[overlap].id);
					const overlapDOMIdx = allImages.findIndex(img => parseInt(img.dataset.imageId) === id);

					// merge in any ids that aren't currently in the page
					const prevInDOM = allImages.slice(0,overlapDOMIdx).reverse();
					const prevIdsRemaining = new Set(prevInDOM.map(img => parseInt(img.dataset.imageId)));
					const prevToInsert = toInsert.slice(0, overlap).reverse();
					for (let i = 0; i < prevToInsert.length; i++) {
						const id = parseInt(prevToInsert[i].id);


						// just insert if there's no images before this one in the DOM
						if (!prevInDOM.length && !remainingIds.has(id)) {
							requestAnimationFrame(() => {
								this.elem.querySelector(`#gallery-image-thumbs`).insertAdjacentHTML('afterbegin', prevToInsert[i].content);
							});
							continue;
						}

						if (prevIdsRemaining.has(id)) {
							prevIdsRemaining.delete(id);
							while (prevInDOM.length > 1 && parseInt(prevInDOM[0].dataset.imageId) !== id) {
								const skipped = prevInDOM.shift();
								prevIdsRemaining.delete(parseInt(skipped.dataset.imageId));
							}
							continue;
						}

						// if there's already an element for this, skip it
						if (remainingIds.has(id)) {
							continue;
						}

						// insert this before the first image
						const chunk = [];
						while (i < prevToInsert.length && !remainingIds.has(parseInt(prevToInsert[i].id))) {
							chunk.unshift(prevToInsert[i].content);
							i++;
						}
						requestAnimationFrame(() => {
							prevInDOM[0].insertAdjacentHTML('beforebegin', chunk.join(''));
						});
					}

					const nextToInsert = toInsert.slice(overlap + 1);
					const nextInDOM = allImages.slice(overlapDOMIdx);
					const nextIdsRemaining = new Set(nextInDOM.map(img => parseInt(img.dataset.imageId)));
					for (let i = 0; i < nextToInsert.length; i++) {
						const id = parseInt(nextToInsert[i].id);
						// just insert if there's no images before this one in the DOM
						if (!nextInDOM.length) {
							requestAnimationFrame(() => {
								this.elem.querySelector(`#gallery-image-thumbs`).insertAdjacentHTML('beforeend', nextToInsert[i].content);
							});
							continue;
						}

						if (nextIdsRemaining.has(id)) {
							nextIdsRemaining.delete(id);
							while (nextInDOM.length > 1 && parseInt(nextInDOM[0].dataset.imageId) !== id) {
								const skipped = nextInDOM.shift();
								nextIdsRemaining.delete(parseInt(skipped.dataset.imageId));
							}
							continue;
						}

						if (remainingIds.has(id)) {
							continue;
						}

						// insert this before the first image
						let chunk = [];
						while (i < nextToInsert.length && !remainingIds.has(parseInt(nextToInsert[i].id))) {
							chunk.push(nextToInsert[i].content);
							i++;
						}
						requestAnimationFrame(() => {
							nextInDOM[0].insertAdjacentHTML('afterend', chunk.join(''));
						});
					}
				} else if (toInsert.length) {
					requestAnimationFrame(() => {
						// no overlap? Well then we need to replace the links as we have no way to properly merge the lists
						this.elem.querySelector('#gallery-image-thumbs').innerHTML = toInsert.map(img => img.content).join('\n');
					});
				}
			}

			const currentlyActiveThumb = this.getCurrentImageId();
			requestAnimationFrame(() => {
				this.elem.querySelectorAll(`#gallery-image-thumbs > [data-active]`).forEach(el => delete el.dataset.active);
			});
			if (currentlyActiveThumb) {
				let img;
				requestAnimationFrame(() => {
					this.elem.querySelectorAll(`#gallery-image-thumbs > [data-image-id="${currentlyActiveThumb}"]`).forEach(el => {
						el.dataset.active = '';
						img = el;
					});
					if (img) {
						requestAnimationFrame(() => {
							const imgRect = img.getBoundingClientRect();
							const scroller = img.closest('#gallery-image-thumbs');
							const scrollerRect = scroller.getBoundingClientRect();
							if (imgRect.left < scrollerRect.left) {
								scroller.scrollBy({left: imgRect.left - scrollerRect.left});
							} else if (imgRect.right > scrollerRect.right) {
								scroller.scrollBy({left: imgRect.right - scrollerRect.right});
							}
						});
					}
				});
			}
		}
	});
}(jQuery));
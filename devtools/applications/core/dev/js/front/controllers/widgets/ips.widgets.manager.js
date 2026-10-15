/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.widgets.manager.js - Widget manager controller
 *
 * Author: Matt Finger (orig. Rikki Tissier)
 */
	
;( function($, _){
	"use strict";

	let pageLoadTime;
	setTimeout(() => pageLoadTime = Date.now());
	let state = 'unloaded';
	/** @type {function():void} */
	const whenLoadedCallbacks = [];
	function whenLoaded() {
		return new Promise(resolve => {
			if (state === 'loaded') {
				resolve();
				return;
			}

			whenLoadedCallbacks.push(resolve);

			if (state === 'unloaded') {
				ips.loader.get(['core/front/controllers/widgets/ips.widgets.block.js'])
					.then(async () => {
						if (!window.ips.utils.pagebuilder) {
							const url = ips.getSetting('baseURL') + `/applications/core/interface/static/pagebuilder/manifest.json?v=${ips.getSetting('pagebuilderKey')}&antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`
							const data = await ips.fetch(url)

							const toLoad = [];
							for (const key in data) {
								if (data[key].file?.match(/\.css$/i)) {
									const href = ips.getSetting('baseURL') + '/applications/core/interface/static/pagebuilder/' + data[key].file + `?antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`
									if (!document.querySelector(`[href="${encodeURI(href)}"]`)) {
										const style = document.createElement('link')
										style.rel = 'stylesheet'
										style.href = href
										document.head.appendChild(style)
									}

								} else if (data[key].isEntry) {
									toLoad.push('/applications/core/interface/static/pagebuilder/' + data[key].file)
								}
							}

							if (toLoad.length) {
								await ips.loader.getStatic(toLoad)
							}
						}

						state = 'loaded';
						while (whenLoadedCallbacks.length) {
							whenLoadedCallbacks.shift()();
						}
					})
				state = 'loading';
			}


		})
	}
		
	ips.controller.register('core.front.widgets.manager', {

		_loadedManager: false,
		_loadingManager: false,
		_inManagingState: false,
		_wasUnused: false,

		initialize() {
			this.on( 'click', '[data-action="openSidebar"]', this.openSidebarManager );
			this.on( 'click', '[data-action="closeSidebar"]', this.closeSidebarManager );

			// todo not sure this is ever needed. I cannot think of any front end pages (except maybe the login page) that have a user bar but no page editor areas. This can be deleted or uncommented after some time has passed depending on whether it is actually useful
			// if (ips.getSetting('pageID') && !document.querySelector('.cWidgetContainer')) {
			// 	document.querySelectorAll('[data-action="openSidebar"]').forEach(el => el.ipsHide())
			// }

			this._wasUnused = !!document.querySelector('.ipsLayout__secondary-column.ipsLayout__secondary-column--hide') || this._wasUnused;
			whenLoaded()
				.then(() => {
					// Should we automatically open?
					if (ips.utils.url.getParam('_blockManager')) {
						this.openSidebarManager();
					}
				});

			window.addEventListener('historychange', ips.utils.debounce((e) => {
				if (ips.utils.history.getLastChangeType() !== 'pagebuilder' && e.detail?.type !== 'pop') {
					return;
				}
				if (this._inManagingState && !ips.utils.url.getParam('_blockManager')) {
					this.closeSidebarManager()
				} else if (!this._inManagingState && ips.utils.url.getParam('_blockManager')) {
					this.openSidebarManager()
				}
			}, 50))
		},

		getSidebar() {
			return this.elem.querySelector('#elSidebarManager');
		},

		/**
		 * Add search terms for widgets and search when the search is updated
		 */
		setupSearch() {
			for (const group of this.getSidebar()?.querySelectorAll("[data-role='block_group']") || []) {
				let widgetsFound = group.querySelectorAll('[data-blockid][data-blocktitle]');
				if (widgetsFound && widgetsFound.length) {
					for (const block of widgetsFound) {
						ips.utils.search.addTerm('widgets', block.dataset.blocktitle, [block.dataset.blockid]);
						if (block.dataset.searchterms) {
							block.dataset.searchterms.split(',').forEach(term => {
								ips.utils.search.addTerm('widgets', term, [block.dataset.blockid]);
							});
						}
					}
				}
			}


			this.getSearchBar().addEventListener('input', e => {
				const value = e.target.value;
				const widgetIds = ips.utils.search.search('widgets', value);
				if (!widgetIds.size) {
					this.getSidebar().querySelector('[data-role="emptyMessage"]').removeAttribute('hidden');
					this.getSidebar().querySelector('[data-role="availableBlocks"]').setAttribute('hidden', '');
				} else {
					this.getSidebar().querySelector('[data-role="emptyMessage"]').setAttribute('hidden', '');
					this.getSidebar().querySelector('[data-role="availableBlocks"]').removeAttribute('hidden');
					this.getSidebar()?.querySelectorAll('[data-role=block_group]').forEach(group => {
						if ('favorites' in group.dataset) {
							// hide it if we're searching or if there just arent any blocks
							if (value.trim() || !group.querySelector('[data-blockid][data-blocktitle]')) {
								group.setAttribute('hidden', '');
							} else {
								group.removeAttribute('hidden');
							}
							return;
						}
						const blocks = group.querySelectorAll('[data-blockid][data-blocktitle]');
						let groupHasVisibleBlocks = (!value.trim() && "showWhenEmpty" in group.dataset);
						blocks.forEach(block => {
							if (!value.trim() || widgetIds.has(block.dataset.blockid)) {
								groupHasVisibleBlocks = true;
								block.removeAttribute('hidden');
							} else {
								block.setAttribute('hidden', '');
							}
						});

						if (!groupHasVisibleBlocks) {
							group.setAttribute('hidden', '');
						} else {
							group.removeAttribute('hidden');
						}
					})
				}
			})
		},

		sidebarSetup: false,

		setupFavorites() {
			if (!this.sidebarSetup) {
				this.getSidebar().addEventListener('click', e => {
					const indicator = e.target.closest('[data-blockid] [data-role="favorite-indicator"]');
					if (indicator) {
						this.toggleFavorite(indicator);
					}
				});
			}

			this.getSidebar().querySelectorAll(`[data-role="favorite-indicator"]`).forEach(indicator => {
				if ('isFavorite' in indicator.dataset) {
					indicator.title = ips.getString('cSidebarBlock_unset-favorite')
				} else {
					indicator.title = ips.getString('cSidebarBlock_set-favorite')
				}
			});

			this.sidebarSetup = true;
		},

		async toggleFavorite(indicator) {
			const block = indicator.closest('[data-blockid]');
			const blockID = block.dataset.blockid;
			const isFavorite = "isFavorite" in indicator.dataset;
			const favoriteGroup = this.getSidebar().querySelector('[data-favorites]');
			const favoriteList = favoriteGroup.querySelector('ul');
			if (!isFavorite) {
				if (!favoriteList.querySelector(`[data-blockid="${blockID}"]`)) {
					const clone = block.cloneNode(true);
					clone.querySelector(`[data-role="favorite-indicator"]`).dataset.isFavorite = '';
					clone.querySelector(`[data-role="favorite-indicator"]`).title = ips.getString('cSidebarBlock_unset-favorite');

					this._setupDraggingOnItem(clone);

					favoriteList.appendChild(clone);
					favoriteGroup.removeAttribute('hidden');
				}
			} else {
				favoriteList.querySelectorAll(`[data-blockid="${blockID}"]`).forEach(itemInFavorites => {
					itemInFavorites.remove();
				});

				if (!favoriteGroup.querySelectorAll(`[data-blockid]`).length) {
					favoriteGroup.setAttribute('hidden', '');
				}
			}

			this.getSidebar().querySelectorAll(`[data-blockid="${blockID}"] [data-role="favorite-indicator"]`).forEach(indicator => {
				if (isFavorite) {
					delete indicator.dataset.isFavorite;
					indicator.title = ips.getString('cSidebarBlock_set-favorite');
				} else {
					indicator.dataset.isFavorite = "";
					indicator.title = ips.getString('cSidebarBlock_unset-favorite');
				}
			});

			try {
				await ips.fetch(ips.getSetting('baseURL'), {
					method: "get",
					data: {
						app: 'core',
						module: 'system',
						controller: 'widgets',
						do: isFavorite ? "removeFavorite" : "addFavorite",
						blockID: blockID.split('_', 3).pop()
					}
				});
			} catch (e) {
				ips.ui.alert.show({"message": "Something went wrong, the favorites may not have been saved"});
			}
		},

		/**
		 *
		 * @return {HTMLInputElement|null}
		 */
		getSearchBar() {
			return this.elem.querySelector('input[data-role="widgetSearch"]');
		},

		/**
		 * Opens the manager panel, building it if necessary
		 *
		 * @param	{Event} 	[e] 			The event
		 * @returns {void}
		 */
		async openSidebarManager(e) {
			const userMenu = document.getElementById('elUserLink_menu');
			if( userMenu ){
				userMenu.hidePopover();
			}

			e?.preventDefault();
			await whenLoaded();

			if (this._inManagingState) {
				return
			}

			document.querySelectorAll('.ipsTableOfContents__linkOptions').forEach(el => el.dispatchEvent(new CustomEvent('remove')));

			if (!this.elem.querySelector('[data-role="manager"]')) {
				this._buildSidebar();
			} else {
				// reset css code
				this.elem.querySelectorAll('#elSidebarManager .ipsToolbox__tools').forEach(elem => Object.assign(elem.style, {
					overflow: '',
					position: '',
					top: ''
				}));
			}

			this.triggerOn('core.front.widgets.area', 'managingStarted.widgets');
			this._showManager();

			// make sure that _blockManager=1 is in the url
			if (!window.location.search.includes('_blockManager')) {
				let anchor = window.location.href.match(/(#.*)$/)?.[1] || ''
				let url = window.location.href.replaceAll(/#.*$|\b_blockManager=1?\b/g, '')
				url += url.includes('?') ? '&_blockManager=1' : '?_blockManager=1'
				url += anchor
				ips.utils.history.pushState({artificial: true}, 'pagebuilder', url)
			}

			this.scope.addClass('cWidgetsManaging');
		},

		/**
		 * Closes the manager panel
		 *
		 * @param	{Event} 	[e] 			The event
		 * @returns {void}
		 */
		closeSidebarManager(e) {
			e?.preventDefault();
			let self = this;
			let pageUrl = window.location.href.replace(/\?(.*?)&?_blockManager=[^&]*/, '?$1').replace(/[?&]+$/, '');

			if (this._inManagingState) {
				document.querySelectorAll('.ipsMenu[data-page-editor-menu]').forEach(element => {
					element.dispatchEvent(new CustomEvent('closeMenu'));
					element.remove();
				});

				// Trigger ajax request to actually delete
				ips.getAjax()( pageUrl, {
					showLoading: true,
					data: {
						do: 'storeRevision'
					}
				} )
				.done( function (response) {
					self.scope.removeClass('cWidgetsManaging');
					self._hideManager();
					try {
						self.triggerOn('core.front.widgets.area', 'managingFinished.widgets');
					} catch(e) {
						Debug.error(e);
					}
					if (ips.utils.url.getParam('_blockManager')) {
						// if we artificially added the block manager state, just go back
						if (ips.utils.history.getState('pagebuilder').artificial) {
							window.history.back()

						}
						// just make sure we unset the artificial flag
						setTimeout(
							() => ips.utils.history.replaceState({}, 'pagebuilder', pageUrl )
						);
					}
				})
				.fail( function () {
					window.location = pageUrl;
				});
			}
		},
		
		/**
		 * Set up drags on the main list and manager lists
		 *
		 * @param	{event} 	e 			The event
		 * @returns {void}
		 */
		_setUpDragging() {
			this.elem.querySelectorAll('[data-role="availableBlocks"] ul').forEach(list => {
				list.style.zIndex = ips.ui.zIndex();
				list.querySelectorAll(':scope > .cSidebarManager_block').forEach(item => this._setupDraggingOnItem(item));
			})
		},

		/**
		 * Setup dragging on an element
		 * @param {Element} item
		 * @private
		 */
		_setupDraggingOnItem(item) {
			item.setAttribute('draggable', 'true');
			const wrapBehavior = item.dataset.widgetLayouts?.split(',')?.[0]?.trim() || 'table'
			item.addEventListener('dragstart', function(e) {
				e.stopPropagation();
				e.dataTransfer.clearData();
				const data = {
					blockID: e.target.dataset.blockid,
					blockTitle: e.target.dataset.blocktitle,
					allowReuse: e.target.dataset.allowreuse,
					config: !!e.target.dataset.blockconfig,
					blank: e.target.dataset.blockerrormessage,
					menustyle: e.target.dataset.menustyle,
					ipsWrapBehavior: wrapBehavior,
				};
				e.dataTransfer.setData('application/x.ipsblock', JSON.stringify(data));

				// Dragover events cannot access data stored inside the dataTransfer object, so while it's being dragged we will set the data as a global setting
				ipsSettings.__pageeditor_last_dragged_widget_data__ = data;
				item.addEventListener(
					'dragend',
						e => {
							delete ipsSettings.__pageeditor_last_dragged_widget_data__;
						},
					{once: true}
				);
			})
		},

		/**
		 * Shows the manager panel, loading the contents remotely if needed
		 *
		 * @returns {void}
		 */
		async _showManager() {
			this.scope.find('#elSidebarManager').prop('hidden', false);
			this._fadeUnmanagedRoots();

			// Fetch the sidebar list
			if (!this._loadedManager && !this._loadingManager) {
				try {
					const response = await ips.fetch(ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=widgets&do=getBlockList', {
						data: {pageApp: $('body').attr('data-pageApp'), pageModule: $('body').attr('data-pageModule'), pageController: $('body').attr('data-pageController'), pageId: ips.getSetting('pageID') || null}
					})

					this._loadedManager = true;
					this.scope.find('[data-role="availableBlocks"]').html(response);
					this.scope.find('[data-role="availableBlocks"]').attr("data-unloaded", null);
					this._setUpDragging();
					this.setupSearch();
					this.setupFavorites();

					// Content change again
					try {
						$(document).trigger('contentChange', [$('#elSidebarManager')]);
					} catch (e) {
						Debug.error(e);
					}
					document.dispatchEvent(new CustomEvent('ipsWidgetManagerLoaded', {bubbles: true, cancelable: true}))
				} catch (e) {
					Debug.error(e)
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: ips.getString('sidebar_fetch_blocks_error'),
						callbacks: {}
					});
				}
				this.scope.find('[data-role="availableBlocks"]').removeClass('ipsLoading ipsLoading_dark');
				this._loadingManager = false;
			} else {
				// If we've loaded the data already, we still need to call these
				this._setUpDragging();
				this.setupSearch();
				this.setupFavorites();
			}

			this._inManagingState = true;
		},

		/**
		 * Hides the manager panel
		 *
		 * @returns {void}
		 */
		_hideManager() {
			this._unfadeUnmanagedRoots();
			this.scope.find('#elSidebarManager').prop('hidden', true);
			this._inManagingState = false;
		},


		/**
		 * Add the manager sidebar HTML to the page
		 *
		 * @returns {void}
		 */
		_buildSidebar() {
			this.elem.innerHTML += ips.templates.render('core.sidebar.managerWrapper');

			// This can throw errors and shouldn't really be blocking
			try {
				$(document).trigger('contentChange', [this.scope]);
			} catch (e) {
				Debug.error(e);
			}
		},

		_getUnmanagedRoots() {
			const unmanagedRoots = new Set();
			const visitedNodes = new Set();
			const root = document.querySelector('[data-ips-hook="main"]');
			function bubbleUp(el) {
				if (el === root) {
					return;
				}

				if (visitedNodes.has(el)) {
					return;
				}

				// check all the children
				[...el.children].forEach(child => {
					if (!child.matches('.pageBuilderRoot, .cWidgetContainer, :is(.pageBuilderRoot, .cWidgetContainer) *') && !child.querySelector('.pageBuilderRoot, .cWidgetContainer')) {
						unmanagedRoots.add(child);
					}
				});

				if (el.parentElement) {
					bubbleUp(el.parentElement);
				}

				visitedNodes.add(el);
			}

			root.querySelectorAll('.cWidgetContainer--main, .cWidgetContainer:not(.cWidgetContainer *)').forEach(el => {
				bubbleUp(el.parentElement);
			})

			return unmanagedRoots;
		},

		_fadeUnmanagedRoots() {
			this._getUnmanagedRoots().forEach(root => {
				setTimeout(() => {
					if (Date.now() - pageLoadTime > 3000) {
						root.classList.add('cWidgetsManaging__faded-root--animating');
					}
					root.classList.add('cWidgetsManaging__faded-root');
					Promise
						.all(root.getAnimations().map(animation => animation.finished))
						.then(() => root.classList.remove('cWidgetsManaging__faded-root--animating'));
				})
			})
		},

		_unfadeUnmanagedRoots() {
			document.querySelectorAll('.cWidgetsManaging__faded-root').forEach(root => {
				root.classList.add('cWidgetsManaging__faded-root--animating');
				root.classList.remove('cWidgetsManaging__faded-root');
				Promise
					.all(root.getAnimations().map(animation => animation.finished))
					.then(() => root.classList.remove('cWidgetsManaging__faded-root--animating'));
			});
		}
	});
}(jQuery));

/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.stats.overviewBlock.js - Overview statistics block controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.stats.overviewBlock', {
		_lastURL: null,

		/**
		 * Initialize this controller
		 */
		initialize() {
			this.on('stats.loadBlock', this.loadBlock);

			this.refresh = null;
			this.loaded = false;
			this.currentCounts = [];
			this.url = null;
			this.block = this.elem.dataset.block;
			this.subblock = this.elem.dataset.subblock;
			this.savedstatid = this.elem.dataset.savedstatid;
			this.refreshInterval = this.elem.dataset.refresh ? parseInt(this.elem.dataset.refresh) : false;
			this.elem.dispatchEvent(new CustomEvent('stats.ready', {bubbles: true}));
			this.elem.addEventListener('submit', e => this.handleSubmit(e), {capture: true});
			this.elem.querySelector('[data-role="removeBlock"]')?.addEventListener('click', e => this.deleteBlock(e));
		},

		/**
		 * Redirect to the delete block endpoint, which in turn redirects back to this page without the block.
		 * @param {PointerEvent}	e
		 */
		deleteBlock(e) {
			e?.preventDefault();
			ips.ui.alert.show({
				message: ips.getString('statsreports_delete_confirm'),
				type: 'confirm',
				callbacks: {
					ok: () => {
						// we use this redirect approach to display errors to the user easily. TODO at some point this should use a proper ajax request but this works
						const url = new URL(window.location.protocol + ips.getSetting('baseURL'), window.location.origin);
						url.pathname += url.pathname.endsWith('/') ? "admin/" : "/admin/";
						url.searchParams.set('app', 'core');
						url.searchParams.set('module', 'overview');
						url.searchParams.set('controller', 'mycharts');
						url.searchParams.set('do', 'deleteBlock');
						url.searchParams.set('saved_block_id', this.savedstatid);
						url.searchParams.set('csrfKey', ips.getSetting('csrfKey'));
						window.location.href = url.toString();
					}
				}
			});
		},

		/**
		 * Handle the submisso
		 * @param {SubmitEvent}	e
		 */
		async handleSubmit(e) {
			e.preventDefault();
			e.stopPropagation();

			// all we need to do is send an update then load this block
			/**@type{HTMLFormElement} */
			const form = e.target;
			const dropdown = form.closest('i-dropdown[data-dropdown-role]');
			if (dropdown) {
				dropdown.createContentElement();
			}

			let saveFilters = false;
			if (dropdown?.dataset.dropdownRole === 'saveReport') {
				const data = Object.fromEntries([...(new FormData(form)).entries()]);
				const url = (new URL(form.action, window.location.href)).toString();

				dropdown.contentElement.classList.add('ipsLoading', 'ipsLoading--small');
				try {
					const response = await ips.fetch(url, {
						method: "post",
						data: {
							...data,
							updated_filters: this.savedstatid ? undefined : JSON.stringify(this.getFilterValues())
						}
					});

					if (typeof response !== 'object' || response.message !== 'ok') {
						const err = new Error();
						err.jqxhr = jqxhr;
						throw err;
					}

					if (this.savedstatid && response.title && this.elem.querySelector(`[data-role="stat_title"]`)) {
						// if we're viewing the report, refresh so the title is updated
						this.elem.querySelector('[data-role="stat_title"]').innerText = response.title;
					}
				} catch (e) {
					if (e.jqxhr?.responseText && dropdown.contentElement) {
						dropdown.contentElement.innerHTML = e.jqxhr?.responseText;
						return;
					}

					if (e.jqxhr?.responseText || e.jqxhr?.responseJSON) {
						ips.ui.alert.show({message: e.jqxhr.responseText || e.jqxhr?.responseJSON});
						return;
					}
					ips.ui.alert.show({message: ips.getString('unexpected_error')});
					return;
				}
			} else if (dropdown?.dataset.dropdownRole === 'filterForm') {
				// If this was a filter form, update the saved filters for this block
				const formValues = Object.fromEntries((new FormData(form, e.submitter)).entries());
				const dropdownURL = dropdown.dataset.iDropdownSource ? new URL(dropdown.dataset.iDropdownSource, location.href) : null;
				if (this.formData) {
					for (const k in this.formData) {
						dropdownURL?.updateSearchParams(k, null);
					}
				}
				this.formData = {};
				for (const key in formValues) {
					if (key === 'save_block_filters') {
						saveFilters = true;
					} else if (!key.match(/^csrfKey|MAX_FILE_SIZE|save_block_filters|.*(?:_submitted|_activeTab)$/)) {
						this.formData[key] = formValues[key];
						dropdownURL?.updateSearchParams(key, formValues[key]);
					}
				}
				if (dropdownURL) {
					dropdown.dataset.iDropdownSource = dropdownURL.toString();
				}
				this.elem.dataset.filters = JSON.stringify(this.formData);

				// reset our values so the user has confirmation the block is updated
				this.currentCounts = null;
			}

			if (this.url) {
				this.url = this.rebuildURL();
				this._lastURL = this.url;
				await this.fetchUpdate(saveFilters);
			} else {
				this.elem.dispatchEvent(new CustomEvent('stats.ready', {bubbles: true})); // this causes the block to be loaded
			}

			dropdown?.hidePopover();
			if (dropdown?.dataset.dropdownRole === 'saveReport') {
				ips.ui.flashMsg.show(ips.getString('saved'));
				await dropdown.resetRemoteContent();
			}
		},

		/**
		 * Return a normalized array of counts this block has shown, used to compare prev/next values
		 *
		 * @param	{Element|jQuery} 	elem	  Element to check for values
		 * @returns {Array<number|NaN>}
		 */
		getCounts(elem) {
			return [...$(elem).get(0).querySelectorAll('[data-number]')].map(el => parseInt(el.dataset.number));
		},

		/**
		 * Create an interval to update this block every so often
		 *
		 * @todo this could be enhanced with a websocket push at some point far in the future
		 */
		startInterval() {
			if (!this.refreshInterval || !this.url) {
				return;
			}

			clearInterval( this.refresh );
			this.refresh = setInterval(() => this.fetchUpdate(), this.refreshInterval * 1000);
		},

		/**
		 * Fetch the updated content for this block.
		 *
		 * @param {boolean}		[saveFilters=false]		Whether to save filters added to the request URL
		 *
		 * @return {Promise<void>}
		 */
		async fetchUpdate(saveFilters=false) {
			const response = await ips.fetch(this.url, {
				type: 'get',
				data: saveFilters ? {
					save_block_filters: '1',
					updated_filters: JSON.stringify(this.getFilterValues())
				} : undefined,
			});
			let identifiedDifference = !this.currentCounts;
			const counts = this.getCounts((new DOMParser()).parseFromString(response, 'text/html').body);

			// Is there a difference?
			if (!identifiedDifference) {
				if (counts.length !== this.currentCounts.length) {
					identifiedDifference = true;
				} else {
					for (let i = 0; i < counts.length; i++) {
						if (counts[i] !== this.currentCounts[i]) {
							identifiedDifference = true;
							break;
						}
					}
				}
			}

			if (identifiedDifference) {
				this.elem.classList.add('cStatTile--updated');
				let contentContainer = this.elem.querySelector('[data-role="statBlockContent"]');
				if (contentContainer) {
					contentContainer.innerHTML = "<div>" + response + "</div>";
				}

				this.currentCounts = counts;
				setTimeout(() => this.elem.classList.remove('cStatTile--updated'), 2200);
				$( document ).trigger('contentChange', [this.scope]);
			} else {
				Debug.log("No change in values in " + this.block);
			}
		},

		/**
		 * Rebuild a URL Based on data
		 * @param [data]
		 *
		 * @return {string}
		 */
		rebuildURL(data) {
			if (!data) {
				const currentURL = new URL(this.url||"", location.href);
				data = {
					url: this.url,
					dateFilters: {
						range: currentURL.searchParams.get('range'),
						start: currentURL.searchParams.get('start'),
						end: currentURL.searchParams.get('end'),
					}
				}
			}

			/**@type {URL} url*/
			let url = new URL(data.url, location.href);
			url.updateSearchParams('blockKey', this.block);
			url.updateSearchParams('subblock', this.subblock || null);

			const range = ![0,-1, Number.NaN].includes(parseInt(data?.dateFilters?.range)) ? data.dateFilters.range.toString() : null
			url.updateSearchParams('range', range);
			url.updateSearchParams('start', (!range && data?.dateFilters?.start?.toString()) || null);
			url.updateSearchParams('end', (!range && data?.dateFilters?.end?.toString()) || null);
			url.updateSearchParams('saved_block_id', this.savedstatid || null);

			// Add the filter values to the request
			let filterValues = this.getFilterValues();
			if (Object.getPrototypeOf(filterValues) === Object.getPrototypeOf({})) {
				for (const filterKey in filterValues) {
					url.updateSearchParams(filterKey, filterValues[filterKey] ?? null);
				}
			}

			return url.toString();
		},

		getFilterValues() {
			try {
				let filterValues = JSON.parse(this.elem.dataset.filters || '{}');
				if (Object.getPrototypeOf(filterValues) === Object.getPrototypeOf({})) {
					for (const key of [...Object.keys(filterValues)]) {
						if (key.match(/^csrfKey|MAX_FILE_SIZE|save_block_filters|.*(?:_submitted|_activeTab)$/)) {
							delete filterValues[key];
						}
					}
					return filterValues;
				}
			} catch (e) {}
			return {};
		},

		/**
		 * Load the block
		 *
		 * @param	{event} 	e	    Event
		 * @param   {object}    data    Event data
		 * @returns {void}
		 */
		async loadBlock(e, data) {
			// We might only want to refresh one block, in which case we can skip this
			if ((data.blockToRefresh !== undefined) && (data.blockToRefresh !== this.block || data.subblockToRefresh !== this.subblock)) {
				Debug.log( "Skipping because " + data.blockToRefresh + " does not match " + this.block + " or " + data.subblockToRefresh + " does not match " + this.subblock );
				return;
			}

			if (!data.url) {
				throw new Error(`No URL provided to load this block`);
			}

			this._lastURL = this.url;
			this.url = this.rebuildURL(data);

			// Don't load unless the URL didn't change
			if (this.url === this._lastURL) {
				return;
			}

			clearInterval( this.refresh );
			if (this.loaded) {
				this.loaded = false;
				
				this.scope
					.removeClass('cStatTile--loaded')
					.find('.cStatTile__body')
						.addClass('ipsLoading')
					.end()
					.find('[data-role="statBlockContent"]')
						.hide()
						.html('');
			}

			const response = await ips.fetch(this.url, {
				type: 'get'
			})

			this.scope
				.addClass( 'cStatTile--loaded' )
				.find('.cStatTile__body')
					.removeClass('ipsLoading')
				.end()
				.find('[data-role="statBlockContent"]')
					.hide()
					.html( response );

			this.scope.find('[data-role="statBlockContent"]').fadeIn('fast');
			this.loaded = true;
			this.currentCounts = this.getCounts( this.scope );
			this.startInterval();

			$( document ).trigger( 'contentChange', [ this.scope ] );

		}
	});
}(jQuery));
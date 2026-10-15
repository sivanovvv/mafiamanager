/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.tabbar.js - A tab bar UI component
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.createModule('ips.ui.tabbar', function(){

		// Default widget options
		const defaults = {
			itemSelector: '.ipsTabs__tab', // The CSS selector used to find clickable tab items
			activeClass: false, // Classname applied to the active item
			loadingClass: 'ipsLoading ipsTabs_loadingContent', // Classname applied to loading panel
			panelClass: 'ipsTabs__panel', // Classname applied to panels
			updateURL: true, // Whether the browser URL should be updated when tab is switched
			updateTitle: false, // Whether the browser title should also be updated, when updateURL is true
			disableNav: false // Disables fancy tab loading functionality. Ideal for using this widget just for the mobile tab menu.
		};

		// Register this widget with ips.ui
		ips.ui.registerWidget('tabbar', ips.ui.tabbar, [ 
			'contentArea', 'itemSelector', 'activeClass', 'loadingClass', 'disableNav',
			'panelClass', 'updateURL', 'updateTitle'
		]);

		return {
			/**
			 * Responder for tab widget
			 *
			 * @param	{element} 	elem 		The element this widget is being created on
			 * @param	{object} 	options 	The options passed into this instance
			 * @returns {void}
			 */
			respond(elem, options) {
				if( !$( elem ).data('_tabbar') ){
					$( elem ).data('_tabbar', tabBarObj(elem, { ...defaults, ...options } ) );
				}
			}
		};
	});

	/**
	 * Tab Bar instance
	 * Handles events and logic for a single tab bar instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {{init: function}}
	 */
	function tabBarObj(elem, options) {
		/** @type {HTMLElement} */
		const rawElem = $(elem).get(0);
		const tabs = $(elem).find(options.itemSelector);	// Collection of the tabs in this bar
		let barId = rawElem.id; // ID of this tab bar
		let active;	// The active tab
		let ajaxObj; // Reference to the ajax object we use

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		function init() {

			if (!barId) {
				barId = $(rawElem).identify().attr('id');
			}

			if (!options.contentArea || !$(options.contentArea).length) {
				options.contentArea = '#' + $( rawElem ).next().identify().attr('id');
			}

			if (!tabs.length) {
				Debug.warn( "No tabs found in tab bar" + barId );
				return;
			}

			// Find our active tab
			active = _getActiveTab();

			// And do we need to enable it?
			_initializeActive();

			// Finally set the event handlers
			$( elem ).on( 'click', options.itemSelector, _handleTabClick );


			// Query elements for scrollable button functionality
			let tabbar = elem[0],
				tablist = tabbar.querySelector('[role="tablist"]'),
				scrollers = tabbar.querySelector('[data-role="tabScrollers"]');

			if (scrollers) {
				// If scrollers already exist, add the click event
				scrollers.addEventListener("click", e => _handleScrollerClick(e, tablist));

				// Determine if first/last tabs are visible, and show arrows based on their intersectionRatio. The .99 caters for sub-pixel rounding
				let scrollerObserver = new IntersectionObserver(
					tabs => tabs.forEach(
						tab => tabbar.querySelector(`[data-direction="${tab.target.matches(':first-child') ? 'prev' : 'next'}"]`).hidden = tab.intersectionRatio > .99
					),
					{
						root: tablist,
						threshold: 0.99
					}
				);

				// Attach intersection observer to first and last tab
				tablist.querySelectorAll(':scope > :first-child, :scope > :last-child').forEach(el => { scrollerObserver.observe(el) });
			}

		}

		/**
		 * Event handler for a tab click
		 *
		 * @param	{Event} 	e 	Event object
		 * @param {HTMLElement|jQuery} tablist
		 *
		 * @returns {void}
		 */
		function _handleScrollerClick(e, tablist) {
			let direction = e.target.closest('button').getAttribute("data-direction"),
				currentScroll = tablist.scrollLeft,
				listWidth = tablist.offsetWidth / 2;

			if (direction === "prev") {
				listWidth = -listWidth;
			}

			// Scroll tab bar by 50%. We don't want to scroll the entire width, since some tabs may be obscured by the scroll buttons
			tablist.scrollTo({left: currentScroll + listWidth, behavior:"smooth"})
		}

		/**
		 * Event handler for a tab click
		 *
		 * @param	{MouseEvent|Event} 	e 	Event object
		 *
		 * @this {HTMLElement}
		 * @returns {void}
		 */
		function _handleTabClick(e) {
			// If we aren't handling any navigation here, then let the browser handle it
			if (options.disableNav) {
				return;
			}

			e.preventDefault();

			// Is this tab active?
			if ($(this).attr('aria-selected') === 'true') {
				return;
			}
			let thisId = $(this).identify().attr('id'),
				thisContent = $('#' + $(this).attr('aria-controls'));

			// Fallback to legacy panel name if the aria-controls element doesn't exist
			if(!thisContent.length){
				thisContent = $('#' + thisId + '_panel');
			}

			// Does this tab content area exist already?
			if (!thisContent.length) {
				thisContent = _createTabPanel(thisId);
				// Load content
				_loadContent(this, thisContent)
					.done(() => _switchTab( thisId ))
					.fail(() => Debug.log('failed'));
			} else {
				_hideAllPanels();
				_switchTab( thisId );
			}

			// Update URL if necessary
			_updateURL( thisId );
		}

		/**
		 * Switches to the specified tab
		 *
		 * @param	{string} 	tabId 		ID of the tab to make active
		 * @returns {void}
		 */
		function _switchTab(tabId) {

			// Hide all panels
			_hideAllPanels();

			// Get the new panel
			const thisContent = $('#' + tabId + '_panel'),
				thisContentParent = document.querySelector(elem[0].getAttribute("data-ipstabbar-contentarea"));

			thisContent.prop('hidden', false);

			$( elem ).trigger('tabShown', {
				barID: barId,
				tabID: tabId,
				tab: active,
				panel: thisContent
			});

			// Let everyone know
			$( document ).trigger( 'contentChange', [ thisContent ] );

			// Scroll to top of tab area if it's not visible. This is helpful when the sidemenu is very long, such as "See my activity" in profiles.
			// The exception is tabs inside .ipsMenu (such as the "Edit widget" menu) and .ipsDialog (Select Category in Gallery upload form)
			if(elem[0].matches(".ipsTabs--sticky") && thisContentParent && window.scrollY > thisContentParent.offsetTop){
				thisContentParent.scrollIntoView({ behavior: "smooth" });
			}

			// Set as active
			active = $( '#' + tabId );

			// Switch tab
			_makeTabActive( active );

			// Let document know
			$(elem).trigger('tabChanged', {
				barID: barId,
				tabID: tabId,
				tab: active,
				panel: thisContent
			});

		}

		/**
		 * Updates the browser URL
		 *
		 * @param	{string} 	tabId 	ID of the tab to make active
		 * @returns {void}
		 */
		function _updateURL(tabId) {
			if (!options.updateURL) {
				return;
			}

			const tabLink = $(`#${tabId}`);
			const href = tabLink.attr('href');
			const title = ( options.updateTitle && tabLink.attr('title') ) ? tabLink.attr('title') : document.title;

			if (href && !href.startsWith('#')) {
				// Replace the current state
				ips.utils.history.replaceState({}, 'ips.ui.tabbar', href);
				document.title = title

				// Track page view
				ips.utils.analytics.trackPageView(href);
			}
		}

		/**
		 * Determines which tab is 'active'
		 *
		 * @returns 	{element}	The tab deemed to be 'active'
		 */
		function _getActiveTab() {

			// Try [aria-selected] first
			const activeTab = elem.find('[aria-selected="true"]');

			if (activeTab.length) {
				return activeTab.get(0);
			}

			// Otherwise just return the first tab
			return $(elem).find(options.itemSelector).first();
		}

		/**
		 * Initializes the tab that is first to be active
		 *
		 * @returns {void}
		 */
		function _initializeActive() {
			// Do we have an active panel?
			const activeId = $(active).identify().attr('id');

			if( !$( '#' + activeId + '_panel' ).length ){
				if( $( options.contentArea ).children().length ){
					// We have content in the content area, so make that this panel
					$( options.contentArea ).wrapInner( _createTabPanel( activeId, true ) );
					_switchTab( activeId );
				} else {
					// Load content
					var newPanel = _createTabPanel( activeId );
					_loadContent( active, newPanel ).done( function () {
						_switchTab( activeId );
					});
				}
			} else {
				_switchTab( activeId );
			}
		}

		/**
		 * Makes a tab active and other tabs inactive
		 *
		 * @param 	{Element} 	activeTab 	Reference to the tab to make active
		 * @returns {void}
		 */
		function _makeTabActive(activeTab) {

			// Unselect all tabs
			$( elem )
				.find( options.itemSelector )
				.attr( 'aria-selected', 'false' );

			if(options.activeClass){
				$(elem).find( options.itemSelector ).removeClass( options.activeClass );
			}

			// Select the new tab
			$( activeTab )
				.attr( 'aria-selected', 'true' );

			if(options.activeClass){
				$(activeTab).addClass( options.activeClass );
			}
		}

		/**
		 * Loads and inserts content via ajax
		 *
		 * @param	{element} 	tab 		The tab element being loaded
		 * @param	{element} 	container 	The container panel for the content
		 * @returns {promise} 	Promise object
		 */
		function _loadContent(tab, container) {
			let url;
			const deferred = $.Deferred();

			// Hide all other panels before we start
			_hideAllPanels();

			// Which URL should we load?
			if( $( tab ).attr('data-tabURL') ){
				url = $( tab ).attr('data-tabURL');
			} else {
				url = $(tab).attr('href');
			}

			// Set loading class
			$( options.contentArea ).addClass( options.loadingClass );

			// Get ajax object
			ajaxObj = ips.getAjax();

			ajaxObj(url)
				.done(response => {
					$(container).html(response);

					// Let everyone know
					//$( document ).trigger( 'contentChange', [ container ] );

					// Resolve promise so callbacks can execute
					deferred.resolve();
				})
				.fail(() => window.location = $( tab ).attr('href'))
				.always(() => $( options.contentArea ).removeClass( options.loadingClass ));

			return deferred.promise();
		}

		/**
		 * Hides all tab panels
		 * @returns 	{element} 	The new panel
		 */
		function _hideAllPanels() {
			$( options.contentArea )
				.find( '> .' + options.panelClass )
				.prop('hidden', true);
		}

		/**
		 * Creates an empty panel for the specific tab
		 *
		 * @param	{string} 	tabId 		Tab ID from which the panel is being created
		 * @param 	{boolean} 	[noAppend=false] 	Whether to not append this to the content area
		 * @returns {element} 	The new panel
		 */
		function _createTabPanel(tabId, noAppend=false) {

			const newPanel = $('<div/>')
				.attr({'id': tabId + '_panel'})
				.addClass(options.panelClass)
				.attr({'role': 'tabpanel'})
				.attr({'aria-labelledby': tabId});

			if( !noAppend ){
				$( options.contentArea ).append( newPanel );
			}

			return newPanel;
		}

		init();

		return { init };
	}

}(jQuery));
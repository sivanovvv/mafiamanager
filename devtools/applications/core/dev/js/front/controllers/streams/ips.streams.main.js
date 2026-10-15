/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.streams.main.js - Main stream view
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.streams.main', {

		_streamLoadingOverlay: null,
		_tooltip: null,
		_tooltipTimer: null,
		_baseURL: '',
		_streamID: 0,
		_currentView: '',

		_shortInterval: 15, // Seconds
		_longInterval: 45, // Seconds
		_killUpdate: 45, // Minutes
		_timer: null,
		_killTimer: null,
		_activityUpdate: null,
		_loadMore: null,
		_timestamp: 0,
		_autoUpdate: false,
		_windowFocus: false,

		initialize() {
			this.on( 'formSubmitted.stream', this.formSubmitted );
			this.on( 'initialFormData.stream', this.initialFormData );
			this.on( 'loadMoreResults.stream', this.loadMoreResults );
			this.on( 'latestTimestamp.stream', this.latestTimestamp );
			this.on( 'click', '[data-action="switchView"]', this.switchView );
			this.on( 'menuOpened', '#elStreamShare', this.menuOpened );
			this.on( 'click', '[data-action="toggleStreamDefault"]', this.toggleDefault );
			this.on( 'click', '[data-action="removeStream"]', this.removeStream );
			this.on( 'click', '[data-action="loadMore"]', this.loadMoreResults );
			this.on( 'resultsUpdated.stream', this.resultsUpdated );
			this.on( document, 'markAllRead', this.markAllRead );

			// Figure out the visibility event we need
			this.on( document, ips.utils.events.getVisibilityEvent(), this.windowVisibilityChange );

			// Primary event that watches for URL changes
			this.on( window, 'historychange:streams', this.stateChange );
			
			this.setup();
		},

		setup() {
			this._streamID = this.scope.attr('data-streamID');			
			this._baseURL = ips.getSetting('stream_config')['url'];

			if ( this._baseURL.match(/\?/) ) {
				this._baseURL += '&';
			} else {
				this._baseURL += '?';
			}

			// If the last character is &, we can remove that because it'll be added back later
			if( this._baseURL.slice(-1) === '&' ){
				this._baseURL = this._baseURL.slice( 0, -1)
			}

			// Get the newest timestamp
			this._timestamp = parseInt( this.scope.find('[data-timestamp]').first().attr('data-timestamp') );
			this._currentView = this.scope.find('[data-action="switchView"].ipsDataFilters__button--active').attr('data-view');

			if( this.scope.find('[data-role="streamResults"]').attr('data-autoPoll') !== undefined ){
				this._autoUpdate = true;
				this.windowVisibilityChange(); // Call our visibility method manually to determine window visibility
			}

			// Hide the "Show filters" button if we don't have filters. This happens in the All Activity stream
			if(!document.getElementById('elStreamFilterForm')){
				document.querySelector("[aria-controls='elStreamFilterForm']").hidden = true;
			}
		},
		
		/**
		 * Event handler for the page state changing
		 * We have a few different states to support:
		 * - Form changes
		 * - Load More button
		 * - View type
		 * Each is handled a little differently but ultimately passes data to this._loadResults
		 *
		 * @returns 	{void}
		 */
		stateChange() {
			const state = {
				data: ips.utils.history.getState('streams') || {},
				url: window.location.href,
				title: document.title
			}

			if( ( !state.data.controller || state.data.controller !== 'core.front.streams.main' ) && this._initialURL !== state.url ){
				return;
			}

			if (state.data.action === 'saveForm' || state.data.action === 'updateForm') {
				// If this state alters the form, let the form know
				this.triggerOn( 'core.front.streams.form', 'streamStateUpdate.streamForm', {
					filterData: state.data.filterData,
					hideSaveBar: ( Object.keys( this._getUrlDiff( state.data.filterData ) ).length === 0 || state.data.action === 'saveForm' )
				});

				// Track page view
				ips.utils.analytics.trackPageView( state.url );

				// Are we changing the sorting?
				if( state.data.filterData.stream_sort !== undefined ){
					this._togglePolling( !( state.data.filterData.stream_sort === 'oldest' ) );
				}

				const data = Object.assign( { view: this._currentView }, state.data.filterData );

				switch (state.data.action) {
					case 'updateForm':
						data.updateOnly = 1
						break;
					case 'saveForm':
						data.form = 'save'
						break;
				}

				this._loadResults( data )
					.done((response) => {
						this.triggerOn( 'core.front.streams.results', 'updateResults.stream', {
							append: false,
							response
						});

						// Do we need to reset the URL & config?
						if (state.data.action === 'saveForm') {
							ips.setSetting( 'stream_config', JSON.parse( response.config ) );

							ips.utils.history.replaceState( {
								controller: 'core.front.streams.main',
								url: ips.getSetting( 'stream_config' )['url'],
								skipUpdate: true
							}, 'core.front.streams.main', ips.getSetting( 'stream_config' ).url );
						}
					})

			} else if( state.data.action === 'loadMore' ){

				const data = Object.assign({
					before: state.data.before,
					view: this._currentView
				}, state.data.filters);

				// If it's from 'load more', load them and pass the results down
				const before = this.scope.find('[data-role="activityItem"]').last().attr('data-timestamp');
				this._loadResults( data )
					.done((response) => {
						const content = $('<div>' + response.results + '</div>');
						// We deduct one here because the SQL does a > or < which won't match all items if the timestamp is exact
						const latest = parseInt(content.find('[data-role="activityItem"]').last().attr('data-timestamp')) - 1;
						ips.utils.history.replaceState( {
							controller: 'core.front.streams.main',
							latest: latest
						}, 'core.front.streams.main', this._buildRequestURL( { before: before, latest: isNaN( latest ) ? 0 : latest } ) );

						this.triggerOn( 'core.front.streams.results', 'updateResults.stream', {
							append: true,
							response: response,
							url: this._buildRequestURL( { before: before, latest: isNaN( latest ) ? 0 : latest } )
						});
					});

			} else if (state.data.action === 'viewToggle') {
				this._setViewType(state.data.view);

				// If it's from the view toggle, load them and pass the results down
				this._loadResults({view: state.data.view, ...state.data.filters})
					.done(
						response => this.triggerOn( 'core.front.streams.results', 'updateResults.stream', {response})
					);

			} else {
				// Don't do anything
				Debug.log('skip update');
			}
		},
		
		/**
		 * Event handler for clicking the Load More button
		 *
		 * @param 		{Event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		loadMoreResults(e, data) {
			e.preventDefault();
			
			// Get the last timestap being shown
			var timestamp = this.scope.find('[data-role="activityItem"]').last().attr('data-timestamp');
			var url = this._buildRequestURL( { before: timestamp } );

			this.scope
				.find('[data-role="loadMoreContainer"] [data-action="loadMore"]')
					.addClass('ipsButton--disabled')
					.text( ips.getString('loading') );
			
			ips.utils.history.pushState({
				controller: 'core.front.streams.main',
				before: timestamp,
				filters: this._getUrlDiff( this._formData ),
				action: 'loadMore'
			}, 'streams', url );
		},

		/**
		 * Called when the view is changing
		 *
		 * @param 		{string} 	type 		The view type we're switching to
		 * @returns 	{void}
		 */
		_setViewType(type) {
			this._currentView = type;
			
			// Update the button
			this.scope
				.find('[data-action="switchView"]')
					.removeClass('ipsButton--active')
					.filter('[data-view="' + type + '"]')
						.addClass('ipsButton--active');
						
			// Set a cookie
			ips.utils.cookie.set( 'stream_view_' + this._streamID, type, true );
		},
		
		/**
		 * Handles switching views
		 * Sets a cookie so the preference is remembered
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		switchView(e) {
			e.preventDefault();

			const view = $( e.currentTarget ).attr('data-view');

			ips.utils.history.pushState({
				controller: 'core.front.streams.main',
				view,
				filters: this._getUrlDiff( this._formData ),
				action: 'viewToggle'
			}, 'streams', this._buildRequestURL({view}));
		},
		
		/**
		 * Handler for the filter form being submitted. When this happens we determine
		 * what data is different, then update the page state in order to get new results
		 *
		 * @param 		{Event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		formSubmitted(e, data) {
			this._formData = this._getFormData( data.data );
			const url = this._buildRequestURL();

			ips.utils.history.pushState( {
				controller: 'core.front.streams.main',
				url: url,
				filterData: this._formData,
				action: data.action
			}, 'streams', url );
		},
		
		/**
		 * The form has passed us its initial values on page load
		 *
		 * @param 		{Event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		initialFormData(e, data) {
			this._formData = this._getFormData( data.data );
		},

		/**
		 * The results controller has sent us the latest-shown timestamp
		 *
		 * @param 		{Event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		latestTimestamp(e, data) {
			this._timestamp = data.timestamp;
		},

		/**
		 * Event handler for windw visibility changing
		 * Allows us to slow the rate of auto-updates if the user isn't looking at the page
		 *
		 * @returns 	{void}
		 */
		windowVisibilityChange() {
			var hiddenProp = ips.utils.events.getVisibilityProp();

			if( hiddenProp !== undefined ){
				if( document[ hiddenProp] ){
					this._windowFocus = false;
					this._startTimer( this._longInterval );
					this._killTimer = setTimeout( this._stopPolling.bind(this) , this._killUpdate * 60 * 1000 );
					Debug.log("Set the kill timer");
				} else {
					this._windowFocus = true;
					this._startTimer( this._shortInterval );
					this._updateTitle(0);
					clearTimeout( this._killTimer );
					Debug.log("Cleared the kill timer");
				}
			} else {
				this._startTimer( this._longInterval );
			}
		},
		
		/**
		 * Loads new results from the server
		 *
		 * @param 		{object} 	data 		Params data object
		 * @param 		{string} 	updateType	The type of update we're doing, e.g. 'update' or 'save'
		 * @param 		{boolean} 	silent		Fetch silently? If true, won't show loading or update stream UI
		 * @returns 	{$.Deferred<*>}
		 */
		_loadResults(data, resetConfig, silent) {
			var self = this;			
			var promise = $.Deferred();
			
			if( !silent ){
				this._setStreamLoading( true );	
			}						
			
			ips.getAjax()( ips.getSetting('stream_config')['url'], {
				type: 'post',
				data: data || {}
			})
				.done( function (response) {
					if( !silent ){
						self._setStreamLoading( false );
						self._updateStreamUI( response );	
					}
					
					promise.resolve( response );
				})
				.fail( function (response) {
					if( !silent ){
						ips.ui.alert.show( {
							type: 'alert',
							message: ips.getString('errorLoadingStream'),
							icon: 'warn'
						});	
					}				
					
					promise.reject();
				});
				
			return promise;
		},
		
		/**
		 * Perform actions after the results have been updated and added to the DOM
		 *
		 * @param 		{Event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		resultsUpdated: function(e, data) {
			if ( this.scope.find('[data-role="activityItem"]').length === 0  ) {
				this.scope.find('[data-role="loadMoreContainer"]').hide();
				this.scope.find('[data-role="streamContent"]').removeClass('ipsStream_withTimeline');
			}
			else{
				this.scope.find('[data-role="streamContent"]').addClass('ipsStream_withTimeline');
				this.scope.find('[data-role="loadMoreContainer"]').show();
			}
		},
		
		/**
		 * Processes an update after new results have been loaded
		 * This method is responsible for the stream UI. The actual results
		 * are processed by core.front.streams.results.
		 *
		 * @param 		{object} 	response 	Event data object from form controller
		 * @returns 	{void}
		 */
		_updateStreamUI(response) {
			Debug.log("Updating stream UI...");
			
			// Update blurb
			this.scope.find('[data-role="streamBlurb"]').text( response.blurb.replace(/&#039;/g, "'") );
			this.scope.find('[data-role="streamTitle"]').html( response.title );
		
			// Hide or reset "Load more" button if needed
			if( response.count === 0 ){
				this.scope.find('[data-role="loadMoreContainer"]').show().html( ips.templates.render('core.streams.noMore') );
			} else {
				this.scope.find('[data-role="loadMoreContainer"]').show().html( ips.templates.render('core.streams.loadMore') );
			}	
			
			// Update menu
			if( response.id ){
				var menuItem = $('body').find('[data-streamid="' + response.id + '"] .ipsNavBar__text');
				menuItem.html( response.title );
			}
		},
		
		/**
		 * Takes a raw form data object and returns only the keys we're interested in
		 *
		 * @param 		{object} 	data	Form data object
		 * @returns 	{object}
		 */
		_getFormData(data) {			
			var returnValues = {};
			
			// Keep any data prefixed with 'stream'
			for (const [key, val] of Object.entries(data)) {
				if( key.startsWith('stream_') ){
					returnValues[ key ] = val;
				}
			};

			// Remove the __EMPTY from classes
			try {
				if (returnValues['stream_classes'] && returnValues['stream_classes']['__EMPTY'] !== undefined) {
            		delete returnValues['stream_classes']['__EMPTY'];
				}	
			} catch (err) { }			
			
			return returnValues;
		},
		
		/**
		 * Returns an object that only contains the params that are
		 * different to our base stream config, allowing us to use them in
		 * the URL but not duplicate the 'default' stream values
		 *
		 * @param 		{object} 	data	Form data object
		 * @returns 	{object}
		 */
		_getUrlDiff(data) {

			var returnedValues = {};
			var defaultValues = ips.getSetting( 'stream_config' );

			// Reset any values that have been altered 
			if ( defaultValues['changed'] !== undefined ) {
				for (const [key, val] of Object.entries(defaultValues['changed'])){
					returnedValues[ ( key === 'containers' ) ? 'stream_containers' : key ] = defaultValues[ key ];
				};
			}

			if (!data || Object.keys(data).length === 0) {
				return returnedValues;
			}

			// Simple values
			for (const val of ['stream_sort', 'stream_include_comments', 'stream_read', 'stream_default_view', 'stream_club_select', 'stream_club_filter']) {
				if( defaultValues[ val ] !== data[ val ] && data[ val ] !== undefined ){
					returnedValues[ val ] = data[ val ];
				}
			};
			
			// Ownership
			if( data['stream_ownership']=== 'custom' ){
				// We're filtering by custom members, so work out if there's any differences
				var newNames = ( typeof data['stream_custom_members'] === "object" && data['stream_custom_members'] !== null ) ? data['stream_custom_members'] : data['stream_custom_members'].split(/\r?\n/);
				var oldNames = defaultValues['stream_custom_members'];
				
				if ( !Array.isArray(oldNames) ) {
					oldNames = [];
				}
				
				var nameIntersection = newNames.filter(name => oldNames.includes(name));

				// Got any names now?
				if ( ! newNames.length ) {
					returnedValues['stream_ownership'] = 'all';
				}
				// If the lengths don't match, include them
				else if( newNames.length !== oldNames.length || nameIntersection.length !== newNames.length ){
					returnedValues['stream_ownership'] = 'custom';
					returnedValues['stream_custom_members'] = data['stream_custom_members'];
				}
			} else if( defaultValues['stream_ownership'] !== data['stream_ownership'] ) {
				returnedValues['stream_ownership'] = data['stream_ownership'];
			}
			
			// Follows
			if( !( defaultValues['stream_follow']=== 'all' && data['stream_follow']=== 'all' ) ){
				if( data['stream_follow']=== 'followed' ){
					var newFollowTypes = Object.keys( data['stream_followed_types'] );
					var oldFollowTypes = Object.keys( defaultValues['stream_followed_types'] );
					var followIntersection = newFollowTypes.filter(name => oldFollowTypes.includes(name));
					
					if( newFollowTypes.length !== oldFollowTypes.length || followIntersection.length !== newFollowTypes.length ){
						returnedValues['stream_follow'] = 'followed';
						returnedValues['stream_followed_types'] = data['stream_followed_types'];
					}
				} else {
					returnedValues['stream_follow'] = data['stream_follow'];
				}			
			}
			
			// Tags
			if( data['stream_tags'] !== undefined && data['stream_tags'].trim().length !== 0 ){
				var newTags = ( data['stream_tags'] || '' ).split(/\r?\n/).filter(Boolean);
				var oldTags = ( defaultValues['stream_tags'] || '' ).split(/\r?\n/).filter(Boolean);
				var tagIntersection = newTags.filter(name => oldTags.includes(name));

				if( newTags.length !== oldTags.length || tagIntersection.length !== newTags.length ){
					returnedValues['stream_tags'] = newTags.map( str => str.trim() ).join(',');
				}
			} else if ( defaultValues['stream_tags'] ) {
				// There were tags
				returnedValues['stream_tags'] = '';
			}
			
			// Dates
			if( data['stream_date_type']=== 'custom' ){
				var startTest = data['stream_date_range']['start'];

				if( startTest.toString().match( /^[0-9]{9,10}$/ ) )
				{
					var start = data['stream_date_range']['start'];
					var end = data['stream_date_range']['end'];
				}
				else
				{
					var start = new Date( data['stream_date_range']['start'] ).getTime() / 1000;
					var end = new Date( data['stream_date_range']['end'] ).getTime() / 1000;
				}
				
				// Check if there's a start date, and if so, is it different to the stream default?
				if( data['stream_date_range']['start'] && 
					( defaultValues['stream_date_range'] === undefined || start !== defaultValues['stream_date_range']['start'] ) ){
					returnedValues['stream_date_type'] = 'custom';
					returnedValues['stream_date_start'] = start;
				}
				// Check if there's an end date, and if so, is it different to the stream default?
				if( data['stream_date_range']['end'] && 
					( defaultValues['stream_date_range'] === undefined || end !== defaultValues['stream_date_range']['end'] ) ){
					returnedValues['stream_date_type'] = 'custom';
					returnedValues['stream_date_end'] = end;
				}
			} else if( data['stream_date_type']=== 'relative' ){
				// Has the number of relative days changed?
				if( defaultValues['stream_date_relative_days'] !== data['stream_date_relative_days'] ){
					returnedValues['stream_date_type'] = 'relative';
					returnedValues['stream_date_relative_days'] = data['stream_date_relative_days'];
				}
			} else if( defaultValues['stream_date_type'] !== data['stream_date_type'] ){
				returnedValues['stream_date_type'] = data['stream_date_type'];
			}
			
			// Classes
			if( data['stream_classes_type']=== 0 && defaultValues['stream_classes_type']=== 1 ){
				returnedValues['stream_classes'] = {};
			} else {
				var newClasses = Object.keys(data['stream_classes'] || {}).filter(key => key !== '__EMPTY');
				var classIntersection = newClasses.filter(name => defaultValues['stream_classes'][name]);
			
				if( classIntersection.length !== newClasses.length ){
					returnedValues['stream_classes'] = { ...data['stream_classes'] };
        			delete returnedValues['stream_classes']['__EMPTY'];
				}	
			}			
			
			// Containers
			var containers = {};
			if ( typeof data['stream_classes'] === 'object' && data['stream_classes'] !== null ) {
				Object.keys(data['stream_classes']).filter(key => key !== '__EMPTY').forEach(val => {
					var contentType = $('div[data-role="streamContainer"][data-className="' + val.replace(/\\/g, '\\\\') + '"]').attr('data-contentKey');
					if (contentType !== undefined && $('input[name="stream_containers_' + contentType + '"]').length) {
						containers[val] = $('input[name="stream_containers_' + contentType + '"]').val();
					}
				});
			}
			
			if ( Object.keys( containers ).length !== 0 ) {
				// Our Underscore JS conditional used _.isEqual. I *believe* JSON.stringify is an adequate replacement in this context
				// if ( defaultValues['containers'] !== undefined && ! _.isEqual( containers, defaultValues['containers'] ) ) {
				if ( defaultValues['containers'] !== undefined && JSON.stringify(containers) !== JSON.stringify(defaultValues['containers']) ) {
					returnedValues['stream_containers'] = containers;
				}
			}
			
			return returnedValues;
		},
		
		/**
		 * Builds a request URL by getting a diff of the current stream params,
		 * and adding any extra params we need.
		 *
		 * @param 		{object} 	[extraParams] 	Any extra request params to use
		 * @returns 	{string}
		 */
		_buildRequestURL(extraParams) {			
			var urlDiff = this._getUrlDiff( this._formData );
			var params = [];
			
			// Loop through each 'diffed' param to build the request URL
			for (const [key, val] of Object.entries(urlDiff)) {
				if (typeof val === 'object' && val !== null) {
					const keys = Object.keys(val);
					const values = Object.values(val);

					if (keys.length === 0) {
						params.push( key + '=' );
					} else {						
						for( var i = 0; i < keys.length; i++ ){
							var paramValue = ( (values[i] !== undefined) ? values[i] : 1 );
							params.push( key + '[' + encodeURIComponent( keys[i] ) + ']=' + paramValue );
						}	
					}					
				} else {
					params.push( key + '=' + encodeURIComponent( val ) );
				}
			};
			
			// Do we have extra params?
			if (typeof extraParams === 'object' && extraParams !== null) {
				for (const [key, val] of Object.entries(extraParams)) {
					params.push( key + '=' + encodeURIComponent( val ) );
				};
			}

			return this._baseURL + '&' + params.join('&');
		},

		/**
		 * Selects the value of the textbox in the share popup
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		menuOpened(e, data = e.detail) {
			$(data.menu).find('input[type="text"]').trigger('focus').get(0).select();
		},
		
		/**
		 * Confirms user click to remove this stream
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		removeStream(e) {
			e.preventDefault();
			
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('confirmRemoveStream'),
				callbacks: {
					ok() {
						window.location = $(e.currentTarget).attr('href') + '&wasConfirmed=1';
					},
				}
			});
		},
		
		/**
		 * Toggles a stream as the shortcut
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		toggleDefault(e) {
			e.preventDefault();
		
			var self  = this;
			var link  = $( e.currentTarget );
			var value = link.attr('data-change');
			var url   = link.attr('href');
			
			ips.getAjax()( url )
				.done( function (response) {					
					if( value == 1){
						self.scope.find('[data-role="toggleDefaultTrue"]').prop('hidden', true);
						self.scope.find('[data-role="toggleDefaultFalse"]').prop('hidden', false);
					} else {
						self.scope.find('[data-role="toggleDefaultTrue"]').prop('hidden', false);
						self.scope.find('[data-role="toggleDefaultFalse"]').prop('hidden', true);
					}
						
					if( !response.title ) {
						$('a[data-action="defaultStream"]').hide();
					} else {
						$('a[data-action="defaultStream"]')
							.attr('href', response.url )
							.attr('aria-label', response.title )
							.show()
							.find('[data-role="defaultStreamName"]')
								.html( response.title );
					}
	
					if( value == 1 ){
						if( !ips.utils.responsive.enabled || !ips.utils.responsive.currentIs('phone') && $('a[data-action="defaultStream"]').is(':visible') ){
							self._showStreamTooltip( response.tooltip );
						} else {
							ips.utils.anim.go( 'pulseOnce', $('a[data-action="defaultStream"]') );
						}
					}			
			});
		},

		/**
		 * Shows a tooltip on the 'default stream' link to help the user
		 *
		 * @param 		{string} 	title 		Title of the default stream
		 * @returns 	{void}
		 */
		_showStreamTooltip(title) {
			if( !this._tooltip ){
				// Build it from a template
				var tooltipHTML = ips.templates.render( 'core.tooltip', {
					id: 'elDefaultStreamTooltip_' + this.controllerID
				});

				// Append to body
				ips.getContainer().append( tooltipHTML );

				this._tooltip = $('#elDefaultStreamTooltip_' + this.controllerID );
			} else {
				this._tooltip[0].hidePopover();
			}

			if( this._tooltipTimer ){
				clearTimeout( this._tooltipTimer );
			}

			this._tooltip.text( ips.getString('streamDefaultTooltip', {
				title: title
			}));

			// Get image
			var streamLink = $('a[data-action="defaultStream"]:visible');
			var self = this;

			// Now position it
			var positionInfo = {
				trigger: streamLink.first(),
				target: this._tooltip,
				center: true,
				above: true
			};

			var tooltipPosition = ips.utils.position.positionElem( positionInfo );

			$( this._tooltip ).css({
				left: tooltipPosition.left + 'px',
				top: tooltipPosition.top + 'px'
			});

			if( tooltipPosition.location.vertical=== 'top' ){
				this._tooltip.addClass('ipsTooltip_top');
			} else {
				this._tooltip.addClass('ipsTooltip_bottom');
			}

			this._tooltip[0].showPopover();

			setTimeout( function () {
				if( self._tooltip && self._tooltip.is(':visible') ){
					self._tooltip[0].hidePopover();
				}
			}, 3000);
		},
		
		/**
		 * Puts the stream into loading mode by adding an overlaid loading div
		 *
		 * @param 		{boolean} 	loading 		Are we loading?
		 * @returns 	{void}
		 */
		_setStreamLoading(loading) {
			var stream = this.scope.find('[data-role="streamContent"]');

			if( !loading ){
				this._streamLoadingOverlay.hide();
				stream.css({
					opacity: "1"
				});
				return;
			} else {

				if( !this._streamLoadingOverlay ){
					this._streamLoadingOverlay = $('<div/>').addClass('ipsLoading');
					ips.getContainer().append( this._streamLoadingOverlay );
				}

				// Get dims & position			
				var dims = ips.utils.position.getElemDims( stream );
				var position = ips.utils.position.getElemPosition( stream );

				this._streamLoadingOverlay.show().css({
					left: position.viewportOffset.left + 'px',
					top: position.viewportOffset.top + $( document ).scrollTop() + 'px',
					width: dims.width + 'px',
					height: dims.height + 'px',
					position: 'absolute',
					zIndex: ips.ui.zIndex()
				});

				stream.css({
					opacity: "0.5"
				});
			}

		},

		/**
		 * Sets or resets the timer to check for new posts
		 *
		 * @param 		{number} 	interval 		Interval (in seconds) between checks
		 * @returns 	{void}
		 */
		_startTimer(interval) {
			if( !this._autoUpdate ){
				return;
			}
			
			if( !interval ){
				interval = this._shortInterval;
			}

			if( this._timer ){
				clearInterval( this._timer );
			}

			this._timer = setInterval( this._autoFetchNew.bind(this), interval * 1000 );	
		},

		/**
		 * Toggles auto-polling for new content depending on the status passed in as a param
		 *
		 * @param 		{boolean} 	status 		Enable polling?
		 * @returns 	{void}
		 */
		_togglePolling(status) {
			// Only enable if we have polling possible
			if( !this._autoUpdate ){
				clearInterval( this._timer );
				return;
			}

			if( status ){
				this._startTimer();
				this.scope.find('[data-role="updateMessage"]').show();
			} else {
				if( this._timer ){
					clearInterval( this._timer );
					this.scope.find('[data-role="updateMessage"]').hide();
				}
			}
		},

		/**
		 * Method to check for new activity results on the server.
		 *
		 * @returns 	{void}
		 */
		_autoFetchNew() {
			if (!Number.isFinite(this._timestamp)) {
				Debug.log("Timestamp not a number");
				clearInterval( this._timer );
				return;
			}

			// Fetch the results, then pass them to the results controller to display
			this._loadResults( { after: this._timestamp }, false, true )
				.done(response =>{

					const count = parseInt(response.count);

					// If auto-polling is now disabled, stop everything
					if( response.error && response.error === 'auto_polling_disabled' ){
						this.scope.find('[data-role="updateMessage"]').remove();
						clearInterval( this._timer );
						return;
					}

					// Nothing returned?
					if (Number.isNaN(count) || count === 0) {
						return;
					}

					this.triggerOn( 'core.front.streams.results', 'resultsTeaser.stream', {
						response: response
					});
				});
		},

		/**
		 * Stops the auto-updating from running for good
		 *
		 * @returns 	{void}
		 */
		_stopPolling() {
			clearInterval( this._timer );
			this._autoUpdate = false;
			this.scope.find('[data-role="updateMessage"]').html( ips.getString('autoUpdateStopped') );
			Debug.log("Stopped polling due to user inactivity");
		},

		/**
		 * Updates the browser title with an 'unseen count' of new items
		 *
		 * @param 		{number} 	count 		Number of unseen items
		 * @returns 	{void}
		 */
		_updateTitle(count) {
			// Moved to instant notifications		
		},

		/**
		 * Marks everything in this stream as read
		 *
		 * @returns {void}
		 */
		markAllRead() {
			this.scope
				.find('[data-ips-unread]')
				.removeAttr('data-ips-unread');

		}
	});
}(jQuery));

/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.overview.search.js - Controller for event search
 *
 * Author: Rikki Tissier
 */
;( function($){
    "use strict";

    ips.controller.register('calendar.front.overview.search', {
        initialize() {
            this.on('click', '[data-action="useMyLocation"]', this.useMyLocation);
            this.on('click', '[data-action="cancelLocation"]', this.cancelLocation);
            this.on('submit', this.doSearch);
            this.on( document, 'click', '[data-action="backToOverview"]', this.backToOverview);
            this.on( document, 'click', '[data-action="loadMoreSearch"]', this.loadMore);
            this.on( document, 'menuItemSelected', '#elSortMenu', this.changeSort);
            this.on( document, 'click', '[data-action="moreNearMe"]', this.moreNearMe);
            this.on( document, 'click', '[data-action="moreExhibitions"]', this.moreExhibitions);
            this.on( window, 'historychange:calendarSearch', this.stateChange );
            this.setup();
        },

        /**
         * Setup method
         *
         * @returns {void}
         */
        setup() {

            // Other setup
            this._gotCoords = false;
            this._offset = 0;
            this._limit = 20;
            this._currentSort = $('body').find('#elSortMenu_menu [aria-selected="true"]').attr('data-ipsMenuValue');
            this._baseURL = this.scope.attr('action');
            this._initialURL = window.location.href;
            this._cancelledLookup = false;
            this._searchBox = this.scope.find('input[name="location"]');
            this._previousValue = this._searchBox.val();
            this._originalPlaceholder = this.scope.attr('data-placeholder');
            this._locationLink = this.scope.find('[data-action="useMyLocation"]');
            this._cancelLocationLink = this.scope.find('[data-action="cancelLocation"]');
            this._page = this.scope.closest('[data-role="eventsPage"]');
            this._resultsContainer = $('body').find('[data-role="searchResults"]');
            this._noResults = $('body').find('[data-role="noSearchResults"]');
            this._loadMore = $('body').find('[data-action="loadMoreSearch"]');
            this._noMore = $('body').find('[data-role="noMoreSearchResults"]');
            this._map = null;
            this._mapContainer = $('body').find('[data-role="searchResultsMap"]');
            this._markers = {};

           
            this.getInitialLocation();
        

            // Get map ready to show
            if( ips.getSetting( 'mapProvider' ) === 'google' ){
                this.setupGoogle();
            } else if( ips.getSetting( 'mapProvider' ) === 'mapbox' ){
                this.setupMapbox();
            } else {
				this._mapContainer.hide(); // hide map container if no map
			}
        },

        setupGoogle(){
            this._mapReady = true;
            Debug.log( this._resultsContainer.find('[data-eventid]') );
            Debug.log( this._mapContainer.attr('data-markers') );

            if( this._resultsContainer.find('[data-eventid]').length && this._mapContainer.attr('data-markers') ){
                Debug.log('here');
                try {
                    var markers = JSON.parse( this._mapContainer.attr('data-markers') );
                    Debug.log( markers );
                    this._updateGoogleMap( markers );
                } catch (err) {
                    Debug.log("Invalid marker JSON");
                    Debug.log(err);
                }
            }
        },

        setupMapbox() {
            $('head').append`
<link rel='stylesheet' type='text/css' media='all' href='https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.css'>
<link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.css' rel='stylesheet' />
<link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.Default.css' rel='stylesheet' />
<link rel='stylesheet' type='text/css' media='all' href='https://api.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v1.0.1/leaflet.fullscreen.css' />`;

            ips.loader.get( [ 'https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.js' ] ).then(() => {
                ips.loader.get( [ 'https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/leaflet.markercluster.js',
                    'https://api.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v1.0.1/Leaflet.fullscreen.min.js' ] ).then(() => {

                    this._mapReady = true;
                    
                    if( this._resultsContainer.find('[data-eventid]').length && this._mapContainer.attr('data-markers') ){

                        try {
                            const markers = JSON.parse( this._mapContainer.attr('data-markers') );
                            this._updateMapboxMap( markers );
                        } catch (err) {
                            Debug.log("Invalid marker JSON");
                            Debug.log(err);
                        }
                    }
                });
            });
        },

        getInitialLocation() {
            if ( ips.utils.geolocation.getGeolocationIsAllowed() ) {
                
                ips.utils.geolocation.getCurrentPosition()
                    .then( coords => {
                        this.setCoords( coords.latitude, coords.longitude );
                    })

                // Update useMyLocation link
                this.setSearchToLocation();
                this._locationLink.prop('hidden', true);
                this._cancelLocationLink.prop('hidden', false);
            }
        },

        setCoords(lat, long) {
            this.scope.prepend("<input type='hidden' name='lat' value='" + lat + "'>");
            this.scope.prepend("<input type='hidden' name='lon' value='" + long + "'>");
            this._gotCoords = true;
        },

        clearCoords() {
            this.scope.find( 'input[name="lat"]' ).remove();
            this.scope.find( 'input[name="lon"]' ).remove();
            this._gotCoords = false;
        },

        moreNearMe(e) {
            e.preventDefault();

            // Get the lat/long from the link
            var lat = $( e.currentTarget ).attr('data-lat');
            var long = $( e.currentTarget ).attr('data-long');
            var self = this;

            this.setSearchToLocation();
            this.scope.find('[name="date[start]"]').val('');
            this.scope.find('[name="date[end]"]').val('');
            this.scope.find('[name="show"]').val('regular');

            $("html, body").animate({ scrollTop: "300px" }, function () {
                self.doSearch();
            });
        },

        moreExhibitions(e) {
            e.preventDefault();

            this.cancelLocation();
            this.scope.find('[name="date[start]"]').val('');
            this.scope.find('[name="date[end]"]').val('');
            this.scope.find('[name="show"]').val('exhibitions');

            $("html, body").animate({ scrollTop: "300px" },  () => {
                this.doSearch();
            });
        },

        /**
         * Submit handler for the search form
         *
         * @param 		{Event} 	[e] 		Event object
         * @returns 	{void}
         */
        doSearch (e) {
            e?.preventDefault()
            const url = this._getUrlFromData();

            ips.utils.history.replaceState( {
                controller: 'calendar.front.overview.search',
                url
            }, 'calendarSearch', url );
        },

        /**
         * Build placeholder elements from a template
         *
         * @param 		{number} 	[count] 		Number to build (10 default)
         * @returns 	{string}
         */
        getPlaceholders(count) {
            let events = '';
            count = typeof count === 'number' ? 10 : count;

            for (let i = 0; i < count; i++) {
                events += ips.templates.render('eventLoading');
            }

            return events;
        },

        /**
         * Main state change event handler that responds to URL changes
         *
         * @param 		{event} 	e 		Event object
         * @param 		{object} 	data 	Event data object
         * @returns 	{void}
         */
        stateChange() {
            if (!('calendarSearch' in ips.utils.history.getState()) && this._initialURL !== window.location.href) {
                return;
            }

            const state = ips.utils.history.getState('calendarSearch')

            if (this._initialURL === state?.url) {
                // If our URLs match but we have no state data, we can assume we've gone back to the initial search form, so let's reset
                this.hideResults();
            } else if (this._initialURL === window.location.href && state?.url === undefined) {
                // If we don't have a URL, get it from our initial data
                this._loadResults( this._getUrlFromData( this._initialData ) );
            } else {
                // Otherwise use the state url
                this._loadResults( state?.url );
            }
        },

        /**
         * Builds a search URL based on on the form values
         *
         * @param 		{Event} 	e 		Event object
         * @param 		{object} 	data 	Event data object
         * @returns 	{string}
         */
        changeSort(e, data = e.detail) {
            e.preventDefault();
            this._currentSort = data.selectedItemID;
            const title = $(data.menuElem).find('[data-ipsMenuValue="' + this._currentSort + '"]').text();
            $('body').find('[data-role="searchOrder"]').text( title );
            this.doSearch();
        },

        /**
         * Builds a search URL based on on the form values
         *
         * @returns 	{string}
         */
        _getUrlFromData() {
            const formData = this.scope.serializeArray();
            const params = [];

            formData.forEach(function (item) {
                if ((item.value || '').trim() !== '') {
                    params.push( item.name + "=" + encodeURIComponent( item.value ) );
                }
            });

            params.push("sortBy=" + this._currentSort);

			if (this._baseURL.match(/\?/)) {
				if (!this._baseURL.endsWith('?')) {
					this._baseURL += '&';
				}
			} else {
				this._baseURL += '?';
			}

            return this._baseURL + params.join('&');
        },

        /**
         * Handles performing a new search
         *
         * @param 		{string} 	url 		URL to request
         * @returns 	{Promise<void>}
         */
        async _loadResults(url) {
            // Do we need to hide the overview stuff?
            if (this._page.length) {
                this._page.find('[data-role="eventsOverview"]').hide();
                this._page.find('[data-role="searchResultsWrapper"]').show();
            }

            this._resultsContainer.removeClass('ipsHide').html( this.getPlaceholders(6) );
			if (ips.getSetting('mapProvider') !== 'none') {
				this._mapContainer.addClass('cEvents__searchMap--loading').show();
			}
            this._currentUrl = url;

            const response = await ips.fetch( url );
            if (response.count) {
                this._resultsContainer.html( response.content );
                this._noResults.addClass('ipsHide');
                this._updateMap({ ...this._markers, ...response.markers });

                if( response.totalCount > ( response.count + this._offset ) ){
                    this._loadMore.show();
                    this._noMore.hide();
                } else {
                    this._loadMore.hide();
                    this._noMore.hide();
                }
            } else {
                this._resultsContainer.html('').addClass('ipsHide');
                this._noResults.removeClass('ipsHide');
                this._loadMore.hide();
                this._noMore.hide();
                this._mapContainer.hide();
            }

            if (response.virtual || !response.markerCount) {
                this._mapContainer.hide();
            }

            $( document ).trigger('contentChange', [ this._resultsContainer ]);
        },

        _updateMap(markers){
            if (ips.getSetting( 'mapProvider' ) === 'google') {
                this._updateGoogleMap( markers );
            } else if (ips.getSetting( 'mapProvider' ) === 'mapbox') {
                this._updateMapboxMap( markers );
            } else {
				this._mapContainer.hide(); // we really don't need it.
			}
        },

        _updateGoogleMap(markers){

            if( !this._map ){
                this._map = new window.google.maps.Map( document.querySelector( '[data-role="searchResultsMap"]' ) );
                this._mapMarkers = [];
            }

            this._mapContainer.removeClass('cEvents__searchMap--loading');

            /* Clear existing markers before we rebuild */
            if( this._mapMarkers.length ){
                for ( let marker of Object.values(this._mapMarkers) ) {
                    marker.setMap(null);
                }
                this._mapMarkers = [];
            }

            const bounds = new google.maps.LatLngBounds();
            for ( let marker of Object.values(markers) ) {
                let mapMarker = new window.google.maps.Marker({
                    position: {lat: marker.lat, lng: marker.long},
                    map: this._map,
                    title: marker.title
                });
                this._mapMarkers.push( mapMarker );

                const coords = new google.maps.LatLng(marker.lat, marker.long);
                if( !( bounds.contains( coords ) ) ){
                    bounds.extend( coords );
                }
            }

            /* If we have only one marker in here, fitting to the bounds zooms in way too much */
            if( this._mapMarkers.length === 1 ){
                this._map.setZoom(15);
                this._map.setCenter(bounds.getCenter());
            } else {
                this._map.fitBounds(  bounds );
            }
            this._mapContainer.show();
        },

        _updateMapboxMap(markers) {
            if (!this._map) {
                L.mapbox.accessToken = ips.getSetting('mapApiKey');
                this._map = L.mapbox
                    .map( this._mapContainer.get(0) )
                    .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));

                // Map prefs
                this._map.zoomControl = false;
                this._map.minZoom = 2;
                this._map.dragging = false;
                this._map.zoomControl = false;

                this._markersGroup = new L.featureGroup([]);
                this._markersGroup.addTo( this._map );
            }

            this._mapContainer.removeClass('cEvents__searchMap--loading');
            this._markersGroup.clearLayers(); // Remove all existing markers

            for (let id in markers) {
                const marker = L.marker([markers[id].lat, markers[id].long], {
                    title: markers[id].title,
                    draggable: false,
                    eventId: parseInt(id)
                });

                this._markersGroup.addLayer( marker );

                // Build info popup for this marker
                marker.on('click', this._markerClick.bind(this));
            }

            this._mapContainer.show();
            this._map.fitBounds(this._markersGroup.getBounds(), { maxZoom: 5 });
        },

        _markerClick(e) {
            const targetEvent = e.target.options.eventId;

            // Find that event in our listing
            const eventBlock = this._resultsContainer.find('[data-eventId="' + targetEvent + '"]');

            // Get position
            const topPos = eventBlock.offset().top;

            // Scroll to it
            $('html, body').animate({ scrollTop: topPos }, function () {
                eventBlock.css({ transform: 'scale(1.1)' });

                setTimeout( function () {
                    eventBlock.css({ transform: 'scale(1)' });
                }, 2000);
            });
        },

        /**
         * Handles loading more results into the current search
         *
         * @param 		{Event} 	e 		Event object
         * @returns 	{Promise<void>}
         */
        async loadMore(e) {
            e.preventDefault();

            const placeholders = this.getPlaceholders(2);
            this._resultsContainer.append( placeholders );
            this._loadMore.prop('disabled', true);

            const currentCount = this._resultsContainer.find('[data-eventid]').length;

            const response = await ips.fetch( this._currentUrl + "&offset=" + currentCount + "&limit=" + this._limit);

            this._resultsContainer.find('.ipsData__item--loading').remove();
            this._resultsContainer.append( response.content );
            this._updateMap( response.markers );
            this._loadMore.prop('disabled', false);

            if (this._resultsContainer.find('[data-eventid]').length >= response.totalCount) {
                this._loadMore.hide();
                this._noMore.show();
            } else {
                this._loadMore.show();
                this._noMore.hide();
            }

            $( document ).trigger('contentChange', [ this._resultsContainer ]);
        },

        /**
         * Remove current location as the search term
         *
         * @param 		{Event} 	[e] 		Event object
         * @returns 	{void}
         */
        cancelLocation(e) {
            e?.preventDefault()
            ips.utils.geolocation.setGeolocationIsAllowed(ips.utils.geolocation.permissions.DENIED);

            this._cancelledLookup = true;
            this._searchBox.val( this._previousValue ).attr('placeholder', this._originalPlaceholder).prop('disabled', false).removeClass('ipsField_loading');
            this._locationLink.prop('hidden', false);
            this._cancelLocationLink.prop('hidden', true);

            this.scope.find('[name="searchNearLocation"]').remove();
        },

        /**
         * Fetch current location and use it as the current search param
         *
         * @param 		{Event} 	e 		Event object
         * @returns 	{void}
         */
        useMyLocation(e) {
            e.preventDefault();

            this._cancelledLookup = false;
            this._searchBox.val('').attr('placeholder', ips.getString('event_finding_location')).prop('disabled', true).addClass('ipsField_loading');
            this._locationLink.prop('hidden', true);
            this._cancelLocationLink.prop('hidden', false);

            const afterCoords = () => {
                if( this._cancelledLookup ){
                    this._cancelledLookup = false;
                    return;
                }

                this.setSearchToLocation();
                this._cancelledLookup = false;
            };

            if( this._gotCoords ){
                afterCoords()
            } else {
                ips.utils.geolocation.getCurrentPosition()
                    .then(coords => {
                        this.setCoords(coords.latitude, coords.longitude);
                        this.setSearchToLocation();
                    });
            }
        },
        
        setSearchToLocation() {
            this._searchBox.val('').attr('placeholder', ips.getString('event_your_current_location')).prop('disabled', true).removeClass('ipsField_loading');
            this.scope.prepend("<input type='hidden' name='searchNearLocation' value='1'>");
        },

        /**
         * Cancel searching and show the overview page again
         *
         * @param 		{Event} 	e 		Event object
         * @returns 	{void}
         */
        backToOverview(e) {
            if (!this._page.length) {
                return;
            }

            e.preventDefault();

            ips.utils.history.replaceState(
                {
                    controller: 'calendar.front.overview.search',
                    url: this._initialURL
                },
                'calendarSearch',
                this._initialURL
            );
        },

        /**
         * Hide the search results panel
         *
         * @returns 	{void}
         */
        hideResults() {
            this._page.find('[data-role="eventsOverview"]').show();
            this._page.find('[data-role="searchResultsWrapper"]').hide();
        }
    });
}(jQuery));

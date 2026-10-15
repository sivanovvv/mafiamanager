/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.overview.nearMe.js - Controller for near me
 *
 * Author: Rikki Tissier
 */
;( function($){
    "use strict";

    ips.controller.register('calendar.front.overview.nearMe', {
        useGoogleMaps: false,
        events: {},
        useGeolocation: false,

        initialize: function () {
            this.setup();

            this.on( 'change', 'input#useCurrentLocation', this.useCurrentLocation );
        },

        /**
         * Setup method
         *
         * @returns {void}
         */
        setup() {
            if ( ips.utils.geolocation.getGeolocationIsAllowed() ) {
                this.scope.find('input[type="checkbox"]').prop('checked', true);
                this.useGeolocation = true;
            }

            // Are we using Mapbox or Google Maps?
            if ('nearmeUseGoogle' in this.scope.data()) {
                let apiKey = this.scope.data()['googlemapsApiKey'];
                if ( !apiKey ) {
                    // handle failure
                }

                this.useGoogleMaps = true;
                ips.ui.map.afterGoogleMapsLoaded(() => this.setupGoogleMaps())
            }
            else {
                // Pull in the CSS
                $('head').append(
                    `<link rel='stylesheet' type='text/css' media='all' href='https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.css'>
                        <link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.css' rel='stylesheet' />
                        <link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.Default.css' rel='stylesheet' />
                        <link rel='stylesheet' type='text/css' media='all' href='https://api.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v1.0.1/leaflet.fullscreen.css' />`
                );


                // Now the JS
                window.ips.loader.get( [ 'https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.js' ] )
                    .then(
                        () => ips.loader.get([
                            'https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/leaflet.markercluster.js',
                            'https://api.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v1.0.1/Leaflet.fullscreen.min.js'
                        ])
                    )
                    .then( () => {

                        if ( this.useGeolocation ) {
                            this.getEventsByLocation();
                        } else {
                            this.fetchEvents();
                        }

                        this._mapReady = true;
                    });
            }
        },

        googleMap: undefined,

        /**
         * setup the map for google maps; really just a callback for the google maps api response
         */
        setupGoogleMaps: function() {
            // just enter the fetch event flow; the response will be handled on return
            if ( this.useGeolocation ) {
                this.getEventsByLocation();
            } else {
                this.fetchEvents();
            }

            window.ipsGoogleMapsCallback = undefined;

            this._mapReady = true;
        },

        /**
         * Handles use current location checkbox
         */
        useCurrentLocation: function() {

            // Not the best way to go about this but we clear the map with fetchEvents response
            if ( this.useGoogleMaps ) {
                this.googleMap = false;
            }

            if( this.scope.find('#useCurrentLocation').is(':checked') ) {
                this.getEventsByLocation();
            } else {
                ips.utils.geolocation.setGeolocationIsAllowed( ips.utils.geolocation.permissions.DENIED );
                this.fetchEvents();
            }
        },
        /**
         * Uses the browser's geolocation to set the lat and long of the map; those are then sent to community to get a listing of nearby events
         */
        getEventsByLocation: function () {
            // Save the contents just in case we need it again
            this.showPlaceholders();
            ips.utils.geolocation.getCurrentPosition().then( coords => {
                var lat = coords.latitude;
                var long = coords.longitude;

                // Update the near me link
                this.scope.find('[data-role="nearMeLink"]')
                    .attr('href', ips.getSetting('baseURL') + '?app=calendar&do=search&form_submitted=1&lat=' + lat + '&lon=' + long )
                    .attr('data-lat', lat)
                    .attr('data-long', long);

                this.fetchEvents(lat, long);

            }).catch( () => {
                ips.ui.alert.show( {
                    type: 'alert',
                    message: ips.getString('event_your_current_location_sorry'),
                    icon: 'warn'
                });
                this.scope.find('#useCurrentLocation').closest('li').remove();
                this.fetchEvents();
            });
        },

        fetchEvents: function (lat, long) {
            var self = this;

            this.showPlaceholders();

            ips.getAjax()( ips.getSetting('baseURL') + '?app=calendar&module=calendar&controller=view&view=overview&get=nearMe' + ( lat && long ? '&lat=' + lat + '&lon=' + long : '' ) )
                .done( function (response) {
                    self.scope.find('[data-role="locationEvents"]').html(response.content);
                    self.setUpMap(response.lat, response.long);
                    $(document).trigger('contentChange', [self.scope]);
                });
        },

        setUpMap: function (lat, long) {
            var self = this;
            var mapDiv = this.scope.find('#map');

            if (!mapDiv.length) {
                Debug.log("No map container");
                return;
            }

            if ( this.useGoogleMaps ) {
                // Make sure these are numbers. They might come in as string encoded Floats
                lat = Number(lat);
                long = Number(long);

                if ( !this.googleMap ) {
                    const mapContainer = mapDiv.get(0);
                    mapContainer.style.width = '100%';
                    mapContainer.style.height = '400px';
                    this.googleMap = new window.google.maps.Map(mapContainer, {zoom: 4, center: {lat, lng: long}});
                } else {
                    this.googleMap.setCenter({ lat, lng: long });
                }


                // Update the near me link
                self.scope.find('[data-role="nearMeLink"]')
                    .attr('href', ips.getSetting('baseURL') + '?app=calendar&do=search&form_submitted=1&lat=' + lat + '&lon=' + long )
                    .attr('data-lat', lat)
                    .attr('data-long', long);

                // If we have the map now, set its contents
                if ( this.googleMap ) {
                    let markers;
                    try {

                        // We first copy the JSON and make sure lat an long are all numeric
                        let _markers = JSON.parse(mapDiv.attr('data-markers'));
                        let markers = [];
                        for ( let marker of Object.values(_markers) ) {
                            markers.push({
                                ...marker,
                                lat: Number(marker.lat),
                                long: Number(marker.long)
                            });
                        }

                        for ( let marker of Object.values(markers) ) {
                            let mapMarker = new window.google.maps.Marker({
                                position: {lat: marker.lat, lng: marker.long},
                                map: this.googleMap,
                                title: marker.title
                            });
                        }

                        if ( Object.values(markers).length ) {
                            const cb = (() => {
                                let bounds = this.googleMap.getBounds();
                                if ( !bounds ) {
                                    return window.setTimeout( cb, 200 );
                                }
                                let firstMarker = null;
                                let markerVisible = false;
                                let markerBounds = {latMax: null, latMin: null, lngMax: null, lngMin: null};
                                for (let marker of Object.values(markers)) {
                                    markerBounds.latMax = markerBounds.latMax === null ? marker.lat : Math.max(markerBounds.latMax, marker.lat);
                                    markerBounds.latMin = markerBounds.latMin === null ? marker.lat : Math.min(markerBounds.latMin, marker.lat);
                                    markerBounds.lngMax = markerBounds.lngMax === null ? marker.long : Math.max(markerBounds.lngMax, marker.long);
                                    markerBounds.lngMin = markerBounds.lngMin === null ? marker.long : Math.min(markerBounds.lngMin, marker.long);
                                    firstMarker = firstMarker || marker;
                                    if ( bounds.contains({lat: marker.lat, lng: marker.long}) ) {
                                        markerVisible = true;
                                    }
                                }
                                if (!markerVisible && firstMarker) {
                                    // find the centermost event
                                    let evtMidpoint = {
                                        lat: ((markerBounds.latMax + markerBounds.latMin) / 2),
                                        lng: ((markerBounds.lngMax + markerBounds.lngMin) / 2)
                                    };

                                    let minDistance = null;
                                    let mostMiddleMarker = null;
                                    if ( Object.values(markers).length > 1 ) {
                                        for (let marker of Object.values(markers)) {
                                            // we need to use the haversine formula to get he distance
                                            let distance = this.getDistance(evtMidpoint.lat, marker.lat, evtMidpoint.lng, marker.long);
                                            if (minDistance === null || distance < minDistance) {
                                                minDistance = distance;
                                                mostMiddleMarker = {lat: marker.lat, lng: marker.long};
                                            }
                                        }
                                    } else {
                                        mostMiddleMarker = {lat: firstMarker.lat, lng: firstMarker.long};
                                    }

                                    this.googleMap.panTo(mostMiddleMarker);
                                }
                            }).bind(this);
                            window.setTimeout(cb, 0);
                        }

                    } catch (e) {}
                }
            } else {

                L.mapbox.accessToken = ips.getSetting('mapApiKey');
                this._map = L.mapbox
                    .map(mapDiv.get(0))
                    .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));

                // Map prefs
                this._map.zoomControl = false;
                this._map.minZoom = 2;
                this._map.dragging = false;
                this._map.zoomControl = false;

                // Reposition zoom control
                /*L.control.zoom({
                     position: 'bottomright'
                }).addTo(this._map);*/

                // Add and position fullscreen control
                /*this._map.addControl(new L.Control.Fullscreen({
                    position: 'bottomleft'
                }));*/

                var markersGroup = new L.featureGroup([]);
                var markers = JSON.parse(mapDiv.attr('data-markers'));

                for (var id in markers) {
                    var marker = L.marker([Number(markers[id].lat), Number(markers[id].long)], {
                        title: markers[id].title,
                        draggable: false,
                        eventId: parseInt(id)
                    });

                    //self._map.addLayer( marker );
                    markersGroup.addLayer(marker);

                    // Build info popup for this marker
                    marker.on('mouseover', this._markerMouseOver.bind(this));
                    marker.on('mouseout', this._markerMouseOut.bind(this));
                }

                markersGroup.addTo(this._map);
                this._map.fitBounds(markersGroup.getBounds(), {maxZoom: 5});
            }
        },

        /**
         * Use the haversine formula to get a COOEFFICIENT of the distance between two points. This coefficient must be multiplied by 2*3956 to get the miles and by 2*6371 to get the kilometers
         *
         * @param lat1
         * @param lat2
         * @param lng1
         * @param lng2
         *
         *
         * @return {number}
         */
        getDistance: function (lat1, lat2, lng1, lng2) {
            // The math module contains a function
            // named toRadians which converts from
            // degrees to radians.
            lng1 =  lng1 * Math.PI / 180;
            lng2 = lng2 * Math.PI / 180;
            lat1 = lat1 * Math.PI / 180;
            lat2 = lat2 * Math.PI / 180;

            // Haversine formula
            let dlng = lng2 - lng1;
            let dlat = lat2 - lat1;
            let a = Math.pow(Math.sin(dlat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.pow(Math.sin(dlng / 2),2);

            let c = Math.asin(Math.sqrt(a));

            // Radius of earth in kilometers. Use 3956
            // for miles
            //let r = 6371;

            // calculate the result; multiply by 2*6371 for kilometers and 2*3956 for miles; at the time of writing this, the distance is only being compared so no need to factor in all these constants
            return c;
        },

        _markerMouseOver: function (e) {
            var eventId = e.target.options.eventId;

            // Fade out all events except this one
            this.scope.find('[data-eventid]').stop(false, true);
            this.scope.find('[data-eventid]:not([data-eventid="' + eventId + '"])').animate({ opacity: 0.4 }, 'fast');
        },

        _markerMouseOut: function (e) {
            this.scope.find('[data-eventid]').stop(false, true);
            this.scope.find('[data-eventid]').animate({ opacity: 1 }, 'fast');
        },

        showPlaceholders: function (count) {
            var events = [];

            for( var i = 0; i < 6; i++ ){
                events.push( ips.templates.render('eventLoading') );
            }

            this.scope
                .find('[data-role="locationEvents"]')
                .removeClass('ipsJS_hide')
                .html( ips.templates.render('nearMe', { events: events.join('') }) );
        }
    });
}(jQuery));
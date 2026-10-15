/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.map.js - Interactive Map
 *
 * Author: Matt Finger
 */
;( function($, _){

	ips.createModule('ips.ui.map', function(){

		/**
		 * @typedef {{contentUrl?: null, maxZoom?: number, zoom?: number, markers?: string}} MapOptions
		 */

		/**
		 * @type {MapOptions}
		 */
		const defaults = {
			zoom: 2,
			maxZoom: 16,
			markers: '[]',
			contentUrl: null
		};

		/**
		 * Handle Mapbox
		 *
		 * @param {jQuery}		elem
		 * @param {MapOptions}	options
		 *
		 * @returns {void}
		 */
		function _mapbox (elem, options) {
			$('head').append( "<link rel='stylesheet' type='text/css' media='all' href='https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.css'><link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.css' rel='stylesheet' /><link href='https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/MarkerCluster.Default.css' rel='stylesheet' />" );

			/**
			 * Handle popup events
			 * @param {Event} e
			 */
			function handlePopup(e) {
				const popup = e.target.getPopup();
				const clubID = e.target.options.clubID;

				ips.getAjax()( options.contentUrl + clubID )
					.done(response => {
						popup.setContent( response );
						popup.update();
					});
			}

			ips.loader.get( [ 'https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.js' ] ).then( function () {
				ips.loader.get( [ 'https://api.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v1.0.0/leaflet.markercluster.js' ] ).then(function () {
					L.mapbox.accessToken = ips.getSetting('mapApiKey');
					const map = L.mapbox
						.map(elem.get(0))
						.setView([45, 0], options.zoom)
						.addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));

					const cluster = new L.MarkerClusterGroup();
					map.addLayer( cluster );

					const markers = JSON.parse(options.markers);
					for (const id in markers) {
						const marker = L.marker([markers[id].lat, markers[id].long], {
							icon: L.mapbox.marker.icon({
								'marker-color': '#0000ff'
							}),
							clubID: id,
							title: markers[id].title,
							draggable: false
						});

						cluster.addLayer( marker );

						// Build info popup for this marker
						if (options.contentUrl) {
							marker.bindPopup(ips.getString('loading'));
							marker.on('click', handlePopup );
						}
					}

					// Center on markers
					map.fitBounds(cluster.getBounds().pad(0.5));
				});
			});
		}

		/**
		 * Handle google maps
		 *
		 * @param {jQuery}	elem
		 * @param {MapOptions}	options
		 *
		 * @returns {void}
		 */
		function _google(elem, options) {
			ips.ui.map.afterGoogleMapsLoaded(() => {
				const mapOptions = {
					zoom: options.zoom,
					maxZoom: options.maxZoom,
					scrollwheel: false
				};
				if ( options.zoom ) {
					mapOptions.center = { lat: 45, lng: 0 };
				} else {
					mapOptions.center = { lat: 30, lng: 0 };
				}

				const map = new google.maps.Map(elem.get(0), mapOptions);
				const bounds = new google.maps.LatLngBounds();

				const infowindow = new google.maps.InfoWindow({
					content: ips.getString('loading')
				});

				const markers = JSON.parse(options.markers);
				for (const id in markers ) {

					const marker = new google.maps.Marker({
						position: {lat: markers[id].lat, lng: markers[id].long},
						map: map,
						title: markers[id].title,
						id: id
					});

					if ( options.contentUrl ) {
						marker.addListener('click', function() {

							infowindow.setContent( ips.getString('loading') )
							infowindow.open(map,this);

							ips.getAjax()( options.contentUrl + this.id ).done(function(response){
								infowindow.setContent( response );
							});

						});
					}

					// Increase bounds to include this marker
					bounds.extend(marker.position);
				}

				//Center on markers
				map.fitBounds(bounds);
			})
		}

		/**
		 *
		 * @type {'unloaded'|'loaded'|'loading'}
		 */
		let googleMapsState = 'unloaded';

		/**
		 * @type {Set<function>}
		 */
		const googleMapsCallbacksQueue = new Set();

		ips.ui.registerWidget('map', ips.ui.map, [ 'zoom', 'maxZoom', 'markers', 'contentUrl' ] );

		return {

			/**
			 * Respond to a map widget
			 *
			 * @param    {jQuery}    elem        The element this widget is being created on
			 * @param    {MapOptions}    options    The options passed into this instance
			 *
			 * @returns {void}
			 */
			respond(elem, options) {
				options = {
					...defaults,
					...options
				}

				const generator = {google: _google, mapbox: _mapbox}[ips.getSetting('mapProvider')]

				if (ips.getSetting('lazyLoadEnabled')) {
					ips.utils.lazyLoad.observe(elem, {
						loadCallback() {
							generator?.(elem, options)
						}
					});
				} else {
					generator?.(elem, options)
				}
			},

			/**
			 * Call the callback after Google Maps api is loaded. If it's already loaded it will be called immediately
			 *
			 * @param {function} cb
			 */
			afterGoogleMapsLoaded(cb) {
				if (!(cb instanceof Function) || googleMapsCallbacksQueue.has(cb)) {
					return;
				}

				if (googleMapsState === 'loaded') {
					cb();
				}
				googleMapsCallbacksQueue.add(cb)

				if (googleMapsState === 'unloaded') {
					googleMapsState = 'loading'
					ips.loader.get( [ 'https://maps.googleapis.com/maps/api/js?key=' + ips.getSetting('mapApiKey') + '&libraries=places&sensor=false&loading=async' ] )
						.then(() => {
							googleMapsState = 'loaded'
							for (const queuedCallback of googleMapsCallbacksQueue) {
								queuedCallback();
							}
						})
				}
			}
		};
	});
}(jQuery));
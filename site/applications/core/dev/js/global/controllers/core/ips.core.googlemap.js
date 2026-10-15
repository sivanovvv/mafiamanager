/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.overview.nearMe.js - Controller for near me
 *
 * Author: Rikki Tissier
 */
;( function($, _) {
    "use strict";

    ips.controller.register('ips.core.map.googlemap', {
        initialize() {
            let mapData = this.scope.data().mapData;
            if (typeof mapData === 'string') {
                mapData = JSON.parse(mapData);
            }

            if ('key' in mapData) {
                this._mapData = mapData;
                ips.ui.map.afterGoogleMapsLoaded(() => this.setupGoogleMaps())
            }
        },

        setupGoogleMaps() {
            let position = { lat: this._mapData.lat, lng: this._mapData.long };
            let elem = this.scope.find('[data-role="mapContainer"]').get(0);
            let maptype = 'ROADMAP';
            if (this._mapData.maptype && window.google.maps.MapTypeId[this._mapData.maptype.toUpperCase()]) {
                maptype = this._mapData.maptype.toUpperCase();
            }

            let map = new window.google.maps.Map( elem, {
                center: position,
                zoom: this._mapData.zoom ? this._mapData.zoom * 8 : 15,
                scale: this._mapData.scale || undefined,
                mapTypeId: window.google.maps.MapTypeId[maptype.toUpperCase()]
            });

            let marker = new window.google.maps.Marker({
                position,
                map
            });
        }
    });
}(jQuery));
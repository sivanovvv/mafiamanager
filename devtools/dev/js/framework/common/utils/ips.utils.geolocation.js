/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.geolocation.js - Geolocation helper methods
 * 
 * Author: IPS
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.geolocation', function () {

        const permissions = {
            GRANTED: 'granted',
            DENIED: 'denied',
            PROMPT: 'prompt'
        },
        type = 'geolocation',

        /**
         * Checks geolocation is allowed asynchronously 
         * 
         * @returns {boolean|null}
         */
		getGeolocationIsAllowed = function () {

            if ( ! "geolocation" in navigator ) return false; 

            const permission = ips.utils.db.get( type, `permission.${ipsSettings.memberID}` );

            if ( permission == permissions.GRANTED ) return true;

            return false;          
        },

        /**
         * @function ips.utils.geolocation.setGeolocationIsAllowed
         * Set - user allowed location or not. 
         * 
         * @param {string}     status   Permission Status ('granted', 'denied', 'prompt')
         * @returns {void}
         */
        setGeolocationIsAllowed = function ( status ) {

            if ( ! Object.values( permissions ).includes( status ) ) return;

            ips.utils.db.set( type, `permission.${ipsSettings.memberID}`, status, false );
            
        },

        /** 
         * Gets the user coordinates asynchronously 
         * 
         * @returns {Promise<object>}    The coordinates
         */
        getCurrentPosition = function () {
            return new Promise( ( res, rej ) => {
                navigator.geolocation.getCurrentPosition( position => {
                    setGeolocationIsAllowed( permissions.GRANTED );
                    res( position.coords );
                }, error => {
                    if ( error.code == error.PERMISSION_DENIED ) {
                        setGeolocationIsAllowed( permissions.DENIED );
                    }
                    rej( error );
                });
            });
        },

        /** == INCOMPLETE ==
         *  Gets IP Address location asynchronously 
         * 
         * @returns {object}     The coordinates
         */ 
        generalLocation = function () {
            return new Promise( ( res, rej ) => {

                /* Check cache for guests first */
                if ( ! ipsSettings.memberID ) {
                    const ipLocation = ips.utils.db.get( type, `iplocation`);
                    if ( ipLocation ) {
                        res( ipLocation );
                    }
                }

                /* Fetch IP Location - TODO */
                res({
                    'latitude': 0,
                    'longitude': 0
                });
            });

        }

		return {
            getGeolocationIsAllowed,
            getCurrentPosition,
            setGeolocationIsAllowed,
            permissions
		};
	});

}(jQuery));
/**
 * Invision Community v4+
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.dataLayer.js - dataLayer support.
 *
 * Author: Matt Finger
 */
;( function($){
    "use strict";

    ips.controller.register('core.front.core.dataLayer', {
        eventHandlers: [],
        propertiesHandlers: [],

        initialize: function () {
            if ( this.verify() ) {
                // Subscribe our closure to handle events
                this.on('ipsDataLayer', this.handleEvent);

                // Subscribe our closure to handle properties
                this.on('ipsDataLayerProperties', this.handleProperties);

                this.setup();
                Debug.log( 'Pushing events to the dataLayer' );
            }
        },

        setup: function() {
            // Get our event handlers
            for ( let i in IpsDataLayerEventHandlers ) {
                let handler = IpsDataLayerEventHandlers[i];
                if ( handler instanceof Function ) {
                    try {
                        let callback = handler();
                        if ( callback instanceof Function ) {
                            this.eventHandlers.push( callback );
                        } else {
                            Debug.error( `Invalid Handler Callback Found: Returned value of type '${typeof (callback || undefined)}', expected a callback Function!` );
                        }
                    } catch (e) {
                        Debug.error(e);
                    }
                }
            }

            // Get our property handlers
            for ( let i in IpsDataLayerPropertiesHandlers ) {
                let handler = IpsDataLayerPropertiesHandlers[i];
                if ( handler instanceof Function ) {
                    try {
                        let callback = handler();
                        if ( callback instanceof Function ) {
                            this.propertiesHandlers.push( callback );
                        } else {
                            Debug.error( `Invalid Handler Callback Found: Returned value of type '${typeof (callback || undefined)}', expected a callback Function!` );
                        }
                    } catch (e) {
                        Debug.error(e);
                    }
                }
            }

            this.unsetOldUniqueKeys();

            // Our login/logout event. Delay slightly to prevent collisions with the handler's head script (events pushed to GTM before GTM is loaded might not be recognized properly)
            setTimeout( this.loginLogout.bind(this), 200 );

            //Events included in the page. Delay slightly to prevent collisions with the handler's head script (events pushed to GTM before GTM is loaded might not be recognized properly)
            setTimeout( this.handleInitialEvents.bind(this), 202 );

            // Some interactions (like downloading a file) need to be verified a second or so after they occur
            this.on( 'ipsDataLayerSync', ips.utils.debounce(this.remoteFetchEvents, 1000) );

            this.scope.find('[data-datalayer-postfetch]').on( 'click', function(e) {
                setTimeout( function() { $(e.currentTarget).trigger( 'ipsDataLayerSync' ); }, 1500 );
            } );
        },

        /**
         * Handle events
         *
         * @return  void
         */
        handleEvent: function(evt, event) {
            let Events = IpsDataLayerConfig._events;
            let Properties = IpsDataLayerConfig._properties;
            let PII = IpsDataLayerConfig._pii;

            // This method will do nothing if we don't recognize events OR have no handlers to use
            if (!Object.keys(Events).length || !this.eventHandlers.length) {
                return;
            }

            try {
                if (event._key && event._properties instanceof Object) {
                    // Make sure its enabled
                    if (!Events[event._key] || !Events[event._key].enabled) return;

                    // Check for duplicate keys
                    if (event._uniquekeys && event._uniquekeys instanceof Object) {
                        try {
                            let same = true;
                            let saved = ips.utils.db.get('ipsDataLayer', event._key) || {};
                            saved.exp = saved.exp || 0;
                            event._uniquekeys.exp = event._uniquekeys.exp || (Math.floor(Date.now() / 1000) + 300);

                            // If the saved keys to check are expired, this is not a duplicate
                            if ((saved.exp) <= Math.floor(Date.now() / 1000)) {
                                same = false;
                            }

                            // Not expired, compare each key
                            if (same) {
                                for (let savedKey in saved) {
                                    if (savedKey === 'exp') {
                                        continue;
                                    }
                                    if (saved[savedKey] !== event._uniquekeys[savedKey]) {
                                        same = false;
                                        break;
                                    }
                                }
                            }

                            // If this is the same as a previous one, update the expiration and stop processing
                            if (same) {
                                saved.exp = Math.max(event._uniquekeys.exp, saved.exp);
                                ips.utils.db.set('ipsDataLayer', event._key, saved, false);
                                return;
                            }

                            // Otherwise save now
                            ips.utils.db.set('ipsDataLayer', event._key, event._uniquekeys, false);
                        } catch (e) {
                            Debug.error(e);
                        }
                    }

                    // Create the event
                    let _event = {
                        '_key': Events[event._key].formatted_name,
                        '_properties': {}
                    };

                    // Go through all properties we know
                    for (let propertyKey in Properties) {

                        // We don't care if it's disabled or it has pii and pii is not allowed
                        let property = Properties[propertyKey];
                        if (property.enabled && !(!PII && property.pii)) {

                            // Skip if this property shouldn't be used with this event
                            let validForEvent = false;
                            for (let j in property.event_keys) {
                                let pattern = property.event_keys[j].replaceAll('*', '.*');
                                if (event._key.match(pattern)) {
                                    validForEvent = true;
                                    break;
                                }
                            }
                            if (!validForEvent) {
                                continue;
                            }

                            // What value should we use?
                            let formatted = property.formatted_name;
                            let value = '';

                            // This must be unique so we generate it client side to avoid using a cached key
                            if (propertyKey === 'ips_key') {
                                value = this.uniqueId();
                            } else if ( propertyKey in event._properties ) {
                                value = event._properties[propertyKey];
                            } else if (property.custom) {
                                value = (property.value === null || property.value === undefined) ? undefined : property.value;
                            } else if (propertyKey === 'ips_time') { // Add the time if needed
                                value = Math.floor(Date.now() / 1000);
                            } else if (IpsDataLayerContext[formatted]) {
                                value = IpsDataLayerContext[formatted];
                            } else {
                                value = property.default;
                            }

                            // Some shallow type-checking, set to undefined if its type isn't allowed
                            if (value !== null && value !== undefined) {
                                let types = property.type.toLowerCase().split(' ');
                                if (!types.includes('array') && types.some(type => type.endsWith('[]'))) {
                                    types.push('array');
                                }

                                if (types.includes('number')) {
                                    try {
                                        if (!isNaN(value)) {
                                            value = Number(value);
                                        }
                                    } catch (e) {
                                    }
                                }

                                // If this type an array but we got an empty object, there's a chance PHP JSON encoded an empty array as associative, so make it an empty array
                                if (typeof value === 'object' &&
                                    Object.keys(value).length === 0 &&
                                    Object.getPrototypeOf(value) === Object.prototype &&
                                    types.includes('array')) {
                                    value = [];
                                } else if (!( // If this is not instanceof array and arrays are allowed nor any other type specified, make it undefined
                                    (types.includes('array') && value instanceof Array) || types.includes(typeof value)
                                )) {
                                    Debug.error(`Invalid Data Layer Property Type: Event property "${propertyKey}" was overridden to undefined because it could not be cast from "${typeof value}" to an allowed type`);
                                    value = property.default !== null ? property.default : undefined;
                                }
                            } else {
                                value = property.default !== null ? property.default : undefined;
                            }

                            // Actually set the property
                            _event._properties[formatted] = value;
                        }
                    }

                    // Call each handler on this event
                    Debug.log('Pushing an event to the Data Layer Event Handlers');
                    Debug.log(_event)
                    for (let i in this.eventHandlers) {
                        try {
                            this.eventHandlers[i](_event);
                        } catch (e) {
                            Debug.error('Bad Data Layer Event Handler: An event handler failed to handle an event!');
                        }
                    }
                }
            } catch (e) {
                Debug.log(e);
            }
        },

        /**
         * Handle our properties using the callbacks
         *
         * @return Function
         */
        handleProperties: function(evt, event) {
            let Properties  = IpsDataLayerConfig._properties;
            let PII         = IpsDataLayerConfig._pii;

            if ( this.propertiesHandlers.length && event._properties instanceof Object) {
                let properties = {};
                for ( let propertyKey in event._properties ) {
                    let property = Properties[propertyKey];

                    // Filter out properties if we don't know them, the have to be tied to an event, or contain PII and pii is not allowed
                    if ( !( property || property === null ) || !property.enabled || !property.page_level || (!PII && property.pii) ) {
                        continue;
                    }

                    // Some shallow type-checking, set to undefined if its type isn't allowed
                    let value = event._properties[propertyKey];
                    if ( value !== null && value !== undefined ) {
                        let types = property.type.toLowerCase().split(' ');
                        if (!types.includes('array') && types.some(type => type.endsWith('[]'))) {
                            types.push('array');
                        }
                        if ( types.includes('number') ) {
                            try {
                                if ( !isNaN(value) ) {
                                    value = Number(value);
                                }
                            } catch (e) {}
                        }

                        // If this type an array but we got an empty object, there's a chance PHP JSON encoded an empty array as associative, so make it an empty array here
                        if (typeof value === 'object' &&
                            Object.keys(value).length === 0 &&
                            Object.getPrototypeOf(value) === Object.prototype &&
                            types.includes('array')) {
                            value = [];
                        } else if (!( // If this is not instanceof array and arrays are allowed nor any other type specified, make it undefined
                            (types.includes('array') && value instanceof Array) || types.includes(typeof value)
                        )) {
                            Debug.error(`Invalid Data Layer Property Type: Property "${propertyKey}" was overridden to undefined because it could not be cast from "${typeof value}" to an allowed type`);
                            value = property.default !== null ? property.default : undefined;
                        }
                    } else {
                        value = property.default !== null ? property.default : undefined;
                    }

                    properties[propertyKey] = value;
                }

                if ( Object.keys( properties ).length ) {
                    Debug.log( 'Pushing properties to the Data Layer Properties Handlers' );
                    Debug.log( properties );
                    for ( let i in this.propertiesHandlers ) {
                        try {
                            this.propertiesHandlers[i](properties);
                        } catch (e) {
                            Debug.error( 'Bad Data Layer Properties Handler: A properties handler failed to handle a collection (object) of properties' );
                        }
                    }
                }
            }
        },

        handleInitialEvents: function() {
            let self = this;
            IpsDataLayerEvents.forEach( function ( event ) {
                self.handleEvent( {}, event );
            } );
        },

        /**
         *  Verify the correct constants exist with the appropriate properties, does not validate them though
         */
        verify: function() {
            try {
                return (
                    // If these are const, then they will exist but not as a property of window
                    (!window.IpsDataLayerContext && IpsDataLayerContext) &&
                    (!window.IpsDataLayerConfig && IpsDataLayerConfig) &&
                    (!window.IpsDataLayerEventHandlers && IpsDataLayerEventHandlers) &&
                    (!window.IpsDataLayerPropertiesHandlers && IpsDataLayerPropertiesHandlers) &&
                    IpsDataLayerContext instanceof Object &&
                    IpsDataLayerEvents instanceof Array &&
                    IpsDataLayerEventHandlers instanceof Array &&
                    IpsDataLayerPropertiesHandlers instanceof Array &&
                    IpsDataLayerConfig instanceof Object &&
                    IpsDataLayerConfig._properties instanceof Object &&
                    IpsDataLayerConfig._events instanceof Object &&
                    IpsDataLayerConfig._pii !== undefined
                );
            } catch (e) {
                return false;
            }
        },

        /**
         * Add a login/logout event if needed. This checks local storage to see if they just logged in, or if they were just logged in
         */
        loginLogout: function() {
            // What is stored in local storage
            let stored = ips.utils.db.get( 'ipsDataLayer', 'login' ) || {};

            if ( ipsSettings.memberID ) {
                // If this is 0, not null, we know the current use viewed a page as a guest
                if ( stored.logged_in === 0 ) {
                    this.scope.trigger('ipsDataLayer', { _key: 'account_login', _properties: {} });
                }

                // Flag they visited logged in
                ips.utils.db.set( 'ipsDataLayer', 'login', {logged_in : 1}, false )
            } else {
                // If this is 1, we know they viewed a page as a logged in member
                if ( stored.logged_in === 1 ) {
                    this.scope.trigger('ipsDataLayer', {_key: 'account_logout', _properties: {} });
                }

                // Flag they visited logged out
                ips.utils.db.set( 'ipsDataLayer', 'login', {logged_in: 0}, false );
            }
        },

        /**
         * Create a pseudo-random (practically unique) id similar to php's uniqueid() method
         */
        uniqueId: function() {
            let s = i => {
                return Math.floor((1 + Math.random()) * Math.pow(16, i))
                    .toString(16)
                    .substring(1);
            };

            let time = Date.now();
            let sec = Math.floor(time / 1000);
            let secString = sec.toString(16);
            secString = secString.substring( secString.length - 8 );
            let ms  = ( time - ( sec * 1000 ) ) * 1000; // micro
            let msString = (ms + 0x100000).toString(16).substring(1);

            return secString + msString + s(1) + '.' + s(4) + s(4);
        },

        /**
         * Unsets the out-dated event keys so they don't remain in persistent user storage indefinitely
         */
        unsetOldUniqueKeys: function() {
            let Events = IpsDataLayerConfig._events;
            for( let eventKey in Events ) {
                let saved = ips.utils.db.get('ipsDataLayer', eventKey) || {};
                if ( Object.keys(saved).length ) {
                    Debug.log( `Found stored unique keys for the event '${eventKey}'` );
                    Debug.log( saved );

                    if ( !saved.exp || saved.exp <= (Date.now() / 1000) ) {
                        Debug.log( `Removing expired stored unique keys for the event '${eventKey}'` );
                        ips.utils.db.set('ipsDataLayer', eventKey, 0, false);
                    }
                }
            }
        },

        /**
         * Get events from the ajax endpoint
         */
        remoteFetchEvents: function() {
            let self = this;
            ips.getAjax()( '?app=core&module=system&controller=ajax&do=getDataLayerEvents')
                .done( function(response) {
                    for ( let i in response ) {
                        self.handleEvent( {}, response[i] );
                    }
                } );
        },

    });
}(jQuery));
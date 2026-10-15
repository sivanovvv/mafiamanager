;(function ($, _) {
    "use strict";

    /**
     * @module ips.utils.broadcastChannel
     *
     * Module for handling broadcast channels
     */
    ips.createModule('ips.utils.broadcastChannel', () => {
        const channel = 'BroadcastChannel' in window ? new window.BroadcastChannel("ipsBroadcastChannel") : undefined;
        return {
            channel: channel,
            enabled: 'BroadcastChannel' in window
        }
    })
})(jQuery);
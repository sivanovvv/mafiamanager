/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.topic.activity.js - Topic activity controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('forums.front.topic.activity', {

		initialize: function () {
            this.on('click', '[data-action="toggleOverview"]', this.toggleOverview );
        },
        
        toggleOverview: function (e) {
            this.scope.toggleClass('cTopicOverview--expanded');
        }
	});
}(jQuery));
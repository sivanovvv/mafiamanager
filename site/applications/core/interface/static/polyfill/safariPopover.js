/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * This polyfill is used to fix numerous popover quirks in Safari
 * 
 * Author: Ehren Harber
 */

// #1. Store the trigger as a property since Safari doesn't support e.source. Last checked in 26.1
// #2. Fix a bug where the browser freezes when an input in a popover gains/loses focus. Fixed in 18.4
// #3. Fix a bug where popovers aren't light-dismissed on iOS and iPadOS. Fixed in 18.3
// #4. Fix a bug where popovertarget buttons fail inside forms. Fixed in 18.2

// Toggle popover using API (1, 2)
document.addEventListener("click", safariTogglePopoverFix);

function safariTogglePopoverFix(e){
	// Get trigger (1, 2)
	const trigger = e.target.closest("[popovertarget]");
	if(!trigger) return;
	// Get popover (1, 2)
	const popoverEl = document.querySelector(`#${trigger.getAttribute("popovertarget")}`);
	if(!popoverEl) return;
	// Safari doesn't support e.source, so we need to manually add it as a property so we can reference it later (1)
	popoverEl.safariTrigger = trigger;
	if(
		// Target 18.3 and below (2)
		(!CSS.supports("selector(::details-content)") && popoverEl.querySelector('input:not([type="radio"], [type="checkbox"]), select'))
		||
		// Target 18.1 and below (4)
		(!CSS.supports("text-box-edge: auto") && trigger.closest("form"))
	){
		e.preventDefault();
		popoverEl[`${trigger.popoverTargetAction || "toggle"}Popover`]({source:trigger});
	}
}
// Fixes light-dismiss (3). There's no conditional for <18.3, so we just target 18.3 and below.
if(!CSS.supports("selector(::details-content)")){
	document.addEventListener("pointerdown", e => {});
}
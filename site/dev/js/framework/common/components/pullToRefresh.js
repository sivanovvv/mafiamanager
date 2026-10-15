class IPullToRefresh extends HTMLElement {

	constructor () {
		super();
	}

	connectedCallback(){
		this.dragDistance = 150;
		this.swipeObserver.observe(this);
	}

	// Handle scroll event
	handleEvent(e){
		requestAnimationFrame(() => {
			this.style.setProperty("--_scroll", (window.scrollY > 0) ? 0 : window.scrollY);
			if(window.scrollY < this.dragDistance * -1){
				document.removeEventListener("scroll", this);
				document.documentElement.setAttribute("data-ips-pwa-refreshing", "");
				// The timeout gives iOS a moment to smoothly apply the animation before reloading
				setTimeout(() => {
					location.reload();
				}, 16);
			}
		});
	}

	// Tweak the dragDistance value to ensure landscape iPhones can be refreshed
	setDragDistance(){
		this.dragDistance = Math.min(150, window.innerHeight * 0.25);
		this.style.setProperty("--_limit", this.dragDistance);
	}

	// IntersectionObserver removes the scroll event when the i-pull-to-refresh element isn't in the viewport
    swipeObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                document.addEventListener("scroll", this);
				this.setDragDistance();
            } else {
				document.removeEventListener("scroll", this);
			}
        });
    }, {
        threshold: .1
    })
}
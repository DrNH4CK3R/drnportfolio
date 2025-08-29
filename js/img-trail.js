{
    // body element
    const body = document.body;
    const hero = document.querySelector('.hero');

    // helper functions
    const MathUtils = {
        // linear interpolation
        lerp: (a, b, n) => (1 - n) * a + n * b,
        // distance between two points
        distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
    }

    // get the mouse position
    const getMousePos = (ev) => {
        let posx = 0;
        let posy = 0;
        if (!ev) ev = window.event;
        if (ev.pageX || ev.pageY) {
            posx = ev.pageX;
            posy = ev.pageY;
        }
        else if (ev.clientX || ev.clientY) {
            posx = ev.clientX + body.scrollLeft + document.documentElement.scrollLeft;
            posy = ev.clientY + body.scrollTop + document.documentElement.scrollTop;
        }
        return { x: posx, y: posy };
    }

    // mousePos: current mouse position
    // cacheMousePos: previous mouse position
    // lastMousePos: last recorded mouse position (at the time the last image was shown)
    let mousePos = lastMousePos = cacheMousePos = { x: 0, y: 0 };
    let isMouseOverHero = false;
    let isInitialized = false; // Flag to check for the first mouse movement

    // update the mouse position
    hero.addEventListener('mouseenter', () => {
        isMouseOverHero = true;
        lastMousePos = mousePos;
    });
    hero.addEventListener('mouseleave', () => isMouseOverHero = false);
    window.addEventListener('mousemove', ev => {
        // We always want to know the current mouse position
        mousePos = getMousePos(ev);

        // This block of code will only run ONCE, on the very first mouse move
        if (!isInitialized) {
            isInitialized = true; // Set flag to true so it doesn't run again

            // Sync the "last" position to the current position to start with a distance of 0
            lastMousePos = mousePos;

            // Manually check if the first mouse position is inside the hero section
            const heroRect = hero.getBoundingClientRect();
            if (
                ev.clientX >= heroRect.left &&
                ev.clientX <= heroRect.right &&
                ev.clientY >= heroRect.top &&
                ev.clientY <= heroRect.bottom
            ) {
                isMouseOverHero = true;
            }
        }
    });

    // gets the distance from the current mouse position to the last recorded mouse position
    const getMouseDistance = () => MathUtils.distance(mousePos.x, mousePos.y, lastMousePos.x, lastMousePos.y);

    class Image {
        constructor(el) {
            this.DOM = { el: el };
            // image default styles
            this.defaultStyle = {
                x: 0,
                y: 0,
                opacity: 0
            };
            // get sizes/position
            this.getRect();
            // init/bind events
            this.initEvents();
        }
        initEvents() {
            // on resize get updated sizes/position
            window.addEventListener('resize', () => this.resize());
        }
        resize() {
            // reset styles
            TweenMax.set(this.DOM.el, this.defaultStyle);
            // get sizes/position
            this.getRect();
        }
        getRect() {
            this.rect = this.DOM.el.getBoundingClientRect();
        }
        isActive() {
            // check if image is animating or if it's visible
            return TweenMax.isTweening(this.DOM.el) || this.DOM.el.style.opacity != 0;
        }
    }

    class ImageTrail {
        constructor() {
            // images container
            this.DOM = { content: document.querySelector('.content') };
            // array of Image objs, one per image element
            this.images = [];
            [...this.DOM.content.querySelectorAll('img')].forEach(img => this.images.push(new Image(img)));
            // total number of images
            this.imagesTotal = this.images.length;
            // upcoming image index
            this.imgPosition = 0;
            // zIndex value to apply to the upcoming image
            this.zIndexVal = 1;
            // mouse distance required to show the next image
            this.threshold = 100;
            // render the images
            requestAnimationFrame(() => this.render());
        }
        render() {
            // get distance between the current mouse position and the position of the previous image
            let distance = getMouseDistance();
            // cache previous mouse position
            cacheMousePos.x = MathUtils.lerp(cacheMousePos.x || mousePos.x, mousePos.x, 0.1);
            cacheMousePos.y = MathUtils.lerp(cacheMousePos.y || mousePos.y, mousePos.y, 0.1);

            // if the mouse moved more than [this.threshold] and is inside the hero section then show the next image
            if (distance > this.threshold && isMouseOverHero) {
                this.showNextImage();

                ++this.zIndexVal;
                this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;

                lastMousePos = mousePos;
            }

            // check when mousemove stops and all images are inactive (not visible and not animating)
            let isIdle = true;
            for (let img of this.images) {
                if (img.isActive()) {
                    isIdle = false;
                    break;
                }
            }
            // reset z-index initial value
            if (isIdle && this.zIndexVal !== 1) {
                this.zIndexVal = 1;
            }

            // loop..
            requestAnimationFrame(() => this.render());
        }
        showNextImage() {
            // show image at position [this.imgPosition]
            const img = this.images[this.imgPosition];
            // kill any tween on the image
            TweenMax.killTweensOf(img.DOM.el);

            new TimelineMax()
                // show the image
                .set(img.DOM.el, {
                    startAt: { opacity: 0 },
                    opacity: 1,
                    scale: 1,
                    zIndex: this.zIndexVal,
                    x: cacheMousePos.x - img.rect.width / 2,
                    y: cacheMousePos.y - img.rect.height / 2
                }, 0)
                // animate position
                .to(img.DOM.el, 1.8, {
                    ease: Expo.easeOut,
                    x: mousePos.x - img.rect.width / 2,
                    y: mousePos.y - img.rect.height / 2
                }, 0)
                // then make it disappear
                .to(img.DOM.el, 0.8, {
                    ease: Power1.easeOut,
                    opacity: 0
                }, 0.8)
                // scale down the image
                .to(img.DOM.el, 0.8, {
                    ease: Quint.easeInOut,
                    scale: 2
                }, 0.8);
        }
    }

    /***********************************/
    /********** Preload stuff **********/

    // Preload images
    const preloadImages = () => {
        return new Promise((resolve, reject) => {
            imagesLoaded(document.querySelectorAll('.content__img'), resolve);
        });
    };

    // And then..
    preloadImages().then(() => {
        // Remove the loader
        document.body.classList.remove('loading');
        new ImageTrail();
    });
}

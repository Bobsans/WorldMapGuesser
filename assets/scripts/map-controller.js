import SvgPanZoom from 'svg-pan-zoom';
import {secondsToTime, shuffle} from '@/scripts/utils';
import countries from '@/data/countries';

export default class MapController {
    constructor(selector, controls) {
        this.svg = MapController.createSVG();
        this.controls = document.querySelector(controls);

        document.querySelector(selector).appendChild(this.svg);

        this.initPanAndZoom();
        this.dragging = false;

        this.bindEvents();
    }

    get current() {
        return countries[this.currentId];
    }

    static createSVG() {
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttributeNS(null, 'viewBox', '0 0 1009.6727 665.96301');
        for (let data of Object.values(countries)) {
            data.element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            data.element.setAttributeNS(null, 'd', data.path);
            svg.appendChild(data.element);
        }
        return svg;
    }

    initPanAndZoom() {
        return SvgPanZoom(this.svg, {
            minZoom: 1,
            maxZoom: 30,
            zoomScaleSensitivity: 0.5,
            fit: true,
            center: true,
            dblClickZoomEnabled: false,
            beforePan(oldPan, newPan) {
                let sizes = this.getSizes();
                let gutterWidth = sizes.width * 0.5;
                let gutterHeight = sizes.height * 0.5;
                let leftLimit = -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) + gutterWidth;
                let rightLimit = sizes.width - gutterWidth - (sizes.viewBox.x * sizes.realZoom);
                let topLimit = -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) + gutterHeight;
                let bottomLimit = sizes.height - gutterHeight - (sizes.viewBox.y * sizes.realZoom);

                return {
                    x: Math.max(leftLimit, Math.min(rightLimit, newPan.x)),
                    y: Math.max(topLimit, Math.min(bottomLimit, newPan.y))
                };
            },
            onPan: () => {
                this.dragging = true;
            }
        });
    }

    bindEvents() {
        this.svg.addEventListener('click', (e) => {
            let el = e.target;
            if (el instanceof SVGPathElement && !this.dragging) {
                if (el === this.current.element) {
                    this.rightClick();
                } else {
                    this.wrongClick();
                }
            }
            this.dragging = false;
        });

        this.controls.querySelector('.country-selector .prev').addEventListener('click', () => this.prevCountry());
        this.controls.querySelector('.country-selector .next').addEventListener('click', () => this.nextCountry());

        this.controls.querySelector('.start-panel .button').addEventListener('click', () => this.start());
    }

    start() {
        this.reset();
        this.controls.querySelector('.start-panel .button').style.display = 'none';
        this.controls.querySelector('.country-selector').style.display = '';
        this.controls.querySelector('.details').style.display = '';
        this.timeHandle = setInterval(() => {
            this.time += 1;
            this.controls.querySelector('.details .time').innerText = secondsToTime(this.time);
        }, 1000);
    }

    reset() {
        this.countryKeys = shuffle(Object.keys(countries));
        this.currentId = this.countryKeys[0];
        this.controls.querySelector('.country-selector .current').innerText = this.current.name;
        this.suggessed = [];
        this.controls.querySelector('.details .score').innerText = `${this.suggessed.length}/${Object.keys(countries).length}`;
        this.time = 0;
        this.controls.querySelector('.details .time').innerText = secondsToTime(this.time);
        clearInterval(this.timeHandle);
    }

    rightClick() {
        this.svg.firstChild.appendChild(this.current.element);
        this.current.element.classList.add('success');
        this.suggessed.push(this.currentId);
        this.nextCountry(true);
    }

    wrongClick() {
        this.current.element.classList.add('error');
    }

    prevCountry() {
        let idx = this.countryKeys.indexOf(this.currentId);
        this.currentId = this.countryKeys[idx - 1 < 0 ? this.countryKeys.length : idx - 1];
        this.controls.querySelector('.country-selector .current').innerText = this.current.name;
    }

    nextCountry(deletePrev = false) {
        let idx = this.countryKeys.indexOf(this.currentId);
        this.currentId = this.countryKeys[idx + 1 > this.countryKeys.length - 1 ? 0 : idx + 1];
        this.controls.querySelector('.country-selector .current').innerText = this.current.name;
        if (deletePrev) {
            this.countryKeys.splice(idx, 1);
        }
        this.controls.querySelector('.details .score').innerText = `${this.suggessed.length}/${Object.keys(countries).length}`;
    }

    loose() {
        clearInterval(this.timeHandle);
    }

    win() {

    }
}

<template>
    <svg ref="svg" viewBox="0 0 1009.6727 665.96301" class="map">
        <g>
            <path v-for="item in countries" :key="item.id" :d="item.path" :class="pathClass(item)" @click="onPathClick(item)"></path>
        </g>
    </svg>
</template>

<script>
    import SvgPanZoom from 'svg-pan-zoom';
    import countries from '@/data/countries';

    export default {
        name: 'Map',
        props: {
            ids: {type: Array, default: () => []},
            rights: {type: Array, default: () => []},
            wrongs: {type: Array, default: () => []}
        },
        data() {
            return {
                panning: false,
                drawOrder: []
            };
        },
        computed: {
            countries() {
                return this.drawOrder.map((id) => ({id, ...countries[id]}));
            }
        },
        watch: {
            ids(nv, ov) {
                if (Array.isArray(nv) && nv !== ov) {
                    this.drawOrder = [...nv];
                }
            }
        },
        methods: {
            // HELPERS
            pathClass({id}) {
                return {right: this.rights.includes(id), wrong: this.wrongs.includes(id)};
            },

            // EVENTS
            onPathClick(item) {
                if (!this.panning && !this.rights.includes(item.id) && !this.wrongs.includes(item.id)) {
                    this.$bus.$emit('map-click', item);
                }
                this.panning = false;
            },
            changeDrawOrder(id) {
                this.drawOrder.push(...this.drawOrder.splice(this.drawOrder.indexOf(id), 1));
            }
        },
        mounted() {
            SvgPanZoom(this.$refs.svg, {
                minZoom: 1,
                maxZoom: 100,
                zoomScaleSensitivity: 0.5,
                preventMouseEventsDefault: true,
                contain: true,
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
                    this.panning = true;
                }
            });

            this.$bus.$on('change-draw-order', this.changeDrawOrder);
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    .map {
        width: 100%;
        height: 100%;
        background: @light-blue;
        vertical-align: top;

        path {
            stroke: @white;
            fill: @white;
            stroke-width: 1px;
            vector-effect: non-scaling-stroke;

            &.right {
                fill: @light-green;
                stroke: darken(@light-green, 20%);
            }

            &.wrong {
                fill: @light-red;
                stroke: darken(@light-red, 20%);
            }
        }
    }
</style>

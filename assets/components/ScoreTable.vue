<template>
    <div class="score-table" v-if="data.length">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Map</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, idx) in data" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td>{{ item.user }}</td>
                    <td>{{ item.result }}</td>
                    <td>{{ item.time | secondsToTime }}</td>
                    <td class="view-map" @click="viewResultMap(item)"></td>
                </tr>
            </tbody>
        </table>

        <modal class="big preview" v-if="preview.show" @close="preview.show = false">
            <world-map :ids="ids" :rights="preview.data.rights" :wrongs="preview.data.wrongs" preview-mode/>
            <div class="info">
                <div>Position: <span>{{ preview.data.position }}</span></div>
                <div>User: <span>{{ preview.data.user }}</span></div>
                <div>Result: <span>{{ preview.data.result }}</span></div>
                <div>Time: <span>{{ preview.data.time | secondsToTime }}</span></div>
            </div>
        </modal>
    </div>
</template>

<script>
    import {secondsToTime} from '@/scripts/utils';
    import countries from '@/data/countries';
    import Modal from '@/components/Modal';
    import WorldMap from '@/components/WorldMap';

    export default {
        name: 'ScoreTable',
        components: {WorldMap, Modal},
        filters: {secondsToTime},
        data() {
            return {
                data: [],
                preview: {
                    show: false,
                    data: {}
                }
            };
        },
        computed: {
            countries() {
                return countries;
            },
            ids() {
                return Object.keys(countries);
            }
        },
        methods: {
            viewResultMap(item) {
                this.preview.data = {...item, position: this.data.indexOf(item) + 1};
                this.preview.show = true;
            }
        },
        async mounted() {
            this.data = await (await fetch(`${location.href.trim('/')}/get-top`)).json();
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    .score-table {
        table {
            min-width: 100%;
            margin: 20px auto 0;
            padding: 10px;
            border-collapse: collapse;

            tr {
                td, th {
                    border-bottom: @default-border;
                    text-align: center;
                    padding: 5px 0;
                }

                &:last-child {
                    td {
                        border-bottom: none;
                    }
                }

                .view-map {
                    width: 10%;
                    background: url('@{image-path}/search.svg') no-repeat center;
                    background-size: 15px;
                    cursor: pointer;
                }
            }
        }

        .preview {
            overflow: hidden;

            .modal {
                height: 70%;

                .body {
                    position: relative;
                    display: grid;
                    height: 100%;

                    .info {
                        position: absolute;
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        background: @white;
                        border-radius: @default-border-radius;
                        box-shadow: @default-shadow;
                        width: 80%;
                        bottom: -62px;
                        left: 50%;
                        transform: translateX(-50%);

                        > div {
                            text-align: center;
                            padding: 10px;

                            span {
                                display: block;
                                font-size: 32px;
                            }
                        }
                    }
                }
            }
        }
    }
</style>

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
            <world-map :ids="ids" :rights="preview.rights" :wrongs="preview.wrongs" preview-mode/>
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
                    rights: [],
                    wrongs: []
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
                this.preview.rights = item.rights;
                this.preview.wrongs = item.wrongs;
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
                    display: grid;
                    height: 100%;
                }
            }
        }
    }
</style>

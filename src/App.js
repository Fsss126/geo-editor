import React, {Component} from 'react';
import $ from 'jquery';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import shp from 'shpjs';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'tokml';
import shpwrite from 'shp-write';
import * as turf from '@turf/turf';
import _ from 'lodash';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import geojson2svg from 'geojson-to-svg';
import {SortableContainer, SortableElement, arrayMove} from 'react-sortable-hoc';
import { ChromePicker } from 'react-color';

const FEATURE_PROPERTIES = {
    circle: {
        "circle-color": "color",
        "circle-radius": "number",
        "circle-opacity": "number"
    },
    line: {
        "stroke": "color",
        "stroke-width": "number",
        "stroke-opacity": "number"
    },
    polygon: {
        "stroke": "color",
        "stroke-width": "number",
        "stroke-opacity": "number",
        "fill": "color",
        "fill-opacity": "number"
    }
};

$.fn.hasAncestor = function(a) {
    return $(this).parents(a).length === 1;
};

function Button(props) {
    return (
        <span className={props.className ? "btn " + props.className : "btn"}
              data-balloon={props.tooltipData}
              data-balloon-pos={props.tooltipPos}
              onClick={props.callback}>
            {props.children}
        </span>
    );
}

class LayerControl extends Component {
    switchVisibility = () => {
        this.props.layer.visible = !this.props.layer.visible;
        this.props.setVisibility(this.props.layer, this.props.layer.visible);
        this.forceUpdate();
    };

    select = (e) => {
        if (!($(e.target).hasAncestor('.btn') || $(e.target).hasClass('btn')))
        {
            this.props.selectCallback(this.props.layer);
        }
    };

    render() {
        let getDownloadCallback = (extension) => {
            return () => {
                this.props.downloadCallback(this.props.layer, extension);
            }
        };
        if (!this.props.layer.editing) {
            return (
                <div className="row layer"
                     onClick={this.select}>
                    <div className="col">
                        <Button className="visibility-btn"
                                tooltipData={this.props.layer.visible ? 'Hide layer' : 'Show layer'}
                                tooltipPos="right"
                                callback={this.switchVisibility}>
                            <i className="material-icons">
                                {this.props.layer.visible ? 'visibility' : 'visibility_off'}
                            </i>
                        </Button>
                        <span className="title">{this.props.layer.name}</span>
                    </div>
                    <div className="col-auto control-btns">
                        {this.props.selected ? <span className="mode"/> : ''}
                        <Button tooltipData="Navigate to layer"
                                tooltipPos="left"
                                callback={() => {
                                    if (this.props.layer.data.features.length > 0) {
                                        console.log('fly to');
                                        this.props.map.fitBounds(turf.bbox(this.props.layer.data), { animate: true, padding: 15, duration: 500 });
                                    }
                                }}>
                            <i className="material-icons">
                                location_searching
                            </i>
                        </Button>
                        <Button tooltipData="Edit layer"
                                tooltipPos="left"
                                callback={() => {
                                    this.props.editCallback(this.props.layer);
                                }}>
                            <i className="material-icons">edit</i>
                        </Button>
                        <Button tooltipData="Edit layer"
                                tooltipPos="left"
                                callback={() => {
                                    this.props.deleteCallback(this.props.layer);
                                }}>
                            <i className="material-icons">delete</i>
                        </Button>
                        <Button className="dropdown-btn"
                                tooltipData="Download as file"
                                tooltipPos="left"
                                callback={(e) => {
                                    if (!$(e.target).hasAncestor('.dropdown')) {
                                        $('.show-dropdown').removeClass('show-dropdown');
                                        $(e.currentTarget).toggleClass('show-dropdown');
                                    }}}>
                            <i className="fas fa-file-download"/>
                            <div className="dropdown">
                                Download as
                                <div onClick={getDownloadCallback('geojson')}>GeoJSON</div>
                                <div onClick={getDownloadCallback('kml')}>KML</div>
                                <div onClick={getDownloadCallback('zip')}>Shapefile</div>
                            </div>
                        </Button>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="row layer editing"
                     onClick={this.select}>
                    <div className="col">
                        <Button className="visibility-btn"
                                tooltipData={this.props.layer.visible ? 'Hide layer' : 'Show layer'}
                                tooltipPos="right"
                                callback={this.switchVisibility}>
                            <i className="material-icons">
                                {this.props.layer.visible ? 'visibility' : 'visibility_off'}
                            </i>
                        </Button>
                        <input value={this.props.layer.name} onChange={(e) => {
                            this.props.layer.name = e.target.value;
                            this.forceUpdate();
                        }}/>
                    </div>
                    <div className="col-auto control-btns">
                        <span className="mode">editing</span>
                        <Button tooltipData="Save changes"
                                tooltipPos="left"
                                callback={() => {
                                    this.props.saveChanges(this.props.layer);
                                }}>
                            <i className="material-icons">done</i>
                        </Button>
                        <Button tooltipData="Cancel"
                                tooltipPos="left"
                                callback={() => {
                                    this.props.discardChanges(this.props.layer);
                                }}>
                            <i className="material-icons">close</i>
                        </Button>
                    </div>
                </div>
            )
        }
    }
}

const SortableLayer = SortableElement(props => <LayerControl {...props}/>);

const LayersList = SortableContainer(props => {
    return (
        <div className={props.editedLayer ? "layers container-fluid editing" : "layers container-fluid"}>
            {props.layers.map((layer, index) => (
                <SortableLayer key={`item-${index}`} index={index} {...{
                    ...props.layerCallbacks,
                    map: props.map,
                    layer: layer,
                    selected: props.selectedLayer ? layer.id === props.selectedLayer.id : null
                }}/>
            ))}
        </div>
    );
});

class ColorPicker extends Component {
    state = {
      visible: false
    };

    onChange = color => {
        this.props.onChange({
            target: {
                name: this.props.name,
                value: color.hex
            }
        })
    };

    render() {
        return (
            <div className="color-preview"
                 onClick={event => {
                     if ($(event.target).hasClass('color-preview'))
                         this.setState(prevState => ({visible: !prevState.visible}));
                 }}
                 style={{background: this.props.color ? this.props.color :
                 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==) left center'}}>
                <div className={this.state.visible ? "picker visible" : "picker"}>
                    <ChromePicker color={this.props.color} onChange={this.onChange}/>
                </div>
            </div>
        );
    }
}

class FeaturePropertiesPopup extends Component {
    constructor(props) {
        super(props);
        this.feature = null
    }

    componentDidUpdate(prevProps) {
        if (prevProps.feature !== this.props.feature) {
            console.log('change feature');
            this.feature = this.props.feature;
            this.forceUpdate();
        }
    }

    onChange = e => {
      this.feature.properties[e.target.name] = e.target.value;
      this.forceUpdate();
    };

    saveChanges = () => {
        let featureLayer = _.find(this.props.layers, layer => layer.id === this.props.feature.source);
        console.log(featureLayer, this.feature.geometry);
        let sourceFeature = _.find(featureLayer.data.features, feature => feature.id === this.feature.id);
        console.log(sourceFeature);
        sourceFeature.properties = this.feature.properties;
        this.props.map.getSource(featureLayer.id).setData(featureLayer.data);
    };

    render() {
        console.log(this.feature);
        let feature = this.feature;
        if (!feature)
            return (
                <div className="feature-properties-popup"/>
            );
        let featureType = null;
        switch(feature.geometry.type) {
            case 'Polygon':
                featureType = 'polygon';
                break;
            case 'MultiPolygon':
                featureType = 'polygon';
                break;
            case 'Point':
                featureType = 'circle';
                break;
            case 'MultiPoint':
                featureType = 'circle';
                break;
            case 'LineString':
                featureType = 'line';
                break;
            case 'MultiLineString':
                featureType = 'line';
                break;
        }
        console.log(feature.properties);
        let properties = FEATURE_PROPERTIES[featureType];
        let removeProp = (key) => {
            return () => {
                delete this.feature.properties[key];
                this.forceUpdate();
            };
        };
        return (
            <div className={feature ? "feature-properties-popup visible container" : "feature-properties-popup container"}>
                <Button className="close-btn"
                        callback={this.props.close}>
                    <i className="material-icons">close</i>
                </Button>
                {_.map(properties, (value, key) => (
                    <div className="row" key={key}>
                        <div className="col">
                            <span>{key}</span>
                            <i className="material-icons remove-btn" onClick={removeProp(key)}>remove</i>
                        </div>
                        <div className="col">
                            {
                                value === 'color' ?
                                    <ColorPicker color={feature.properties[key] ? feature.properties[key] : ''}
                                                 name={key}
                                                 onChange={this.onChange}/> :
                                    <input name={key}
                                           type={value}
                                           value={feature.properties[key] ? feature.properties[key] : ''}
                                           onChange={this.onChange}/>
                            }
                        </div>
                    </div>
                ))}
                {_.reduce(feature.properties, (result, value, key) => {
                    if (_.indexOf(_.keysIn(properties), key) === -1)
                        result.push(
                            <div className="row" key={key}>
                                <div className="col">
                                    <span>{key}</span>
                                    <i className="material-icons remove-btn" onClick={removeProp(key)}>remove</i>
                                </div>
                                <div className="col">
                                    <input name={key}
                                           type="text"
                                           value={value}
                                           onChange={this.onChange}/>
                                </div>
                            </div>
                        );
                    return result;
                }, [])}
                <div className="row d-flex justify-content-center">
                    {/*<i className="material-icons">add_circle</i>*/}
                    <div className="col-auto">
                        <div className="text-btn" onClick={this.saveChanges}>
                            Save
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        this.layers = [];
        this.layersIndex = 0;
        this.map = null;
        this.draw = null;
        this.downloadFile = null;
        this.selectedLayer = null;
        this.editedLayer = null;
        this.selectedFeature = null;
    }

    componentDidMount() {
        mapboxgl.accessToken = 'pk.eyJ1IjoiYmJhbGJhdHJvc3MiLCJhIjoiY2pub2RwanMwMmdoZjNrb3NuMzhvZXAzOCJ9.F8VzBUbUv6_NOVZgcWrhqQ';
        let map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v9',
            // maxBounds: [
            //     [-180, -90], // Southwest coordinates
            //     [180, 90]  // Northeast coordinates
            // ]
        });
        map.addControl(new mapboxgl.NavigationControl());
        // let draw = new MapboxDraw();
        // map.addControl(draw);
        map.on('load', function () {
            // map.addLayer({
            //     'id': 'wms-test-layer',
            //     'type': 'raster',
            //     'source': {
            //         'type': 'raster',
            //         'tiles': [
            //             'https://services.sentinel-hub.com/ogc/wms/b7b5e3ef-5a40-4e2a-9fd3-75ca2b81cb32?showLogo=false&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=1_NATURAL_COL0R&'
            //             // 'https://geodata.state.nj.us/imagerywms/Natural2015?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Natural2015'
            //         ],
            //         'tileSize': 256
            //     },
            //     'paint': {}
            // }, 'aeroway-taxiway');
        });
        map.on('contextmenu', e => {
            let layersIds = this.layers.map(layer => layer.id);
            let feature = this.map.queryRenderedFeatures(e.point, {
                layers: _.reduce(this.map.getStyle().layers, (result, layer) => {
                    if (_.indexOf(layersIds, layer.source) !== -1)
                        result.push(layer.id);
                    return result;
                }, [])
            })[0];
            if (!feature)
                return;
            map.getCanvas().style.cursor = 'pointer';
            this.selectedFeature = feature;
            this.forceUpdate();
        });
        this.map = map;
        $('.controls').click(function(e) {
            if (!($(e.target).hasAncestor('.dropdown-btn') || $(e.target).hasClass('dropdown-btn'))) {
                $('.show-dropdown').removeClass('show-dropdown');
            }
        });
    }

    setLayerVisibility = (layer, visibility) => {
        console.log(layer, visibility);
        if (!visibility) {
            this.map.setLayoutProperty(layer.id+'fill', 'visibility', 'none');
            this.map.setLayoutProperty(layer.id+'fill-stroke', 'visibility', 'none');
            this.map.setLayoutProperty(layer.id+'circle', 'visibility', 'none');
            this.map.setLayoutProperty(layer.id+'line', 'visibility', 'none');
        } else {
            this.map.setLayoutProperty(layer.id+'fill', 'visibility', 'visible');
            this.map.setLayoutProperty(layer.id+'fill-stroke', 'visibility', 'visible');
            this.map.setLayoutProperty(layer.id+'circle', 'visibility', 'visible');
            this.map.setLayoutProperty(layer.id+'line', 'visibility', 'visible');
        }
    };

    removeLayer = (layer) => {
        this.map.removeLayer(layer.id+'fill');
        this.map.removeLayer(layer.id+'fill-stroke');
        this.map.removeLayer(layer.id+'circle');
        this.map.removeLayer(layer.id+'line');
        this.map.removeSource(layer.id);
        _.remove(this.layers, l => l.id === layer.id);
        this.forceUpdate();
    };

    editLayer = (layer) => {
        this.editedLayer = this.selectedLayer = _.cloneDeep(layer);
        layer.editing = true;
        this.selectedLayer = layer;
        if (this.draw) {
            this.draw.set(layer.data);
        }
        else {
            this.draw = new MapboxDraw();
            this.map.addControl(this.draw);
            this.map.on('draw.create', this.updateLayer);
            this.map.on('draw.update', this.updateLayer);
            this.draw.add(layer.data);
        }
        this.setLayerVisibility(layer, false);
        this.forceUpdate();
    };

    updateLayer = () => {
        this.selectedLayer.data = this.draw.getAll();
        this.forceUpdate();
    };

    saveChanges = (layer) => {
        layer.editing = false;
        this.map.getSource(layer.id).setData(this.assignIds(layer.data));
        this.map.off('draw.create', this.updateLayer);
        this.map.off('draw.update', this.updateLayer);
        this.map.removeControl(this.draw);
        this.draw = null;
        this.editedLayer = null;
        this.setLayerVisibility(layer, true);
        this.forceUpdate();
    };

    assignIds = (data) => {
        _.each(data.features, (feature, i) => {
            feature.id = i;
        });
        console.log(data);
        return data;
    };

    discardChanges = (layer) => {
        layer.editing = false;
        layer.name = this.editedLayer.name;
        layer.data = this.editedLayer.data;
        this.map.off('draw.create', this.updateLayer);
        this.map.off('draw.update', this.updateLayer);
        this.map.removeControl(this.draw);
        this.draw = null;
        this.editedLayer = null;
        this.setLayerVisibility(layer, true);
        this.forceUpdate();
    };

    addLayer = (geojson, name) => {
        this.assignIds(geojson);
        let id = this.layersIndex.toString();
        this.map.addSource(id, {
            "type": "geojson",
            "data": geojson
            // "generateId": true
        });
        this.map.addLayer({
            "id": id+'fill',
            "type": "fill",
            "source": id,
            "paint": {
                'fill-color': ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#088'],
                'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.7]
            },
            "filter": ["in", "$type", "Polygon"]
        });
        this.map.addLayer({
            "id": id+'fill-stroke',
            "type": "line",
            "source": id,
            "paint": {
                "line-color": ['coalesce', ['get', 'stroke'], ['get', 'stroke-color']],
                "line-width": ['coalesce', ['get', 'stroke-width'], 0],
                'line-opacity': ['coalesce', ['get', 'stroke-opacity'], 0]
            },
            "filter": ["in", "$type", "Polygon"]
        });
        this.map.addLayer({
            "id": id+'circle',
            "type": "circle",
            "source": id,
            "paint": {
                "circle-radius": ['coalesce', ['get', 'circle-radius'], 3],
                "circle-color": ['coalesce', ['get', 'circle-color'], '#088'],
                "circle-opacity": ['coalesce', ['get', 'circle-opacity'], 1]
            },
            "filter": ["in", "$type", "Point"]
        });
        this.map.addLayer({
            "id": id+'line',
            "type": "line",
            "source": id,
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-width": 2,
                "line-color": '#088'
            },
            "filter": ["in", "$type", "LineString"]
        });
        this.layers.push({name: name, id: id, data: geojson, visible: true, editing: false});
        this.layersIndex++;
        this.forceUpdate();
    };

    fileDownload = (layer, extension) => {
        let content;
        let data;
        if (extension === 'geojson') {
            content = JSON.stringify(layer.data);
            data = new Blob([content], {type: 'application/json'});
        } else if (extension === 'zip') {
            content = shpwrite.zip(layer.data);
            let link = document.getElementById('download-link');
            link.download = layer.name + '.' + extension;
            link.href = 'data:application/zip;base64,' + content;
            let event = new MouseEvent('click');
            link.dispatchEvent(event);
            return;
        } else if (extension === 'kml') {
            content = tokml(layer.data);
            data = new Blob([content], {type: 'text/xml'});
        }
        // If we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        if (this.downloadFile !== null) {
            window.URL.revokeObjectURL(this.downloadFile);
        }

        this.downloadFile = window.URL.createObjectURL(data);

        let link = document.getElementById('download-link');
        link.download = layer.name + '.' + extension;
        link.href = this.downloadFile;

        // wait for the link to be added to the document
        window.requestAnimationFrame(function () {
            let event = new MouseEvent('click');
            link.dispatchEvent(event);
        });
    };

    fileUpload = (event) => {
        let input = event.target;
        for (let i = 0, file; file = input.files[i]; i++) {
            let extension = file.name.split('.').pop();
            if (extension === 'zip') {
                let reader = new FileReader();
                reader.onload = (e) => {
                    // console.log('read file', e.target.result);
                    // let data = new Blob([e.target.result], {type: 'application/zip'});
                    // let reader = new FileReader();
                    // reader.onload = (e) => {
                    //     console.log('from blob', e.target.result);
                    //     shp(e.target.result).then((geojson) => {
                    //         console.log(geojson);
                    //     }).catch(() => {
                    //         console.log('error');
                    //     });
                    // };
                    // reader.readAsArrayBuffer(data);
                    shp(e.target.result).then((geojson) => {
                        this.addLayer(geojson, file.name.substr(0, file.name.length - extension.length - 1));
                    });
                };
                reader.readAsArrayBuffer(file);
            }
            else if (extension === 'kml') {
                let reader = new FileReader();
                reader.onload = (e) => {
                    let dom = (new DOMParser()).parseFromString(e.target.result, 'text/xml');
                    let geojson = toGeoJSON.kml(dom);
                    this.addLayer(geojson, file.name.substr(0, file.name.length - extension.length - 1));
                };
                reader.readAsText(file);
            }
            else if (extension === 'geojson') {
                let reader = new FileReader();
                reader.onload = (e) => {
                    let geojson = JSON.parse(e.target.result);
                    this.addLayer(geojson, file.name.substr(0, file.name.length - extension.length - 1));
                };
                reader.readAsText(file);
            }
        }
    };

    selectLayer = (layer) => {
        console.log(layer.data);
        this.selectedLayer = layer;
        this.forceUpdate();
    };

    onSortEnd = ({oldIndex, newIndex}) => {
        let layer = this.layers[oldIndex].id;
        let beforeLayer = newIndex === this.layers.length - 1 ? undefined : this.layers[newIndex].id + 'fill';
        console.log(oldIndex, newIndex, this.layers[oldIndex], this.layers[newIndex]);
        this.map.moveLayer(layer + 'fill', beforeLayer);
        this.map.moveLayer(layer + 'fill-stroke', beforeLayer);
        this.map.moveLayer(layer + 'circle', beforeLayer);
        this.map.moveLayer(layer + 'line', beforeLayer);
        this.layers = arrayMove(this.layers, oldIndex, newIndex);
        this.forceUpdate();
    };

    closePopup = () => {
        this.selectedFeature = null;
        this.forceUpdate();
    };

    render() {
        return (
            <div className="container-fluid">
                <div className="row">
                    <div id="map" className="col-8">
                        <FeaturePropertiesPopup feature={this.selectedFeature}
                                                map={this.map}
                                                layers={this.layers}
                                                ref={"featurePopup"}
                                                close={this.closePopup}/>
                    </div>
                    <div className="col-4 controls">
                        <div className="header">
                            <span className="title">Preview</span>
                            <div className="preview-box"
                                 dangerouslySetInnerHTML={
                                     {__html: this.selectedLayer ? geojson2svg(this.selectedLayer.data).render() : ''}}>
                            </div>
                        </div>
                        <div className="header">
                            <span className="title">Layers</span>
                            <input name="file-input"
                                   id="file-input"
                                   onChange={this.fileUpload}
                                   type="file"
                                   hidden/>
                            <a id="download-link" href="./">Download</a>
                            <Button tooltipData="Add from file"
                                    tooltipPos="down"
                                    callback={() => {
                                        $('#file-input').click();
                                    }}>
                                <i className="fas fa-file-upload"/>
                            </Button>
                            <Button tooltipData="Add new empty layer"
                                    tooltipPos="down"
                                    callback={() => {
                                        this.addLayer({
                                            "type": "FeatureCollection",
                                            "features": []
                                        }, 'New layer');
                                    }}>
                                <i className="material-icons add-layer-btn">library_add</i>
                            </Button>
                        </div>
                        <LayersList pressDelay={400}
                                    map={this.map}
                                    layers={this.layers}
                                    editedLayer={this.editedLayer}
                                    selectedLayer={this.selectedLayer}
                                    layerCallbacks={{
                                        downloadCallback: this.fileDownload,
                                        editCallback: this.editLayer,
                                        selectCallback:this.selectLayer,
                                        setVisibility: this.setLayerVisibility,
                                        saveChanges: this.saveChanges,
                                        discardChanges: this.discardChanges,
                                        deleteCallback: this.removeLayer,
                                    }}
                                    onSortEnd={this.onSortEnd}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
